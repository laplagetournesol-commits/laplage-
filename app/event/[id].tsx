import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSunMode } from '@/shared/theme';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useSunMode();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: true, title: 'Événement', headerTintColor: theme.text }} />
      <View style={styles.content}>
        <Text style={[styles.placeholder, { color: theme.textSecondary }]}>
          Détail de l'événement {id}{'\n'}(Phase 4)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  placeholder: { fontSize: 16, textAlign: 'center' },
});
