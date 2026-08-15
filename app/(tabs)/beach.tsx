import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { i18n } from '@/shared/i18n';
import { apiCall } from '@/shared/lib/api';
import { supabase } from '@/shared/lib/supabase';
import { useSunbeds } from '@/features/beach/hooks/useBeachData';
import { useAddons } from '@/features/beach/hooks/useAddons';
import { useBeachBooking } from '@/features/beach/hooks/useBeachBooking';
import { usePayment } from '@/shared/hooks/usePayment';
import { usePhoneGate } from '@/shared/hooks/usePhoneGate';
import { BeachMap } from '@/features/beach/components/BeachMap';
import { DateSelector } from '@/features/beach/components/DateSelector';
import { SunbedSheet } from '@/features/beach/components/SunbedSheet';
import { Badge } from '@/shared/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';

export default function BeachScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { fromMood, modify } = useLocalSearchParams<{ fromMood?: string; modify?: string }>();
  const booking = useBeachBooking();
  const { sunbeds, zones, loading, availableCount, totalCount } = useSunbeds(booking.date);
  const { addons: allAddons } = useAddons(booking.date);
  const hasBedSelected = booking.selectedSunbeds.some((sb) => sb.is_double);
  // L'add-on "Bouteille de cava" est réservé aux Beds
  const addons = hasBedSelected
    ? allAddons
    : allAddons.filter((a) => !/cava/i.test(a.name));
  const { pay } = usePayment();
  const { ensurePhone, phoneGate } = usePhoneGate();
  const { user } = useAuth();
  const [sheetVisible, setSheetVisible] = useState(false);

  const selectedSet = new Set(booking.selectedSunbeds.map((sb) => sb.id));

  // Mode modification : si on arrive avec ?modify=ID, on charge la résa existante
  useEffect(() => {
    if (modify && !booking.isModifying) {
      booking.loadForModification(modify);
    }
  }, [modify]);

  const handleSelectSunbed = (sunbed: any) => {
    booking.toggleSunbed(sunbed);
  };

  const handleOpenConfirm = async () => {
    if (booking.selectedSunbeds.length === 0) return;
    // Demander le téléphone AVANT d'ouvrir le sheet — sinon le phoneGate
    // est rendu derrière le BottomSheet et invisible pour l'utilisateur.
    // Si pas connecté, on laisse SunbedSheet gérer la redirection login.
    if (user) {
      const phoneOk = await ensurePhone();
      if (!phoneOk) return;
    }
    setSheetVisible(true);
  };

  const handleBookWithPayment = async () => {
    const phoneOk = await ensurePhone();
    if (!phoneOk) return { success: false };

    // === Mode MODIFICATION ===
    if (booking.isModifying) {
      const mod = await booking.submitModification();
      if (!mod.success || !mod.reservationId) {
        Alert.alert(i18n.t('error'), mod.error ?? i18n.t('modifyFailed'));
        return { success: false };
      }

      // S'il y a une différence à régler, ouvrir Stripe pour le complément
      if (mod.extraClientSecret && (mod.diff ?? 0) > 0) {
        const payResult = await pay({
          type: 'beach',
          reservationId: mod.reservationId,
          amount: mod.diff ?? 0,
        });
        if (!payResult.success) {
          Alert.alert(i18n.t('error'), i18n.t('modifyExtraPaymentFailed'));
          return { success: false };
        }
      }

      const msg = (mod.diff ?? 0) > 0
        ? i18n.t('modifySuccessExtra').replace('{{amount}}', String(mod.diff))
        : (mod.refundedAmount ?? 0) > 0
          ? i18n.t('modifySuccessRefund').replace('{{amount}}', String(mod.refundedAmount))
          : i18n.t('modifySuccessNoDiff');
      Alert.alert(i18n.t('modifySuccessTitle'), msg);
      return { success: true, reservationId: mod.reservationId };
    }

    // === Mode CRÉATION (flow normal) ===
    const result = await booking.submitBooking();
    if (!result.success || !result.reservationId) return { success: false };

    if (booking.depositAmount > 0) {
      const payResult = await pay({
        type: 'beach',
        reservationId: result.reservationId,
        amount: booking.depositAmount,
      });
      if (!payResult.success) {
        await supabase.from('beach_reservations').delete().eq('id', result.reservationId);
        return { success: false };
      }
    }

    await supabase.from('beach_reservations').update({ status: 'confirmed' }).eq('id', result.reservationId);
    // Synchroniser explicitement les liens transats (ne pas dépendre du trigger DB,
    // sinon les transats restent "pending" => affichés libres => double-booking).
    await supabase.from('beach_reservation_sunbeds').update({ status: 'confirmed' }).eq('reservation_id', result.reservationId);
    apiCall('/api/notifications/booking-confirmed', { type: 'beach', reservationId: result.reservationId }).catch(() => {});

    return result;
  };

  const handleCloseSheet = () => {
    setSheetVisible(false);
    setTimeout(() => booking.goBack(), 300);
  };

  const totalAvailable = zones.reduce((sum, z) => sum + availableCount(z.id), 0);
  const totalSunbeds = zones.reduce((sum, z) => sum + totalCount(z.id), 0);

  const selectedCount = booking.selectedSunbeds.length;
  const showFloatingBar = selectedCount > 0 && !sheetVisible;
  const selHasBed = booking.selectedSunbeds.some((sb) => sb.is_double);
  const selAllCL = booking.selectedSunbeds.length > 0 && booking.selectedSunbeds.every((sb) => sb.zone.zone_type === 'chaise_longue');
  const floatingNoun = selHasBed
    ? (selectedCount > 1 ? i18n.t('beds') : i18n.t('bed'))
    : selAllCL
      ? (selectedCount > 1 ? i18n.t('chaisesLongues') : i18n.t('chaiseLongue'))
      : (selectedCount > 1 ? (i18n.t('sunbeds') ?? 'transats') : i18n.t('sunbed'));

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: theme.background }]}>
        {fromMood && (
          <TouchableOpacity onPress={() => router.push('/mood')} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>{i18n.t('backToSuggestions')}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>{i18n.t('theBeach')}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {i18n.t('chooseSunbed')}
            </Text>
          </View>
          {!loading && totalSunbeds > 0 && (
            <Badge
              label={`${totalAvailable}/${totalSunbeds} ${i18n.t('dispoCount')}`}
              variant={totalAvailable > 10 ? 'success' : totalAvailable > 3 ? 'warning' : 'error'}
            />
          )}
        </View>

        <DateSelector selectedDate={booking.date} onSelect={booking.setDate} />
      </View>

      {/* Carte interactive */}
      {booking.isDateClosed ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="close-circle-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary, textAlign: 'center', paddingHorizontal: 24 }]}>
            {i18n.t('beachClosedThisDay')}
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {i18n.t('loadingBeach')}
          </Text>
        </View>
      ) : (
        <BeachMap
          sunbeds={sunbeds}
          selectedId={null}
          selectedIds={selectedSet}
          onSelect={handleSelectSunbed}
        />
      )}

      {/* Barre flottante de sélection */}
      {showFloatingBar && (
        <View style={[styles.floatingBar, { backgroundColor: theme.background, borderTopColor: theme.cardBorder, paddingBottom: insets.bottom + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.floatingCount, { color: theme.text }]}>
              {selectedCount} {floatingNoun}
            </Text>
            <Text style={[styles.floatingTotal, { color: theme.textSecondary }]}>
              {i18n.t('total')} : <Text style={{ color: colors.brand, fontWeight: '700' }}>{booking.basePrice}€</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={booking.clearSunbeds} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.clearText, { color: theme.textSecondary }]}>{i18n.t('clear') ?? 'Vider'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenConfirm}
            style={[styles.confirmBtn, { backgroundColor: colors.brand }]}
          >
            <Ionicons name="arrow-forward" size={18} color={colors.white} />
            <Text style={styles.confirmText}>{i18n.t('reserve')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Sheet de réservation */}
      <SunbedSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        sunbeds={booking.selectedSunbeds}
        lineItems={booking.lineItems}
        date={booking.date}
        addons={addons}
        selectedAddons={booking.selectedAddons}
        onToggleAddon={booking.toggleAddon}
        onUpdateQuantity={booking.updateAddonQuantity}
        onBook={handleBookWithPayment}
        booking={booking.submitting}
        step={booking.step}
        onGoToAddons={booking.goToAddons}
        onGoToConfirm={booking.goToConfirm}
        onGoBack={booking.goBack}
        basePrice={booking.basePrice}
        addonsTotal={booking.addonsTotal}
        totalPrice={booking.totalPrice}
        depositAmount={booking.depositAmount}
        guestCount={booking.guestCount}
        onSetGuestCount={booking.setGuestCount}
        onRemoveSunbed={(id) => {
          const target = booking.selectedSunbeds.find((sb) => sb.id === id);
          if (target) booking.toggleSunbed(target);
        }}
        seasonLabel={booking.seasonLabel}
        seasonInclusions={booking.seasonInclusions}
        categoryLabel={booking.categoryLabel}
      />
      {phoneGate}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { zIndex: 10 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  backText: { fontSize: 16, fontWeight: '500' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  floatingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingCount: { fontSize: 14, fontWeight: '700' },
  floatingTotal: { fontSize: 12, marginTop: 2 },
  clearBtn: { paddingHorizontal: 8 },
  clearText: { fontSize: 13, fontWeight: '600' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmText: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
