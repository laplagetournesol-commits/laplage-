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
import { useAdminBeachZones } from '@/features/admin/hooks/useAdminBeachZones';

export default function BeachManagementScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { zones, loading, refresh, updatePrice, toggleZone, toggleSunbed, toggleAllSunbedsInZone, renameSunbed } = useAdminBeachZones();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<{ zoneId: string; price: string } | null>(null);
  const [editingLabel, setEditingLabel] = useState<{ sunbedId: string; label: string } | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleSavePrice = async () => {
    if (!editingPrice) return;
    const price = parseFloat(editingPrice.price);
    if (isNaN(price) || price < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }
    await updatePrice(editingPrice.zoneId, price);
    setEditingPrice(null);
  };

  const handleToggleAllSunbeds = (zoneId: string, zoneName: string, activate: boolean) => {
    Alert.alert(
      activate ? 'Activer tous les transats' : 'Désactiver tous les transats',
      `${activate ? 'Activer' : 'Désactiver'} tous les transats de la zone ${zoneName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => toggleAllSunbedsInZone(zoneId, activate) },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{
          title: 'Gestion Plage',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.terracotta} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Gestion Plage',
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.terracotta} />
        }
      >
        <Text style={[styles.title, { color: theme.text }]}>Zones plage</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {zones.length} zones — {zones.reduce((sum, z) => sum + z.sunbeds.length, 0)} transats
        </Text>

        {zones.map((zone) => {
          const activeCount = zone.sunbeds.filter((s) => s.is_active).length;
          const totalCount = zone.sunbeds.length;
          const isExpanded = expandedZone === zone.id;

          return (
            <Card key={zone.id} style={styles.zoneCard}>
              {/* Zone header */}
              <TouchableOpacity
                style={styles.zoneHeader}
                onPress={() => setExpandedZone(isExpanded ? null : zone.id)}
              >
                <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.zoneNameRow}>
                    <Text style={[styles.zoneName, { color: theme.text }]}>{zone.name}</Text>
                    {!zone.is_active && <Badge label="Inactive" variant="error" size="sm" />}
                  </View>
                  <Text style={[styles.zoneInfo, { color: theme.textSecondary }]}>
                    {activeCount}/{totalCount} transats actifs — {zone.base_price}€
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.zoneBody, { borderTopColor: theme.cardBorder }]}>
                  {/* Controls */}
                  <View style={styles.zoneControls}>
                    <View style={styles.controlRow}>
                      <Text style={[styles.controlLabel, { color: theme.text }]}>Zone active</Text>
                      <Switch
                        value={zone.is_active}
                        onValueChange={(val) => toggleZone(zone.id, val)}
                        trackColor={{ true: colors.sage }}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.priceBtn, { borderColor: theme.cardBorder }]}
                      onPress={() => setEditingPrice({ zoneId: zone.id, price: zone.base_price.toString() })}
                    >
                      <Ionicons name="pricetag" size={16} color={colors.terracotta} />
                      <Text style={[styles.priceBtnText, { color: theme.text }]}>
                        Prix : {zone.base_price}€
                      </Text>
                      <Ionicons name="pencil" size={14} color={theme.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.bulkActions}>
                      <TouchableOpacity
                        style={[styles.bulkBtn, { backgroundColor: colors.sage + '18' }]}
                        onPress={() => handleToggleAllSunbeds(zone.id, zone.name, true)}
                      >
                        <Text style={[styles.bulkBtnText, { color: colors.sage }]}>Activer tout</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.bulkBtn, { backgroundColor: colors.accentRed + '12' }]}
                        onPress={() => handleToggleAllSunbeds(zone.id, zone.name, false)}
                      >
                        <Text style={[styles.bulkBtnText, { color: colors.accentRed }]}>Désactiver tout</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Sunbeds list */}
                  <Text style={[styles.sunbedsTitle, { color: theme.textSecondary }]}>
                    Transats ({activeCount}/{totalCount} actifs)
                  </Text>
                  {zone.sunbeds.map((sunbed) => (
                    <View
                      key={sunbed.id}
                      style={[styles.sunbedRow, { borderBottomColor: theme.cardBorder }]}
                    >
                      <TouchableOpacity
                        style={styles.sunbedLabelRow}
                        onPress={() => setEditingLabel({ sunbedId: sunbed.id, label: sunbed.label })}
                      >
                        <Text style={[styles.sunbedLabel, { color: theme.text }]}>
                          {sunbed.label}
                          {sunbed.is_double ? ' (double)' : ''}
                        </Text>
                        <Ionicons name="pencil" size={12} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <Switch
                        value={sunbed.is_active}
                        onValueChange={(val) => toggleSunbed(sunbed.id, val)}
                        trackColor={{ true: colors.sage }}
                      />
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>

      {/* Rename sunbed modal */}
      <Modal visible={editingLabel !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Renommer le transat</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.cardBorder, fontSize: 18 }]}
              value={editingLabel?.label ?? ''}
              onChangeText={(text) => editingLabel && setEditingLabel({ ...editingLabel, label: text })}
              placeholder="Nom du transat"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.cardBorder }]}
                onPress={() => setEditingLabel(null)}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.terracotta }]}
                onPress={async () => {
                  if (editingLabel && editingLabel.label.trim()) {
                    await renameSunbed(editingLabel.sunbedId, editingLabel.label.trim());
                    setEditingLabel(null);
                  }
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.white }]}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Price edit modal */}
      <Modal visible={editingPrice !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Modifier le prix</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.cardBorder }]}
              value={editingPrice?.price ?? ''}
              onChangeText={(text) => editingPrice && setEditingPrice({ ...editingPrice, price: text })}
              keyboardType="decimal-pad"
              placeholder="Prix en €"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.cardBorder }]}
                onPress={() => setEditingPrice(null)}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.terracotta }]}
                onPress={handleSavePrice}
              >
                <Text style={[styles.modalBtnText, { color: colors.white }]}>Enregistrer</Text>
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
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 20 },
  zoneCard: { marginBottom: 14 },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneDot: { width: 12, height: 12, borderRadius: 6 },
  zoneNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneName: { fontSize: 16, fontWeight: '700' },
  zoneInfo: { fontSize: 12, marginTop: 2 },
  zoneBody: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  zoneControls: { gap: 12 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controlLabel: { fontSize: 14, fontWeight: '500' },
  priceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  priceBtnText: { flex: 1, fontSize: 14, fontWeight: '600' },
  bulkActions: { flexDirection: 'row', gap: 10 },
  bulkBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  bulkBtnText: { fontSize: 12, fontWeight: '600' },
  sunbedsTitle: { fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  sunbedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sunbedLabelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sunbedLabel: { fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: { width: '80%', borderRadius: 16, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
});
