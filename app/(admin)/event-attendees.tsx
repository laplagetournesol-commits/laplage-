import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useEventAttendees } from '@/features/admin/hooks/useEventAttendees';

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  active: { label: 'Payé', variant: 'success' },
  used: { label: 'Arrivé', variant: 'warning' },
  cancelled: { label: 'Annulé', variant: 'error' },
  refunded: { label: 'Remboursé', variant: 'error' },
};

export default function EventAttendeesScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId: string; eventTitle?: string }>();
  const { attendees, loading, refresh, checkIn, undoCheckIn, checkedInCount, totalActive } = useEventAttendees(eventId ?? '');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCheckIn = (id: string, name: string) => {
    Alert.alert('Check-in', `Confirmer l'arrivée de ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => checkIn(id) },
    ]);
  };

  const handleUndoCheckIn = (id: string, name: string) => {
    Alert.alert('Annuler check-in', `Annuler le check-in de ${name} ?`, [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: () => undoCheckIn(id) },
    ]);
  };

  const filtered = search.trim()
    ? attendees.filter(
        (a) =>
          a.clientName.toLowerCase().includes(search.toLowerCase()) ||
          a.clientEmail.toLowerCase().includes(search.toLowerCase()),
      )
    : attendees;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{
          title: 'Participants',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentRed} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: eventTitle ?? 'Participants',
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accentRed} />
        }
      >
        {/* Counter */}
        <Card style={styles.counterCard}>
          <View style={styles.counterRow}>
            <View style={styles.counterItem}>
              <Text style={[styles.counterValue, { color: colors.sage }]}>{checkedInCount}</Text>
              <Text style={[styles.counterLabel, { color: theme.textSecondary }]}>Arrivés</Text>
            </View>
            <View style={[styles.counterDivider, { backgroundColor: theme.cardBorder }]} />
            <View style={styles.counterItem}>
              <Text style={[styles.counterValue, { color: theme.text }]}>{totalActive}</Text>
              <Text style={[styles.counterLabel, { color: theme.textSecondary }]}>Inscrits</Text>
            </View>
            <View style={[styles.counterDivider, { backgroundColor: theme.cardBorder }]} />
            <View style={styles.counterItem}>
              <Text style={[styles.counterValue, { color: colors.terracotta }]}>
                {totalActive - checkedInCount}
              </Text>
              <Text style={[styles.counterLabel, { color: theme.textSecondary }]}>Attendus</Text>
            </View>
          </View>
        </Card>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un nom..."
            placeholderTextColor={theme.textSecondary}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={theme.cardBorder} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {search ? 'Aucun résultat' : 'Aucun participant'}
            </Text>
          </View>
        ) : (
          filtered.map((attendee) => {
            const status = STATUS_CONFIG[attendee.status] ?? STATUS_CONFIG.active;
            const isCheckedIn = attendee.status === 'used';
            const canCheckIn = attendee.status === 'active';

            return (
              <Card key={attendee.id} style={styles.attendeeCard}>
                <View style={styles.attendeeRow}>
                  <View style={[
                    styles.checkCircle,
                    {
                      backgroundColor: isCheckedIn ? colors.sage : 'transparent',
                      borderColor: isCheckedIn ? colors.sage : theme.cardBorder,
                    },
                  ]}>
                    {isCheckedIn && <Ionicons name="checkmark" size={14} color={colors.white} />}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.attendeeName, { color: theme.text }]}>{attendee.clientName}</Text>
                    <Text style={[styles.attendeeEmail, { color: theme.textSecondary }]}>{attendee.clientEmail}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge
                      label={attendee.ticketType === 'vip' ? 'VIP' : 'Standard'}
                      variant={attendee.ticketType === 'vip' ? 'vip' : 'default'}
                      size="sm"
                    />
                    <Badge label={status.label} variant={status.variant} size="sm" />
                  </View>
                </View>

                {/* Check-in / Undo button */}
                {canCheckIn && (
                  <TouchableOpacity
                    style={[styles.checkInBtn, { backgroundColor: colors.sage + '15' }]}
                    onPress={() => handleCheckIn(attendee.id, attendee.clientName)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={colors.sage} />
                    <Text style={[styles.checkInBtnText, { color: colors.sage }]}>Check-in</Text>
                  </TouchableOpacity>
                )}
                {isCheckedIn && (
                  <TouchableOpacity
                    style={[styles.checkInBtn, { backgroundColor: theme.cardBorder + '30' }]}
                    onPress={() => handleUndoCheckIn(attendee.id, attendee.clientName)}
                  >
                    <Ionicons name="arrow-undo" size={14} color={theme.textSecondary} />
                    <Text style={[styles.checkInBtnText, { color: theme.textSecondary }]}>
                      Annuler check-in
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  counterCard: { marginBottom: 16 },
  counterRow: { flexDirection: 'row', alignItems: 'center' },
  counterItem: { flex: 1, alignItems: 'center', gap: 2 },
  counterValue: { fontSize: 28, fontWeight: '800' },
  counterLabel: { fontSize: 11, fontWeight: '500' },
  counterDivider: { width: 1, height: 36 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14 },
  attendeeCard: { marginBottom: 8 },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeName: { fontSize: 14, fontWeight: '600' },
  attendeeEmail: { fontSize: 11, marginTop: 1 },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  checkInBtnText: { fontSize: 12, fontWeight: '600' },
});
