import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSunMode } from '@/shared/theme';
import { i18n } from '@/shared/i18n';
import { galleryPhotos } from '../galleryData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_HEIGHT = 200;

// Show first 5 photos in carousel (the best ones)
const carouselPhotos = galleryPhotos.slice(0, 5);

export function GalleryCarousel() {
  const { theme } = useSunMode();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{i18n.t('discoverBeach')}</Text>
        <TouchableOpacity onPress={() => router.push('/gallery')}>
          <Text style={[styles.seeAll, { color: theme.accent }]}>{i18n.t('seeAll')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
      >
        {carouselPhotos.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            activeOpacity={0.9}
            onPress={() => router.push('/gallery')}
          >
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Image
                source={photo.source}
                style={styles.image}
                contentFit="cover"
                transition={300}
              />
              <View style={styles.labelContainer}>
                <Text style={styles.label}>{photo.label}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  labelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
