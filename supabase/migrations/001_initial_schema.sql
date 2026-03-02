-- =============================================
-- La Plage Royale — Schéma initial
-- =============================================

-- ========== PROFILES ==========
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'staff', 'admin')),
  preferred_language TEXT NOT NULL DEFAULT 'fr' CHECK (preferred_language IN ('fr', 'es', 'en')),
  beach_tokens INTEGER NOT NULL DEFAULT 0,
  vip_level TEXT NOT NULL DEFAULT 'standard' CHECK (vip_level IN ('standard', 'silver', 'gold', 'platinum')),
  total_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger pour créer un profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== BEACH ZONES ==========
CREATE TABLE beach_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('standard', 'premium', 'front_row', 'vip_cabana')),
  color TEXT NOT NULL DEFAULT '#A8D5BA',
  base_price NUMERIC(10,2) NOT NULL,
  capacity INTEGER NOT NULL,
  description TEXT,
  svg_path_data TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== SUNBEDS ==========
CREATE TABLE sunbeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES beach_zones(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  svg_x NUMERIC(8,2) NOT NULL DEFAULT 0,
  svg_y NUMERIC(8,2) NOT NULL DEFAULT 0,
  svg_width NUMERIC(8,2) NOT NULL DEFAULT 10,
  svg_height NUMERIC(8,2) NOT NULL DEFAULT 5,
  is_double BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== ADDONS ==========
CREATE TABLE addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('comfort', 'food', 'drink', 'pack')),
  icon TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== BEACH RESERVATIONS ==========
CREATE TABLE beach_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sunbed_id UUID NOT NULL REFERENCES sunbeds(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '10:00',
  end_time TIME NOT NULL DEFAULT '19:00',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_payment_intent_id TEXT,
  guest_count INTEGER NOT NULL DEFAULT 1,
  special_requests TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un transat ne peut être réservé qu'une fois par jour
  UNIQUE(sunbed_id, date)
);

CREATE INDEX idx_beach_reservations_date ON beach_reservations(date);
CREATE INDEX idx_beach_reservations_user ON beach_reservations(user_id);

-- ========== RESERVATION ADDONS ==========
CREATE TABLE reservation_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES beach_reservations(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES addons(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL
);

-- ========== RESTAURANT ZONES ==========
CREATE TABLE restaurant_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('terrasse', 'vue_mer', 'lounge')),
  color TEXT NOT NULL DEFAULT '#A8D5BA',
  min_spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL,
  description TEXT,
  svg_path_data TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== RESTAURANT TABLES ==========
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES restaurant_zones(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 4,
  shape TEXT NOT NULL DEFAULT 'round' CHECK (shape IN ('round', 'square', 'rectangle')),
  svg_x NUMERIC(8,2) NOT NULL DEFAULT 0,
  svg_y NUMERIC(8,2) NOT NULL DEFAULT 0,
  svg_width NUMERIC(8,2) NOT NULL DEFAULT 10,
  svg_height NUMERIC(8,2) NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== RESTAURANT RESERVATIONS ==========
CREATE TABLE restaurant_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES restaurant_tables(id),
  date DATE NOT NULL,
  time_slot TEXT NOT NULL, -- 'lunch' ou 'dinner'
  guest_count INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_payment_intent_id TEXT,
  special_requests TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Une table ne peut être réservée qu'une fois par créneau/jour
  UNIQUE(table_id, date, time_slot)
);

CREATE INDEX idx_restaurant_reservations_date ON restaurant_reservations(date);

-- ========== EVENTS ==========
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('pool_party', 'dj_set', 'dinner_show', 'brunch', 'private', 'special')),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  flyer_url TEXT,
  lineup TEXT[],
  capacity INTEGER NOT NULL DEFAULT 100,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  standard_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  vip_price NUMERIC(10,2),
  is_secret BOOLEAN NOT NULL DEFAULT FALSE,
  secret_code TEXT,
  required_vip_level TEXT,
  required_tokens INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(date);

-- ========== EVENT TICKETS ==========
CREATE TABLE event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_type TEXT NOT NULL DEFAULT 'standard' CHECK (ticket_type IN ('standard', 'vip')),
  price NUMERIC(10,2) NOT NULL,
  qr_code TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled', 'refunded')),
  stripe_payment_intent_id TEXT,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(qr_code)
);

CREATE INDEX idx_event_tickets_event ON event_tickets(event_id);
CREATE INDEX idx_event_tickets_user ON event_tickets(user_id);

-- ========== TOKEN TRANSACTIONS ==========
CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'bonus', 'expire')),
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_transactions_user ON token_transactions(user_id);

-- ========== REWARDS ==========
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  token_cost INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'experience',
  icon TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  stock INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PRE-ORDERS (Arrival Experience) ==========
CREATE TABLE pre_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reservation_type TEXT NOT NULL CHECK (reservation_type IN ('beach', 'restaurant')),
  reservation_id UUID NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  special_instructions TEXT,
  arrival_time TIME,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== LIVE CAMERAS ==========
