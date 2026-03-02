import { Stack } from 'expo-router';
import { useSunMode } from '@/shared/theme';

export default function AuthLayout() {
  const { theme } = useSunMode();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
