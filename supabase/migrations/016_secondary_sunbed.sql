-- =============================================
-- Ajout du transat secondaire (réservation pour 2+)
-- Quand guest_count >= 2 sur un transat simple,
-- le voisin est automatiquement bloqué.
-- =============================================

ALTER TABLE beach_reservations
  ADD COLUMN secondary_sunbed_id UUID REFERENCES sunbeds(id);

-- Index pour accélérer la recherche de disponibilité
CREATE INDEX idx_beach_reservations_secondary
  ON beach_reservations(secondary_sunbed_id)
  WHERE secondary_sunbed_id IS NOT NULL;
