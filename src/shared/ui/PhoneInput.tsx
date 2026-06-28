import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal as RNModal,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  flagEmoji,
  parseE164,
  toE164,
  type Country,
} from '@/shared/lib/countries';

interface PhoneInputProps {
  label?: string;
  error?: string;
  value: string; // E.164 (ex: +33612345678)
  onChangeText: (e164: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function PhoneInput({
  label,
  error,
  value,
  onChangeText,
  placeholder = '6 12 34 56 78',
  containerStyle,
}: PhoneInputProps) {
  const { theme } = useSunMode();
  const initial = useMemo(() => parseE164(value), []); // init au montage
  const [country, setCountry] = useState<Country>(initial.country || DEFAULT_COUNTRY);
  const [local, setLocal] = useState(initial.local);
  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Re-synchronise si le `value` externe change (ex: reset de formulaire)
  useEffect(() => {
    if (value !== toE164(country, local)) {
      const p = parseE164(value);
      setCountry(p.country || DEFAULT_COUNTRY);
      setLocal(p.local);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (c: Country, l: string) => onChangeText(toE164(c, l));

  const handleLocalChange = (text: string) => {
    const digits = text.replace(/[^\d]/g, '');
    setLocal(digits);
    emit(country, digits);
  };

  const selectCountry = (c: Country) => {
    setCountry(c);
    setPickerOpen(false);
    setQuery('');
    emit(c, local);
  };

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => normalize(c.name).includes(q) || c.dial.includes(q.replace(/\D/g, '')),
    );
  }, [query]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.card,
            borderColor: error ? colors.accentRed : focused ? theme.accent : theme.cardBorder,
          },
        ]}
      >
        <TouchableOpacity style={styles.countryBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
          <Text style={styles.flag}>{flagEmoji(country.iso)}</Text>
          <Text style={[styles.dial, { color: theme.text }]}>+{country.dial}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
        <TextInput
          value={local}
          onChangeText={handleLocalChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[400]}
          keyboardType="phone-pad"
          autoCorrect={false}
          style={[styles.input, { color: theme.text }]}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}

      <RNModal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)} statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Pays</Text>
              <TouchableOpacity onPress={() => { setPickerOpen(false); setQuery(''); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Ionicons name="search" size={18} color={theme.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher un pays…"
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
                autoCorrect={false}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.iso}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, { borderBottomColor: theme.cardBorder }]}
                  onPress={() => selectCountry(item)}
                >
                  <Text style={styles.flag}>{flagEmoji(item.iso)}</Text>
                  <Text style={[styles.countryName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.rowDial, { color: theme.textSecondary }]}>+{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, height: 50,
    paddingRight: 14,
  },
  countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: '100%' },
  flag: { fontSize: 20 },
  dial: { fontSize: 15, fontWeight: '600' },
  divider: { width: 1, height: '60%', marginRight: 10 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  error: { color: colors.accentRed, fontSize: 12, marginTop: 4, marginLeft: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { height: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 44,
    paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  countryName: { flex: 1, fontSize: 15 },
  rowDial: { fontSize: 14, fontWeight: '600' },
});
