-- =============================================================
-- Commandes "depuis le transat" (app) — 23/07/2026
-- Une commande = plusieurs lignes (produits Ágora). Payée via Stripe,
-- puis ticket imprimé au bar + déclarée dans Ágora (série W).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.app_orders (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid,
  sunbed                   text,                 -- n° de transat (Location caisse)
  total                    numeric NOT NULL DEFAULT 0,
  status                   text NOT NULL DEFAULT 'pending', -- pending / paid / cancelled
  stripe_payment_intent_id text,
  agora_serie              text,
  agora_number             integer,
  agora_synced_at          timestamptz,
  printed_at               timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_order_lines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES public.app_orders(id) ON DELETE CASCADE,
  product_id integer,
  name       text,
  qty        integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  vat_id     integer,
  vat_rate   numeric,
  prep_type  text
);
CREATE INDEX IF NOT EXISTS idx_app_order_lines_order ON public.app_order_lines(order_id);

-- RLS : le client lit ses propres commandes ; écritures via service_role (serveur).
ALTER TABLE public.app_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_order_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_orders_own ON public.app_orders;
CREATE POLICY app_orders_own ON public.app_orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS app_order_lines_own ON public.app_order_lines;
CREATE POLICY app_order_lines_own ON public.app_order_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.app_orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
