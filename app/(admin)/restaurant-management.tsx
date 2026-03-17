import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { supabase } from '@/shared/lib/supabase';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function RestaurantManagementScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  const [dinnerDays, setDinnerDays] = useState<number[]>([5, 6, 0]);
  const [dinnerExtraDates, setDinnerExtraDates] = useState<string[]>([]);
  const [maxTerrasse, setMaxTerrasse] = useState('40');
  const [maxInterieur, setMaxInterieur] = useState('30');
  const [lunchSlots, setLunchSlots] = useState<string[]>([]);
  const [dinnerSlots, setDinnerSlots] = useState<string[]>([]);
  const [lunchLabel, setLunchLabel] = useState('12h00 — 16h00');
  const [dinnerLabel, setDinnerLabel] = useState('19h00 — 23h30');
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newExtraDate, setNewExtraDate] = useState('');

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('restaurant_settings').select('key, value');
    if (data) {
      for (const row of data) {
        if (row.key === 'dinner_days') setDinnerDays(row.value as number[]);
        if (row.key === 'dinner_extra_dates') setDinnerExtraDates(row.value as string[]);
        if (row.key === 'max_covers_terrasse') setMaxTerrasse(String(row.value));
        if (row.key === 'max_covers_interieur') setMaxInterieur(String(row.value));
        if (row.key === 'lunch_slots') setLunchSlots(row.value as string[]);
        if (row.key === 'dinner_slots') setDinnerSlots(row.value as string[]);
        if (row.key === 'lunch_label') setLunchLabel(row.value as string);
        if (row.key === 'dinner_label') setDinnerLabel(row.value as string);
        if (row.key === 'require_deposit') setRequireDeposit(row.value as boolean);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const markChanged = () => setHasChanges(true);

  const toggleDinnerDay = (day: number) => {
    setDinnerDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
    markChanged();
  };

  const toggleSlot = (slot: string, type: 'lunch' | 'dinner') => {
    const setter = type === 'lunch' ? setLunchSlots : setDinnerSlots;
    setter((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot].sort()
    );
    markChanged();
  };

  const addExtraDate = () => {
    // Format attendu: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newExtraDate)) {
      Alert.alert('Format incorrect', 'Entrez une date au format AAAA-MM-JJ (ex: 2026-04-15)');
      return;
    }
    if (dinnerExtraDates.includes(newExtraDate)) {
      Alert.alert('Déjà ajouté', 'Cette date est déjà dans la liste');
      return;
    }
    setDinnerExtraDates((prev) => [...prev, newExtraDate].sort());
    setNewExtraDate('');
    markChanged();
  };

  const removeExtraDate = (date: string) => {
    setDinnerExtraDates((prev) => prev.filter((d) => d !== date));
    markChanged();
  };

  const saveAll = async () => {
    setSaving(true);
    const updates = [
      { key: 'dinner_days', value: dinnerDays },
      { key: 'dinner_extra_dates', value: dinnerExtraDates },
      { key: 'max_covers_terrasse', value: parseInt(maxTerrasse, 10) || 0 },
      { key: 'max_covers_interieur', value: parseInt(maxInterieur, 10) || 0 },
      { key: 'lunch_slots', value: lunchSlots },
      { key: 'dinner_slots', value: dinnerSlots },
      { key: 'lunch_label', value: lunchLabel },
      { key: 'dinner_label', value: dinnerLabel },
      { key: 'require_deposit', value: requireDeposit },
    ];

    for (const u of updates) {
      await supabase.from('restaurant_settings').update({ value: u.value }).eq('key', u.key);
    }

    setSaving(false);
    setHasChanges(false);
    Alert.alert('Enregistré', 'Les paramètres ont été mis à jour.');
  };

  const formatDateFR = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{
          title: 'Gestion Restaurant',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.deepSea} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Gestion Restaurant',
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ========== SERVICE DU SOIR ========== */}
        <Text style={[styles.title, { color: theme.text }]}>Service du soir</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Jours habituels du service du soir
        </Text>

        <Card style={styles.card}>
          <View style={styles.daysRow}>
            {DAY_LABELS.map((label, index) => {
              const isActive = dinnerDays.includes(index);
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => toggleDinnerDay(index)}
                  style={[
                    styles.dayBtn,
                    {
                      backgroundColor: isActive ? colors.deepSea : 'transparent',
                      borderWidth: isActive ? 0 : 1,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.dayText, { color: isActive ? '#fff' : theme.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ========== DATES EXCEPTIONNELLES ========== */}
        <Text style={[styles.subtitle, { color: theme.textSecondary, marginTop: 4 }]}>
          Dates exceptionnelles (ex: jour férié)
        </Text>

        <Card style={styles.card}>
          <View style={styles.extraDateInput}>
            <TextInput
              style={[styles.dateInput, { color: theme.text, borderColor: theme.cardBorder }]}
              value={newExtraDate}
              onChangeText={setNewExtraDate}
              placeholder="2026-04-15"
              placeholderTextColor={theme.textSecondary}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.deepSea }]}
              onPress={addExtraDate}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {dinnerExtraDates.length > 0 && (
            <View style={styles.extraDatesList}>
              {dinnerExtraDates.map((date) => (
                <View key={date} style={[styles.extraDateChip, { backgroundColor: colors.deepSea + '15', borderColor: colors.deepSea + '30' }]}>
                  <Text style={[styles.extraDateText, { color: colors.deepSea }]}>
                    {formatDateFR(date)}
                  </Text>
                  <TouchableOpacity onPress={() => removeExtraDate(date)}>
                    <Ionicons name="close-circle" size={18} color={colors.deepSea} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {dinnerExtraDates.length === 0 && (
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
              Aucune date exceptionnelle
            </Text>
          )}
        </Card>

        {/* ========== CAPACITÉ ========== */}
        <Text style={[styles.title, { color: theme.text }]}>Capacité maximale</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Nombre de couverts par zone
        </Text>

        <Card style={styles.card}>
          <View style={styles.capacityRow}>
            <View style={styles.capacityLabel}>
              <Ionicons name="sunny-outline" size={18} color={colors.sunYellow} />
              <Text style={[styles.capacityText, { color: theme.text }]}>Terrasse</Text>
            </View>
            <View style={styles.capacityInput}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
                value={maxTerrasse}
                onChangeText={(v) => { setMaxTerrasse(v); markChanged(); }}
                keyboardType="number-pad"
              />
              <Text style={[styles.coversLabel, { color: theme.textSecondary }]}>couverts</Text>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: theme.cardBorder }]} />

          <View style={styles.capacityRow}>
            <View style={styles.capacityLabel}>
              <Ionicons name="home-outline" size={18} color={colors.deepSea} />
              <Text style={[styles.capacityText, { color: theme.text }]}>Intérieur</Text>
            </View>
            <View style={styles.capacityInput}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.cardBorder }]}
                value={maxInterieur}
                onChangeText={(v) => { setMaxInterieur(v); markChanged(); }}
                keyboardType="number-pad"
              />
              <Text style={[styles.coversLabel, { color: theme.textSecondary }]}>couverts</Text>
            </View>
          </View>
        </Card>

        {/* ========== PRÉ-PAIEMENT ========== */}
        <Text style={[styles.title, { color: theme.text }]}>Prépaiement</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Empreinte carte bleue (30€/personne) exigée à la réservation
        </Text>

        <Card style={styles.card}>
          <View style={styles.capacityRow}>
            <View style={styles.capacityLabel}>
              <Ionicons name="card-outline" size={18} color={colors.sunYellow} />
              <Text style={[styles.capacityText, { color: theme.text }]}>Exiger le prépaiement</Text>
            </View>
            <Switch
              value={requireDeposit}
              onValueChange={(v) => { setRequireDeposit(v); markChanged(); }}
              trackColor={{ false: theme.cardBorder, true: colors.deepSea }}
              thumbColor="#fff"
            />
          </View>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
            {requireDeposit
              ? 'Activé — les clients doivent laisser une empreinte CB pour réserver'
              : 'Désactivé — réservation sans empreinte bancaire (basse saison)'}
          </Text>
        </Card>

        {/* ========== CRÉNEAUX MIDI ========== */}
        <Text style={[styles.title, { color: theme.text }]}>Créneaux midi</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Touchez pour activer/désactiver
        </Text>

        <Card style={styles.card}>
          <View style={styles.slotsGrid}>
            {['12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00'].map((slot) => {
              const isActive = lunchSlots.includes(slot);
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => toggleSlot(slot, 'lunch')}
                  style={[
                    styles.slotBtn,
                    {
                      backgroundColor: isActive ? colors.sunYellow + '20' : 'transparent',
                      borderColor: isActive ? colors.sunYellow : theme.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.slotText, { color: isActive ? colors.sunYellow : theme.textSecondary }]}>
                    {slot.replace(':', 'h')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ========== CRÉNEAUX SOIR ========== */}
        <Text style={[styles.title, { color: theme.text }]}>Créneaux soir</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Touchez pour activer/désactiver
        </Text>

        <Card style={styles.card}>
          <View style={styles.slotsGrid}>
            {['19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30'].map((slot) => {
              const isActive = dinnerSlots.includes(slot);
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => toggleSlot(slot, 'dinner')}
                  style={[
                    styles.slotBtn,
                    {
                      backgroundColor: isActive ? colors.deepSea + '20' : 'transparent',
                      borderColor: isActive ? colors.deepSea : theme.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.slotText, { color: isActive ? colors.deepSea : theme.textSecondary }]}>
                    {slot.replace(':', 'h')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      {/* ========== BOUTON SAVE ========== */}
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  card: { marginBottom: 20 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 12, fontWeight: '700' },
  extraDateInput: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  addBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  extraDatesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  extraDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  extraDateText: { fontSize: 13, fontWeight: '600' },
  emptyHint: { fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  capacityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  capacityLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  capacityText: { fontSize: 16, fontWeight: '600' },
  capacityInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: '700',
    width: 70,
    textAlign: 'center',
  },
  coversLabel: { fontSize: 12 },
  separator: { height: 1, marginVertical: 12 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  slotText: { fontSize: 14, fontWeight: '700' },
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
