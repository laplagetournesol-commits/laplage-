import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import { usePayment } from '@/shared/hooks/usePayment';
import { i18n } from '@/shared/i18n';

interface MenuItem {
  product_id: number;
  name: string;
  price: number;
  family_id: number;
  family_name: string | null;
  prep_type: string | null;
  description: string | null;
  image_url: string | null;
}

function emojiFor(familyName: string | null, prep: string | null): string {
  const n = (familyName ?? '').toUpperCase();
  if (/COCKTAIL/.test(n)) return '🍸';
  if (/WINE|VINO|VIN/.test(n)) return '🍷';
  if (/CERVEZA|BEER|BIÈRE/.test(n)) return '🍺';
  if (/CAFE|CAFÉ|TE|TÉ/.test(n)) return '☕';
  if (/AGUA|WATER|EAU/.test(n)) return '💧';
  if (/RON|WHISK|ALCOHOL/.test(n)) return '🥃';
  if (/BEBIDA|REFRESCO|DRINK/.test(n)) return '🥤';
  if (/DESSERT|POSTRE/.test(n)) return '🍰';
  if (/PIZZA/.test(n)) return '🍕';
  if (/BURGER|HAMBUR/.test(n)) return '🍔';
  if (/FRUIT|FRUTA/.test(n)) return '🍓';
  return prep === 'BARRA' ? '🍹' : '🍽️';
}

