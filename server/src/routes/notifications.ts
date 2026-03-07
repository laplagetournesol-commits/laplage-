import { Router } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { sendPushToTokens, sendPushToUser, sendPushToAll } from '../lib/push';
import { sendReminders } from '../cron/reminders';

const router = Router();

/**
 * POST /api/notifications/register-token
 * Enregistre un push token Expo pour l'utilisateur connecté.
 */
router.post('/register-token', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user!.id;

    if (!token) {
      res.status(400).json({ error: 'token est requis' });
      return;
    }

    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: platform ?? 'ios' },
      { onConflict: 'token' },
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('Erreur register-token:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/**
 * POST /api/notifications/push
 * Envoie des notifications push via Expo Push API (admin uniquement)
 */
router.post('/push', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, body, segment, data } = req.body;

    if (!title || !body) {
      res.status(400).json({ error: 'title et body sont requis' });
      return;
    }

    // Récupérer les tokens selon le segment
    let tokens: string[] = [];

    if (segment === 'vip') {
      const { data: result } = await supabase
        .from('push_tokens')
        .select('token, profile:profiles!inner(vip_level)')
        .in('profiles.vip_level', ['silver', 'gold', 'platinum']);
      tokens = result?.map((r: any) => r.token) ?? [];
    } else if (segment === 'gold+') {
      const { data: result } = await supabase
        .from('push_tokens')
        .select('token, profile:profiles!inner(vip_level)')
        .in('profiles.vip_level', ['gold', 'platinum']);
      tokens = result?.map((r: any) => r.token) ?? [];
    } else if (segment === 'event_attendees') {
      const { data: tickets } = await supabase
        .from('event_tickets')
        .select('user_id')
        .in('status', ['active', 'used']);

      if (tickets && tickets.length > 0) {
        const userIds = [...new Set(tickets.map((t) => t.user_id))];
        const { data: result } = await supabase
          .from('push_tokens')
          .select('token')
          .in('user_id', userIds);
        tokens = result?.map((r) => r.token) ?? [];
      }
    } else if (segment === 'beach_clients') {
      const { data: reservations } = await supabase
        .from('beach_reservations')
        .select('user_id')
        .eq('status', 'confirmed');

      if (reservations && reservations.length > 0) {
        const userIds = [...new Set(reservations.map((r) => r.user_id))];
        const { data: result } = await supabase
          .from('push_tokens')
          .select('token')
          .in('user_id', userIds);
        tokens = result?.map((r) => r.token) ?? [];
      }
    } else if (segment === 'restaurant_clients') {
      const { data: reservations } = await supabase
        .from('restaurant_reservations')
        .select('user_id')
        .eq('status', 'confirmed');

      if (reservations && reservations.length > 0) {
        const userIds = [...new Set(reservations.map((r) => r.user_id))];
        const { data: result } = await supabase
          .from('push_tokens')
          .select('token')
          .in('user_id', userIds);
        tokens = result?.map((r) => r.token) ?? [];
      }
    } else {
      // all
      const { data: result } = await supabase
        .from('push_tokens')
        .select('token');
      tokens = result?.map((r) => r.token) ?? [];
    }

    if (tokens.length === 0) {
      res.json({ success: true, sent: 0 });
      return;
    }

    const totalSent = await sendPushToTokens(tokens, title, body, data);

    // Sauvegarder dans l'historique
    await supabase.from('push_notifications').insert({
      title,
      body,
      target_segment: segment ?? 'all',
      data: data ?? null,
      sent_count: totalSent,
      sent_at: new Date().toISOString(),
    });

    res.json({ success: true, sent: totalSent });
  } catch (err: any) {
    console.error('Erreur push notification:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/**
 * POST /api/notifications/event-published
 * Notifie tous les utilisateurs qu'un nouvel événement est publié (admin uniquement).
 */
router.post('/event-published', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId, title } = req.body;

    if (!eventId || !title) {
      res.status(400).json({ error: 'eventId et title sont requis' });
      return;
    }

    const sent = await sendPushToAll(
      'Nouvel événement',
      `${title} — Réserve ta place !`,
      { type: 'event_published', eventId },
    );

    res.json({ success: true, sent });
  } catch (err: any) {
    console.error('Erreur event-published:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/**
 * POST /api/notifications/booking-confirmed
 * Envoie une push de confirmation de réservation à l'utilisateur.
 */
router.post('/booking-confirmed', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type, reservationId } = req.body;

    if (!type || !reservationId) {
      res.status(400).json({ error: 'type et reservationId sont requis' });
      return;
    }

    const label = type === 'beach' ? 'plage' : 'restaurant';
    const sent = await sendPushToUser(
      userId,
      'Réservation confirmée',
      `Votre réservation ${label} a été enregistrée. À bientôt !`,
      { type: 'booking_confirmed', reservationType: type, reservationId },
    );

    res.json({ success: true, sent });
  } catch (err: any) {
    console.error('Erreur booking-confirmed:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

/**
 * POST /api/notifications/trigger-reminders
 * Déclenche manuellement les rappels J-1 (admin uniquement).
 */
router.post('/trigger-reminders', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await sendReminders();
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Erreur trigger-reminders:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

export default router;
