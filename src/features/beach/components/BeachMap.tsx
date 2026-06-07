import React, { useState } from 'react';
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
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import type { Sunbed, BeachZone } from '@/shared/types';
import { i18n } from '@/shared/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_VERSION = 6;

// "new transat.png" : 1118×816 (landscape)
const MAP_WIDTH = SCREEN_WIDTH;
const MAP_HEIGHT = MAP_WIDTH * (816 / 1118);

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const REMOTE_MAP_URL = `${SUPABASE_URL}/storage/v1/object/public/assets/transat.png?v=${MAP_VERSION}`;

interface SunbedWithZone extends Sunbed {
  zone: BeachZone;
  isReserved: boolean;
}

interface BeachMapProps {
  sunbeds: SunbedWithZone[];
  selectedId: string | null;
  selectedIds?: Set<string>;
  secondarySelectedId?: string | null;
  onSelect: (sunbed: SunbedWithZone) => void;
  onReservedPress?: (sunbed: SunbedWithZone) => void;
}

export function BeachMap({
  sunbeds,
  selectedId,
  selectedIds,
  secondarySelectedId,
  onSelect,
  onReservedPress,
}: BeachMapProps) {
  const { theme } = useSunMode();
  const [useRemote, setUseRemote] = useState(true);

  const mapSource = useRemote
    ? { uri: REMOTE_MAP_URL }
    : require('../../../../assets/transat.png');

  return (
    <View style={styles.container}>
      {/* Légende */}
      <View style={[styles.legend, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: 'rgba(34, 180, 60, 0.5)', borderWidth: 2, borderColor: 'rgba(34, 180, 60, 0.8)' },
              ]}
            />
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

      {/* Carte zoomable (pinch-to-zoom iOS) */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        bouncesZoom
        pinchGestureEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        centerContent
      >
        <View style={[styles.mapContainer, { width: MAP_WIDTH, height: MAP_HEIGHT }]}>
          <Image
            source={mapSource}
            style={styles.mapImage}
            resizeMode="contain"
            onError={() => setUseRemote(false)}
          />

          {sunbeds.map((sunbed) => {
            const isSelected = sunbed.id === selectedId || (selectedIds?.has(sunbed.id) ?? false);
            const isPaired = sunbed.id === secondarySelectedId;
            const isReserved = sunbed.isReserved;

            return (
              <TouchableOpacity
                key={sunbed.id}
                activeOpacity={isReserved && !onReservedPress ? 1 : 0.6}
                onPress={() => {
                  if (isReserved && onReservedPress) {
                    onReservedPress(sunbed);
                    return;
                  }
                  if (!isReserved && !isPaired) onSelect(sunbed);
                }}
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
                    sunbed.is_double && styles.markerBed,
                    (isSelected || isPaired) && styles.markerSelected,
                    isReserved && styles.markerReserved,
                  ]}
                >
                  {sunbed.is_double && <Text style={styles.bedLabel}>BED</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  scrollView: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
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
  markerBed: {
    backgroundColor: 'rgba(180, 100, 30, 0.45)',
    borderColor: 'rgba(180, 100, 30, 0.9)',
    borderWidth: 2,
  },
  bedLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  markerReserved: {
    backgroundColor: 'rgba(220, 38, 38, 0.4)',
    borderColor: 'rgba(220, 38, 38, 0.8)',
    borderWidth: 1.5,
  },
});
