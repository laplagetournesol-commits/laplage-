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

interface SunbedWithZone extends Sunbed {
  zone: BeachZone;
}

interface LineItem {
  sunbed: SunbedWithZone;
  unitPrice: number;
}

interface SunbedSheetProps {
  visible: boolean;
  onClose: () => void;
  sunbeds: SunbedWithZone[];
  lineItems: LineItem[];
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
  onRemoveSunbed: (id: string) => void;
  seasonLabel?: string | null;
  seasonInclusions?: string[];
  categoryLabel?: string | null;
}

export function SunbedSheet({
  visible,
  onClose,
  sunbeds,
  lineItems,
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
  onRemoveSunbed,
  seasonLabel,
  seasonInclusions,
  categoryLabel,
}: SunbedSheetProps) {
  const { theme } = useSunMode();
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    sunbeds: SunbedWithZone[];
    formattedDate: string;
    guestCount: number;
    totalPrice: number;
    depositAmount: number;
  } | null>(null);

  if (sunbeds.length === 0) return null;
  const first = sunbeds[0];

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString(i18n.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const sunbedsLabel = sunbeds.map((sb) => sb.label).join(', ');
  const sunbedCount = sunbeds.length;
  const hasBed = sunbeds.some((sb) => sb.is_double);
  const allChaiseLongues = sunbeds.length > 0 && sunbeds.every((sb) => sb.zone.zone_type === 'chaise_longue');
  // Libellé adapté au type de mobilier sélectionné
  const sunbedNoun = hasBed
    ? (sunbedCount > 1 ? i18n.t('beds') : i18n.t('bed'))
    : allChaiseLongues
      ? (sunbedCount > 1 ? i18n.t('chaisesLongues') : i18n.t('chaiseLongue'))
      : (sunbedCount > 1 ? (i18n.t('sunbeds') ?? 'transats') : i18n.t('sunbed'));

  const handleBook = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    const snap = { sunbeds: [...sunbeds], formattedDate, guestCount, totalPrice, depositAmount };
    const result = await onBook();
    if (result.success && result.qrCode) {
      setSnapshot(snap);
      setQrCode(result.qrCode);
      onClose();
      setTimeout(() => setShowQR(true), 400);
    } else if (result.success) {
      Alert.alert(
        i18n.t('bookingConfirmed'),
        i18n.t('sunbedReservedAlert').replace('{{label}}', sunbedsLabel).replace('{{date}}', formattedDate),
        [{ text: i18n.t('great'), onPress: onClose }],
      );
    }
  };

  const handleCloseQR = () => {
    setShowQR(false);
    setQrCode(null);
    setSnapshot(null);
  };

  const title =
    step === 'select' ? `${sunbedCount} ${sunbedNoun}` :
    step === 'addons' ? i18n.t('optionsExtras') :
    i18n.t('confirmation');

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={title}>
        {/* Étape 1 : Récap des transats sélectionnés */}
        {step === 'select' && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 600 }}>
            <View style={styles.content}>
              <View style={styles.row}>
                {categoryLabel && (
                  <Badge label={categoryLabel} variant={first.zone.zone_type === 'vip_cabana' ? 'vip' : 'default'} />
                )}
                {seasonLabel && <Badge label={seasonLabel} variant="success" size="sm" />}
              </View>

              <View style={[styles.infoCardCompact, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color={theme.accent} />
                  <Text style={[styles.infoTextCompact, { color: theme.text }]}>
                    {formattedDate}  •  {i18n.t('beachSchedule')}
                  </Text>
                </View>
              </View>

              {/* Liste des transats sélectionnés avec prix unitaire et bouton supprimer */}
              {lineItems.map((item) => {
                const isBed = item.sunbed.is_double;
                const isChaiseLongue = item.sunbed.zone.zone_type === 'chaise_longue';
                const titleLabel = isBed
                  ? item.sunbed.label
                  : isChaiseLongue
                    ? `${i18n.t('chaiseLongueCap')} ${item.sunbed.label}`
                    : `${i18n.t('sunbed')} ${item.sunbed.label}`;
                return (
                <View
                  key={item.sunbed.id}
                  style={[styles.lineRow, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lineLabel, { color: theme.text }]}>
                      {titleLabel}
                    </Text>
                    <Text style={[styles.lineSub, { color: theme.textSecondary }]}>
                      {item.sunbed.zone.name}
                    </Text>
                  </View>
                  <Text style={[styles.linePrice, { color: theme.accent }]}>{item.unitPrice}€</Text>
                  <TouchableOpacity
                    onPress={() => onRemoveSunbed(item.sunbed.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                );
              })}

              <View style={styles.compactRow}>
                <View style={styles.guestRowCompact}>
                  <Text style={[styles.guestLabelCompact, { color: theme.text }]}>{i18n.t('persons')}</Text>
                  {/* Compteur en lecture seule : nombre = somme des transats sélectionnés.
                      Pour 1 personne de plus, le client clique 1 transat de plus. */}
                  <View style={styles.guestCounter}>
                    <Text style={[styles.guestNum, { color: theme.text }]}>{guestCount}</Text>
                  </View>
                </View>
                <View style={styles.priceCompact}>
                  <Text style={[styles.priceValueBig, { color: colors.brand }]}>{basePrice}€</Text>
                  <Text style={[styles.priceDetail, { color: theme.textSecondary }]}>
                    {hasBed ? i18n.t('bed') : `${sunbedCount} ${sunbedNoun}`}
                  </Text>
                </View>
              </View>

              {/* Add-on inline pour les Beds : pas d'étape "Options" intermédiaire */}
              {hasBed && addons.filter((a) => /cava/i.test(a.name)).map((addon) => {
                const bedCount = sunbeds.filter((sb) => sb.is_double).length;
                const selectedEntry = selectedAddons.find((sa) => sa.addon.id === addon.id);
                const selected = !!selectedEntry;
                const totalAddonPrice = addon.price * bedCount;
                return (
                  <TouchableOpacity
                    key={addon.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (selected) {
                        onToggleAddon(addon);
                      } else {
                        onToggleAddon(addon);
                        // Une option par Bed : ajuste la quantité au nombre de Beds sélectionnés
                        if (bedCount > 1) onUpdateQuantity(addon.id, bedCount);
                      }
                    }}
                    style={[
                      styles.bedAddonRow,
                      {
                        backgroundColor: selected ? colors.brandLight ?? 'rgba(247, 217, 78, 0.18)' : theme.backgroundSecondary,
                        borderColor: selected ? colors.brand : theme.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selected ? colors.brand : theme.textSecondary}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.bedAddonName, { color: theme.text }]}>
                        {addon.icon ? `${addon.icon}  ` : ''}{/cava/i.test(addon.name) ? i18n.t('cavaFruitsOption') : addon.name}
                        {bedCount > 1 ? ` × ${bedCount}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.bedAddonPrice, { color: colors.brand }]}>+{totalAddonPrice}€</Text>
                  </TouchableOpacity>
                );
              })}

              <Button
                title={
                  hasBed
                    ? (user ? `${i18n.t('reserve')} — ${totalPrice}€` : i18n.t('connectToBook'))
                    : (addons.length > 0 ? i18n.t('chooseOptions') : (user ? `${i18n.t('reserve')} — ${totalPrice}€` : i18n.t('connectToBook')))
                }
                onPress={
                  hasBed
                    ? (user ? onGoToConfirm : () => router.push('/(auth)/login'))
                    : (addons.length > 0 ? onGoToAddons : (user ? onGoToConfirm : () => router.push('/(auth)/login')))
                }
                style={{ marginTop: 12 }}
              />
            </View>
          </ScrollView>
        )}

        {/* Étape 2 : Add-ons */}
        {step === 'addons' && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 600 }}>
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
                <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
                  {sunbedCount} {sunbedNoun}
                </Text>
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
          </ScrollView>
        )}

        {/* Étape 3 : Confirmation */}
        {step === 'confirm' && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 600 }}>
            <View style={styles.content}>
              <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={18} color={theme.accent} />
                <Text style={[styles.backText, { color: theme.accent }]}>{i18n.t('back')}</Text>
              </TouchableOpacity>

              <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.summaryTitle, { color: theme.text }]}>{i18n.t('summary')}</Text>

                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                    {sunbedNoun.charAt(0).toUpperCase() + sunbedNoun.slice(1)}
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>{sunbedsLabel}</Text>
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
                        a.quantity > 1 ? `${a.addon.name} x${a.quantity}` : a.addon.name,
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
                <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{i18n.t('amountToPay')}</Text>
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
          </ScrollView>
        )}
      </BottomSheet>

      {qrCode && snapshot && (
        <ReservationQRCode
          visible={showQR}
          onClose={handleCloseQR}
          qrCode={qrCode}
          type="beach"
          title={(() => {
            const snapHasBed = snapshot.sunbeds.some((sb) => sb.is_double);
            const snapAllCL = snapshot.sunbeds.every((sb) => sb.zone.zone_type === 'chaise_longue');
            const n = snapshot.sunbeds.length;
            if (snapHasBed) return n > 1 ? `${n} ${i18n.t('beds')}` : i18n.t('bed');
            if (snapAllCL) return n > 1 ? `${n} ${i18n.t('chaisesLongues')}` : `${i18n.t('chaiseLongueCap')} ${snapshot.sunbeds[0].label}`;
            return n > 1 ? `${n} ${i18n.t('sunbeds') ?? 'transats'}` : `${i18n.t('sunbed')} ${snapshot.sunbeds[0].label}`;
          })()}
          subtitle={snapshot.sunbeds.map((s) => s.label).join(', ')}
          details={[
            { label: i18n.t('date'), value: snapshot.formattedDate, icon: 'calendar-outline' },
            { label: i18n.t('schedule'), value: i18n.t('beachSchedule'), icon: 'time-outline' },
            {
              label: i18n.t('location'),
              value: snapshot.sunbeds.map((s) => `${s.zone.name} — ${s.label}`).join(' / '),
              icon: 'location-outline',
            },
            { label: i18n.t('persons'), value: `${snapshot.guestCount}`, icon: 'people-outline' },
          ]}
          price={`${snapshot.totalPrice}€`}
          deposit={`${snapshot.depositAmount}€`}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' },
  infoCardCompact: { padding: 10, borderRadius: 10, gap: 6, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTextCompact: { fontSize: 13, fontWeight: '500' },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  lineLabel: { fontSize: 14, fontWeight: '700' },
  lineSub: { fontSize: 12, marginTop: 1 },
  linePrice: { fontSize: 15, fontWeight: '700' },
  bedAddonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 10,
  },
  bedAddonName: { fontSize: 14, fontWeight: '700' },
  bedAddonDesc: { fontSize: 12, marginTop: 2 },
  bedAddonPrice: { fontSize: 15, fontWeight: '800', marginLeft: 8 },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  guestRowCompact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guestLabelCompact: { fontSize: 14, fontWeight: '600' },
  guestCounter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guestBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestNum: { fontSize: 16, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  priceCompact: { alignItems: 'flex-end' },
  priceValueBig: { fontSize: 22, fontWeight: '800' },
  priceDetail: { fontSize: 11 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backText: { fontSize: 14, fontWeight: '600' },
  addonItem: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 6,
    alignItems: 'center',
  },
  addonInfo: { flex: 1, gap: 2 },
  addonHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addonName: { fontSize: 14, fontWeight: '700' },
  addonDesc: { fontSize: 11, marginLeft: 24 },
  addonRight: { alignItems: 'flex-end', gap: 4 },
  addonPrice: { fontSize: 14, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyText: { fontSize: 14, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  priceSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceLabel: { fontSize: 13 },
  priceValue: { fontSize: 14, fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '800' },
  summaryCard: { padding: 12, borderRadius: 12, marginBottom: 8 },
  summaryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 16 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  policyCard: { padding: 10, borderRadius: 10, borderWidth: 1, gap: 4, marginTop: 12 },
  policyCardTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  policyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policyItemText: { fontSize: 12 },
});
