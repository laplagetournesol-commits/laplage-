import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { i18n } from '@/shared/i18n';
import { useLanguage, LANGUAGE_LABELS } from '@/shared/i18n/LanguageContext';
import type { Language } from '@/shared/i18n/translations';

export default function LoginScreen() {
  const { theme } = useSunMode();
  const { signIn, signInWithApple, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const { locale, setLanguage } = useLanguage();

  const LANGS: { key: Language; flag: string }[] = [
    { key: 'fr', flag: '🇫🇷' },
    { key: 'es', flag: '🇪🇸' },
    { key: 'en', flag: '🇬🇧' },
  ];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [socialLoading, setSocialLoading] = useState(false);

  const handleForgotPassword = () => {
    Alert.prompt(
      i18n.t('forgotPassword'),
      'Entrez votre adresse email',
      async (emailInput) => {
        if (!emailInput) return;
        const { error } = await supabase.auth.resetPasswordForEmail(emailInput.trim());
        if (error) {
          Alert.alert(i18n.t('error'), error.message);
        } else {
          Alert.alert('Email envoyé', i18n.t('resetPasswordSent'));
        }
      },
      'plain-text',
      email,
      'email-address'
    );
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="sunny" size={48} color={colors.brand} />
          <Text style={[styles.brand, { color: colors.brand }]}>les tournesols</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Beach Club — Estepona
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={i18n.t('email')}
            icon="mail-outline"
            placeholder="votre@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label={i18n.t('password')}
            icon="lock-closed-outline"
            placeholder="Votre mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: theme.accent }]}>
              {i18n.t('forgotPassword')}
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={i18n.t('login')}
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Social login */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
          <Text style={[styles.dividerText, { color: theme.textSecondary }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
        </View>

        <View style={styles.socialButtons}>
          {(Platform.OS === 'ios' || Platform.OS === 'web') && (
            <TouchableOpacity
              style={[styles.socialBtn, { backgroundColor: '#000' }]}
              onPress={async () => {
                setSocialLoading(true);
                const { error: err } = await signInWithApple();
                setSocialLoading(false);
                if (err) setError(err.message);
                else router.replace('/(tabs)');
              }}
              disabled={socialLoading}
            >
              <Ionicons name="logo-apple" size={20} color="#fff" />
              <Text style={[styles.socialBtnText, { color: '#fff' }]}>Continue with Apple</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }]}
            onPress={async () => {
              setSocialLoading(true);
              const { error: err } = await signInWithGoogle();
              setSocialLoading(false);
              if (err) setError(err.message);
              else router.replace('/(tabs)');
            }}
            disabled={socialLoading}
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={[styles.socialBtnText, { color: theme.text }]}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Pas encore de compte ?
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={[styles.link, { color: theme.accent }]}> {i18n.t('signup')}</Text>
          </TouchableOpacity>
        </View>

        {/* Language selector */}
        <View style={styles.langRow}>
          {LANGS.map((l) => (
            <TouchableOpacity
              key={l.key}
              style={[
                styles.langBtn,
                {
                  backgroundColor: locale === l.key ? colors.brand + '15' : 'transparent',
                  borderColor: locale === l.key ? colors.brand : theme.cardBorder,
                },
              ]}
              onPress={() => setLanguage(l.key)}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langLabel, { color: locale === l.key ? colors.brand : theme.textSecondary }]}>
                {LANGUAGE_LABELS[l.key]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 16 }]}
          onPress={() => router.replace('/(tabs)')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={28} color={theme.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  form: {
    marginBottom: 32,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '500',
  },
  error: {
    color: colors.accentRed,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
    marginBottom: 16,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  langFlag: {
    fontSize: 16,
  },
  langLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  socialButtons: {
    gap: 12,
    marginBottom: 24,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
  },
});
