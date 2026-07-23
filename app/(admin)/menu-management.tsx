import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import { useImagePicker } from '@/features/admin/hooks/useImagePicker';

interface Family {
  family_id: number;
  name: string;
  enabled: boolean;
  sort_order: number;
  label_fr: string | null;
  label_es: string | null;
  label_en: string | null;
}
interface Item {
  product_id: number;
  name: string;
  price: number;
  vat_rate: number | null;
  family_id: number;
  prep_type: string | null;
  enabled: boolean;
  description: string | null;
  image_url: string | null;
}

export default function MenuManagementScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [families, setFamilies] = useState<Family[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Édition d'une catégorie (noms FR/ES/EN)
  const [editFam, setEditFam] = useState<Family | null>(null);
  const [famFr, setFamFr] = useState('');
  const [famEs, setFamEs] = useState('');
  const [famEn, setFamEn] = useState('');
  const [savingFam, setSavingFam] = useState(false);

  const openFamEditor = (f: Family) => {
    setEditFam(f);
    setFamFr(f.label_fr ?? '');
    setFamEs(f.label_es ?? '');
    setFamEn(f.label_en ?? '');
  };
  const saveFamLabels = async () => {
    if (!editFam) return;
    setSavingFam(true);
    const patch = { label_fr: famFr.trim() || null, label_es: famEs.trim() || null, label_en: famEn.trim() || null };
    const { error } = await supabase.from('app_menu_families').update(patch).eq('family_id', editFam.family_id);
    setSavingFam(false);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    setFamilies((prev) => prev.map((x) => (x.family_id === editFam.family_id ? { ...x, ...patch } : x)));
    setEditFam(null);
  };

  // Édition d'un article (ingrédients + photo)
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editImage, setEditImage] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  // Photo carrée, compressée -> miniature uniforme (bucket public 'assets')
  const { pickAndUpload, uploading } = useImagePicker('assets', { aspect: [1, 1], quality: 0.5, prefix: 'menu-' });

  const openEditor = (it: Item) => {
    setEditItem(it);
    setEditDesc(it.description ?? '');
    setEditImage(it.image_url ?? null);
  };

  const pickPhoto = async () => {
    const url = await pickAndUpload();
    if (url) setEditImage(url);
  };

  const saveItemDetails = async () => {
    if (!editItem) return;
    setSavingItem(true);
    const patch = { description: editDesc.trim() || null, image_url: editImage };
    const { error } = await supabase.from('app_menu_items').update(patch).eq('product_id', editItem.product_id);
    setSavingItem(false);
    if (error) {
      Alert.alert('Erreur', error.message);
      return;
    }
    setItems((prev) => prev.map((x) => (x.product_id === editItem.product_id ? { ...x, ...patch } : x)));
    setEditItem(null);
  };

  const load = useCallback(async () => {
    const [{ data: fams }, { data: its }] = await Promise.all([
      supabase.from('app_menu_families').select('*').order('sort_order'),
      supabase.from('app_menu_items').select('product_id,name,price,vat_rate,family_id,prep_type,enabled,description,image_url').order('name'),
    ]);
    setFamilies((fams ?? []) as Family[]);
    setItems((its ?? []) as Item[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const itemsByFamily = useMemo(() => {
    const m = new Map<number, Item[]>();
    for (const it of items) {
      if (!m.has(it.family_id)) m.set(it.family_id, []);
      m.get(it.family_id)!.push(it);
    }
    return m;
  }, [items]);

  const totalActive = useMemo(() => {
    const activeFams = new Set(families.filter((f) => f.enabled).map((f) => f.family_id));
    return items.filter((it) => it.enabled && activeFams.has(it.family_id)).length;
  }, [families, items]);

  const toggleFamily = async (f: Family, value: boolean) => {
    setFamilies((prev) => prev.map((x) => (x.family_id === f.family_id ? { ...x, enabled: value } : x)));
    const { error } = await supabase.from('app_menu_families').update({ enabled: value }).eq('family_id', f.family_id);
    if (error) {
      setFamilies((prev) => prev.map((x) => (x.family_id === f.family_id ? { ...x, enabled: !value } : x)));
      Alert.alert('Erreur', error.message);
    }
  };

  const toggleItem = async (it: Item, value: boolean) => {
    setItems((prev) => prev.map((x) => (x.product_id === it.product_id ? { ...x, enabled: value } : x)));
    const { error } = await supabase.from('app_menu_items').update({ enabled: value }).eq('product_id', it.product_id);
    if (error) {
      setItems((prev) => prev.map((x) => (x.product_id === it.product_id ? { ...x, enabled: !value } : x)));
      Alert.alert('Erreur', error.message);
    }
  };

  const setAllInFamily = async (familyId: number, value: boolean) => {
    const ids = (itemsByFamily.get(familyId) ?? []).map((i) => i.product_id);
    if (!ids.length) return;
    setItems((prev) => prev.map((x) => (x.family_id === familyId ? { ...x, enabled: value } : x)));
    const { error } = await supabase.from('app_menu_items').update({ enabled: value }).in('product_id', ids);
    if (error) {
      Alert.alert('Erreur', error.message);
      load();
    }
  };

  const resync = async () => {
    setSyncing(true);
    try {
      const r = await apiCall<{ families: number; items: number }>('/api/menu/sync');
      await load();
      Alert.alert('Carte resynchronisée', `${r.families} catégories, ${r.items} articles mis à jour depuis la caisse.`);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Synchronisation impossible');
    } finally {
      setSyncing(false);
    }
  };

  const famList = families.filter((f) => (itemsByFamily.get(f.family_id) ?? []).length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: 'Carte app',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 4 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {totalActive} article(s) proposé(s) dans l'app
            </Text>
            <TouchableOpacity onPress={resync} disabled={syncing} style={[styles.syncBtn, { backgroundColor: colors.brand }]}>
              {syncing ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Ionicons name="sync" size={16} color={colors.white} />
                  <Text style={styles.syncTxt}>Resynchroniser la caisse</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Un article apparaît dans l'app si sa catégorie ET lui-même sont activés.
          </Text>

          {famList.map((f) => {
            const its = itemsByFamily.get(f.family_id) ?? [];
            const activeCount = its.filter((i) => i.enabled).length;
            const isOpen = expanded === f.family_id;
            const prep = its[0]?.prep_type;
            return (
              <Card key={f.family_id} padded={false}>
                <TouchableOpacity
                  style={styles.famHeader}
                  onPress={() => setExpanded(isOpen ? null : f.family_id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.famTitleRow}>
                      <Text style={[styles.famName, { color: theme.text }]}>{f.label_fr || f.name}</Text>
                      {prep ? (
                        <View style={[styles.prepBadge, { backgroundColor: prep === 'BARRA' ? colors.deepSea : colors.terracotta }]}>
                          <Text style={styles.prepTxt}>{prep === 'BARRA' ? 'BAR' : 'CUISINE'}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.famSub, { color: theme.textSecondary }]}>
                      {f.label_fr ? `${f.name} · ` : ''}{activeCount}/{its.length} article(s) actif(s)
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => openFamEditor(f)} style={styles.editBtn}>
                    <Ionicons name="pencil" size={16} color={colors.brand} />
                  </TouchableOpacity>
                  <Switch
                    value={f.enabled}
                    onValueChange={(v) => toggleFamily(f, v)}
                    trackColor={{ true: colors.brand }}
                  />
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.textSecondary}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View style={[styles.itemsWrap, { borderTopColor: theme.textSecondary + '22' }]}>
                    <View style={styles.bulkRow}>
                      <TouchableOpacity onPress={() => setAllInFamily(f.family_id, true)} style={styles.bulkBtn}>
                        <Text style={[styles.bulkTxt, { color: colors.brand }]}>Tout activer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setAllInFamily(f.family_id, false)} style={styles.bulkBtn}>
                        <Text style={[styles.bulkTxt, { color: theme.textSecondary }]}>Tout désactiver</Text>
                      </TouchableOpacity>
                    </View>
                    {its.map((it) => (
                      <View key={it.product_id} style={styles.itemRow}>
                        {it.image_url ? (
                          <Image source={{ uri: it.image_url }} style={styles.thumb} contentFit="cover" />
                        ) : (
                          <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.textSecondary + '15' }]}>
                            <Ionicons
                              name={it.prep_type === 'BARRA' ? 'wine-outline' : 'restaurant-outline'}
                              size={16}
                              color={theme.textSecondary}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemName, { color: theme.text, opacity: f.enabled && it.enabled ? 1 : 0.5 }]}>
                            {it.name}
                          </Text>
                          <Text style={[styles.itemPrice, { color: theme.textSecondary }]} numberOfLines={1}>
                            {Number(it.price).toFixed(2)}€{it.vat_rate != null ? ` · TVA ${Math.round(it.vat_rate * 100)}%` : ''}
                            {it.description ? ` · ${it.description}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => openEditor(it)} style={styles.editBtn}>
                          <Ionicons name="create-outline" size={18} color={colors.brand} />
                        </TouchableOpacity>
                        <Switch value={it.enabled} onValueChange={(v) => toggleItem(it, v)} trackColor={{ true: colors.brand }} />
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* Éditeur catégorie : noms FR/ES/EN */}
      <Modal visible={!!editFam} transparent animationType="slide" onRequestClose={() => setEditFam(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.background }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                {editFam?.name}
              </Text>
              <TouchableOpacity onPress={() => setEditFam(null)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              Nom affiché au client (ex. « Entrées »). Vide = nom d'origine ({editFam?.name}).
            </Text>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>🇫🇷 Français</Text>
            <TextInput value={famFr} onChangeText={setFamFr} placeholder="Ex : Entrées" placeholderTextColor={theme.textSecondary} style={[styles.famInput, { color: theme.text, borderColor: theme.textSecondary + '33' }]} />
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>🇪🇸 Español</Text>
            <TextInput value={famEs} onChangeText={setFamEs} placeholder="Ej : Entrantes" placeholderTextColor={theme.textSecondary} style={[styles.famInput, { color: theme.text, borderColor: theme.textSecondary + '33' }]} />
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>🇬🇧 English</Text>
            <TextInput value={famEn} onChangeText={setFamEn} placeholder="Ex : Starters" placeholderTextColor={theme.textSecondary} style={[styles.famInput, { color: theme.text, borderColor: theme.textSecondary + '33' }]} />
            <TouchableOpacity onPress={saveFamLabels} disabled={savingFam} style={[styles.saveBtn, { backgroundColor: colors.brand }]}>
              {savingFam ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveTxt}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Éditeur article : ingrédients + photo */}
      <Modal visible={!!editItem} transparent animationType="slide" onRequestClose={() => setEditItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.background }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                {editItem?.name}
              </Text>
              <TouchableOpacity onPress={() => setEditItem(null)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={pickPhoto} disabled={uploading} style={styles.photoPick} activeOpacity={0.7}>
              {editImage ? (
                <Image source={{ uri: editImage }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={[styles.photoPreview, styles.photoEmpty, { backgroundColor: theme.textSecondary + '15' }]}>
                  {uploading ? (
                    <ActivityIndicator color={colors.brand} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={26} color={theme.textSecondary} />
                      <Text style={[styles.photoHint, { color: theme.textSecondary }]}>Ajouter une photo</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
            {editImage ? (
              <View style={styles.photoActions}>
                <TouchableOpacity onPress={pickPhoto} disabled={uploading}>
                  <Text style={[styles.photoAction, { color: colors.brand }]}>Changer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditImage(null)}>
                  <Text style={[styles.photoAction, { color: colors.accentRed }]}>Retirer</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Ingrédients / description</Text>
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Ex : Rhum, menthe, citron vert, fruits rouges"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.textArea, { color: theme.text, borderColor: theme.textSecondary + '33' }]}
            />

            <TouchableOpacity onPress={saveItemDetails} disabled={savingItem} style={[styles.saveBtn, { backgroundColor: colors.brand }]}>
              {savingItem ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveTxt}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  subtitle: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  syncTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hint: { fontSize: 12, fontStyle: 'italic' },
  famHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  famTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  famName: { fontSize: 16, fontWeight: '700' },
  famSub: { fontSize: 12, marginTop: 2 },
  prepBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  prepTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  itemsWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingBottom: 8 },
  bulkRow: { flexDirection: 'row', gap: 16, paddingVertical: 10 },
  bulkBtn: { paddingVertical: 2 },
  bulkTxt: { fontSize: 13, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemPrice: { fontSize: 12, marginTop: 1 },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  editBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800', flex: 1, marginRight: 12 },
  photoPick: { alignSelf: 'center' },
  photoPreview: { width: 120, height: 120, borderRadius: 14 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoHint: { fontSize: 11 },
  photoActions: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  photoAction: { fontSize: 13, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 70, fontSize: 14, textAlignVertical: 'top' },
  famInput: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 15 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
