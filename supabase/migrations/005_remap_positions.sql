-- =============================================
-- Repositionner transats et tables sur les nouvelles photos
-- =============================================

-- === TRANSATS (photo transat.png) ===
-- La photo montre : mer en haut, VIP cabanas proches de la mer,
-- puis rangées de parasols (gauche/droite d'une allée centrale),
-- "RESTAURANT" en bas.

-- VIP Cabanas — en haut, proches de la mer (4 grands espaces)
UPDATE sunbeds SET svg_x=3,  svg_y=13, svg_width=19, svg_height=6 WHERE label='V1';
UPDATE sunbeds SET svg_x=53, svg_y=13, svg_width=19, svg_height=6 WHERE label='V2';
UPDATE sunbeds SET svg_x=3,  svg_y=20, svg_width=19, svg_height=6 WHERE label='V3';
UPDATE sunbeds SET svg_x=53, svg_y=20, svg_width=19, svg_height=6 WHERE label='V4';

-- Front Row — première rangée de parasols (8 doubles)
UPDATE sunbeds SET svg_x=3,  svg_y=27, svg_width=10, svg_height=6 WHERE label='F1';
UPDATE sunbeds SET svg_x=14, svg_y=27, svg_width=10, svg_height=6 WHERE label='F2';
UPDATE sunbeds SET svg_x=25, svg_y=27, svg_width=10, svg_height=6 WHERE label='F3';
UPDATE sunbeds SET svg_x=36, svg_y=27, svg_width=10, svg_height=6 WHERE label='F4';
UPDATE sunbeds SET svg_x=53, svg_y=27, svg_width=10, svg_height=6 WHERE label='F5';
UPDATE sunbeds SET svg_x=64, svg_y=27, svg_width=10, svg_height=6 WHERE label='F6';
UPDATE sunbeds SET svg_x=75, svg_y=27, svg_width=10, svg_height=6 WHERE label='F7';
UPDATE sunbeds SET svg_x=86, svg_y=27, svg_width=10, svg_height=6 WHERE label='F8';

-- Premium — rangées 2-3 (12 parasols)
UPDATE sunbeds SET svg_x=3,  svg_y=34, svg_width=10, svg_height=6 WHERE label='P1';
UPDATE sunbeds SET svg_x=14, svg_y=34, svg_width=10, svg_height=6 WHERE label='P2';
UPDATE sunbeds SET svg_x=25, svg_y=34, svg_width=10, svg_height=6 WHERE label='P3';
UPDATE sunbeds SET svg_x=36, svg_y=34, svg_width=10, svg_height=6 WHERE label='P4';
UPDATE sunbeds SET svg_x=53, svg_y=34, svg_width=10, svg_height=6 WHERE label='P5';
UPDATE sunbeds SET svg_x=64, svg_y=34, svg_width=10, svg_height=6 WHERE label='P6';
UPDATE sunbeds SET svg_x=3,  svg_y=41, svg_width=10, svg_height=6 WHERE label='P7';
UPDATE sunbeds SET svg_x=14, svg_y=41, svg_width=10, svg_height=6 WHERE label='P8';
UPDATE sunbeds SET svg_x=25, svg_y=41, svg_width=10, svg_height=6 WHERE label='P9';
UPDATE sunbeds SET svg_x=36, svg_y=41, svg_width=10, svg_height=6 WHERE label='P10';
UPDATE sunbeds SET svg_x=53, svg_y=41, svg_width=10, svg_height=6 WHERE label='P11';
UPDATE sunbeds SET svg_x=64, svg_y=41, svg_width=10, svg_height=6 WHERE label='P12';

-- Standard — rangées 4-7 (20 parasols)
UPDATE sunbeds SET svg_x=3,  svg_y=48, svg_width=10, svg_height=6 WHERE label='S1';
UPDATE sunbeds SET svg_x=14, svg_y=48, svg_width=10, svg_height=6 WHERE label='S2';
UPDATE sunbeds SET svg_x=25, svg_y=48, svg_width=10, svg_height=6 WHERE label='S3';
UPDATE sunbeds SET svg_x=36, svg_y=48, svg_width=10, svg_height=6 WHERE label='S4';
UPDATE sunbeds SET svg_x=53, svg_y=48, svg_width=10, svg_height=6 WHERE label='S5';
UPDATE sunbeds SET svg_x=64, svg_y=48, svg_width=10, svg_height=6 WHERE label='S6';
UPDATE sunbeds SET svg_x=75, svg_y=48, svg_width=10, svg_height=6 WHERE label='S7';
UPDATE sunbeds SET svg_x=86, svg_y=48, svg_width=10, svg_height=6 WHERE label='S8';
UPDATE sunbeds SET svg_x=3,  svg_y=55, svg_width=10, svg_height=6 WHERE label='S9';
UPDATE sunbeds SET svg_x=14, svg_y=55, svg_width=10, svg_height=6 WHERE label='S10';
UPDATE sunbeds SET svg_x=25, svg_y=55, svg_width=10, svg_height=6 WHERE label='S11';
UPDATE sunbeds SET svg_x=36, svg_y=55, svg_width=10, svg_height=6 WHERE label='S12';
UPDATE sunbeds SET svg_x=53, svg_y=55, svg_width=10, svg_height=6 WHERE label='S13';
UPDATE sunbeds SET svg_x=64, svg_y=55, svg_width=10, svg_height=6 WHERE label='S14';
UPDATE sunbeds SET svg_x=75, svg_y=55, svg_width=10, svg_height=6 WHERE label='S15';
UPDATE sunbeds SET svg_x=86, svg_y=55, svg_width=10, svg_height=6 WHERE label='S16';
UPDATE sunbeds SET svg_x=14, svg_y=62, svg_width=10, svg_height=6 WHERE label='S17';
UPDATE sunbeds SET svg_x=36, svg_y=62, svg_width=10, svg_height=6 WHERE label='S18';
UPDATE sunbeds SET svg_x=64, svg_y=62, svg_width=10, svg_height=6 WHERE label='S19';
UPDATE sunbeds SET svg_x=86, svg_y=62, svg_width=10, svg_height=6 WHERE label='S20';


-- === TABLES RESTAURANT (photo restaurant.png) ===
-- La photo montre : mer en haut, auvent rayé, terrasse avec tables,
-- UNE GRANDE TABLE en bois au centre, tables rondes autour.

-- Terrasse — zone haute (15 tables)
UPDATE restaurant_tables SET svg_x=5,  svg_y=25, svg_width=8,  svg_height=8  WHERE label='T1';
UPDATE restaurant_tables SET svg_x=18, svg_y=25, svg_width=8,  svg_height=8  WHERE label='T2';
UPDATE restaurant_tables SET svg_x=31, svg_y=25, svg_width=8,  svg_height=8  WHERE label='T3';
UPDATE restaurant_tables SET svg_x=56, svg_y=24, svg_width=12, svg_height=9  WHERE label='T4';
UPDATE restaurant_tables SET svg_x=73, svg_y=25, svg_width=8,  svg_height=8  WHERE label='T5';
UPDATE restaurant_tables SET svg_x=86, svg_y=25, svg_width=8,  svg_height=8  WHERE label='T6';
UPDATE restaurant_tables SET svg_x=5,  svg_y=36, svg_width=8,  svg_height=8  WHERE label='T7';
UPDATE restaurant_tables SET svg_x=18, svg_y=36, svg_width=8,  svg_height=8  WHERE label='T8';
UPDATE restaurant_tables SET svg_x=56, svg_y=35, svg_width=12, svg_height=9  WHERE label='T9';
UPDATE restaurant_tables SET svg_x=73, svg_y=36, svg_width=8,  svg_height=8  WHERE label='T10';
UPDATE restaurant_tables SET svg_x=86, svg_y=36, svg_width=8,  svg_height=8  WHERE label='T11';
UPDATE restaurant_tables SET svg_x=5,  svg_y=47, svg_width=8,  svg_height=8  WHERE label='T12';
UPDATE restaurant_tables SET svg_x=18, svg_y=47, svg_width=8,  svg_height=8  WHERE label='T13';
UPDATE restaurant_tables SET svg_x=73, svg_y=47, svg_width=8,  svg_height=8  WHERE label='T14';
UPDATE restaurant_tables SET svg_x=86, svg_y=47, svg_width=8,  svg_height=8  WHERE label='T15';

-- Vue Mer — zone centrale (8 tables) — inclut la GRANDE TABLE
UPDATE restaurant_tables SET svg_x=5,  svg_y=58, svg_width=8,  svg_height=8  WHERE label='M1';
UPDATE restaurant_tables SET svg_x=18, svg_y=57, svg_width=12, svg_height=9  WHERE label='M2';
UPDATE restaurant_tables SET svg_x=80, svg_y=58, svg_width=8,  svg_height=8  WHERE label='M3';
UPDATE restaurant_tables SET svg_x=5,  svg_y=68, svg_width=7,  svg_height=7  WHERE label='M4';
-- ★ LA GRANDE TABLE CENTRALE (longue table en bois) ★
UPDATE restaurant_tables SET svg_x=22, svg_y=42, svg_width=52, svg_height=13 WHERE label='M5';
UPDATE restaurant_tables SET svg_x=86, svg_y=58, svg_width=8,  svg_height=8  WHERE label='M6';
UPDATE restaurant_tables SET svg_x=18, svg_y=68, svg_width=7,  svg_height=7  WHERE label='M7';
UPDATE restaurant_tables SET svg_x=80, svg_y=68, svg_width=8,  svg_height=8  WHERE label='M8';

-- Lounge — zone basse (5 tables)
UPDATE restaurant_tables SET svg_x=8,  svg_y=76, svg_width=14, svg_height=9  WHERE label='L1';
UPDATE restaurant_tables SET svg_x=28, svg_y=77, svg_width=10, svg_height=10 WHERE label='L2';
UPDATE restaurant_tables SET svg_x=42, svg_y=76, svg_width=16, svg_height=9  WHERE label='L3';
UPDATE restaurant_tables SET svg_x=64, svg_y=77, svg_width=10, svg_height=10 WHERE label='L4';
UPDATE restaurant_tables SET svg_x=80, svg_y=76, svg_width=14, svg_height=9  WHERE label='L5';
