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
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { i18n } from '@/shared/i18n';

export default function SignupScreen() {
  const { theme } = useSunMode();
  const { signUp, signInWithApple, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError(i18n.t('fillAllFields'));
      return;
    }
    if (!acceptedTerms) {
      setError(i18n.t('acceptTermsRequired'));
      return;
    }
    if (password !== confirmPassword) {
      setError(i18n.t('passwordsDontMatch'));
      return;
    }
    if (password.length < 6) {
      setError(i18n.t('passwordTooShort'));
      return;
    }

    setLoading(true);
    setError('');
    const { error: err, hasSession } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (err) {
      setError(err.message);
    } else if (!hasSession) {
      Alert.alert(
        i18n.t('checkEmailTitle'),
        i18n.t('checkEmail'),
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
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
          <Text style={[styles.brand, { color: colors.brand }]}>{i18n.t('joinClub')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {i18n.t('createYourAccount')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={i18n.t('fullName')}
            icon="person-outline"
            placeholder="Jean Dupont"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
          />

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
            placeholder="Minimum 6 caractères"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Input
            label={i18n.t('confirmPassword')}
            icon="lock-closed-outline"
            placeholder="Répétez le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {/* CGU checkbox */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={acceptedTerms ? 'checkbox' : 'square-outline'}
              size={22}
              color={acceptedTerms ? colors.brand : theme.textSecondary}
            />
            <Text style={[styles.termsText, { color: theme.textSecondary }]}>
              {i18n.t('acceptTerms')}{' '}
              <Text
                style={{ color: theme.accent, textDecorationLine: 'underline' }}
                onPress={() => router.push('/profile/terms')}
              >
                {i18n.t('terms')}
              </Text>
              {' '}{i18n.t('termsAnd')}{' '}
              <Text
                style={{ color: theme.accent, textDecorationLine: 'underline' }}
                onPress={() => router.push('/profile/privacy')}
              >
                {i18n.t('privacyPolicy')}
              </Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={i18n.t('signup')}
            onPress={handleSignup}
            loading={loading}
            disabled={!acceptedTerms}
            size="lg"
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Social signup */}
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
            {i18n.t('alreadyHaveAccount')}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.link, { color: theme.accent }]}> {i18n.t('login')}</Text>
          </TouchableOpacity>
        </View>

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 16 }]}
          onPress={() => router.back()}
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
    marginBottom: 36,
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
