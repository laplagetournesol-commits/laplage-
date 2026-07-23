-- =============================================================
-- Note de commande (message serveur / offert par un autre transat) — 23/07/2026
-- Imprimée sur les tickets bar/cuisine. Ex : "🎁 De la part du transat 509".
-- =============================================================
ALTER TABLE public.app_orders
  ADD COLUMN IF NOT EXISTS note text;
