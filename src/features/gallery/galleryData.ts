import { ImageSourcePropType } from 'react-native';

export interface GalleryItem {
  id: string;
  source: ImageSourcePropType;
  label: string;
  category: 'plage' | 'restaurant' | 'details';
  type: 'photo' | 'video';
}

export const galleryItems: GalleryItem[] = [
  // Retouched hero photos
  { id: '1', source: require('@/../assets/gallery/beach-drone-1.png'), label: 'Vue aérienne', category: 'plage', type: 'photo' },
  { id: '2', source: require('@/../assets/gallery/beach-sunbeds-1.png'), label: 'Nos transats', category: 'plage', type: 'photo' },
  { id: '3', source: require('@/../assets/gallery/beach-aerial-1.png'), label: 'La plage vue du ciel', category: 'plage', type: 'photo' },
  { id: '4', source: require('@/../assets/gallery/beach-front-1.png'), label: 'Les Tournesols', category: 'plage', type: 'photo' },

  // Cocktail & details
  { id: '5', source: require('@/../assets/gallery/cocktail.jpg'), label: 'Cocktail fraise', category: 'details', type: 'photo' },
  { id: '6', source: require('@/../assets/gallery/towel.jpg'), label: 'Serviette Les Tournesols', category: 'details', type: 'photo' },
  { id: '7', source: require('@/../assets/gallery/table-setting.jpg'), label: 'Art de la table', category: 'details', type: 'photo' },

  // Restaurant
  { id: '8', source: require('@/../assets/gallery/terrace-1.jpg'), label: 'Terrasse vue mer', category: 'restaurant', type: 'photo' },
  { id: '9', source: require('@/../assets/gallery/terrace-2.jpg'), label: 'Terrasse', category: 'restaurant', type: 'photo' },
  { id: '10', source: require('@/../assets/gallery/terrace-3.jpg'), label: 'Terrasse extérieure', category: 'restaurant', type: 'photo' },
  { id: '11', source: require('@/../assets/gallery/restaurant-inside-1.jpg'), label: 'Salle intérieure', category: 'restaurant', type: 'photo' },
  { id: '12', source: require('@/../assets/gallery/restaurant-inside-2.jpg'), label: 'Restaurant', category: 'restaurant', type: 'photo' },
  { id: '13', source: require('@/../assets/gallery/restaurant-inside-3.jpg'), label: 'Vue sur la plage', category: 'restaurant', type: 'photo' },
  { id: '14', source: require('@/../assets/gallery/restaurant-table.jpg'), label: 'Table privée', category: 'restaurant', type: 'photo' },
];

// For carousel — best photos
export const galleryPhotos = galleryItems.slice(0, 5);
