import { useState, useCallback } from 'react';

export type MoodType = 'chill' | 'fiesta' | 'romantic' | 'family' | 'business';

interface MoodOption {
  id: MoodType;
  emoji: string;
  label: string;
  description: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'chill', emoji: '🧘', label: 'Chill', description: 'Détente, tranquillité, zen' },
  { id: 'fiesta', emoji: '🎉', label: 'Fiesta', description: 'Musique, cocktails, ambiance' },
  { id: 'romantic', emoji: '💕', label: 'Romantique', description: 'Dîner à deux, sunset, champagne' },
  { id: 'family', emoji: '👨‍👩‍👧‍👦', label: 'Famille', description: 'Enfants bienvenus, activités' },
  { id: 'business', emoji: '💼', label: 'Business', description: 'Networking, calme, Wi-Fi' },
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

export function useMoodAI() {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [recommendation, setRecommendation] = useState<MoodRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  const selectMood = useCallback(async (mood: MoodType) => {
    setSelectedMood(mood);
    setLoading(true);

    // Pour l'instant, on utilise les recommandations pré-configurées
    // Plus tard, on pourra appeler l'API Claude pour des recommandations personnalisées
    await new Promise((r) => setTimeout(r, 1200)); // Simule un appel API
    setRecommendation(RECOMMENDATIONS[mood]);
    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setSelectedMood(null);
    setRecommendation(null);
  }, []);

  return { selectedMood, recommendation, loading, selectMood, reset, moods: MOOD_OPTIONS };
}
