import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/shared/lib/supabase';

interface Reservation {
  id: string;
  date: string;
  status: string;
  type: 'beach' | 'restaurant';
  label: string;
  zone: string;
  total_price?: number;
  deposit_amount?: number;
  time_slot?: string;
  sunbed_id?: string;
  table_id?: string;
  guest_count?: number;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  pending: { label: 'En attente', variant: 'default' },
  confirmed: { label: 'Confirmé', variant: 'success' },
  checked_in: { label: 'Check-in', variant: 'warning' },
  completed: { label: 'Terminé', variant: 'default' },
  cancelled: { label: 'Annulé', variant: 'error' },
  no_show: { label: 'No-show', variant: 'error' },
};

function isModifiable(dateStr: string): boolean {
  const reservationDate = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diffMs = reservationDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 24;
}

function isFuture(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr >= today;
}

export default function MyReservationsScreen() {
  const { theme } = useSunMode();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = async () => {
    if (!user) return;

    const [beachRes, restoRes] = await Promise.all([
      supabase
        .from('beach_reservations')
        .select('id, date, status, total_price, deposit_amount, guest_count, sunbed_id, sunbed:sunbeds!inner(label, zone:beach_zones!inner(name))')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30),
      supabase
        .from('restaurant_reservations')
        .select('id, date, status, deposit_amount, time_slot, guest_count, table_id, table:restaurant_tables!inner(label, zone:restaurant_zones!inner(name))')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30),
    ]);

    const beach: Reservation[] = (beachRes.data ?? []).map((r: any) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      type: 'beach' as const,
      label: r.sunbed?.label ?? '?',
      zone: r.sunbed?.zone?.name ?? '',
      total_price: r.total_price,
      deposit_amount: r.deposit_amount,
      sunbed_id: r.sunbed_id,
      guest_count: r.guest_count,
    }));

    const resto: Reservation[] = (restoRes.data ?? []).map((r: any) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      type: 'restaurant' as const,
      label: r.table?.label ?? '?',
      zone: r.table?.zone?.name ?? '',
      deposit_amount: r.deposit_amount,
      time_slot: r.time_slot,
      table_id: r.table_id,
      guest_count: r.guest_count,
    }));

    const all = [...beach, ...resto].sort((a, b) => b.date.localeCompare(a.date));
    setReservations(all);
    setLoading(false);
  };

  useEffect(() => { fetchReservations(); }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  const handleModify = (reservation: Reservation) => {
    if (!isModifiable(reservation.date)) {
      Alert.alert(
        'Modification impossible',
        'Les réservations ne sont modifiables que jusqu\'à 24h avant la date prévue.',
      );
      return;
    }

    if (reservation.type === 'beach') {
      router.push({ pathname: '/(tabs)/beach', params: { modify: reservation.id } });
    } else {
      router.push({ pathname: '/(tabs)/restaurant', params: { modify: reservation.id } });
    }
  };

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Mes réservations',
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
      }} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.accent} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
        >
          {reservations.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={theme.cardBorder} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Aucune réservation</Text>
            </View>
          ) : (
            reservations.map((r) => {
              const badge = STATUS_BADGE[r.status] ?? { label: r.status, variant: 'default' as const };
              const future = isFuture(r.date);
              const canModify = future && isModifiable(r.date) && (r.status === 'confirmed' || r.status === 'pending');
              const showLocked = future && !isModifiable(r.date) && (r.status === 'confirmed' || r.status === 'pending');

              return (
                <Card key={r.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={[styles.typeIcon, { backgroundColor: (r.type === 'beach' ? colors.terracotta : colors.deepSea) + '15' }]}>
                      <Ionicons
                        name={r.type === 'beach' ? 'umbrella' : 'restaurant'}
                        size={18}
                        color={r.type === 'beach' ? colors.terracotta : colors.deepSea}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>
                        {r.type === 'beach' ? 'Transat' : 'Table'} {r.label}
                      </Text>
                      <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                        {r.zone} • {formatDate(r.date)}{r.time_slot ? ` • ${r.time_slot === 'lunch' ? 'Déjeuner' : 'Dîner'}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={badge.label} variant={badge.variant} size="sm" />
                      {r.total_price != null && (
                        <Text style={[styles.price, { color: colors.brand }]}>{r.total_price}€</Text>
                      )}
                      {r.deposit_amount != null && r.total_price == null && (
                        <Text style={[styles.price, { color: theme.textSecondary }]}>{r.deposit_amount}€ acompte</Text>
                      )}
                    </View>
                  </View>

                  {/* Bouton modifier ou mention non modifiable */}
                  {canModify && (
                    <TouchableOpacity
                      style={[styles.modifyBtn, { borderColor: theme.cardBorder }]}
                      onPress={() => handleModify(r)}
                    >
                      <Ionicons name="pencil" size={14} color={theme.accent} />
                      <Text style={[styles.modifyBtnText, { color: theme.accent }]}>Modifier la réservation</Text>
                    </TouchableOpacity>
                  )}
                  {showLocked && (
                    <View style={styles.lockedRow}>
                      <Ionicons name="lock-closed" size={12} color={theme.textSecondary} />
                      <Text style={[styles.lockedText, { color: theme.textSecondary }]}>
                        Non modifiable (moins de 24h)
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  price: { fontSize: 13, fontWeight: '700' },
  modifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modifyBtnText: { fontSize: 13, fontWeight: '600' },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
  },
  lockedText: { fontSize: 11 },
});
