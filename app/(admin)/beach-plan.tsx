import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Linking, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { BeachMap } from '@/features/beach/components/BeachMap';
import { DateSelector } from '@/features/beach/components/DateSelector';
import { useSunbeds } from '@/features/beach/hooks/useBeachData';
import { supabase } from '@/shared/lib/supabase';
import { formatLocalDate } from '@/shared/lib/date';
import type { Sunbed, BeachZone } from '@/shared/types';

export default function BeachPlanScreen() {
  const { theme } = useSunMode();
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const { sunbeds, loading } = useSunbeds(date);

  const callPhone = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned) Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  // Clic sur un transat réservé (rouge) -> qui l'occupe
  const handleReservedPress = async (
    sunbed: Sunbed & { zone: BeachZone } & { isReserved: boolean },
  ) => {
    const { data: link } = await supabase
      .from('beach_reservation_sunbeds')
      .select('reservation_id')
      .eq('sunbed_id', sunbed.id)
      .eq('date', date)
      .in('status', ['confirmed', 'checked_in'])
      .maybeSingle();

    if (!link) {
      Alert.alert(`Transat ${sunbed.label}`, 'Aucune réservation active trouvée.');
      return;
    }

    const { data: res } = await supabase
      .from('beach_reservations')
      .select('status, guest_count, guest_name, guest_phone, special_requests, profile:profiles(full_name, phone)')
      .eq('id', link.reservation_id)
      .maybeSingle();

    if (!res) {
      Alert.alert(`Transat ${sunbed.label}`, 'Réservation introuvable.');
      return;
    }

    const r = res as any;
    const name = r.guest_name || r.profile?.full_name || r.special_requests || 'Client';
    const phone = r.guest_phone || r.profile?.phone || null;
    const statusLabel = r.status === 'checked_in' ? 'Check-in fait' : 'Confirmé';

    const buttons: any[] = [{ text: 'Fermer', style: 'cancel' }];
    if (phone) {
      buttons.unshift({ text: `Appeler ${phone}`, onPress: () => callPhone(phone) });
    }

    Alert.alert(
      `Transat ${sunbed.label}`,
      `Réservé par : ${name}\nStatut : ${statusLabel}\n${r.guest_count ?? 1} pers.${phone ? `\nTél : ${phone}` : ''}`,
      buttons,
    );
  };

  // Clic sur un transat libre (lecture seule)
  const handleSelect = (sunbed: Sunbed & { zone: BeachZone }) => {
    Alert.alert(`Transat ${sunbed.label}`, 'Libre ✅');
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Plan plage',
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      <DateSelector selectedDate={date} onSelect={setDate} />

      <View style={[styles.hint, { borderColor: theme.cardBorder }]}>
        <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
        <Text style={[styles.hintText, { color: theme.textSecondary }]}>
          Touchez un transat rouge pour voir qui l'a réservé.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <BeachMap
          sunbeds={sunbeds}
          selectedId={null}
          selectedIds={new Set()}
          onSelect={handleSelect}
          onReservedPress={handleReservedPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  hintText: { fontSize: 12, flex: 1 },
});
