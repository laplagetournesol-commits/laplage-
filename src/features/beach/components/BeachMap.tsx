import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import type { Sunbed, BeachZone } from '@/shared/types';
import { i18n } from '@/shared/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Sur web desktop, limiter la largeur pour ne pas avoir une carte géante
const MAP_WIDTH = Platform.OS === 'web' ? Math.min(SCREEN_WIDTH, 500) : SCREEN_WIDTH;
const MAP_HEIGHT = MAP_WIDTH * 1.5;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const REMOTE_MAP_URL = `${SUPABASE_URL}/storage/v1/object/public/assets/transat.png`;

interface SunbedWithZone extends Sunbed {
  zone: BeachZone;
  isReserved: boolean;
}

interface BeachMapProps {
  sunbeds: SunbedWithZone[];
  selectedId: string | null;
  onSelect: (sunbed: SunbedWithZone) => void;
}

export function BeachMap({ sunbeds, selectedId, onSelect }: BeachMapProps) {
  const { theme } = useSunMode();
  const scrollRef = useRef<ScrollView>(null);
  const [useRemote, setUseRemote] = useState(true);

  const mapSource = useRemote
    ? { uri: REMOTE_MAP_URL }
    : require('../../../../assets/transat.png');

  return (
    <View style={styles.container}>
      {/* Légende discrète */}
      <View style={[styles.legend, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(34, 180, 60, 0.5)', borderWidth: 2, borderColor: 'rgba(34, 180, 60, 0.8)' }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>{i18n.t('available')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgba(220, 38, 38, 0.5)' }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>{i18n.t('reserved')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.sunYellow }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>{i18n.t('selected')}</Text>
          </View>
        </View>
      </View>

      {/* Carte zoomable */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={Platform.OS === 'web' ? 1 : 4}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
        centerContent
      >
        <View style={styles.mapContainer}>
          {/* Photo chargée depuis Supabase Storage (fallback local) */}
          <Image
            source={mapSource}
            style={styles.mapImage}
            resizeMode="contain"
            onError={() => setUseRemote(false)}
          />

          {/* Zones cliquables transparentes sur la photo */}
          {sunbeds.map((sunbed) => {
            const isSelected = sunbed.id === selectedId;
            const isReserved = sunbed.isReserved;

            return (
              <TouchableOpacity
                key={sunbed.id}
                activeOpacity={isReserved ? 1 : 0.6}
                onPress={() => !isReserved && onSelect(sunbed)}
                style={[
                  styles.marker,
                  {
                    left: `${sunbed.svg_x}%`,
                    top: `${sunbed.svg_y}%`,
                    width: `${sunbed.svg_width}%`,
                    height: `${sunbed.svg_height}%`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.markerInner,
                    isSelected && styles.markerSelected,
                    isReserved && styles.markerReserved,
                  ]}
                >
                  <Text style={styles.markerLabel}>{sunbed.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Légende prix */}
      <View style={styles.priceLegend}>
        <View style={[styles.priceLegendItem, { backgroundColor: 'rgba(101, 67, 33, 0.92)' }]}>
          <Text style={styles.priceLegendIcon}>🏖</Text>
          <Text style={styles.priceLegendLabel}>{i18n.t('categorySunbed')} + {i18n.t('parasolIncluded').split('+')[0].trim().toLowerCase()}</Text>
          <Text style={styles.priceLegendPrice}>20€ / {i18n.t('perDay')}</Text>
        </View>
        <View style={[styles.priceLegendItem, { backgroundColor: 'rgba(85, 85, 60, 0.92)' }]}>
          <Text style={styles.priceLegendIcon}>🪑</Text>
          <Text style={styles.priceLegendLabel}>{i18n.t('categoryLoungeChair')}</Text>
          <Text style={styles.priceLegendPrice}>10€ / {i18n.t('perDay')}</Text>
        </View>
      </View>

      {/* Hint zoom */}
      <View style={[styles.zoomHint, { backgroundColor: theme.card + 'DD' }]}>
        <Ionicons name="resize-outline" size={12} color={theme.textSecondary} />
        <Text style={[styles.zoomHintText, { color: theme.textSecondary }]}>
          {i18n.t('zoomHint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  legend: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 180, 60, 0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 180, 60, 0.8)',
  },
  markerSelected: {
    backgroundColor: 'rgba(247, 217, 78, 0.5)',
    borderColor: colors.sunYellow,
    borderWidth: 1.5,
  },
  markerReserved: {
    backgroundColor: 'rgba(220, 38, 38, 0.4)',
    borderColor: 'rgba(220, 38, 38, 0.8)',
    borderWidth: 1.5,
  },
  markerLabel: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  priceLegend: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  priceLegendItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  priceLegendIcon: {
    fontSize: 14,
  },
  priceLegendLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  priceLegendPrice: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  zoomHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  zoomHintText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
