import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { TicketQRCode } from '@/features/events/components/TicketQRCode';
import { useAuth } from '@/contexts/AuthContext';
import { i18n } from '@/shared/i18n';
import { supabase } from '@/shared/lib/supabase';

interface Ticket {
  id: string;
  status: string;
  ticket_type: string;
  qr_code: string;
  event_title: string;
  event_date: string;
  price: number;
}

export default function MyTicketsScreen() {
  const { theme } = useSunMode();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrTicket, setQrTicket] = useState<Ticket | null>(null);

  const fetchTickets = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('event_tickets')
      .select('id, status, ticket_type, qr_code, price, event:events!inner(title, date)')
      .eq('user_id', user.id)
      .gte('event.date', today)
      .order('created_at', { ascending: false })
      .limit(30);

    setTickets((data ?? []).map((t: any) => ({
      id: t.id,
      status: t.status,
      ticket_type: t.ticket_type,
      qr_code: t.qr_code,
      price: t.price,
      event_title: t.event?.title ?? '',
      event_date: t.event?.date ?? '',
    })));
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [user]);

  const handleRefresh = async () => { setRefreshing(true); await fetchTickets(); setRefreshing(false); };

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  const isFuture = (d: string) => d >= new Date().toISOString().split('T')[0];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: i18n.t('myTickets'),
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.accent} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
        >
          {tickets.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="ticket-outline" size={48} color={theme.cardBorder} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{i18n.t('noTickets')}</Text>
            </View>
          ) : (
            tickets.map((t) => (
              <Card key={t.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.typeIcon, { backgroundColor: colors.accentRed + '15' }]}>
                    <Ionicons name="ticket" size={18} color={colors.accentRed} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>{t.event_title}</Text>
                    <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                      {formatDate(t.event_date)} • {t.ticket_type.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge
                      label={t.status === 'valid' ? i18n.t('valid') : t.status === 'used' ? i18n.t('used') : t.status}
                      variant={t.status === 'valid' ? 'success' : 'default'}
                      size="sm"
                    />
                    <Text style={[styles.price, { color: colors.brand }]}>{t.price}€</Text>
                  </View>
                </View>
              {/* QR code — uniquement pour les événements à venir */}
              {t.qr_code && isFuture(t.event_date) && t.status === 'valid' && (
                <TouchableOpacity
                  style={[styles.qrBtn, { backgroundColor: colors.accentRed + '12' }]}
                  onPress={() => setQrTicket(t)}
                >
                  <Ionicons name="qr-code" size={16} color={colors.accentRed} />
                  <Text style={[styles.qrBtnText, { color: colors.accentRed }]}>{i18n.t('viewQR')}</Text>
                </TouchableOpacity>
              )}
              </Card>
            ))
          )}
        </ScrollView>
      )}

      {qrTicket && (
        <TicketQRCode
          visible={!!qrTicket}
          onClose={() => setQrTicket(null)}
          ticket={{ qr_code: qrTicket.qr_code, ticket_type: qrTicket.ticket_type, status: qrTicket.status, price: qrTicket.price } as any}
          event={{ title: qrTicket.event_title, date: qrTicket.event_date } as any}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  price: { fontSize: 13, fontWeight: '700' },
  qrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 10, borderRadius: 10 },
  qrBtnText: { fontSize: 13, fontWeight: '700' },
});
