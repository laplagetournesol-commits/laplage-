-- Ajouter le toggle prépaiement restaurant (désactivé par défaut = basse saison)
INSERT INTO restaurant_settings (key, value) VALUES
  ('require_deposit', 'false')
ON CONFLICT (key) DO NOTHING;
