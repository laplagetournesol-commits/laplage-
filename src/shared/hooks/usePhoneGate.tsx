import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Modal } from '@/shared/ui/Modal';
import { PhoneInput } from '@/shared/ui/PhoneInput';
import { Button } from '@/shared/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/shared/lib/supabase';
import { useSunMode } from '@/shared/theme';
import { i18n } from '@/shared/i18n';

const E164 = /^\+[1-9]\d{1,14}$/;

interface PendingResolver {
  resolve: (ok: boolean) => void;
}

/**
 * Garde-fou téléphone : à appeler avant toute réservation.
 * - Si le profile a déjà un phone E.164 valide, retourne true sans rien afficher.
 * - Sinon, ouvre une modale obligatoire qui demande le numéro, l'enregistre
 *   sur le profil, puis résout la promesse.
 *
 * Utilisation :
 *   const { ensurePhone, phoneGate } = usePhoneGate();
 *   ...
 *   if (!await ensurePhone()) return;   // user a annulé
 *   await booking.submitBooking();
 *   ...
 *   return (<>...{phoneGate}</>);
 */
export function usePhoneGate() {
  const { profile, refreshProfile } = useAuth();
  const { theme } = useSunMode();
  const [visible, setVisible] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef<PendingResolver | null>(null);

  const close = useCallback((ok: boolean) => {
    setVisible(false);
    setError(null);
    setSaving(false);
    pending.current?.resolve(ok);
    pending.current = null;
  }, []);

  const ensurePhone = useCallback(async (): Promise<boolean> => {
    if (profile?.phone && E164.test(profile.phone)) return true;
    setPhone(profile?.phone ?? '');
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      pending.current = { resolve };
    });
  }, [profile?.phone]);

  const handleSubmit = useCallback(async () => {
    const trimmed = phone.trim().replace(/\s/g, '');
    if (!E164.test(trimmed)) {
      setError(i18n.t('phoneInvalidE164'));
      return;
    }
    if (!profile?.id) {
      setError(i18n.t('error'));
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ phone: trimmed })
      .eq('id', profile.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    await refreshProfile();
    close(true);
  }, [phone, profile?.id, refreshProfile, close]);

  const phoneGate = (
    <Modal
      visible={visible}
      onClose={() => close(false)}
      title={i18n.t('phoneRequiredTitle')}
    >
      <View>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {i18n.t('phoneRequiredBody')}
        </Text>
        <PhoneInput
          label={i18n.t('phoneLabel')}
          value={phone}
          onChangeText={setPhone}
          error={error ?? undefined}
        />
        <Button
          title={i18n.t('save')}
          onPress={handleSubmit}
          loading={saving}
          disabled={saving}
        />
      </View>
    </Modal>
  );

  return { ensurePhone, phoneGate };
}

const styles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
});
