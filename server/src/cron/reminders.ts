import { supabase } from '../lib/supabase';
import { sendPushToUser } from '../lib/push';

// Anti-doublon : Set des reservation_id déjà notifiés
const notifiedReservations = new Set<string>();

/**
 * Envoie les rappels J-1 pour les réservations de demain.
 * Appelé par le cron ou manuellement via l'endpoint trigger.
 */
export async function sendReminders(): Promise<{
  beach: number;
  restaurant: number;
  events: number;
}> {
  // Demain en timezone Europe/Madrid (Espagne)
  const tomorrow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }),
  );
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  let beach = 0;
  let restaurant = 0;
  let events = 0;

  // Rappels réservations plage
  const { data: beachRes } = await supabase
    .from('beach_reservations')
    .select('id, user_id')
    .eq('date', tomorrowStr)
    .eq('status', 'confirmed');

  if (beachRes) {
    for (const r of beachRes) {
      const key = `beach_${r.id}`;
      if (notifiedReservations.has(key)) continue;
      await sendPushToUser(
        r.user_id,
        'Rappel : Plage demain',
        'Votre transat vous attend demain à La Plage Tournesol !',
        { type: 'beach_reminder', reservationId: r.id },
      );
      notifiedReservations.add(key);
      beach++;
    }
  }

  // Rappels réservations restaurant
  const { data: restaurantRes } = await supabase
    .from('restaurant_reservations')
    .select('id, user_id, time_slot')
    .eq('date', tomorrowStr)
    .eq('status', 'confirmed');

  if (restaurantRes) {
    for (const r of restaurantRes) {
      const key = `restaurant_${r.id}`;
      if (notifiedReservations.has(key)) continue;
      const slot = r.time_slot === 'lunch' ? 'déjeuner' : 'dîner';
      await sendPushToUser(
        r.user_id,
        'Rappel : Restaurant demain',
        `Votre ${slot} au restaurant est demain. À bientôt !`,
        { type: 'restaurant_reminder', reservationId: r.id },
      );
      notifiedReservations.add(key);
      restaurant++;
    }
  }

  // Rappels événements
  const { data: eventTickets } = await supabase
    .from('event_tickets')
    .select('id, user_id, event:events!inner(title, date)')
    .eq('events.date', tomorrowStr)
    .in('status', ['active', 'used']);

  if (eventTickets) {
    for (const t of eventTickets) {
      const key = `event_${t.id}`;
      if (notifiedReservations.has(key)) continue;
      const event = t.event as any;
      await sendPushToUser(
        t.user_id,
        'Rappel : Événement demain',
        `${event.title} c'est demain ! On vous attend.`,
        { type: 'event_reminder', eventId: t.id },
      );
      notifiedReservations.add(key);
      events++;
    }
  }

  return { beach, restaurant, events };
}

/**
 * Démarre le cron de rappels J-1.
 * S'exécute toutes les heures et n'envoie les rappels que vers 10h (heure Espagne).
 */
export function startRemindersCron() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 heure

  const check = async () => {
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }),
    );
    const hour = now.getHours();

    // Envoyer les rappels entre 10h et 10h59 heure espagnole
    if (hour === 10) {
      console.log('[Cron] Envoi des rappels J-1...');
      try {
        const result = await sendReminders();
        console.log('[Cron] Rappels envoyés:', result);
      } catch (err) {
        console.error('[Cron] Erreur rappels:', err);
      }
    }
  };

  // Vérifier immédiatement au démarrage
  check();
  // Puis toutes les heures
  setInterval(check, INTERVAL_MS);

  console.log('[Cron] Rappels J-1 programmés (vérification toutes les heures)');
}
