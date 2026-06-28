import { supabase } from '../lib/supabase';
import { captureNoShow } from '../routes/payments';

/**
 * Parcourt les réservations restaurant du jour qui sont restées en `confirmed`
 * (= pas de check-in, donc no-show), et capture leur empreinte CB Stripe.
 * Marque ensuite chacune en `no_show` + `deposit_paid: true`.
 *
 * Lancée automatiquement chaque soir à 23h45 (heure Madrid) par le cron.
 */
export async function captureRestaurantNoShows(): Promise<{ captured: number; failed: number }> {
  const today = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }),
  );
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Les pénalités no-show pour le restaurant ne s'appliquent qu'à partir du
  // 1er juillet 2026. Avant cette date, on ne capture aucune empreinte CB.
  const NO_SHOW_START_DATE = '2026-07-01';
  if (dateStr < NO_SHOW_START_DATE) {
    console.log(`[no-show cron] ${dateStr} — avant le ${NO_SHOW_START_DATE}, capture désactivée`);
    return { captured: 0, failed: 0 };
  }

  const { data: reservations, error } = await supabase
    .from('restaurant_reservations')
    .select('id, date, deposit_amount, stripe_payment_intent_id')
    .eq('date', dateStr)
    .eq('status', 'confirmed')
    .not('stripe_payment_intent_id', 'is', null)
    .gt('deposit_amount', 0);

  if (error) {
    console.error('[no-show cron] erreur fetch:', error);
    return { captured: 0, failed: 0 };
  }

  let captured = 0;
  let failed = 0;
  for (const r of reservations ?? []) {
    const result = await captureNoShow(r.id);
    if (result.captured) captured++;
    else failed++;
  }

  if (captured > 0 || failed > 0) {
    console.log(`[no-show cron] ${dateStr} — capturé: ${captured}, échec: ${failed}`);
  }
  return { captured, failed };
}
