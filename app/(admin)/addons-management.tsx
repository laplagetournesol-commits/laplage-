import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useAdminAddons } from '@/features/admin/hooks/useAdminAddons';
import type { Addon } from '@/shared/types';

const CATEGORY_LABELS: Record<string, string> = {
  comfort: 'Confort',
  food: 'Nourriture',
  drink: 'Boissons',
  pack: 'Packs',
};

const CATEGORY_COLORS: Record<string, string> = {
  comfort: colors.terracotta,
  food: colors.sage,
  drink: colors.deepSea,
  pack: colors.sunYellow,
};

type AddonCategory = Addon['category'];

interface AddonFormData {
  name: string;
  description: string;
  price: string;
  category: AddonCategory;
  icon: string;
  is_available: boolean;
}

const emptyAddonForm: AddonFormData = {
  name: '',
  description: '',
  price: '0',
  category: 'comfort',
  icon: '',
  is_available: true,
};

export default function AddonsManagementScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { addons, loading, refresh, createAddon, updateAddon, deleteAddon, toggleAvailability } = useAdminAddons();
  const [refreshing, setRefreshing] = useState(false);
  const [editingAddon, setEditingAddon] = useState<{ id: string | null; form: AddonFormData } | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleOpenCreate = () => {
    setEditingAddon({ id: null, form: { ...emptyAddonForm } });
  };

  const handleOpenEdit = (addon: Addon) => {
    setEditingAddon({
      id: addon.id,
      form: {
        name: addon.name,
        description: addon.description ?? '',
        price: addon.price.toString(),
        category: addon.category,
        icon: addon.icon ?? '',
        is_available: addon.is_available,
      },
    });
  };

  const handleSave = async () => {
    if (!editingAddon) return;
    const { id, form } = editingAddon;

    if (!form.name.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      category: form.category,
      icon: form.icon.trim() || null,
      is_available: form.is_available,
      sort_order: addons.length,
    };

    try {
      if (id) {
        await updateAddon(id, payload);
      } else {
        await createAddon(payload);
      }
      setEditingAddon(null);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  };

  const handleDelete = (addon: Addon) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${addon.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteAddon(addon.id),
        },
      ],
    );
  };

  const setFormField = <K extends keyof AddonFormData>(key: K, value: AddonFormData[K]) => {
    setEditingAddon((prev) => prev ? { ...prev, form: { ...prev.form, [key]: value } } : null);
  };

  // Group by category
  const grouped = (['comfort', 'food', 'drink', 'pack'] as AddonCategory[]).map((cat) => ({
    category: cat,
    items: addons.filter((a) => a.category === cat),
  })).filter((g) => g.items.length > 0);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{
          title: 'Gestion Addons',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.sage} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Gestion Addons',
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={handleOpenCreate}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add-circle" size={28} color={colors.sage} />
          </TouchableOpacity>
        ),
      }} />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.sage} />
        }
      >
        <Text style={[styles.title, { color: theme.text }]}>Addons</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {addons.length} addon{addons.length > 1 ? 's' : ''}
        </Text>
        <View style={styles.hintRow}>
          <Ionicons name="hand-left-outline" size={13} color={theme.textSecondary} />
          <Text style={[styles.hintText, { color: theme.textSecondary }]}>
            Appui long pour supprimer
          </Text>
        </View>

        {grouped.map((group) => (
          <View key={group.category} style={styles.categoryGroup}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryDot, { backgroundColor: CATEGORY_COLORS[group.category] }]} />
              <Text style={[styles.categoryName, { color: theme.text }]}>
                {CATEGORY_LABELS[group.category]}
              </Text>
              <Badge label={`${group.items.length}`} variant="default" size="sm" />
            </View>

            {group.items.map((addon) => (
              <TouchableOpacity key={addon.id} onPress={() => handleOpenEdit(addon)} onLongPress={() => handleDelete(addon)}>
                <Card style={styles.addonCard}>
                  <View style={styles.addonRow}>
                    <View style={styles.addonIconBox}>
                      <Text style={{ fontSize: 18 }}>{addon.icon || '📦'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.addonName, { color: theme.text }]}>{addon.name}</Text>
                      {addon.description && (
                        <Text style={[styles.addonDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                          {addon.description}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.addonPrice, { color: colors.terracotta }]}>{addon.price}€</Text>
                    <Switch
                      value={addon.is_available}
                      onValueChange={(val) => toggleAvailability(addon.id, val)}
                      trackColor={{ true: colors.sage }}
                    />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {addons.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="gift-outline" size={48} color={theme.cardBorder} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Aucun addon</Text>
          </View>
        )}
      </ScrollView>

      {/* Edit/Create Modal */}
      <Modal visible={editingAddon !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingAddon?.id ? 'Modifier addon' : 'Nouvel addon'}
              </Text>
              <TouchableOpacity onPress={() => setEditingAddon(null)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Nom</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
                value={editingAddon?.form.name ?? ''}
                onChangeText={(t) => setFormField('name', t)}
                placeholder="Nom de l'addon"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
                value={editingAddon?.form.description ?? ''}
                onChangeText={(t) => setFormField('description', t)}
                placeholder="Description"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Prix (€)</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
                value={editingAddon?.form.price ?? ''}
                onChangeText={(t) => setFormField('price', t)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Icône (emoji)</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
                value={editingAddon?.form.icon ?? ''}
                onChangeText={(t) => setFormField('icon', t)}
                placeholder="🎁"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Catégorie</Text>
              <View style={styles.categoryRow}>
                {(['comfort', 'food', 'drink', 'pack'] as AddonCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryBtn,
                      {
                        backgroundColor: editingAddon?.form.category === cat ? CATEGORY_COLORS[cat] : theme.background,
                        borderColor: CATEGORY_COLORS[cat],
                      },
                    ]}
                    onPress={() => setFormField('category', cat)}
                  >
                    <Text
                      style={[
                        styles.categoryBtnText,
                        { color: editingAddon?.form.category === cat ? colors.white : theme.text },
                      ]}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.switchRow, { marginTop: 14 }]}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Disponible</Text>
                <Switch
                  value={editingAddon?.form.is_available ?? true}
                  onValueChange={(val) => setFormField('is_available', val)}
                  trackColor={{ true: colors.sage }}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              {editingAddon?.id && (
                <TouchableOpacity
                  style={[styles.modalDeleteBtn]}
                  onPress={() => {
                    if (editingAddon.id) {
                      const addon = addons.find((a) => a.id === editingAddon.id);
                      if (addon) {
                        setEditingAddon(null);
                        setTimeout(() => handleDelete(addon), 300);
                      }
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.sage }]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 8 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 20 },
  hintText: { fontSize: 11, fontStyle: 'italic' },
  categoryGroup: { marginBottom: 20 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 16, fontWeight: '700', flex: 1 },
  addonCard: { marginBottom: 8 },
  addonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addonIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  addonName: { fontSize: 14, fontWeight: '600' },
  addonDesc: { fontSize: 11, marginTop: 1 },
  addonPrice: { fontSize: 15, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalScroll: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryBtnText: { fontSize: 13, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  modalDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 64, 64, 0.1)',
  },
  saveBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
