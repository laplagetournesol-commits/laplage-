-- =============================================
-- Fix : dates saison 1 → 1er mars, suppression addons seedés
-- =============================================

-- 1. Corriger les dates de la saison 1 (Printemps) : 15 mars → 1er mars
UPDATE seasonal_pricing
SET start_date = '2026-03-01'
WHERE label = 'Printemps' AND start_date = '2026-03-15';

-- 2. Supprimer TOUS les anciens addons (seedés par migration 006)
-- L'utilisateur ajoutera ses propres options via Supabase
DELETE FROM reservation_addons;
DELETE FROM addons;

-- 3. Réinsérer uniquement les offres saisonnières
INSERT INTO addons (name, description, price, category, icon, sort_order, available_from, available_until) VALUES
  ('2 Transats + Cava/Rosé',  '2 transats avec bouteille de cava ou rosé au choix', 50, 'pack', 'sparkles-outline', 1, '2026-03-01', '2026-04-30'),
  ('Bed + Bouteille',          'Lit balinais avec bouteille au choix',               70, 'pack', 'bed-outline',      2, '2026-03-01', '2026-04-30');
