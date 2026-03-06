import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { i18n, useLanguage, LANGUAGE_LABELS } from '@/shared/i18n';
import type { Language } from '@/shared/i18n';

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
  const { locale, setLanguage, languageLabel } = useLanguage();

  const handleSignOut = () => {
    Alert.alert(
      i18n.t('logout'),
      i18n.t('logoutConfirm'),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        { text: i18n.t('logout'), style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleLanguageChange = () => {
    const languages: Language[] = ['fr', 'es', 'en'];
    Alert.alert(
      i18n.t('chooseLanguage'),
      '',
      languages.map((lang) => ({
        text: `${lang === 'fr' ? '🇫🇷' : lang === 'es' ? '🇪🇸' : '🇬🇧'} ${LANGUAGE_LABELS[lang]}`,
        onPress: () => setLanguage(lang),
        style: lang === locale ? ('cancel' as const) : ('default' as const),
      })),
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
        <ImageBackground
          source={require('../../assets/poisson.jpeg')}
          style={styles.noAuthBg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.2)',
              theme.period === 'night' ? 'rgba(15,27,45,0.9)' : 'rgba(253,248,240,0.85)',
              theme.background,
            ]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
        <View style={[styles.centeredContent, { marginTop: -60 }]}>
          <View style={[styles.bigAvatar, { backgroundColor: colors.sunYellowLight }]}>
            <Ionicons name="person" size={48} color={colors.sunYellow} />
          </View>
          <Text style={[styles.noAuthTitle, { color: theme.text }]}>
            {i18n.t('myProfile')}
          </Text>
          <Text style={[styles.noAuthText, { color: theme.textSecondary }]}>
            {i18n.t('profileDesc')}
          </Text>
          <Button
            title={i18n.t('login')}
            onPress={() => router.push('/(auth)/login')}
            size="lg"
            style={{ width: '100%', marginTop: 16 }}
          />
          <Button
            title={i18n.t('signup')}
            onPress={() => router.push('/(auth)/signup')}
            size="lg"
            variant="outline"
            style={{ width: '100%', marginTop: 8 }}
          />

          {/* Sun Mode debug — visible uniquement en développement */}
          {__DEV__ && (
            <TouchableOpacity style={styles.sunDebug} onPress={cycleSunMode}>
              <Ionicons name="sunny" size={16} color={theme.accent} />
              <Text style={[styles.sunDebugText, { color: theme.textSecondary }]}>
                Sun Mode : {isOverridden ? period : 'auto'} (tap pour changer)
              </Text>
            </TouchableOpacity>
          )}
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
        {/* Profile header with background photo */}
        <ImageBackground
          source={require('../../assets/poisson.jpeg')}
          style={styles.profileHeaderBg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.3)',
              theme.period === 'night' ? 'rgba(15,27,45,0.85)' : 'rgba(253,248,240,0.8)',
            ]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.profileHeader, { paddingTop: insets.top + 16 }]}>
            <View style={[styles.avatar, { backgroundColor: colors.sunYellow }]}>
              <Text style={styles.avatarText}>
                {(profile?.full_name ?? '?')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.profileName, { color: colors.white }]}>
              {profile?.full_name ?? 'Utilisateur'}
            </Text>
            <Text style={[styles.profileEmail, { color: 'rgba(255,255,255,0.7)' }]}>
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
        </ImageBackground>

        {/* Stats */}
        <View style={styles.section}>
          <Card>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {profile?.visit_count ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{i18n.t('visits')}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.cardBorder }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {profile?.beach_tokens ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{i18n.t('tokens')}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.cardBorder }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {profile?.total_spent ? `${profile.total_spent}€` : '0€'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{i18n.t('spent')}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Admin / Staff section */}
        {profile && (profile.role === 'admin' || profile.role === 'staff') && (
          <View style={styles.section}>
            <Card padded={false}>
              <MenuItem
                icon="speedometer-outline"
                label={i18n.t('adminDashboard')}
                onPress={() => router.push('/(admin)/dashboard')}
              />
              <MenuItem
                icon="qr-code-outline"
                label={i18n.t('scanQR')}
                onPress={() => router.push('/(admin)/scanner')}
              />
              <MenuItem
                icon="list-outline"
                label={i18n.t('todayReservations')}
                onPress={() => router.push('/(admin)/reservations')}
              />
            </Card>
          </View>
        )}

        {/* Menu */}
        <View style={styles.section}>
          <Card padded={false}>
            <MenuItem icon="receipt-outline" label={i18n.t('myReservations')} onPress={() => router.push('/profile/reservations')} />
            <MenuItem icon="ticket-outline" label={i18n.t('myTickets')} onPress={() => router.push('/profile/tickets')} />
            <MenuItem icon="diamond-outline" label={i18n.t('beachTokens')} value={`${profile?.beach_tokens ?? 0}`} onPress={() => router.push('/profile/tokens')} />
            <MenuItem icon="gift-outline" label={i18n.t('rewards')} onPress={() => router.push('/profile/rewards')} />
          </Card>
        </View>

        <View style={styles.section}>
          <Card padded={false}>
            <MenuItem icon="person-outline" label={i18n.t('personalInfo')} onPress={() => router.push('/profile/personal-info')} />
            <MenuItem icon="notifications-outline" label={i18n.t('notifications')} onPress={() => router.push('/profile/notifications')} />
            <MenuItem icon="language-outline" label={i18n.t('language')} value={languageLabel} onPress={handleLanguageChange} />
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
            <MenuItem icon="help-circle-outline" label={i18n.t('helpContact')} onPress={() => router.push('/profile/help')} />
            <MenuItem icon="document-text-outline" label={i18n.t('terms')} onPress={() => router.push('/profile/terms')} />
            <MenuItem icon="shield-checkmark-outline" label={i18n.t('privacy')} onPress={() => router.push('/profile/privacy')} />
          </Card>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <Button
            title={i18n.t('logout')}
            onPress={handleSignOut}
            variant="ghost"
            textStyle={{ color: colors.accentRed }}
          />
        </View>

        <Text style={[styles.version, { color: theme.textSecondary }]}>
          {i18n.t('version')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  noAuthBg: { height: 200 },
  profileHeaderBg: { overflow: 'hidden' },
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
