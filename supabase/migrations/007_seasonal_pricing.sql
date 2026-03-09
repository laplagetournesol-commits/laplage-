-- =============================================
-- Tarification saisonnière fixe par catégorie
-- 3 saisons (mars→août), prix fixes par catégorie
-- =============================================

-- 1. Modifier la table seasonal_pricing
-- Renommer zone_type → pricing_category, remplacer multiplier → fixed_price
ALTER TABLE seasonal_pricing RENAME COLUMN zone_type TO pricing_category;
ALTER TABLE seasonal_pricing DROP COLUMN multiplier;
ALTER TABLE seasonal_pricing ADD COLUMN fixed_price NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 2. Supprimer les anciennes données (table vide, mais par sécurité)
DELETE FROM seasonal_pricing;

-- 3. Insérer les 9 lignes de prix (3 catégories × 3 saisons)
INSERT INTO seasonal_pricing (pricing_category, start_date, end_date, fixed_price, label) VALUES
  -- Saison 1 : 1 mars → 30 avril
  ('transat',           '2026-03-01', '2026-04-30', 20, 'Printemps'),
  ('transat_front_row', '2026-03-01', '2026-04-30', 20, 'Printemps'),
  ('bed',               '2026-03-01', '2026-04-30', 50, 'Printemps'),
  -- Saison 2 : 1 mai → 30 juin
  ('transat',           '2026-05-01', '2026-06-30', 20, 'Pré-été'),
  ('transat_front_row', '2026-05-01', '2026-06-30', 25, 'Pré-été'),
  ('bed',               '2026-05-01', '2026-06-30', 60, 'Pré-été'),
  -- Saison 3 : 1 juillet → 31 août
  ('transat',           '2026-07-01', '2026-08-31', 25, 'Été'),
  ('transat_front_row', '2026-07-01', '2026-08-31', 28, 'Été'),
  ('bed',               '2026-07-01', '2026-08-31', 80, 'Été');

-- 4. Ajouter available_from / available_until aux addons pour les offres saisonnières
ALTER TABLE addons ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE addons ADD COLUMN IF NOT EXISTS available_until DATE;

-- 5. Supprimer les anciens addons seedés (migration 006)
DELETE FROM reservation_addons;
DELETE FROM addons;

-- 6. Insérer les offres saisonnières (packs mars-avril)
INSERT INTO addons (name, description, price, category, icon, sort_order, available_from, available_until) VALUES
  ('2 Transats + Cava/Rosé',  '2 transats avec bouteille de cava ou rosé au choix', 50, 'pack', 'sparkles-outline', 10, '2026-03-01', '2026-04-30'),
  ('Bed + Bouteille',          'Lit balinais avec bouteille au choix',               70, 'pack', 'bed-outline',      11, '2026-03-01', '2026-04-30');

-- 6. RLS policy pour seasonal_pricing (lecture publique)
ALTER TABLE seasonal_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasonal pricing"
  ON seasonal_pricing FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage seasonal pricing"
  ON seasonal_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
