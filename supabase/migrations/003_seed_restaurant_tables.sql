-- =============================================
-- Les Tournesols — Seed tables restaurant
-- =============================================

DO $$
DECLARE
  zone_terrasse UUID;
  zone_vue_mer UUID;
  zone_lounge UUID;
BEGIN
  SELECT id INTO zone_terrasse FROM restaurant_zones WHERE zone_type = 'terrasse';
  SELECT id INTO zone_vue_mer FROM restaurant_zones WHERE zone_type = 'vue_mer';
  SELECT id INTO zone_lounge FROM restaurant_zones WHERE zone_type = 'lounge';

  -- Terrasse (15 tables : 10 rondes 4 places + 5 rectangulaires 6 places)
  INSERT INTO restaurant_tables (zone_id, label, seats, shape, svg_x, svg_y, svg_width, svg_height) VALUES
    (zone_terrasse, 'T1',  4, 'round',     10, 10, 6, 6),
    (zone_terrasse, 'T2',  4, 'round',     22, 10, 6, 6),
    (zone_terrasse, 'T3',  4, 'round',     34, 10, 6, 6),
    (zone_terrasse, 'T4',  6, 'rectangle', 48, 9, 10, 7),
    (zone_terrasse, 'T5',  4, 'round',     64, 10, 6, 6),
    (zone_terrasse, 'T6',  4, 'round',     76, 10, 6, 6),
    (zone_terrasse, 'T7',  4, 'round',     88, 10, 6, 6),
    (zone_terrasse, 'T8',  4, 'round',     10, 22, 6, 6),
    (zone_terrasse, 'T9',  6, 'rectangle', 24, 21, 10, 7),
    (zone_terrasse, 'T10', 4, 'round',     40, 22, 6, 6),
    (zone_terrasse, 'T11', 4, 'round',     54, 22, 6, 6),
    (zone_terrasse, 'T12', 6, 'rectangle', 66, 21, 10, 7),
    (zone_terrasse, 'T13', 4, 'round',     82, 22, 6, 6),
    (zone_terrasse, 'T14', 4, 'round',     16, 34, 6, 6),
    (zone_terrasse, 'T15', 6, 'rectangle', 46, 33, 10, 7);

  -- Vue Mer (8 tables : premium, plus espacées)
  INSERT INTO restaurant_tables (zone_id, label, seats, shape, svg_x, svg_y, svg_width, svg_height) VALUES
    (zone_vue_mer, 'M1', 4, 'round',     10, 48, 7, 7),
    (zone_vue_mer, 'M2', 6, 'rectangle', 24, 47, 11, 8),
    (zone_vue_mer, 'M3', 4, 'round',     42, 48, 7, 7),
    (zone_vue_mer, 'M4', 2, 'round',     56, 49, 5, 5),
    (zone_vue_mer, 'M5', 8, 'rectangle', 66, 47, 13, 8),
    (zone_vue_mer, 'M6', 4, 'round',     86, 48, 7, 7),
    (zone_vue_mer, 'M7', 2, 'round',     20, 60, 5, 5),
    (zone_vue_mer, 'M8', 4, 'round',     70, 60, 7, 7);

  -- Lounge (5 tables : intimistes, banquettes)
  INSERT INTO restaurant_tables (zone_id, label, seats, shape, svg_x, svg_y, svg_width, svg_height) VALUES
    (zone_lounge, 'L1', 6, 'rectangle', 15, 75, 12, 8),
    (zone_lounge, 'L2', 4, 'round',     35, 76, 8, 8),
    (zone_lounge, 'L3', 8, 'rectangle', 50, 75, 14, 8),
    (zone_lounge, 'L4', 4, 'round',     72, 76, 8, 8),
    (zone_lounge, 'L5', 6, 'rectangle', 85, 75, 12, 8);
END $$;
