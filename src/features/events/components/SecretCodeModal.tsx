import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import type { Event } from '@/shared/types';
import { i18n } from '@/shared/i18n';

interface SecretCodeModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
  onSuccess: () => void;
}

export function SecretCodeModal({ visible, onClose, event, onSuccess }: SecretCodeModalProps) {
  const { theme } = useSunMode();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!code.trim()) {
      setError(i18n.t('enterAccessCode'));
      return;
    }
    if (code.trim().toUpperCase() === event.secret_code?.toUpperCase()) {
      setCode('');
      setError('');
      onSuccess();
    } else {
      setError(i18n.t('incorrectCode'));
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={i18n.t('secretEvent')}>
      <View style={styles.content}>
        <View style={[styles.iconRow, { backgroundColor: colors.sunYellowLight }]}>
          <Text style={styles.lockEmoji}>🔒</Text>
          <Text style={[styles.secretText, { color: colors.warmWood }]}>
            {i18n.t('secretEventDesc')}
          </Text>
        </View>

        <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>

        <Input
          label={i18n.t('accessCode')}
          value={code}
          onChangeText={(text) => { setCode(text); setError(''); }}
          placeholder="XXXX0000"
          autoCapitalize="characters"
          error={error || undefined}
          icon="key-outline"
        />

        <Button
          title={i18n.t('verifyCode')}
          onPress={handleSubmit}
          size="lg"
          style={{ marginTop: 16 }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 8 },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  lockEmoji: { fontSize: 24 },
  secretText: { fontSize: 13, lineHeight: 19, flex: 1, fontWeight: '500' },
  eventTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
});