export default function OrderScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [checkout, setCheckout] = useState(false);
  const [sunbed, setSunbed] = useState('');
  const [paying, setPaying] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [famLabels, setFamLabels] = useState<Record<number, string>>({});
  const [famOrder, setFamOrder] = useState<Record<number, number>>({});
  const { payWithClientSecret } = usePayment();

  const toggleCat = (fam: string) =>
    setOpenCats((s) => {
      const n = new Set(s);
      if (n.has(fam)) n.delete(fam);
      else n.add(fam);
      return n;
    });

  const load = useCallback(async () => {
    // Familles activées + libellés traduits
    const { data: fams } = await supabase
      .from('app_menu_families')
      .select('family_id,name,label_fr,label_es,label_en,sort_order')
      .eq('enabled', true);
    const okFams = new Set((fams ?? []).map((f) => f.family_id));
    const loc = (i18n.locale || 'fr').slice(0, 2);
    const labels: Record<number, string> = {};
    const order: Record<number, number> = {};
    for (const f of fams ?? []) {
      const l = loc === 'es' ? f.label_es : loc === 'en' ? f.label_en : f.label_fr;
      labels[f.family_id] = l || f.name;
      order[f.family_id] = f.sort_order ?? 0;
    }
    setFamLabels(labels);
    setFamOrder(order);
    const { data: its } = await supabase
      .from('app_menu_items')
      .select('product_id,name,price,family_id,family_name,prep_type,description,image_url')
      .eq('enabled', true)
      .order('family_id');
    setItems((its ?? []).filter((it) => okFams.has(it.family_id)) as MenuItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Pré-remplir le transat depuis une réservation plage active aujourd'hui
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess?.user?.id;
      if (!uid) return;
      const { data: resa } = await supabase
        .from('beach_reservations')
        .select('id')
        .eq('user_id', uid)
        .eq('date', today)
        .in('status', ['confirmed', 'checked_in'])
        .limit(1)
        .maybeSingle();
      if (resa?.id) {
        const { data: links } = await supabase.from('beach_reservation_sunbeds').select('sunbed_id').eq('reservation_id', resa.id).limit(1);
        const sid = links?.[0]?.sunbed_id;
        if (sid) {
          const { data: sb } = await supabase.from('sunbeds').select('label').eq('id', sid).single();
          if (sb?.label) setSunbed(String(sb.label));
        }
      }
    })();
  }, [load]);

  const grouped = useMemo(() => {
    const m = new Map<number, MenuItem[]>();
    for (const it of items) {
      if (!m.has(it.family_id)) m.set(it.family_id, []);
      m.get(it.family_id)!.push(it);
    }
    return Array.from(m.entries())
      .sort((a, b) => (famOrder[a[0]] ?? 0) - (famOrder[b[0]] ?? 0))
      .map(([fid, its]) => [famLabels[fid] ?? its[0]?.family_name ?? 'Autres', its] as [string, MenuItem[]]);
  }, [items, famLabels, famOrder]);

  const byId = useMemo(() => new Map(items.map((i) => [i.product_id, i])), [items]);
  const cartLines = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ item: byId.get(Number(id))!, qty })).filter((l) => l.item && l.qty > 0),
    [cart, byId],
  );
  const total = useMemo(() => cartLines.reduce((s, l) => s + l.item.price * l.qty, 0), [cartLines]);
  const count = useMemo(() => cartLines.reduce((s, l) => s + l.qty, 0), [cartLines]);

  const add = (id: number) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));

  const pay = async () => {
    if (!sunbed.trim()) {
      Alert.alert(i18n.t('error') ?? 'Erreur', i18n.t('orderNeedSunbed') ?? 'Indique ton numéro de transat.');
      return;
    }
    if (cartLines.length === 0) return;
    setPaying(true);
    try {
      const { clientSecret } = await apiCall<{ clientSecret: string }>('/api/menu/order', {
        sunbed: sunbed.trim(),
        lines: cartLines.map((l) => ({ product_id: l.item.product_id, qty: l.qty })),
      });
      if (!clientSecret) {
        Alert.alert(i18n.t('error') ?? 'Erreur', i18n.t('orderFailed') ?? 'Commande impossible.');
        return;
      }
      const result = await payWithClientSecret(clientSecret);
      if (!result.success) return;
      setCart({});
      setCheckout(false);
      Alert.alert(
        i18n.t('orderConfirmedTitle') ?? 'Commande envoyée ! 🍹',
        (i18n.t('orderConfirmedMsg') ?? 'Ta commande arrive au transat {{sunbed}}.').replace('{{sunbed}}', sunbed.trim()),
      );
    } catch (e: any) {
      Alert.alert(i18n.t('error') ?? 'Erreur', e?.message ?? 'Commande impossible.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: i18n.t('orderTitle'),
          headerShown: true,
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ paddingHorizontal: 4 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="fast-food-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.emptyTxt, { color: theme.textSecondary }]}>
            {i18n.t('orderNoItems') ?? 'La carte n\'est pas encore disponible.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: count > 0 ? 120 : insets.bottom + 40, gap: 20 }}>
          {grouped.map(([fam, its]) => {
            const open = openCats.has(fam);
            const inCart = its.reduce((s, it) => s + (cart[it.product_id] ?? 0), 0);
            return (
            <View key={fam} style={{ gap: 10 }}>
              <TouchableOpacity style={[styles.catHeader, { backgroundColor: theme.textSecondary + '0D' }]} onPress={() => toggleCat(fam)} activeOpacity={0.7}>
                <Text style={[styles.catTitle, { color: theme.text }]}>{fam}</Text>
                <View style={styles.catRight}>
                  {inCart > 0 ? (
                    <View style={[styles.catBadge, { backgroundColor: colors.brand }]}>
                      <Text style={styles.catBadgeTxt}>{inCart}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.catCount, { color: theme.textSecondary }]}>{its.length}</Text>
                  )}
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
              {open && its.map((it) => {
                const qty = cart[it.product_id] ?? 0;
                return (
                  <View key={it.product_id} style={[styles.item, { borderColor: theme.textSecondary + '18' }]}>
                    {it.image_url ? (
                      <Image source={{ uri: it.image_url }} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmoji, { backgroundColor: theme.textSecondary + '12' }]}>
                        <Text style={{ fontSize: 26 }}>{emojiFor(it.family_name, it.prep_type)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: theme.text }]}>{it.name}</Text>
                      {it.description ? (
                        <Text style={[styles.itemDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                          {it.description}
                        </Text>
                      ) : null}
                      <Text style={[styles.itemPrice, { color: colors.brand }]}>{Number(it.price).toFixed(2)}€</Text>
                    </View>
                    {qty > 0 ? (
                      <View style={styles.stepper}>
                        <TouchableOpacity onPress={() => sub(it.product_id)} style={[styles.stepBtn, { backgroundColor: theme.textSecondary + '18' }]}>
                          <Ionicons name="remove" size={18} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.qty, { color: theme.text }]}>{qty}</Text>
                        <TouchableOpacity onPress={() => add(it.product_id)} style={[styles.stepBtn, { backgroundColor: colors.brand }]}>
                          <Ionicons name="add" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => add(it.product_id)} style={[styles.addBtn, { backgroundColor: colors.brand }]}>
                        <Ionicons name="add" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
            );
          })}
        </ScrollView>
      )}

      {count > 0 && (
        <TouchableOpacity
          style={[styles.cartBar, { bottom: insets.bottom + 12, backgroundColor: colors.brand }]}
          onPress={() => setCheckout(true)}
          activeOpacity={0.85}
        >
          <View style={styles.cartCount}>
            <Text style={styles.cartCountTxt}>{count}</Text>
          </View>
          <Text style={styles.cartBarTxt}>{i18n.t('orderSeeCart') ?? 'Voir la commande'}</Text>
          <Text style={styles.cartBarTotal}>{total.toFixed(2)}€</Text>
        </TouchableOpacity>
      )}

      {/* Récap + paiement */}
      <Modal visible={checkout} transparent animationType="slide" onRequestClose={() => setCheckout(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{i18n.t('orderYourOrder') ?? 'Ta commande'}</Text>
              <TouchableOpacity onPress={() => setCheckout(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 260 }}>
              {cartLines.map((l) => (
                <View key={l.item.product_id} style={styles.recapRow}>
                  <Text style={[styles.recapQty, { color: colors.brand }]}>{l.qty}×</Text>
                  <Text style={[styles.recapName, { color: theme.text }]} numberOfLines={1}>{l.item.name}</Text>
                  <Text style={[styles.recapPrice, { color: theme.textSecondary }]}>{(l.item.price * l.qty).toFixed(2)}€</Text>
                </View>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{i18n.t('orderYourSunbed') ?? 'Ton numéro de transat'}</Text>
            <TextInput
              value={sunbed}
              onChangeText={setSunbed}
              placeholder="Ex : 615"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              style={[styles.input, { color: theme.text, borderColor: theme.textSecondary + '33' }]}
            />

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>{i18n.t('total') ?? 'Total'}</Text>
              <Text style={[styles.totalVal, { color: theme.text }]}>{total.toFixed(2)}€</Text>
            </View>
            <TouchableOpacity onPress={pay} disabled={paying} style={[styles.payBtn, { backgroundColor: colors.brand, opacity: paying ? 0.7 : 1 }]}>
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payTxt}>{(i18n.t('pay') ?? 'Payer')} {total.toFixed(2)}€</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTxt: { fontSize: 15, textAlign: 'center' },
  catTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
  catHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12 },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catCount: { fontSize: 14, fontWeight: '700' },
  catBadge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  catBadgeTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 10 },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  thumbEmoji: { alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '700' },
  itemDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  itemPrice: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 16, fontWeight: '800', minWidth: 18, textAlign: 'center' },
  cartBar: {
    position: 'absolute', left: 16, right: 16, height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  cartCount: { backgroundColor: '#ffffff33', borderRadius: 12, minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  cartCountTxt: { color: '#fff', fontWeight: '800' },
  cartBarTxt: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1 },
  cartBarTotal: { color: '#fff', fontWeight: '800', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  recapQty: { fontSize: 15, fontWeight: '800', minWidth: 28 },
  recapName: { flex: 1, fontSize: 15 },
  recapPrice: { fontSize: 14, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalVal: { fontSize: 20, fontWeight: '900' },
  payBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  payTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
