import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { useRestaurantZones } from '@/features/restaurant/hooks/useRestaurantData';
import { useRestaurantBooking } from '@/features/restaurant/hooks/useRestaurantBooking';
import { DateSelector } from '@/features/beach/components/DateSelector';
import { TimeSelector } from '@/features/restaurant/components/TimeSelector';
import { Button } from '@/shared/ui/Button';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { ReservationQRCode } from '@/shared/ui/ReservationQRCode';
import { useAuth } from '@/contexts/AuthContext';
import { usePayment } from '@/shared/hooks/usePayment';
import { useRestaurantCapacity } from '@/features/restaurant/hooks/useRestaurantCapacity';
import { i18n } from '@/shared/i18n';

export default function RestaurantScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { fromMood } = useLocalSearchParams<{ fromMood?: string }>();
  const { user } = useAuth();
  const booking = useRestaurantBooking();
  const { pay } = usePayment();
  const { zones, loading } = useRestaurantZones(booking.date, booking.time);
  const capacity = useRestaurantCapacity(booking.date, booking.time);
  const [showConfirm, setShowConfirm] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const formattedDate = new Date(booking.date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const handleBook = async () => {
    if (!user) { router.push('/(auth)/login'); return; }
    const result = await booking.submitBooking();
    if (!result.success || !result.reservationId) return;

    // Paiement par empreinte CB
    if (booking.depositAmount > 0) {
      const payResult = await pay({
        type: 'restaurant',
        reservationId: result.reservationId,
        amount: booking.depositAmount,
      });
      if (!payResult.success) {
        setShowConfirm(false);
        return;
      }
    }

    setShowConfirm(false);
    if (result.qrCode) {
      setQrCode(result.qrCode);
      setTimeout(() => setShowQR(true), 400);
    } else {
      Alert.alert(
        i18n.t('bookingConfirmed'),
        `${i18n.t('tableReservedAlert').replace('{{zone}}', booking.zone?.name ?? '').replace('{{date}}', formattedDate).replace('{{time}}', booking.time.replace(':', 'h'))}`,
        [{ text: i18n.t('tablePerfect') }]
      );
    }
    booking.reset();
  };

  const canReserve = booking.zone && booking.guestCount > 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {fromMood && (
            <TouchableOpacity onPress={() => router.push('/mood')} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
              <Text style={[styles.backLabel, { color: theme.text }]}>{i18n.t('backToSuggestions')}</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: theme.text }]}>Restaurant</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {i18n.t('bookYourTable')}
          </Text>
        </View>

        {/* Date */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{i18n.t('date')}</Text>
        <DateSelector selectedDate={booking.date} onSelect={booking.setDate} />

        {/* Heure */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{i18n.t('time')}</Text>
        <TimeSelector selectedTime={booking.time} selectedDate={booking.date} onSelect={booking.setTime} />

        {/* Capacité */}
        {!capacity.loading && capacity.maxCovers > 0 && (
          <View style={[styles.capacityBanner, {
            backgroundColor: capacity.isFull ? 'rgba(220,38,38,0.12)' : 'rgba(34,180,60,0.10)',
            borderColor: capacity.isFull ? 'rgba(220,38,38,0.3)' : 'rgba(34,180,60,0.25)',
          }]}>
            <Ionicons
              name={capacity.isFull ? 'close-circle' : 'people'}
              size={16}
              color={capacity.isFull ? '#dc2626' : '#22b43c'}
            />
            <Text style={{
              color: capacity.isFull ? '#dc2626' : '#22b43c',
              fontWeight: '700',
              fontSize: 13,
              marginLeft: 6,
            }}>
              {capacity.isFull
                ? i18n.t('fullForService')
                : `${capacity.remaining} ${i18n.t('spotsRemaining')}`}
            </Text>
          </View>
        )}

        {/* Zone */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{i18n.t('location')}</Text>
        {loading ? (
          <ActivityIndicator style={{ marginVertical: 20 }} color={theme.accent} />
        ) : (
          <View style={styles.zonesRow}>
            {zones.map((zone) => {
              const isSelected = booking.zone?.id === zone.id;
              const isFull = zone.isFull;
              const icon = zone.zone_type === 'terrasse' ? 'sunny-outline' : 'home-outline';

              return (
                <TouchableOpacity
                  key={zone.id}
                  activeOpacity={isFull ? 1 : 0.7}
                  onPress={() => !isFull && booking.selectZone(zone)}
                  style={[
                    styles.zoneCard,
                    {
                      backgroundColor: isSelected ? colors.brand : theme.card,
                      borderColor: isSelected ? colors.brand : theme.cardBorder,
                      opacity: isFull ? 0.5 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={icon as any}
                    size={24}
                    color={isSelected ? colors.white : theme.accent}
                  />
                  <Text style={[
                    styles.zoneName,
                    { color: isSelected ? colors.white : theme.text },
                  ]}>
                    {zone.name}
                  </Text>
                  {isFull && (
                    <View style={styles.fullBadge}>
                      <Text style={styles.fullText}>{i18n.t('full')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Convives */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{i18n.t('guestCount')}</Text>
        <View style={[styles.guestRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            onPress={() => booking.setGuestCount(booking.guestCount - 1)}
            style={[styles.guestBtn, { borderColor: theme.cardBorder }]}
          >
            <Ionicons name="remove" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.guestNum, { color: theme.text }]}>{booking.guestCount}</Text>
          <TouchableOpacity
            onPress={() => booking.setGuestCount(booking.guestCount + 1)}
            style={[styles.guestBtn, { borderColor: theme.cardBorder }]}
          >
            <Ionicons name="add" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Pré-autorisation */}
        {booking.requireDeposit && (
          <View style={[styles.preAuthCard, { backgroundColor: colors.sunYellowLight }]}>
            <Ionicons name="card-outline" size={18} color={colors.warmWood} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.preAuthText, { color: colors.warmWood }]}>
                {i18n.t('cardDeposit')} : 30€ × {booking.guestCount} = {booking.depositAmount}€
              </Text>
              <Text style={[styles.preAuthSubtext, { color: colors.warmWood }]}>
                {i18n.t('cardDepositDesc')}
              </Text>
            </View>
          </View>
        )}

        {/* Demandes spéciales */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>{i18n.t('specialRequests')}</Text>
        <TextInput
          style={[
            styles.specialInput,
            { color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
          value={booking.specialRequests}
          onChangeText={booking.setSpecialRequests}
          placeholder={i18n.t('specialRequestsRestaurant')}
          placeholderTextColor={theme.textSecondary}
          multiline
        />

        {/* Bouton réserver */}
        <View style={styles.buttonContainer}>
          <Button
            title={canReserve ? (booking.requireDeposit ? `${i18n.t('reserve')} — ${booking.depositAmount}€` : i18n.t('reserve')) : i18n.t('chooseLocation')}
            onPress={() => setShowConfirm(true)}
            disabled={!canReserve}
            size="lg"
          />
        </View>

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Bottom Sheet confirmation */}
      <BottomSheet
        visible={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={i18n.t('confirmation')}
      >
        <View style={styles.confirmContent}>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('zone')}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{booking.zone?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('date')}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{formattedDate}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('time')}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{booking.time.replace(':', 'h')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('guests')}</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>{booking.guestCount}</Text>
            </View>
            {booking.specialRequests ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('requests')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{booking.specialRequests}</Text>
              </View>
            ) : null}
          </View>

          {booking.requireDeposit && (
            <View style={[styles.depositRow, { borderTopColor: theme.cardBorder }]}>
              <Text style={[styles.depositLabel, { color: theme.textSecondary }]}>{i18n.t('depositCB')}</Text>
              <Text style={[styles.depositValue, { color: colors.brand }]}>{booking.depositAmount}€</Text>
            </View>
          )}

          {booking.requireDeposit && (
            <View style={[styles.policyCard, { backgroundColor: colors.sunYellowLight, borderColor: colors.sunYellow + '40' }]}>
              <View style={styles.policyItem}>
                <Ionicons name="checkmark-circle-outline" size={13} color={colors.warmWood} />
                <Text style={[styles.policyText, { color: colors.warmWood }]}>{i18n.t('freeCancellation')}</Text>
              </View>
              <View style={styles.policyItem}>
                <Ionicons name="alert-circle-outline" size={13} color={colors.warmWood} />
                <Text style={[styles.policyText, { color: colors.warmWood }]}>No-show : {i18n.t('depositCB')} ({booking.depositAmount}€)</Text>
              </View>
            </View>
          )}

          <Button
            title={user ? (booking.requireDeposit ? `${i18n.t('confirm')} — ${booking.depositAmount}€` : i18n.t('confirmReservation')) : i18n.t('connectToBook')}
            onPress={handleBook}
            loading={booking.submitting}
            size="lg"
            style={{ marginTop: 16 }}
          />
        </View>
      </BottomSheet>

      {/* QR Code */}
      {qrCode && (
        <ReservationQRCode
          visible={showQR}
          onClose={() => { setShowQR(false); setQrCode(null); }}
          qrCode={qrCode}
          type="restaurant"
          title={`Restaurant — ${booking.zone?.name}`}
          subtitle={booking.zone?.name ?? ''}
          details={[
            { label: i18n.t('date'), value: formattedDate, icon: 'calendar-outline' },
            { label: i18n.t('time'), value: booking.time.replace(':', 'h'), icon: 'time-outline' },
            { label: i18n.t('zone'), value: booking.zone?.name ?? '', icon: booking.zone?.zone_type === 'terrasse' ? 'sunny-outline' : 'home-outline' },
            { label: i18n.t('guests'), value: `${booking.guestCount}`, icon: 'people-outline' },
          ]}
          deposit={booking.requireDeposit ? `${booking.depositAmount}€` : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  backLabel: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  sectionLabel: { fontSize: 15, fontWeight: '700', paddingHorizontal: 20, marginTop: 16, marginBottom: 4 },
  capacityBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  zonesRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 8 },
  zoneCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  zoneName: { fontSize: 15, fontWeight: '700' },
  fullBadge: {
    backgroundColor: 'rgba(201, 64, 64, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  fullText: { fontSize: 11, fontWeight: '700', color: '#C94040' },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  guestBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestNum: { fontSize: 24, fontWeight: '800', minWidth: 30, textAlign: 'center' },
  preAuthCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
  },
  preAuthText: { fontSize: 14, fontWeight: '600' },
  preAuthSubtext: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  specialInput: {
    marginHorizontal: 20,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  buttonContainer: { paddingHorizontal: 20, marginTop: 24 },
  confirmContent: { paddingBottom: 16 },
  summaryCard: { padding: 16, borderRadius: 14, gap: 10, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  depositRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, marginBottom: 12 },
  depositLabel: { fontSize: 14 },
  depositValue: { fontSize: 22, fontWeight: '800' },
  policyCard: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  policyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policyText: { fontSize: 11, fontWeight: '500' },
});
