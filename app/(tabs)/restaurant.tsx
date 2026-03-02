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
import Svg, { Rect, Circle, G, Text as SvgText } from 'react-native-svg';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import type { RestaurantZoneType } from '@/shared/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - 40;
const MAP_HEIGHT = MAP_WIDTH * 0.9;

// Données mock des zones restaurant
const MOCK_ZONES: {
  id: string;
  name: string;
  type: RestaurantZoneType;
  color: string;
  minSpend: string;
  x: number;
  y: number;
  w: number;
  h: number;
  available: number;
  total: number;
}[] = [
  { id: '1', name: 'Terrasse', type: 'terrasse', color: '#A8D5BA', minSpend: '50€', x: 5, y: 5, w: 90, h: 30, available: 8, total: 15 },
  { id: '2', name: 'Vue Mer', type: 'vue_mer', color: '#7EC8E3', minSpend: '100€', x: 5, y: 40, w: 90, h: 30, available: 3, total: 8 },
  { id: '3', name: 'Lounge', type: 'lounge', color: '#C2703E', minSpend: '150€', x: 20, y: 75, w: 60, h: 20, available: 2, total: 5 },
];

// Tables mock
const MOCK_TABLES = [
  // Terrasse
  { id: 't1', zone: '1', shape: 'round' as const, x: 15, y: 12, r: 3, seats: 4 },
  { id: 't2', zone: '1', shape: 'round' as const, x: 30, y: 12, r: 3, seats: 4 },
  { id: 't3', zone: '1', shape: 'square' as const, x: 45, y: 10, w: 7, h: 5, seats: 6 },
  { id: 't4', zone: '1', shape: 'round' as const, x: 65, y: 12, r: 3, seats: 2 },
  { id: 't5', zone: '1', shape: 'round' as const, x: 80, y: 12, r: 3, seats: 4 },
  { id: 't6', zone: '1', shape: 'square' as const, x: 20, y: 24, w: 7, h: 5, seats: 6 },
  { id: 't7', zone: '1', shape: 'round' as const, x: 50, y: 26, r: 2.5, seats: 2 },
  { id: 't8', zone: '1', shape: 'round' as const, x: 70, y: 26, r: 3, seats: 4 },
  // Vue Mer
  { id: 't9', zone: '2', shape: 'round' as const, x: 15, y: 50, r: 3.5, seats: 6 },
  { id: 't10', zone: '2', shape: 'round' as const, x: 35, y: 50, r: 3, seats: 4 },
  { id: 't11', zone: '2', shape: 'square' as const, x: 52, y: 48, w: 8, h: 6, seats: 8 },
  { id: 't12', zone: '2', shape: 'round' as const, x: 75, y: 50, r: 3, seats: 4 },
  { id: 't13', zone: '2', shape: 'round' as const, x: 25, y: 62, r: 2.5, seats: 2 },
  { id: 't14', zone: '2', shape: 'round' as const, x: 65, y: 62, r: 3, seats: 4 },
  // Lounge
  { id: 't15', zone: '3', shape: 'square' as const, x: 30, y: 82, w: 10, h: 6, seats: 8 },
  { id: 't16', zone: '3', shape: 'round' as const, x: 55, y: 85, r: 3.5, seats: 6 },
  { id: 't17', zone: '3', shape: 'round' as const, x: 70, y: 85, r: 3, seats: 4 },
];

