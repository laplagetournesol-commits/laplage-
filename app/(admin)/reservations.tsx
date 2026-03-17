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
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';

type TabType = 'beach' | 'restaurant';

interface ReservationRow {
  id: string;
  status: string;
  date: string;
  guestCount: number;
  clientName: string;
  locationLabel: string;
  timeSlot?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  confirmed: { label: 'Confirmé', variant: 'success' },
  checked_in: { label: 'Check-in', variant: 'warning' },
  completed: { label: 'Terminé', variant: 'default' },
  cancelled: { label: 'Annulé', variant: 'error' },
  no_show: { label: 'No-show', variant: 'error' },
  pending: { label: 'Attente', variant: 'default' },
};

export default function ReservationsScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabType>('beach');
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchReservations = async () => {
    setLoading(true);

    if (tab === 'beach') {
      const { data } = await supabase
        .from('beach_reservations')
        .select('id, status, date, guest_count, profile:profiles(full_name), sunbed:sunbeds(label)')
        .eq('date', today)
        .order('created_at', { ascending: false });

      setReservations(
        (data ?? []).map((r: any) => ({
          id: r.id,
          status: r.status,
          date: r.date,
          guestCount: r.guest_count,
          clientName: r.profile?.full_name ?? 'Inconnu',
          locationLabel: `Transat ${r.sunbed?.label ?? '?'}`,
        })),
      );
    } else {
      const { data } = await supabase
        .from('restaurant_reservations')
        .select('id, status, date, guest_count, time_slot, profile:profiles(full_name), table:restaurant_tables(label)')
        .eq('date', today)
        .order('created_at', { ascending: false });

      setReservations(
        (data ?? []).map((r: any) => ({
          id: r.id,
          status: r.status,
          date: r.date,
          guestCount: r.guest_count,
          clientName: r.profile?.full_name ?? 'Inconnu',
          locationLabel: `Table ${r.table?.label ?? '?'}`,
          timeSlot: r.time_slot,
        })),
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
  }, [tab]);

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

  const handleCardPress = (r: ReservationRow) => {
    if (r.status === 'completed' || r.status === 'cancelled') return;

    const buttons: any[] = [{ text: 'Fermer', style: 'cancel' }];

    if (r.status !== 'checked_in') {
      buttons.push({ text: 'Check-in', onPress: () => updateStatus(r.id, 'checked_in') });
    }

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
                // Libérer l'empreinte CB Stripe si restaurant
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

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setTab('beach')}
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={theme.cardBorder} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Aucune réservation aujourd'hui
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
            {reservations.length} réservation{reservations.length > 1 ? 's' : ''} aujourd'hui
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  list: { paddingHorizontal: 20 },
  countLabel: { fontSize: 13, marginBottom: 12 },
  resCard: { marginBottom: 10 },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resClient: { fontSize: 15, fontWeight: '600' },
  resLocation: { fontSize: 12, marginTop: 3 },
  resRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkInBtn: { padding: 2 },
});
