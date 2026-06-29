import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { BeachMap } from '@/features/beach/components/BeachMap';
import { DateSelector } from '@/features/beach/components/DateSelector';
import { useSunbeds } from '@/features/beach/hooks/useBeachData';
import { supabase } from '@/shared/lib/supabase';
import { Modal } from '@/shared/ui/Modal';
import { formatLocalDate } from '@/shared/lib/date';
import type { Sunbed, BeachZone } from '@/shared/types';

interface SunbedInfo {
  label: string;
  free: boolean;
  name?: string;
  phone?: string | null;
  statusLabel?: string;
  guestCount?: number;
}

export default function BeachPlanScreen() {
  const { theme } = useSunMode();
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const { sunbeds, loading } = useSunbeds(date);
  const [info, setInfo] = useState<SunbedInfo | null>(null);

  const callPhone = (phone: string) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned) Linking.openURL(`tel:${cleaned}`).catch(() => {});
  };

  // Clic sur un transat réservé (rouge) -> qui l'occupe (modale = marche aussi sur le web)
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
      setInfo({ label: sunbed.label, free: false, name: 'Aucune réservation active trouvée' });
      return;
    }

    const { data: res } = await supabase
      .from('beach_reservations')
      .select('status, guest_count, guest_name, guest_phone, special_requests, profile:profiles(full_name, phone)')
      .eq('id', link.reservation_id)
      .maybeSingle();

    const r = res as any;
    setInfo({
      label: sunbed.label,
      free: false,
      name: r?.guest_name || r?.profile?.full_name || r?.special_requests || 'Client',
      phone: r?.guest_phone || r?.profile?.phone || null,
      statusLabel: r?.status === 'checked_in' ? 'Check-in fait' : 'Confirmé',
      guestCount: r?.guest_count ?? 1,
    });
  };

  const handleSelect = (sunbed: Sunbed & { zone: BeachZone }) => {
    setInfo({ label: sunbed.label, free: true });
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

      <Modal visible={!!info} onClose={() => setInfo(null)} title={info ? `Transat ${info.label}` : ''}>
        {info && (
          info.free ? (
            <Text style={[styles.modalText, { color: theme.text }]}>Libre ✅</Text>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={styles.row}>
                <Ionicons name="person-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.modalText, { color: theme.text }]}>{info.name}</Text>
              </View>
              {info.statusLabel && (
                <View style={styles.row}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.textSecondary} />
                  <Text style={[styles.modalText, { color: theme.text }]}>{info.statusLabel} · {info.guestCount} pers.</Text>
                </View>
              )}
              {info.phone && (
                <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.sage }]} onPress={() => callPhone(info.phone!)}>
                  <Ionicons name="call" size={18} color={colors.white} />
                  <Text style={styles.callText}>Appeler {info.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  hintText: { fontSize: 12, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalText: { fontSize: 16 },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, marginTop: 6 },
  callText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
