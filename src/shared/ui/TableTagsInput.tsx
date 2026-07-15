import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';

interface Props {
  tables: string[];
  onChange: (tables: string[]) => void;
  label?: string;
}

/** Sérialise/parse la liste de tables vers/depuis la colonne texte `table_numbers`. */
export function parseTables(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}
export function serializeTables(tables: string[]): string | null {
  const cleaned = tables.map((t) => t.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(', ') : null;
}

/** Saisie multi-tables en texte libre (chiffres OU lettres) : on tape, on ajoute avec « + », on retire d'un clic. */
export function TableTagsInput({ tables, onChange, label }: Props) {
  const { theme } = useSunMode();
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (v && !tables.includes(v)) onChange([...tables, v]);
    setInput('');
  };
  const remove = (t: string) => onChange(tables.filter((x) => x !== t));

  return (
    <View>
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      ) : null}
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          value={input}
          onChangeText={setInput}
          placeholder="N° ou nom de table (ex. 55, A1)"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.deepSea }]}
          onPress={add}
          accessibilityLabel="Ajouter la table"
        >
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
      {tables.length > 0 && (
        <View style={styles.chips}>
          {tables.map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => remove(t)}>
              <Text style={[styles.chipText, { color: theme.text }]}>{t}</Text>
              <Ionicons name="close" size={14} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15 },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '700' },
});
