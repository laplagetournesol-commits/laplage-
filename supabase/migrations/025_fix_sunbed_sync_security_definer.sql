-- =============================================================
-- FIX libération des transats à l'annulation (19/07/2026)
-- Cause : le trigger sync_beach_reservation_sunbed_status() n'était pas
-- SECURITY DEFINER, et beach_reservation_sunbeds a la RLS activée SANS
-- policy UPDATE -> le trigger ne pouvait pas passer les liaisons en
-- 'cancelled' (RLS bloquait, 0 ligne) -> transats restaient occupés.
-- Fix : passer la fonction en SECURITY DEFINER (contourne la RLS).
-- Corrige toutes les plateformes sans rebuild (trigger au niveau DB).
-- =============================================================

CREATE OR REPLACE FUNCTION public.sync_beach_reservation_sunbed_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.beach_reservation_sunbeds
  SET status = NEW.status, date = NEW.date
  WHERE reservation_id = NEW.id;
  RETURN NEW;
END;
$$;

-- Le trigger on_beach_reservation_status_change pointe déjà sur cette
-- fonction (AFTER UPDATE OF status, date ON beach_reservations) -> rien
-- d'autre à faire.
