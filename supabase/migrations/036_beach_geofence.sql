-- =============================================================
-- Géofence plage — 25/07/2026
-- Le réseau social "Connecte-toi" ne montre que les gens physiquement
-- présents sur la plage (position GPS dans un rayon autour du centre).
-- Centre + rayon réglables dans l'admin (restaurant_settings).
-- =============================================================

-- 1) Réglage centre + rayon (par défaut = Les Tournesols, Estepona)
INSERT INTO restaurant_settings (key, value) VALUES
  ('beach_geofence', '{"lat": 36.4276161, "lng": -5.1380101, "radius_m": 150}')
ON CONFLICT (key) DO NOTHING;

-- 2) Position des profils (présence GPS)
ALTER TABLE public.social_profiles
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS loc_updated_at timestamptz;
