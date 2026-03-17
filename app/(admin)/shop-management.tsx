import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { supabase } from '@/shared/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  is_available: boolean;
  stock_quantity: number;
  sort_order: number;
}

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  price: '',
  image_url: '',
  category: 'general',
  stock_quantity: '',
};

export default function ShopManagementScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadProducts = useCallback(async () => {
    const { data } = await supabase
      .from('shop_products')
      .select('*')
      .order('sort_order')
      .order('created_at');
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_PRODUCT);
    setShowForm(true);
  };

  const openEditForm = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      image_url: p.image_url ?? '',
      category: p.category,
      stock_quantity: String(p.stock_quantity),
    });
    setShowForm(true);
  };

  const saveProduct = async () => {
    if (!form.name.trim() || !form.price) {
      Alert.alert('Erreur', 'Nom et prix sont obligatoires');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      image_url: form.image_url.trim() || null,
      category: form.category || 'general',
      stock_quantity: parseInt(form.stock_quantity, 10) || 0,
    };

    if (editingId) {
      await supabase.from('shop_products').update(payload).eq('id', editingId);
    } else {
      await supabase.from('shop_products').insert(payload);
    }

    setSaving(false);
    setShowForm(false);
    loadProducts();
  };

  const toggleAvailability = async (id: string, value: boolean) => {
    await supabase.from('shop_products').update({ is_available: value }).eq('id', id);
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_available: value } : p));
  };

  const updateStock = async (id: string, qty: string) => {
    const num = parseInt(qty, 10);
    if (isNaN(num) || num < 0) return;
    await supabase.from('shop_products').update({ stock_quantity: num }).eq('id', id);
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock_quantity: num } : p));
  };

  const pickAndUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const fileName = `shop/${Date.now()}.${ext}`;

    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('assets')
      .upload(fileName, arrayBuffer, {
        contentType: asset.mimeType ?? 'image/jpeg',
        upsert: true,
      });

    if (error) {
      Alert.alert('Erreur upload', error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(fileName);
    setForm({ ...form, image_url: urlData.publicUrl });
    setUploading(false);
  };

  const deleteProduct = (id: string, name: string) => {
    Alert.alert('Supprimer', `Supprimer "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          await supabase.from('shop_products').delete().eq('id', id);
          loadProducts();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Gestion Shop', headerShown: true, headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
        )}} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.deepSea} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Gestion Shop', headerShown: true, headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
      )}} />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Articles</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{products.length} articles</Text>
          </View>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.deepSea }]} onPress={openAddForm}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {products.map((p) => (
          <Card key={p.id} style={styles.productCard}>
            <TouchableOpacity style={styles.productRow} onPress={() => openEditForm(p)}>
              {p.image_url ? (
                <Image source={{ uri: p.image_url }} style={styles.productImage} contentFit="cover" />
              ) : (
                <View style={[styles.productImage, styles.noImage, { backgroundColor: theme.cardBorder }]}>
                  <Ionicons name="image-outline" size={20} color={theme.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.productName, { color: theme.text }]}>{p.name}</Text>
                <Text style={[styles.productPrice, { color: colors.deepSea }]}>{p.price}€</Text>
                {p.description ? (
                  <Text style={[styles.productDesc, { color: theme.textSecondary }]} numberOfLines={1}>{p.description}</Text>
                ) : null}
              </View>
              <Ionicons name="pencil" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.productControls, { borderTopColor: theme.cardBorder }]}>
              <View style={styles.stockRow}>
                <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>Stock :</Text>
                <TextInput
                  style={[styles.stockInput, { color: theme.text, borderColor: theme.cardBorder }]}
                  value={String(p.stock_quantity)}
                  onChangeText={(v) => {
                    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, stock_quantity: parseInt(v, 10) || 0 } : x));
                  }}
                  onBlur={() => updateStock(p.id, String(p.stock_quantity))}
                  keyboardType="number-pad"
                />
                {p.stock_quantity === 0 && (
                  <Text style={styles.outOfStock}>Rupture</Text>
                )}
              </View>
              <View style={styles.availRow}>
                <Text style={[styles.stockLabel, { color: theme.textSecondary }]}>Disponible</Text>
                <Switch
                  value={p.is_available}
                  onValueChange={(v) => toggleAvailability(p.id, v)}
                  trackColor={{ true: colors.sage }}
                />
              </View>
              <TouchableOpacity onPress={() => deleteProduct(p.id, p.name)}>
                <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {products.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bag-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Aucun article</Text>
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>Appuyez sur + pour ajouter un article</Text>
          </View>
        )}
      </ScrollView>

      {/* === FORMULAIRE AJOUT/EDIT === */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.formScreen, { backgroundColor: theme.background }]}>
          <View style={[styles.formHeader, { borderBottomColor: theme.cardBorder }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={[styles.formCancel, { color: theme.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={[styles.formTitle, { color: theme.text }]}>
              {editingId ? 'Modifier l\'article' : 'Nouvel article'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.formContent}>
            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Nom *</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, borderColor: theme.cardBorder }]}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="Ex: Chapeau de plage"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea, { color: theme.text, borderColor: theme.cardBorder }]}
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              placeholder="Description de l'article"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Prix (€) *</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, borderColor: theme.cardBorder }]}
              value={form.price}
              onChangeText={(v) => setForm({ ...form, price: v })}
              placeholder="15.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Stock</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, borderColor: theme.cardBorder }]}
              value={form.stock_quantity}
              onChangeText={(v) => setForm({ ...form, stock_quantity: v })}
              placeholder="50"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
            />

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Catégorie</Text>
            <TextInput
              style={[styles.formInput, { color: theme.text, borderColor: theme.cardBorder }]}
              value={form.category}
              onChangeText={(v) => setForm({ ...form, category: v })}
              placeholder="general, vetements, accessoires..."
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>Photo</Text>
            <TouchableOpacity
              style={[styles.imagePicker, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
              onPress={pickAndUploadImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={colors.deepSea} />
              ) : form.image_url ? (
                <Image source={{ uri: form.image_url }} style={styles.imagePreview} contentFit="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={theme.textSecondary} />
                  <Text style={[styles.imageHint, { color: theme.textSecondary }]}>Ajouter une photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {form.image_url ? (
              <TouchableOpacity onPress={() => setForm({ ...form, image_url: '' })}>
                <Text style={{ color: colors.accentRed, fontSize: 13, fontWeight: '500', marginTop: 4 }}>Supprimer la photo</Text>
              </TouchableOpacity>
            ) : null}

            <Button
              title={saving ? 'Enregistrement...' : (editingId ? 'Modifier' : 'Ajouter l\'article')}
              onPress={saveProduct}
              loading={saving}
              size="lg"
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  productCard: { marginBottom: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productImage: { width: 56, height: 56, borderRadius: 10 },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: '700' },
  productPrice: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  productDesc: { fontSize: 11, marginTop: 2 },
  productControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockLabel: { fontSize: 12, fontWeight: '500' },
  stockInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 14, fontWeight: '700', width: 50, textAlign: 'center' },
  outOfStock: { color: '#dc2626', fontSize: 11, fontWeight: '700' },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '700' },
  emptyHint: { fontSize: 13 },
  formScreen: { flex: 1 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  formCancel: { fontSize: 15, fontWeight: '500' },
  formTitle: { fontSize: 17, fontWeight: '700' },
  formContent: { padding: 20, gap: 12 },
  formLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  formTextArea: { minHeight: 80, textAlignVertical: 'top' },
  imagePicker: { borderWidth: 1, borderRadius: 12, borderStyle: 'dashed', overflow: 'hidden', height: 160, alignItems: 'center', justifyContent: 'center' },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', gap: 8 },
  imageHint: { fontSize: 13, fontWeight: '500' },
});
