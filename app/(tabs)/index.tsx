import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
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
import { i18n } from '@/shared/i18n';
import { useWeather, windDescription } from '@/shared/hooks/useWeather';
import { supabase } from '@/shared/lib/supabase';
import { GalleryCarousel } from '@/features/gallery/components/GalleryCarousel';

const { width, height } = Dimensions.get('window');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const droneVideoSource = require('../../assets/gallery/drone-video-1.mp4');

function HeroVideo() {
  const player = useVideoPlayer(droneVideoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.playbackRate = 1.5;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.bgImage}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
}

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

  const { weather } = useWeather();

  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  useEffect(() => {
    supabase.from('events').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date').limit(1).single().then(({ data }) => { if (data) setFeaturedEvent(data); });
  }, []);

  const greeting = () => {
    const greetings = i18n.t('greeting', { returnObjects: true }) as any;
    return greetings?.[period] ?? i18n.t(`greeting.${period}`);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Background video drone en autoplay */}
      <HeroVideo />
      <LinearGradient
        colors={[
          'transparent',
          'rgba(253,248,240,0.35)',
          'rgba(253,248,240,0.7)',
        ]}
        locations={[0, 0.3, 0.6]}
        style={styles.bgOverlay}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <View style={styles.heroContent}>
            <AnimatedEntry delay={100} direction="up">
            <View style={styles.heroTop}>
              <View>
                <Text style={[styles.greeting, { color: theme.textSecondary }]}>
                  {greeting()} ☀️
                </Text>
                <Text style={[styles.heroTitle, { color: theme.text }]}>
                  {profile?.full_name?.split(' ')[0] ?? i18n.t('welcome')}
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
              <Badge label={i18n.t('open')} variant="success" size="sm" />
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
                {period === 'morning' && i18n.t('sunMorning')}
                {period === 'day' && i18n.t('sunDay')}
                {period === 'sunset' && i18n.t('sunSunset')}
                {period === 'night' && i18n.t('sunNight')}
              </Text>
            </View>
            </AnimatedEntry>
          </View>
        </View>

      {/* Quick Actions */}
      <AnimatedEntry delay={500} direction="up">
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('reserve')}</Text>
        <View style={styles.quickActions}>
          <QuickAction
            icon="umbrella"
            label={i18n.t('sunbed')}
            onPress={() => router.push('/(tabs)/beach')}
            color={colors.terracotta}
          />
          <QuickAction
            icon="restaurant"
            label={i18n.t('tabRestaurant')}
            onPress={() => router.push('/(tabs)/restaurant')}
            color={colors.deepSea}
          />
          <QuickAction
            icon="calendar"
            label={i18n.t('event')}
            onPress={() => router.push('/(tabs)/events')}
            color={colors.accentRed}
          />
          <QuickAction
            icon="sparkles"
            label={i18n.t('moodAI')}
            onPress={() => router.push('/mood')}
            color={colors.sage}
          />
        </View>
      </View>
      </AnimatedEntry>

      {/* Today's vibe */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('today')}</Text>
        <Card style={styles.vibeCard}>
          <View style={styles.vibeRow}>
            <View style={styles.vibeInfo}>
              <Text style={[styles.vibeTemp, { color: theme.text }]}>
                {weather ? `${weather.temperature}°C` : '—'}
              </Text>
              <Text style={[styles.vibeLabel, { color: theme.textSecondary }]}>
                {weather ? `${weather.icon} ${weather.description}` : i18n.t('weather')}
              </Text>
            </View>
            <View style={styles.vibeStats}>
              <View style={styles.vibeStat}>
                <Ionicons name="flag" size={16} color={theme.accent} />
                <Text style={[styles.vibeStatText, { color: theme.textSecondary }]}>
                  {weather ? windDescription(weather.windSpeed) : '—'}
                  {weather ? ` • ${weather.windSpeed} km/h` : ''}
                </Text>
              </View>
              <View style={styles.vibeStat}>
                <Ionicons name="location" size={16} color={colors.deepSea} />
                <Text style={[styles.vibeStatText, { color: theme.textSecondary }]}>
                  Marbella
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </View>

      {/* Featured Event */}
      {featuredEvent && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('nextEvent')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={[styles.seeAll, { color: theme.accent }]}>{i18n.t('seeAll')}</Text>
            </TouchableOpacity>
          </View>
          <Card padded={false} style={styles.eventCard}>
            <ImageBackground
              source={require('../../assets/event.png')}
              style={styles.eventImageBg}
              resizeMode="cover"
            >
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
              style={styles.eventGradient}
            >
              <View style={styles.eventContent}>
                {featuredEvent.category && (
                  <Badge label={featuredEvent.category.replace('_', ' ')} variant="vip" size="sm" />
                )}
                <Text style={styles.eventTitle}>{featuredEvent.title}</Text>
                <Text style={styles.eventDate}>
                  {new Date(featuredEvent.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {featuredEvent.start_time ? ` • ${featuredEvent.start_time.slice(0, 5).replace(':', 'h')}` : ''}
                  {featuredEvent.end_time ? ` - ${featuredEvent.end_time.slice(0, 5).replace(':', 'h')}` : ''}
                </Text>
                <View style={styles.eventFooter}>
                  <View style={styles.eventPrice}>
                    <Text style={styles.eventPriceLabel}>{i18n.t('from')}</Text>
                    <Text style={styles.eventPriceValue}>
                      {featuredEvent.standard_price > 0 ? `${featuredEvent.standard_price}€` : 'Gratuit'}
                    </Text>
                  </View>
                  <Button
                    title={i18n.t('reserve')}
                    onPress={() => router.push('/(tabs)/events')}
                    size="sm"
                    variant="primary"
                  />
                </View>
              </View>
            </LinearGradient>
            </ImageBackground>
          </Card>
        </View>
      )}

      {/* Live Beach View — masqué pour l'instant
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('beachViewLive')}</Text>
          <TouchableOpacity onPress={() => router.push('/live')}>
            <Text style={[styles.seeAll, { color: theme.accent }]}>{i18n.t('viewLive')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push('/live')} activeOpacity={0.8}>
          <Card>
            <View style={styles.liveRow}>
              <Ionicons name="videocam-outline" size={22} color={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveTitle, { color: theme.text }]}>{i18n.t('liveBeach')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </View>
          </Card>
        </TouchableOpacity>
      </View>
      */}

      {/* Gallery carousel */}
      <View style={styles.section}>
        <GalleryCarousel />
      </View>

      {/* Loyalty tokens preview */}
      {user && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{i18n.t('beachTokens')}</Text>
          <Card>
            <View style={styles.tokensRow}>
              <View style={styles.tokensInfo}>
                <Text style={[styles.tokensAmount, { color: colors.sunYellow }]}>
                  {profile?.beach_tokens ?? 0}
                </Text>
                <Text style={[styles.tokensLabel, { color: theme.textSecondary }]}>
                  {i18n.t('tokensAvailable')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.tokensButton, { backgroundColor: colors.sunYellowLight }]}
                onPress={() => router.push('/(tabs)/tokens')}
              >
                <Text style={[styles.tokensButtonText, { color: colors.warmWood }]}>
                  {i18n.t('rewards')} →
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
                {i18n.t('joinUs')}
              </Text>
              <Text style={[styles.ctaText, { color: theme.textSecondary }]}>
                {i18n.t('joinUsDesc')}
              </Text>
              <Button
                title={i18n.t('signup')}
                onPress={() => router.push('/(auth)/signup')}
                size="lg"
                style={{ width: '100%', marginTop: 8 }}
              />
            </View>
          </Card>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bgImage: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    width: width,
    height: height,
    opacity: 0.75,
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
