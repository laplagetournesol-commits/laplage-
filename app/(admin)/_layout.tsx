import { Stack } from 'expo-router';
import { useSunMode } from '@/shared/theme';

export default function AdminLayout() {
  const { theme } = useSunMode();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
