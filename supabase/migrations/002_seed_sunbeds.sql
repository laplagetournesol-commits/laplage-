-- =============================================
-- Les Tournesols — Seed transats individuels
-- =============================================

-- On récupère les IDs des zones pour référencer
DO $$
DECLARE
  zone_standard UUID;
  zone_premium UUID;
  zone_front UUID;
  zone_vip UUID;
BEGIN
  SELECT id INTO zone_standard FROM beach_zones WHERE zone_type = 'standard';
  SELECT id INTO zone_premium FROM beach_zones WHERE zone_type = 'premium';
  SELECT id INTO zone_front FROM beach_zones WHERE zone_type = 'front_row';
  SELECT id INTO zone_vip FROM beach_zones WHERE zone_type = 'vip_cabana';

  -- Standard (20 transats, 4 rangées de 5)
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (zone_standard, 'S1',  12, 12, 6, 4, FALSE),
    (zone_standard, 'S2',  22, 12, 6, 4, FALSE),
    (zone_standard, 'S3',  32, 12, 6, 4, FALSE),
    (zone_standard, 'S4',  42, 12, 6, 4, FALSE),
    (zone_standard, 'S5',  52, 12, 6, 4, FALSE),
    (zone_standard, 'S6',  62, 12, 6, 4, FALSE),
    (zone_standard, 'S7',  72, 12, 6, 4, FALSE),
    (zone_standard, 'S8',  82, 12, 6, 4, FALSE),
    (zone_standard, 'S9',  12, 19, 6, 4, FALSE),
    (zone_standard, 'S10', 22, 19, 6, 4, FALSE),
    (zone_standard, 'S11', 32, 19, 6, 4, FALSE),
    (zone_standard, 'S12', 42, 19, 6, 4, FALSE),
    (zone_standard, 'S13', 52, 19, 6, 4, FALSE),
    (zone_standard, 'S14', 62, 19, 6, 4, FALSE),
    (zone_standard, 'S15', 72, 19, 6, 4, FALSE),
    (zone_standard, 'S16', 82, 19, 6, 4, FALSE),
    (zone_standard, 'S17', 22, 26, 6, 4, FALSE),
    (zone_standard, 'S18', 42, 26, 6, 4, FALSE),
    (zone_standard, 'S19', 62, 26, 6, 4, FALSE),
    (zone_standard, 'S20', 82, 26, 6, 4, FALSE);

  -- Premium (12 transats, 2 rangées de 6)
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (zone_premium, 'P1',  12, 38, 7, 4, FALSE),
    (zone_premium, 'P2',  24, 38, 7, 4, FALSE),
    (zone_premium, 'P3',  36, 38, 7, 4, FALSE),
    (zone_premium, 'P4',  48, 38, 7, 4, FALSE),
    (zone_premium, 'P5',  60, 38, 7, 4, FALSE),
    (zone_premium, 'P6',  72, 38, 7, 4, FALSE),
    (zone_premium, 'P7',  12, 45, 7, 4, FALSE),
    (zone_premium, 'P8',  24, 45, 7, 4, FALSE),
    (zone_premium, 'P9',  36, 45, 7, 4, FALSE),
    (zone_premium, 'P10', 48, 45, 7, 4, FALSE),
    (zone_premium, 'P11', 60, 45, 7, 4, FALSE),
    (zone_premium, 'P12', 72, 45, 7, 4, FALSE);

  -- Front Row (8 transats doubles, 1 rangée)
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (zone_front, 'F1', 10, 56, 8, 5, TRUE),
    (zone_front, 'F2', 21, 56, 8, 5, TRUE),
    (zone_front, 'F3', 32, 56, 8, 5, TRUE),
    (zone_front, 'F4', 43, 56, 8, 5, TRUE),
    (zone_front, 'F5', 54, 56, 8, 5, TRUE),
    (zone_front, 'F6', 65, 56, 8, 5, TRUE),
    (zone_front, 'F7', 76, 56, 8, 5, TRUE),
    (zone_front, 'F8', 87, 56, 8, 5, TRUE);

  -- VIP Cabanas (4 grands espaces)
  INSERT INTO sunbeds (zone_id, label, svg_x, svg_y, svg_width, svg_height, is_double) VALUES
    (zone_vip, 'V1', 15, 68, 14, 8, TRUE),
    (zone_vip, 'V2', 35, 68, 14, 8, TRUE),
    (zone_vip, 'V3', 55, 68, 14, 8, TRUE),
    (zone_vip, 'V4', 75, 68, 14, 8, TRUE);
END $$;
