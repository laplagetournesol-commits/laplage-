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
import { TimeSelector } from '@/features/restaurant/components/TimeSelector';
import { supabase } from '@/shared/lib/supabase';
import { formatLocalDate } from '@/shared/lib/date';
import type { Sunbed, BeachZone } from '@/shared/types';

type BookingType = 'beach' | 'restaurant';

export default function AdminBookingScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<BookingType>('beach');
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [time, setTime] = useState('12:00');
  const timeSlot: 'lunch' | 'dinner' = parseInt(time.split(':')[0]) < 18 ? 'lunch' : 'dinner';
  // Restaurant : sélection unique
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Plage : sélection multiple de transats
  const [selectedSunbedIds, setSelectedSunbedIds] = useState<Set<string>>(new Set());

  // Beach: réutilise le même hook + carte que les clients
  const { sunbeds, loading: beachLoading } = useSunbeds(date);

  const [submitting, setSubmitting] = useState(false);

  // Reset sélection quand on change de type ou date
  useEffect(() => {
    setSelectedId(null);
    setSelectedSunbedIds(new Set());
  }, [date, type, time]);

  const handleSelectSunbed = (sunbed: Sunbed & { zone: BeachZone } & { isReserved: boolean }) => {
    if (sunbed.isReserved) return;
    setSelectedSunbedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sunbed.id)) {
        next.delete(sunbed.id);
      } else {
        next.add(sunbed.id);
      }
      return next;
    });
  };

  const handleReservedPress = async (sunbed: Sunbed & { zone: BeachZone } & { isReserved: boolean }) => {
    // Trouver la liaison active pour ce transat
    const { data: link } = await supabase
      .from('beach_reservation_sunbeds')
      .select('reservation_id')
      .eq('sunbed_id', sunbed.id)
      .eq('date', date)
      .in('status', ['confirmed', 'checked_in'])
      .maybeSingle();

    if (!link) {
      Alert.alert('Erreur', 'Aucune réservation trouvée pour ce transat');
      return;
    }

    const { data: res } = await supabase
      .from('beach_reservations')
      .select('id, status, guest_count, guest_name, guest_phone, special_requests, profile:profiles(full_name)')
      .eq('id', link.reservation_id)
      .maybeSingle();

    if (!res) {
      Alert.alert('Erreur', 'Réservation introuvable');
      return;
    }

    const clientName = (res as any).guest_name || (res as any).profile?.full_name || res.special_requests || 'Client';
    const statusLabel = res.status === 'checked_in' ? 'check-in fait' : 'confirmé';

    Alert.alert(
      `Transat ${sunbed.label}`,
      `Réservé par ${clientName}\nStatut : ${statusLabel}\n${res.guest_count} pers.`,
      [
        { text: 'Fermer', style: 'cancel' },
        {
          text: 'Libérer la réservation',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('beach_reservations')
              .update({ status: 'completed' })
              .eq('id', res.id);
            await supabase
              .from('beach_reservation_sunbeds')
              .update({ status: 'completed' })
              .eq('reservation_id', res.id);
            Alert.alert('Réservation libérée', `Tous les transats associés sont libres.`);
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    const sunbedIds = Array.from(selectedSunbedIds);
    if (type === 'beach' && sunbedIds.length === 0) {
      Alert.alert('Erreur', 'Sélectionnez au moins un transat');
      return;
    }

    const name = guestName.trim();
    const phone = guestPhone.trim();
    const email = guestEmail.trim();

    if (!name) {
      Alert.alert('Erreur', "Nom de l'invité requis");
      return;
    }
    if (!phone) {
      Alert.alert('Erreur', "Numéro de téléphone requis");
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const guestFields = {
        guest_name: name,
        guest_phone: phone,
        guest_email: email || null,
      };

      if (type === 'beach') {
        // Une seule réservation avec N transats liés via la table de liaison
        const { data: newRes, error: resError } = await supabase
          .from('beach_reservations')
          .insert({
            user_id: user.id,
            sunbed_id: sunbedIds[0],
            secondary_sunbed_id: null,
            date,
            status: 'confirmed',
            total_price: 0,
            deposit_amount: 0,
            deposit_paid: true,
            guest_count: guestCount,
            special_requests: 'Réservation admin',
            ...guestFields,
          })
          .select()
          .single();
        if (resError) throw new Error(resError.message);

        const linkRows = sunbedIds.map((id) => ({
          reservation_id: newRes.id,
          sunbed_id: id,
          date,
          status: 'confirmed',
        }));
        const { error: linkError } = await supabase
          .from('beach_reservation_sunbeds')
          .insert(linkRows);
        if (linkError) {
          await supabase.from('beach_reservations').delete().eq('id', newRes.id);
          throw new Error(linkError.message);
        }
      } else {
        const { error } = await supabase.from('restaurant_reservations').insert({
          user_id: user.id,
          table_id: null,
          date,
          time,
          time_slot: timeSlot,
          status: 'confirmed',
          deposit_amount: 0,
          deposit_paid: true,
          guest_count: guestCount,
          special_requests: 'Réservation admin',
          ...guestFields,
        });
        if (error) throw new Error(error.message);
      }

      const summary = type === 'beach'
        ? `${sunbedIds.length} transat${sunbedIds.length > 1 ? 's' : ''} bloqué${sunbedIds.length > 1 ? 's' : ''} pour ${name}`
        : `Réservation pour ${guestCount} pers. — ${name}`;

      Alert.alert(
        'Réservation créée',
        summary,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >

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
              onPress={() => setGuestCount(Math.min(99, guestCount + 1))}
              style={[styles.counterBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Ionicons name="add" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 8 }]}
          placeholder="Téléphone"
          placeholderTextColor={theme.textSecondary}
          value={guestPhone}
          onChangeText={setGuestPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />

        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 8 }]}
          placeholder="Email (optionnel)"
          placeholderTextColor={theme.textSecondary}
          value={guestEmail}
          onChangeText={setGuestEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        {/* Date */}
        <DateSelector selectedDate={date} onSelect={setDate} />

        {/* Heure de réservation restaurant */}
        {type === 'restaurant' && (
          <TimeSelector selectedTime={time} selectedDate={date} onSelect={setTime} />
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
              selectedId={null}
              selectedIds={selectedSunbedIds}
              onSelect={handleSelectSunbed}
              onReservedPress={handleReservedPress}
            />
          )}
        </View>
      )}

      {/* Restaurant : pas de sélection de table — la salle attribue sur place */}
      {type === 'restaurant' && (
        <View style={[styles.restaurantInfo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="information-circle-outline" size={18} color={theme.accent} />
          <Text style={[styles.restaurantInfoText, { color: theme.text }]}>
            La table sera attribuée à l'arrivée par la salle.
          </Text>
        </View>
      )}

      </ScrollView>

      {/* Bouton confirmer — fixé en bas */}
      {((type === 'beach' && selectedSunbedIds.size > 0) || type === 'restaurant') && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background }]}>
          {type === 'beach' && (
            <Text style={[styles.selectedLabel, { color: theme.text }]}>
              {(() => {
                const labels = sunbeds
                  .filter((sb) => selectedSunbedIds.has(sb.id))
                  .map((sb) => sb.label)
                  .join(', ');
                return `${selectedSunbedIds.size} transat${selectedSunbedIds.size > 1 ? 's' : ''} : ${labels}`;
              })()}
            </Text>
          )}
          {type === 'restaurant' && (
            <Text style={[styles.selectedLabel, { color: theme.text }]}>
              {guestCount} pers. — {time.replace(':', 'h')}
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
                  {type === 'beach' && selectedSunbedIds.size > 1
                    ? `Bloquer ${selectedSunbedIds.size} transats`
                    : 'Bloquer gratuitement'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  restaurantInfoText: { flex: 1, fontSize: 13, fontWeight: '500' },
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
