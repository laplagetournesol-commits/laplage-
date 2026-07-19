import Stripe from 'stripe';
import { supabase } from '../lib/supabase';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY non configurée');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
}

/**
 * Annule les réservations plage restées en `pending` sans paiement au-delà
 * d'un délai (paniers abandonnés). Sinon leurs liens transats en `pending`
 * bloquent la modification d'autres résas (le contrôle de dispo compte
 * `pending` comme occupé) et polluent la base — cf. les 11 fantômes du 19/07.
 *
 * Lancée toutes les 30 min par le cron principal.
 */
const EXPIRY_MINUTES = 30;

export async function expireAbandonedBeachHolds(): Promise<{ cancelled: number }> {
  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { data: stale, error } = await supabase
    .from('beach_reservations')
    .select('id, stripe_payment_intent_id')
    .eq('status', 'pending')
    .eq('deposit_paid', false)
    .lt('created_at', cutoff);

  if (error) {
    console.error('[expire cron] erreur fetch:', error.message);
    return { cancelled: 0 };
  }
  if (!stale || stale.length === 0) return { cancelled: 0 };

  const ids = stale.map((r) => r.id);

  // Annuler les résas — MAIS uniquement celles ENCORE pending + non payées au
  // moment de l'UPDATE. Garde-fou anti-race : si un client termine son paiement
  // entre le SELECT et l'UPDATE (webhook -> confirmed + deposit_paid=true), la
  // condition ne matche plus et on ne touche PAS sa réservation payée.
  // .select() renvoie exactement les lignes réellement annulées.
  const { data: cancelledRows, error: updErr } = await supabase
    .from('beach_reservations')
    .update({ status: 'cancelled' })
    .in('id', ids)
    .eq('status', 'pending')
    .eq('deposit_paid', false)
    .select('id, stripe_payment_intent_id');

  if (updErr) {
    console.error('[expire cron] erreur update:', updErr.message);
    return { cancelled: 0 };
  }
  const cancelled = cancelledRows ?? [];
  if (cancelled.length === 0) return { cancelled: 0 };
  const cancelledIds = cancelled.map((r) => r.id);

  // Libérer les transats des SEULES résas réellement annulées (le trigger
  // SECURITY DEFINER le fait déjà, ceci est explicite/ceinture-bretelles et
  // correctement borné aux ids annulés).
  await supabase
    .from('beach_reservation_sunbeds')
    .update({ status: 'cancelled' })
    .in('reservation_id', cancelledIds);

  // Annuler les PaymentIntents vides côté Stripe (0€ encaissé).
  const stripe = getStripe();
  for (const r of cancelled) {
    if (!r.stripe_payment_intent_id) continue;
    try {
      await stripe.paymentIntents.cancel(r.stripe_payment_intent_id);
    } catch {
      // PI déjà annulé/expiré — on ignore.
    }
  }

  console.log(`[expire cron] ${cancelledIds.length} résa(s) plage abandonnée(s) annulée(s)`);
  return { cancelled: cancelledIds.length };
}
