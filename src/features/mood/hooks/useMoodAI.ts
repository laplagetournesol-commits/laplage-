import { useState, useCallback } from 'react';
import { i18n } from '@/shared/i18n';

export type MoodType = 'chill' | 'fiesta' | 'romantic' | 'family' | 'business';

interface MoodOption {
  id: MoodType;
  emoji: string;
  label: string;
  description: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'chill', emoji: '🧘', get label() { return i18n.t('moodChill'); }, get description() { return i18n.t('moodChillDesc'); } },
  { id: 'fiesta', emoji: '🎉', get label() { return i18n.t('moodFiesta'); }, get description() { return i18n.t('moodFiestaDesc'); } },
  { id: 'romantic', emoji: '💕', get label() { return i18n.t('moodRomantic'); }, get description() { return i18n.t('moodRomanticDesc'); } },
  { id: 'family', emoji: '👨‍👩‍👧‍👦', get label() { return i18n.t('moodFamily'); }, get description() { return i18n.t('moodFamilyDesc'); } },
  { id: 'business', emoji: '💼', get label() { return i18n.t('moodBusiness'); }, get description() { return i18n.t('moodBusinessDesc'); } },
];

export interface MoodRecommendation {
  spot: {
    type: 'beach' | 'restaurant';
    zone: string;
    description: string;
  };
  drinks: string[];
  food: string[];
  playlist: string;
  tip: string;
  addons: string[];
}

// Recommandations pré-configurées (fallback sans API Claude)
function getRecommendations(): Record<MoodType, MoodRecommendation> {
  return {
    chill: {
      spot: {
        type: 'beach',
        zone: 'Premium',
        description: i18n.t('moodChillSpotDesc'),
      },
      drinks: [i18n.t('moodChillDrink1'), i18n.t('moodChillDrink2'), i18n.t('moodChillDrink3')],
      food: [i18n.t('moodChillFood1'), i18n.t('moodChillFood2')],
      playlist: 'Chill Ibiza Sunset — Deep house & organic sounds',
      tip: i18n.t('moodChillTip'),
      addons: [i18n.t('moodAddonParasolXL'), i18n.t('moodAddonTowelKit')],
    },
    fiesta: {
      spot: {
        type: 'beach',
        zone: 'Front Row',
        description: i18n.t('moodFiestaSpotDesc'),
      },
      drinks: [i18n.t('moodFiestaDrink1'), i18n.t('moodFiestaDrink2'), 'Spritz Aperol'],
      food: [i18n.t('moodFiestaFood1'), i18n.t('moodFiestaFood2')],
      playlist: 'Pool Party Anthems — Hit remixes & tropical house',
      tip: i18n.t('moodFiestaTip'),
      addons: [i18n.t('moodFiestaDrink1'), i18n.t('moodAddonCoffeeTable')],
    },
    romantic: {
      spot: {
        type: 'restaurant',
        zone: i18n.t('moodRomanticZone'),
        description: i18n.t('moodRomanticSpotDesc'),
      },
      drinks: ['Champagne Moët', 'Cocktail Rose Petal', i18n.t('moodRomanticDrink3')],
      food: [i18n.t('moodRomanticFood1'), i18n.t('moodRomanticFood2'), i18n.t('moodRomanticFood3')],
      playlist: 'Mediterranean Jazz — Bossa nova & acoustic jazz',
      tip: i18n.t('moodRomanticTip'),
      addons: ['Champagne'],
    },
    family: {
      spot: {
        type: 'beach',
        zone: 'Standard',
        description: i18n.t('moodFamilySpotDesc'),
      },
      drinks: [i18n.t('moodFamilyDrink1'), i18n.t('moodFamilyDrink2'), i18n.t('moodFamilyDrink3')],
      food: [i18n.t('moodFamilyFood1'), i18n.t('moodFamilyFood2'), i18n.t('moodFamilyFood3')],
      playlist: 'Beach Family Vibes — Pop feel-good & soft reggae',
      tip: i18n.t('moodFamilyTip'),
      addons: [i18n.t('moodAddonParasolXL'), i18n.t('moodAddonCoffeeTable'), i18n.t('moodAddonTowelKit')],
    },
    business: {
      spot: {
        type: 'restaurant',
        zone: 'Lounge',
        description: i18n.t('moodBusinessSpotDesc'),
      },
      drinks: [i18n.t('moodBusinessDrink1'), 'San Pellegrino', 'Gin Tonic premium'],
      food: ['Club sandwich', i18n.t('moodBusinessFood2'), i18n.t('moodBusinessFood3')],
      playlist: 'Focus & Groove — Lo-fi & minimal deep house',
      tip: i18n.t('moodBusinessTip'),
      addons: [],
    },
  };
}

// Persiste le dernier mood entre navigations (survit au remount du composant)
let lastMood: MoodType | null = null;
let lastRecommendation: MoodRecommendation | null = null;

export function useMoodAI() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(lastMood);
  const [recommendation, setRecommendation] = useState<MoodRecommendation | null>(lastRecommendation);
  const [loading, setLoading] = useState(false);

  const selectMood = useCallback(async (mood: MoodType) => {
    setSelectedMood(mood);
    setLoading(true);

    // Pour l'instant, on utilise les recommandations pré-configurées
    // Plus tard, on pourra appeler l'API Claude pour des recommandations personnalisées
    await new Promise((r) => setTimeout(r, 1200)); // Simule un appel API
    const rec = getRecommendations()[mood];
    setRecommendation(rec);
    setLoading(false);

    lastMood = mood;
    lastRecommendation = rec;
  }, []);

  const reset = useCallback(() => {
    setSelectedMood(null);
    setRecommendation(null);
    lastMood = null;
    lastRecommendation = null;
  }, []);

  return { selectedMood, recommendation, loading, selectMood, reset, moods: MOOD_OPTIONS };
}
