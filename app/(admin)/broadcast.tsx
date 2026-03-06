import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { supabase } from '@/shared/lib/supabase';

type Segment = 'all' | 'vip' | 'gold+' | 'event_attendees';
type Channel = 'push' | 'email';

const SEGMENTS: { value: Segment; label: string; icon: string }[] = [
  { value: 'all', label: 'Tous les inscrits', icon: 'people' },
  { value: 'vip', label: 'VIP (Silver+)', icon: 'star' },
  { value: 'gold+', label: 'Gold & Platinum', icon: 'diamond' },
  { value: 'event_attendees', label: 'Participants events', icon: 'ticket' },
];

interface PastBroadcast {
  id: string;
  title: string;
  body: string;
  target_segment: string | null;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
}

export default function BroadcastScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [channels, setChannels] = useState<Channel[]>(['push']);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [history, setHistory] = useState<PastBroadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch recipient count
  useEffect(() => {
    const fetchCount = async () => {
      let query = supabase.from('profiles').select('id', { count: 'exact', head: true });

      if (segment === 'vip') {
        query = query.in('vip_level', ['silver', 'gold', 'platinum']);
      } else if (segment === 'gold+') {
        query = query.in('vip_level', ['gold', 'platinum']);
      } else if (segment === 'event_attendees') {
        const { count } = await supabase
          .from('event_tickets')
          .select('user_id', { count: 'exact', head: true })
          .in('status', ['active', 'used']);
        setRecipientCount(count ?? 0);
        return;
      }

      const { count } = await query;
      setRecipientCount(count ?? 0);
    };
    fetchCount();
  }, [segment]);

  // Fetch history
  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('push_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) setHistory(data as PastBroadcast[]);
      setLoadingHistory(false);
    };
    fetchHistory();
  }, []);

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Erreur', 'Le titre et le message sont obligatoires.');
      return;
    }
    if (channels.length === 0) {
      Alert.alert('Erreur', 'Sélectionnez au moins un canal (Push ou Email).');
      return;
    }

    Alert.alert(
      'Envoyer le broadcast',
      `Envoyer à ${recipientCount ?? '?'} personne(s) via ${channels.join(' + ')} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            setSending(true);
            try {
              // Save to push_notifications table
              const { data: notif, error } = await supabase
                .from('push_notifications')
                .insert({
                  title: title.trim(),
                  body: body.trim(),
                  target_segment: segment,
                  data: { channels },
                  sent_at: new Date().toISOString(),
                  sent_count: recipientCount ?? 0,
                })
                .select()
                .single();

              if (error) throw error;

              // Send push notifications
              if (channels.includes('push')) {
                let tokenQuery = supabase.from('push_tokens').select('token');

                if (segment === 'vip') {
                  tokenQuery = supabase
                    .from('push_tokens')
                    .select('token, profile:profiles!inner(vip_level)')
                    .in('profiles.vip_level', ['silver', 'gold', 'platinum']);
                } else if (segment === 'gold+') {
                  tokenQuery = supabase
                    .from('push_tokens')
                    .select('token, profile:profiles!inner(vip_level)')
                    .in('profiles.vip_level', ['gold', 'platinum']);
                }

                const { data: tokens } = await tokenQuery;
                if (tokens && tokens.length > 0) {
                  // Send via Expo Push API
                  const messages = tokens.map((t: any) => ({
                    to: t.token,
                    title: title.trim(),
                    body: body.trim(),
                    sound: 'default',
                  }));

                  await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(messages),
                  });
                }
              }

              // Add to history
              if (notif) {
                setHistory((prev) => [notif as PastBroadcast, ...prev]);
              }

              Alert.alert('Envoyé !', `Broadcast envoyé à ${recipientCount ?? 0} personne(s).`);
              setTitle('');
              setBody('');
            } catch (err: any) {
              Alert.alert('Erreur', err.message);
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{
        title: 'Broadcast',
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
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Nouveau message</Text>

        {/* Title */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Titre</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Titre du message"
          placeholderTextColor={theme.textSecondary}
        />

        {/* Body */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Message</Text>
        <TextInput
          style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
          value={body}
          onChangeText={setBody}
          placeholder="Votre message..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
        />

        {/* Segment */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Destinataires</Text>
        <View style={styles.segmentGrid}>
          {SEGMENTS.map((seg) => (
            <TouchableOpacity
              key={seg.value}
              style={[
                styles.segmentBtn,
                {
                  backgroundColor: segment === seg.value ? colors.deepSea : theme.card,
                  borderColor: segment === seg.value ? colors.deepSea : theme.cardBorder,
                },
              ]}
              onPress={() => setSegment(seg.value)}
            >
              <Ionicons
                name={seg.icon as any}
                size={16}
                color={segment === seg.value ? colors.white : theme.textSecondary}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  { color: segment === seg.value ? colors.white : theme.text },
                ]}
              >
                {seg.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {recipientCount !== null && (
          <Text style={[styles.recipientCount, { color: theme.textSecondary }]}>
            {recipientCount} destinataire{recipientCount > 1 ? 's' : ''}
          </Text>
        )}

        {/* Channels */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Canaux</Text>
        <View style={styles.channelRow}>
          <TouchableOpacity
            style={[
              styles.channelBtn,
              {
                backgroundColor: channels.includes('push') ? colors.sunYellow + '20' : theme.card,
                borderColor: channels.includes('push') ? colors.sunYellow : theme.cardBorder,
              },
            ]}
            onPress={() => toggleChannel('push')}
          >
            <Ionicons name="notifications" size={18} color={channels.includes('push') ? colors.warmWood : theme.textSecondary} />
            <Text style={[styles.channelBtnText, { color: channels.includes('push') ? colors.warmWood : theme.text }]}>
              Push
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.channelBtn,
              {
                backgroundColor: channels.includes('email') ? colors.deepSea + '15' : theme.card,
                borderColor: channels.includes('email') ? colors.deepSea : theme.cardBorder,
              },
            ]}
            onPress={() => toggleChannel('email')}
          >
            <Ionicons name="mail" size={18} color={channels.includes('email') ? colors.deepSea : theme.textSecondary} />
            <Text style={[styles.channelBtnText, { color: channels.includes('email') ? colors.deepSea : theme.text }]}>
              Email
            </Text>
          </TouchableOpacity>
        </View>

        {/* Send button */}
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.deepSea, opacity: sending ? 0.7 : 1 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={colors.white} />
              <Text style={styles.sendBtnText}>Envoyer le broadcast</Text>
            </>
          )}
        </TouchableOpacity>

        {/* History */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 32 }]}>Historique</Text>

        {loadingHistory ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Aucun broadcast envoyé</Text>
        ) : (
          history.map((item) => (
            <Card key={item.id} style={styles.historyCard}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.historyBody, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.body}
              </Text>
              <View style={styles.historyMeta}>
                <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                  {item.sent_at ? formatDate(item.sent_at) : 'Brouillon'}
                </Text>
                <Badge
                  label={`${item.sent_count} envoyé${item.sent_count > 1 ? 's' : ''}`}
                  variant="default"
                  size="sm"
                />
                {item.target_segment && (
                  <Badge
                    label={SEGMENTS.find((s) => s.value === item.target_segment)?.label ?? item.target_segment}
                    variant="default"
                    size="sm"
                  />
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  segmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  segmentBtnText: { fontSize: 13, fontWeight: '600' },
  recipientCount: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  channelRow: { flexDirection: 'row', gap: 12 },
  channelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  channelBtnText: { fontSize: 14, fontWeight: '600' },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, marginTop: 8 },
  historyCard: { marginBottom: 10 },
  historyTitle: { fontSize: 14, fontWeight: '700' },
  historyBody: { fontSize: 12, marginTop: 4 },
  historyMeta: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  historyDate: { fontSize: 11 },
});
