import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { supabase } from '@/shared/lib/supabase';
import { i18n } from '@/shared/i18n';

function ContactItem({ icon, label, value, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const { theme } = useSunMode();
  return (
    <TouchableOpacity style={styles.contactItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.contactIcon, { backgroundColor: theme.accent + '15' }]}>
        <Ionicons name={icon} size={20} color={theme.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.contactLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.contactValue, { color: theme.text }]}>{value}</Text>
      </View>
      <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

// Fallback values
const DEFAULTS: Record<string, string> = {
  contact_phone: '+34 952 000 000',
  contact_phone_url: 'tel:+34952000000',
  contact_email: 'contact@laplageroyale.com',
  contact_whatsapp: '+34 600 000 000',
  contact_whatsapp_url: 'https://wa.me/34600000000',
  contact_instagram: '@laplageroyale',
  contact_instagram_url: 'https://instagram.com/laplageroyale',
  contact_address: 'Paseo Marítimo, 29602 Marbella, Málaga, Espagne',
  contact_hours: 'Plage : 10h — 19h\nRestaurant : 12h — 16h / 19h — 23h30\nOuvert tous les jours en saison',
};

export default function HelpScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [config, setConfig] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('restaurant_settings')
        .select('key, value')
        .like('key', 'contact_%');

      if (data) {
        const merged = { ...DEFAULTS };
        for (const row of data) {
          merged[row.key] = row.value as string;
        }
        setConfig(merged);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{
          title: i18n.t('helpAndContact'),
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }} />
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: i18n.t('helpAndContact'),
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={[styles.heading, { color: theme.text }]}>{i18n.t('helpTitle')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {i18n.t('helpSubtitle')}
        </Text>

        <Card padded={false} style={{ marginTop: 20 }}>
          <ContactItem
            icon="call-outline"
            label={i18n.t('phone')}
            value={config.contact_phone}
            onPress={() => Linking.openURL(config.contact_phone_url)}
          />
          <ContactItem
            icon="mail-outline"
            label="Email"
            value={config.contact_email}
            onPress={() => Linking.openURL(`mailto:${config.contact_email}`)}
          />
          <ContactItem
            icon="logo-whatsapp"
            label="WhatsApp"
            value={config.contact_whatsapp}
            onPress={() => Linking.openURL(config.contact_whatsapp_url)}
          />
          <ContactItem
            icon="logo-instagram"
            label="Instagram"
            value={config.contact_instagram}
            onPress={() => Linking.openURL(config.contact_instagram_url)}
          />
        </Card>

        <Card style={{ marginTop: 20 }}>
          <View style={styles.infoBlock}>
            <Ionicons name="location-outline" size={20} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>{i18n.t('address')}</Text>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                {config.contact_address}
              </Text>
            </View>
          </View>
          <View style={[styles.infoBlock, { marginTop: 12 }]}>
            <Ionicons name="time-outline" size={20} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>{i18n.t('hours')}</Text>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                {config.contact_hours}
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  contactIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 11 },
  contactValue: { fontSize: 15, fontWeight: '600', marginTop: 1 },
  infoBlock: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoText: { fontSize: 13, marginTop: 2, lineHeight: 19 },
});
