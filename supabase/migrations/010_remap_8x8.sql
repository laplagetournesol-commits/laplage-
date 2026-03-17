-- =============================================
-- Repositionner transats sur la nouvelle photo 8x8
-- Image: 1024x1536 — Les Tournesols (8 chaises de chaque côté)
-- Layout: 2 rangées de 3 parasols (gauche/droite), 8 chaises longues (gauche/droite)
-- =============================================

-- Désactiver les transats en trop
UPDATE sunbeds SET is_active = FALSE WHERE label IN ('V1','V2','V3','V4','F1','F2','F3','F4','F5','F6','F7','F8','S17','S18','S19','S20','C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','C12','C13','C14','C15','C16');

-- === RANGÉE 1 PARASOLS (proche mer) — Premium ===
UPDATE sunbeds SET svg_x=1.5,  svg_y=30.6, svg_width=12.7, svg_height=11.7 WHERE label='P1';
UPDATE sunbeds SET svg_x=14.5, svg_y=30.6, svg_width=12.7, svg_height=11.7 WHERE label='P2';
UPDATE sunbeds SET svg_x=27.3, svg_y=30.6, svg_width=12.7, svg_height=11.7 WHERE label='P3';
UPDATE sunbeds SET svg_x=59.6, svg_y=30.6, svg_width=12.7, svg_height=11.7 WHERE label='P4';
UPDATE sunbeds SET svg_x=72.8, svg_y=30.6, svg_width=12.7, svg_height=11.7 WHERE label='P5';
UPDATE sunbeds SET svg_x=85.7, svg_y=30.6, svg_width=12.7, svg_height=11.7 WHERE label='P6';

-- === RANGÉE 2 PARASOLS — Premium ===
UPDATE sunbeds SET svg_x=1.5,  svg_y=43.0, svg_width=12.7, svg_height=12.4 WHERE label='P7';
UPDATE sunbeds SET svg_x=14.5, svg_y=43.0, svg_width=12.7, svg_height=12.4 WHERE label='P8';
UPDATE sunbeds SET svg_x=27.3, svg_y=43.0, svg_width=12.7, svg_height=12.4 WHERE label='P9';
UPDATE sunbeds SET svg_x=59.6, svg_y=43.0, svg_width=12.7, svg_height=12.4 WHERE label='P10';
UPDATE sunbeds SET svg_x=72.8, svg_y=43.0, svg_width=12.7, svg_height=12.4 WHERE label='P11';
UPDATE sunbeds SET svg_x=85.7, svg_y=43.0, svg_width=12.7, svg_height=12.4 WHERE label='P12';

-- === CHAISES LONGUES GAUCHE (8) — Standard ===
UPDATE sunbeds SET svg_x=1.0,  svg_y=62.5, svg_width=4.2, svg_height=6.8 WHERE label='S1';
UPDATE sunbeds SET svg_x=6.4,  svg_y=62.5, svg_width=4.1, svg_height=6.8 WHERE label='S2';
UPDATE sunbeds SET svg_x=11.6, svg_y=62.5, svg_width=4.6, svg_height=6.8 WHERE label='S3';
UPDATE sunbeds SET svg_x=17.3, svg_y=62.5, svg_width=4.0, svg_height=6.8 WHERE label='S4';
UPDATE sunbeds SET svg_x=22.5, svg_y=62.5, svg_width=4.7, svg_height=6.8 WHERE label='S5';
UPDATE sunbeds SET svg_x=28.3, svg_y=62.5, svg_width=4.3, svg_height=6.8 WHERE label='S6';
UPDATE sunbeds SET svg_x=33.7, svg_y=62.5, svg_width=4.6, svg_height=6.8 WHERE label='S7';
UPDATE sunbeds SET svg_x=39.3, svg_y=62.5, svg_width=4.2, svg_height=6.8 WHERE label='S8';

-- === CHAISES LONGUES DROITE (8) — Standard ===
UPDATE sunbeds SET svg_x=56.6, svg_y=62.5, svg_width=4.0, svg_height=6.8 WHERE label='S9';
UPDATE sunbeds SET svg_x=61.7, svg_y=62.5, svg_width=4.9, svg_height=6.8 WHERE label='S10';
UPDATE sunbeds SET svg_x=67.6, svg_y=62.5, svg_width=4.4, svg_height=6.8 WHERE label='S11';
UPDATE sunbeds SET svg_x=73.0, svg_y=62.5, svg_width=4.4, svg_height=6.8 WHERE label='S12';
UPDATE sunbeds SET svg_x=78.5, svg_y=62.5, svg_width=4.3, svg_height=6.8 WHERE label='S13';
UPDATE sunbeds SET svg_x=84.0, svg_y=62.5, svg_width=4.4, svg_height=6.8 WHERE label='S14';
UPDATE sunbeds SET svg_x=89.5, svg_y=62.5, svg_width=4.1, svg_height=6.8 WHERE label='S15';
UPDATE sunbeds SET svg_x=94.9, svg_y=62.5, svg_width=4.0, svg_height=6.8 WHERE label='S16';
