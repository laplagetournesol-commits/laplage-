import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SunModeProvider, useSunMode } from '@/shared/theme';
import { AuthProvider } from '@/contexts/AuthContext';

function RootLayoutContent() {
  const { theme } = useSunMode();

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
          <AuthProvider>
            <RootLayoutContent />
          </AuthProvider>
        </SunModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
