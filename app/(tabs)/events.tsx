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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import type { EventCategory } from '@/shared/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Données mock des événements
const MOCK_EVENTS: {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  dayLabel: string;
  time: string;
  price: number;
  vipPrice: number | null;
  ticketsSold: number;
  capacity: number;
  isSecret: boolean;
  lineup?: string[];
}[] = [
  {
    id: '1',
    title: 'Sunset Beats',
    category: 'pool_party',
    date: '2026-03-08',
    dayLabel: 'Sam. 8 Mars',
    time: '16h - 23h',
    price: 45,
    vipPrice: 120,
    ticketsSold: 180,
    capacity: 300,
    isSecret: false,
    lineup: ['DJ Marco', 'Lisa Ray'],
  },
  {
    id: '2',
    title: 'Brunch Méditerranéen',
    category: 'brunch',
    date: '2026-03-09',
    dayLabel: 'Dim. 9 Mars',
    time: '11h - 15h',
    price: 65,
    vipPrice: null,
    ticketsSold: 40,
    capacity: 80,
    isSecret: false,
  },
  {
    id: '3',
    title: 'Noche Flamenca',
    category: 'dinner_show',
    date: '2026-03-14',
    dayLabel: 'Ven. 14 Mars',
    time: '20h - 01h',
    price: 85,
    vipPrice: 200,
    ticketsSold: 60,
    capacity: 120,
    isSecret: false,
    lineup: ['Paco de Lucía Jr', 'María Terremoto'],
  },
  {
    id: '4',
    title: 'Full Moon Secret Party',
    category: 'special',
    date: '2026-03-15',
    dayLabel: 'Sam. 15 Mars',
    time: '22h - 04h',
    price: 0,
    vipPrice: null,
    ticketsSold: 45,
    capacity: 50,
    isSecret: true,
  },
];

const CATEGORY_CONFIG: Record<EventCategory, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  pool_party: { label: 'Pool Party', icon: 'water', color: '#7EC8E3' },
  dj_set: { label: 'DJ Set', icon: 'musical-notes', color: '#9B59B6' },
  dinner_show: { label: 'Dinner Show', icon: 'restaurant', color: colors.terracotta },
  brunch: { label: 'Brunch', icon: 'cafe', color: colors.sage },
  private: { label: 'Privé', icon: 'lock-closed', color: colors.gray[500] },
  special: { label: 'Spécial', icon: 'diamond', color: colors.sunYellow },
};

type Filter = 'all' | EventCategory;

export default function EventsScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');

  const filteredEvents = filter === 'all'
    ? MOCK_EVENTS
    : MOCK_EVENTS.filter((e) => e.category === filter);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'pool_party', label: 'Pool Party' },
    { key: 'dinner_show', label: 'Dîner' },
    { key: 'brunch', label: 'Brunch' },
    { key: 'special', label: 'Spécial' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Événements</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Mars 2026
        </Text>
      </View>

      {/* Filtres */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.key ? theme.accent : theme.card,
                borderColor: filter === f.key ? theme.accent : theme.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                {
                  color: filter === f.key
                    ? (theme.period === 'night' ? colors.black : colors.white)
                    : theme.textSecondary,
                },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste des événements */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredEvents.map((event) => {
          const cat = CATEGORY_CONFIG[event.category];
          const fillRate = event.ticketsSold / event.capacity;

          return (
            <TouchableOpacity key={event.id} activeOpacity={0.8}>
              <Card padded={false} style={styles.eventCard}>
                {/* Header coloré */}
                <LinearGradient
                  colors={[cat.color, cat.color + '88']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.eventHeader}
                >
                  <View style={styles.eventHeaderContent}>
                    <View style={styles.eventCategoryRow}>
                      <Ionicons name={cat.icon} size={14} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.eventCategoryLabel}>{cat.label}</Text>
                    </View>
                    {event.isSecret && (
                      <Badge label="Secret" variant="vip" size="sm" />
                    )}
                  </View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                </LinearGradient>

                {/* Body */}
                <View style={styles.eventBody}>
                  <View style={styles.eventInfoRow}>
                    <View style={styles.eventInfoItem}>
                      <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.eventInfoText, { color: theme.text }]}>
                        {event.dayLabel}
                      </Text>
                    </View>
                    <View style={styles.eventInfoItem}>
                      <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.eventInfoText, { color: theme.text }]}>
                        {event.time}
                      </Text>
                    </View>
                  </View>

                  {event.lineup && (
                    <View style={styles.lineupRow}>
                      <Ionicons name="musical-notes" size={12} color={theme.textSecondary} />
                      <Text style={[styles.lineupText, { color: theme.textSecondary }]}>
                        {event.lineup.join(' • ')}
                      </Text>
                    </View>
                  )}

                  {/* Jauge de remplissage */}
                  <View style={styles.fillRow}>
                    <View style={[styles.fillBar, { backgroundColor: theme.cardBorder }]}>
                      <View
                        style={[
                          styles.fillProgress,
                          {
                            width: `${Math.min(fillRate * 100, 100)}%`,
                            backgroundColor: fillRate > 0.8 ? colors.accentRed : cat.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.fillText, { color: theme.textSecondary }]}>
                      {event.ticketsSold}/{event.capacity}
                    </Text>
                  </View>

                  {/* Footer */}
                  <View style={styles.eventFooter}>
                    <View>
                      {event.price > 0 ? (
                        <>
                          <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
                            À partir de
                          </Text>
                          <Text style={[styles.priceValue, { color: theme.text }]}>
                            {event.price}€
                          </Text>
                        </>
                      ) : (
                        <Text style={[styles.priceValue, { color: colors.sage }]}>
                          Sur invitation
                        </Text>
                      )}
                    </View>
                    <Button
                      title={event.isSecret ? 'Code requis' : 'Réserver'}
                      onPress={() => {/* Phase 4 */}}
                      size="sm"
                      variant={event.isSecret ? 'outline' : 'primary'}
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  filters: { paddingHorizontal: 20, gap: 8, marginBottom: 16, flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 13, fontWeight: '600' },
  eventCard: { marginBottom: 16 },
  eventHeader: { padding: 16, paddingBottom: 14 },
  eventHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventCategoryLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  eventTitle: { fontSize: 22, fontWeight: '700', color: colors.white },
  eventBody: { padding: 16 },
  eventInfoRow: { flexDirection: 'row', gap: 20, marginBottom: 10 },
  eventInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventInfoText: { fontSize: 13, fontWeight: '500' },
  lineupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  lineupText: { fontSize: 12 },
  fillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  fillBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fillProgress: { height: '100%', borderRadius: 2 },
  fillText: { fontSize: 11, fontWeight: '500' },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: { fontSize: 11 },
  priceValue: { fontSize: 20, fontWeight: '700' },
});
