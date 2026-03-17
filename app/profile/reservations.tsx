import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { ReservationQRCode } from '@/shared/ui/ReservationQRCode';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import { i18n } from '@/shared/i18n';

interface Reservation {
  id: string;
  date: string;
  status: string;
  type: 'beach' | 'restaurant';
  label: string;
  zone: string;
  qr_code?: string;
  total_price?: number;
  deposit_amount?: number;
  time_slot?: string;
  sunbed_id?: string;
  table_id?: string;
  guest_count?: number;
}

function getStatusBadge(): Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> {
  return {
    pending: { label: i18n.t('statusPending'), variant: 'default' },
    confirmed: { label: i18n.t('statusConfirmed'), variant: 'success' },
    checked_in: { label: i18n.t('statusCheckedIn'), variant: 'warning' },
    completed: { label: i18n.t('statusCompleted'), variant: 'default' },
    cancelled: { label: i18n.t('statusCancelled'), variant: 'error' },
    no_show: { label: i18n.t('statusNoShow'), variant: 'error' },
  };
}

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
  const [qrReservation, setQrReservation] = useState<Reservation | null>(null);

  const fetchReservations = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const [beachRes, restoRes] = await Promise.all([
      supabase
        .from('beach_reservations')
        .select('id, date, status, total_price, deposit_amount, guest_count, sunbed_id, qr_code, sunbed:sunbeds(label, zone:beach_zones(name))')
        .eq('user_id', user.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(30),
      supabase
        .from('restaurant_reservations')
        .select('id, date, status, deposit_amount, time_slot, guest_count, table_id, qr_code, table:restaurant_tables(label, zone:restaurant_zones(name))')
        .eq('user_id', user.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(30),
    ]);

    const beach: Reservation[] = (beachRes.data ?? []).map((r: any) => ({
      id: r.id,
      date: r.date,
      status: r.status,
      type: 'beach' as const,
      label: r.sunbed?.label ?? '?',
      zone: r.sunbed?.zone?.name ?? '',
      qr_code: r.qr_code,
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
      qr_code: r.qr_code,
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

  const handleCancel = (reservation: Reservation) => {
    Alert.alert(
      i18n.t('cancelReservation'),
      i18n.t('cancelConfirm'),
      [
        { text: i18n.t('no'), style: 'cancel' },
        {
          text: i18n.t('yesCancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Libérer l'empreinte CB si restaurant avec dépôt
              if (reservation.type === 'restaurant' && reservation.deposit_amount && reservation.deposit_amount > 0) {
                await apiCall('/api/payments/cancel-hold', { reservationId: reservation.id }).catch(() => {});
              }

              const table = reservation.type === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
              const { error } = await supabase
                .from(table)
                .update({ status: 'cancelled' })
                .eq('id', reservation.id);

              if (error) throw error;

              Alert.alert(i18n.t('reservationCancelled'), i18n.t('reservationCancelledDesc'));
              fetchReservations();
            } catch (err: any) {
              Alert.alert(i18n.t('error'), err.message ?? i18n.t('impossibleCancel'));
            }
          },
        },
      ],
    );
  };

  const handleModify = (reservation: Reservation) => {
    if (!isModifiable(reservation.date)) {
      Alert.alert(
        i18n.t('modifyImpossible'),
        i18n.t('modifyImpossibleDesc'),
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
    new Date(d + 'T00:00:00').toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: i18n.t('myReservations'),
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
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{i18n.t('noReservations')}</Text>
            </View>
          ) : (
            reservations.map((r) => {
              const STATUS_BADGE = getStatusBadge();
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
                        {r.type === 'beach' ? i18n.t('sunbed') : i18n.t('table')} {r.label}
                      </Text>
                      <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                        {r.zone} • {formatDate(r.date)}{r.time_slot ? ` • ${r.time_slot === 'lunch' ? i18n.t('lunchService') : i18n.t('dinnerService')}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={badge.label} variant={badge.variant} size="sm" />
                      {r.total_price != null && (
                        <Text style={[styles.price, { color: colors.brand }]}>{r.total_price}€</Text>
                      )}
                      {r.deposit_amount != null && r.deposit_amount > 0 && r.total_price == null && (
                        <Text style={[styles.price, { color: theme.textSecondary }]}>{r.deposit_amount}€ {i18n.t('deposit')}</Text>
                      )}
                    </View>
                  </View>

                  {/* Bouton QR code — uniquement pour les réservations à venir */}
                  {r.qr_code && future && (r.status === 'confirmed' || r.status === 'pending' || r.status === 'checked_in') && (
                    <TouchableOpacity
                      style={[styles.qrBtn, { backgroundColor: (r.type === 'beach' ? colors.terracotta : colors.deepSea) + '12' }]}
                      onPress={() => setQrReservation(r)}
                    >
                      <Ionicons name="qr-code" size={16} color={r.type === 'beach' ? colors.terracotta : colors.deepSea} />
                      <Text style={[styles.qrBtnText, { color: r.type === 'beach' ? colors.terracotta : colors.deepSea }]}>
                        {i18n.t('viewQR')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Boutons modifier / annuler ou mention non modifiable */}
                  {canModify && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.modifyBtn, { borderColor: theme.cardBorder, flex: 1 }]}
                        onPress={() => handleModify(r)}
                      >
                        <Ionicons name="pencil" size={14} color={theme.accent} />
                        <Text style={[styles.modifyBtnText, { color: theme.accent }]}>{i18n.t('modify')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modifyBtn, { borderColor: 'rgba(220,38,38,0.3)', flex: 1 }]}
                        onPress={() => handleCancel(r)}
                      >
                        <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
                        <Text style={[styles.modifyBtnText, { color: '#dc2626' }]}>{i18n.t('cancel')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {showLocked && (
                    <View style={styles.lockedRow}>
                      <Ionicons name="lock-closed" size={12} color={theme.textSecondary} />
                      <Text style={[styles.lockedText, { color: theme.textSecondary }]}>
                        {i18n.t('notModifiableCancellable')}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* QR Code BottomSheet */}
      {qrReservation && (
        <ReservationQRCode
          visible={!!qrReservation}
          onClose={() => setQrReservation(null)}
          qrCode={qrReservation.qr_code!}
          type={qrReservation.type}
          title={`${qrReservation.type === 'beach' ? i18n.t('sunbed') : i18n.t('table')} ${qrReservation.label}`}
          subtitle={qrReservation.zone}
          details={[
            { label: i18n.t('date'), value: formatDate(qrReservation.date), icon: 'calendar-outline' },
            ...(qrReservation.time_slot ? [{
              label: i18n.t('service'),
              value: qrReservation.time_slot === 'lunch' ? i18n.t('lunchService') : i18n.t('dinnerService'),
              icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
            }] : []),
            ...(qrReservation.type === 'beach' ? [{
              label: i18n.t('schedule'),
              value: i18n.t('beachHours'),
              icon: 'sunny-outline' as keyof typeof Ionicons.glyphMap,
            }] : []),
            { label: i18n.t('zone'), value: qrReservation.zone, icon: 'location-outline' },
            ...(qrReservation.guest_count ? [{
              label: i18n.t('persons'),
              value: `${qrReservation.guest_count}`,
              icon: 'people-outline' as keyof typeof Ionicons.glyphMap,
            }] : []),
          ]}
          price={qrReservation.total_price ? `${qrReservation.total_price}€` : undefined}
          deposit={qrReservation.deposit_amount ? `${qrReservation.deposit_amount}€` : undefined}
        />
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
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
  },
  lockedText: { fontSize: 11 },
  qrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  qrBtnText: { fontSize: 13, fontWeight: '700' },
});
