-- =============================================================
-- Carte app : détails par article — 23/07/2026
-- Ágora ne stocke ni description ni photo -> on les ajoute chez nous.
-- description = ingrédients / texte libre ; image_url = miniature (bucket assets).
-- =============================================================
ALTER TABLE public.app_menu_items
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_url text;
