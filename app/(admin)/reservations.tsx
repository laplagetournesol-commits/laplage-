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
import { Modal } from '@/shared/ui/Modal';
import { TableTagsInput, parseTables, serializeTables } from '@/shared/ui/TableTagsInput';
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
  time?: string | null;        // heure réservée (resto)
  createdAt?: string | null;   // quand la résa a été faite
  notes?: string | null;       // bloc-notes (allergies, attentions…)
  tableNumbers?: string | null; // tables assignées (resto), texte libre "55, 56, 57"
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

type DateFilter = 'yesterday' | 'today' | 'tomorrow' | 'week' | 'past' | 'all';

const DATE_FILTERS: { key: DateFilter; labelKey: string }[] = [
  { key: 'yesterday', labelKey: 'dateYesterday' },
  { key: 'today', labelKey: 'today' },
  { key: 'tomorrow', labelKey: 'dateTomorrow' },
  { key: 'week', labelKey: 'dateWeek' },
  { key: 'past', labelKey: 'datePast' },
  { key: 'all', labelKey: 'all' },
];

function getDateRange(filter: DateFilter): { from?: string; to?: string } {
  const today = new Date();
  const fmt = (d: Date) => formatLocalDate(d);
  const shift = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  switch (filter) {
    case 'yesterday':
      return { from: fmt(shift(-1)), to: fmt(shift(-1)) };
    case 'today':
      return { from: fmt(today), to: fmt(today) };
    case 'tomorrow':
      return { from: fmt(shift(1)), to: fmt(shift(1)) };
    case 'week':
      return { from: fmt(today), to: fmt(shift(7)) };
    case 'past':
      return { to: fmt(shift(-1)) }; // tout ce qui est avant aujourd'hui
    case 'all':
      return {}; // toutes dates (passées + futures)
  }
}

