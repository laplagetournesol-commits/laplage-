import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useMoodAI, MOOD_OPTIONS } from '@/features/mood/hooks/useMoodAI';
import type { MoodType } from '@/features/mood/hooks/useMoodAI';

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.aiEmoji}>✨</Text>
          <Text style={[styles.title, { color: theme.text }]}>Mood Beach AI</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Dites-nous votre humeur, on s'occupe du reste
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
              L'IA analyse votre mood...
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
                <Text style={[styles.changeText, { color: theme.accent }]}>Changer</Text>
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
                <Text style={[styles.resultTitle, { color: theme.text }]}>Votre spot idéal</Text>
              </View>
              <Badge
                label={`Zone ${recommendation.spot.zone}`}
                variant={recommendation.spot.zone === 'VIP Cabanas' ? 'vip' : 'success'}
                size="sm"
              />
              <Text style={[styles.resultDesc, { color: theme.textSecondary }]}>
                {recommendation.spot.description}
              </Text>
              <Button
                title={recommendation.spot.type === 'beach' ? 'Voir la plage' : 'Voir le restaurant'}
                onPress={() => router.push(recommendation.spot.type === 'beach' ? '/(tabs)/beach' : '/(tabs)/restaurant')}
                variant="outline"
                size="sm"
                style={{ alignSelf: 'flex-start', marginTop: 8 }}
              />
            </Card>

            {/* Drinks */}
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="wine-outline" size={20} color={colors.accentRed} />
                <Text style={[styles.resultTitle, { color: theme.text }]}>Boissons recommandées</Text>
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
                <Text style={[styles.resultTitle, { color: theme.text }]}>À grignoter</Text>
              </View>
              {recommendation.food.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listBullet}>•</Text>
                  <Text style={[styles.listText, { color: theme.text }]}>{item}</Text>
                </View>
              ))}
            </Card>

            {/* Playlist */}
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="musical-notes" size={20} color={colors.sunYellow} />
                <Text style={[styles.resultTitle, { color: theme.text }]}>Playlist du moment</Text>
              </View>
              <Text style={[styles.playlistName, { color: theme.accent }]}>
                {recommendation.playlist}
              </Text>
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
              title="Réserver maintenant"
              onPress={() => router.push(recommendation.spot.type === 'beach' ? '/(tabs)/beach' : '/(tabs)/restaurant')}
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
  backRow: { marginBottom: 8 },
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
  listItem: { flexDirection: 'row', gap: 8, marginLeft: 4 },
  listBullet: { fontSize: 14, color: colors.gray[400] },
  listText: { fontSize: 14, fontWeight: '500' },
  playlistName: { fontSize: 15, fontWeight: '600', fontStyle: 'italic' },
  tipCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  tipText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 19 },
});
