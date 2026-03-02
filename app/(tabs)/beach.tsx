import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import type { BeachZoneType } from '@/shared/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - 40;
const MAP_HEIGHT = MAP_WIDTH * 1.2;

// Données mock des zones
const MOCK_ZONES: {
  id: string;
  name: string;
  type: BeachZoneType;
  color: string;
  price: string;
  x: number;
  y: number;
  w: number;
  h: number;
  available: number;
  total: number;
}[] = [
  { id: '1', name: 'Standard', type: 'standard', color: '#A8D5BA', price: '35€', x: 10, y: 10, w: 80, h: 25, available: 12, total: 20 },
  { id: '2', name: 'Premium', type: 'premium', color: '#7EC8E3', price: '65€', x: 10, y: 40, w: 80, h: 20, available: 6, total: 12 },
  { id: '3', name: 'Front Row', type: 'front_row', color: '#F7D94E', price: '95€', x: 10, y: 65, w: 80, h: 15, available: 3, total: 8 },
  { id: '4', name: 'VIP Cabanas', type: 'vip_cabana', color: '#C94040', price: '250€', x: 30, y: 85, w: 40, h: 10, available: 1, total: 4 },
];

export default function BeachScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const selected = MOCK_ZONES.find((z) => z.id === selectedZone);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: theme.text }]}>La Plage</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Sélectionnez une zone pour réserver
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte SVG interactive */}
        <View style={styles.mapContainer}>
          <Card padded={false} style={styles.mapCard}>
            {/* Légende */}
            <View style={styles.legend}>
              <Ionicons name="water" size={14} color={colors.deepSea} />
              <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
                ← Mer
              </Text>
            </View>

            <Svg
              width={MAP_WIDTH - 2}
              height={MAP_HEIGHT}
              viewBox="0 0 100 100"
            >
              {/* Fond sable */}
              <Rect x="0" y="0" width="100" height="100" fill="#F5E6C8" rx="3" />

              {/* Ligne de mer */}
              <Rect x="0" y="96" width="100" height="4" fill={colors.deepSea} opacity={0.3} rx="0" />

              {/* Zones */}
              {MOCK_ZONES.map((zone) => (
                <G key={zone.id}>
                  <Rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    fill={zone.color}
                    opacity={selectedZone === zone.id ? 1 : 0.6}
                    rx="2"
                    stroke={selectedZone === zone.id ? colors.black : 'transparent'}
                    strokeWidth={selectedZone === zone.id ? 0.8 : 0}
                    onPress={() => setSelectedZone(zone.id)}
                  />
                  <SvgText
                    x={zone.x + zone.w / 2}
                    y={zone.y + zone.h / 2 + 1.5}
                    textAnchor="middle"
                    fontSize="3.5"
                    fontWeight="bold"
                    fill={colors.black}
                    onPress={() => setSelectedZone(zone.id)}
                  >
                    {zone.name}
                  </SvgText>
                </G>
              ))}

              {/* Label restaurant en haut */}
              <SvgText x="50" y="5" textAnchor="middle" fontSize="2.5" fill={colors.gray[500]}>
                Restaurant ↑
              </SvgText>
            </Svg>
          </Card>
        </View>

        {/* Zone sélectionnée */}
        {selected && (
          <View style={styles.section}>
            <Card>
              <View style={styles.zoneDetail}>
                <View style={styles.zoneHeader}>
                  <View style={[styles.zoneDot, { backgroundColor: selected.color }]} />
                  <Text style={[styles.zoneName, { color: theme.text }]}>{selected.name}</Text>
                  <Badge
                    label={`${selected.available} dispo`}
                    variant={selected.available > 3 ? 'success' : 'warning'}
                    size="sm"
                  />
                </View>
                <View style={styles.zoneInfo}>
                  <Text style={[styles.zonePrice, { color: theme.accent }]}>
                    {selected.price}
                    <Text style={[styles.zonePriceSuffix, { color: theme.textSecondary }]}> /jour</Text>
                  </Text>
                  <Text style={[styles.zoneCapacity, { color: theme.textSecondary }]}>
                    {selected.available}/{selected.total} disponibles
                  </Text>
                </View>
                <Button
                  title="Réserver un transat"
                  onPress={() => {/* Phase 2 - booking flow */}}
                  style={{ marginTop: 12 }}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Liste des zones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Toutes les zones</Text>
          {MOCK_ZONES.map((zone) => (
            <TouchableOpacity
              key={zone.id}
              activeOpacity={0.7}
              onPress={() => setSelectedZone(zone.id)}
            >
              <Card style={selectedZone === zone.id ? [styles.zoneListItem, { borderColor: theme.accent }] : styles.zoneListItem}>
                <View style={styles.zoneListRow}>
                  <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.zoneListName, { color: theme.text }]}>{zone.name}</Text>
                    <Text style={[styles.zoneListSub, { color: theme.textSecondary }]}>
                      {zone.available} transats disponibles
                    </Text>
                  </View>
                  <Text style={[styles.zoneListPrice, { color: theme.accent }]}>{zone.price}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  mapContainer: {
    paddingHorizontal: 20,
  },
  mapCard: {
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 10,
    paddingBottom: 4,
  },
  legendLabel: {
    fontSize: 11,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  zoneDetail: {},
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  zoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  zoneName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  zoneInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  zonePrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  zonePriceSuffix: {
    fontSize: 14,
    fontWeight: '400',
  },
  zoneCapacity: {
    fontSize: 13,
  },
  zoneListItem: {
    marginBottom: 8,
  },
  zoneListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoneListName: {
    fontSize: 15,
    fontWeight: '600',
  },
  zoneListSub: {
    fontSize: 12,
    marginTop: 2,
  },
  zoneListPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
});
