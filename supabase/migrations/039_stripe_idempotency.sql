-- =============================================================
-- Idempotence webhook Stripe — 26/07/2026
-- Stripe livre "at-least-once" et rejoue les events sur toute réponse non-2xx.
-- On enregistre chaque event.id traité pour ne JAMAIS refaire les effets de bord
-- (impression de bons/tickets, push) en double.
-- =============================================================
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id     text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- RLS activée SANS policy : seul le service_role (le webhook serveur) y accède.
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
