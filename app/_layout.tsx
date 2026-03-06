import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SunModeProvider, useSunMode } from '@/shared/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/shared/i18n';

const ONBOARDING_KEY = 'tournesol_onboarding_done';

function RootLayoutContent() {
  const { theme } = useSunMode();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      if (!value) {
        router.replace('/onboarding');
      }
      setReady(true);
    });
  }, []);

  return (
    <>
      <StatusBar style={theme.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(auth)"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="booking"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="mood"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="live"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="arrival"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="(admin)"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="profile"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ animation: 'fade' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SunModeProvider>
          <LanguageProvider>
            <AuthProvider>
              <RootLayoutContent />
            </AuthProvider>
          </LanguageProvider>
        </SunModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
