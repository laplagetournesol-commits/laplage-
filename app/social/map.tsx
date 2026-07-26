import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BeachMap } from '@/features/beach/components/BeachMap';
import { supabase } from '@/shared/lib/supabase';
import { useSunMode } from '@/shared/theme';
import { i18n } from '@/shared/i18n';

const ACCENT = '#E8730C';

/** Plan de la plage en consultation, avec le transat d'une personne surligné. */
export default function SocialMapScreen() {
  const { theme } = useSunMode();
  const { transat } = useLocalSearchParams<{ transat?: string }>();
  const target = typeof transat === 'string' ? transat.trim() : '';
  const [sunbeds, setSunbeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('sunbeds').select('*').eq('is_active', true);
      setSunbeds((data ?? []).map((s) => ({ ...s, zone: {}, isReserved: false })));
      setLoading(false);
    })();
  }, []);

  const targetIds = new Set(sunbeds.filter((s) => String(s.label) === target).map((s) => s.id));

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: target ? `${i18n.t('sunbed') ?? 'Transat'} ${target}` : (i18n.t('beachMapTitle') ?? 'Plan de la plage'),
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/social'))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      {target ? (
        <View style={[styles.hint, { backgroundColor: ACCENT + '18' }]}>
          <Ionicons name="location" size={16} color={ACCENT} />
          <Text style={[styles.hintTxt, { color: theme.text }]}>
            {`${i18n.t('sunbed') ?? 'Transat'} ${target} — ${i18n.t('socialHighlighted') ?? 'surligné en jaune'}`}
          </Text>
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={ACCENT} />
      ) : (
        <BeachMap sunbeds={sunbeds} selectedId={null} selectedIds={targetIds} onSelect={() => {}} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12 },
  hintTxt: { fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
});
