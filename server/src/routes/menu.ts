import { Router } from 'express';
import Stripe from 'stripe';
import { requireAdmin, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { syncAgoraMenu } from '../lib/agora';

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY non configurée');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' });
}

/**
 * POST /api/menu/order — crée une commande "depuis le transat" et son paiement.
 * Body: { sunbed, lines: [{ product_id, qty }] }. Prix/TVA lus en base (jamais
 * le client). Renvoie { orderId, clientSecret } pour le paiement Stripe.
 */
router.post('/order', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // Commande depuis le transat en STAND-BY (réglage restaurant_settings/order_enabled).
    // Réactivable sans redéploiement en remettant order_enabled=true.
    const { data: flag } = await supabase.from('restaurant_settings').select('value').eq('key', 'order_enabled').maybeSingle();
    if (flag && flag.value === false) {
      res.status(503).json({ error: 'Les commandes depuis le transat sont momentanément indisponibles. / Ordering from your sunbed is temporarily unavailable.' });
      return;
    }
    const { sunbed, lines, note } = req.body as { sunbed?: string; lines?: Array<{ product_id: number; qty: number }>; note?: string };
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, 200) : '';
    if (!Array.isArray(lines) || lines.length === 0) {
      res.status(400).json({ error: 'Commande vide' });
      return;
    }
    if (!sunbed || !String(sunbed).trim()) {
      res.status(400).json({ error: 'Numéro de transat requis' });
      return;
    }

    // Quantités demandées (bornées), par produit
    const qtyById = new Map<number, number>();
    for (const l of lines) {
      const q = Math.max(0, Math.min(50, Math.floor(Number(l.qty) || 0)));
      if (q > 0) qtyById.set(Number(l.product_id), (qtyById.get(Number(l.product_id)) ?? 0) + q);
    }
    const ids = [...qtyById.keys()];
    if (!ids.length) {
      res.status(400).json({ error: 'Commande vide' });
      return;
    }

    // Articles réellement proposés (activés + catégorie activée), prix/TVA depuis la base
    const { data: items } = await supabase
      .from('app_menu_items')
      .select('product_id,name,price,vat_id,vat_rate,prep_type,prep_order_id,enabled,family_id')
      .in('product_id', ids)
      .eq('enabled', true);
    const { data: fams } = await supabase.from('app_menu_families').select('family_id').eq('enabled', true);
    const okFam = new Set((fams ?? []).map((f) => f.family_id));
    const valid = (items ?? []).filter((it) => okFam.has(it.family_id));
    if (!valid.length) {
      res.status(400).json({ error: 'Aucun article valide' });
      return;
    }

    const orderLines = valid.map((it) => {
      const qty = qtyById.get(it.product_id)!;
      return {
        product_id: it.product_id,
        name: it.name,
        qty,
        unit_price: Number(it.price),
        vat_id: it.vat_id,
        vat_rate: it.vat_rate,
        prep_type: it.prep_type,
        prep_order_id: it.prep_order_id,
      };
    });
    const total = Math.round(orderLines.reduce((s, l) => s + l.unit_price * l.qty, 0) * 100) / 100;
    if (total <= 0) {
      res.status(400).json({ error: 'Montant invalide' });
      return;
    }

    // Créer la commande + ses lignes
    const { data: order, error: oErr } = await supabase
      .from('app_orders')
      .insert({ user_id: req.user!.id, sunbed: String(sunbed).trim(), total, status: 'pending', note: cleanNote || null })
      .select('id')
      .single();
    if (oErr || !order) {
      res.status(500).json({ error: oErr?.message ?? 'Création commande impossible' });
      return;
    }
    await supabase.from('app_order_lines').insert(orderLines.map((l) => ({ order_id: order.id, ...l })));

    // Paiement Stripe
    const pi = await getStripe().paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'eur',
      capture_method: 'automatic',
      metadata: { type: 'menu_order', orderId: order.id, userId: req.user!.id },
    });
    await supabase.from('app_orders').update({ stripe_payment_intent_id: pi.id }).eq('id', order.id);

    res.json({ orderId: order.id, clientSecret: pi.client_secret, total });
  } catch (err: any) {
    console.error('Erreur création commande:', err);
    res.status(500).json({ error: err?.message ?? 'Erreur commande' });
  }
});

/**
 * POST /api/menu/sync — resynchronise la carte (produits/familles) depuis la
 * caisse Ágora vers Supabase. Réservé admin. Préserve les interrupteurs.
 */
router.post('/sync', requireAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const result = await syncAgoraMenu();
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Erreur sync menu Ágora:', err);
    res.status(500).json({ error: err?.message ?? 'Erreur de synchronisation' });
  }
});

export default router;
