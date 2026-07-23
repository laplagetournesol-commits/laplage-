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
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { supabase } from '@/shared/lib/supabase';
import { i18n } from '@/shared/i18n';

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

export default function ChatScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { peer } = useLocalSearchParams<{ peer?: string }>();
  const peerId = typeof peer === 'string' ? peer : '';
  const [uid, setUid] = useState<string | null>(null);
  const [peerName, setPeerName] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getUser();
    const id = sess?.user?.id ?? null;
    setUid(id);
    if (!id || !peerId) {
      setLoading(false);
      return;
    }
    const { data: prof } = await supabase.from('social_profiles').select('nickname').eq('user_id', peerId).maybeSingle();
    setPeerName(prof?.nickname || (i18n.t('socialAnonymous') ?? 'Anonyme'));
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: peerName || (i18n.t('socialMessage') ?? 'Message'),
          headerShown: true,
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
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 14, gap: 8 }}>
            {msgs.map((m) => {
              const mine = m.sender_id === uid;
              return (
                <View key={m.id} style={[styles.bubble, mine ? { alignSelf: 'flex-end', backgroundColor: colors.brand } : { alignSelf: 'flex-start', backgroundColor: theme.textSecondary + '20' }]}>
                  <Text style={{ color: mine ? '#fff' : theme.text, fontSize: 15 }}>{m.body}</Text>
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
  bubble: { maxWidth: '78%', borderRadius: 16, paddingVertical: 9, paddingHorizontal: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
