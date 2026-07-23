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
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { supabase } from '@/shared/lib/supabase';
import { i18n } from '@/shared/i18n';
import { usePresence } from '@/shared/hooks/usePresence';

let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // sélecteur d'images indispo si pas de build natif
}

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  kind?: string;
  attachment_url?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

const ONLINE = '#22C55E';
const canRecord = Platform.OS !== 'web';

const fmt = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Bulle audio — un lecteur par note vocale (bouton play + durée). */
function AudioBubble({ uri, durationMs, mine, tint }: { uri: string; durationMs?: number | null; mine: boolean; tint: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  const total = durationMs ? durationMs / 1000 : status.duration || 0;
  const pos = status.currentTime || 0;
  const pct = total > 0 ? Math.min(1, pos / total) : 0;

  const toggle = () => {
    if (playing) {
      player.pause();
    } else {
      if (status.currentTime >= (status.duration || 0) && status.duration > 0) player.seekTo(0);
      player.play();
    }
  };

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={styles.audioRow}>
      <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={34} color={mine ? '#fff' : tint} />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={[styles.audioTrack, { backgroundColor: mine ? 'rgba(255,255,255,0.35)' : tint + '33' }]}>
          <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 2, backgroundColor: mine ? '#fff' : tint }} />
        </View>
        <Text style={{ color: mine ? 'rgba(255,255,255,0.9)' : tint, fontSize: 11, fontVariant: ['tabular-nums'] }}>
          {fmt(playing || pos > 0 ? pos * 1000 : (durationMs ?? 0))}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

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
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const onlineIds = usePresence(uid);
  const peerOnline = onlineIds.has(peerId);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder, 250);

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
    await supabase.from('social_messages').update({ read: true }).eq('recipient_id', id).eq('sender_id', peerId).eq('read', false);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, [peerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Temps réel : messages entrants de ce contact
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

  const pushMine = (m: Msg) => {
    setMsgs((prev) => [...prev, m]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const insertMsg = async (fields: Partial<Msg>) => {
    if (!uid || !peerId) return;
    const { data, error } = await supabase
      .from('social_messages')
      .insert({ sender_id: uid, recipient_id: peerId, body: '', kind: 'text', ...fields })
      .select('*')
      .single();
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    if (data) pushMine(data as Msg);
  };

  const uploadToAssets = async (uri: string, prefix: string, contentType: string, ext: string): Promise<string | null> => {
    try {
      const fileName = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const resp = await fetch(uri);
      const buf = await resp.arrayBuffer();
      const { error } = await supabase.storage.from('assets').upload(fileName, buf, { contentType, upsert: false });
      if (error) {
        Alert.alert('Erreur upload', error.message);
        return null;
      }
      return supabase.storage.from('assets').getPublicUrl(fileName).data.publicUrl;
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Upload impossible');
      return null;
    }
  };

  const sendText = async () => {
    const body = text.trim();
    if (!body || !uid || !peerId) return;
    setText('');
    await insertMsg({ kind: 'text', body });
  };

  const sendPhoto = async () => {
    if (!ImagePicker) {
      Alert.alert('Non disponible', 'Le sélecteur de photos nécessite un build natif.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (res.canceled || !res.assets[0]) return;
    setSending(true);
    const asset = res.assets[0];
    const ext = (asset.uri.split('.').pop() || 'jpg').split('?')[0];
    const url = await uploadToAssets(asset.uri, 'chat-', asset.mimeType ?? 'image/jpeg', ext);
    if (url) await insertMsg({ kind: 'image', attachment_url: url });
    setSending(false);
  };

  const startRec = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Micro', 'Autorise le micro pour enregistrer une note vocale.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const cancelRec = async () => {
    try {
      await recorder.stop();
    } catch {}
    await setAudioModeAsync({ allowsRecording: false });
  };

  const stopAndSend = async () => {
    const dur = recState.durationMillis;
    try {
      await recorder.stop();
    } catch {}
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    if (!uri || dur < 700) return; // ignore les enregistrements < 0,7s
    setSending(true);
    const url = await uploadToAssets(uri, 'chat-audio-', 'audio/m4a', 'm4a');
    if (url) await insertMsg({ kind: 'audio', attachment_url: url, duration_ms: dur });
    setSending(false);
  };

  const PeerAvatar = ({ size = 34 }: { size?: number }) =>
    peerPhoto ? (
      <Image source={{ uri: peerPhoto }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
    ) : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.textSecondary + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="person" size={size * 0.5} color={theme.textSecondary} />
      </View>
    );

  const recording = recState.isRecording;

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
              const isImage = m.kind === 'image' && m.attachment_url;
              const isAudio = m.kind === 'audio' && m.attachment_url;
              const bubbleBg = mine ? colors.brand : theme.textSecondary + '1F';
              return (
                <View
                  key={m.id}
                  style={[
                    isImage ? styles.imageBubble : styles.bubble,
                    { marginTop: grouped ? 1 : 8, backgroundColor: isImage ? 'transparent' : bubbleBg },
                    mine
                      ? { alignSelf: 'flex-end', borderBottomRightRadius: grouped ? 18 : 5 }
                      : { alignSelf: 'flex-start', borderBottomLeftRadius: grouped ? 18 : 5 },
                  ]}
                >
                  {isImage ? (
                    <Image source={{ uri: m.attachment_url! }} style={styles.chatImage} contentFit="cover" />
                  ) : isAudio ? (
                    <AudioBubble uri={m.attachment_url!} durationMs={m.duration_ms} mine={mine} tint={colors.brand} />
                  ) : (
                    <Text style={{ color: mine ? '#fff' : theme.text, fontSize: 15.5, lineHeight: 21 }}>{m.body}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        {recording ? (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8, borderTopColor: theme.textSecondary + '22', backgroundColor: theme.background }]}>
            <TouchableOpacity onPress={cancelRec} style={styles.iconRound}>
              <Ionicons name="trash" size={22} color={colors.accentRed} />
            </TouchableOpacity>
            <View style={[styles.recBar, { backgroundColor: colors.accentRed + '14' }]}>
              <View style={styles.recDot} />
              <Text style={{ color: colors.accentRed, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmt(recState.durationMillis)}</Text>
            </View>
            <TouchableOpacity onPress={stopAndSend} style={[styles.sendBtn, { backgroundColor: colors.brand }]}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8, borderTopColor: theme.textSecondary + '22', backgroundColor: theme.background }]}>
            <TouchableOpacity onPress={sendPhoto} disabled={sending} style={styles.iconRound}>
              {sending ? <ActivityIndicator color={colors.brand} /> : <Ionicons name="image" size={24} color={colors.brand} />}
            </TouchableOpacity>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={i18n.t('socialTypeMessage') ?? 'Écris un message…'}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.textSecondary + '14' }]}
              multiline
            />
            {text.trim() ? (
              <TouchableOpacity onPress={sendText} style={[styles.sendBtn, { backgroundColor: colors.brand }]}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            ) : canRecord ? (
              <TouchableOpacity onPress={startRec} style={[styles.sendBtn, { backgroundColor: colors.brand }]}>
                <Ionicons name="mic" size={20} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
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
  imageBubble: { maxWidth: '70%', borderRadius: 18, overflow: 'hidden', padding: 0 },
  chatImage: { width: 210, height: 210, borderRadius: 18 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180 },
  audioTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15, maxHeight: 100 },
  iconRound: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  recBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, borderRadius: 20, paddingHorizontal: 16 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
