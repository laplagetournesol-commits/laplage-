import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { supabase } from '@/shared/lib/supabase';
import { i18n } from '@/shared/i18n';
import { usePresence } from '@/shared/hooks/usePresence';

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

const ONLINE = '#22C55E';

export default function ChatScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { peer } = useLocalSearchParams<{ peer?: string }>();
  const peerId = typeof peer === 'string' ? peer : '';
  const [uid, setUid] = useState<string | null>(null);
  const [peerName, setPeerName] = useState('');
  const [peerPhoto, setPeerPhoto] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const onlineIds = usePresence(uid);
  const peerOnline = onlineIds.has(peerId);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getUser();
    const id = sess?.user?.id ?? null;
    setUid(id);
    if (!id || !peerId) {
      setLoading(false);
      return;
    }
    const { data: prof } = await supabase.from('social_profiles').select('nickname, photo_url').eq('user_id', peerId).maybeSingle();
    setPeerName(prof?.nickname || (i18n.t('socialAnonymous') ?? 'Anonyme'));
    setPeerPhoto(prof?.photo_url ?? null);
    const { data } = await supabase
      .from('social_messages')
      .select('*')
      .or(`and(sender_id.eq.${id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${id})`)
      .order('created_at', { ascending: true })
      .limit(200);
    setMsgs((data ?? []) as Msg[]);
    // Marquer reçus comme lus
    await supabase.from('social_messages').update({ read: true }).eq('recipient_id', id).eq('sender_id', peerId).eq('read', false);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, [peerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Temps réel : nouveaux messages entrants de ce contact
  useEffect(() => {
    if (!uid || !peerId) return;
    const ch = supabase
      .channel(`chat-${uid}-${peerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_messages', filter: `recipient_id=eq.${uid}` },
        (payload) => {
          const m = payload.new as Msg;
          if (m.sender_id === peerId) {
            setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid, peerId]);

  const send = async () => {
    const body = text.trim();
    if (!body || !uid || !peerId) return;
    setText('');
    const { data, error } = await supabase
      .from('social_messages')
      .insert({ sender_id: uid, recipient_id: peerId, body })
      .select('*')
      .single();
    if (!error && data) {
      setMsgs((prev) => [...prev, data as Msg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const PeerAvatar = ({ size = 34 }: { size?: number }) =>
    peerPhoto ? (
      <Image source={{ uri: peerPhoto }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
    ) : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.textSecondary + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="person" size={size * 0.5} color={theme.textSecondary} />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <View>
                <PeerAvatar />
                {peerOnline && <View style={[styles.headerDot, { borderColor: theme.background }]} />}
              </View>
              <View>
                <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>{peerName}</Text>
                {peerOnline && <Text style={styles.headerOnline}>{i18n.t('socialOnline') ?? 'En ligne'}</Text>}
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 14, gap: 3, paddingBottom: 20 }}>
            {msgs.length === 0 && (
              <View style={styles.emptyWrap}>
                <Ionicons name="chatbubbles-outline" size={38} color={theme.textSecondary} />
                <Text style={[styles.emptyTxt, { color: theme.textSecondary }]}>{i18n.t('socialTypeMessage') ?? 'Écris un message…'}</Text>
              </View>
            )}
            {msgs.map((m, i) => {
              const mine = m.sender_id === uid;
              const prev = msgs[i - 1];
              const grouped = prev && prev.sender_id === m.sender_id;
              return (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    { marginTop: grouped ? 1 : 8 },
                    mine
                      ? { alignSelf: 'flex-end', backgroundColor: colors.brand, borderBottomRightRadius: grouped ? 18 : 5 }
                      : { alignSelf: 'flex-start', backgroundColor: theme.textSecondary + '1F', borderBottomLeftRadius: grouped ? 18 : 5 },
                  ]}
                >
                  <Text style={{ color: mine ? '#fff' : theme.text, fontSize: 15.5, lineHeight: 21 }}>{m.body}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8, borderTopColor: theme.textSecondary + '22', backgroundColor: theme.background }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={i18n.t('socialTypeMessage') ?? 'Écris un message…'}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.textSecondary + '14' }]}
            multiline
          />
          <TouchableOpacity onPress={send} disabled={!text.trim()} style={[styles.sendBtn, { backgroundColor: colors.brand, opacity: text.trim() ? 1 : 0.5 }]}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerDot: { position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 5.5, backgroundColor: ONLINE, borderWidth: 2 },
  headerName: { fontSize: 16, fontWeight: '800', maxWidth: 180 },
  headerOnline: { fontSize: 11.5, color: ONLINE, fontWeight: '700', marginTop: 1 },
  emptyWrap: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyTxt: { fontSize: 14 },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingVertical: 9, paddingHorizontal: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
