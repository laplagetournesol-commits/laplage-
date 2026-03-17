import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { ReservationQRCode } from '@/shared/ui/ReservationQRCode';
import { useAuth } from '@/contexts/AuthContext';
import type { RestaurantZone } from '@/shared/types';
import { i18n } from '@/shared/i18n';

interface TableSheetProps {
  visible: boolean;
  onClose: () => void;
  zone: RestaurantZone | null;
  date: string;
  timeSlot: 'lunch' | 'dinner';
  step: 'select' | 'confirm';
  onGoToConfirm: () => void;
  onGoBack: () => void;
  onBook: () => Promise<{ success: boolean; qrCode?: string }>;
  booking: boolean;
  depositAmount: number;
  guestCount: number;
  onSetGuestCount: (n: number) => void;
  specialRequests: string;
  onSetSpecialRequests: (text: string) => void;
}

export function TableSheet({
  visible,
  onClose,
  zone,
  date,
  timeSlot,
  step,
  onGoToConfirm,
  onGoBack,
  onBook,
  booking,
  depositAmount,
  guestCount,
  onSetGuestCount,
  specialRequests,
  onSetSpecialRequests,
}: TableSheetProps) {
  const { theme } = useSunMode();
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  if (!zone) return null;

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(i18n.locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const timeLabel = timeSlot === 'lunch' ? i18n.t('lunchHours') : i18n.t('dinnerHours');
  const zoneIcon = zone.zone_type === 'terrasse' ? 'sunny-outline' : 'home-outline';
  const zoneName = zone.zone_type === 'terrasse' ? i18n.t('terrace') : i18n.t('interior');

  const handleBook = async () => {
    if (!user) { router.push('/(auth)/login'); return; }
    const result = await onBook();
    if (result.success && result.qrCode) {
      setQrCode(result.qrCode);
      onClose();
      setTimeout(() => setShowQR(true), 400);
    } else if (result.success) {
      Alert.alert(
        i18n.t('bookingConfirmed'),
        `${i18n.t('tableReservedAlert').replace('{{zone}}', zoneName).replace('{{date}}', formattedDate).replace('{{time}}', timeSlot === 'lunch' ? i18n.t('lunchService') : i18n.t('dinnerService'))}`,
        [{ text: i18n.t('tablePerfect'), onPress: onClose }]
      );
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
    setQrCode(null);
  };

  const title = step === 'select' ? zoneName : i18n.t('confirmation');

  return (
    <>
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
        {step === 'select' && (
          <View style={styles.content}>
            <View style={styles.row}>
              <Badge
                label={zoneName}
                variant={zone.zone_type === 'terrasse' ? 'default' : 'vip'}
              />
            </View>

            {zone.description && (
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {zone.description}
              </Text>
            )}

            <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={theme.accent} />
                <Text style={[styles.infoText, { color: theme.text }]}>{formattedDate}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color={theme.accent} />
                <Text style={[styles.infoText, { color: theme.text }]}>{timeLabel}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name={zoneIcon as any} size={16} color={theme.accent} />
                <Text style={[styles.infoText, { color: theme.text }]}>{zoneName}</Text>
              </View>
            </View>

            {/* Nombre de convives */}
            <View style={styles.guestRow}>
              <Text style={[styles.guestLabel, { color: theme.text }]}>{i18n.t('guests')}</Text>
              <View style={styles.guestCounter}>
                <TouchableOpacity
                  onPress={() => onSetGuestCount(guestCount - 1)}
                  style={[styles.guestBtn, { borderColor: theme.cardBorder }]}
                >
                  <Ionicons name="remove" size={18} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.guestNum, { color: theme.text }]}>{guestCount}</Text>
                <TouchableOpacity
                  onPress={() => onSetGuestCount(guestCount + 1)}
                  style={[styles.guestBtn, { borderColor: theme.cardBorder }]}
                >
                  <Ionicons name="add" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Pré-autorisation */}
            <View style={[styles.preAuthCard, { backgroundColor: colors.sunYellowLight }]}>
              <Ionicons name="card-outline" size={16} color={colors.warmWood} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.preAuthText, { color: colors.warmWood }]}>
                  {i18n.t('cardDeposit')} : 30€/{i18n.t('persons').toLowerCase()} ({depositAmount}€)
                </Text>
                <Text style={[styles.preAuthSubtext, { color: colors.warmWood }]}>
                  {i18n.t('cardDepositDesc')}
                </Text>
              </View>
            </View>

            {/* Demandes spéciales */}
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.guestLabel, { color: theme.text, marginBottom: 8 }]}>
                {i18n.t('specialRequests')}
              </Text>
              <TextInput
                style={[
                  styles.specialRequestsInput,
                  { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.cardBorder },
                ]}
                value={specialRequests}
                onChangeText={onSetSpecialRequests}
                placeholder={i18n.t('specialRequestsRestaurant')}
                placeholderTextColor={theme.textSecondary}
                multiline
              />
            </View>

            <Button title={i18n.t('reserve')} onPress={onGoToConfirm} style={{ marginTop: 16 }} />
          </View>
        )}

        {step === 'confirm' && (
          <View style={styles.content}>
            <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={18} color={theme.accent} />
              <Text style={[styles.backText, { color: theme.accent }]}>{i18n.t('back')}</Text>
            </TouchableOpacity>

            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>{i18n.t('summary')}</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('zone')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{zoneName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('date')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{formattedDate}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('service')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {timeSlot === 'lunch' ? i18n.t('lunchService') : i18n.t('dinnerService')} ({timeLabel})
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('guests')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{guestCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('depositCB')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  30€/{i18n.t('perPerson')} ({depositAmount}€ {i18n.t('totalLabel')})
                </Text>
              </View>
            </View>

            <View style={[styles.depositRow, { borderTopColor: theme.cardBorder }]}>
              <Text style={[styles.depositLabel, { color: theme.textSecondary }]}>
                {i18n.t('depositCB')}
              </Text>
              <Text style={[styles.depositValue, { color: colors.brand }]}>{depositAmount}€</Text>
            </View>

            <View style={[styles.policyCard, { backgroundColor: colors.sunYellowLight, borderColor: colors.sunYellow + '40' }]}>
              <Text style={[styles.policyCardTitle, { color: colors.warmWood }]}>{i18n.t('bookingConditions')}</Text>
              <View style={styles.policyItem}>
                <Ionicons name="pencil-outline" size={13} color={colors.warmWood} />
                <Text style={[styles.policyItemText, { color: colors.warmWood }]}>{i18n.t('modifiableUpTo24h')}</Text>
              </View>
              <View style={styles.policyItem}>
                <Ionicons name="close-circle-outline" size={13} color={colors.warmWood} />
                <Text style={[styles.policyItemText, { color: colors.warmWood }]}>{i18n.t('freeCancellation')}</Text>
              </View>
              <View style={styles.policyItem}>
                <Ionicons name="alert-circle-outline" size={13} color={colors.warmWood} />
                <Text style={[styles.policyItemText, { color: colors.warmWood }]}>{i18n.t('noShowWarning').replace('{{amount}}', String(depositAmount))}</Text>
              </View>
            </View>

            <Button
              title={user ? `${i18n.t('confirm')} — ${depositAmount}€` : i18n.t('connectToBook')}
              onPress={handleBook}
              loading={booking}
              size="lg"
              style={{ marginTop: 12 }}
            />

          </View>
        )}
      </ScrollView>
    </BottomSheet>

    {qrCode && (
      <ReservationQRCode
        visible={showQR}
        onClose={handleCloseQR}
        qrCode={qrCode}
        type="restaurant"
        title={`${i18n.t('tabRestaurant')} — ${zoneName}`}
        subtitle={zoneName}
        details={[
          { label: i18n.t('date'), value: formattedDate, icon: 'calendar-outline' },
          { label: i18n.t('service'), value: timeSlot === 'lunch' ? `${i18n.t('lunchService')} (${i18n.t('lunchHours')})` : `${i18n.t('dinnerService')} (${i18n.t('dinnerHours')})`, icon: 'time-outline' },
          { label: i18n.t('zone'), value: zoneName, icon: zoneIcon },
          { label: i18n.t('guests'), value: `${guestCount}`, icon: 'people-outline' },
        ]}
        deposit={`${depositAmount}€`}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  infoCard: { padding: 14, borderRadius: 12, gap: 10, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, fontWeight: '500' },
  guestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  guestLabel: { fontSize: 15, fontWeight: '600' },
  guestCounter: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  guestBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  guestNum: { fontSize: 18, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  preAuthCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10 },
  preAuthText: { fontSize: 13, fontWeight: '600' },
  preAuthSubtext: { fontSize: 11, fontWeight: '500', marginTop: 2, fontStyle: 'italic' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '600' },
  summaryCard: { padding: 16, borderRadius: 14, gap: 10, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  depositRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1 },
  depositLabel: { fontSize: 14 },
  depositValue: { fontSize: 20, fontWeight: '800' },
  policyCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
    gap: 6,
  },
  policyCardTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  policyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policyItemText: { fontSize: 11, fontWeight: '500' },
  tokenBonus: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  specialRequestsInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