export default function ReservationsScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string; filter?: string; service?: string }>();
  const initialTab: TabType = params.tab === 'restaurant' ? 'restaurant' : 'beach';
  const initialFilter: DateFilter = (['yesterday', 'today', 'tomorrow', 'week', 'past', 'all'].includes(params.filter ?? '')
    ? (params.filter as DateFilter)
    : 'all');
  const [tab, setTab] = useState<TabType>(initialTab);
  const [dateFilter, setDateFilter] = useState<DateFilter>(initialFilter);
  const [serviceFilter, setServiceFilter] = useState<'lunch' | 'dinner' | null>(
    params.service === 'lunch' ? 'lunch' : params.service === 'dinner' ? 'dinner' : null,
  );
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [detail, setDetail] = useState<ReservationRow | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const callPhone = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  // Bloc-notes de la fiche
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  useEffect(() => { setNoteText(detail?.notes ?? ''); }, [detail?.id]);

  // Tables assignées (resto) — éditable sur TOUTE résa (y compris celles des clients)
  const [tableList, setTableList] = useState<string[]>([]);
  const [savingTables, setSavingTables] = useState(false);
  useEffect(() => { setTableList(parseTables(detail?.tableNumbers)); }, [detail?.id]);

  // Nombre de personnes — éditable directement dans la fiche (plage + resto)
  const [guestEdit, setGuestEdit] = useState(1);
  const [savingGuests, setSavingGuests] = useState(false);
  useEffect(() => { setGuestEdit(detail?.guestCount ?? 1); }, [detail?.id]);

  const saveGuests = async () => {
    if (!detail) return;
    setSavingGuests(true);
    const table = tab === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
    const { error } = await supabase.from(table).update({ guest_count: guestEdit }).eq('id', detail.id);
    setSavingGuests(false);
    if (error) { Alert.alert(i18n.t('error'), error.message); return; }
    setReservations((prev) => prev.map((x) => x.id === detail.id ? { ...x, guestCount: guestEdit } : x));
    setDetail((d) => d ? { ...d, guestCount: guestEdit } : d);
    Alert.alert('Enregistré ✓', 'Nombre de personnes mis à jour.');
  };

  // Heure + date — éditables (restaurant : heure & date ; plage : voir "Modifier" pour transats/date)
  const [timeEdit, setTimeEdit] = useState('');
  const [dateEdit, setDateEdit] = useState('');
  const [savingTime, setSavingTime] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  useEffect(() => { setTimeEdit((detail?.time ?? '').slice(0, 5)); setDateEdit(detail?.date ?? ''); }, [detail?.id]);

  const saveTime = async () => {
    if (!detail) return;
    const t = timeEdit.trim();
    if (!/^\d{1,2}:\d{2}$/.test(t)) { Alert.alert('Format incorrect', 'Heure au format HH:MM (ex : 20:30)'); return; }
    setSavingTime(true);
    const slot = parseInt(t.split(':')[0], 10) < 18 ? 'lunch' : 'dinner';
    const { error } = await supabase.from('restaurant_reservations').update({ time: t, time_slot: slot }).eq('id', detail.id);
    setSavingTime(false);
    if (error) { Alert.alert(i18n.t('error'), error.message); return; }
    setReservations((prev) => prev.map((x) => x.id === detail.id ? { ...x, time: t, timeSlot: slot } : x));
    setDetail((d) => d ? { ...d, time: t, timeSlot: slot } : d);
    Alert.alert('Enregistré ✓', 'Heure mise à jour.');
  };

  const saveDate = async () => {
    if (!detail) return;
    const dt = dateEdit.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dt)) { Alert.alert('Format incorrect', 'Date au format AAAA-MM-JJ'); return; }
    setSavingDate(true);
    const { error } = await supabase.from('restaurant_reservations').update({ date: dt }).eq('id', detail.id);
    setSavingDate(false);
    if (error) { Alert.alert(i18n.t('error'), error.message); return; }
    setReservations((prev) => prev.map((x) => x.id === detail.id ? { ...x, date: dt } : x));
    setDetail((d) => d ? { ...d, date: dt } : d);
    Alert.alert('Enregistré ✓', 'Date mise à jour.');
  };

  const saveTables = async () => {
    if (!detail) return;
    setSavingTables(true);
    const value = serializeTables(tableList);
    const { error } = await supabase.from('restaurant_reservations').update({ table_numbers: value }).eq('id', detail.id);
    setSavingTables(false);
    if (error) { Alert.alert(i18n.t('error'), error.message); return; }
    const newLabel = value ? `${i18n.t('table')} ${value}` : i18n.t('noTableAssigned');
    setReservations((prev) => prev.map((x) => x.id === detail.id ? { ...x, tableNumbers: value, locationLabel: newLabel } : x));
    setDetail((d) => d ? { ...d, tableNumbers: value, locationLabel: newLabel } : d);
    Alert.alert('Enregistré ✓', 'Tables mises à jour.');
  };

  const saveNote = async () => {
    if (!detail) return;
    setSavingNote(true);
    const table = tab === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
    const value = noteText.trim() || null;
    const { error } = await supabase.from(table).update({ notes: value }).eq('id', detail.id);
    setSavingNote(false);
    if (error) { Alert.alert(i18n.t('error'), error.message); return; }
    setReservations((prev) => prev.map((x) => x.id === detail.id ? { ...x, notes: value } : x));
    setDetail((d) => d ? { ...d, notes: value } : d);
    Alert.alert(i18n.t('saved') ?? 'Enregistré', i18n.t('noteSaved') ?? 'Note enregistrée.');
  };

  const fetchReservations = async () => {
    setLoading(true);
    const range = getDateRange(dateFilter);

    if (tab === 'beach') {
      let q = supabase
        .from('beach_reservations')
        .select('id, status, date, guest_count, guest_name, guest_phone, guest_email, deposit_paid, deposit_amount, notes, created_at, profile:profiles(full_name, phone), sunbed:sunbeds!sunbed_id(label), linked_sunbeds:beach_reservation_sunbeds(sunbed:sunbeds(label))')
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
            notes: r.notes,
            createdAt: r.created_at,
            byBeach: !!r.guest_phone,
            paid: !!r.deposit_paid && Number(r.deposit_amount) > 0,
          };
        }),
      );
    } else {
      let q = supabase
        .from('restaurant_reservations')
        .select('id, status, date, guest_count, time_slot, time, guest_name, guest_phone, guest_email, deposit_paid, deposit_amount, notes, table_numbers, created_at, profile:profiles(full_name, phone), table:restaurant_tables(label)')
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
          locationLabel: r.table_numbers
            ? `${i18n.t('table')} ${r.table_numbers}`
            : (r.table?.label ? `${i18n.t('table')} ${r.table.label}` : i18n.t('noTableAssigned')),
          timeSlot: r.time_slot,
          time: r.time,
          guestName: r.guest_name,
          guestPhone: r.guest_phone || r.profile?.phone || null,
          guestEmail: r.guest_email,
          notes: r.notes,
          tableNumbers: r.table_numbers,
          createdAt: r.created_at,
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
      return;
    }
    // Synchroniser les liens transats (sinon ils restent désynchronisés et
    // faussent la disponibilité — source des doubles-réservations).
    if (tab === 'beach') {
      await supabase.from('beach_reservation_sunbeds').update({ status }).eq('reservation_id', id);
    }
    await fetchReservations();
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

    // Restaurant : "Modifier" rouvre la fiche où l'on édite directement (personnes, heure, date, tables, notes)
    if (tab === 'restaurant' && r.status !== 'cancelled' && r.status !== 'completed') {
      buttons.push({
        text: i18n.t('modify'),
        onPress: () => {
          setDetail(r);
          Alert.alert(
            'Modifier la réservation',
            'Modifiez directement dans la fiche : le nombre de personnes (− / +), l\'heure, la date, les tables ou les notes. Un bouton « Enregistrer » apparaît à côté de chaque champ modifié.',
          );
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
              <TouchableOpacity key={r.id} onPress={() => setDetail(r)} activeOpacity={0.7}>
                <Card style={styles.resCard}>
                  <View style={styles.resRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resClient, { color: theme.text }]}>{r.clientName}</Text>
                      <Text style={[styles.resLocation, { color: theme.textSecondary }]}>
                        {r.locationLabel} — {r.guestCount} pers.
                        {r.timeSlot ? ` — ${r.timeSlot === 'lunch' ? i18n.t('mealLunch') : i18n.t('mealDinner')}` : ''}
                        {r.time ? ` (${r.time.slice(0, 5)})` : ''}
                      </Text>
                      {!!r.notes && (
                        <View style={styles.contactRow}>
                          <Ionicons name="document-text-outline" size={12} color={colors.terracotta} />
                          <Text style={[styles.phoneText, { color: colors.terracotta }]} numberOfLines={1}>{r.notes}</Text>
                        </View>
                      )}
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

      {/* Fiche de réservation détaillée */}
      <Modal visible={!!detail} onClose={() => setDetail(null)} title={detail?.clientName}>
        {detail && (
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 6 }} showsVerticalScrollIndicator={true}>
            <View style={styles.badgeRow}>
              <Badge label={i18n.t((STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.pending).labelKey)} variant={(STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.pending).variant} size="sm" />
              {detail.paid && <Badge label={i18n.t('badgePaid')} variant="success" size="sm" />}
              {detail.byBeach && <Badge label={i18n.t('badgeByBeach')} variant="vip" size="sm" />}
            </View>

            <View style={styles.detailRow}>
              <Ionicons name={tab === 'beach' ? 'umbrella-outline' : 'restaurant-outline'} size={18} color={theme.textSecondary} />
              <Text style={[styles.detailText, { color: theme.text }]}>{detail.locationLabel}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.detailText, { color: theme.text }]}>Personnes :</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginLeft: 8 }}>
                <TouchableOpacity onPress={() => setGuestEdit((n) => Math.max(1, n - 1))} style={[styles.guestBtn, { borderColor: theme.cardBorder }]}>
                  <Ionicons name="remove" size={18} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, minWidth: 22, textAlign: 'center' }}>{guestEdit}</Text>
                <TouchableOpacity onPress={() => setGuestEdit((n) => Math.min(99, n + 1))} style={[styles.guestBtn, { borderColor: theme.cardBorder }]}>
                  <Ionicons name="add" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
            {guestEdit !== detail.guestCount && (
              <TouchableOpacity
                style={[styles.detailBtn, { backgroundColor: colors.sage, marginTop: 2, marginBottom: 6 }]}
                onPress={saveGuests}
                disabled={savingGuests}
              >
                <Ionicons name="save-outline" size={18} color={colors.white} />
                <Text style={styles.detailBtnText}>{savingGuests ? 'Enregistrement…' : 'Enregistrer le nombre de personnes'}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.detailText, { color: theme.text }]}>
                {new Date(detail.date + 'T00:00:00').toLocaleDateString(i18n.locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                {detail.timeSlot ? ` — ${detail.timeSlot === 'lunch' ? i18n.t('mealLunch') : i18n.t('mealDinner')}` : ''}
              </Text>
            </View>

            {/* Restaurant : heure et date modifiables directement */}
            {tab === 'restaurant' && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.editInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    value={timeEdit} onChangeText={setTimeEdit} placeholder="20:30" placeholderTextColor={theme.textSecondary}
                    keyboardType="numbers-and-punctuation"
                  />
                  {timeEdit.trim() !== (detail.time ?? '').slice(0, 5) && (
                    <TouchableOpacity onPress={saveTime} disabled={savingTime} style={[styles.smallSave, { backgroundColor: colors.sage }]}>
                      <Ionicons name="save-outline" size={16} color={colors.white} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.editInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    value={dateEdit} onChangeText={setDateEdit} placeholder="2026-07-20" placeholderTextColor={theme.textSecondary}
                    keyboardType="numbers-and-punctuation"
                  />
                  {dateEdit.trim() !== (detail.date ?? '') && (
                    <TouchableOpacity onPress={saveDate} disabled={savingDate} style={[styles.smallSave, { backgroundColor: colors.sage }]}>
                      <Ionicons name="save-outline" size={16} color={colors.white} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            {detail.createdAt && (
              <View style={styles.detailRow}>
                <Ionicons name="checkmark-done-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.detailText, { color: theme.textSecondary, fontSize: 13 }]}>
                  Réservé le {new Date(detail.createdAt).toLocaleString(i18n.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            {detail.guestPhone && (
              <TouchableOpacity style={styles.detailRow} onPress={() => callPhone(detail.guestPhone!)}>
                <Ionicons name="call-outline" size={18} color={colors.sage} />
                <Text style={[styles.detailText, { color: colors.sage, fontWeight: '600' }]}>{detail.guestPhone}</Text>
              </TouchableOpacity>
            )}
            {detail.guestEmail && (
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.detailText, { color: theme.text }]}>{detail.guestEmail}</Text>
              </View>
            )}

            {/* Tables (restaurant) — assignables sur toute résa, client comprise */}
            {tab === 'restaurant' && (
              <View style={styles.noteBlock}>
                <View style={styles.detailRow}>
                  <Ionicons name="restaurant-outline" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailText, { color: theme.textSecondary, fontSize: 13, fontWeight: '700' }]}>
                    Tables (plusieurs possibles si collées)
                  </Text>
                </View>
                <TableTagsInput tables={tableList} onChange={setTableList} />
                {serializeTables(tableList) !== (detail.tableNumbers ?? null) && (
                  <TouchableOpacity
                    style={[styles.detailBtn, { backgroundColor: colors.sage, marginTop: 8 }]}
                    onPress={saveTables}
                    disabled={savingTables}
                  >
                    <Ionicons name="save-outline" size={18} color={colors.white} />
                    <Text style={styles.detailBtnText}>{savingTables ? 'Enregistrement…' : 'Enregistrer les tables'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Bloc-notes (allergies, attentions particulières…) */}
            <View style={styles.noteBlock}>
              <View style={styles.detailRow}>
                <Ionicons name="create-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.detailText, { color: theme.textSecondary, fontSize: 13, fontWeight: '700' }]}>
                  Notes (allergies, attentions…)
                </Text>
              </View>
              <TextInput
                style={[styles.noteInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Ex : allergique aux fruits de mer, table calme…"
                placeholderTextColor={theme.textSecondary}
                multiline
              />
              {noteText.trim() !== (detail.notes ?? '').trim() && (
                <TouchableOpacity
                  style={[styles.detailBtn, { backgroundColor: colors.sage, marginTop: 6 }]}
                  onPress={saveNote}
                  disabled={savingNote}
                >
                  <Ionicons name="save-outline" size={18} color={colors.white} />
                  <Text style={styles.detailBtnText}>{savingNote ? 'Enregistrement…' : 'Enregistrer la note'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 8 }} />
            {detail.guestPhone && (
              <TouchableOpacity
                style={[styles.detailBtn, { backgroundColor: colors.sage }]}
                onPress={() => callPhone(detail.guestPhone!)}
              >
                <Ionicons name="call" size={18} color={colors.white} />
                <Text style={styles.detailBtnText}>Appeler</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.detailBtn, { backgroundColor: colors.brand }]}
              onPress={() => { const r = detail; setDetail(null); if (r) handleCardPress(r); }}
            >
              <Ionicons name="options" size={18} color={colors.white} />
              <Text style={styles.detailBtnText}>Actions (check-in, annuler, supprimer…)</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </Modal>
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
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guestBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  editInput: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  smallSave: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailText: { fontSize: 15, flex: 1 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12 },
  detailBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  noteBlock: { gap: 6, marginTop: 6 },
  noteInput: { minHeight: 64, borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 14, textAlignVertical: 'top' },
});
