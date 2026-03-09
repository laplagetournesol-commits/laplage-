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
          Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile La Plage Royale (ci-après "l'Application"), éditée par La Plage Royale S.L., établie à Marbella, Espagne.{'\n\n'}En créant un compte ou en utilisant l'Application, vous acceptez sans réserve les présentes CGU.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Inscription et compte</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          L'utilisation de l'Application nécessite la création d'un compte via email, Apple Sign-In ou Google Sign-In. L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants. Toute activité réalisée depuis son compte est sous sa responsabilité.{'\n\n'}L'utilisateur doit être âgé d'au moins 18 ans pour créer un compte et effectuer des réservations ou achats.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Réservations</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          L'Application permet de réserver des transats (plage) et des tables (restaurant).{'\n\n'}Transats : le paiement intégral est effectué au moment de la réservation. Les réservations sont non remboursables en cas de non-présentation (no-show).{'\n\n'}Restaurant : une empreinte de carte bancaire de 30 € par convive est requise lors de la réservation. Cette empreinte est débitée uniquement en cas de non-présentation. En cas de présence, aucun montant n'est prélevé au titre de l'empreinte.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>4. Modification et annulation des réservations</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Les réservations (transats et tables) sont modifiables jusqu'à 24 heures avant la date prévue. Passé ce délai, aucune modification ne pourra être effectuée.{'\n\n'}La modification permet de changer la date, l'emplacement ou le nombre de personnes, sous réserve de disponibilité. Le montant sera recalculé en fonction des modifications apportées.{'\n\n'}Les réservations ne sont pas annulables. Aucun remboursement ne sera accordé en cas de non-présentation (no-show).
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>5. Événements</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Les tickets d'événements sont nominatifs et non transférables. Le paiement intégral est requis au moment de l'achat.{'\n\n'}La Plage Royale se réserve le droit d'annuler ou de modifier un événement. En cas d'annulation par l'organisateur, un remboursement intégral sera effectué dans un délai de 14 jours sur le moyen de paiement utilisé lors de l'achat.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>6. Paiements et prépaiements</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Tous les paiements sont traités de manière sécurisée par Stripe, prestataire certifié PCI DSS. La Plage Royale ne stocke aucune donnée bancaire.{'\n\n'}Les prix sont affichés en euros (€) et incluent les taxes applicables. Le paiement est exigé au moment de la réservation ou de l'achat (prépaiement). En validant un paiement, l'utilisateur autorise le prélèvement du montant indiqué.{'\n\n'}Les empreintes de carte bancaire (restaurant) constituent une pré-autorisation. Le montant n'est débité qu'en cas de non-présentation, conformément aux conditions indiquées lors de la réservation.{'\n\n'}Aucune transaction n'est traitée via Apple In-App Purchase. L'ensemble des paiements concerne des biens et services physiques fournis par La Plage Royale.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>7. Suppression de compte</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          L'utilisateur peut demander la suppression de son compte et de l'ensemble de ses données personnelles à tout moment en contactant privacy@laplageroyale.com. La suppression sera effective dans un délai de 30 jours suivant la demande.{'\n\n'}La suppression du compte entraîne l'annulation de toute réservation future non encore consommée, sans droit à remboursement pour les réservations déjà payées.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>8. Propriété intellectuelle</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          L'ensemble des contenus de l'Application (textes, images, logos, design) sont protégés par le droit de la propriété intellectuelle et appartiennent à La Plage Royale S.L. Toute reproduction est interdite sans autorisation préalable.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>9. Responsabilité</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          La Plage Royale ne saurait être tenue responsable des dommages indirects liés à l'utilisation de l'Application. Le service est fourni "en l'état" sans garantie d'accessibilité permanente.{'\n\n'}La Plage Royale ne pourra être tenue responsable en cas d'indisponibilité temporaire de l'Application due à des opérations de maintenance, des mises à jour ou des circonstances de force majeure.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>10. Modification des CGU</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          La Plage Royale se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications par notification dans l'Application. La poursuite de l'utilisation de l'Application après notification vaut acceptation des nouvelles CGU.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>11. Droit applicable</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Les présentes CGU sont régies par le droit espagnol. Conformément à la réglementation européenne, l'utilisateur peut recourir à la plateforme de résolution des litiges en ligne de la Commission européenne. Tout litige sera soumis aux tribunaux compétents de Málaga, Espagne.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>12. Contact</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Pour toute question relative aux présentes CGU :{'\n'}Email : contact@laplageroyale.com{'\n'}La Plage Royale S.L., Paseo Marítimo, 29602 Marbella, Espagne
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
