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

    // PLAGE : revérifier la dispo AVANT de facturer. Si un transat de cette résa
    // est déjà pris (confirmé/checked_in) par une AUTRE réservation à cette date
    // — y compris une résa faite par la plage/admin — on BLOQUE le paiement.
    // Évite de débiter un client pour des transats déjà occupés (double-booking).
    if (type === 'beach') {
      const { data: rdate } = await supabase.from('beach_reservations').select('date').eq('id', reservationId).single();
      const { data: myLinks } = await supabase.from('beach_reservation_sunbeds').select('sunbed_id').eq('reservation_id', reservationId);
      const myIds = (myLinks ?? []).map((l) => l.sunbed_id);
      if (rdate?.date && myIds.length) {
        const { data: conflicts } = await supabase
          .from('beach_reservation_sunbeds')
          .select('sunbed_id')
          .eq('date', rdate.date)
          .in('sunbed_id', myIds)
          .in('status', ['confirmed', 'checked_in'])
          .neq('reservation_id', reservationId);
        if (conflicts && conflicts.length) {
          const { data: sbs } = await supabase.from('sunbeds').select('label').in('id', conflicts.map((c) => c.sunbed_id));
          const labels = (sbs ?? []).map((s) => s.label).join(', ');
          res.status(409).json({ error: `Transats déjà réservés (${labels}). Reviens en arrière et choisis d'autres transats.` });
          return;
        }
      }
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
 * POST /api/payments/guest-checkout
 * PUBLIC (pas d'auth) : la résa "pour un ami" est réglée par l'invité, qui n'a
 * pas de compte. Le `token` (uuid non devinable) fait office de secret.
 * Crée une session Stripe Checkout HÉBERGÉE et renvoie l'URL de paiement.
 * Payer = confirmer (le webhook checkout.session.completed marque payé+confirmé).
 */
router.post('/guest-checkout', async (req, res) => {
  try {
    const { token } = req.body ?? {};
    if (!token) { res.status(400).json({ error: 'token requis' }); return; }

    const APP_URL = process.env.PUBLIC_WEB_URL ?? 'https://laplagetournesols.com';

    // Retrouver la résa par token dans les 2 tables.
    let table: 'beach_reservations' | 'restaurant_reservations' | null = null;
    let reservation: any = null;
    for (const t of ['beach_reservations', 'restaurant_reservations'] as const) {
      const { data } = await supabase
        .from(t)
        .select('id, total_price, deposit_paid, guest_payment_requested')
        .eq('guest_payment_token', token)
        .maybeSingle();
      if (data) { table = t; reservation = data; break; }
    }

    if (!table || !reservation) { res.status(404).json({ error: 'Réservation introuvable' }); return; }
    if (!reservation.guest_payment_requested) { res.status(400).json({ error: 'Aucun paiement demandé' }); return; }
    if (reservation.deposit_paid) { res.json({ status: 'paid' }); return; }

    const amount = Number(reservation.total_price);
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Montant invalide' }); return; }

    const type = table === 'beach_reservations' ? 'beach' : 'restaurant';
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `La Plage Tournesol — ${type === 'beach' ? 'Transat' : 'Restaurant'}` },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      success_url: `${APP_URL}/pay/${token}?status=success`,
      cancel_url: `${APP_URL}/pay/${token}?status=cancel`,
      metadata: { type, reservationId: reservation.id, table, token, guest: '1' },
    });

    await supabase.from(table).update({ guest_checkout_session_id: session.id }).eq('id', reservation.id);
    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Erreur guest-checkout:', err);
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

    const selectCols = type === 'beach'
      ? 'id, user_id, deposit_amount, stripe_payment_intent_id, date, start_time'
      : 'id, user_id, deposit_amount, stripe_payment_intent_id, date';

    const { data: reservation, error: fetchErr } = await supabase
      .from(table)
      .select(selectCols)
      .eq('id', reservationId)
      .single();

    if (fetchErr || !reservation) {
      res.status(404).json({ error: 'Réservation introuvable' });
      return;
    }

    const resa = reservation as any;

    if (resa.user_id !== req.user!.id && !['admin', 'staff'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Non autorisé' });
      return;
    }

    let refunded = false;

    if (resa.stripe_payment_intent_id) {
      try {
        const stripe = getStripe();
        const intent = await stripe.paymentIntents.retrieve(resa.stripe_payment_intent_id);

        if (type === 'restaurant') {
          // Empreinte CB resto : encore en pré-autorisation → on libère le hold.
          if (intent.status === 'requires_capture') {
            await stripe.paymentIntents.cancel(resa.stripe_payment_intent_id);
          }
        } else {
          // Plage : paiement encaissé d'avance. Politique : remboursé si annulation
          // au moins 24h avant le créneau ; sinon le paiement est conservé.
          const start = new Date(`${resa.date}T${resa.start_time || '10:00:00'}+02:00`); // Estepona (été)
          const hoursBefore = (start.getTime() - Date.now()) / 3_600_000;
          if (intent.status === 'requires_capture') {
            await stripe.paymentIntents.cancel(resa.stripe_payment_intent_id);
            refunded = true;
          } else if (intent.status === 'succeeded' && hoursBefore >= 24) {
            await stripe.refunds.create({
              payment_intent: resa.stripe_payment_intent_id,
              reason: 'requested_by_customer',
            });
            refunded = true;
          }
          console.log(`[cancel] plage #${reservationId} : ${hoursBefore.toFixed(1)}h avant → ${refunded ? 'REMBOURSÉ' : 'non remboursé (< 24h)'}`);
        }
      } catch (stripeErr) {
        console.error('Stripe cancel/refund failed (non-blocking):', stripeErr);
      }
    }

    const { error: updateErr } = await supabase
      .from(table)
      .update(refunded ? { status: 'cancelled', deposit_paid: false } : { status: 'cancelled' })
      .eq('id', reservationId);

    if (updateErr) {
      res.status(500).json({ error: updateErr.message });
      return;
    }

    res.json({ cancelled: true, refunded });
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

    // On autorise la modif des résas check-in (client sur place qui change de
    // transats/date). Seules les résas terminées/annulées restent bloquées.
    if (resa.status === 'cancelled' || resa.status === 'completed' || resa.status === 'no_show') {
      res.status(400).json({ error: 'Cette réservation ne peut plus être modifiée' });
      return;
    }

    // Règle 24h : pas de modif si <24h avant la date — sauf pour admin/staff
    const isStaff = ['admin', 'staff'].includes(req.user!.role);
    const now = new Date();
    const resaDate = new Date(`${resa.date}T10:00:00`);
    if (!isStaff && resaDate.getTime() - now.getTime() < 24 * 3600 * 1000) {
      res.status(400).json({ error: 'Modification impossible à moins de 24h de la réservation' });
      return;
    }

    // Vérifier que les nouveaux transats existent + récupérer leurs prix (type de zone inclus)
    const { data: sunbeds, error: sbErr } = await supabase
      .from('sunbeds')
      .select('id, is_double, zone:beach_zones(base_price, zone_type)')
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

    // Prix saisonnier pour la nouvelle date (MÊME logique que la création — sinon
    // fausse différence de prix car base_price=25€ mais saisonnier=20€).
    const { data: seasonRows } = await supabase
      .from('seasonal_pricing')
      .select('pricing_category, fixed_price')
      .lte('start_date', newDate)
      .gte('end_date', newDate);
    const seasonalPriceFor = (zoneType?: string): number | null => {
      const cat = zoneType === 'front_row' ? 'transat_front_row'
        : zoneType === 'vip_cabana' ? 'bed'
        : zoneType === 'chaise_longue' ? 'chaise_longue'
        : 'transat'; // standard, premium
      const row = (seasonRows ?? []).find((r: any) => r.pricing_category === cat);
      return row ? Number(row.fixed_price) : null;
    };

    // Calcul nouveau prix : BED (is_double) = 70€ flat, sinon prix saisonnier, fallback base_price
    const newTotal = sunbeds.reduce((sum: number, sb: any) => {
      if (sb.is_double) return sum + 70;
      const seasonal = seasonalPriceFor(sb.zone?.zone_type);
      return sum + (seasonal ?? Number(sb.zone?.base_price ?? 25));
    }, 0);

    const oldTotal = Number(resa.total_price);
    const diff = newTotal - oldTotal;

    let extraClientSecret: string | null = null;
    let refundedAmount = 0;

    if (diff > 0 && resa.deposit_paid && resa.stripe_payment_intent_id) {
      // Créer un PaymentIntent pour la différence (uniquement si paiement initial Stripe)
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

    // Si on déplace une résa DÉJÀ check-in vers une AUTRE date, on la repasse en
    // 'confirmed' : le client n'est pas "arrivé" pour un jour futur. Même date =
    // simple changement de transats sur place -> on garde 'checked_in'.
    const newStatus = resa.status === 'checked_in' && newDate !== resa.date
      ? 'confirmed'
      : resa.status;

    // Mettre à jour la résa : date + total (+ statut si déplacement post-check-in)
    await supabase
      .from('beach_reservations')
      .update({ date: newDate, total_price: newTotal, deposit_amount: newTotal, status: newStatus })
      .eq('id', reservationId);

    // Supprimer les anciens liens et insérer les nouveaux
    await supabase.from('beach_reservation_sunbeds').delete().eq('reservation_id', reservationId);
    const linkRows = newSunbedIds.map((id) => ({
      reservation_id: reservationId,
      sunbed_id: id,
      date: newDate,
      status: newStatus,
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
