import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { useRestaurantTables } from '@/features/restaurant/hooks/useRestaurantData';
import { useRestaurantBooking } from '@/features/restaurant/hooks/useRestaurantBooking';
import { RestaurantMap } from '@/features/restaurant/components/RestaurantMap';
import { TableSheet } from '@/features/restaurant/components/TableSheet';
import { DateSelector } from '@/features/beach/components/DateSelector';
import { Badge } from '@/shared/ui/Badge';

export default function RestaurantScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const booking = useRestaurantBooking();
  const { tables, zones, loading, availableCount, totalCount } = useRestaurantTables(booking.date, booking.timeSlot);
  const [sheetVisible, setSheetVisible] = useState(false);

  const handleSelectTable = (table: any) => {
    booking.selectTable(table);
    setSheetVisible(true);
  };

  const handleClose = () => {
    setSheetVisible(false);
    setTimeout(() => booking.goBack(), 300);
  };

  const totalAvailable = zones.reduce((sum, z) => sum + availableCount(z.id), 0);
  const totalTables = zones.reduce((sum, z) => sum + totalCount(z.id), 0);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: theme.background }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Restaurant</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Choisissez votre table
            </Text>
          </View>
          {!loading && totalTables > 0 && (
            <Badge
              label={`${totalAvailable}/${totalTables} dispo`}
              variant={totalAvailable > 10 ? 'success' : totalAvailable > 3 ? 'warning' : 'error'}
            />
          )}
        </View>

        {/* Sélecteur Déjeuner / Dîner */}
        <View style={styles.timeSlotRow}>
          <TouchableOpacity
            onPress={() => booking.setTimeSlot('lunch')}
            style={[
              styles.timeSlotBtn,
              {
                backgroundColor: booking.timeSlot === 'lunch' ? colors.brand : theme.card,
                borderColor: booking.timeSlot === 'lunch' ? colors.brand : theme.cardBorder,
              },
            ]}
          >
            <Ionicons
              name="sunny-outline"
              size={16}
              color={booking.timeSlot === 'lunch' ? colors.white : theme.textSecondary}
            />
            <Text
              style={[
                styles.timeSlotText,
                { color: booking.timeSlot === 'lunch' ? colors.white : theme.textSecondary },
              ]}
            >
              Déjeuner 12h-16h
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => booking.setTimeSlot('dinner')}
            style={[
              styles.timeSlotBtn,
              {
                backgroundColor: booking.timeSlot === 'dinner' ? colors.brand : theme.card,
                borderColor: booking.timeSlot === 'dinner' ? colors.brand : theme.cardBorder,
              },
            ]}
          >
            <Ionicons
              name="moon-outline"
              size={16}
              color={booking.timeSlot === 'dinner' ? colors.white : theme.textSecondary}
            />
            <Text
              style={[
                styles.timeSlotText,
                { color: booking.timeSlot === 'dinner' ? colors.white : theme.textSecondary },
              ]}
            >
              Dîner 19h30-23h30
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sélecteur de date */}
        <DateSelector selectedDate={booking.date} onSelect={booking.setDate} />
      </View>

      {/* Carte interactive */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Chargement du plan...
          </Text>
        </View>
      ) : (
        <RestaurantMap
          tables={tables}
          selectedId={booking.table?.id ?? null}
          onSelect={handleSelectTable}
        />
      )}

      {/* Bottom Sheet de réservation */}
      <TableSheet
        visible={sheetVisible}
        onClose={handleClose}
        table={booking.table}
        date={booking.date}
        timeSlot={booking.timeSlot}
        step={booking.step}
        onGoToConfirm={booking.goToConfirm}
        onGoBack={booking.goBack}
        onBook={booking.submitBooking}
        booking={booking.submitting}
        minSpend={booking.minSpend}
        depositAmount={booking.depositAmount}
        guestCount={booking.guestCount}
        onSetGuestCount={booking.setGuestCount}
        specialRequests={booking.specialRequests}
        onSetSpecialRequests={booking.setSpecialRequests}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { zIndex: 10 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  timeSlotRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 8, marginBottom: 4,
  },
  timeSlotBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  timeSlotText: { fontSize: 13, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
});