export default function RestaurantScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const selected = MOCK_ZONES.find((z) => z.id === selectedZone);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Restaurant</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Plan de salle interactif
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte SVG du restaurant */}
        <View style={styles.mapContainer}>
          <Card padded={false} style={styles.mapCard}>
            <Svg
              width={MAP_WIDTH - 2}
              height={MAP_HEIGHT}
              viewBox="0 0 100 100"
            >
              {/* Fond */}
              <Rect x="0" y="0" width="100" height="100" fill={theme.period === 'night' ? '#1a1a2e' : '#FFF8F0'} rx="3" />

              {/* Zones */}
              {MOCK_ZONES.map((zone) => (
                <G key={zone.id}>
                  <Rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    fill={zone.color}
                    opacity={selectedZone === zone.id ? 0.5 : 0.2}
                    rx="2"
                    stroke={selectedZone === zone.id ? zone.color : 'transparent'}
                    strokeWidth={0.5}
                    onPress={() => setSelectedZone(zone.id)}
                  />
                  <SvgText
                    x={zone.x + zone.w / 2}
                    y={zone.y + 4}
                    textAnchor="middle"
                    fontSize="2.8"
                    fontWeight="600"
                    fill={theme.period === 'night' ? '#ccc' : colors.gray[600]}
                  >
                    {zone.name}
                  </SvgText>
                </G>
              ))}

              {/* Tables */}
              {MOCK_TABLES.map((table) => {
                const isInSelected = !selectedZone || table.zone === selectedZone;
                const fillColor = isInSelected
                  ? (theme.period === 'night' ? '#2a2a4a' : colors.white)
                  : (theme.period === 'night' ? '#15152a' : '#f0f0f0');
                const strokeColor = isInSelected
                  ? (theme.period === 'night' ? '#555' : colors.gray[300])
                  : 'transparent';

                if (table.shape === 'round') {
                  return (
                    <Circle
                      key={table.id}
                      cx={table.x}
                      cy={table.y}
                      r={table.r}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={0.3}
                    />
                  );
                }
                return (
                  <Rect
                    key={table.id}
                    x={table.x}
                    y={table.y}
                    width={table.w}
                    height={table.h}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={0.3}
                    rx="0.8"
                  />
                );
              })}

              {/* Bord de mer en bas */}
              <SvgText x="50" y="99" textAnchor="middle" fontSize="2" fill={colors.deepSea} opacity={0.5}>
                ↓ Plage & Mer
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
                  <View>
                    <Text style={[styles.zoneMinSpend, { color: theme.textSecondary }]}>
                      Minimum de consommation
                    </Text>
                    <Text style={[styles.zonePrice, { color: theme.accent }]}>
                      {selected.minSpend}
                      <Text style={[styles.zonePriceSuffix, { color: theme.textSecondary }]}> /pers.</Text>
                    </Text>
                  </View>
                  <Text style={[styles.zoneCapacity, { color: theme.textSecondary }]}>
                    {selected.available}/{selected.total} tables
                  </Text>
                </View>
                <Button
                  title="Réserver une table"
                  onPress={() => {/* Phase 3 - booking flow */}}
                  style={{ marginTop: 12 }}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Liste des zones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Zones du restaurant</Text>
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
                      Min. {zone.minSpend}/pers. • {zone.available} tables dispo
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Horaires */}
        <View style={styles.section}>
          <Card>
            <View style={styles.scheduleRow}>
              <Ionicons name="time-outline" size={18} color={theme.accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.scheduleTitle, { color: theme.text }]}>Horaires</Text>
                <Text style={[styles.scheduleText, { color: theme.textSecondary }]}>
                  Déjeuner : 12h00 - 16h00{'\n'}
                  Dîner : 19h30 - 23h30
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  mapContainer: { paddingHorizontal: 20 },
  mapCard: { overflow: 'hidden' },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  zoneDetail: {},
  zoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  zoneDot: { width: 12, height: 12, borderRadius: 6 },
  zoneName: { fontSize: 18, fontWeight: '700', flex: 1 },
  zoneInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  zoneMinSpend: { fontSize: 12, marginBottom: 2 },
  zonePrice: { fontSize: 24, fontWeight: '700' },
  zonePriceSuffix: { fontSize: 14, fontWeight: '400' },
  zoneCapacity: { fontSize: 13 },
  zoneListItem: { marginBottom: 8 },
  zoneListRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneListName: { fontSize: 15, fontWeight: '600' },
  zoneListSub: { fontSize: 12, marginTop: 2 },
  scheduleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  scheduleTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  scheduleText: { fontSize: 13, lineHeight: 20 },
});
