import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
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

export default router;
