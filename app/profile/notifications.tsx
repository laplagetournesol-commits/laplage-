import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { i18n } from '@/shared/i18n';
import { supabase } from '@/shared/lib/supabase';

interface Notification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  event_id?: string | null;
  expires_at?: string | null;
  data?: any;
}

export default function NotificationsScreen() {
  const { theme } = useSunMode();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('push_notifications')
      .select('id, title, body, created_at, event_id, expires_at, data')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    // Filtrer les notifications expirées
    const now = new Date().toISOString();
    const filtered = (data ?? []).filter((n: any) => {
      if (n.expires_at && n.expires_at < now) return false;
      return true;
    });

    setNotifications(filtered);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  const handleRefresh = async () => { setRefreshing(true); await fetchNotifications(); setRefreshing(false); };

  const handlePress = (n: Notification) => {
    // Si lié à un événement, naviguer vers la page de l'événement
    const eventId = n.event_id || n.data?.event_id;
    if (eventId) {
      router.push(`/event/${eventId}`);
    }
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffH = Math.floor((now.getTime() - date.getTime()) / 3600000);
    if (diffH < 1) return i18n.t('justNow');
    if (diffH < 24) return i18n.t('hoursAgo').replace('{{count}}', String(diffH));
    return date.toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short' });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Notifications',
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
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.cardBorder} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{i18n.t('noNotifications')}</Text>
            </View>
          ) : (
            notifications.map((n) => {
              const eventId = n.event_id || n.data?.event_id;
              const isClickable = !!eventId;

              return (
                <TouchableOpacity
                  key={n.id}
                  activeOpacity={isClickable ? 0.7 : 1}
                  onPress={() => isClickable && handlePress(n)}
                >
                  <Card style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.notifTitle, { color: theme.text }]}>{n.title}</Text>
                        <Text style={[styles.notifBody, { color: theme.textSecondary }]}>{n.body}</Text>
                        <Text style={[styles.notifTime, { color: theme.textSecondary }]}>{formatTime(n.created_at)}</Text>
                      </View>
                      {isClickable && (
                        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
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
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifTitle: { fontSize: 15, fontWeight: '600' },
  notifBody: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  notifTime: { fontSize: 11, marginTop: 6 },
});
