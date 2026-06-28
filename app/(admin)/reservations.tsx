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
  TextInput,
  Linking,
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
import { i18n } from '@/shared/i18n';

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
  byBeach: boolean;
  paid: boolean;
}

const STATUS_CONFIG: Record<string, { labelKey: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  confirmed: { labelKey: 'statusConfirmed', variant: 'success' },
  checked_in: { labelKey: 'statusCheckedIn', variant: 'warning' },
  completed: { labelKey: 'statusCompleted', variant: 'default' },
  cancelled: { labelKey: 'statusCancelled', variant: 'error' },
  no_show: { labelKey: 'statusNoShow', variant: 'error' },
  pending: { labelKey: 'statusPending', variant: 'default' },
};

type DateFilter = 'today' | 'tomorrow' | 'week' | 'all';

const DATE_FILTERS: { key: DateFilter; labelKey: string }[] = [
  { key: 'today', labelKey: 'today' },
  { key: 'tomorrow', labelKey: 'dateTomorrow' },
  { key: 'week', labelKey: 'dateWeek' },
  { key: 'all', labelKey: 'all' },
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const callPhone = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  const fetchReservations = async () => {
    setLoading(true);
    const range = getDateRange(dateFilter);

    if (tab === 'beach') {
      let q = supabase
        .from('beach_reservations')
        .select('id, status, date, guest_count, guest_name, guest_phone, guest_email, deposit_paid, deposit_amount, profile:profiles(full_name, phone), sunbed:sunbeds!sunbed_id(label), linked_sunbeds:beach_reservation_sunbeds(sunbed:sunbeds(label))')
        .in('status', ['confirmed', 'checked_in', 'no_show', 'cancelled']);
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
            clientName: r.guest_name || r.profile?.full_name || i18n.t('clientUnknown'),
            locationLabel: labels.length > 0 ? `${labels.length > 1 ? i18n.t('sunbeds') : i18n.t('sunbed')} ${labels.join(', ')}` : `${i18n.t('sunbed')} ?`,
            guestName: r.guest_name,
            guestPhone: r.guest_phone || r.profile?.phone || null,
            guestEmail: r.guest_email,
            byBeach: !!r.guest_phone,
            paid: !!r.deposit_paid && Number(r.deposit_amount) > 0,
          };
        }),
      );
    } else {
      let q = supabase
        .from('restaurant_reservations')
        .select('id, status, date, guest_count, time_slot, guest_name, guest_phone, guest_email, deposit_paid, deposit_amount, profile:profiles(full_name, phone), table:restaurant_tables(label)')
        .in('status', ['confirmed', 'checked_in', 'no_show', 'cancelled']);
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
          clientName: r.guest_name || r.profile?.full_name || i18n.t('clientUnknown'),
          locationLabel: r.table?.label ? `${i18n.t('table')} ${r.table.label}` : i18n.t('noTableAssigned'),
          timeSlot: r.time_slot,
          guestName: r.guest_name,
          guestPhone: r.guest_phone || r.profile?.phone || null,
          guestEmail: r.guest_email,
          byBeach: !!r.guest_phone,
          paid: !!r.deposit_paid && Number(r.deposit_amount) > 0,
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
      Alert.alert(i18n.t('error'), error.message);
    } else {
      await fetchReservations();
    }
  };

  const deleteReservation = async (id: string) => {
    const table = tab === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      Alert.alert(i18n.t('error'), error.message);
    } else {
      await fetchReservations();
    }
  };

  const handleCardPress = (r: ReservationRow) => {
    const buttons: any[] = [{ text: i18n.t('close'), style: 'cancel' }];

    if (r.status !== 'checked_in' && r.status !== 'completed' && r.status !== 'cancelled') {
      buttons.push({ text: i18n.t('statusCheckedIn'), onPress: () => updateStatus(r.id, 'checked_in') });
    }

    // Bouton "Modifier" : seulement pour les résas plage futures non check-in
    if (tab === 'beach' && r.status !== 'cancelled' && r.status !== 'completed' && r.status !== 'checked_in' && r.status !== 'no_show') {
      buttons.push({
        text: i18n.t('modify'),
        onPress: () => {
          router.push({ pathname: '/(tabs)/beach', params: { modify: r.id } });
        },
      });
    }

    if (r.status !== 'cancelled' && r.status !== 'completed') {
      buttons.push({
        text: i18n.t('alertCancelReservation'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            i18n.t('alertConfirmCancellation'),
            i18n.t('alertCancelMessage').replace('{{name}}', r.clientName),
            [
              { text: i18n.t('no'), style: 'cancel' },
              {
                text: i18n.t('alertYesCancel'),
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

    // Bouton "Rembourser" : seulement si la résa a un dépôt payé
    if (r.paid && r.status !== 'cancelled') {
      buttons.push({
        text: i18n.t('alertRefund'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            i18n.t('alertConfirmRefund'),
            i18n.t('alertRefundMessage').replace('{{name}}', r.clientName),
            [
              { text: i18n.t('no'), style: 'cancel' },
              {
                text: i18n.t('alertYesRefund'),
                style: 'destructive',
                onPress: async () => {
                  try {
                    await apiCall('/api/payments/refund', { reservationId: r.id, type: tab });
                    Alert.alert(i18n.t('alertRefundDoneTitle'), i18n.t('alertRefundDoneMessage'));
                    await fetchReservations();
                  } catch (err: any) {
                    Alert.alert(i18n.t('error'), err?.message ?? 'Erreur');
                  }
                },
              },
            ],
          );
        },
      });
    }

    buttons.push({
      text: i18n.t('alertDeletePermanent'),
      style: 'destructive',
      onPress: () => {
        Alert.alert(
          i18n.t('alertConfirmDelete'),
          i18n.t('alertDeleteMessage').replace('{{name}}', r.clientName),
          [
            { text: i18n.t('no'), style: 'cancel' },
            {
              text: i18n.t('alertYesDelete'),
              style: 'destructive',
              onPress: () => deleteReservation(r.id),
            },
          ],
        );
      },
    });

    Alert.alert(r.clientName, `${r.locationLabel} — ${r.guestCount} pers.`, buttons);
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? reservations.filter((r) =>
        [r.clientName, r.guestName, r.guestPhone, r.guestEmail]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q)),
      )
    : reservations;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: i18n.t('adminReservations'),
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
            <Text style={[styles.dateFilterText, { color: dateFilter === f.key ? colors.white : theme.textSecondary }]}>{i18n.t(f.labelKey)}</Text>
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
            { key: 'lunch' as const, label: i18n.t('mealLunch') },
            { key: 'dinner' as const, label: i18n.t('mealDinner') },
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

      {/* Recherche par nom */}
      <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={i18n.t('searchByName')}
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : filtered.length === 0 ? (
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
            {filtered.length} réservation{filtered.length > 1 ? 's' : ''}
          </Text>

          {filtered.map((r) => {
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
                        {r.timeSlot ? ` — ${r.timeSlot === 'lunch' ? i18n.t('mealLunch') : i18n.t('mealDinner')}` : ''}
                      </Text>
                      {(r.guestPhone || r.guestEmail) && (
                        <View style={styles.contactRow}>
                          {r.guestPhone && (
                            <TouchableOpacity
                              onPress={() => callPhone(r.guestPhone!)}
                              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                              style={styles.phoneChip}
                            >
                              <Ionicons name="call" size={12} color={colors.sage} />
                              <Text style={[styles.phoneText, { color: colors.sage }]}>{r.guestPhone}</Text>
                            </TouchableOpacity>
                          )}
                          {r.guestEmail && (
                            <Text style={[styles.resLocation, { color: theme.textSecondary }]} numberOfLines={1}>
                              {r.guestPhone ? '— ' : ''}{r.guestEmail}
                            </Text>
                          )}
                        </View>
                      )}
                      <Text style={[styles.resDate, { color: theme.textSecondary }]}>
                        {new Date(r.date + 'T00:00:00').toLocaleDateString(i18n.locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <View style={styles.resRight}>
                      <Badge label={i18n.t(status.labelKey)} variant={status.variant} size="sm" />
                      {r.byBeach && (
                        <Badge label={i18n.t('badgeByBeach')} variant="vip" size="sm" />
                      )}
                      {r.paid && (
                        <Badge label={i18n.t('badgePaid')} variant="success" size="sm" />
                      )}
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
  resRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  checkInBtn: { padding: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 12,
    height: 40, borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' },
  phoneChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  phoneText: { fontSize: 12, fontWeight: '600' },
});
