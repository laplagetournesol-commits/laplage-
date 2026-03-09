import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useMoodAI, MOOD_OPTIONS } from '@/features/mood/hooks/useMoodAI';
import { i18n } from '@/shared/i18n';

export default function MoodScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { selectedMood, recommendation, loading, selectMood, reset } = useMoodAI();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.aiEmoji}>✨</Text>
          <Text style={[styles.title, { color: theme.text }]}>{i18n.t('moodTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {i18n.t('moodSubtitle')}
          </Text>
        </View>

        {/* Mood selection */}
        {!selectedMood && (
          <View style={styles.moodGrid}>
            {MOOD_OPTIONS.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[styles.moodCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                onPress={() => selectMood(mood.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[styles.moodLabel, { color: theme.text }]}>{mood.label}</Text>
                <Text style={[styles.moodDesc, { color: theme.textSecondary }]}>{mood.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              {i18n.t('moodAnalyzing')}
            </Text>
            <Text style={[styles.loadingEmoji]}>
              {MOOD_OPTIONS.find((m) => m.id === selectedMood)?.emoji}
            </Text>
          </View>
        )}

        {/* Recommendation */}
        {recommendation && !loading && (
          <View style={styles.results}>
            {/* Selected mood badge */}
            <View style={styles.selectedMoodRow}>
              <Badge
                label={`${MOOD_OPTIONS.find((m) => m.id === selectedMood)?.emoji} ${MOOD_OPTIONS.find((m) => m.id === selectedMood)?.label}`}
                variant="vip"
              />
              <TouchableOpacity onPress={reset}>
                <Text style={[styles.changeText, { color: theme.accent }]}>{i18n.t('moodChange')}</Text>
              </TouchableOpacity>
            </View>

            {/* Spot recommendation */}
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons
                  name={recommendation.spot.type === 'beach' ? 'umbrella' : 'restaurant'}
                  size={20}
                  color={recommendation.spot.type === 'beach' ? colors.terracotta : colors.deepSea}
                />
                <Text style={[styles.resultTitle, { color: theme.text }]}>{i18n.t('idealSpot')}</Text>
              </View>
              <Badge
                label={`Zone ${recommendation.spot.zone}`}
                variant={recommendation.spot.zone === 'VIP Cabanas' ? 'vip' : 'success'}
                size="sm"
              />
              <Text style={[styles.resultDesc, { color: theme.textSecondary }]}>
                {recommendation.spot.description}
              </Text>
              {recommendation.addons.length > 0 && (
                <View style={styles.addonsRow}>
                  {recommendation.addons.map((addon, i) => (
                    <Badge key={i} label={addon} variant="default" size="sm" />
                  ))}
                </View>
              )}
              <Button
                title={recommendation.spot.type === 'beach' ? `Réserver — Zone ${recommendation.spot.zone}` : `Réserver — ${recommendation.spot.zone}`}
                onPress={() => router.push(recommendation.spot.type === 'beach' ? '/(tabs)/beach?fromMood=true' : '/(tabs)/restaurant?fromMood=true')}
                size="sm"
                style={{ alignSelf: 'flex-start', marginTop: 8 }}
              />
            </Card>

            {/* Drinks */}
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="wine-outline" size={20} color={colors.accentRed} />
                <Text style={[styles.resultTitle, { color: theme.text }]}>{i18n.t('recommendedDrinks')}</Text>
              </View>
              {recommendation.drinks.map((drink, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listBullet}>•</Text>
                  <Text style={[styles.listText, { color: theme.text }]}>{drink}</Text>
                </View>
              ))}
            </Card>

            {/* Food */}
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="restaurant-outline" size={20} color={colors.sage} />
                <Text style={[styles.resultTitle, { color: theme.text }]}>{i18n.t('snacks')}</Text>
              </View>
              {recommendation.food.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listBullet}>•</Text>
                  <Text style={[styles.listText, { color: theme.text }]}>{item}</Text>
                </View>
              ))}
            </Card>

            {/* Pro tip */}
            <View style={[styles.tipCard, { backgroundColor: colors.sunYellowLight }]}>
              <Ionicons name="bulb-outline" size={18} color={colors.warmWood} />
              <Text style={[styles.tipText, { color: colors.warmWood }]}>
                {recommendation.tip}
              </Text>
            </View>

            {/* CTA */}
            <Button
              title={`${i18n.t('reserveNow')} — ${recommendation.spot.zone}`}
              onPress={() => router.push(recommendation.spot.type === 'beach' ? '/(tabs)/beach?fromMood=true' : '/(tabs)/restaurant?fromMood=true')}
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { paddingHorizontal: 20 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backText: { fontSize: 16, fontWeight: '500' },
  header: { alignItems: 'center', marginBottom: 32 },
  aiEmoji: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6 },
  moodGrid: { gap: 12 },
  moodCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  moodEmoji: { fontSize: 32 },
  moodLabel: { fontSize: 17, fontWeight: '700' },
  moodDesc: { fontSize: 12, marginTop: 2 },
  loadingContainer: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '500' },
  loadingEmoji: { fontSize: 48 },
  results: { gap: 14 },
  selectedMoodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  changeText: { fontSize: 14, fontWeight: '600' },
  resultCard: { gap: 8 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  resultDesc: { fontSize: 14, lineHeight: 21 },
  addonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  listItem: { flexDirection: 'row', gap: 8, marginLeft: 4 },
  listBullet: { fontSize: 14, color: colors.gray[400] },
  listText: { fontSize: 14, fontWeight: '500' },
  tipCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  tipText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 19 },
});
