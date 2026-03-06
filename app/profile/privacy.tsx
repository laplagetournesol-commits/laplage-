import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';

export default function PrivacyScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Confidentialité',
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={[styles.heading, { color: theme.text }]}>Politique de Confidentialité</Text>
        <Text style={[styles.updated, { color: theme.textSecondary }]}>Dernière mise à jour : Mars 2026</Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Données collectées</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Nous collectons les données suivantes lors de votre utilisation de l'Application :{'\n'}
          • Nom, prénom et adresse email{'\n'}
          • Numéro de téléphone (optionnel){'\n'}
          • Historique de réservations et transactions{'\n'}
          • Données de géolocalisation (uniquement pour la météo locale){'\n'}
          • Identifiant de notification push
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Finalité du traitement</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Vos données sont utilisées pour :{'\n'}
          • Gérer votre compte et vos réservations{'\n'}
          • Traiter les paiements via Stripe{'\n'}
          • Envoyer des notifications relatives à vos réservations{'\n'}
          • Gérer le programme de fidélité Beach Tokens{'\n'}
          • Améliorer nos services
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Partage des données</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Vos données ne sont jamais vendues. Elles sont partagées uniquement avec :{'\n'}
          • Supabase (hébergement sécurisé des données){'\n'}
          • Stripe (traitement des paiements, certifié PCI DSS){'\n'}
          • Expo (notifications push)
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>4. Conservation</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la suppression de votre compte et de toutes vos données à tout moment en nous contactant.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>5. Vos droits (RGPD)</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :{'\n'}
          • Droit d'accès à vos données{'\n'}
          • Droit de rectification{'\n'}
          • Droit à l'effacement{'\n'}
          • Droit à la portabilité{'\n'}
          • Droit d'opposition{'\n\n'}
          Pour exercer ces droits, contactez-nous à : privacy@laplageroyale.com
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>6. Sécurité</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement en transit (TLS), authentification sécurisée, accès restreint aux données.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>7. Cookies et traceurs</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          L'Application n'utilise pas de cookies. Des identifiants techniques sont utilisés pour maintenir votre session et assurer le bon fonctionnement du service.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>8. Contact DPO</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Pour toute question relative à la protection de vos données :{'\n'}
          Email : privacy@laplageroyale.com{'\n'}
          La Plage Royale S.L., Paseo Marítimo, 29602 Marbella, Espagne
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  heading: { fontSize: 20, fontWeight: '700' },
  updated: { fontSize: 12, marginTop: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22 },
});
