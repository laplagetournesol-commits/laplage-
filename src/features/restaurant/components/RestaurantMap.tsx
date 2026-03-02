import React from 'react';
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import type { RestaurantTable, RestaurantZone } from '@/shared/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH * 2;
const MAP_HEIGHT = MAP_WIDTH * 1.1;

const ZONE_COLORS: Record<string, string> = {
  terrasse: colors.sage,
  vue_mer: '#4A90D9',
  lounge: colors.terracotta,
};

interface TableWithZone extends RestaurantTable {
  zone: RestaurantZone;
  isReserved: boolean;
}

interface RestaurantMapProps {
  tables: TableWithZone[];
  selectedId: string | null;
  onSelect: (table: TableWithZone) => void;
}

export function RestaurantMap({ tables, selectedId, onSelect }: RestaurantMapProps) {
  const { theme } = useSunMode();

  return (
    <View style={styles.container}>
      {/* Légende */}
      <View style={[styles.legend, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.legendRow}>
          {Object.entries(ZONE_COLORS).map(([type, color]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                {type === 'terrasse' ? 'Terrasse' : type === 'vue_mer' ? 'Vue Mer' : 'Lounge'}
              </Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.gray[400] }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Réservé</Text>
          </View>
        </View>
      </View>

      <ScrollView
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
          <Image
            source={require('../../../../assets/restaurant-map.jpg')}
            style={styles.mapImage}
            resizeMode="cover"
          />
          <View style={styles.mapOverlay} />

          {/* Labels de zones */}
          <View style={[styles.zoneLabel, { top: '4%', left: '35%' }]}>
            <Text style={[styles.zoneLabelText, { color: ZONE_COLORS.terrasse }]}>
              — Terrasse —
            </Text>
          </View>
          <View style={[styles.zoneLabel, { top: '42%', left: '33%' }]}>
            <Text style={[styles.zoneLabelText, { color: ZONE_COLORS.vue_mer }]}>
              — Vue Mer —
            </Text>
          </View>
          <View style={[styles.zoneLabel, { top: '70%', left: '35%' }]}>
            <Text style={[styles.zoneLabelText, { color: ZONE_COLORS.lounge }]}>
              — Lounge —
            </Text>
          </View>
          <View style={[styles.zoneLabel, { bottom: '2%', left: '30%' }]}>
            <Ionicons name="water" size={14} color={colors.deepSea} />
            <Text style={[styles.zoneLabelText, { color: colors.deepSea }]}> Plage & Mer ↓</Text>
          </View>

          {/* Tables */}
          {tables.map((table) => {
            const isSelected = table.id === selectedId;
            const zoneColor = ZONE_COLORS[table.zone.zone_type] ?? colors.sage;
            const markerColor = table.isReserved ? colors.gray[400] : zoneColor;
            const isRound = table.shape === 'round';

            return (
              <TouchableOpacity
                key={table.id}
                activeOpacity={table.isReserved ? 1 : 0.6}
                onPress={() => !table.isReserved && onSelect(table)}
                style={[
                  styles.marker,
                  {
                    left: `${table.svg_x}%`,
                    top: `${table.svg_y}%`,
                    width: `${table.svg_width}%`,
                    height: `${table.svg_height}%`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.markerInner,
                    {
                      backgroundColor: markerColor,
                      borderRadius: isRound ? 100 : 8,
                      borderColor: isSelected ? colors.white : 'transparent',
                      borderWidth: isSelected ? 2.5 : 0,
                      opacity: table.isReserved ? 0.35 : 0.85,
                    },
                    isSelected && styles.markerSelected,
                  ]}
                >
                  <Text style={styles.markerLabel}>{table.label}</Text>
                  <View style={styles.seatsRow}>
                    <Ionicons name="people" size={8} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.seatsText}>{table.seats}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.zoomHint, { backgroundColor: theme.card + 'DD' }]}>
        <Ionicons name="resize-outline" size={12} color={theme.textSecondary} />
        <Text style={[styles.zoomHintText, { color: theme.textSecondary }]}>Pincez pour zoomer</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  legend: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { alignItems: 'center', justifyContent: 'center' },
  mapContainer: { width: MAP_WIDTH, height: MAP_HEIGHT, position: 'relative' },
  mapImage: { width: '100%', height: '100%', position: 'absolute' },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 248, 240, 0.6)' },
  zoneLabel: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  zoneLabelText: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
    textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  marker: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  markerInner: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  markerSelected: { shadowOpacity: 0.4, shadowRadius: 8, elevation: 6, transform: [{ scale: 1.1 }] },
  markerLabel: { color: colors.white, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  seatsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seatsText: { color: 'rgba(255,255,255,0.8)', fontSize: 7, fontWeight: '600' },
  zoomHint: {
    position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  zoomHintText: { fontSize: 10, fontWeight: '500' },
});
