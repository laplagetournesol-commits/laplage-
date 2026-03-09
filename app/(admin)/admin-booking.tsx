import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { DateSelector } from '@/features/beach/components/DateSelector';
import { BeachMap } from '@/features/beach/components/BeachMap';
import { useSunbeds } from '@/features/beach/hooks/useBeachData';
import { supabase } from '@/shared/lib/supabase';
import type { Sunbed, BeachZone } from '@/shared/types';

type BookingType = 'beach' | 'restaurant';

interface TableOption {
  id: string;
  label: string;
  seats: number;
  zoneName: string;
}

export default function AdminBookingScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<BookingType>('beach');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [guestName, setGuestName] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [timeSlot, setTimeSlot] = useState<'lunch' | 'dinner'>('lunch');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSunbed, setSelectedSunbed] = useState<(Sunbed & { zone: BeachZone }) | null>(null);

  // Beach: réutilise le même hook + carte que les clients
  const { sunbeds, loading: beachLoading } = useSunbeds(date);

  // Restaurant
  const [tables, setTables] = useState<TableOption[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset sélection quand on change de type ou date
  useEffect(() => {
    setSelectedId(null);
    setSelectedSunbed(null);
  }, [date, type, timeSlot]);

  // Charger tables restaurant
  useEffect(() => {
    if (type !== 'restaurant') return;
    loadAvailableTables();
  }, [date, type, timeSlot]);

  const loadAvailableTables = async () => {
    setLoadingTables(true);

    const { data: allTables } = await supabase
      .from('restaurant_tables')
      .select('id, label, seats, zone:restaurant_zones(name)')
      .eq('is_active', true)
      .order('label');

    const { data: booked } = await supabase
      .from('restaurant_reservations')
      .select('table_id')
      .eq('date', date)
      .eq('time_slot', timeSlot)
      .in('status', ['confirmed', 'checked_in', 'pending']);

    const bookedIds = new Set((booked ?? []).map((r: any) => r.table_id));

    setTables(
      (allTables ?? [])
        .filter((t: any) => !bookedIds.has(t.id))
        .map((t: any) => ({
          id: t.id,
          label: t.label,
          seats: t.seats,
          zoneName: t.zone?.name ?? '',
        })),
    );
    setLoadingTables(false);
  };

  const handleSelectSunbed = (sunbed: Sunbed & { zone: BeachZone } & { isReserved: boolean }) => {
    if (sunbed.isReserved) return;
    setSelectedId(sunbed.id);
    setSelectedSunbed(sunbed);
  };

  const handleSubmit = async () => {
    if (!selectedId) {
      Alert.alert('Erreur', `Sélectionnez un ${type === 'beach' ? 'transat' : 'table'}`);
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const note = guestName.trim()
        ? `Réservé par l'admin pour : ${guestName.trim()}`
        : 'Réservation admin';

      if (type === 'beach') {
        const { error } = await supabase.from('beach_reservations').insert({
          user_id: user.id,
          sunbed_id: selectedId,
          date,
          status: 'confirmed',
          total_price: 0,
          deposit_amount: 0,
          deposit_paid: true,
          guest_count: guestCount,
          special_requests: note,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('restaurant_reservations').insert({
          user_id: user.id,
          table_id: selectedId,
          date,
          time_slot: timeSlot,
          status: 'confirmed',
          deposit_amount: 0,
          deposit_paid: true,
          guest_count: guestCount,
          special_requests: note,
        });
        if (error) throw new Error(error.message);
      }

      Alert.alert(
        'Réservation créée',
        `${type === 'beach' ? 'Transat' : 'Table'} bloqué(e) pour ${guestName.trim() || 'admin'}`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Réservation admin',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Top section: type, name, date, guests */}
      <View style={styles.topSection}>
        {/* Type */}
        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => setType('beach')}
            style={[
              styles.chip,
              {
                backgroundColor: type === 'beach' ? colors.terracotta : theme.card,
                borderColor: type === 'beach' ? colors.terracotta : theme.cardBorder,
              },
            ]}
          >
            <Ionicons name="umbrella" size={16} color={type === 'beach' ? colors.white : theme.textSecondary} />
            <Text style={[styles.chipText, { color: type === 'beach' ? colors.white : theme.textSecondary }]}>
              Plage
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType('restaurant')}
            style={[
              styles.chip,
              {
                backgroundColor: type === 'restaurant' ? colors.deepSea : theme.card,
                borderColor: type === 'restaurant' ? colors.deepSea : theme.cardBorder,
              },
            ]}
          >
            <Ionicons name="restaurant" size={16} color={type === 'restaurant' ? colors.white : theme.textSecondary} />
            <Text style={[styles.chipText, { color: type === 'restaurant' ? colors.white : theme.textSecondary }]}>
              Restaurant
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nom + personnes sur la même ligne */}
        <View style={styles.nameRow}>
          <TextInput
            style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            placeholder="Nom de l'invité"
            placeholderTextColor={theme.textSecondary}
            value={guestName}
            onChangeText={setGuestName}
          />
          <View style={styles.counterRow}>
            <TouchableOpacity
              onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
              style={[styles.counterBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Ionicons name="remove" size={18} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.counterValue, { color: theme.text }]}>{guestCount}</Text>
            <TouchableOpacity
              onPress={() => setGuestCount(Math.min(10, guestCount + 1))}
              style={[styles.counterBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Ionicons name="add" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date */}
        <DateSelector selectedDate={date} onSelect={setDate} />

        {/* Créneau restaurant */}
        {type === 'restaurant' && (
          <View style={[styles.row, { marginTop: 8 }]}>
            <TouchableOpacity
              onPress={() => setTimeSlot('lunch')}
              style={[
                styles.chip,
                {
                  backgroundColor: timeSlot === 'lunch' ? colors.sage : theme.card,
                  borderColor: timeSlot === 'lunch' ? colors.sage : theme.cardBorder,
                },
              ]}
            >
              <Ionicons name="sunny" size={16} color={timeSlot === 'lunch' ? colors.white : theme.textSecondary} />
              <Text style={[styles.chipText, { color: timeSlot === 'lunch' ? colors.white : theme.textSecondary }]}>
                Déjeuner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTimeSlot('dinner')}
              style={[
                styles.chip,
                {
                  backgroundColor: timeSlot === 'dinner' ? colors.deepSea : theme.card,
                  borderColor: timeSlot === 'dinner' ? colors.deepSea : theme.cardBorder,
                },
              ]}
            >
              <Ionicons name="moon" size={16} color={timeSlot === 'dinner' ? colors.white : theme.textSecondary} />
              <Text style={[styles.chipText, { color: timeSlot === 'dinner' ? colors.white : theme.textSecondary }]}>
                Dîner
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Beach: carte identique aux clients */}
      {type === 'beach' && (
        <View style={styles.mapSection}>
          {beachLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : (
            <BeachMap
              sunbeds={sunbeds}
              selectedId={selectedId}
              onSelect={handleSelectSunbed}
            />
          )}
        </View>
      )}

      {/* Restaurant: grille de tables */}
      {type === 'restaurant' && (
        <ScrollView
          contentContainerStyle={[styles.tableList, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {loadingTables ? (
            <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 20 }} />
          ) : tables.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Aucune table disponible
            </Text>
          ) : (
            <View style={styles.grid}>
              {tables.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSelectedId(t.id)}
                  style={[
                    styles.slotBtn,
                    {
                      backgroundColor: selectedId === t.id ? colors.deepSea : theme.card,
                      borderColor: selectedId === t.id ? colors.deepSea : theme.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.slotLabel, { color: selectedId === t.id ? colors.white : theme.text }]}>
                    {t.label}
                  </Text>
                  <Text style={[styles.slotSub, { color: selectedId === t.id ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
                    {t.zoneName} — {t.seats} pl.
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Bouton confirmer — fixé en bas */}
      {selectedId && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background }]}>
          {selectedSunbed && type === 'beach' && (
            <Text style={[styles.selectedLabel, { color: theme.text }]}>
              Transat {selectedSunbed.label} — {selectedSunbed.zone.name}
            </Text>
          )}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: type === 'beach' ? colors.terracotta : colors.deepSea },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.submitText}>
                  Bloquer gratuitement
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topSection: { gap: 10, paddingTop: 8, paddingBottom: 4 },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: { fontSize: 18, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  mapSection: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tableList: { paddingHorizontal: 20, paddingTop: 12 },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 80,
  },
  slotLabel: { fontSize: 14, fontWeight: '700' },
  slotSub: { fontSize: 11, marginTop: 2 },
  bottomBar: {
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
