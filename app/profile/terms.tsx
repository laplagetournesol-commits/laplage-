import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';

export default function TermsScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Conditions Générales',
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
        <Text style={[styles.heading, { color: theme.text }]}>Conditions Générales d'Utilisation</Text>
        <Text style={[styles.updated, { color: theme.textSecondary }]}>Dernière mise à jour : Mars 2026</Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Objet</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile La Plage Royale (ci-après "l'Application"), éditée par La Plage Royale S.L., établie à Marbella, Espagne.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Inscription et compte</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          L'utilisation de l'Application nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants. Toute activité réalisée depuis son compte est sous sa responsabilité.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Réservations</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Les réservations de transats sont payables intégralement à la réservation et non remboursables en cas de no-show. Les réservations de tables restaurant nécessitent un acompte de 30% du minimum de consommation, déductible de l'addition finale. En cas de no-show, l'acompte n'est pas remboursé.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>3bis. Modification des réservations</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Les réservations (transats et tables) sont modifiables jusqu'à 24 heures avant la date de la réservation. Passé ce délai, aucune modification ne pourra être effectuée.{'\n\n'}La modification permet de changer la date, l'emplacement ou le nombre de personnes, sous réserve de disponibilité. Le montant de la réservation sera recalculé en fonction des modifications apportées.{'\n\n'}Les réservations ne sont pas annulables. Aucun remboursement ne sera accordé en cas de non-présentation (no-show).
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>4. Beach Tokens</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Les Beach Tokens sont des points de fidélité sans valeur monétaire. Ils peuvent être échangés contre des récompenses dans l'Application. La Plage Royale se réserve le droit de modifier le programme de fidélité à tout moment.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>5. Événements</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Les tickets d'événements sont nominatifs et non transférables. La Plage Royale se réserve le droit d'annuler ou de modifier un événement. En cas d'annulation par l'organisateur, un remboursement intégral sera effectué.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>6. Propriété intellectuelle</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          L'ensemble des contenus de l'Application (textes, images, logos, design) sont protégés par le droit de la propriété intellectuelle et appartiennent à La Plage Royale S.L. Toute reproduction est interdite sans autorisation préalable.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>7. Responsabilité</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          La Plage Royale ne saurait être tenue responsable des dommages indirects liés à l'utilisation de l'Application. Le service est fourni "en l'état" sans garantie d'accessibilité permanente.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>8. Droit applicable</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Les présentes CGU sont régies par le droit espagnol. Tout litige sera soumis aux tribunaux compétents de Málaga, Espagne.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>9. Contact</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Pour toute question relative aux présentes CGU, veuillez nous contacter à contact@laplageroyale.com.
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