CREATE TABLE live_cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PUSH TOKENS ==========
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PUSH NOTIFICATIONS ==========
CREATE TABLE push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  target_segment TEXT, -- 'all', 'vip', 'gold+', etc.
  sent_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== SEASONAL PRICING ==========
CREATE TABLE seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== ROW LEVEL SECURITY ==========

-- Profiles: chacun peut voir/modifier son propre profil, admin voit tout
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Beach zones & sunbeds: lecture publique
ALTER TABLE beach_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Beach zones are publicly readable"
  ON beach_zones FOR SELECT USING (TRUE);

ALTER TABLE sunbeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sunbeds are publicly readable"
  ON sunbeds FOR SELECT USING (TRUE);

-- Addons: lecture publique
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Addons are publicly readable"
  ON addons FOR SELECT USING (TRUE);

-- Beach reservations: propres réservations + admin
ALTER TABLE beach_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own beach reservations"
  ON beach_reservations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create beach reservations"
  ON beach_reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Restaurant: lecture publique pour zones/tables, réservations perso
ALTER TABLE restaurant_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Restaurant zones are publicly readable"
  ON restaurant_zones FOR SELECT USING (TRUE);

ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Restaurant tables are publicly readable"
  ON restaurant_tables FOR SELECT USING (TRUE);

ALTER TABLE restaurant_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own restaurant reservations"
  ON restaurant_reservations FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create restaurant reservations"
  ON restaurant_reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Events: publiés sont publics
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published events are publicly readable"
  ON events FOR SELECT
  USING (is_published = TRUE);

-- Event tickets: propres tickets
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets"
  ON event_tickets FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tickets"
  ON event_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Token transactions: propres transactions
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own token transactions"
  ON token_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Rewards: lecture publique
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards are publicly readable"
  ON rewards FOR SELECT USING (TRUE);

-- ========== SEED DATA ==========

-- Zones de plage
INSERT INTO beach_zones (name, zone_type, color, base_price, capacity, description, sort_order) VALUES
  ('Standard', 'standard', '#A8D5BA', 35, 20, 'Transats confortables avec vue sur la mer', 1),
  ('Premium', 'premium', '#7EC8E3', 65, 12, 'Transats premium, plus proches de la mer, service prioritaire', 2),
  ('Front Row', 'front_row', '#F7D94E', 95, 8, 'Première ligne face à la mer, serviettes premium et eau offerte', 3),
  ('VIP Cabanas', 'vip_cabana', '#C94040', 250, 4, 'Cabanas privées avec service champagne, minibar et lit balinais', 4);

-- Addons
INSERT INTO addons (name, description, price, category, icon, sort_order) VALUES
  ('Parasol XL', 'Grand parasol premium', 15, 'comfort', 'umbrella', 1),
  ('Table basse', 'Table en teck pour vos boissons', 10, 'comfort', 'grid-outline', 2),
  ('Kit serviettes', '2 serviettes en coton égyptien', 12, 'comfort', 'layers-outline', 3),
  ('Bouteille Rosé', 'Whispering Angel, 75cl', 45, 'drink', 'wine-outline', 4),
  ('Champagne', 'Moët & Chandon Impérial, 75cl', 120, 'drink', 'sparkles', 5),
  ('Pack Cocktails x4', '4 cocktails signatures au choix', 52, 'drink', 'beer-outline', 6),
  ('Plateau Fruits', 'Assortiment de fruits frais de saison', 25, 'food', 'nutrition-outline', 7),
  ('Pack VIP', 'Parasol + serviettes + bouteille rosé + fruits', 85, 'pack', 'diamond', 8);

-- Zones restaurant
INSERT INTO restaurant_zones (name, zone_type, color, min_spend, capacity, description, sort_order) VALUES
  ('Terrasse', 'terrasse', '#A8D5BA', 50, 15, 'Terrasse ombragée avec vue panoramique', 1),
  ('Vue Mer', 'vue_mer', '#7EC8E3', 100, 8, 'Tables en première ligne face à la mer', 2),
  ('Lounge', 'lounge', '#C2703E', 150, 5, 'Espace lounge intimiste avec banquettes', 3);

-- Rewards
INSERT INTO rewards (name, description, token_cost, category, icon) VALUES
  ('Upgrade Zone', 'Montez en gamme pour votre prochaine réservation plage', 50, 'upgrade', 'arrow-up-circle'),
  ('Cocktail Offert', 'Un cocktail signature offert', 20, 'drink', 'wine-outline'),
  ('Accès VIP Event', 'Upgrade VIP pour un événement au choix', 100, 'experience', 'diamond'),
  ('Spa 30min', '30 minutes de massage sur la plage', 80, 'wellness', 'leaf-outline'),
  ('Brunch pour 2', 'Brunch dominical offert pour 2 personnes', 150, 'food', 'restaurant');
