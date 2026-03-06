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
// Photo restaurant.png est en portrait — on affiche toute la photo
const MAP_WIDTH = SCREEN_WIDTH;
const MAP_HEIGHT = MAP_WIDTH * 1.5;

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
      {/* Légende discrète */}
      <View style={[styles.legend, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.sunYellow }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Disponible</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accentRed + '60' }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Réservée</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.sunYellow }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>Sélectionnée</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={4}
        minimumZoomScale={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bouncesZoom
        centerContent
      >
        <View style={styles.mapContainer}>
          {/* Photo pleine — PAS d'overlay */}
          <Image
            source={require('../../../../assets/restaurant-photo.png')}
            style={styles.mapImage}
            resizeMode="cover"
          />

          {/* Tables cliquables sur la photo */}
          {tables.map((table) => {
            const isSelected = table.id === selectedId;
            const isReserved = table.isReserved;
            const isRound = table.shape === 'round';

            return (
              <TouchableOpacity
                key={table.id}
                activeOpacity={isReserved ? 1 : 0.6}
                onPress={() => !isReserved && onSelect(table)}
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
                    { borderRadius: isRound ? 100 : 8 },
                    isSelected && [styles.markerSelected, { borderRadius: isRound ? 100 : 8 }],
                    isReserved && styles.markerReserved,
                  ]}
                >
                  {/* Info seulement si sélectionné */}
                  {isSelected && (
                    <View style={styles.selectedInfo}>
                      <Text style={styles.selectedLabel}>{table.label}</Text>
                      <View style={styles.seatsRow}>
                        <Ionicons name="people" size={9} color={colors.white} />
                        <Text style={styles.seatsText}>{table.seats}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.zoomHint, { backgroundColor: theme.card + 'DD' }]}>
        <Ionicons name="resize-outline" size={12} color={theme.textSecondary} />
        <Text style={[styles.zoomHintText, { color: theme.textSecondary }]}>
          Pincez pour zoomer • Touchez une table
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  legend: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { alignItems: 'center', justifyContent: 'center' },
  mapContainer: { width: MAP_WIDTH, height: MAP_HEIGHT, position: 'relative' },
  mapImage: { width: '100%', height: '100%', position: 'absolute' },
  marker: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  markerInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Transparent par défaut — on voit la photo
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  markerSelected: {
    backgroundColor: 'rgba(247, 217, 78, 0.3)',
    borderColor: colors.sunYellow,
    borderWidth: 2.5,
    shadowColor: colors.sunYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  markerReserved: {
    backgroundColor: 'rgba(201, 64, 64, 0.25)',
    borderColor: 'rgba(201, 64, 64, 0.4)',
    borderWidth: 1,
  },
  selectedInfo: {
    alignItems: 'center',
    gap: 2,
  },
  selectedLabel: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  seatsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seatsText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  zoomHint: {
    position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  zoomHintText: { fontSize: 10, fontWeight: '500' },
});
