-- =============================================
-- Ajouter colonne qr_code aux réservations plage et restaurant
-- Le QR code est auto-généré via gen_random_uuid()
-- =============================================

ALTER TABLE beach_reservations
  ADD COLUMN qr_code TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT;

ALTER TABLE restaurant_reservations
  ADD COLUMN qr_code TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT;

-- Index pour la recherche rapide au scan
CREATE INDEX idx_beach_reservations_qr ON beach_reservations(qr_code);
CREATE INDEX idx_restaurant_reservations_qr ON restaurant_reservations(qr_code);
