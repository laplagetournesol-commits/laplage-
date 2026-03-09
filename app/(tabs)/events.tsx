import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useEvents } from '@/features/events/hooks/useEvents';
import type { Event, EventCategory } from '@/shared/types';

const CATEGORY_CONFIG: Record<EventCategory, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  pool_party: { label: 'Pool Party', icon: 'water', color: '#7EC8E3' },
  dj_set: { label: 'DJ Set', icon: 'musical-notes', color: '#9B59B6' },
  dinner_show: { label: 'Dinner Show', icon: 'restaurant', color: colors.terracotta },
  brunch: { label: 'Brunch', icon: 'cafe', color: colors.sage },
  private: { label: 'Privé', icon: 'lock-closed', color: colors.gray[500] },
  special: { label: 'Spécial', icon: 'diamond', color: colors.sunYellow },
};

type Filter = 'all' | EventCategory;

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.toLocaleDateString('fr-FR', { weekday: 'short' });
  const num = d.getDate();
  const month = d.toLocaleDateString('fr-FR', { month: 'short' });
  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${num} ${month}`;
}

function formatTimeRange(start: string, end: string | null): string {
  const s = start?.slice(0, 5).replace(':', 'h');
  if (!end) return s;
  const e = end.slice(0, 5).replace(':', 'h');
  return `${s} - ${e}`;
}

export default function EventsScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const { events, loading, refresh } = useEvents(filter);
  const [refreshing, setRefreshing] = useState(false);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'pool_party', label: 'Pool Party' },
    { key: 'dj_set', label: 'DJ Set' },
    { key: 'dinner_show', label: 'Dîner' },
    { key: 'brunch', label: 'Brunch' },
    { key: 'special', label: 'Spécial' },
    { key: 'private', label: 'Privé' },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleOpenEvent = (event: Event) => {
    router.push(`/event/${event.id}`);
  };

  // Get current month/year label
  const monthLabel = events.length > 0
    ? new Date(events[0].date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header with background photo */}
      <ImageBackground
        source={require('../../assets/pool-view.jpg')}
        style={styles.headerBg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.35)',
            theme.period === 'night' ? 'rgba(15,27,45,0.9)' : 'rgba(253,248,240,0.85)',
          ]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={[styles.title, { color: theme.period === 'night' ? colors.white : theme.text }]}>
            Événements
          </Text>
          <Text style={[styles.subtitle, { color: theme.period === 'night' ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
            {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
          </Text>
        </View>
      </ImageBackground>

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
      {loading && events.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Chargement des événements...
          </Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={theme.cardBorder} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Aucun événement à venir dans cette catégorie
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />
          }
        >
          {events.map((event) => {
            const cat = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.special;
            const fillRate = event.tickets_sold / event.capacity;
            const isFree = event.standard_price === 0;

            return (
              <TouchableOpacity
                key={event.id}
                activeOpacity={0.8}
                onPress={() => handleOpenEvent(event)}
              >
                <Card padded={false} style={styles.eventCard}>
                  {/* Header coloré avec flyer si disponible */}
                  {event.flyer_url ? (
                    <View style={styles.flyerContainer}>
                      <Image
                        source={{ uri: event.flyer_url }}
                        style={styles.flyerImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.flyerGradient}
                      />
                      <View style={styles.flyerOverlay}>
                        <View style={styles.eventCategoryRow}>
                          <Ionicons name={cat.icon} size={14} color="rgba(255,255,255,0.9)" />
                          <Text style={styles.eventCategoryLabel}>{cat.label}</Text>
                          {event.is_secret && <Badge label="Secret" variant="vip" size="sm" />}
                          {event.category === 'private' && <Badge label="Privé" variant="vip" size="sm" />}
                        </View>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                      </View>
                    </View>
                  ) : (
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
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {event.is_secret && <Badge label="Secret" variant="vip" size="sm" />}
                          {event.category === 'private' && <Badge label="Privé" variant="vip" size="sm" />}
                        </View>
                      </View>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                    </LinearGradient>
                  )}

                  {/* Body */}
                  <View style={styles.eventBody}>
                    <View style={styles.eventInfoRow}>
                      <View style={styles.eventInfoItem}>
                        <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                        <Text style={[styles.eventInfoText, { color: theme.text }]}>
                          {formatDayLabel(event.date)}
                        </Text>
                      </View>
                      <View style={styles.eventInfoItem}>
                        <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                        <Text style={[styles.eventInfoText, { color: theme.text }]}>
                          {formatTimeRange(event.start_time, event.end_time)}
                        </Text>
                      </View>
                    </View>

                    {event.lineup && event.lineup.length > 0 && (
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
                        {event.tickets_sold}/{event.capacity}
                      </Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.eventFooter}>
                      <View>
                        {!isFree ? (
                          <>
                            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
                              À partir de
                            </Text>
                            <Text style={[styles.priceValue, { color: theme.text }]}>
                              {event.standard_price}€
                            </Text>
                          </>
                        ) : (
                          <Text style={[styles.priceValue, { color: colors.sage }]}>
                            {event.is_secret ? 'Sur invitation' : 'Gratuit'}
                          </Text>
                        )}
                      </View>
                      <Button
                        title={event.is_secret ? 'Code requis' : 'Réserver'}
                        onPress={() => handleOpenEvent(event)}
                        size="sm"
                        variant={event.is_secret ? 'outline' : 'primary'}
                      />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBg: { overflow: 'hidden' },
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  eventCard: { marginBottom: 16 },
  flyerContainer: { borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  flyerImage: { width: '100%', aspectRatio: 4 / 3 },
  flyerGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  flyerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
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
