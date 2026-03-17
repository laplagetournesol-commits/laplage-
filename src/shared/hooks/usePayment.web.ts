import { Alert } from 'react-native';

export function usePayment() {
  const pay = async (_params: {
    type: 'beach' | 'restaurant' | 'event';
    reservationId: string;
    amount: number;
  }): Promise<{ success: boolean }> => {
    Alert.alert('Info', 'Le paiement n\'est pas disponible sur la version web. Utilisez l\'application mobile.');
    return { success: false };
  };

  return { pay };
}
