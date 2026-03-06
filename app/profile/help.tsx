import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';

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

export default function HelpScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Aide & Contact',
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
        <Text style={[styles.heading, { color: theme.text }]}>Comment pouvons-nous vous aider ?</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Notre équipe est disponible pour répondre à toutes vos questions.
        </Text>

        <Card padded={false} style={{ marginTop: 20 }}>
          <ContactItem
            icon="call-outline"
            label="Téléphone"
            value="+34 952 000 000"
            onPress={() => Linking.openURL('tel:+34952000000')}
          />
          <ContactItem
            icon="mail-outline"
            label="Email"
            value="contact@laplageroyale.com"
            onPress={() => Linking.openURL('mailto:contact@laplageroyale.com')}
          />
          <ContactItem
            icon="logo-whatsapp"
            label="WhatsApp"
            value="+34 600 000 000"
            onPress={() => Linking.openURL('https://wa.me/34600000000')}
          />
          <ContactItem
            icon="logo-instagram"
            label="Instagram"
            value="@laplageroyale"
            onPress={() => Linking.openURL('https://instagram.com/laplageroyale')}
          />
        </Card>

        <Card style={{ marginTop: 20 }}>
          <View style={styles.infoBlock}>
            <Ionicons name="location-outline" size={20} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>Adresse</Text>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Paseo Marítimo, 29602 Marbella, Málaga, Espagne
              </Text>
            </View>
          </View>
          <View style={[styles.infoBlock, { marginTop: 12 }]}>
            <Ionicons name="time-outline" size={20} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: theme.text }]}>Horaires</Text>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Plage : 10h — 19h{'\n'}Restaurant : 12h — 16h / 19h30 — 23h30{'\n'}Ouvert tous les jours en saison
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
