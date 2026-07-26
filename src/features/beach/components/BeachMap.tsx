import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/shared/lib/supabase';
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

  // Rotation du plan, configurable en base (restaurant_settings / beach_map_rotation).
  // 0 / 90 / 180 / 270. Permet de tourner la carte sans rebuild.
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'beach_map_rotation')
      .maybeSingle()
      .then(({ data }) => {
        const v = Number(data?.value);
        if (!Number.isNaN(v)) setRotation(((v % 360) + 360) % 360);
      });
  }, []);

  const mapSource = useRemote
    ? { uri: REMOTE_MAP_URL }
    : require('../../../../assets/transat.png');

  // 1ère rangée = chaises longues (numéros en 100). On calcule le centre de la rangée
  // pour y afficher un gros label sur la carte.
  const frontBeds = sunbeds.filter((s) => {
    const n = parseInt(String(s.label ?? ''), 10);
    return Number.isFinite(n) && n >= 100 && n < 200;
  });
  const frontRow = frontBeds.length
    ? {
        x: frontBeds.reduce((a, s) => a + s.svg_x + s.svg_width / 2, 0) / frontBeds.length,
        // juste SOUS la rangée (bas des transats + marge), pas dessus
        y: Math.max(...frontBeds.map((s) => s.svg_y + s.svg_height)) + 2,
      }
    : null;

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
        <Text style={[styles.legendNote, { color: theme.text, backgroundColor: colors.sunYellow + '40' }]}>
          {`ℹ️  ${i18n.t('beachFrontRowNote') ?? 'Les nº 100 (1ère rangée) sont des chaises longues'}`}
        </Text>
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
        <View style={[styles.mapContainer, { width: MAP_WIDTH, height: MAP_HEIGHT, transform: [{ rotate: `${rotation}deg` }] }]}>
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
                  <Text
                    style={[styles.numLabel, rotation ? { transform: [{ rotate: `${-rotation}deg` }] } : null]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.4}
                    allowFontScaling={false}
                  >
                    {sunbed.label}
                  </Text>
                  {sunbed.is_double && (
                    <Text
                      style={[styles.bedLabel, rotation ? { transform: [{ rotate: `${-rotation}deg` }] } : null]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      allowFontScaling={false}
                    >
                      BED
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Gros label « Chaises longues » sur la 1ère rangée (nº 100) */}
          {frontRow && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: `${frontRow.x}%`,
                top: `${frontRow.y}%`,
                width: 160,
                marginLeft: -80,
                alignItems: 'center',
              }}
            >
              <Text style={[styles.rowLabel, rotation ? { transform: [{ rotate: `${-rotation}deg` }] } : null]}>
                {i18n.t('beachFrontRowLabel') ?? 'Chaises longues'}
              </Text>
            </View>
          )}
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
  legendNote: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1A1A1A',
    backgroundColor: 'rgba(247, 217, 78, 0.94)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 9,
    overflow: 'hidden',
    textAlign: 'center',
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
  numLabel: {
    width: '100%',
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 1,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bedLabel: {
    color: '#FFFFFF',
    fontSize: 7,
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
