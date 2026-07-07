import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { supabase } from '@/shared/lib/supabase';
import { i18n } from '@/shared/i18n';

interface Stats {
  total: number;
  confirmed: number;
  checkedIn: number;
  completed: number;
  noShow: number;
  cancelled: number;
  guests: number;
  revenue: number; // encaissé brut (hors remboursements Stripe)
}

const EMPTY: Stats = { total: 0, confirmed: 0, checkedIn: 0, completed: 0, noShow: 0, cancelled: 0, guests: 0, revenue: 0 };

function monthBounds(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmt = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { from: fmt(start), to: fmt(end) };
}

function accumulate(rows: any[], amountField: string): Stats {
  const s = { ...EMPTY };
  for (const r of rows) {
    s.total++;
    s.guests += Number(r.guest_count) || 0;
    if (r.status === 'confirmed') s.confirmed++;
    else if (r.status === 'checked_in') s.checkedIn++;
    else if (r.status === 'completed') s.completed++;
    else if (r.status === 'no_show') s.noShow++;
    else if (r.status === 'cancelled') s.cancelled++;
    // encaissé : payé et non annulé
    if (r.deposit_paid && r.status !== 'cancelled') s.revenue += Number(r[amountField]) || 0;
  }
  return s;
}

export default function MonthlyReportScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [cursor, setCursor] = useState(() => new Date());
  const [beach, setBeach] = useState<Stats>(EMPTY);
  const [resto, setResto] = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { from, to } = monthBounds(cursor);
    const [b, r] = await Promise.all([
      supabase.from('beach_reservations').select('status, guest_count, deposit_paid, total_price').gte('date', from).lte('date', to),
      supabase.from('restaurant_reservations').select('status, guest_count, deposit_paid, deposit_amount').gte('date', from).lte('date', to),
    ]);
    setBeach(accumulate(b.data ?? [], 'total_price'));
    setResto(accumulate(r.data ?? [], 'deposit_amount'));
    setLoading(false);
  }, [cursor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const monthLabel = cursor.toLocaleDateString(i18n.locale, { month: 'long', year: 'numeric' });
  const isCurrentMonth = () => {
    const now = new Date();
    return cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth();
  };
  const move = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  const StatRow = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color ?? theme.text }]}>{value}</Text>
    </View>
  );

  const Section = ({ title, icon, tint, s, revenueLabel }: any) => (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={20} color={tint} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.bigCount, { color: tint }]}>{s.total}</Text>
      </View>
      <StatRow label="Confirmées" value={s.confirmed} />
      <StatRow label="Check-in faits" value={s.checkedIn} />
      <StatRow label="Terminées" value={s.completed} />
      <StatRow label="No-show" value={s.noShow} color={s.noShow ? colors.accentRed : undefined} />
      <StatRow label="Annulées" value={s.cancelled} color={s.cancelled ? colors.accentRed : undefined} />
      <View style={styles.divider} />
      <StatRow label="Total couverts / personnes" value={s.guests} />
      <StatRow label={revenueLabel} value={`${s.revenue.toFixed(0)} €`} color={colors.brand} />
    </Card>
  );

  const grandTotal = beach.total + resto.total;
  const grandRevenue = beach.revenue + resto.revenue;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Rapport mensuel',
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      {/* Navigateur de mois */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => move(-1)} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: theme.text }]}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => move(1)} style={[styles.navBtn, { opacity: isCurrentMonth() ? 0.3 : 1 }]} disabled={isCurrentMonth()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={theme.accent} />
      ) : (
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
          <Card style={[styles.card, { backgroundColor: colors.brand + '12', borderColor: colors.brand + '30' }]}>
            <Text style={[styles.totalTitle, { color: theme.text }]}>Total du mois</Text>
            <View style={styles.totalRow}>
              <View style={styles.totalItem}>
                <Text style={[styles.totalNum, { color: colors.brand }]}>{grandTotal}</Text>
                <Text style={[styles.totalSub, { color: theme.textSecondary }]}>réservations</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={[styles.totalNum, { color: colors.brand }]}>{grandRevenue.toFixed(0)} €</Text>
                <Text style={[styles.totalSub, { color: theme.textSecondary }]}>encaissé (brut)</Text>
              </View>
            </View>
          </Card>

          <Section title="Plage" icon="umbrella" tint={colors.terracotta} s={beach} revenueLabel="Encaissé transats (brut)" />
          <Section title="Restaurant" icon="restaurant" tint={colors.deepSea} s={resto} revenueLabel="Encaissé (no-show)" />

          <Text style={[styles.footnote, { color: theme.textSecondary }]}>
            « Encaissé brut » = paiements reçus, hors remboursements Stripe éventuels.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20, gap: 12 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingVertical: 14 },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 17, fontWeight: '700', textTransform: 'capitalize', minWidth: 160, textAlign: 'center' },
  card: { padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  bigCount: { fontSize: 24, fontWeight: '800' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 8 },
  totalTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalItem: { alignItems: 'center' },
  totalNum: { fontSize: 26, fontWeight: '800' },
  totalSub: { fontSize: 12, marginTop: 2 },
  footnote: { fontSize: 11, textAlign: 'center', marginTop: 4 },
});
