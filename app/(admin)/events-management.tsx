import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useAdminEvents } from '@/features/admin/hooks/useAdminEvents';
import type { EventCategory } from '@/shared/types';

const CATEGORY_LABELS: Record<EventCategory, string> = {
  pool_party: 'Pool Party',
  dj_set: 'DJ Set',
  dinner_show: 'Dinner Show',
  brunch: 'Brunch',
  private: 'Privé',
  special: 'Spécial',
};

export default function EventsManagementScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { events, loading, refresh, deleteEvent } = useAdminEvents();
  const [refreshing, setRefreshing] = useState(false);

  const handleDelete = (eventId: string, title: string, ticketsSold: number) => {
    if (ticketsSold > 0) {
      Alert.alert('Impossible', `${ticketsSold} ticket(s) vendu(s). Impossible de supprimer.`);
      return;
    }
    Alert.alert('Supprimer', `Supprimer "${title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteEvent(eventId) },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const today = new Date().toISOString().split('T')[0];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{
          title: 'Événements',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentRed} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Événements',
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(admin)/event-form' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add-circle" size={28} color={colors.accentRed} />
          </TouchableOpacity>
        ),
      }} />

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={theme.cardBorder} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Aucun événement</Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accentRed }]}
            onPress={() => router.push({ pathname: '/(admin)/event-form' })}
          >
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={styles.createBtnText}>Créer un événement</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accentRed} />
          }
        >
          <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
            {events.length} événement{events.length > 1 ? 's' : ''}
          </Text>

          {events.map((event) => {
            const isPast = event.date < today;
            return (
              <TouchableOpacity
                key={event.id}
                onPress={() => router.push({ pathname: '/(admin)/event-form', params: { eventId: event.id } })}
              >
                <Card style={[styles.eventCard, isPast && { opacity: 0.6 }]}>
                  <View style={styles.eventRow}>
                    {event.flyer_url ? (
                      <Image source={{ uri: event.flyer_url }} style={styles.eventThumb} />
                    ) : (
                      <View style={[styles.eventThumb, styles.eventThumbPlaceholder, { backgroundColor: theme.cardBorder }]}>
                        <Ionicons name="image-outline" size={20} color={theme.textSecondary} />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={[styles.eventDate, { color: theme.textSecondary }]}>
                        {formatDate(event.date)} — {event.start_time?.slice(0, 5)}
                      </Text>
                      <View style={styles.eventBadges}>
                        <Badge
                          label={CATEGORY_LABELS[event.category] ?? event.category}
                          variant="default"
                          size="sm"
                        />
                        <Badge
                          label={event.is_published ? 'Publié' : 'Brouillon'}
                          variant={event.is_published ? 'success' : 'default'}
                          size="sm"
                        />
                      </View>
                    </View>

                    <View style={styles.eventRight}>
                      <Text style={[styles.eventPrice, { color: colors.terracotta }]}>
                        {event.standard_price}€
                      </Text>
                      <TouchableOpacity
                        style={styles.attendeesBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push({ pathname: '/(admin)/event-attendees', params: { eventId: event.id, eventTitle: event.title } });
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="people" size={14} color={colors.deepSea} />
                        <Text style={[styles.attendeesBtnText, { color: colors.deepSea }]}>
                          {event.tickets_sold}/{event.capacity}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteEventBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(event.id, event.title, event.tickets_sold);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.accentRed} />
                      </TouchableOpacity>
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
  container: { padding: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 8,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  countLabel: { fontSize: 13, marginBottom: 12 },
  eventCard: { marginBottom: 10 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventThumb: { width: 52, height: 52, borderRadius: 10 },
  eventThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 15, fontWeight: '700' },
  eventDate: { fontSize: 12, marginTop: 2 },
  eventBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  eventRight: { alignItems: 'flex-end', gap: 2 },
  deleteEventBtn: { marginTop: 4, padding: 4 },
  attendeesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, padding: 2 },
  attendeesBtnText: { fontSize: 11, fontWeight: '600' },
  eventPrice: { fontSize: 16, fontWeight: '800' },
});
