import { loadStripe } from '@stripe/stripe-js';
import { apiCall } from '@/shared/lib/api';

const stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

export function usePayment() {
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

      if (!clientSecret) {
        alert('Erreur: impossible de créer le paiement');
        return { success: false };
      }

      // 2. Charger Stripe.js
      const stripe = await stripePromise;
      if (!stripe) {
        alert('Erreur de chargement Stripe');
        return { success: false };
      }

      // 3. Afficher le modal de paiement et attendre la carte
      const cardElement = await showPaymentModal(stripe);
      if (!cardElement) {
        return { success: false }; // Annulé par l'utilisateur
      }

      // 4. Confirmer le paiement
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      // Cleanup
      cardElement.destroy();

      if (error) {
        alert(error.message ?? 'Erreur de paiement');
        return { success: false };
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'requires_capture') {
        return { success: true };
      }

      return { success: false };
    } catch (err: any) {
      alert(err.message ?? 'Impossible de procéder au paiement');
      return { success: false };
    }
  };

  return { pay };
}

function showPaymentModal(stripe: any): Promise<any | null> {
  return new Promise((resolve) => {
    const elements = stripe.elements();
    const cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#333',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          '::placeholder': { color: '#aab7c4' },
        },
      },
    });

    // Overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';

    // Modal
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:16px;padding:28px;width:90%;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,0.15);';

    const title = document.createElement('h3');
    title.textContent = 'Paiement sécurisé';
    title.style.cssText = 'margin:0 0 20px 0;font-size:18px;color:#1a5276;font-family:-apple-system,sans-serif;';

    const cardDiv = document.createElement('div');
    cardDiv.style.cssText = 'border:1px solid #ddd;border-radius:10px;padding:14px;margin-bottom:20px;min-height:44px;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuler';
    cancelBtn.style.cssText = 'flex:1;padding:14px;border:1px solid #ddd;border-radius:10px;background:#fff;cursor:pointer;font-size:15px;font-family:-apple-system,sans-serif;';
    cancelBtn.onclick = () => {
      cardElement.destroy();
      overlay.remove();
      resolve(null);
    };

    const payBtn = document.createElement('button');
    payBtn.textContent = 'Payer';
    payBtn.style.cssText = 'flex:1;padding:14px;border:none;border-radius:10px;background:#C4943D;color:#fff;cursor:pointer;font-size:15px;font-weight:700;font-family:-apple-system,sans-serif;';
    payBtn.onclick = () => {
      overlay.remove();
      resolve(cardElement);
    };

    modal.appendChild(title);
    modal.appendChild(cardDiv);
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(payBtn);
    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Mount Stripe card element
    cardElement.mount(cardDiv);
  });
}
