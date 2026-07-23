-- =============================================================
-- Intégration caisse Ágora (déclaration fiscale ES) — 23/07/2026
-- Les ventes plage payées via Stripe sont déclarées dans Ágora sur la
-- série "W" (internet/app). On stocke le n° attribué sur la réservation
-- (idempotence + référence pour les avoirs) et on gère un compteur de
-- série atomique côté Postgres (numérotation continue, sans trou).
-- =============================================================

-- 1) Trace de la déclaration Ágora sur chaque réservation plage
ALTER TABLE public.beach_reservations
  ADD COLUMN IF NOT EXISTS agora_serie text,
  ADD COLUMN IF NOT EXISTS agora_number integer,
  ADD COLUMN IF NOT EXISTS agora_synced_at timestamptz;

-- 2) Compteurs de série (une ligne par série : W, WD, ...)
CREATE TABLE IF NOT EXISTS public.agora_series_counters (
  serie text PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- Amorçage : W-1 et WD-1 existent déjà (facture test + son avoir),
-- donc les vraies ventes commencent à W-2 / WD-2.
INSERT INTO public.agora_series_counters (serie, last_number) VALUES
  ('W', 1), ('WD', 1)
ON CONFLICT (serie) DO NOTHING;

-- Table interne : pas d'accès public (le serveur y accède via service_role).
ALTER TABLE public.agora_series_counters ENABLE ROW LEVEL SECURITY;

-- 3) Numéro suivant, atomique (verrou de ligne -> pas de doublon ni de trou)
CREATE OR REPLACE FUNCTION public.next_agora_number(p_serie text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n integer;
BEGIN
  INSERT INTO public.agora_series_counters (serie, last_number)
    VALUES (p_serie, 0)
    ON CONFLICT (serie) DO NOTHING;

  UPDATE public.agora_series_counters
    SET last_number = last_number + 1
    WHERE serie = p_serie
    RETURNING last_number INTO n;

  RETURN n;
END;
$$;
