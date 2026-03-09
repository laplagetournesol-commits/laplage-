import { supabase } from '../lib/supabase';
import { sendPushToUser } from '../lib/push';

/**
 * Vérifie si un rappel a déjà été envoyé (anti-doublon persisté en base).
 */
async function alreadySent(reservationId: string, type: string): Promise<boolean> {
  const { data } = await supabase
    .from('sent_reminders')
    .select('id')
    .eq('reservation_id', reservationId)
    .eq('reminder_type', type)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/**
 * Marque un rappel comme envoyé.
 */
async function markSent(reservationId: string, type: string) {
  await supabase.from('sent_reminders').insert({
    reservation_id: reservationId,
    reminder_type: type,
  });
}

/**
 * Envoie les rappels J-1 pour les réservations de demain.
 */
export async function sendRemindersJ1(): Promise<{ beach: number; restaurant: number; events: number }> {
  const tomorrow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }),
  );
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  let beach = 0;
  let restaurant = 0;
  let events = 0;

  // Plage
  const { data: beachRes } = await supabase
    .from('beach_reservations')
    .select('id, user_id')
    .eq('date', tomorrowStr)
    .eq('status', 'confirmed');

  if (beachRes) {
    for (const r of beachRes) {
      if (await alreadySent(r.id, 'beach_j1')) continue;
      await sendPushToUser(
        r.user_id,
        'Rappel : Plage demain ☀️',
        'Votre transat vous attend demain à La Plage Tournesol !',
        { type: 'beach_reminder', reservationId: r.id },
      );
      await markSent(r.id, 'beach_j1');
      beach++;
    }
  }

  // Restaurant
  const { data: restaurantRes } = await supabase
    .from('restaurant_reservations')
    .select('id, user_id, time')
    .eq('date', tomorrowStr)
    .eq('status', 'confirmed');

  if (restaurantRes) {
    for (const r of restaurantRes) {
      if (await alreadySent(r.id, 'restaurant_j1')) continue;
      const heure = r.time ? r.time.slice(0, 5).replace(':', 'h') : '';
      await sendPushToUser(
        r.user_id,
        'Rappel : Restaurant demain 🍽️',
        `Votre table est réservée demain${heure ? ` à ${heure}` : ''}. À bientôt !`,
        { type: 'restaurant_reminder', reservationId: r.id },
      );
      await markSent(r.id, 'restaurant_j1');
      restaurant++;
    }
  }

  // Événements
  const { data: eventTickets } = await supabase
    .from('event_tickets')
    .select('id, user_id, event:events!inner(title, date)')
    .eq('events.date', tomorrowStr)
    .in('status', ['active', 'used']);

  if (eventTickets) {
    for (const t of eventTickets) {
      if (await alreadySent(t.id, 'event_j1')) continue;
      const event = t.event as any;
      await sendPushToUser(
        t.user_id,
        'Rappel : Événement demain 🎉',
        `${event.title} c'est demain ! On vous attend.`,
        { type: 'event_reminder', eventId: t.id },
      );
      await markSent(t.id, 'event_j1');
      events++;
    }
  }

  return { beach, restaurant, events };
}

/**
 * Envoie les rappels H-2 pour les réservations dans ~2 heures.
 */
