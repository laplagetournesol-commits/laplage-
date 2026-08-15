import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Platform, Linking, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { apiCall } from '@/shared/lib/api';

type PayState = 'loading' | 'redirect' | 'paid' | 'cancel' | 'error';

/**
 * Page publique de paiement pour une réservation "pour un ami".
 * L'invité (sans compte) arrive ici via le lien email/WhatsApp : on crée une
 * session Stripe hébergée et on l'y redirige. Payer = confirmer sa venue.
 */
export default function PayScreen() {
  const { token, status } = useLocalSearchParams<{ token: string; status?: string }>();
  const [state, setState] = useState<PayState>('loading');
  const [message, setMessage] = useState('');

  const openCheckout = useCallback(async () => {
    setState('loading');
    try {
      const r = await apiCall<{ url?: string; status?: string }>('/api/payments/guest-checkout', { token });
      if (r?.status === 'paid') { setState('paid'); return; }
      if (r?.url) {
        setState('redirect');
        if (Platform.OS === 'web') { (window as any).location.href = r.url; }
        else { Linking.openURL(r.url); }
        return;
      }
      setState('error'); setMessage('Lien invalide ou expiré.');
    } catch (e: any) {
      setState('error'); setMessage(e?.message ?? 'Une erreur est survenue.');
    }
  }, [token]);

  useEffect(() => {
    if (!token) { setState('error'); setMessage('Lien invalide.'); return; }
    if (status === 'success') { setState('paid'); return; }
    if (status === 'cancel') { setState('cancel'); return; }
    openCheckout();
  }, [token, status, openCheckout]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, title: 'Paiement' }} />
      <View style={styles.card}>
        <Text style={styles.logo}>🌻</Text>
        <Text style={styles.brand}>La Plage Tournesol</Text>

        {(state === 'loading' || state === 'redirect') && (
          <>
            <ActivityIndicator size="large" color="#3D434F" style={{ marginTop: 18 }} />
            <Text style={styles.msg}>Redirection vers le paiement sécurisé…</Text>
          </>
        )}

        {state === 'paid' && (
          <>
            <Text style={styles.big}>✅ Paiement confirmé</Text>
            <Text style={styles.msg}>Ta place est réservée et ta venue confirmée. À très vite sur la plage ☀️</Text>
          </>
        )}

        {state === 'cancel' && (
          <>
            <Text style={styles.big}>Paiement annulé</Text>
            <Text style={styles.msg}>Tu peux réessayer quand tu veux pour confirmer ta place.</Text>
            <TouchableOpacity style={styles.btn} onPress={openCheckout}>
              <Text style={styles.btnTxt}>Payer & confirmer</Text>
            </TouchableOpacity>
          </>
        )}

        {state === 'error' && (
          <>
            <Text style={styles.big}>Oups</Text>
            <Text style={styles.msg}>{message}</Text>
            <TouchableOpacity style={styles.btn} onPress={openCheckout}>
              <Text style={styles.btnTxt}>Réessayer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4D773', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center' },
  logo: { fontSize: 44 },
  brand: { fontSize: 20, fontWeight: '800', color: '#3D434F', marginTop: 6 },
  big: { fontSize: 22, fontWeight: '800', color: '#3D434F', marginTop: 20, textAlign: 'center' },
  msg: { fontSize: 15, color: '#5b6270', marginTop: 12, textAlign: 'center', lineHeight: 21 },
  btn: { marginTop: 22, backgroundColor: '#3D434F', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
