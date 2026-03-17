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

      // 2. Charger Stripe.js
      const stripe = await stripePromise;
      if (!stripe || !clientSecret) {
        alert('Erreur de configuration du paiement');
        return { success: false };
      }

      // 3. Confirmer le paiement avec le Payment Element
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: await createCardElement(stripe),
        },
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          alert(error.message ?? 'Erreur de paiement');
        } else {
          alert('Une erreur est survenue');
        }
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

// Create a temporary card element for web payment
async function createCardElement(stripe: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const elements = stripe.elements();
    const cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#333',
          '::placeholder': { color: '#aab7c4' },
        },
      },
    });

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:16px;padding:28px;width:90%;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,0.15);';

    const title = document.createElement('h3');
    title.textContent = 'Paiement sécurisé';
    title.style.cssText = 'margin:0 0 20px 0;font-size:18px;color:#1a5276;';

    const cardDiv = document.createElement('div');
    cardDiv.style.cssText = 'border:1px solid #ddd;border-radius:10px;padding:14px;margin-bottom:20px;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuler';
    cancelBtn.style.cssText = 'flex:1;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;cursor:pointer;font-size:15px;';
    cancelBtn.onclick = () => {
      overlay.remove();
      reject(new Error('Paiement annulé'));
    };

    const payBtn = document.createElement('button');
    payBtn.textContent = 'Payer';
    payBtn.style.cssText = 'flex:1;padding:12px;border:none;border-radius:10px;background:#C4943D;color:#fff;cursor:pointer;font-size:15px;font-weight:700;';
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

    cardElement.mount(cardDiv);
  });
}
