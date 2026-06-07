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
      showDebug('⏳ Création du paiement...');

      // 1. Créer le PaymentIntent côté serveur
      const { clientSecret } = await apiCall<{ clientSecret: string }>(
        '/api/payments/create-intent',
        params,
      );

      if (!clientSecret) {
        showDebug('❌ Pas de clientSecret reçu du serveur');
        return { success: false };
      }
      showDebug('✅ clientSecret reçu');

      // 2. Charger Stripe.js
      const stripe = await stripePromise;
      if (!stripe) {
        showDebug('❌ Stripe.js non chargé');
        return { success: false };
      }
      showDebug('✅ Stripe.js chargé, ouverture du modal...');

      // 3. Afficher le modal et faire le paiement (confirmCardPayment exécuté
      //    AVANT démontage de la modal — sinon Stripe perd son point de mount)
      const result = await showPaymentModal(stripe, clientSecret);
      if (result.status === 'cancelled') {
        showDebug('ℹ️ Paiement annulé par l\'utilisateur');
        return { success: false };
      }
      if (result.status === 'error') {
        showDebug(`❌ Stripe: ${result.message}`);
        return { success: false };
      }

      showDebug(`✅ Paiement: ${result.paymentIntentStatus}`);
      if (result.paymentIntentStatus === 'succeeded' || result.paymentIntentStatus === 'requires_capture') {
        return { success: true };
      }
      return { success: false };
    } catch (err: any) {
      showDebug(`❌ Erreur: ${err.message}`);
      return { success: false };
    }
  };

  return { pay };
}

function showDebug(msg: string) {
  console.log('[PAY]', msg);
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:10px;z-index:999999;font-size:14px;font-family:-apple-system,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:opacity 0.3s;';
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
}

type PaymentModalResult =
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
  | { status: 'ok'; paymentIntentStatus: string | undefined };

function showPaymentModal(stripe: any, clientSecret: string): Promise<PaymentModalResult> {
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

    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'color:#c0392b;font-size:13px;margin-bottom:12px;display:none;font-family:-apple-system,sans-serif;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Annuler';
    cancelBtn.style.cssText = 'flex:1;padding:14px;border:1px solid #ddd;border-radius:10px;background:#fff;cursor:pointer;font-size:15px;font-family:-apple-system,sans-serif;';

    const payBtn = document.createElement('button');
    payBtn.textContent = 'Payer';
    payBtn.style.cssText = 'flex:1;padding:14px;border:none;border-radius:10px;background:#C4943D;color:#fff;cursor:pointer;font-size:15px;font-weight:700;font-family:-apple-system,sans-serif;';

    const cleanup = () => {
      try { cardElement.destroy(); } catch {}
      overlay.remove();
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve({ status: 'cancelled' });
    };

    payBtn.onclick = async () => {
      payBtn.disabled = true;
      cancelBtn.disabled = true;
      payBtn.textContent = 'Paiement en cours…';
      payBtn.style.opacity = '0.7';
      errorMsg.style.display = 'none';

      try {
        // IMPORTANT : cardElement DOIT rester monté pendant confirmCardPayment
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement },
        });

        if (error) {
          // Erreur de carte récupérable (refus, 3DS échoué…) → reste sur la modal
          errorMsg.textContent = error.message ?? 'Paiement refusé.';
          errorMsg.style.display = 'block';
          payBtn.disabled = false;
          cancelBtn.disabled = false;
          payBtn.textContent = 'Réessayer';
          payBtn.style.opacity = '1';
          return;
        }

        cleanup();
        resolve({ status: 'ok', paymentIntentStatus: paymentIntent?.status });
      } catch (err: any) {
        cleanup();
        resolve({ status: 'error', message: err?.message ?? 'Erreur inattendue' });
      }
    };

    modal.appendChild(title);
    modal.appendChild(cardDiv);
    modal.appendChild(errorMsg);
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(payBtn);
    modal.appendChild(btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Mount Stripe card element APRÈS insertion dans le DOM
    cardElement.mount(cardDiv);
  });
}
