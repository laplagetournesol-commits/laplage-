-- =============================================
-- Galerie photos + Shop — modifiables depuis l'admin
-- =============================================

-- GALERIE PHOTOS
CREATE TABLE IF NOT EXISTS gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'plage',
  type TEXT NOT NULL DEFAULT 'photo',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read gallery_photos"
  ON gallery_photos FOR SELECT USING (true);

CREATE POLICY "Admin manage gallery_photos"
  ON gallery_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- SHOP
CREATE TABLE IF NOT EXISTS shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read shop_products"
  ON shop_products FOR SELECT USING (true);

CREATE POLICY "Admin manage shop_products"
  ON shop_products FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
