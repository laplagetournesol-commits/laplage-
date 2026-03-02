/**
 * Palette de couleurs Les Tournesols
 * Beach club Marbella — French Riviera style
 */

export const colors = {
  // Couleur signature (du logo — CMYK 24-84-95-16)
  brand: '#A3220B',

  // Couleurs principales
  sunYellow: '#F7D94E',
  cream: '#FDF8F0',
  warmWood: '#8B5E3C',
  deepSea: '#1B3A5C',
  accentRed: '#C94040',
  sage: '#7BA68E',
  terracotta: '#C2703E',

  // Neutres
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },

  // Transparences
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.15)',
  sunYellowLight: 'rgba(247, 217, 78, 0.15)',
  deepSeaLight: 'rgba(27, 58, 92, 0.1)',
  brandLight: 'rgba(163, 34, 11, 0.1)',
} as const;

/**
 * Thèmes Sun Mode — L'UI change selon l'heure de la journée
 */
export type SunPeriod = 'morning' | 'day' | 'sunset' | 'night';

export interface SunTheme {
  period: SunPeriod;
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentSecondary: string;
  card: string;
  cardBorder: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  statusBar: 'light' | 'dark';
  gradientStart: string;
  gradientEnd: string;
}

export const sunThemes: Record<SunPeriod, SunTheme> = {
  // 6h - 12h : Doux, lumineux, tons dorés
  morning: {
    period: 'morning',
    background: '#FDF8F0',
    backgroundSecondary: '#FFF9E6',
    text: '#1A1A1A',
    textSecondary: '#78716C',
    accent: '#F7D94E',
    accentSecondary: '#C2703E',
    card: '#FFFFFF',
    cardBorder: '#E7E5E4',
    tabBar: '#FFFFFF',
    tabBarActive: '#C2703E',
    tabBarInactive: '#A8A29E',
    statusBar: 'dark',
    gradientStart: '#FFF3C4',
    gradientEnd: '#FDF8F0',
  },

  // 12h - 17h : Éclatant, solaire, contrastes forts
  day: {
    period: 'day',
    background: '#FFFFFF',
    backgroundSecondary: '#FDF8F0',
    text: '#1A1A1A',
    textSecondary: '#57534E',
    accent: '#F7D94E',
    accentSecondary: '#1B3A5C',
    card: '#FFFFFF',
    cardBorder: '#E7E5E4',
    tabBar: '#FFFFFF',
    tabBarActive: '#1B3A5C',
    tabBarInactive: '#A8A29E',
    statusBar: 'dark',
    gradientStart: '#F7D94E',
    gradientEnd: '#FFFFFF',
  },

  // 17h - 20h : Golden hour, chaud, romantique
  sunset: {
    period: 'sunset',
    background: '#FDF5E8',
    backgroundSecondary: '#F9EBD0',
    text: '#1A1A1A',
    textSecondary: '#8B5E3C',
    accent: '#C2703E',
    accentSecondary: '#C94040',
    card: '#FFFAF0',
    cardBorder: '#E8D5BC',
    tabBar: '#FFF8F0',
    tabBarActive: '#C2703E',
    tabBarInactive: '#A8A29E',
    statusBar: 'dark',
    gradientStart: '#F2994A',
    gradientEnd: '#F7D94E',
  },

  // 20h - 6h : Élégant, nocturne, bleu profond
  night: {
    period: 'night',
    background: '#0F1B2D',
    backgroundSecondary: '#162236',
    text: '#F5F5F4',
    textSecondary: '#A8A29E',
    accent: '#F7D94E',
    accentSecondary: '#7BA68E',
    card: '#1B2A40',
    cardBorder: '#2D3E55',
    tabBar: '#0F1B2D',
    tabBarActive: '#F7D94E',
    tabBarInactive: '#57534E',
    statusBar: 'light',
    gradientStart: '#1B3A5C',
    gradientEnd: '#0F1B2D',
  },
};

/**
 * Détermine la période Sun Mode selon l'heure
 */
export function getSunPeriod(hour?: number): SunPeriod {
  const h = hour ?? new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'sunset';
  return 'night';
}
