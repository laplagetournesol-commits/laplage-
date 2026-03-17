import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useLiveCameras, getCrowdInfo } from '@/features/live/hooks/useLiveCameras';
import { i18n } from '@/shared/i18n';

export default function LiveScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { cameras, loading, refresh } = useLiveCameras();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Affluence globale
  const overallCrowd = React.useMemo(() => {
    if (cameras.length === 0) return null;
    const levels = cameras.map((c) => c.crowd_level);
    const highCount = levels.filter((l) => l === 'high').length;
    const medCount = levels.filter((l) => l === 'medium').length;
    if (highCount > cameras.length / 2) return 'high' as const;
    if (medCount + highCount > cameras.length / 2) return 'medium' as const;
    return 'low' as const;
  }, [cameras]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />
        }
      >
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{i18n.t('liveTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {i18n.t('liveSubtitle')}
          </Text>
        </View>

        {/* Overall crowd */}
        {overallCrowd && (
          <Card style={styles.crowdCard}>
            <View style={styles.crowdRow}>
              <View>
                <Text style={[styles.crowdTitle, { color: theme.text }]}>{i18n.t('currentCrowd')}</Text>
                <Text style={[styles.crowdLabel, { color: getCrowdInfo(overallCrowd).color }]}>
                  {getCrowdInfo(overallCrowd).icon} {getCrowdInfo(overallCrowd).label}
                </Text>
              </View>
              <View style={styles.crowdBarContainer}>
                <View style={[styles.crowdBarBg, { backgroundColor: theme.backgroundSecondary }]}>
                  <View
                    style={[
                      styles.crowdBarFill,
                      {
                        backgroundColor: getCrowdInfo(overallCrowd).color,
                        width: `${getCrowdInfo(overallCrowd).percent}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.crowdPercent, { color: theme.textSecondary }]}>
                  ~{getCrowdInfo(overallCrowd).percent}%
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Cameras */}
        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
        ) : cameras.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{i18n.t('noCameras')}</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {i18n.t('camerasComingSoon')}
            </Text>
          </View>
        ) : (
          <View style={styles.cameraGrid}>
            {cameras.map((camera) => {
              const crowd = getCrowdInfo(camera.crowd_level);
              return (
                <Card key={camera.id} padded={false} style={styles.cameraCard}>
                  {/* Thumbnail ou placeholder */}
                  <View style={[styles.cameraThumbnail, { backgroundColor: colors.deepSea + '20' }]}>
                    {camera.thumbnail_url ? (
                      <Image
                        source={{ uri: camera.thumbnail_url }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="videocam" size={32} color={colors.deepSea} />
                    )}
                    {/* Pas de badge LIVE — les caméras ne sont pas en direct */}
                  </View>
                  <View style={styles.cameraInfo}>
                    <Text style={[styles.cameraName, { color: theme.text }]}>{camera.name}</Text>
                    <Text style={[styles.cameraLocation, { color: theme.textSecondary }]}>
                      {camera.location}
                    </Text>
                    <View style={styles.cameraCrowdRow}>
                      <Text style={[styles.cameraCrowdText, { color: crowd.color }]}>
                        {crowd.icon} {crowd.label}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Tips */}
        <View style={[styles.tipCard, { backgroundColor: colors.sunYellowLight }]}>
          <Ionicons name="bulb-outline" size={18} color={colors.warmWood} />
          <Text style={[styles.tipText, { color: colors.warmWood }]}>
            {i18n.t('liveTip')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { paddingHorizontal: 20 },
  backRow: { marginBottom: 8 },
  header: { alignItems: 'center', marginBottom: 24 },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244,67,54,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F44336',
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6 },
  crowdCard: { marginBottom: 20 },
  crowdRow: { gap: 12 },
  crowdTitle: { fontSize: 15, fontWeight: '700' },
  crowdLabel: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  crowdBarContainer: { gap: 4 },
  crowdBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  crowdBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  crowdPercent: { fontSize: 11, textAlign: 'right' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  cameraGrid: { gap: 16 },
  cameraCard: { overflow: 'hidden' },
  cameraThumbnail: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244,67,54,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cameraBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  cameraBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  cameraInfo: { padding: 14, gap: 2 },
  cameraName: { fontSize: 16, fontWeight: '700' },
  cameraLocation: { fontSize: 13 },
  cameraCrowdRow: { marginTop: 6 },
  cameraCrowdText: { fontSize: 13, fontWeight: '600' },
  tipCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    alignItems: 'flex-start',
    marginTop: 20,
  },
  tipText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 19 },
});
