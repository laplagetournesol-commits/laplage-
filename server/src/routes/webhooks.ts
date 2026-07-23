import { Router } from 'express';
import express from 'express';
import { Resend } from 'resend';
import { verifyStripeWebhook, StripeWebhookRequest } from '../middleware/stripe-webhook';
import { supabase } from '../lib/supabase';
import { sendPushToUser } from '../lib/push';
import { syncBeachSaleToAgora } from '../lib/agora';

const router = Router();

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY non configurée');
  return new Resend(process.env.RESEND_API_KEY);
}
const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'reservations@laplage-tournesol.com';

/**
 * POST /api/webhooks/stripe
 * Reçoit les événements Stripe (raw body requis)
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  verifyStripeWebhook,
  async (req: StripeWebhookRequest, res) => {
    const event = req.stripeEvent!;

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          const { type, reservationId, table, userId } = paymentIntent.metadata;

          if (!table || !reservationId) {
            console.warn('Webhook: metadata incomplète', paymentIntent.metadata);
            break;
          }

          // Marquer la réservation comme payée
          const { error } = await supabase
            .from(table)
            .update({
              deposit_paid: true,
              stripe_payment_intent_id: paymentIntent.id,
            })
            .eq('id', reservationId);

          // Confirmer côté serveur (fiable même si l'app se ferme avant de
          // basculer le statut côté client). On ne confirme QUE si la résa est
          // encore "pending" : ça évite qu'une capture de no-show (qui émet
          // aussi payment_intent.succeeded) repasse un "no_show" en "confirmed".
          await supabase
            .from(table)
            .update({ status: 'confirmed' })
            .eq('id', reservationId)
            .eq('status', 'pending');

          // Synchroniser les liens transats (plage) pour fiabiliser la dispo.
          if (table === 'beach_reservations') {
            await supabase
              .from('beach_reservation_sunbeds')
              .update({ status: 'confirmed' })
              .eq('reservation_id', reservationId)
              .eq('status', 'pending');

            // Déclaration fiscale Ágora (série W). No-op si AGORA_SYNC_ENABLED
            // n'est pas activé. Ne bloque jamais le webhook (erreurs loguées).
            await syncBeachSaleToAgora(reservationId, paymentIntent.id, paymentIntent.amount);
          }

          if (error) {
            console.error('Erreur mise à jour réservation:', error);
            break;
          }

          console.log(`Paiement confirmé: ${type} #${reservationId}`);

          // Récupérer email + téléphone du user pour confirmation paiement
          if (userId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, full_name, phone')
              .eq('id', userId)
              .single();

            const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? '';

            if (profile?.email) {
              // Email spécifique au paiement de l'acompte
              await getResend().emails.send({
                from: fromEmail,
                to: profile.email,
                subject: 'Acompte reçu - La Plage Tournesol',
                html: `
                  <h2>Acompte bien reçu</h2>
                  <p>Bonjour ${firstName},</p>
                  <p>Votre acompte pour votre réservation <strong>${type}</strong> a bien été reçu.</p>
                  <p>Numéro de réservation : <strong>${reservationId}</strong></p>
                  <p>Merci et à bientôt à La Plage Tournesol !</p>
                `,
              });
            }

            // Push spécifique au paiement de l'acompte
            await sendPushToUser(
              userId,
              'Acompte reçu',
              `Votre acompte pour votre réservation ${type} a bien été reçu.`,
            );
          }
          break;
        }

        case 'payment_intent.amount_capturable_updated': {
          // Pré-autorisation restaurant confirmée (capture_method: manual)
          const pi = event.data.object;
          const meta = pi.metadata;

          if (meta.table && meta.reservationId) {
            await supabase
              .from(meta.table)
              .update({
                deposit_paid: true,
                stripe_payment_intent_id: pi.id,
              })
              .eq('id', meta.reservationId);

            // Confirmer côté serveur uniquement si encore "pending".
            await supabase
              .from(meta.table)
              .update({ status: 'confirmed' })
              .eq('id', meta.reservationId)
              .eq('status', 'pending');

            console.log(`Pré-autorisation confirmée: ${meta.type} #${meta.reservationId}`);

            if (meta.userId) {
              await sendPushToUser(
                meta.userId,
                'Empreinte bancaire enregistrée',
                'Votre empreinte CB a été enregistrée. Elle sera libérée à votre arrivée.',
              );
            }
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          console.error('Paiement échoué:', {
            id: paymentIntent.id,
            metadata: paymentIntent.metadata,
            lastError: paymentIntent.last_payment_error?.message,
          });
          break;
        }

        default:
          console.log(`Événement Stripe non géré: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('Erreur traitement webhook:', err);
      res.status(500).json({ error: 'Erreur interne' });
    }
  },
);

export default router;
