-- =============================================================
-- Noms de catégories traduits pour la carte app — 23/07/2026
-- Les familles Ágora ont des noms bruts (SMALL BITES, TO SHARE...).
-- On ajoute un libellé traduit FR/ES/EN, éditable par l'admin, affiché
-- côté client dans sa langue (repli sur le nom Ágora si vide).
-- Colonnes séparées de `name` -> non écrasées à la resynchro.
-- =============================================================
ALTER TABLE public.app_menu_families
  ADD COLUMN IF NOT EXISTS label_fr text,
  ADD COLUMN IF NOT EXISTS label_es text,
  ADD COLUMN IF NOT EXISTS label_en text;
