-- =============================================
-- Restaurant : réservation par zone (pas par table)
-- L'utilisateur choisit Terrasse ou Intérieur
-- Le staff assigne la table ensuite
-- =============================================

-- 1. table_id devient nullable (staff assigne plus tard)
ALTER TABLE restaurant_reservations ALTER COLUMN table_id DROP NOT NULL;

-- 2. Ajouter zone_id pour stocker la préférence de zone
ALTER TABLE restaurant_reservations
  ADD COLUMN zone_id UUID REFERENCES restaurant_zones(id);

-- 3. Remplir zone_id des réservations existantes depuis la table
UPDATE restaurant_reservations rr
SET zone_id = rt.zone_id
FROM restaurant_tables rt
WHERE rr.table_id = rt.id AND rr.zone_id IS NULL;

-- 4. Réorganiser les zones : terrasse (extérieur) + intérieur
-- D'abord, réassigner les tables des zones supprimées vers terrasse
UPDATE restaurant_tables
SET zone_id = (SELECT id FROM restaurant_zones WHERE zone_type = 'terrasse' LIMIT 1)
WHERE zone_id IN (SELECT id FROM restaurant_zones WHERE zone_type IN ('vue_mer', 'lounge'));

-- Supprimer les anciennes zones
DELETE FROM restaurant_zones WHERE zone_type IN ('vue_mer', 'lounge');

-- Mettre à jour la contrainte CHECK pour accepter les nouveaux types
ALTER TABLE restaurant_zones DROP CONSTRAINT restaurant_zones_zone_type_check;
ALTER TABLE restaurant_zones ADD CONSTRAINT restaurant_zones_zone_type_check
  CHECK (zone_type IN ('terrasse', 'interieur'));

-- Mettre à jour la terrasse
UPDATE restaurant_zones
SET capacity = 30,
    description = 'Tables en terrasse face à la mer',
    name = 'Terrasse'
WHERE zone_type = 'terrasse';

-- Ajouter la zone Intérieur
INSERT INTO restaurant_zones (name, zone_type, color, min_spend, capacity, description, sort_order)
VALUES ('Intérieur', 'interieur', '#D4A574', 0, 40, 'Salle climatisée avec ambiance cosy', 2);
