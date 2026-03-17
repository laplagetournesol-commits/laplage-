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

interface Field {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  multiline?: boolean;
}

const FIELDS: Field[] = [
  { key: 'contact_phone', label: 'Téléphone', icon: 'call-outline', placeholder: '+34 952 000 000' },
  { key: 'contact_phone_url', label: 'Lien téléphone', icon: 'link-outline', placeholder: 'tel:+34952000000' },
  { key: 'contact_email', label: 'Email', icon: 'mail-outline', placeholder: 'contact@example.com' },
  { key: 'contact_whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', placeholder: '+34 600 000 000' },
  { key: 'contact_whatsapp_url', label: 'Lien WhatsApp', icon: 'link-outline', placeholder: 'https://wa.me/34600000000' },
  { key: 'contact_instagram', label: 'Instagram', icon: 'logo-instagram', placeholder: '@moncompte' },
  { key: 'contact_instagram_url', label: 'Lien Instagram', icon: 'link-outline', placeholder: 'https://instagram.com/moncompte' },
  { key: 'contact_address', label: 'Adresse', icon: 'location-outline', placeholder: 'Rue, ville, pays', multiline: true },
  { key: 'contact_hours', label: 'Horaires', icon: 'time-outline', placeholder: 'Plage : 10h — 19h\nRestaurant : 12h — 16h', multiline: true },
];

export default function ContactManagementScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadData = useCallback(async () => {
    const { data } = await supabase
      .from('restaurant_settings')
      .select('key, value')
      .like('key', 'contact_%');

    const map: Record<string, string> = {};
    for (const row of (data ?? [])) {
      map[row.key] = row.value as string;
    }
    setValues(map);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateField = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setHasChanges(true);
  };

  const saveAll = async () => {
    setSaving(true);
    for (const [key, val] of Object.entries(values)) {
      const { data: existing } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('key', key)
        .single();

      if (existing) {
        await supabase.from('restaurant_settings').update({ value: val }).eq('key', key);
      } else {
        await supabase.from('restaurant_settings').insert({ key, value: val });
      }
    }
    setSaving(false);
    setHasChanges(false);
    Alert.alert('Enregistré', 'Les informations de contact ont été mises à jour.');
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Gestion Contact', headerShown: true, headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        )}} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.deepSea} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Gestion Contact', headerShown: true, headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
      )}} />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Aide & Contact</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Modifiez les informations affichées dans la page d'aide
        </Text>

        {FIELDS.map((field) => (
          <Card key={field.key} style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons name={field.icon} size={18} color={theme.accent} />
              <Text style={[styles.fieldLabel, { color: theme.text }]}>{field.label}</Text>
            </View>
            <TextInput
              style={[
                styles.fieldInput,
                field.multiline && styles.fieldMultiline,
                { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background },
              ]}
              value={values[field.key] ?? ''}
              onChangeText={(v) => updateField(field.key, v)}
              placeholder={field.placeholder}
              placeholderTextColor={theme.textSecondary}
              multiline={field.multiline}
              autoCapitalize="none"
            />
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  fieldCard: { marginBottom: 12 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '700' },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  fieldMultiline: { minHeight: 80, textAlignVertical: 'top' },
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
