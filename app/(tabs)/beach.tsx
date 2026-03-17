import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
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
import { BeachMap } from '@/features/beach/components/BeachMap';
import { DateSelector } from '@/features/beach/components/DateSelector';
import { SunbedSheet } from '@/features/beach/components/SunbedSheet';
import { Badge } from '@/shared/ui/Badge';

export default function BeachScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { fromMood } = useLocalSearchParams<{ fromMood?: string }>();
  const booking = useBeachBooking();
  const { sunbeds, zones, loading, availableCount, totalCount } = useSunbeds(booking.date);
  const { addons } = useAddons(booking.date);
  const { pay } = usePayment();
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleSelectSunbed = (sunbed: any) => {
    booking.selectSunbed(sunbed);
    setSheetVisible(true);
  };

  const handleBookWithPayment = async () => {
    const result = await booking.submitBooking();
    if (!result.success || !result.reservationId) return { success: false };

    if (booking.depositAmount > 0) {
      const payResult = await pay({
        type: 'beach',
        reservationId: result.reservationId,
        amount: booking.depositAmount,
      });
      if (!payResult.success) {
        // Paiement annulé/échoué → supprimer la réservation
        await supabase.from('beach_reservations').delete().eq('id', result.reservationId);
        return { success: false };
      }
    }

    // Paiement réussi (ou pas de paiement requis) → confirmer la réservation
    await supabase.from('beach_reservations').update({ status: 'confirmed' }).eq('id', result.reservationId);

    // Push de confirmation seulement après paiement réussi
    apiCall('/api/notifications/booking-confirmed', { type: 'beach', reservationId: result.reservationId }).catch(() => {});

    return result;
  };

  const handleClose = () => {
    setSheetVisible(false);
    // Reset au step 1 quand on ferme
    setTimeout(() => booking.goBack(), 300);
  };

  const totalAvailable = zones.reduce((sum, z) => sum + availableCount(z.id), 0);
  const totalSunbeds = zones.reduce((sum, z) => sum + totalCount(z.id), 0);

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

        {/* Sélecteur de date */}
        <DateSelector selectedDate={booking.date} onSelect={booking.setDate} />
      </View>

      {/* Carte interactive */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {i18n.t('loadingBeach')}
          </Text>
        </View>
      ) : (
        <BeachMap
          sunbeds={sunbeds}
          selectedId={booking.sunbed?.id ?? null}
          onSelect={handleSelectSunbed}
        />
      )}

      {/* Bottom Sheet de réservation */}
      <SunbedSheet
        visible={sheetVisible}
        onClose={handleClose}
        sunbed={booking.sunbed}
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
        seasonLabel={booking.seasonLabel}
        seasonInclusions={booking.seasonInclusions}
        categoryLabel={booking.categoryLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    zIndex: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
});
