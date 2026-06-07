import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY non configurée');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
}

// Tables correspondant aux types de réservation
const RESERVATION_TABLES: Record<string, string> = {
  beach: 'beach_reservations',
  restaurant: 'restaurant_reservations',
  event: 'event_tickets',
};

/**
 * POST /api/payments/create-intent
 * Crée un PaymentIntent Stripe pour une réservation
 */
router.post('/create-intent', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { type, reservationId } = req.body;

    if (!type || !reservationId) {
      res.status(400).json({ error: 'type et reservationId sont requis' });
      return;
    }

    const table = RESERVATION_TABLES[type];
    if (!table) {
      res.status(400).json({ error: 'Type de réservation invalide' });
      return;
    }

    // Vérifier que la réservation existe et appartient au user
    // Récupérer le montant depuis la BDD (jamais faire confiance au client)
    const amountField = type === 'beach' ? 'deposit_amount' : type === 'event' ? 'price' : 'deposit_amount';
    const { data: reservation, error } = await supabase
      .from(table)
      .select(`id, user_id, deposit_paid, ${amountField}`)
      .eq('id', reservationId)
      .single();

    if (error || !reservation) {
      res.status(404).json({ error: 'Réservation introuvable' });
      return;
    }

    if (reservation.user_id !== req.user!.id) {
      res.status(403).json({ error: 'Cette réservation ne vous appartient pas' });
      return;
    }

    if (reservation.deposit_paid) {
      res.status(400).json({ error: 'L\'acompte a déjà été payé' });
      return;
    }

    // Montant vérifié depuis la BDD
    const amount = Number((reservation as any)[amountField]);
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Montant invalide' });
      return;
    }

    // Créer le PaymentIntent
    // Restaurant = pré-autorisation (empreinte CB, débit uniquement en cas de no-show)
    // Plage & événements = paiement immédiat
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: Math.round(amount * 100), // centimes
      currency: 'eur',
      capture_method: type === 'restaurant' ? 'manual' : 'automatic',
      metadata: {
        type,
        reservationId,
        userId: req.user!.id,
        table,
      },
    });

    // Stocker le PaymentIntent ID sur la réservation pour pouvoir l'annuler plus tard
    await supabase
      .from(table)
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', reservationId);

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    console.error('Erreur create-intent:', err);
    res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
});

/**
 * POST /api/payments/cancel-hold
 * Annule la pré-autorisation Stripe (restaurant check-in)
 */
router.post('/cancel-hold', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { reservationId } = req.body;

    if (!reservationId) {
      res.status(400).json({ error: 'reservationId requis' });
      return;
    }

    // Récupérer le PaymentIntent ID depuis la réservation restaurant
    const { data: reservation, error } = await supabase
      .from('restaurant_reservations')
      .select('id, user_id, stripe_payment_intent_id')
      .eq('id', reservationId)
      .single();

    if (error || !reservation) {
      res.status(404).json({ error: 'Réservation introuvable' });
      return;
    }

    // Seul le propriétaire ou un admin peut annuler la pré-autorisation
    if (reservation.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    if (!reservation.stripe_payment_intent_id) {
      // Pas de pré-autorisation à annuler
      res.json({ cancelled: false, reason: 'Aucune pré-autorisation trouvée' });
      return;
    }

    // Annuler le PaymentIntent (libère la pré-autorisation)
    await getStripe().paymentIntents.cancel(reservation.stripe_payment_intent_id);

    // Nettoyer l'ID sur la réservation
    await supabase
      .from('restaurant_reservations')
      .update({ stripe_payment_intent_id: null })
      .eq('id', reservationId);

    console.log(`Pré-autorisation annulée: restaurant #${reservationId}`);
    res.json({ cancelled: true });
  } catch (err: any) {
    console.error('Erreur cancel-hold:', err);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la pré-autorisation' });
  }
});

/**
 * POST /api/payments/cancel-reservation
 * Annule une réservation (status -> 'cancelled') côté serveur via service role.
 * Bypass les soucis de RLS rencontrés depuis le client mobile.
 * Vérifie que l'utilisateur est propriétaire ou admin/staff.
 */
