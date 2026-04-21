-- =============================================
-- Remapper les 86 transats — nouveau plan 2026
-- Zones : 400 (1ère ligne 25€), 200/300/500 (20€), 100 (chaises 10€)
-- =============================================

-- 1. Désactiver tous les anciens transats (on ne les supprime pas pour garder l'historique réservations)
UPDATE sunbeds SET is_active = FALSE;

-- 2. Mettre à jour les zones de prix
UPDATE beach_zones SET is_active = FALSE;

INSERT INTO beach_zones (name, zone_type, color, base_price, capacity, description, sort_order, is_active) VALUES
  ('1ère Ligne',    'front_row', '#F7D94E', 25, 18, 'Première ligne face à la mer, parasol inclus', 1, TRUE),
  ('Parasol',       'premium',   '#7EC8E3', 20, 54, 'Parasol et transat avec vue mer',              2, TRUE),
  ('Chaise Longue', 'standard',  '#A8D5BA', 10, 16, 'Chaise longue sans parasol',                   3, TRUE);

-- 3. Insérer les 86 transats
-- Positions en % sur la photo (svg_x, svg_y)
-- Passerelle centrale ~52%
-- Gauche: x de 2% à 48% | Droite: x de 56% à 96%

DO $$
DECLARE
  z_front UUID;
  z_premium UUID;
  z_standard UUID;
BEGIN
  SELECT id INTO z_front    FROM beach_zones WHERE zone_type = 'front_row' AND is_active = TRUE;
  SELECT id INTO z_premium  FROM beach_zones WHERE zone_type = 'premium'   AND is_active = TRUE;
  SELECT id INTO z_standard FROM beach_zones WHERE zone_type = 'standard'  AND is_active = TRUE;

  -- ============================================
  -- RANGÉE 400 — 1ère ligne (face mer) — 25€
  -- ============================================
  -- Gauche (400-409) : 10 parasols, y=3%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_front, '400',  2.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '401',  7.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '402', 12.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '403', 17.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '404', 22.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '405', 27.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '406', 32.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '407', 37.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '408', 42.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '409', 47.0,  3.0, 4.5, 5.0, FALSE);

  -- Droite (410-417) : 8 parasols, y=3%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_front, '410', 56.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '411', 61.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '412', 66.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '413', 71.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '414', 76.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '415', 81.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '416', 86.0,  3.0, 4.5, 5.0, FALSE),
    (z_front, '417', 91.0,  3.0, 4.5, 5.0, FALSE);

  -- ============================================
  -- RANGÉE 300 — 2e ligne — 20€
  -- ============================================
  -- Gauche (300-309) : 10 parasols, y=14%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_premium, '300',  2.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '301',  7.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '302', 12.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '303', 17.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '304', 22.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '305', 27.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '306', 32.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '307', 37.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '308', 42.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '309', 47.0, 14.0, 4.5, 5.0, FALSE);

  -- Droite (310-317) : 8 parasols, y=14%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_premium, '310', 56.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '311', 61.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '312', 66.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '313', 71.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '314', 76.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '315', 81.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '316', 86.0, 14.0, 4.5, 5.0, FALSE),
    (z_premium, '317', 91.0, 14.0, 4.5, 5.0, FALSE);

  -- ============================================
  -- RANGÉE 200 — 3e ligne — 20€
  -- ============================================
  -- Gauche (200-209) : 10 parasols, y=25%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_premium, '200',  2.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '201',  7.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '202', 12.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '203', 17.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '204', 22.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '205', 27.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '206', 32.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '207', 37.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '208', 42.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '209', 47.0, 25.0, 4.5, 5.0, FALSE);

  -- Droite (210-217) : 8 parasols, y=25%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_premium, '210', 56.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '211', 61.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '212', 66.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '213', 71.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '214', 76.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '215', 81.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '216', 86.0, 25.0, 4.5, 5.0, FALSE),
    (z_premium, '217', 91.0, 25.0, 4.5, 5.0, FALSE);

  -- ============================================
  -- ZONE 500 — Colonne gauche, 4 en haut + 3x4 en bas — 20€
  -- ============================================
  -- 500-503 : à gauche des chaises longues, y=36%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_premium, '500',  2.0, 34.0, 4.5, 5.0, FALSE),
    (z_premium, '501',  7.0, 34.0, 4.5, 5.0, FALSE),
    (z_premium, '502', 12.0, 34.0, 4.5, 5.0, FALSE),
    (z_premium, '503', 12.0, 40.0, 4.5, 5.0, FALSE);

  -- 504-507 : y=50%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_premium, '504',  2.0, 50.0, 4.5, 5.0, FALSE),
    (z_premium, '505',  7.0, 50.0, 4.5, 5.0, FALSE),
    (z_premium, '506', 12.0, 50.0, 4.5, 5.0, FALSE),
    (z_premium, '507', 17.0, 50.0, 4.5, 5.0, FALSE);

  -- 508-511 : y=58%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_premium, '508',  2.0, 58.0, 4.5, 5.0, FALSE),
    (z_premium, '509',  7.0, 58.0, 4.5, 5.0, FALSE),
    (z_premium, '510', 12.0, 58.0, 4.5, 5.0, FALSE),
    (z_premium, '511', 17.0, 58.0, 4.5, 5.0, FALSE);

  -- 512-515 : y=66%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_premium, '512',  2.0, 66.0, 4.5, 5.0, FALSE),
    (z_premium, '513',  7.0, 66.0, 4.5, 5.0, FALSE),
    (z_premium, '514', 12.0, 66.0, 4.5, 5.0, FALSE),
    (z_premium, '515', 17.0, 66.0, 4.5, 5.0, FALSE);

  -- ============================================
  -- RANGÉE 100 — Chaises longues — 10€
  -- ============================================
  -- Gauche (100-107) : 8 chaises, y=37%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_standard, '100', 18.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '101', 22.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '102', 26.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '103', 30.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '104', 34.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '105', 38.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '106', 42.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '107', 46.0, 37.0, 3.2, 3.0, FALSE);

  -- Droite (108-115) : 8 chaises, y=37%
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (z_standard, '108', 58.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '109', 62.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '110', 66.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '111', 70.5, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '112', 75.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '113', 79.5, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '114', 84.0, 37.0, 3.2, 3.0, FALSE),
    (z_standard, '115', 88.5, 37.0, 3.2, 3.0, FALSE);

END $$;
