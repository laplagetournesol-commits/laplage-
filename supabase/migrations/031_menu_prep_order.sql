-- =============================================================
-- Ordre des plats (Orden Prep. Ágora) pour le ticket cuisine — 23/07/2026
-- prep_order_id : 1=BEBIDAS, 2=PRIMEROS, 3=SEGUNDOS... (l'id = l'ordre).
-- Sert à trier/regrouper le ticket cuisine dans le bon ordre de service.
-- =============================================================
ALTER TABLE public.app_menu_items
  ADD COLUMN IF NOT EXISTS prep_order_id integer;

ALTER TABLE public.app_order_lines
  ADD COLUMN IF NOT EXISTS prep_order_id integer;
