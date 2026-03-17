import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/shared/lib/supabase';
import { i18n } from '@/shared/i18n';

export default function PersonalInfoScreen() {
  const { theme } = useSunMode();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', user.id);
    setSaving(false);

    if (error) {
      Alert.alert(i18n.t('error'), error.message);
    } else {
      Alert.alert(i18n.t('saved'), i18n.t('savedInfo'));
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{
        title: i18n.t('personalInfo'),
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        ),
      }} />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
        <Card>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
            <Text style={[styles.value, { color: theme.text }]}>{user?.email ?? ''}</Text>
          </View>
        </Card>

        <View style={{ marginTop: 16 }}>
          <Input
            label={i18n.t('fullName')}
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <Input
            label={i18n.t('phoneLabel')}
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+33 6 12 34 56 78"
          />
        </View>

        <Button title={i18n.t('save')} onPress={handleSave} loading={saving} style={{ marginTop: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  field: { gap: 4 },
  label: { fontSize: 12 },
  value: { fontSize: 16, fontWeight: '600' },
});
