import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useTokenHistory, useRewards, useRedeemReward } from '@/features/tokens/hooks/useTokens';
import type { Reward } from '@/shared/types';
import { i18n } from '@/shared/i18n';

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  earn: { icon: 'add-circle', color: colors.sage, label: '+' },
  spend: { icon: 'remove-circle', color: colors.accentRed, label: '' },
  bonus: { icon: 'gift', color: colors.sunYellow, label: '+' },
  expire: { icon: 'time', color: colors.gray[400], label: '' },
};

export default function ProfileTokensScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const { transactions, loading: historyLoading, refresh: refreshHistory } = useTokenHistory();
  const { rewards, loading: rewardsLoading } = useRewards();
  const { redeem, redeeming } = useRedeemReward();
  const [tab, setTab] = useState<'rewards' | 'history'>('rewards');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshHistory(), refreshProfile()]);
    setRefreshing(false);
  };

  const handleRedeem = (reward: Reward) => {
    const t = profile?.beach_tokens ?? 0;
    if (t < reward.token_cost) {
      Alert.alert(i18n.t('insufficientTokens'), `${reward.token_cost} tokens. ${t} disponibles.`);
      return;
    }
    Alert.alert(
      i18n.t('exchange'),
      `Utiliser ${reward.token_cost} tokens pour "${reward.name}" ?`,
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('confirm'),
          onPress: async () => {
            const result = await redeem(reward);
            if (result.success) {
              Alert.alert(i18n.t('rewardObtained'), reward.name);
              refreshHistory();
              refreshProfile();
            }
          },
        },
      ],
    );
  };

  const tokens = profile?.beach_tokens ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Beach Tokens', headerShown: true }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
      >
        {/* Token balance */}
        <View style={styles.header}>
          <View style={[styles.tokenCard, { backgroundColor: colors.sunYellowLight }]}>
            <Text style={styles.tokenEmoji}>🏖️</Text>
            <Text style={[styles.tokenCount, { color: colors.warmWood }]}>{tokens}</Text>
            <Text style={[styles.tokenLabel, { color: colors.warmWood }]}>{i18n.t('tokensAvailable')}</Text>
          </View>

          <View style={[styles.earnInfo, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.earnTitle, { color: theme.text }]}>{i18n.t('howToEarn')}</Text>
            <View style={styles.earnRow}>
              <Ionicons name="umbrella" size={14} color={colors.terracotta} />
              <Text style={[styles.earnText, { color: theme.textSecondary }]}>{i18n.t('beachReservation')} : +10 tokens</Text>
            </View>
            <View style={styles.earnRow}>
              <Ionicons name="restaurant" size={14} color={colors.deepSea} />
              <Text style={[styles.earnText, { color: theme.textSecondary }]}>{i18n.t('restaurantReservation')} : +10 tokens</Text>
            </View>
            <View style={styles.earnRow}>
              <Ionicons name="ticket" size={14} color={colors.accentRed} />
              <Text style={[styles.earnText, { color: theme.textSecondary }]}>Ticket standard : +5 / VIP : +20 tokens</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setTab('rewards')}
            style={[styles.tabBtn, tab === 'rewards' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: tab === 'rewards' ? theme.text : theme.textSecondary }]}>{i18n.t('rewards')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('history')}
            style={[styles.tabBtn, tab === 'history' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: tab === 'history' ? theme.text : theme.textSecondary }]}>{i18n.t('history')}</Text>
          </TouchableOpacity>
        </View>

        {/* Rewards */}
        {tab === 'rewards' && (
          <View style={styles.section}>
            {rewardsLoading ? (
              <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 32 }} />
            ) : (
              rewards.map((reward) => {
                const canAfford = tokens >= reward.token_cost;
                return (
                  <Card key={reward.id} style={styles.rewardCard}>
                    <View style={styles.rewardRow}>
                      <View style={[styles.rewardIcon, { backgroundColor: theme.accent + '15' }]}>
                        <Ionicons name={(reward.icon as any) ?? 'gift-outline'} size={22} color={theme.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rewardName, { color: theme.text }]}>{reward.name}</Text>
                        <Text style={[styles.rewardDesc, { color: theme.textSecondary }]}>{reward.description}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRedeem(reward)}
                        disabled={!canAfford || redeeming}
                        style={[styles.redeemBtn, { backgroundColor: canAfford ? colors.sunYellow : theme.backgroundSecondary }]}
                      >
                        <Text style={[styles.redeemCost, { color: canAfford ? colors.black : theme.textSecondary }]}>{reward.token_cost}</Text>
                        <Text style={[styles.redeemLabel, { color: canAfford ? colors.black : theme.textSecondary }]}>tokens</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* History */}
        {tab === 'history' && (
          <View style={styles.section}>
            {historyLoading ? (
              <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 32 }} />
            ) : transactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{i18n.t('noTransactions')}</Text>
            ) : (
              transactions.map((tx) => {
                const config = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.earn;
                const dateStr = new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                return (
                  <View key={tx.id} style={[styles.txRow, { borderBottomColor: theme.cardBorder }]}>
                    <Ionicons name={config.icon} size={20} color={config.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txReason, { color: theme.text }]}>{tx.reason}</Text>
                      <Text style={[styles.txDate, { color: theme.textSecondary }]}>{dateStr}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: config.color }]}>{config.label}{Math.abs(tx.amount)}</Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16 },
  tokenCard: { alignItems: 'center', padding: 24, borderRadius: 20, marginBottom: 16 },
  tokenEmoji: { fontSize: 36, marginBottom: 8 },
  tokenCount: { fontSize: 48, fontWeight: '800' },
  tokenLabel: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  earnInfo: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 8 },
  earnTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  earnText: { fontSize: 13 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  tabBtn: { flex: 1, alignItems: 'center', paddingBottom: 12 },
  tabText: { fontSize: 15, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginTop: 16 },
  rewardCard: { marginBottom: 10 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rewardName: { fontSize: 15, fontWeight: '600' },
  rewardDesc: { fontSize: 12, marginTop: 2 },
  redeemBtn: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  redeemCost: { fontSize: 18, fontWeight: '800' },
  redeemLabel: { fontSize: 10, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 32 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  txReason: { fontSize: 14, fontWeight: '500' },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '700' },
});
