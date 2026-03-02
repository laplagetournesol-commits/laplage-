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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';

export default function SignupScreen() {
  const { theme } = useSunMode();
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    setError('');
    const { error: err } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      Alert.alert(
        'Compte créé !',
        'Vérifiez votre email pour confirmer votre inscription.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
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
          <Text style={[styles.brand, { color: colors.brand }]}>Rejoignez le club</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Créez votre compte Les Tournesols
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Nom complet"
            icon="person-outline"
            placeholder="Jean Dupont"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
          />

          <Input
            label="Email"
            icon="mail-outline"
            placeholder="votre@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Mot de passe"
            icon="lock-closed-outline"
            placeholder="Minimum 6 caractères"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Input
            label="Confirmer le mot de passe"
            icon="lock-closed-outline"
            placeholder="Répétez le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Créer mon compte"
            onPress={handleSignup}
            loading={loading}
            size="lg"
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Déjà un compte ?
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.link, { color: theme.accent }]}> Se connecter</Text>
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
  closeBtn: {
    position: 'absolute',
    right: 20,
  },
});
