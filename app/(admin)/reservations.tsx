import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import { formatLocalDate } from '@/shared/lib/date';

type TabType = 'beach' | 'restaurant';

interface ReservationRow {
  id: string;
  status: string;
  date: string;
  guestCount: number;
  clientName: string;
  locationLabel: string;
  timeSlot?: string;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  confirmed: { label: 'Confirmé', variant: 'success' },
  checked_in: { label: 'Check-in', variant: 'warning' },
  completed: { label: 'Terminé', variant: 'default' },
  cancelled: { label: 'Annulé', variant: 'error' },
  no_show: { label: 'No-show', variant: 'error' },
  pending: { label: 'Attente', variant: 'default' },
};

type DateFilter = 'today' | 'tomorrow' | 'week' | 'all';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'tomorrow', label: 'Demain' },
  { key: 'week', label: '7 jours' },
  { key: 'all', label: 'Tout' },
];

function getDateRange(filter: DateFilter): { from?: string; to?: string } {
  const today = new Date();
  const fmt = (d: Date) => formatLocalDate(d);

  switch (filter) {
    case 'today':
      return { from: fmt(today), to: fmt(today) };
    case 'tomorrow': {
      const tmr = new Date(today);
      tmr.setDate(tmr.getDate() + 1);
      return { from: fmt(tmr), to: fmt(tmr) };
    }
    case 'week': {
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      return { from: fmt(today), to: fmt(end) };
    }
    case 'all':
      return { from: fmt(today) };
  }
}