router.post('/cancel-reservation', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { reservationId, type } = req.body;

    if (!reservationId || !type || !['restaurant', 'beach'].includes(type)) {
      res.status(400).json({ error: 'reservationId et type (restaurant|beach) requis' });
      return;
    }

    const table = type === 'beach' ? 'beach_reservations' : 'restaurant_reservations';

    const { data: reservation, error: fetchErr } = await supabase
      .from(table)
      .select('id, user_id, deposit_amount, stripe_payment_intent_id')
      .eq('id', reservationId)
      .single();

    if (fetchErr || !reservation) {
      res.status(404).json({ error: 'Réservation introuvable' });
      return;
    }

    if (reservation.user_id !== req.user!.id && !['admin', 'staff'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    if (type === 'restaurant' && reservation.stripe_payment_intent_id) {
      try {
        await getStripe().paymentIntents.cancel(reservation.stripe_payment_intent_id);
      } catch (stripeErr) {
        console.error('Stripe cancel failed (non-blocking):', stripeErr);
      }
    }

    const { error: updateErr } = await supabase
      .from(table)
      .update({ status: 'cancelled' })
      .eq('id', reservationId);

    if (updateErr) {
      res.status(500).json({ error: updateErr.message });
      return;
    }

    res.json({ cancelled: true });
  } catch (err: any) {
    console.error('Erreur cancel-reservation:', err);
    res.status(500).json({ error: 'Erreur lors de l\'annulation' });
  }
});

/**
 * Capture une pré-autorisation Stripe (no-show) pour une résa restaurant.
 * Marque la résa comme `no_show` et `deposit_paid: true`.
 * Utilisée par la cron de fin de journée.
 */
export async function captureNoShow(reservationId: string): Promise<{ captured: boolean; reason?: string }> {
  const { data: reservation, error } = await supabase
    .from('restaurant_reservations')
    .select('id, status, stripe_payment_intent_id')
    .eq('id', reservationId)
    .single();

  if (error || !reservation) return { captured: false, reason: 'not_found' };
  if (reservation.status !== 'confirmed') return { captured: false, reason: 'wrong_status' };
  if (!reservation.stripe_payment_intent_id) return { captured: false, reason: 'no_intent' };

  try {
    await getStripe().paymentIntents.capture(reservation.stripe_payment_intent_id);
  } catch (err: any) {
    console.error(`[no-show capture] échec sur résa ${reservationId}:`, err.message);
    return { captured: false, reason: err.message };
  }

  await supabase
    .from('restaurant_reservations')
    .update({ status: 'no_show', deposit_paid: true })
    .eq('id', reservationId);

  console.log(`[no-show capture] résa #${reservationId} débitée`);
  return { captured: true };
}

/**
 * POST /api/payments/refund
 * Rembourse une réservation (admin uniquement).
 * - Si l'empreinte CB resto est encore en pre-auth → annule le hold (rien n'a été débité)
 * - Si le paiement a déjà été capturé → refund Stripe
 * - Marque la résa en `cancelled` + `deposit_paid: false`
 */
router.post('/refund', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { reservationId, type } = req.body;

    if (!reservationId || !type || !['beach', 'restaurant', 'event'].includes(type)) {
      res.status(400).json({ error: 'reservationId et type (beach|restaurant|event) requis' });
      return;
    }

    const table = RESERVATION_TABLES[type];

    const { data: reservation, error: fetchErr } = await supabase
      .from(table)
      .select('id, user_id, deposit_paid, stripe_payment_intent_id')
      .eq('id', reservationId)
      .single();

    if (fetchErr || !reservation) {
      res.status(404).json({ error: 'Réservation introuvable' });
      return;
    }

    if (!reservation.stripe_payment_intent_id) {
      // Pas de paiement → juste cancel la résa
      await supabase.from(table).update({ status: 'cancelled' }).eq('id', reservationId);
      res.json({ refunded: false, reason: 'no_payment', cancelled: true });
      return;
    }

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(reservation.stripe_payment_intent_id);

    let action: 'refunded' | 'hold_cancelled' | 'noop';

    if (intent.status === 'requires_capture') {
      // Resto pre-auth pas encore capturé → on annule le hold
      await stripe.paymentIntents.cancel(reservation.stripe_payment_intent_id);
      action = 'hold_cancelled';
    } else if (intent.status === 'succeeded') {
      // Paiement capturé → vrai refund
      await stripe.refunds.create({
        payment_intent: reservation.stripe_payment_intent_id,
      });
      action = 'refunded';
    } else if (intent.status === 'canceled') {
      // Déjà annulé en amont
      action = 'noop';
    } else {
      res.status(400).json({ error: `Status Stripe inattendu: ${intent.status}` });
      return;
    }

    await supabase
      .from(table)
      .update({ status: 'cancelled', deposit_paid: false })
      .eq('id', reservationId);

    console.log(`[refund] résa ${type}#${reservationId} → ${action} (admin ${req.user!.id})`);
    res.json({ success: true, action });
  } catch (err: any) {
    console.error('Erreur refund:', err);
    res.status(500).json({ error: err?.message ?? 'Erreur lors du remboursement' });
  }
});

/**
 * POST /api/reservations/modify-beach
 * Modifie une réservation Plage existante (date et/ou transats).
 * - Vérifie la règle 24h
 * - Vérifie que les nouveaux transats sont libres
 * - Compute le diff de prix
 * - Si nouveau > ancien : crée un PaymentIntent pour la différence (renvoie clientSecret)
 * - Si nouveau < ancien : refund partiel Stripe immédiat
 * - Met à jour la résa (date + liens transats + total_price + deposit_amount)
 */