export async function sendRemindersH2(): Promise<{ beach: number; restaurant: number; events: number }> {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }),
  );
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // Fenêtre H-2 : entre 1h45 et 2h15 avant l'heure de réservation
  const targetMinFrom = (currentHour * 60 + currentMin) + 105; // +1h45
  const targetMinTo = (currentHour * 60 + currentMin) + 135;   // +2h15
  const targetHourFrom = Math.floor(targetMinFrom / 60);
  const targetHourTo = Math.floor(targetMinTo / 60);

  const timeFrom = `${String(targetHourFrom).padStart(2, '0')}:${String(targetMinFrom % 60).padStart(2, '0')}`;
  const timeTo = `${String(targetHourTo).padStart(2, '0')}:${String(targetMinTo % 60).padStart(2, '0')}`;

  let beach = 0;
  let restaurant = 0;
  let events = 0;

  // Plage — rappel H-2 basé sur un créneau par défaut (10h matin)
  // Les réservations plage n'ont pas d'heure précise, on envoie le H-2 le matin à 8h
  // (géré par le cron qui appelle cette fonction à 8h)
  const { data: beachRes } = await supabase
    .from('beach_reservations')
    .select('id, user_id')
    .eq('date', todayStr)
    .eq('status', 'confirmed');

  if (beachRes) {
    for (const r of beachRes) {
      if (await alreadySent(r.id, 'beach_h2')) continue;
      await sendPushToUser(
        r.user_id,
        'C\'est bientôt l\'heure ! ☀️',
        'Votre transat vous attend dans 2 heures à La Plage Tournesol !',
        { type: 'beach_reminder_h2', reservationId: r.id },
      );
      await markSent(r.id, 'beach_h2');
      beach++;
    }
  }

  // Restaurant — H-2 basé sur l'heure de réservation
  const { data: restaurantRes } = await supabase
    .from('restaurant_reservations')
    .select('id, user_id, time')
    .eq('date', todayStr)
    .eq('status', 'confirmed')
    .gte('time', timeFrom)
    .lte('time', timeTo);

  if (restaurantRes) {
    for (const r of restaurantRes) {
      if (await alreadySent(r.id, 'restaurant_h2')) continue;
      const heure = r.time ? r.time.slice(0, 5).replace(':', 'h') : '';
      await sendPushToUser(
        r.user_id,
        'C\'est bientôt l\'heure ! 🍽️',
        `Votre table est dans 2 heures${heure ? ` (${heure})` : ''}. On vous attend !`,
        { type: 'restaurant_reminder_h2', reservationId: r.id },
      );
      await markSent(r.id, 'restaurant_h2');
      restaurant++;
    }
  }

  // Événements — H-2 basé sur l'heure de début
  const { data: eventTickets } = await supabase
    .from('event_tickets')
    .select('id, user_id, event:events!inner(title, date, start_time)')
    .eq('events.date', todayStr)
    .gte('events.start_time', timeFrom)
    .lte('events.start_time', timeTo)
    .in('status', ['active', 'used']);

  if (eventTickets) {
    for (const t of eventTickets) {
      if (await alreadySent(t.id, 'event_h2')) continue;
      const event = t.event as any;
      await sendPushToUser(
        t.user_id,
        'C\'est bientôt l\'heure ! 🎉',
        `${event.title} commence dans 2 heures !`,
        { type: 'event_reminder_h2', eventId: t.id },
      );
      await markSent(t.id, 'event_h2');
      events++;
    }
  }

  return { beach, restaurant, events };
}

/**
 * Wrapper pour l'ancien endpoint trigger-reminders (J-1 uniquement).
 */
export async function sendReminders() {
  return sendRemindersJ1();
}

/**
 * Démarre les crons de rappels.
 * - J-1 : tous les jours à 10h (heure Espagne)
 * - H-2 : toutes les 30 minutes (vérifie les réservations dans ~2h)
 */
export function startRemindersCron() {
  const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

  const check = async () => {
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }),
    );
    const hour = now.getHours();

    // J-1 à 10h
    if (hour === 10 && now.getMinutes() < 30) {
      console.log('[Cron] Envoi des rappels J-1...');
      try {
        const result = await sendRemindersJ1();
        console.log('[Cron] Rappels J-1 envoyés:', result);
      } catch (err) {
        console.error('[Cron] Erreur rappels J-1:', err);
      }
    }

    // H-2 : vérifier toutes les 30 min entre 8h et 23h
    if (hour >= 8 && hour <= 23) {
      console.log('[Cron] Vérification rappels H-2...');
      try {
        const result = await sendRemindersH2();
        const total = result.beach + result.restaurant + result.events;
        if (total > 0) {
          console.log('[Cron] Rappels H-2 envoyés:', result);
        }
      } catch (err) {
        console.error('[Cron] Erreur rappels H-2:', err);
      }
    }
  };

  check();
  setInterval(check, CHECK_INTERVAL);

  console.log('[Cron] Rappels programmés (J-1 à 10h + H-2 toutes les 30min)');
}
