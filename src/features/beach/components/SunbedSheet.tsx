import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { ReservationQRCode } from '@/shared/ui/ReservationQRCode';
import { useAuth } from '@/contexts/AuthContext';
import { i18n } from '@/shared/i18n';
import type { Sunbed, BeachZone, Addon } from '@/shared/types';

interface SelectedAddon {
  addon: Addon;
  quantity: number;
}

interface SunbedSheetProps {
  visible: boolean;
  onClose: () => void;
  sunbed: (Sunbed & { zone: BeachZone }) | null;
  date: string;
  addons: Addon[];
  selectedAddons: SelectedAddon[];
  onToggleAddon: (addon: Addon) => void;
  onUpdateQuantity: (addonId: string, quantity: number) => void;
  onBook: () => Promise<{ success: boolean; qrCode?: string }>;
  booking: boolean;
  step: 'select' | 'addons' | 'confirm';
  onGoToAddons: () => void;
  onGoToConfirm: () => void;
  onGoBack: () => void;
  basePrice: number;
  addonsTotal: number;
  totalPrice: number;
  depositAmount: number;
  guestCount: number;
  onSetGuestCount: (n: number) => void;
  seasonLabel?: string | null;
  seasonInclusions?: string[];
  categoryLabel?: string | null;
}

