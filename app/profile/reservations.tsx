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
import { usePayment } from '@/shared/hooks/usePayment';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import { formatLocalDate } from '@/shared/lib/date';
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
  time?: string;
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

function isModifiable(reservation: Reservation, depositStartsOn: string | null): boolean {
  // Avant la date de début de la politique : toujours modifiable
  if (!depositStartsOn || reservation.date < depositStartsOn) return true;
  // À partir de la politique : annulable seulement si > 24h avant le créneau
  const startTime = reservation.time
    ?? (reservation.time_slot === 'dinner' ? '19:00' : '12:00');
  const reservationDate = new Date(`${reservation.date}T${startTime}:00`);
  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return reservationDate > cutoff;
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
  const [depositStartsOn, setDepositStartsOn] = useState<string | null>(null);
  const { pay } = usePayment();

  useEffect(() => {
    supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'deposit_starts_on')
      .single()
      .then(({ data }) => {
        if (data) setDepositStartsOn(data.value as string);
      });
  }, []);

  const handlePay = async (reservation: Reservation) => {
    const amount = reservation.total_price ?? reservation.deposit_amount ?? 0;
    if (amount <= 0) return;

    const payResult = await pay({
      type: reservation.type,
      reservationId: reservation.id,
      amount,
    });

    if (payResult.success) {
      const table = reservation.type === 'beach' ? 'beach_reservations' : 'restaurant_reservations';
      await supabase.from(table).update({ status: 'confirmed' }).eq('id', reservation.id);
      apiCall('/api/notifications/booking-confirmed', { type: reservation.type, reservationId: reservation.id }).catch(() => {});
      Alert.alert(i18n.t('bookingConfirmed'), i18n.t('paymentSuccess'));
      fetchReservations();
    }
  };

  const fetchReservations = async () => {
    if (!user) return;

    const today = formatLocalDate(new Date());

    const [beachRes, restoRes] = await Promise.all([
      supabase
        .from('beach_reservations')
        .select('id, date, status, total_price, deposit_amount, guest_count, sunbed_id, qr_code, sunbed:sunbeds!sunbed_id(label, zone:beach_zones(name)), linked_sunbeds:beach_reservation_sunbeds(sunbed:sunbeds(label, zone:beach_zones(name)))')
        .eq('user_id', user.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(30),
      supabase
        .from('restaurant_reservations')
        .select('id, date, status, deposit_amount, time, time_slot, guest_count, table_id, qr_code, table:restaurant_tables(label, zone:restaurant_zones(name))')
        .eq('user_id', user.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(30),
    ]);

    const beach: Reservation[] = (beachRes.data ?? []).map((r: any) => {
      const linked = (r.linked_sunbeds ?? [])
        .map((l: any) => l.sunbed)
        .filter(Boolean);
      const labels: string[] = linked.length > 0
        ? linked.map((s: any) => s.label).filter(Boolean)
        : [r.sunbed?.label].filter(Boolean);
      const zones: string[] = linked.length > 0
        ? Array.from(new Set(linked.map((s: any) => s.zone?.name).filter(Boolean)))
        : [r.sunbed?.zone?.name].filter(Boolean);
      return {
        id: r.id,
        date: r.date,
        status: r.status,
        type: 'beach' as const,
        label: labels.join(', ') || '?',
        zone: zones.join(', '),
        qr_code: r.qr_code,
        total_price: r.total_price,
        deposit_amount: r.deposit_amount,
        sunbed_id: r.sunbed_id,
        guest_count: r.guest_count,
      };
    });

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
      time: r.time,
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
              const result = await apiCall<{ cancelled?: boolean; error?: string }>(
                '/api/payments/cancel-reservation',
                { reservationId: reservation.id, type: reservation.type },
              );
              if (!result?.cancelled) {
                throw new Error(result?.error ?? i18n.t('impossibleCancel'));
              }

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
    if (!isModifiable(reservation, depositStartsOn)) {
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
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
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
              const canModify = future && isModifiable(r, depositStartsOn) && (r.status === 'confirmed' || r.status === 'pending');
              const showLocked = future && !isModifiable(r, depositStartsOn) && (r.status === 'confirmed' || r.status === 'pending');

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
                  {r.qr_code && future && (r.status === 'confirmed' || r.status === 'checked_in') && (
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

                  {/* Bouton Payer — pour les réservations en attente avec un montant à régler */}
                  {r.status === 'pending' && future && (r.total_price ?? r.deposit_amount ?? 0) > 0 && (
                    <TouchableOpacity
                      style={[styles.payBtn, { backgroundColor: colors.brand }]}
                      onPress={() => handlePay(r)}
                    >
                      <Ionicons name="card-outline" size={16} color="#fff" />
                      <Text style={styles.payBtnText}>{i18n.t('pay')} {r.total_price ?? r.deposit_amount}€</Text>
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

                  {/* Les résas annulées restent dans l'historique (pas de suppression
                      côté client : préserve la preuve d'annulation / le remboursement). */}
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
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
  deleteBtn: {
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
