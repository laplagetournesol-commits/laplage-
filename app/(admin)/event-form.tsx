import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import { useImagePicker } from '@/features/admin/hooks/useImagePicker';
import type { Event, EventCategory } from '@/shared/types';

// Créneaux horaires toutes les 30 min
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m}`);
  }
}

const VIP_LEVELS: { value: string; label: string }[] = [
  { value: '', label: 'Aucun' },
  { value: 'standard', label: 'Standard' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
];

const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'pool_party', label: 'Pool Party' },
  { value: 'dj_set', label: 'DJ Set' },
  { value: 'dinner_show', label: 'Dinner Show' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'private', label: 'Privé' },
  { value: 'special', label: 'Spécial' },
];

interface FormData {
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  start_time: string;
  end_time: string;
  standard_price: string;
  vip_price: string;
  capacity: string;
  lineup: string;
  flyer_url: string | null;
  is_published: boolean;
  is_secret: boolean;
  secret_code: string;
  required_vip_level: string;
  required_tokens: string;
}

const emptyForm: FormData = {
  title: '',
  description: '',
  category: 'pool_party',
  date: new Date().toISOString().split('T')[0],
  start_time: '14:00',
  end_time: '22:00',
  standard_price: '0',
  vip_price: '',
  capacity: '100',
  lineup: '',
  flyer_url: null,
  is_published: false,
  is_secret: false,
  secret_code: '',
  required_vip_level: '',
  required_tokens: '',
};

export default function EventFormScreen() {
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const isEditing = !!eventId;
  const { pickAndUpload, uploading } = useImagePicker('flyers');

  const [form, setForm] = useState<FormData>(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [ticketsSold, setTicketsSold] = useState(0);
  const [timePickerField, setTimePickerField] = useState<'start_time' | 'end_time' | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const fetch = async () => {
      const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (data) {
        const e = data as Event;
        setForm({
          title: e.title,
          description: e.description,
          category: e.category,
          date: e.date,
          start_time: e.start_time,
          end_time: e.end_time ?? '',
          standard_price: e.standard_price.toString(),
          vip_price: e.vip_price?.toString() ?? '',
          capacity: e.capacity.toString(),
          lineup: (e.lineup ?? []).join(', '),
          flyer_url: e.flyer_url,
          is_published: e.is_published,
          is_secret: e.is_secret,
          secret_code: e.secret_code ?? '',
          required_vip_level: e.required_vip_level ?? '',
          required_tokens: e.required_tokens?.toString() ?? '',
        });
        setTicketsSold(e.tickets_sold);
      }
      setLoading(false);
    };
    fetch();
  }, [eventId]);

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handlePickImage = async () => {
    const url = await pickAndUpload();
    if (url) setField('flyer_url', url);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(form.date)) { Alert.alert('Erreur', 'Format de date invalide (AAAA-MM-JJ)'); return; }
    if (!timeRegex.test(form.start_time)) { Alert.alert('Erreur', "Format d'heure invalide (HH:MM)"); return; }
    if (form.end_time && !timeRegex.test(form.end_time)) { Alert.alert('Erreur', "Format d'heure de fin invalide (HH:MM)"); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time || null,
        standard_price: parseFloat(form.standard_price) || 0,
        vip_price: form.vip_price ? parseFloat(form.vip_price) : null,
        capacity: parseInt(form.capacity) || 100,
        lineup: form.lineup ? form.lineup.split(',').map((s) => s.trim()).filter(Boolean) : null,
        flyer_url: form.flyer_url,
        is_published: form.is_published,
        is_secret: form.is_secret,
        secret_code: form.is_secret ? form.secret_code : null,
        required_vip_level: form.required_vip_level || null,
        required_tokens: form.required_tokens ? parseInt(form.required_tokens) : null,
      };

      if (isEditing) {
        const { error } = await supabase.from('events').update(payload).eq('id', eventId);
        if (error) throw error;
      } else {
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert({ ...payload, tickets_sold: 0 })
          .select('id')
          .single();
        if (error) throw error;

        // Notifier tous les utilisateurs si l'événement est publié
        if (payload.is_published && newEvent) {
          apiCall('/api/notifications/event-published', {
            eventId: newEvent.id,
            title: payload.title,
          }).catch(() => {});
        }
      }

      router.back();
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (ticketsSold > 0) {
      Alert.alert(
        'Suppression impossible',
        `${ticketsSold} ticket(s) déjà vendu(s). Vous ne pouvez pas supprimer cet événement.`,
      );
      return;
    }
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('events').delete().eq('id', eventId);
            router.replace('/(admin)/events-management');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{
          title: isEditing ? 'Modifier événement' : 'Nouvel événement',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
        }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accentRed} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{
        title: isEditing ? 'Modifier événement' : 'Nouvel événement',
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
      >
        {/* Flyer image */}
        <TouchableOpacity onPress={handlePickImage} disabled={uploading} style={styles.flyerContainer}>
          {form.flyer_url ? (
            <Image source={{ uri: form.flyer_url }} style={styles.flyerImage} />
          ) : (
            <View style={[styles.flyerPlaceholder, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {uploading ? (
                <ActivityIndicator color={colors.accentRed} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={36} color={theme.textSecondary} />
                  <Text style={[styles.flyerText, { color: theme.textSecondary }]}>
                    Ajouter un flyer
                  </Text>
                </>
              )}
            </View>
          )}
          {form.flyer_url && (
            <View style={styles.flyerOverlay}>
              <Ionicons name="camera" size={20} color={colors.white} />
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Titre</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
          value={form.title}
          onChangeText={(t) => setField('title', t)}
          placeholder="Nom de l'événement"
          placeholderTextColor={theme.textSecondary}
        />

        {/* Description */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
          value={form.description}
          onChangeText={(t) => setField('description', t)}
          placeholder="Description de l'événement..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
        />

        {/* Category */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Catégorie</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryBtn,
                {
                  backgroundColor: form.category === cat.value ? colors.accentRed : theme.card,
                  borderColor: form.category === cat.value ? colors.accentRed : theme.cardBorder,
                },
              ]}
              onPress={() => setField('category', cat.value)}
            >
              <Text
                style={[
                  styles.categoryBtnText,
                  { color: form.category === cat.value ? colors.white : theme.text },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date & Times */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Date</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
              value={form.date}
              onChangeText={(t) => setField('date', t)}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Début</Text>
            <TouchableOpacity
              style={[styles.input, styles.timeBtn, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
              onPress={() => setTimePickerField('start_time')}
            >
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.timeBtnText, { color: form.start_time ? theme.text : theme.textSecondary }]}>
                {form.start_time || 'HH:MM'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Fin</Text>
            <TouchableOpacity
              style={[styles.input, styles.timeBtn, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
              onPress={() => setTimePickerField('end_time')}
            >
              <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.timeBtnText, { color: form.end_time ? theme.text : theme.textSecondary }]}>
                {form.end_time || 'HH:MM'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Prix standard (€)</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
              value={form.standard_price}
              onChangeText={(t) => setField('standard_price', t)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Prix VIP (€)</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
              value={form.vip_price}
              onChangeText={(t) => setField('vip_price', t)}
              keyboardType="decimal-pad"
              placeholder="Optionnel"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>

        {/* Capacity */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Capacité</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
          value={form.capacity}
          onChangeText={(t) => setField('capacity', t)}
          keyboardType="number-pad"
          placeholder="100"
          placeholderTextColor={theme.textSecondary}
        />

        {/* Lineup */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Lineup (séparés par virgule)</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.card }]}
          value={form.lineup}
          onChangeText={(t) => setField('lineup', t)}
          placeholder="DJ 1, DJ 2, DJ 3"
          placeholderTextColor={theme.textSecondary}
        />

        {/* Access */}
        <Card style={styles.accessCard}>
          <Text style={[styles.accessTitle, { color: theme.text }]}>Accès</Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: theme.text }]}>Événement secret</Text>
            <Switch
              value={form.is_secret}
              onValueChange={(val) => setField('is_secret', val)}
              trackColor={{ true: colors.accentRed }}
            />
          </View>

          {form.is_secret && (
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
              value={form.secret_code}
              onChangeText={(t) => setField('secret_code', t)}
              placeholder="Code secret"
              placeholderTextColor={theme.textSecondary}
            />
          )}

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Niveau VIP requis</Text>
          <View style={styles.categoryRow}>
            {VIP_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.categoryBtn,
                  {
                    backgroundColor: form.required_vip_level === level.value ? colors.accentRed : theme.card,
                    borderColor: form.required_vip_level === level.value ? colors.accentRed : theme.cardBorder,
                  },
                ]}
                onPress={() => setField('required_vip_level', level.value)}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    { color: form.required_vip_level === level.value ? colors.white : theme.text },
                  ]}
                >
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </Card>

        {/* Published */}
        <Card style={styles.publishCard}>
          <View style={styles.switchRow}>
            <View>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Publié</Text>
              <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                Visible par les clients
              </Text>
            </View>
            <Switch
              value={form.is_published}
              onValueChange={(val) => setField('is_published', val)}
              trackColor={{ true: colors.sage }}
            />
          </View>
        </Card>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.accentRed, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEditing ? 'Enregistrer' : 'Créer l\'événement'}
            </Text>
          )}
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
            <Text style={[styles.deleteBtnText, { color: colors.accentRed }]}>
              Supprimer l'événement
            </Text>
          </TouchableOpacity>
        )}

        {isEditing && ticketsSold > 0 && (
          <View style={styles.ticketsInfo}>
            <Badge label={`${ticketsSold} ticket(s) vendu(s)`} variant="warning" />
          </View>
        )}
      </ScrollView>

      {/* Modal sélection d'heure */}
      <Modal visible={!!timePickerField} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {timePickerField === 'start_time' ? 'Heure de début' : 'Heure de fin'}
              </Text>
              <TouchableOpacity onPress={() => setTimePickerField(null)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TIME_SLOTS}
              keyExtractor={(item) => item}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const isSelected = timePickerField && form[timePickerField] === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.timeSlotItem,
                      { borderBottomColor: theme.cardBorder },
                      isSelected && { backgroundColor: colors.accentRed + '15' },
                    ]}
                    onPress={() => {
                      if (timePickerField) setField(timePickerField, item);
                      setTimePickerField(null);
                    }}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      { color: isSelected ? colors.accentRed : theme.text },
                      isSelected && { fontWeight: '700' },
                    ]}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.accentRed} />}
                  </TouchableOpacity>
                );
              }}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
              initialScrollIndex={TIME_SLOTS.indexOf(form[timePickerField ?? 'start_time'] || '14:00')}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flyerContainer: { alignItems: 'center', marginBottom: 20 },
  flyerImage: { width: '100%', height: 200, borderRadius: 16 },
  flyerPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  flyerText: { fontSize: 14, fontWeight: '500' },
  flyerOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  input: {
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryBtnText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  accessCard: { marginTop: 20, gap: 10 },
  accessTitle: { fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  switchSub: { fontSize: 11, marginTop: 2 },
  publishCard: { marginTop: 14 },
  saveBtn: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },
  ticketsInfo: { alignItems: 'center', marginTop: 12 },
  timeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBtnText: { fontSize: 15 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  timeSlotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeSlotText: { fontSize: 16 },
});
