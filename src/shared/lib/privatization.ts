import { supabase } from './supabase';

export interface DayPrivatization {
  beach: boolean;   // transats bloqués (portée journée)
  lunch: boolean;   // resto midi bloqué (portée journée)
  dinner: boolean;  // resto soir bloqué (portée soir)
  title: string | null;
}

/**
 * Un événement PRIVÉ + CONFIRMÉ à cette date, avec une portée de privatisation,
 * bloque les réservations correspondantes :
 *  - 'day'          → plage + resto midi
 *  - 'evening'      → resto soir
 *  - 'day_evening'  → tout
 * Non confirmé = rien n'est bloqué (juste prévu).
 */
export async function getDayPrivatization(date: string): Promise<DayPrivatization> {
  const result: DayPrivatization = { beach: false, lunch: false, dinner: false, title: null };
  if (!date) return result;
  const { data } = await supabase
    .from('events')
    .select('title, privatize_scope')
    .eq('date', date)
    .eq('is_private', true)
    .eq('is_confirmed', true)
    .not('privatize_scope', 'is', null);
  for (const e of (data ?? []) as { title: string; privatize_scope: string }[]) {
    if (e.privatize_scope === 'day' || e.privatize_scope === 'day_evening') { result.beach = true; result.lunch = true; }
    if (e.privatize_scope === 'evening' || e.privatize_scope === 'day_evening') { result.dinner = true; }
    result.title = e.title ?? result.title;
  }
  return result;
}
