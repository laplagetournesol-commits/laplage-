import { useStripe } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';
import { apiCall } from '@/shared/lib/api';

export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const pay = async (params: {
    type: 'beach' | 'restaurant' | 'event';
    reservationId: string;
    amount: number;
  }): Promise<{ success: boolean }> => {
    try {
      // 1. Créer le PaymentIntent côté serveur
      const { clientSecret } = await apiCall<{ clientSecret: string }>(
        '/api/payments/create-intent',
        params,
      );

      // 2. Initialiser la Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'La Plage Tournesol',
        applePay: { merchantCountryCode: 'ES' },
        googlePay: { merchantCountryCode: 'ES', testEnv: false },
      });

      if (initError) {
        Alert.alert('Erreur', initError.message);
        return { success: false };
      }

      // 3. Afficher la Payment Sheet (carte, Apple Pay, Google Pay)
      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        if (payError.code === 'Canceled') {
          // L'utilisateur a annulé — pas d'alerte
          return { success: false };
        }
        Alert.alert('Erreur de paiement', payError.message);
        return { success: false };
      }

      return { success: true };
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de procéder au paiement');
      return { success: false };
    }
  };

  return { pay };
}