router.post('/reservations/modify-beach', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { reservationId, newDate, newSunbedIds } = req.body as {
      reservationId: string;
      newDate: string;
      newSunbedIds: string[];
    };

    if (!reservationId || !newDate || !Array.isArray(newSunbedIds) || newSunbedIds.length === 0) {
      res.status(400).json({ error: 'reservationId, newDate, newSunbedIds requis' });
      return;
    }

    // Charger la résa
    const { data: resa, error: resaErr } = await supabase
      .from('beach_reservations')
      .select('id, user_id, date, total_price, deposit_amount, deposit_paid, stripe_payment_intent_id, status')
      .eq('id', reservationId)
      .single();

    if (resaErr || !resa) {
      res.status(404).json({ error: 'Réservation introuvable' });
      return;
    }

    if (resa.user_id !== req.user!.id && !['admin', 'staff'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    if (resa.status === 'cancelled' || resa.status === 'completed' || resa.status === 'checked_in' || resa.status === 'no_show') {
      res.status(400).json({ error: 'Cette réservation ne peut plus être modifiée' });
      return;
    }

    // Règle 24h : pas de modif si <24h avant la date
    const now = new Date();
    const resaDate = new Date(`${resa.date}T10:00:00`);
    if (resaDate.getTime() - now.getTime() < 24 * 3600 * 1000) {
      res.status(400).json({ error: 'Modification impossible à moins de 24h de la réservation' });
      return;
    }

    // Vérifier que les nouveaux transats existent + récupérer leurs prix
    const { data: sunbeds, error: sbErr } = await supabase
      .from('sunbeds')
      .select('id, is_double, zone:beach_zones(base_price)')
      .in('id', newSunbedIds);

    if (sbErr || !sunbeds || sunbeds.length !== newSunbedIds.length) {
      res.status(400).json({ error: 'Un ou plusieurs transats invalides' });
      return;
    }

    // Vérifier dispo des nouveaux transats sur la nouvelle date
    // (sauf si un transat est déjà attribué à cette même résa)
    const { data: conflicts } = await supabase
      .from('beach_reservation_sunbeds')
      .select('sunbed_id, reservation_id')
      .eq('date', newDate)
      .in('status', ['pending', 'confirmed', 'checked_in'])
      .in('sunbed_id', newSunbedIds);

    if (conflicts && conflicts.length > 0) {
      const blocking = conflicts.filter((c) => c.reservation_id !== reservationId);
      if (blocking.length > 0) {
        res.status(409).json({ error: 'Un ou plusieurs transats ne sont plus disponibles à cette date' });
        return;
      }
    }

    // Calcul nouveau prix : BED 70€, sinon base_price
    const newTotal = sunbeds.reduce((sum: number, sb: any) => {
      if (sb.is_double) return sum + 70;
      return sum + Number(sb.zone?.base_price ?? 25);
    }, 0);

    const oldTotal = Number(resa.total_price);
    const diff = newTotal - oldTotal;

    let extraClientSecret: string | null = null;
    let refundedAmount = 0;

    if (diff > 0 && resa.deposit_paid) {
      // Créer un PaymentIntent pour la différence
      const stripe = getStripe();
      const pi = await stripe.paymentIntents.create({
        amount: Math.round(diff * 100),
        currency: 'eur',
        capture_method: 'automatic',
        metadata: {
          type: 'beach_modification_extra',
          reservationId,
          userId: req.user!.id,
        },
      });
      extraClientSecret = pi.client_secret;
    } else if (diff < 0 && resa.deposit_paid && resa.stripe_payment_intent_id) {
      // Refund partiel
      const stripe = getStripe();
      await stripe.refunds.create({
        payment_intent: resa.stripe_payment_intent_id,
        amount: Math.round(-diff * 100),
      });
      refundedAmount = -diff;
    }

    // Mettre à jour la résa : date + total
    await supabase
      .from('beach_reservations')
      .update({ date: newDate, total_price: newTotal, deposit_amount: newTotal })
      .eq('id', reservationId);

    // Supprimer les anciens liens et insérer les nouveaux
    await supabase.from('beach_reservation_sunbeds').delete().eq('reservation_id', reservationId);
    const linkRows = newSunbedIds.map((id) => ({
      reservation_id: reservationId,
      sunbed_id: id,
      date: newDate,
      status: resa.status,
    }));
    await supabase.from('beach_reservation_sunbeds').insert(linkRows);

    res.json({
      success: true,
      newTotal,
      diff,
      extraClientSecret,
      refundedAmount,
    });
  } catch (err: any) {
    console.error('Erreur modify-beach:', err);
    res.status(500).json({ error: err?.message ?? 'Erreur lors de la modification' });
  }
});

export default router;
