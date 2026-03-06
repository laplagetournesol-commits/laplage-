import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { supabase } from '@/shared/lib/supabase';

interface DashboardStats {
  beachToday: number;
  beachCheckedIn: number;
  restaurantLunch: number;
  restaurantDinner: number;
  restaurantCheckedIn: number;
  eventTicketsToday: number;
  eventCheckedIn: number;
  totalTokensToday: number;
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  const { theme } = useSunMode();
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      {subValue && (
        <Text style={[styles.statSub, { color: colors.sage }]}>{subValue}</Text>
      )}
    </Card>
  );
}

export default function DashboardScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const fetchStats = async () => {
    const [beachRes, restoRes, ticketsRes, tokensRes] = await Promise.all([
      supabase
        .from('beach_reservations')
        .select('status')
        .eq('date', today)
        .in('status', ['confirmed', 'checked_in', 'completed']),
      supabase
        .from('restaurant_reservations')
        .select('status, time_slot')
        .eq('date', today)
        .in('status', ['confirmed', 'checked_in', 'completed']),
      supabase
        .from('event_tickets')
        .select('status, event:events!inner(date)')
        .eq('events.date', today),
      supabase
        .from('token_transactions')
        .select('amount')
        .gte('created_at', today + 'T00:00:00')
        .eq('type', 'earn'),
    ]);

    const beachData = beachRes.data ?? [];
    const restoData = restoRes.data ?? [];
    const ticketData = ticketsRes.data ?? [];
    const tokenData = tokensRes.data ?? [];

    setStats({
      beachToday: beachData.length,
      beachCheckedIn: beachData.filter((r) => r.status === 'checked_in' || r.status === 'completed').length,
      restaurantLunch: restoData.filter((r) => r.time_slot === 'lunch').length,
      restaurantDinner: restoData.filter((r) => r.time_slot === 'dinner').length,
      restaurantCheckedIn: restoData.filter((r) => r.status === 'checked_in' || r.status === 'completed').length,
      eventTicketsToday: ticketData.length,
      eventCheckedIn: ticketData.filter((t) => t.status === 'used').length,
      totalTokensToday: tokenData.reduce((sum, t) => sum + (t.amount ?? 0), 0),
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const formattedToday = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Admin',
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />
        }
      >
        <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>
        <Text style={[styles.date, { color: theme.textSecondary }]}>
          {formattedToday.charAt(0).toUpperCase() + formattedToday.slice(1)}
        </Text>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.sunYellow }]}
            onPress={() => router.push('/(admin)/scanner')}
          >
            <Ionicons name="qr-code" size={28} color={colors.black} />
            <Text style={styles.quickActionLabel}>Scanner QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }]}
            onPress={() => router.push('/(admin)/reservations')}
          >
            <Ionicons name="list" size={28} color={theme.accent} />
            <Text style={[styles.quickActionLabel, { color: theme.text }]}>Réservations</Text>
          </TouchableOpacity>
        </View>

        {/* Stats grid */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Aujourd'hui</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="umbrella"
            label="Plage"
            value={`${stats?.beachToday ?? 0}`}
            subValue={stats ? `${stats.beachCheckedIn} check-in` : undefined}
            color={colors.terracotta}
          />
          <StatCard
            icon="restaurant"
            label="Déjeuner"
            value={`${stats?.restaurantLunch ?? 0}`}
            color={colors.deepSea}
          />
          <StatCard
            icon="moon"
            label="Dîner"
            value={`${stats?.restaurantDinner ?? 0}`}
            subValue={stats ? `${stats.restaurantCheckedIn} check-in` : undefined}
            color={colors.deepSea}
          />
          <StatCard
            icon="ticket"
            label="Tickets"
            value={`${stats?.eventTicketsToday ?? 0}`}
            subValue={stats ? `${stats.eventCheckedIn} scannés` : undefined}
            color={colors.accentRed}
          />
        </View>

        {/* Tokens */}
        <Card style={{ marginTop: 16 }}>
          <View style={styles.tokensRow}>
            <View style={[styles.tokensIcon, { backgroundColor: colors.sunYellowLight }]}>
              <Text style={{ fontSize: 20 }}>🏖️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tokensLabel, { color: theme.textSecondary }]}>
                Beach Tokens distribués aujourd'hui
              </Text>
              <Text style={[styles.tokensValue, { color: colors.sunYellow }]}>
                {stats?.totalTokensToday ?? 0} tokens
              </Text>
            </View>
          </View>
        </Card>

        {/* Gestion */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 28 }]}>Gestion</Text>
        <View style={styles.managementGrid}>
          <TouchableOpacity
            style={[styles.managementBtn, { backgroundColor: colors.terracotta + '12', borderColor: colors.terracotta + '30' }]}
            onPress={() => router.push('/(admin)/beach-management')}
          >
            <View style={[styles.managementIcon, { backgroundColor: colors.terracotta + '20' }]}>
              <Ionicons name="umbrella" size={22} color={colors.terracotta} />
            </View>
            <Text style={[styles.managementLabel, { color: theme.text }]}>Plage</Text>
            <Text style={[styles.managementSub, { color: theme.textSecondary }]}>Zones & transats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.managementBtn, { backgroundColor: colors.deepSea + '10', borderColor: colors.deepSea + '25' }]}
            onPress={() => router.push('/(admin)/restaurant-management')}
          >
            <View style={[styles.managementIcon, { backgroundColor: colors.deepSea + '18' }]}>
              <Ionicons name="restaurant" size={22} color={colors.deepSea} />
            </View>
            <Text style={[styles.managementLabel, { color: theme.text }]}>Restaurant</Text>
            <Text style={[styles.managementSub, { color: theme.textSecondary }]}>Zones & tables</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.managementBtn, { backgroundColor: colors.accentRed + '10', borderColor: colors.accentRed + '25' }]}
            onPress={() => router.push('/(admin)/events-management')}
          >
            <View style={[styles.managementIcon, { backgroundColor: colors.accentRed + '18' }]}>
              <Ionicons name="calendar" size={22} color={colors.accentRed} />
            </View>
            <Text style={[styles.managementLabel, { color: theme.text }]}>Événements</Text>
            <Text style={[styles.managementSub, { color: theme.textSecondary }]}>Créer & éditer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.managementBtn, { backgroundColor: colors.sage + '15', borderColor: colors.sage + '30' }]}
            onPress={() => router.push('/(admin)/addons-management')}
          >
            <View style={[styles.managementIcon, { backgroundColor: colors.sage + '22' }]}>
              <Ionicons name="gift" size={22} color={colors.sage} />
            </View>
            <Text style={[styles.managementLabel, { color: theme.text }]}>Addons</Text>
            <Text style={[styles.managementSub, { color: theme.textSecondary }]}>Extras & packs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.managementBtn, { backgroundColor: colors.sunYellow + '12', borderColor: colors.sunYellow + '30' }]}
            onPress={() => router.push('/(admin)/broadcast')}
          >
            <View style={[styles.managementIcon, { backgroundColor: colors.sunYellow + '20' }]}>
              <Ionicons name="megaphone" size={22} color={colors.warmWood} />
            </View>
            <Text style={[styles.managementLabel, { color: theme.text }]}>Broadcast</Text>
            <Text style={[styles.managementSub, { color: theme.textSecondary }]}>Push & emails</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  date: { fontSize: 14, marginTop: 4, marginBottom: 24 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    gap: 8,
  },
  quickActionLabel: { fontSize: 14, fontWeight: '700', color: colors.black },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, fontWeight: '500' },
  statSub: { fontSize: 11, fontWeight: '600' },
  tokensRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tokensIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  tokensLabel: { fontSize: 13 },
  tokensValue: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  managementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  managementBtn: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  managementIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  managementLabel: { fontSize: 14, fontWeight: '700' },
  managementSub: { fontSize: 11 },
});
