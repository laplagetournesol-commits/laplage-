-- =============================================
-- Nettoyage des addons : garder uniquement les options pertinentes
-- =============================================

-- Supprimer les liaisons réservation-addon d'abord (FK)
DELETE FROM reservation_addons;
-- Puis supprimer tous les addons existants
DELETE FROM addons;

-- Réinsérer uniquement les addons voulus
INSERT INTO addons (name, description, price, category, icon, sort_order) VALUES
  ('Kit serviettes',    '2 serviettes premium en coton', 10, 'comfort', 'layers-outline', 1),
  ('Bouteille d''eau',  'Eau minérale fraîche, 1L',       5, 'drink',   'water-outline',  2),
  ('Bouteille Rosé',    'Whispering Angel, 75cl',         45, 'drink',   'wine-outline',   3),
  ('Plateau de fruits', 'Assortiment de fruits frais',    20, 'food',    'nutrition-outline', 4),
  ('Pack VIP',          'Serviettes + rosé + fruits + service prioritaire', 85, 'pack', 'diamond', 5);
