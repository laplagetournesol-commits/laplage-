import React, { useState, useEffect, useCallback } from 'react';
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
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { supabase } from '@/shared/lib/supabase';

interface BeachZone {
  id: string;
  name: string;
  zone_type: string;
  base_price: number;
}

interface SeasonalPrice {
  id: string;
  pricing_category: string;
  start_date: string;
  end_date: string;
  label: string;
  fixed_price: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  transat: 'Transat',
  chaise_longue: 'Chaise longue',
  transat_front_row: 'Transat 1ère rangée',
  bed: 'Bed / VIP',
};

export default function PricingManagementScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [zones, setZones] = useState<BeachZone[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadData = useCallback(async () => {
    const [zonesRes, seasonalRes] = await Promise.all([
      supabase.from('beach_zones').select('id, name, zone_type, base_price').eq('is_active', true).order('name'),
      supabase.from('seasonal_pricing').select('*').order('start_date').order('pricing_category'),
    ]);
    setZones((zonesRes.data ?? []) as BeachZone[]);
    setSeasonal((seasonalRes.data ?? []) as SeasonalPrice[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateBasePrice = (zoneId: string, price: string) => {
    setZones((prev) => prev.map((z) => z.id === zoneId ? { ...z, base_price: parseFloat(price) || 0 } : z));
    setHasChanges(true);
  };

  const updateSeasonalPrice = (id: string, price: string) => {
    setSeasonal((prev) => prev.map((s) => s.id === id ? { ...s, fixed_price: parseFloat(price) || 0 } : s));
    setHasChanges(true);
  };

  const saveAll = async () => {
    setSaving(true);
    for (const z of zones) {
      await supabase.from('beach_zones').update({ base_price: z.base_price }).eq('id', z.id);
    }
    for (const s of seasonal) {
      await supabase.from('seasonal_pricing').update({ fixed_price: s.fixed_price }).eq('id', s.id);
    }
    setSaving(false);
    setHasChanges(false);
    Alert.alert('Enregistré', 'Les tarifs ont été mis à jour.');
  };

  // Regrouper les prix saisonniers par saison
  const seasons = seasonal.reduce<Record<string, SeasonalPrice[]>>((acc, s) => {
    const key = `${s.label} (${formatDateShort(s.start_date)} — ${formatDateShort(s.end_date)})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Gestion Tarifs', headerShown: true, headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        )}} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.deepSea} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Gestion Tarifs', headerShown: true, headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
      )}} />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
        {/* Prix de base */}
        <Text style={[styles.title, { color: theme.text }]}>Prix de base</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Prix par défaut (hors saison)
        </Text>

        <Card style={styles.card}>
          {zones.map((zone, i) => (
            <View key={zone.id}>
              {i > 0 && <View style={[styles.separator, { backgroundColor: theme.cardBorder }]} />}
              <View style={styles.priceRow}>
                <View style={styles.priceLabel}>
                  <Ionicons
                    name={zone.zone_type === 'chaise_longue' ? 'sunny-outline' : 'umbrella-outline'}
                    size={18}
                    color={colors.deepSea}
                  />
                  <Text style={[styles.priceName, { color: theme.text }]}>{zone.name}</Text>
                </View>
                <View style={styles.priceInput}>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
                    value={String(zone.base_price)}
                    onChangeText={(v) => updateBasePrice(zone.id, v)}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[styles.euro, { color: theme.textSecondary }]}>€</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>

        {/* Prix saisonniers */}
        <Text style={[styles.title, { color: theme.text }]}>Prix saisonniers</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Ces prix remplacent le prix de base pendant la période
        </Text>

        {Object.entries(seasons).map(([seasonLabel, prices]) => (
          <Card key={seasonLabel} style={styles.card}>
            <Text style={[styles.seasonTitle, { color: theme.accent }]}>{seasonLabel}</Text>
            {prices.map((s, i) => (
              <View key={s.id}>
                {i > 0 && <View style={[styles.separator, { backgroundColor: theme.cardBorder }]} />}
                <View style={styles.priceRow}>
                  <Text style={[styles.categoryName, { color: theme.text }]}>
                    {CATEGORY_LABELS[s.pricing_category] ?? s.pricing_category}
                  </Text>
                  <View style={styles.priceInput}>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
                      value={String(s.fixed_price)}
                      onChangeText={(v) => updateSeasonalPrice(s.id, v)}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[styles.euro, { color: theme.textSecondary }]}>€</Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.background, borderTopColor: theme.cardBorder }]}>
        <Button
          title={saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          onPress={saveAll}
          disabled={!hasChanges || saving}
          loading={saving}
          size="lg"
        />
      </View>
    </View>
  );
}

function formatDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  card: { marginBottom: 20 },
  separator: { height: 1, marginVertical: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceName: { fontSize: 16, fontWeight: '600' },
  categoryName: { fontSize: 14, fontWeight: '600' },
  priceInput: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: '700',
    width: 80,
    textAlign: 'center',
  },
  euro: { fontSize: 16, fontWeight: '700' },
  seasonTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
