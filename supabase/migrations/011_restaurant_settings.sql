-- =============================================
-- Configuration restaurant modifiable sans rebuild
-- =============================================

CREATE TABLE IF NOT EXISTS restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créneaux midi
INSERT INTO restaurant_settings (key, value) VALUES
  ('lunch_slots', '["12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00"]'),
  ('dinner_slots', '["19:00","19:30","20:00","20:30","21:00","21:30","22:00","22:30","23:00"]'),
  ('dinner_days', '[5, 6]'),  -- 0=dimanche, 1=lundi ... 5=vendredi, 6=samedi (JS getDay())
  ('lunch_label', '"12h00 — 16h00"'),
  ('dinner_label', '"19h00 — 23h30"')
ON CONFLICT (key) DO NOTHING;

-- Accès en lecture pour tous (anon), écriture réservée aux admins
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read restaurant_settings"
  ON restaurant_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin update restaurant_settings"
  ON restaurant_settings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
