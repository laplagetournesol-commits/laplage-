import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { i18n } from '@/shared/i18n';

export default function PrivacyScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: i18n.t('privacy'),
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

        <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Responsable du traitement</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Le responsable du traitement des données est Pitch Beach S.L., Sociedad Limitada, dont le siège social est situé à Playa de la Rada, Lote CH18, 29680 Estepona, Málaga, Espagne.{'\n'}Email : privacy@laplagetournesols.com
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Données collectées</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Nous collectons les données suivantes :{'\n\n'}
          Données de compte :{'\n'}
          • Nom, prénom et adresse email{'\n'}
          • Numéro de téléphone (optionnel){'\n'}
          • Identifiant Apple ou Google (si connexion via Apple Sign-In ou Google Sign-In){'\n\n'}
          Données d'utilisation :{'\n'}
          • Historique de réservations et transactions{'\n'}
          • Données de géolocalisation (uniquement pour la météo locale){'\n'}
          • Identifiant de notification push{'\n\n'}
          Données de paiement :{'\n'}
          Les informations bancaires (numéro de carte, date d'expiration) sont collectées et traitées exclusivement par Stripe, certifié PCI DSS. Les Tournesols ne stocke jamais vos données bancaires sur ses serveurs. Stripe traite les prépaiements (transats, chaises longues, tickets événements) et les pré-autorisations bancaires (empreintes de carte pour les réservations restaurant).
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Base légale du traitement</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Conformément au RGPD, vos données sont traitées sur les bases légales suivantes :{'\n'}
          • Exécution du contrat : gestion de votre compte, réservations et paiements{'\n'}
          • Consentement : envoi de notifications push et communications marketing{'\n'}
          • Intérêt légitime : amélioration de nos services et sécurité de l'Application
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>4. Finalité du traitement</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Vos données sont utilisées pour :{'\n'}
          • Créer et gérer votre compte utilisateur{'\n'}
          • Traiter vos réservations (transats, restaurant, événements){'\n'}
          • Effectuer et sécuriser les paiements et prépaiements via Stripe{'\n'}
          • Gérer les empreintes de carte bancaire (pré-autorisations restaurant){'\n'}
          • Envoyer des notifications relatives à vos réservations{'\n'}
          • Améliorer nos services
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>5. Partage des données</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Vos données ne sont jamais vendues. Elles sont partagées uniquement avec les sous-traitants suivants :{'\n'}
          • Supabase Inc. (hébergement sécurisé des données — serveurs UE){'\n'}
          • Stripe Inc. (traitement des paiements, certifié PCI DSS){'\n'}
          • Expo / React Native (notifications push){'\n'}
          • Apple / Google (authentification, si connexion via Sign-In)
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>6. Transferts internationaux</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Certains de nos sous-traitants (Stripe, Expo) sont établis aux États-Unis. Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne et le cadre EU-US Data Privacy Framework, garantissant un niveau de protection adéquat de vos données.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>7. Conservation</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          • Données de compte : conservées tant que votre compte est actif{'\n'}
          • Données de transactions : conservées 5 ans (obligations légales comptables){'\n'}
          • Données de géolocalisation : non conservées (traitement instantané){'\n\n'}
          Vous pouvez demander la suppression de votre compte et de vos données personnelles à tout moment (voir section 9).
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>8. Vos droits (RGPD)</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Conformément au RGPD, vous disposez des droits suivants :{'\n'}
          • Droit d'accès à vos données{'\n'}
          • Droit de rectification{'\n'}
          • Droit à l'effacement (« droit à l'oubli »){'\n'}
          • Droit à la portabilité{'\n'}
          • Droit d'opposition{'\n'}
          • Droit à la limitation du traitement{'\n'}
          • Droit de retirer votre consentement à tout moment{'\n\n'}
          Pour exercer ces droits, contactez-nous à : privacy@laplagetournesols.com{'\n'}
          Vous disposez également du droit d'introduire une réclamation auprès de l'AEPD (Agencia Española de Protección de Datos).
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>9. Suppression de compte</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Vous pouvez demander la suppression complète de votre compte et de toutes vos données personnelles en envoyant un email à privacy@laplagetournesols.com. La suppression sera effective dans un délai maximum de 30 jours.{'\n\n'}Les données soumises à des obligations légales de conservation (transactions financières) seront anonymisées et conservées pour la durée requise par la loi.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>10. Mineurs</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          L'Application n'est pas destinée aux personnes de moins de 18 ans. Nous ne collectons pas sciemment de données concernant des mineurs. Si nous apprenons que des données d'un mineur ont été collectées, elles seront supprimées dans les plus brefs délais.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>11. Sécurité</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement en transit (TLS), authentification sécurisée, accès restreint aux données, et hébergement sur des infrastructures certifiées.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>12. Cookies et traceurs</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          L'Application n'utilise pas de cookies. Des identifiants techniques sont utilisés pour maintenir votre session et assurer le bon fonctionnement du service.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>13. Modification de cette politique</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. En cas de modification substantielle, vous serez informé par notification dans l'Application. La date de dernière mise à jour est indiquée en haut de ce document.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>14. Contact DPO</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Pour toute question relative à la protection de vos données :{'\n'}
          Email : privacy@laplagetournesols.com{'\n'}
          Pitch Beach S.L., Playa de la Rada, Lote CH18, 29680 Estepona, Málaga, Espagne
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
