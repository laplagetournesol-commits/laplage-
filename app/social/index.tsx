import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { supabase } from '@/shared/lib/supabase';
import { i18n } from '@/shared/i18n';
import { useImagePicker } from '@/features/admin/hooks/useImagePicker';
import { usePresence } from '@/shared/hooks/usePresence';

interface Profile {
  user_id: string;
  nickname: string | null;
  photo_url: string | null;
  status: string | null;
  transat: string | null;
  visible: boolean;
  visible_date: string | null;
}
interface Conn {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
}

const ONLINE = '#22C55E';
const today = () => new Date().toISOString().slice(0, 10);

export default function SocialScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState('');
  const [present, setPresent] = useState<Profile[]>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const { pickAndUpload, uploading } = useImagePicker('assets', { aspect: [1, 1], quality: 0.5, prefix: 'social-' });
  const onlineIds = usePresence(uid);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.auth.getUser();
    const id = sess?.user?.id ?? null;
    setUid(id);
    if (!id) {
      setLoading(false);
      return;
    }
    // Mon profil (créé si absent)
    let { data: mine } = await supabase.from('social_profiles').select('*').eq('user_id', id).maybeSingle();
    if (!mine) {
      await supabase.from('social_profiles').insert({ user_id: id });
      mine = { user_id: id, nickname: null, photo_url: null, status: null, transat: null, visible: false, visible_date: null } as any;
    }
    setMe(mine as Profile);
    setNickname((mine as Profile).nickname ?? '');
    setStatus((mine as Profile).status ?? '');

    // Présents visibles aujourd'hui (hors moi)
    const { data: pres } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('visible', true)
      .eq('visible_date', today())
      .neq('user_id', id);
    setPresent((pres ?? []) as Profile[]);

    // Mes connexions (demandes + acceptées)
    const { data: cs } = await supabase.from('social_connections').select('*').or(`requester_id.eq.${id},addressee_id.eq.${id}`);
    setConns((cs ?? []) as Conn[]);

    // Profils des autres (présents + liés)
    const otherIds = new Set<string>();
    (pres ?? []).forEach((p: any) => otherIds.add(p.user_id));
    (cs ?? []).forEach((c: any) => otherIds.add(c.requester_id === id ? c.addressee_id : c.requester_id));
    otherIds.delete(id);
    if (otherIds.size) {
      const { data: profs } = await supabase.from('social_profiles').select('*').in('user_id', [...otherIds]);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => (map[p.user_id] = p));
      setProfilesById(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connWith = (otherId: string) => conns.find((c) => c.requester_id === otherId || c.addressee_id === otherId);

  const saveProfile = async (patch: Partial<Profile>) => {
    if (!uid) return;
    await supabase.from('social_profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', uid);
    setMe((m) => (m ? { ...m, ...patch } : m));
  };

  const toggleVisible = async (on: boolean) => {
    if (!uid) return;
    if (on) {
      // Besoin d'un transat du jour (présent)
      const { data: resas } = await supabase
        .from('beach_reservations')
        .select('id')
        .eq('user_id', uid)
        .eq('date', today())
        .in('status', ['confirmed', 'checked_in']);
      const rids = (resas ?? []).map((r) => r.id);
      let transat: string | null = null;
      if (rids.length) {
        const { data: links } = await supabase.from('beach_reservation_sunbeds').select('sunbed_id').in('reservation_id', rids).limit(1);
        const sid = links?.[0]?.sunbed_id;
        if (sid) {
          const { data: sb } = await supabase.from('sunbeds').select('label').eq('id', sid).single();
          transat = sb?.label ? String(sb.label) : null;
        }
      }
      if (!transat) {
        Alert.alert(i18n.t('socialNeedResaTitle') ?? 'Réservation requise', i18n.t('socialNeedResaMsg') ?? 'Réserve un transat aujourd\'hui pour être visible à la plage.');
        return;
      }
      await saveProfile({ visible: true, visible_date: today(), transat } as any);
    } else {
      await saveProfile({ visible: false } as any);
    }
  };

  const changePhoto = async () => {
    const url = await pickAndUpload();
    if (url) await saveProfile({ photo_url: url });
  };

  const sendRequest = async (otherId: string) => {
    if (!uid) return;
    const { error } = await supabase.from('social_connections').insert({ requester_id: uid, addressee_id: otherId, status: 'pending' });
    if (error && !/duplicate/i.test(error.message)) Alert.alert('Erreur', error.message);
    load();
  };
  const setConnStatus = async (id: string, s: string) => {
    await supabase.from('social_connections').update({ status: s, updated_at: new Date().toISOString() }).eq('id', id);
    load();
  };
  const block = (otherId: string) => {
    Alert.alert(i18n.t('socialBlock') ?? 'Bloquer', i18n.t('socialBlockConfirm') ?? 'Bloquer cette personne ? Elle ne pourra plus te contacter.', [
      { text: i18n.t('cancel') ?? 'Annuler', style: 'cancel' },
      {
        text: i18n.t('socialBlock') ?? 'Bloquer',
        style: 'destructive',
        onPress: async () => {
          if (!uid) return;
          const existing = connWith(otherId);
          if (existing) await supabase.from('social_connections').update({ status: 'blocked' }).eq('id', existing.id);
          else await supabase.from('social_connections').insert({ requester_id: uid, addressee_id: otherId, status: 'blocked' });
          load();
        },
      },
    ]);
  };
  const report = (otherId: string) => {
    Alert.alert(i18n.t('socialReport') ?? 'Signaler', i18n.t('socialReportConfirm') ?? 'Signaler un comportement inapproprié ?', [
      { text: i18n.t('cancel') ?? 'Annuler', style: 'cancel' },
      {
        text: i18n.t('socialReport') ?? 'Signaler',
        style: 'destructive',
        onPress: async () => {
          if (!uid) return;
          await supabase.from('social_reports').insert({ reporter_id: uid, reported_id: otherId, reason: 'app_report' });
          Alert.alert(i18n.t('socialReported') ?? 'Merci', i18n.t('socialReportedMsg') ?? 'Signalement envoyé à l\'équipe.');
        },
      },
    ]);
  };

  const requestsIn = conns.filter((c) => c.addressee_id === uid && c.status === 'pending');
  const accepted = conns.filter((c) => c.status === 'accepted');
  const acceptedIds = new Set(accepted.map((c) => (c.requester_id === uid ? c.addressee_id : c.requester_id)));

  const Avatar = ({ p, size = 46, ring }: { p?: Profile; size?: number; ring?: boolean }) => {
    const isOnline = !!p && onlineIds.has(p.user_id);
    const dot = Math.max(11, size * 0.28);
    return (
      <View style={{ width: size, height: size }}>
        {p?.photo_url ? (
          <Image source={{ uri: p.photo_url }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: ring ? 2 : 0, borderColor: '#fff' }} contentFit="cover" />
        ) : (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.textSecondary + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person" size={size * 0.5} color={theme.textSecondary} />
          </View>
        )}
        {isOnline && (
          <View style={{ position: 'absolute', right: -1, bottom: -1, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: ONLINE, borderWidth: 2, borderColor: theme.background }} />
        )}
      </View>
    );
  };

  const onlineLabel = i18n.t('socialOnline') ?? 'En ligne';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: i18n.t('socialTitle') ?? 'Connecte-toi',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />
      ) : !uid ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.muted, { color: theme.textSecondary }]}>{i18n.t('orderLoginMsg') ?? 'Connecte-toi pour rejoindre la communauté.'}</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.primaryBtn, { backgroundColor: colors.brand }]}>
            <Text style={styles.primaryTxt}>{i18n.t('login') ?? 'Se connecter'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 20 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        >
          {/* Mon profil — bandeau dégradé */}
          <LinearGradient colors={[colors.brand, colors.terracotta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.meRow}>
              <TouchableOpacity onPress={changePhoto} disabled={uploading}>
                {uploading ? (
                  <View style={styles.avatarLoad}><ActivityIndicator color="#fff" /></View>
                ) : (
                  <Avatar p={me ?? undefined} size={64} ring />
                )}
                <View style={[styles.camBadge, { backgroundColor: '#fff' }]}>
                  <Ionicons name="camera" size={11} color={colors.brand} />
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1, gap: 7 }}>
                <TextInput
                  value={nickname}
                  onChangeText={setNickname}
                  onBlur={() => saveProfile({ nickname: nickname.trim() || null })}
                  placeholder={i18n.t('socialNickname') ?? 'Ton pseudo'}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  style={styles.nick}
                />
                <TextInput
                  value={status}
                  onChangeText={setStatus}
                  onBlur={() => saveProfile({ status: status.trim() || null })}
                  placeholder={i18n.t('socialStatus') ?? 'Ton humeur du jour…'}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  style={styles.statusInput}
                />
              </View>
            </View>
            <View style={styles.visRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.visTitle}>{i18n.t('socialVisible') ?? 'Visible à la plage aujourd\'hui'}</Text>
                <Text style={styles.visSub}>{i18n.t('socialVisibleSub') ?? 'Les autres transats peuvent te voir et te dire bonjour.'}</Text>
              </View>
              <Switch value={!!me?.visible && me?.visible_date === today()} onValueChange={toggleVisible} trackColor={{ true: ONLINE, false: 'rgba(255,255,255,0.3)' }} thumbColor="#fff" />
            </View>
          </LinearGradient>

          {/* Demandes reçues */}
          {requestsIn.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={[styles.section, { color: theme.text }]}>{i18n.t('socialRequests') ?? 'Demandes de connexion'}</Text>
              {requestsIn.map((c) => {
                const p = profilesById[c.requester_id];
                return (
                  <View key={c.id} style={[styles.messRow, { backgroundColor: theme.textSecondary + '0D' }]}>
                    <Avatar p={p} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: theme.text }]}>{p?.nickname || 'Anonyme'}</Text>
                      {p?.transat ? <Text style={[styles.sub, { color: theme.textSecondary }]}>Transat {p.transat}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => setConnStatus(c.id, 'accepted')} style={[styles.smallBtn, { backgroundColor: colors.brand }]}>
                      <Text style={styles.smallBtnTxt}>{i18n.t('socialAccept') ?? 'Accepter'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setConnStatus(c.id, 'declined')} style={styles.iconBtn}>
                      <Ionicons name="close" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Mes connexions — façon Messenger */}
          {accepted.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={[styles.section, { color: theme.text }]}>{i18n.t('socialConnections') ?? 'Mes connexions'}</Text>
              {accepted.map((c) => {
                const otherId = c.requester_id === uid ? c.addressee_id : c.requester_id;
                const p = profilesById[otherId];
                const isOnline = onlineIds.has(otherId);
                return (
                  <TouchableOpacity key={c.id} onPress={() => router.push(`/social/chat?peer=${otherId}`)} style={[styles.messRow, { backgroundColor: theme.textSecondary + '0D' }]} activeOpacity={0.7}>
                    <Avatar p={p} size={52} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: theme.text }]}>{p?.nickname || 'Anonyme'}</Text>
                      <Text style={[styles.sub, { color: isOnline ? ONLINE : theme.textSecondary, fontWeight: isOnline ? '700' : '400' }]}>
                        {isOnline ? onlineLabel : p?.transat ? `Transat ${p.transat}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.chatPill, { backgroundColor: colors.brand + '16' }]}>
                      <Ionicons name="chatbubble-ellipses" size={20} color={colors.brand} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* À la plage aujourd'hui */}
          <View style={{ gap: 10 }}>
            <Text style={[styles.section, { color: theme.text }]}>{i18n.t('socialHereToday') ?? 'À la plage aujourd\'hui'}</Text>
            {present.length === 0 ? (
              <Text style={[styles.muted, { color: theme.textSecondary }]}>{i18n.t('socialNobody') ?? 'Personne d\'autre n\'est visible pour l\'instant.'}</Text>
            ) : (
              present.map((p) => {
                const c = connWith(p.user_id);
                const isAccepted = acceptedIds.has(p.user_id);
                const isPending = c?.status === 'pending';
                const isOnline = onlineIds.has(p.user_id);
                return (
                  <View key={p.user_id} style={[styles.messRow, { backgroundColor: theme.textSecondary + '0D' }]}>
                    <Avatar p={p} size={52} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: theme.text }]}>{p.nickname || 'Anonyme'}</Text>
                      <Text style={[styles.sub, { color: isOnline ? ONLINE : theme.textSecondary, fontWeight: isOnline ? '700' : '400' }]} numberOfLines={1}>
                        {isOnline ? `${onlineLabel}${p.transat ? ` · Transat ${p.transat}` : ''}` : `${p.transat ? `Transat ${p.transat}` : ''}${p.status ? `${p.transat ? ' · ' : ''}${p.status}` : ''}`}
                      </Text>
                    </View>
                    {isAccepted ? (
                      <TouchableOpacity onPress={() => router.push(`/social/chat?peer=${p.user_id}`)} style={[styles.smallBtn, { backgroundColor: colors.brand }]}>
                        <Text style={styles.smallBtnTxt}>{i18n.t('socialMessage') ?? 'Message'}</Text>
                      </TouchableOpacity>
                    ) : isPending ? (
                      <Text style={[styles.sub, { color: theme.textSecondary }]}>{i18n.t('socialPending') ?? 'Envoyée'}</Text>
                    ) : (
                      <TouchableOpacity onPress={() => sendRequest(p.user_id)} style={[styles.smallBtn, { backgroundColor: colors.brand }]}>
                        <Text style={styles.smallBtnTxt}>{i18n.t('socialConnect') ?? 'Se connecter'}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => Alert.alert(p.nickname || 'Profil', undefined, [
                      { text: i18n.t('socialReport') ?? 'Signaler', style: 'destructive', onPress: () => report(p.user_id) },
                      { text: i18n.t('socialBlock') ?? 'Bloquer', style: 'destructive', onPress: () => block(p.user_id) },
                      { text: i18n.t('cancel') ?? 'Annuler', style: 'cancel' },
                    ])} style={styles.iconBtn}>
                      <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  muted: { fontSize: 14, textAlign: 'center' },
  primaryBtn: { paddingVertical: 13, paddingHorizontal: 26, borderRadius: 12 },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  hero: { borderRadius: 20, padding: 16, gap: 16 },
  meRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatarLoad: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  camBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  nick: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16, fontWeight: '800', color: '#fff' },
  statusInput: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#fff' },
  visRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: 12 },
  visTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  visSub: { fontSize: 12, marginTop: 2, color: 'rgba(255,255,255,0.85)' },
  section: { fontSize: 17, fontWeight: '800' },
  messRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12 },
  name: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 2 },
  chatPill: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  smallBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  iconBtn: { padding: 6 },
});
