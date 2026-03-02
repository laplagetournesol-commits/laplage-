import React, { useRef } from 'react';
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import type { Sunbed, BeachZone } from '@/shared/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// La carte fait 2x la largeur de l'écran pour permettre le zoom
const MAP_WIDTH = SCREEN_WIDTH * 2;
const MAP_HEIGHT = MAP_WIDTH * 1.4;

// Couleurs des zones sur la carte
const ZONE_COLORS: Record<string, string> = {
  standard: colors.sage,
  premium: '#4A90D9',
  front_row: colors.sunYellow,
  vip_cabana: colors.accentRed,
};

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

  const getMarkerColor = (sunbed: SunbedWithZone) => {
    if (sunbed.isReserved) return colors.gray[400];
    return ZONE_COLORS[sunbed.zone.zone_type] ?? colors.sage;
  };

  return (
    <View style={styles.container}>
      {/* Légende en haut */}
      <View style={[styles.legend, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.legendRow}>
          {Object.entries(ZONE_COLORS).map(([type, color]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                {type === 'standard' ? 'Standard' :
                 type === 'premium' ? 'Premium' :
                 type === 'front_row' ? 'Front Row' : 'VIP'}
              </Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.gray[400] }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Réservé</Text>
          </View>
        </View>
      </View>

      {/* Carte zoomable */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={3}
        minimumZoomScale={0.8}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
        centerContent
      >
        <View style={styles.mapContainer}>
          {/* Image de fond de la plage */}
          <Image
            source={require('../../../../assets/beach-map.jpg')}
            style={styles.mapImage}
            resizeMode="cover"
          />

          {/* Overlay sable semi-transparent pour lisibilité */}
          <View style={styles.mapOverlay} />

          {/* Indicateurs de zone */}
          <View style={[styles.zoneLabel, { top: '5%', left: '35%' }]}>
            <Text style={styles.zoneLabelText}>Restaurant ↑</Text>
          </View>
          <View style={[styles.zoneLabel, { top: '8%', left: '30%' }]}>
            <Text style={[styles.zoneLabelText, { color: ZONE_COLORS.standard }]}>
              — Standard —
            </Text>
          </View>
          <View style={[styles.zoneLabel, { top: '32%', left: '32%' }]}>
            <Text style={[styles.zoneLabelText, { color: ZONE_COLORS.premium }]}>
              — Premium —
            </Text>
          </View>
          <View style={[styles.zoneLabel, { top: '50%', left: '30%' }]}>
            <Text style={[styles.zoneLabelText, { color: ZONE_COLORS.front_row }]}>
              — Front Row —
            </Text>
          </View>
          <View style={[styles.zoneLabel, { top: '64%', left: '28%' }]}>
            <Text style={[styles.zoneLabelText, { color: ZONE_COLORS.vip_cabana }]}>
              — VIP Cabanas —
            </Text>
          </View>
          <View style={[styles.zoneLabel, { bottom: '3%', left: '35%' }]}>
            <Ionicons name="water" size={14} color={colors.deepSea} />
            <Text style={[styles.zoneLabelText, { color: colors.deepSea }]}> Mer</Text>
          </View>

          {/* Marqueurs des transats */}
          {sunbeds.map((sunbed) => {
            const isSelected = sunbed.id === selectedId;
            const markerColor = getMarkerColor(sunbed);

            return (
              <TouchableOpacity
                key={sunbed.id}
                activeOpacity={sunbed.isReserved ? 1 : 0.6}
                onPress={() => !sunbed.isReserved && onSelect(sunbed)}
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
                    {
                      backgroundColor: markerColor,
                      borderColor: isSelected ? colors.white : 'transparent',
                      borderWidth: isSelected ? 2.5 : 0,
                      opacity: sunbed.isReserved ? 0.4 : 0.85,
                    },
                    isSelected && styles.markerSelected,
                  ]}
                >
                  {/* Icône parasol */}
                  <Ionicons
                    name={sunbed.is_double ? 'bed' : 'umbrella'}
                    size={sunbed.is_double ? 14 : 12}
                    color={colors.white}
                  />
                  <Text style={styles.markerLabel}>{sunbed.label}</Text>
                </View>

                {/* Indicateur sélectionné */}
                {isSelected && (
                  <View style={styles.selectedPulse} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Hint zoom */}
      <View style={[styles.zoomHint, { backgroundColor: theme.card + 'DD' }]}>
        <Ionicons name="resize-outline" size={12} color={theme.textSecondary} />
        <Text style={[styles.zoomHintText, { color: theme.textSecondary }]}>
          Pincez pour zoomer
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
    gap: 12,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
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
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 230, 200, 0.55)',
  },
  zoneLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  markerSelected: {
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.1 }],
  },
  markerLabel: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  selectedPulse: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white,
    opacity: 0.5,
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
