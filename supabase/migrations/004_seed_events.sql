-- =============================================
-- Les Tournesols — Seed événements
-- =============================================

INSERT INTO events (title, description, category, date, start_time, end_time, lineup, capacity, standard_price, vip_price, is_secret, secret_code, is_published) VALUES
(
  'Sunset Beats',
  'La pool party signature des Tournesols. DJs, cocktails et coucher de soleil sur la Méditerranée.',
  'pool_party',
  '2026-03-08',
  '16:00', '23:00',
  ARRAY['DJ Marco', 'Lisa Ray'],
  300, 45, 120, FALSE, NULL, TRUE
),
(
  'Brunch Méditerranéen',
  'Buffet gastronomique face à la mer. Fruits de mer, charcuterie ibérique, pâtisseries artisanales et champagne à volonté.',
  'brunch',
  '2026-03-09',
  '11:00', '15:00',
  NULL,
  80, 65, NULL, FALSE, NULL, TRUE
),
(
  'Noche Flamenca',
  'Une soirée de flamenco authentique avec dîner gastronomique. Spectacle live avec les meilleurs artistes d''Andalousie.',
  'dinner_show',
  '2026-03-14',
  '20:00', '01:00',
  ARRAY['Paco de Lucía Jr', 'María Terremoto'],
  120, 85, 200, FALSE, NULL, TRUE
),
(
  'Full Moon Secret Party',
  'Événement exclusif réservé aux membres. Lieu tenu secret jusqu''au dernier moment. Code d''accès requis.',
  'special',
  '2026-03-15',
  '22:00', '04:00',
  NULL,
  50, 0, NULL, TRUE, 'LUNA2026', TRUE
),
(
  'Sunday Rosé Day',
  'Rosé à volonté, DJ set chill et ambiance Saint-Tropez toute la journée.',
  'pool_party',
  '2026-03-16',
  '12:00', '20:00',
  ARRAY['DJ Soleil', 'Tropical House Collective'],
  200, 35, 80, FALSE, NULL, TRUE
),
(
  'Soirée Jazz & Oysters',
  'Jazz live, huîtres fraîches et champagne sous les étoiles.',
  'dinner_show',
  '2026-03-21',
  '19:30', '23:30',
  ARRAY['The Mediterranean Jazz Quartet'],
  80, 95, 180, FALSE, NULL, TRUE
),
(
  'Easter Beach Brunch',
  'Brunch spécial de Pâques avec chasse aux œufs pour les enfants et menu gastronomique pour les grands.',
  'brunch',
  '2026-04-05',
  '10:00', '16:00',
  NULL,
  150, 75, NULL, FALSE, NULL, TRUE
),
(
  'Platinum Members Night',
  'Soirée ultra-exclusive réservée aux membres Platinum. Champagne Dom Pérignon, menu dégustation et DJ privé.',
  'private',
  '2026-03-22',
  '21:00', '03:00',
  ARRAY['DJ Privé'],
  30, 0, NULL, TRUE, NULL, TRUE
);
