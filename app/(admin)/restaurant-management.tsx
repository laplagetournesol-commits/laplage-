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
import { useAdminRestaurantZones } from '@/features/admin/hooks/useAdminRestaurantZones';

const SHAPE_LABELS: Record<string, string> = {
  round: 'Ronde',
  square: 'Carrée',
  rectangle: 'Rectangle',
};

export default function RestaurantManagementScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { zones, loading, refresh, updateMinSpend, updateCapacity, toggleZone, toggleTable, toggleAllTablesInZone, renameTable } = useAdminRestaurantZones();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [editingMinSpend, setEditingMinSpend] = useState<{ zoneId: string; value: string } | null>(null);
  const [editingCapacity, setEditingCapacity] = useState<{ zoneId: string; value: string } | null>(null);
  const [editingLabel, setEditingLabel] = useState<{ tableId: string; label: string } | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleSaveMinSpend = async () => {
    if (!editingMinSpend) return;
    const val = parseFloat(editingMinSpend.value);
    if (isNaN(val) || val < 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }
    await updateMinSpend(editingMinSpend.zoneId, val);
    setEditingMinSpend(null);
  };

  const handleSaveCapacity = async () => {
    if (!editingCapacity) return;
    const val = parseInt(editingCapacity.value, 10);
    if (isNaN(val) || val < 1) {
      Alert.alert('Erreur', 'Veuillez entrer un nombre valide');
      return;
    }
    await updateCapacity(editingCapacity.zoneId, val);
    setEditingCapacity(null);
  };

  const handleToggleAllTables = (zoneId: string, zoneName: string, activate: boolean) => {
    Alert.alert(
      activate ? 'Activer toutes les tables' : 'Désactiver toutes les tables',
      `${activate ? 'Activer' : 'Désactiver'} toutes les tables de la zone ${zoneName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => toggleAllTablesInZone(zoneId, activate) },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{
          title: 'Gestion Restaurant',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.deepSea} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: 'Gestion Restaurant',
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.deepSea} />
        }
      >
        <Text style={[styles.title, { color: theme.text }]}>Zones restaurant</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {zones.length} zones — {zones.reduce((sum, z) => sum + z.tables.length, 0)} tables
        </Text>

        {zones.map((zone) => {
          const activeCount = zone.tables.filter((t) => t.is_active).length;
          const totalCount = zone.tables.length;
          const isExpanded = expandedZone === zone.id;

          return (
            <Card key={zone.id} style={styles.zoneCard}>
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
                    {activeCount}/{totalCount} tables — {zone.capacity} couverts — Min. {zone.min_spend}€
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
                      onPress={() => setEditingCapacity({ zoneId: zone.id, value: zone.capacity.toString() })}
                    >
                      <Ionicons name="people" size={16} color={colors.deepSea} />
                      <Text style={[styles.priceBtnText, { color: theme.text }]}>
                        Couverts max : {zone.capacity}
                      </Text>
                      <Ionicons name="pencil" size={14} color={theme.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.priceBtn, { borderColor: theme.cardBorder }]}
                      onPress={() => setEditingMinSpend({ zoneId: zone.id, value: zone.min_spend.toString() })}
                    >
                      <Ionicons name="cash" size={16} color={colors.deepSea} />
                      <Text style={[styles.priceBtnText, { color: theme.text }]}>
                        Min. dépense : {zone.min_spend}€
                      </Text>
                      <Ionicons name="pencil" size={14} color={theme.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.bulkActions}>
                      <TouchableOpacity
                        style={[styles.bulkBtn, { backgroundColor: colors.sage + '18' }]}
                        onPress={() => handleToggleAllTables(zone.id, zone.name, true)}
                      >
                        <Text style={[styles.bulkBtnText, { color: colors.sage }]}>Activer tout</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.bulkBtn, { backgroundColor: colors.accentRed + '12' }]}
                        onPress={() => handleToggleAllTables(zone.id, zone.name, false)}
                      >
                        <Text style={[styles.bulkBtnText, { color: colors.accentRed }]}>Désactiver tout</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.tablesTitle, { color: theme.textSecondary }]}>
                    Tables ({activeCount}/{totalCount} actives)
                  </Text>
                  {zone.tables.map((table) => (
                    <View
                      key={table.id}
                      style={[styles.tableRow, { borderBottomColor: theme.cardBorder }]}
                    >
                      <View style={{ flex: 1 }}>
                        <TouchableOpacity
                          style={styles.tableLabelRow}
                          onPress={() => setEditingLabel({ tableId: table.id, label: table.label })}
                        >
                          <Text style={[styles.tableLabel, { color: theme.text }]}>
                            {table.label}
                          </Text>
                          <Ionicons name="pencil" size={12} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.tableDetails}>
                          <Badge label={`${table.seats} pl.`} variant="default" size="sm" />
                          <Badge label={SHAPE_LABELS[table.shape] ?? table.shape} variant="default" size="sm" />
                        </View>
                      </View>
                      <Switch
                        value={table.is_active}
                        onValueChange={(val) => toggleTable(table.id, val)}
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

      {/* Rename table modal */}
      <Modal visible={editingLabel !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Renommer la table</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.cardBorder, fontSize: 18 }]}
              value={editingLabel?.label ?? ''}
              onChangeText={(text) => editingLabel && setEditingLabel({ ...editingLabel, label: text })}
              placeholder="Nom de la table"
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
                style={[styles.modalBtn, { backgroundColor: colors.deepSea }]}
                onPress={async () => {
                  if (editingLabel && editingLabel.label.trim()) {
                    await renameTable(editingLabel.tableId, editingLabel.label.trim());
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

      <Modal visible={editingCapacity !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Couverts max</Text>
            <Text style={[styles.modalHint, { color: theme.textSecondary }]}>
              Nombre total de couverts pour cette zone. Les réservations seront bloquées une fois atteint.
            </Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.cardBorder }]}
              value={editingCapacity?.value ?? ''}
              onChangeText={(text) => editingCapacity && setEditingCapacity({ ...editingCapacity, value: text })}
              keyboardType="number-pad"
              placeholder="Ex: 40"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.cardBorder }]}
                onPress={() => setEditingCapacity(null)}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.deepSea }]}
                onPress={handleSaveCapacity}
              >
                <Text style={[styles.modalBtnText, { color: colors.white }]}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editingMinSpend !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Min. dépense</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.cardBorder }]}
              value={editingMinSpend?.value ?? ''}
              onChangeText={(text) => editingMinSpend && setEditingMinSpend({ ...editingMinSpend, value: text })}
              keyboardType="decimal-pad"
              placeholder="Montant en €"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.cardBorder }]}
                onPress={() => setEditingMinSpend(null)}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.deepSea }]}
                onPress={handleSaveMinSpend}
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
  tablesTitle: { fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tableLabel: { fontSize: 14, fontWeight: '500' },
  tableDetails: { flexDirection: 'row', gap: 6, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: { width: '80%', borderRadius: 16, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalHint: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
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