export default function ReservationsScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string; filter?: string; service?: string }>();
  const initialTab: TabType = params.tab === 'restaurant' ? 'restaurant' : 'beach';
  const initialFilter: DateFilter = (['today', 'tomorrow', 'week', 'all'].includes(params.filter ?? '')
    ? (params.filter as DateFilter)
    : 'all');
  const [tab, setTab] = useState<TabType>(initialTab);
  const [dateFilter, setDateFilter] = useState<DateFilter>(initialFilter);
  const [serviceFilter, setServiceFilter] = useState<'lunch' | 'dinner' | null>(
    params.service === 'lunch' ? 'lunch' : params.service === 'dinner' ? 'dinner' : null,
  );
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    const range = getDateRange(dateFilter);

    if (tab === 'beach') {
      let q = supabase
        .from('beach_reservations')
        .select('id, status, date, guest_count, guest_name, guest_phone, guest_email, profile:profiles(full_name), sunbed:sunbeds!sunbed_id(label), linked_sunbeds:beach_reservation_sunbeds(sunbed:sunbeds(label))')
        .in('status', ['confirmed', 'checked_in', 'no_show', 'pending']);
      if (range.from) q = q.gte('date', range.from);
      if (range.to) q = q.lte('date', range.to);
      const { data } = await q.order('date', { ascending: true }).order('created_at', { ascending: false });

      setReservations(
        (data ?? []).map((r: any) => {
          const linkedLabels = (r.linked_sunbeds ?? [])
            .map((l: any) => l.sunbed?.label)
            .filter(Boolean);
          const labels = linkedLabels.length > 0 ? linkedLabels : [r.sunbed?.label].filter(Boolean);
          return {
            id: r.id,
            status: r.status,
            date: r.date,
            guestCount: r.guest_count,
            clientName: r.guest_name || r.profile?.full_name || 'Inconnu',
            locationLabel: labels.length > 0 ? `Transat${labels.length > 1 ? 's' : ''} ${labels.join(', ')}` : 'Transat ?',
            guestName: r.guest_name,
            guestPhone: r.guest_phone,
            guestEmail: r.guest_email,
          };
        }),
      );
    } else {
      let q = supabase
        .from('restaurant_reservations')
        .select('id, status, date, guest_count, time_slot, guest_name, guest_phone, guest_email, profile:profiles(full_name), table:restaurant_tables(label)')
        .in('status', ['confirmed', 'checked_in', 'no_show', 'pending']);
      if (range.from) q = q.gte('date', range.from);
      if (range.to) q = q.lte('date', range.to);
      if (serviceFilter) q = q.eq('time_slot', serviceFilter);
      const { data } = await q.order('date', { ascending: true }).order('created_at', { ascending: false });

      setReservations(
        (data ?? []).map((r: any) => ({
          id: r.id,
          status: r.status,
          date: r.date,
          guestCount: r.guest_count,
          clientName: r.guest_name || r.profile?.full_name || 'Inconnu',
          locationLabel: r.table?.label ? `Table ${r.table.label}` : 'Sans table assignée',
          timeSlot: r.time_slot,
          guestName: r.guest_name,
          guestPhone: r.guest_phone,
          guestEmail: r.guest_email,
        })),
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
  }, [tab, dateFilter, serviceFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const table = tab === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      await fetchReservations();
    }
  };

  const deleteReservation = async (id: string) => {
    const table = tab === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      await fetchReservations();
    }
  };

  const handleCardPress = (r: ReservationRow) => {
    const buttons: any[] = [{ text: 'Fermer', style: 'cancel' }];

    if (r.status !== 'checked_in' && r.status !== 'completed' && r.status !== 'cancelled') {
      buttons.push({ text: 'Check-in', onPress: () => updateStatus(r.id, 'checked_in') });
    }

    if (r.status !== 'cancelled' && r.status !== 'completed') {
      buttons.push({
        text: 'Annuler la réservation',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Confirmer l\'annulation',
            `Annuler la réservation de ${r.clientName} ? L'empreinte CB sera libérée.`,
            [
              { text: 'Non', style: 'cancel' },
              {
                text: 'Oui, annuler',
                style: 'destructive',
                onPress: async () => {
                  if (tab === 'restaurant') {
                    await apiCall('/api/payments/cancel-hold', { reservationId: r.id }).catch(() => {});
                  }
                  updateStatus(r.id, 'cancelled');
                },
              },
            ],
          );
        },
      });
    }

    buttons.push({
      text: 'Supprimer définitivement',
      style: 'destructive',
      onPress: () => {
        Alert.alert(
          'Supprimer la réservation ?',
          `La réservation de ${r.clientName} sera supprimée définitivement de la base de données.`,
          [
            { text: 'Non', style: 'cancel' },
            {
              text: 'Oui, supprimer',
              style: 'destructive',
              onPress: () => deleteReservation(r.id),
            },
          ],
        );
      },
    });

    Alert.alert(r.clientName, `${r.locationLabel} — ${r.guestCount} pers.`, buttons);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Réservations',
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/(admin)/admin-booking')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add-circle" size={28} color={colors.sage} />
          </TouchableOpacity>
        ),
      }} />

      {/* Date filters */}
      <View style={styles.dateFilterRow}>
        {DATE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setDateFilter(f.key)}
            style={[
              styles.dateFilterBtn,
              { backgroundColor: dateFilter === f.key ? colors.brand : theme.card, borderColor: dateFilter === f.key ? colors.brand : theme.cardBorder },
            ]}
          >
            <Text style={[styles.dateFilterText, { color: dateFilter === f.key ? colors.white : theme.textSecondary }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => { setTab('beach'); setServiceFilter(null); }}
          style={[
            styles.tabBtn,
            { backgroundColor: tab === 'beach' ? colors.terracotta : theme.card, borderColor: tab === 'beach' ? colors.terracotta : theme.cardBorder },
          ]}
        >
          <Ionicons name="umbrella" size={16} color={tab === 'beach' ? colors.white : theme.textSecondary} />
          <Text style={[styles.tabText, { color: tab === 'beach' ? colors.white : theme.textSecondary }]}>Plage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('restaurant')}
          style={[
            styles.tabBtn,
            { backgroundColor: tab === 'restaurant' ? colors.deepSea : theme.card, borderColor: tab === 'restaurant' ? colors.deepSea : theme.cardBorder },
          ]}
        >
          <Ionicons name="restaurant" size={16} color={tab === 'restaurant' ? colors.white : theme.textSecondary} />
          <Text style={[styles.tabText, { color: tab === 'restaurant' ? colors.white : theme.textSecondary }]}>Restaurant</Text>
        </TouchableOpacity>
      </View>

      {/* Service filter (visible uniquement sur l'onglet restaurant) */}
      {tab === 'restaurant' && (
        <View style={styles.serviceRow}>
          {[
            { key: null, label: 'Tous' },
            { key: 'lunch' as const, label: 'Déjeuner' },
            { key: 'dinner' as const, label: 'Dîner' },
          ].map((s) => (
            <TouchableOpacity
              key={s.key ?? 'all'}
              onPress={() => setServiceFilter(s.key)}
              style={[
                styles.serviceBtn,
                {
                  backgroundColor: serviceFilter === s.key ? colors.deepSea : theme.card,
                  borderColor: serviceFilter === s.key ? colors.deepSea : theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.serviceText, { color: serviceFilter === s.key ? colors.white : theme.textSecondary }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={theme.cardBorder} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Aucune réservation
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />
          }
        >
          <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
            {reservations.length} réservation{reservations.length > 1 ? 's' : ''}
          </Text>

          {reservations.map((r) => {
            const status = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
            const canCheckIn = r.status !== 'checked_in' && r.status !== 'completed' && r.status !== 'cancelled';
            return (
              <TouchableOpacity key={r.id} onPress={() => handleCardPress(r)} activeOpacity={canCheckIn ? 0.7 : 1}>
                <Card style={styles.resCard}>
                  <View style={styles.resRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resClient, { color: theme.text }]}>{r.clientName}</Text>
                      <Text style={[styles.resLocation, { color: theme.textSecondary }]}>
                        {r.locationLabel} — {r.guestCount} pers.
                        {r.timeSlot ? ` — ${r.timeSlot === 'lunch' ? 'Déjeuner' : 'Dîner'}` : ''}
                      </Text>
                      {(r.guestPhone || r.guestEmail) && (
                        <Text style={[styles.resLocation, { color: theme.textSecondary }]}>
                          {[r.guestPhone, r.guestEmail].filter(Boolean).join(' — ')}
                        </Text>
                      )}
                      <Text style={[styles.resDate, { color: theme.textSecondary }]}>
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('fr', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <View style={styles.resRight}>
                      <Badge label={status.label} variant={status.variant} size="sm" />
                      {canCheckIn && (
                        <TouchableOpacity
                          style={styles.checkInBtn}
                          onPress={() => handleCardPress(r)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={22} color={colors.sage} />
                        </TouchableOpacity>
                      )}
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
  tabRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  serviceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  serviceBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1,
  },
  serviceText: { fontSize: 12, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  list: { paddingHorizontal: 20 },
  countLabel: { fontSize: 13, marginBottom: 12 },
  resCard: { marginBottom: 10 },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resClient: { fontSize: 15, fontWeight: '600' },
  resLocation: { fontSize: 12, marginTop: 3 },
  resDate: { fontSize: 11, marginTop: 2 },
  dateFilterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  dateFilterBtn: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1,
  },
  dateFilterText: { fontSize: 12, fontWeight: '600' },
  resRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkInBtn: { padding: 2 },
});
