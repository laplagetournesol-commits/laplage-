import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import type { SunPeriod } from '@/shared/theme/colors';

const VIP_COLORS = {
  standard: colors.gray[400],
  silver: '#A0A0A0',
  gold: '#D4A518',
  platinum: '#6C7A89',
};

function MenuItem({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const { theme } = useSunMode();
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: theme.accent + '15' }]}>
        <Ionicons name={icon} size={18} color={theme.accent} />
      </View>
      <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={[styles.menuValue, { color: theme.textSecondary }]}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { theme, period, override, isOverridden } = useSunMode();
  const { user, profile, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const cycleSunMode = () => {
    const modes: (SunPeriod | null)[] = ['morning', 'day', 'sunset', 'night', null];
    const currentIndex = isOverridden ? modes.indexOf(period) : modes.length - 1;
    const next = modes[(currentIndex + 1) % modes.length];
    override(next);
  };

  // Écran non connecté
  if (!user) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={[styles.centeredContent, { paddingTop: insets.top + 60 }]}>
          <View style={[styles.bigAvatar, { backgroundColor: colors.sunYellowLight }]}>
            <Ionicons name="person" size={48} color={colors.sunYellow} />
          </View>
          <Text style={[styles.noAuthTitle, { color: theme.text }]}>
            Mon Profil
          </Text>
          <Text style={[styles.noAuthText, { color: theme.textSecondary }]}>
            Connectez-vous pour accéder à vos réservations, tokens et plus encore.
          </Text>
          <Button
            title="Se connecter"
            onPress={() => router.push('/(auth)/login')}
            size="lg"
            style={{ width: '100%', marginTop: 16 }}
          />
          <Button
            title="Créer un compte"
            onPress={() => router.push('/(auth)/signup')}
            size="lg"
            variant="outline"
            style={{ width: '100%', marginTop: 8 }}
          />

          {/* Sun Mode debug */}
          <TouchableOpacity style={styles.sunDebug} onPress={cycleSunMode}>
            <Ionicons name="sunny" size={16} color={theme.accent} />
            <Text style={[styles.sunDebugText, { color: theme.textSecondary }]}>
              Sun Mode : {isOverridden ? period : 'auto'} (tap pour changer)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const vipLevel = profile?.vip_level ?? 'standard';

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={[styles.profileHeader, { paddingTop: insets.top + 16 }]}>
          <View style={[styles.avatar, { backgroundColor: colors.sunYellow }]}>
            <Text style={styles.avatarText}>
              {(profile?.full_name ?? '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.profileName, { color: theme.text }]}>
            {profile?.full_name ?? 'Utilisateur'}
          </Text>
          <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
            {user.email}
          </Text>
          <View style={styles.badgeRow}>
            <Badge
              label={vipLevel.toUpperCase()}
              variant="vip"
              size="sm"
            />
            <Badge
              label={`${profile?.beach_tokens ?? 0} tokens`}
              variant="default"
              size="sm"
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Card>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {profile?.visit_count ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Visites</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.cardBorder }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {profile?.beach_tokens ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Tokens</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.cardBorder }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {profile?.total_spent ? `${profile.total_spent}€` : '0€'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Dépensé</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Card padded={false}>
            <MenuItem icon="receipt-outline" label="Mes réservations" />
            <MenuItem icon="ticket-outline" label="Mes tickets" />
            <MenuItem icon="diamond-outline" label="Beach Tokens" value={`${profile?.beach_tokens ?? 0}`} />
            <MenuItem icon="gift-outline" label="Récompenses" />
          </Card>
        </View>

        <View style={styles.section}>
          <Card padded={false}>
            <MenuItem icon="person-outline" label="Informations personnelles" />
            <MenuItem icon="notifications-outline" label="Notifications" />
            <MenuItem icon="language-outline" label="Langue" value={profile?.preferred_language?.toUpperCase() ?? 'FR'} />
            <MenuItem
              icon="sunny-outline"
              label="Sun Mode"
              value={isOverridden ? period : 'Auto'}
              onPress={cycleSunMode}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Card padded={false}>
            <MenuItem icon="help-circle-outline" label="Aide & Contact" />
            <MenuItem icon="document-text-outline" label="CGU" />
            <MenuItem icon="shield-checkmark-outline" label="Confidentialité" />
          </Card>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <Button
            title="Se déconnecter"
            onPress={handleSignOut}
            variant="ghost"
            textStyle={{ color: colors.accentRed }}
          />
        </View>

        <Text style={[styles.version, { color: theme.textSecondary }]}>
          Les Tournesols v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centeredContent: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  bigAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noAuthTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  noAuthText: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  sunDebug: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 40,
    padding: 12,
    borderRadius: 12,
  },
  sunDebugText: { fontSize: 12 },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.black,
  },
  profileName: { fontSize: 22, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 4 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 32 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuValue: { fontSize: 13 },
  version: { fontSize: 11, textAlign: 'center', marginTop: 24 },
});
