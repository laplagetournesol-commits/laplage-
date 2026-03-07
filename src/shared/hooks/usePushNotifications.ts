import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiCall } from '@/shared/lib/api';

let notificationsConfigured = false;

export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;

    (async () => {
      // Import dynamique pour éviter le crash si le module natif n'est pas lié
      let Notifications: typeof import('expo-notifications');
      let Device: typeof import('expo-device');
      try {
        Notifications = await import('expo-notifications');
        Device = await import('expo-device');
      } catch {
        console.warn('expo-notifications ou expo-device non disponible');
        return;
      }

      if (!Device.isDevice) return;

      // Configurer le handler une seule fois
      if (!notificationsConfigured) {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        notificationsConfigured = true;
      }

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
