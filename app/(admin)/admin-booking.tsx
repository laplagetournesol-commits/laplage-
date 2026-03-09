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
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { DateSelector } from '@/features/beach/components/DateSelector';
import { supabase } from '@/shared/lib/supabase';

type BookingType = 'beach' | 'restaurant';

interface SunbedOption {
  id: string;
  label: string;
  zoneName: string;
}

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
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [guestName, setGuestName] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [timeSlot, setTimeSlot] = useState<'lunch' | 'dinner'>('lunch');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [sunbeds, setSunbeds] = useState<SunbedOption[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedId(null);
    if (type === 'beach') {
      loadAvailableSunbeds();
    } else {
      loadAvailableTables();
    }
  }, [date, type, timeSlot]);

  const loadAvailableSunbeds = async () => {
    setLoadingSlots(true);

    const { data: allSunbeds } = await supabase
      .from('sunbeds')
      .select('id, label, zone:beach_zones(name)')
      .eq('is_active', true)
      .order('label');

    const { data: booked } = await supabase
      .from('beach_reservations')
      .select('sunbed_id')
      .eq('date', date)
      .in('status', ['confirmed', 'checked_in', 'pending']);

    const bookedIds = new Set((booked ?? []).map((r: any) => r.sunbed_id));

    setSunbeds(
      (allSunbeds ?? [])
        .filter((s: any) => !bookedIds.has(s.id))
        .map((s: any) => ({
          id: s.id,
          label: s.label,
          zoneName: s.zone?.name ?? '',
        })),
    );
    setLoadingSlots(false);
  };

  const loadAvailableTables = async () => {
    setLoadingSlots(true);

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
    setLoadingSlots(false);
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

  const items = type === 'beach' ? sunbeds : tables;

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

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type */}
        <Text style={[styles.label, { color: theme.text }]}>Type</Text>
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

        {/* Nom de l'invité */}
        <Text style={[styles.label, { color: theme.text }]}>Nom de l'invité</Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          placeholder="Ex: Jean-Pierre"
          placeholderTextColor={theme.textSecondary}
          value={guestName}
          onChangeText={setGuestName}
        />

        {/* Date */}
        <Text style={[styles.label, { color: theme.text }]}>Date</Text>
        <DateSelector selectedDate={date} onSelect={setDate} />

        {/* Créneau restaurant */}
        {type === 'restaurant' && (
          <>
            <Text style={[styles.label, { color: theme.text }]}>Créneau</Text>
            <View style={styles.row}>
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
          </>
        )}

        {/* Personnes */}
        <Text style={[styles.label, { color: theme.text }]}>Personnes</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
            style={[styles.counterBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Ionicons name="remove" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.counterValue, { color: theme.text }]}>{guestCount}</Text>
          <TouchableOpacity
            onPress={() => setGuestCount(Math.min(10, guestCount + 1))}
            style={[styles.counterBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Ionicons name="add" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Sélection transat / table */}
        <Text style={[styles.label, { color: theme.text }]}>
          {type === 'beach' ? 'Transat' : 'Table'}
        </Text>

        {loadingSlots ? (
          <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 12 }} />
        ) : items.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Aucun {type === 'beach' ? 'transat' : 'table'} disponible
          </Text>
        ) : (
          <View style={styles.grid}>
            {type === 'beach'
              ? sunbeds.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSelectedId(s.id)}
                    style={[
                      styles.slotBtn,
                      {
                        backgroundColor: selectedId === s.id ? colors.terracotta : theme.card,
                        borderColor: selectedId === s.id ? colors.terracotta : theme.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.slotLabel, { color: selectedId === s.id ? colors.white : theme.text }]}>
                      {s.label}
                    </Text>
                    <Text style={[styles.slotSub, { color: selectedId === s.id ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
                      {s.zoneName}
                    </Text>
                  </TouchableOpacity>
                ))
              : tables.map((t) => (
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

        {/* Confirmer */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: selectedId
                ? (type === 'beach' ? colors.terracotta : colors.deepSea)
                : theme.cardBorder,
            },
          ]}
          onPress={handleSubmit}
          disabled={!selectedId || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.submitText}>Bloquer gratuitement</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { paddingVertical: 10 },
  label: { fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 8, paddingHorizontal: 20 },
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
  input: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20 },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: { fontSize: 20, fontWeight: '700', minWidth: 30, textAlign: 'center' },
  emptyText: { fontSize: 13, paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  slotBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 80,
  },
  slotLabel: { fontSize: 14, fontWeight: '700' },
  slotSub: { fontSize: 11, marginTop: 2 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
