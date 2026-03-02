import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { AnimatedEntry, AnimatedScale } from '@/shared/ui/AnimatedEntry';

const { width } = Dimensions.get('window');

function QuickAction({
  icon,
  label,
  onPress,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
}) {
  const { theme } = useSunMode();
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: theme.card }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.quickActionLabel, { color: theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { theme, period } = useSunMode();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const greeting = () => {
    switch (period) {
      case 'morning': return 'Buenos días';
      case 'day': return 'Bonjour';
      case 'sunset': return 'Bonsoir';
      case 'night': return 'Bonne soirée';
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <ImageBackground
        source={require('../../assets/beach-hero.jpg')}
        style={[styles.hero, { paddingTop: insets.top }]}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.25)',
            theme.period === 'night' ? 'rgba(15,27,45,0.85)' : 'rgba(253,248,240,0.8)',
            theme.background,
          ]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroContent}>
          <AnimatedEntry delay={100} direction="up">
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.greeting, { color: theme.textSecondary }]}>
                {greeting()} ☀️
              </Text>
              <Text style={[styles.heroTitle, { color: theme.text }]}>
                {profile?.full_name?.split(' ')[0] ?? 'Bienvenue'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (user) {
                  router.push('/(tabs)/profile');
                } else {
                  router.push('/(auth)/login');
                }
              }}
            >
              <View style={[styles.avatar, { backgroundColor: colors.sunYellow }]}>
                <Ionicons name="person" size={20} color={colors.black} />
              </View>
            </TouchableOpacity>
          </View>

          </AnimatedEntry>

          {/* Location badge */}
          <AnimatedEntry delay={250} direction="up">
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={theme.accentSecondary} />
            <Text style={[styles.locationText, { color: theme.textSecondary }]}>
              Marbella, Costa del Sol
            </Text>
            <Badge label="Ouvert" variant="success" size="sm" />
          </View>

          </AnimatedEntry>

          {/* Sun Mode indicator */}
          <AnimatedEntry delay={400} direction="up">
          <View style={[styles.sunIndicator, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons
              name={period === 'night' ? 'moon' : period === 'sunset' ? 'partly-sunny' : 'sunny'}
              size={16}
              color={theme.accent}
            />
            <Text style={[styles.sunText, { color: theme.textSecondary }]}>
              {period === 'morning' && 'Mode Matin — Lumière dorée'}
              {period === 'day' && 'Mode Jour — Plein soleil'}
              {period === 'sunset' && 'Mode Sunset — Golden hour'}
              {period === 'night' && 'Mode Nuit — Ambiance lounge'}
            </Text>
          </View>
          </AnimatedEntry>
        </View>
      </ImageBackground>

      {/* Quick Actions */}
      <AnimatedEntry delay={500} direction="up">
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Réserver</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="umbrella"
            label="Transat"
            onPress={() => router.push('/(tabs)/beach')}
            color={colors.terracotta}
          />
          <QuickAction
            icon="restaurant"
            label="Restaurant"
            onPress={() => router.push('/(tabs)/restaurant')}
            color={colors.deepSea}
          />
          <QuickAction
            icon="calendar"
            label="Événement"
            onPress={() => router.push('/(tabs)/events')}
            color={colors.accentRed}
          />
          <QuickAction
            icon="sparkles"
            label="Mood AI"
            onPress={() => router.push('/mood')}
            color={colors.sage}
          />
        </View>
      </View>
      </AnimatedEntry>

      {/* Today's vibe */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Aujourd'hui</Text>
        <Card style={styles.vibeCard}>
          <View style={styles.vibeRow}>
            <View style={styles.vibeInfo}>
              <Text style={[styles.vibeTemp, { color: theme.text }]}>28°C</Text>
              <Text style={[styles.vibeLabel, { color: theme.textSecondary }]}>
                Ensoleillé • Vent léger
              </Text>
            </View>
            <View style={styles.vibeStats}>
              <View style={styles.vibeStat}>
                <Ionicons name="people" size={16} color={theme.accent} />
                <Text style={[styles.vibeStatText, { color: theme.textSecondary }]}>
                  Affluence modérée
                </Text>
              </View>
              <View style={styles.vibeStat}>
                <Ionicons name="water" size={16} color={colors.deepSea} />
                <Text style={[styles.vibeStatText, { color: theme.textSecondary }]}>
                  Mer calme • 22°C
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </View>

      {/* Featured Event */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Prochain événement</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
            <Text style={[styles.seeAll, { color: theme.accent }]}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <Card padded={false} style={styles.eventCard}>
          <ImageBackground
            source={require('../../assets/pool-view.jpg')}
            style={styles.eventImageBg}
            resizeMode="cover"
          >
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
            style={styles.eventGradient}
          >
            <View style={styles.eventContent}>
              <Badge label="Pool Party" variant="vip" size="sm" />
              <Text style={styles.eventTitle}>Sunset Beats</Text>
              <Text style={styles.eventDate}>Samedi 8 Mars • 16h - 23h</Text>
              <View style={styles.eventFooter}>
                <View style={styles.eventPrice}>
                  <Text style={styles.eventPriceLabel}>À partir de</Text>
                  <Text style={styles.eventPriceValue}>45€</Text>
                </View>
                <Button
                  title="Réserver"
                  onPress={() => {}}
                  size="sm"
                  variant="primary"
                />
              </View>
            </View>
          </LinearGradient>
          </ImageBackground>
        </Card>
      </View>

      {/* Live Beach View */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Beach View</Text>
          <TouchableOpacity onPress={() => router.push('/live')}>
            <Text style={[styles.seeAll, { color: theme.accent }]}>Voir en live</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push('/live')} activeOpacity={0.8}>
          <Card>
            <View style={styles.liveRow}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>LIVE</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveTitle, { color: theme.text }]}>Plage en direct</Text>
                <Text style={[styles.liveSubtext, { color: theme.textSecondary }]}>
                  Affluence modérée — Idéal pour venir maintenant
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </View>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Loyalty tokens preview */}
      {user && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Beach Tokens</Text>
          <Card>
            <View style={styles.tokensRow}>
              <View style={styles.tokensInfo}>
                <Text style={[styles.tokensAmount, { color: colors.sunYellow }]}>
                  {profile?.beach_tokens ?? 0}
                </Text>
                <Text style={[styles.tokensLabel, { color: theme.textSecondary }]}>
                  tokens disponibles
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.tokensButton, { backgroundColor: colors.sunYellowLight }]}
                onPress={() => router.push('/(tabs)/tokens')}
              >
                <Text style={[styles.tokensButtonText, { color: colors.warmWood }]}>
                  Récompenses →
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      )}

      {/* CTA if not logged in */}
      {!user && (
        <View style={styles.section}>
          <Card>
            <View style={styles.ctaContent}>
              <Ionicons name="sunny" size={32} color={colors.brand} />
              <Text style={[styles.ctaTitle, { color: theme.text }]}>
                Rejoignez Les Tournesols
              </Text>
              <Text style={[styles.ctaText, { color: theme.textSecondary }]}>
                Accédez aux réservations, événements exclusifs et au programme de fidélité.
              </Text>
              <Button
                title="Créer un compte"
                onPress={() => router.push('/(auth)/signup')}
                size="lg"
                style={{ width: '100%', marginTop: 8 }}
              />
            </View>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hero: {
    minHeight: 260,
    justifyContent: 'flex-end',
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 16,
  },
  greeting: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  sunIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  sunText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  vibeCard: {
    padding: 16,
  },
  vibeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vibeInfo: {},
  vibeTemp: {
    fontSize: 36,
    fontWeight: '700',
  },
  vibeLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  vibeStats: {
    gap: 8,
    alignItems: 'flex-end',
  },
  vibeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vibeStatText: {
    fontSize: 12,
  },
  eventCard: {
    height: 220,
    overflow: 'hidden',
    backgroundColor: colors.deepSea,
  },
  eventImageBg: {
    flex: 1,
  },
  eventGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  eventContent: {
    padding: 16,
    gap: 6,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  eventDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  eventPrice: {},
  eventPriceLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  eventPriceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.sunYellow,
  },
  tokensRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokensInfo: {},
  tokensAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  tokensLabel: {
    fontSize: 13,
  },
  tokensButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tokensButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244,67,54,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F44336',
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F44336',
    letterSpacing: 0.5,
  },
  liveTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  liveSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  ctaContent: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
