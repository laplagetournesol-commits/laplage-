import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/shared/lib/api';

// Configurer le comportement des notifications reçues en foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;

    (async () => {
      if (!Device.isDevice) return;

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '2fe3c6e2-e73f-4115-820b-a60280e443ef',
      });

      await apiCall('/api/notifications/register-token', {
        token: tokenData.data,
        platform: Platform.OS,
      });

      registered.current = true;
    })().catch((err) => {
      console.warn('Erreur enregistrement push token:', err);
    });
  }, [user]);
}
