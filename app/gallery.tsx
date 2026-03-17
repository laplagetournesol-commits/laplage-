import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { Image } from 'react-native';
// import { Video, ResizeMode } from 'expo-av'; // Nécessite rebuild natif
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { i18n } from '@/shared/i18n';
import { useGalleryPhotos, GalleryItem } from '@/features/gallery/galleryData';

const GALLERY_LABEL_KEYS: Record<string, string> = {
  'Vue aérienne': 'galleryAerialView',
  'Nos transats': 'galleryOurSunbeds',
  'La plage vue du ciel': 'galleryBeachFromSky',
  'Les Tournesols': 'galleryLesTournesols',
  'Cocktail fraise': 'galleryStrawberryCocktail',
  'Serviette Les Tournesols': 'galleryTowel',
  'Art de la table': 'galleryTableSetting',
  'Terrasse vue mer': 'galleryTerraceSeaView',
  'Terrasse': 'galleryTerrace',
  'Terrasse extérieure': 'galleryOutdoorTerrace',
  'Salle intérieure': 'galleryIndoorRoom',
  'Restaurant': 'galleryRestaurant',
  'Vue sur la plage': 'galleryBeachView',
  'Table privée': 'galleryPrivateTable',
};
const translateLabel = (label: string) => GALLERY_LABEL_KEYS[label] ? i18n.t(GALLERY_LABEL_KEYS[label]) : label;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMN_GAP = 3;
const NUM_COLUMNS = 3;
const TILE_SIZE = (SCREEN_WIDTH - COLUMN_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type Category = 'all' | 'plage' | 'restaurant' | 'details';

const getCategoryLabels = (): { key: Category; label: string }[] => [
  { key: 'all', label: i18n.t('all') },
  { key: 'plage', label: i18n.t('beach') },
  { key: 'restaurant', label: i18n.t('restaurant') },
  { key: 'details', label: i18n.t('details') },
];

export default function GalleryScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { photos: galleryItems, loading } = useGalleryPhotos();
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const filtered = activeCategory === 'all'
    ? galleryItems
    : galleryItems.filter((p) => p.category === activeCategory);

  const renderTile = ({ item, index }: { item: GalleryItem; index: number }) => (
    <TouchableOpacity activeOpacity={0.85} onPress={() => setFullscreenIndex(index)}>
      <View>
        <Image
          source={{ uri: item.image_url }}
          style={[styles.tile, {
            marginRight: (index + 1) % NUM_COLUMNS === 0 ? 0 : COLUMN_GAP,
            marginBottom: COLUMN_GAP,
          }]}
          resizeMode="cover"
          transition={200}
        />
        {item.type === 'video' && (
          <View style={[styles.videoBadge, {
            marginRight: (index + 1) % NUM_COLUMNS === 0 ? 0 : COLUMN_GAP,
          }]}>
            <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFullscreenItem = ({ item }: { item: GalleryItem }) => (
    <View style={styles.fullscreenSlide}>
      {/* TODO: ajouter Video quand expo-av sera rebuild */}
      <Image
        source={{ uri: item.image_url }}
        style={styles.fullscreenImage}
        resizeMode="contain"
        transition={200}
      />
      <View style={styles.fullscreenLabel}>
        <Text style={styles.fullscreenLabelText}>{translateLabel(item.label)}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Les Tournesols</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Category filter */}
      <View style={styles.filters}>
        {getCategoryLabels().map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setActiveCategory(cat.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeCategory === cat.key ? theme.accent : theme.card,
                borderColor: activeCategory === cat.key ? theme.accent : theme.cardBorder,
              },
            ]}
          >
            <Text style={[
              styles.filterText,
              { color: activeCategory === cat.key ? '#fff' : theme.textSecondary },
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid */}
      <FlatList
        data={filtered}
        renderItem={renderTile}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      />

      {/* Fullscreen modal */}
      <Modal visible={fullscreenIndex !== null} transparent animationType="fade">
        <StatusBar hidden />
        <View style={styles.fullscreenContainer}>
          <FlatList
            data={filtered}
            renderItem={renderFullscreenItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={fullscreenIndex ?? 0}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />
          <TouchableOpacity
            style={[styles.closeBtn, { top: insets.top + 10 }]}
            onPress={() => setFullscreenIndex(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: 0,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  videoBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: TILE_SIZE,
    height: TILE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  fullscreenLabel: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  fullscreenLabelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
