import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRewards, useRedeemReward } from '@/features/tokens/hooks/useTokens';

export default function RewardsScreen() {
  const { theme } = useSunMode();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { rewards, loading } = useRewards();
  const { redeem, redeeming } = useRedeemReward();
  const tokens = profile?.beach_tokens ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Récompenses',
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
        {/* Token balance */}
        <Card style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Vos Beach Tokens</Text>
          <Text style={[styles.balanceValue, { color: colors.sunYellow }]}>{tokens}</Text>
        </Card>

        {rewards.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Ionicons name="gift-outline" size={48} color={theme.cardBorder} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Les récompenses arrivent bientôt !
            </Text>
          </View>
        ) : (
          rewards.map((r) => {
            const canAfford = tokens >= r.token_cost;
            return (
              <Card key={r.id} style={styles.rewardCard}>
                <View style={styles.rewardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rewardName, { color: theme.text }]}>{r.name}</Text>
                    {r.description && (
                      <Text style={[styles.rewardDesc, { color: theme.textSecondary }]}>{r.description}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Badge label={`${r.token_cost} tokens`} variant={canAfford ? 'success' : 'default'} size="sm" />
                    <Button
                      title="Échanger"
                      onPress={() => redeem(r)}
                      size="sm"
                      variant={canAfford ? 'primary' : 'outline'}
                      loading={redeeming}
                      style={{ opacity: canAfford ? 1 : 0.4 }}
                    />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  balanceCard: { alignItems: 'center', marginBottom: 20 },
  balanceLabel: { fontSize: 13 },
  balanceValue: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  rewardCard: { marginBottom: 10 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardName: { fontSize: 15, fontWeight: '600' },
  rewardDesc: { fontSize: 12, marginTop: 2 },
});
