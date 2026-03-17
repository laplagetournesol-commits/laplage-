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
const RECOMMENDATIONS: Record<MoodType, MoodRecommendation> = {
  chill: {
    spot: {
      type: 'beach',
      zone: 'Premium',
      description: 'Un transat Premium face à la mer, à l\'écart de l\'animation. Le bruit des vagues et une brise légère.',
    },
    drinks: ['Mojito Classique', 'Eau de coco fraîche', 'Thé glacé maison'],
    food: ['Plateau de fruits frais', 'Poke bowl açaí'],
    playlist: 'Chill Ibiza Sunset — Deep house mélodique & sons organiques',
    tip: 'Demandez le transat P7 ou P8, ils sont les plus isolés avec la meilleure vue.',
    addons: ['Parasol XL', 'Kit serviettes'],
  },
  fiesta: {
    spot: {
      type: 'beach',
      zone: 'Front Row',
      description: 'Première ligne, au cœur de l\'action ! Près des enceintes et du bar.',
    },
    drinks: ['Pack Cocktails x4', 'Bouteille de Rosé', 'Spritz Aperol'],
    food: ['Nachos à partager', 'Plateau de tapas'],
    playlist: 'Pool Party Anthems — Hit remixes & tropical house',
    tip: 'Le dimanche est Sunday Rosé Day — rosé à volonté et DJ set toute la journée !',
    addons: ['Pack Cocktails x4', 'Table basse'],
  },
  romantic: {
    spot: {
      type: 'restaurant',
      zone: 'Vue Mer',
      description: 'Table pour deux en première ligne, face au coucher de soleil. Service discret et attentionné.',
    },
    drinks: ['Champagne Moët', 'Cocktail Rose Petal', 'Vin blanc Chablis'],
    food: ['Huîtres fraîches (6)', 'Homard grillé', 'Tiramisu pour deux'],
    playlist: 'Mediterranean Jazz — Bossa nova & jazz acoustique',
    tip: 'Réservez le service dîner (19h30) pour profiter du sunset depuis votre table.',
    addons: ['Champagne'],
  },
  family: {
    spot: {
      type: 'beach',
      zone: 'Standard',
      description: 'Zone Standard, spacieuse et accessible. Proche des sanitaires et du bar à glaces.',
    },
    drinks: ['Jus d\'orange pressé', 'Limonade maison', 'Cocktail sans alcool'],
    food: ['Fish & chips enfant', 'Plateau de fruits', 'Glace artisanale'],
    playlist: 'Beach Family Vibes — Pop feel-good & reggae doux',
    tip: 'Le brunch du dimanche inclut des activités pour les enfants !',
    addons: ['Parasol XL', 'Table basse', 'Kit serviettes'],
  },
  business: {
    spot: {
      type: 'restaurant',
      zone: 'Lounge',
      description: 'Espace Lounge intimiste avec banquettes confortables. Wi-Fi haut débit et prises disponibles.',
    },
    drinks: ['Espresso double', 'Eau San Pellegrino', 'Gin Tonic premium'],
    food: ['Club sandwich', 'Salade César', 'Café gourmand'],
    playlist: 'Focus & Groove — Lo-fi & deep house minimaliste',
    tip: 'Le Lounge est le plus calme entre 14h et 17h, idéal pour vos réunions.',
    addons: [],
  },
};

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
    const rec = RECOMMENDATIONS[mood];
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