export function SunbedSheet({
  visible,
  onClose,
  sunbed,
  date,
  addons,
  selectedAddons,
  onToggleAddon,
  onUpdateQuantity,
  onBook,
  booking,
  step,
  onGoToAddons,
  onGoToConfirm,
  onGoBack,
  basePrice,
  addonsTotal,
  totalPrice,
  depositAmount,
  guestCount,
  onSetGuestCount,
  seasonLabel,
  seasonInclusions,
  categoryLabel,
}: SunbedSheetProps) {
  const { theme } = useSunMode();
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  if (!sunbed) return null;

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(i18n.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleBook = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    const result = await onBook();
    if (result.success && result.qrCode) {
      setQrCode(result.qrCode);
      onClose();
      setTimeout(() => setShowQR(true), 400);
    } else if (result.success) {
      Alert.alert(
        i18n.t('bookingConfirmed'),
        i18n.t('sunbedReservedAlert').replace('{{label}}', sunbed.label).replace('{{date}}', formattedDate),
        [{ text: i18n.t('great'), onPress: onClose }]
      );
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
    setQrCode(null);
  };

  const title =
    step === 'select' ? `${i18n.t('sunbed')} ${sunbed.label}` :
    step === 'addons' ? i18n.t('optionsExtras') :
    i18n.t('confirmation');

  return (
    <>
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {/* Étape 1 : Détails du transat — PAS de scroll, tout visible */}
      {step === 'select' && (
        <View style={styles.content}>
          <View style={styles.row}>
            <Badge
              label={categoryLabel || (sunbed.zone.zone_type === 'vip_cabana' ? i18n.t('balinaiseBed') : sunbed.zone.name)}
              variant={sunbed.zone.zone_type === 'vip_cabana' ? 'vip' : 'default'}
            />
            {sunbed.is_double && <Badge label={i18n.t('double')} variant="success" size="sm" />}
            {seasonLabel && <Badge label={seasonLabel} variant="success" size="sm" />}
          </View>
          <View style={styles.row}>
            {(seasonInclusions && seasonInclusions.length > 0 ? seasonInclusions : [i18n.t('parasolIncluded')]).map((inc, i) => (
              <View key={i} style={[styles.includedBadge, { backgroundColor: colors.sage + '15' }]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.sage} />
                <Text style={[styles.includedBadgeText, { color: colors.sage }]}>{inc}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.infoCardCompact, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.accent} />
              <Text style={[styles.infoTextCompact, { color: theme.text }]}>{formattedDate}  •  {i18n.t('beachSchedule')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={theme.accent} />
              <Text style={[styles.infoTextCompact, { color: theme.text }]}>{sunbed.zone.name} — {sunbed.label}</Text>
            </View>
          </View>

          <View style={styles.compactRow}>
            <View style={styles.guestRowCompact}>
              <Text style={[styles.guestLabelCompact, { color: theme.text }]}>{i18n.t('persons')}</Text>
              <View style={styles.guestCounter}>
                <TouchableOpacity
                  onPress={() => onSetGuestCount(guestCount - 1)}
                  style={[styles.guestBtn, { borderColor: theme.cardBorder }]}
                >
                  <Ionicons name="remove" size={16} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.guestNum, { color: theme.text }]}>{guestCount}</Text>
                <TouchableOpacity
                  onPress={() => onSetGuestCount(guestCount + 1)}
                  style={[styles.guestBtn, { borderColor: theme.cardBorder }]}
                >
                  <Ionicons name="add" size={16} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.priceCompact}>
              <Text style={[styles.priceValueBig, { color: colors.brand }]}>{basePrice}€</Text>
              {guestCount > 1 && (
                <Text style={[styles.priceDetail, { color: theme.textSecondary }]}>
                  {basePrice / guestCount}€ × {guestCount}
                </Text>
              )}
            </View>
          </View>

          <Button title={i18n.t('chooseOptions')} onPress={onGoToAddons} style={{ marginTop: 8 }} />
        </View>
      )}

      {/* Étapes 2 et 3 avec scroll */}
      {step !== 'select' && (
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 600 }}>

        {/* Étape 2 : Add-ons */}
        {step === 'addons' && (
          <View style={styles.content}>
            <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={18} color={theme.accent} />
              <Text style={[styles.backText, { color: theme.accent }]}>{i18n.t('back')}</Text>
            </TouchableOpacity>

            {addons.map((addon) => {
              const selected = selectedAddons.find((a) => a.addon.id === addon.id);
              const isSelected = !!selected;

              return (
                <TouchableOpacity
                  key={addon.id}
                  onPress={() => onToggleAddon(addon)}
                  style={[
                    styles.addonItem,
                    {
                      backgroundColor: isSelected ? colors.sunYellowLight : theme.backgroundSecondary,
                      borderColor: isSelected ? colors.sunYellow : 'transparent',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.addonInfo}>
                    <View style={styles.addonHeader}>
                      <Ionicons
                        name={(addon.icon as any) ?? 'add-circle-outline'}
                        size={18}
                        color={isSelected ? colors.brand : theme.textSecondary}
                      />
                      <Text style={[styles.addonName, { color: theme.text }]}>{addon.name}</Text>
                    </View>
                    {addon.description && (
                      <Text style={[styles.addonDesc, { color: theme.textSecondary }]}>
                        {addon.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.addonRight}>
                    <Text style={[styles.addonPrice, { color: theme.accent }]}>{addon.price}€</Text>
                    {isSelected && (
                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            onUpdateQuantity(addon.id, (selected?.quantity ?? 1) - 1);
                          }}
                        >
                          <Ionicons name="remove-circle" size={22} color={colors.brand} />
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, { color: theme.text }]}>{selected?.quantity}</Text>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            onUpdateQuantity(addon.id, (selected?.quantity ?? 1) + 1);
                          }}
                        >
                          <Ionicons name="add-circle" size={22} color={colors.brand} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={[styles.priceRow, { borderTopColor: theme.cardBorder, marginTop: 12 }]}>
              <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{i18n.t('sunbed')}</Text>
              <Text style={[styles.priceValue, { color: theme.text }]}>{basePrice}€</Text>
            </View>
            {addonsTotal > 0 && (
              <View style={styles.priceSubRow}>
                <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{i18n.t('options')}</Text>
                <Text style={[styles.priceValue, { color: theme.text }]}>+{addonsTotal}€</Text>
              </View>
            )}
            <View style={styles.priceSubRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>{i18n.t('total')}</Text>
              <Text style={[styles.totalValue, { color: colors.brand }]}>{totalPrice}€</Text>
            </View>

            <Button title={i18n.t('confirmBooking')} onPress={onGoToConfirm} style={{ marginTop: 16 }} />
          </View>
        )}

        {/* Étape 3 : Confirmation */}
        {step === 'confirm' && (
          <View style={styles.content}>
            <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={18} color={theme.accent} />
              <Text style={[styles.backText, { color: theme.accent }]}>{i18n.t('back')}</Text>
            </TouchableOpacity>

            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>{i18n.t('summary')}</Text>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('sunbed')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>
                  {sunbed.label} ({sunbed.zone.name})
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('date')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{formattedDate}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('schedule')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{i18n.t('beachSchedule')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('persons')}</Text>
                <Text style={[styles.summaryValue, { color: theme.text }]}>{guestCount}</Text>
              </View>
              {selectedAddons.length > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{i18n.t('options')}</Text>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>
                    {selectedAddons.map((a) =>
                      a.quantity > 1 ? `${a.addon.name} x${a.quantity}` : a.addon.name
                    ).join(', ')}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.priceRow, { borderTopColor: theme.cardBorder }]}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>{i18n.t('total')}</Text>
              <Text style={[styles.totalValue, { color: colors.brand }]}>{totalPrice}€</Text>
            </View>
            <View style={styles.priceSubRow}>
              <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
                {i18n.t('amountToPay')}
              </Text>
              <Text style={[styles.priceValue, { color: theme.text }]}>{depositAmount}€</Text>
            </View>

            <View style={[styles.policyCard, { backgroundColor: colors.sunYellowLight, borderColor: colors.sunYellow + '40' }]}>
              <Text style={[styles.policyCardTitle, { color: colors.warmWood }]}>{i18n.t('bookingConditions')}</Text>
              <View style={styles.policyItem}>
                <Ionicons name="pencil-outline" size={13} color={colors.warmWood} />
                <Text style={[styles.policyItemText, { color: colors.warmWood }]}>{i18n.t('modifiableUpTo24h')}</Text>
              </View>
              <View style={styles.policyItem}>
                <Ionicons name="close-circle-outline" size={13} color={colors.warmWood} />
                <Text style={[styles.policyItemText, { color: colors.warmWood }]}>{i18n.t('nonCancellable')}</Text>
              </View>
              <View style={styles.policyItem}>
                <Ionicons name="alert-circle-outline" size={13} color={colors.warmWood} />
                <Text style={[styles.policyItemText, { color: colors.warmWood }]}>{i18n.t('noShowLost')}</Text>
              </View>
            </View>

            <Button
              title={user ? `${i18n.t('reserve')} — ${totalPrice}€` : i18n.t('connectToBook')}
              onPress={handleBook}
              loading={booking}
              size="lg"
              style={{ marginTop: 12 }}
            />

          </View>
        )}
      </ScrollView>
      )}
    </BottomSheet>

    {qrCode && (
      <ReservationQRCode
        visible={showQR}
        onClose={handleCloseQR}
        qrCode={qrCode}
        type="beach"
        title={`${i18n.t('sunbed')} ${sunbed.label}`}
        subtitle={`${i18n.t('zone')} ${sunbed.zone.name}`}
        details={[
          { label: i18n.t('date'), value: formattedDate, icon: 'calendar-outline' },
          { label: i18n.t('schedule'), value: i18n.t('beachSchedule'), icon: 'time-outline' },
          { label: i18n.t('location'), value: `${sunbed.zone.name} — ${sunbed.label}`, icon: 'location-outline' },
          { label: i18n.t('persons'), value: `${guestCount}`, icon: 'people-outline' },
        ]}
        price={`${totalPrice}€`}
        deposit={`${depositAmount}€`}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' },
  includedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  includedBadgeText: { fontSize: 11, fontWeight: '600' },
  infoCardCompact: { padding: 10, borderRadius: 10, gap: 6, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTextCompact: { fontSize: 13, fontWeight: '500' },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  guestRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guestLabelCompact: { fontSize: 14, fontWeight: '600' },
  priceCompact: { alignItems: 'flex-end' },
  priceValueBig: { fontSize: 22, fontWeight: '800' },
  priceDetail: { fontSize: 11, marginTop: 2 },
  guestCounter: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  guestBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestNum: { fontSize: 18, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1 },
  priceSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  priceLabel: { fontSize: 14 },
  priceValue: { fontSize: 14, fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '800' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '600' },
  addonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  addonInfo: { flex: 1 },
  addonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addonName: { fontSize: 14, fontWeight: '600' },
  addonDesc: { fontSize: 11, marginTop: 3, marginLeft: 26 },
  addonRight: { alignItems: 'flex-end', gap: 6 },
  addonPrice: { fontSize: 15, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyText: { fontSize: 14, fontWeight: '600', minWidth: 16, textAlign: 'center' },
  summaryCard: { padding: 16, borderRadius: 14, gap: 10, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
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
});
