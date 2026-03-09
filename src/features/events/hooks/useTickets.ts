import { useState, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Event, TicketType, EventTicket } from '@/shared/types';

export function usePurchaseTicket() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchase = useCallback(async (event: Event, ticketType: TicketType) => {
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté');

      const price = ticketType === 'vip' ? (event.vip_price ?? event.standard_price) : event.standard_price;

      // Vérifier la capacité
      if (event.tickets_sold >= event.capacity) {
        throw new Error('Événement complet');
      }

      // Réserver la place d'abord (atomique : SQL incrémente uniquement si < capacity)
      const { data: updated, error: updateError } = await supabase
        .rpc('increment_tickets_sold', { p_event_id: event.id });

      if (updateError || updated === false) throw new Error('Événement complet');

      // Place réservée — créer le ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('event_tickets')
        .insert({
          event_id: event.id,
          user_id: user.id,
          ticket_type: ticketType,
          price,
          status: event.standard_price > 0 ? 'pending' : 'active',
        })
        .select()
        .single();

      if (ticketError) throw new Error(ticketError.message);

      setSubmitting(false);
      return { success: true, ticket: ticket as EventTicket };
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      return { success: false, ticket: null };
    }
  }, []);

  return { purchase, submitting, error };
}

export function useMyTickets() {
  const [tickets, setTickets] = useState<(EventTicket & { event: Event })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('event_tickets')
      .select('*, event:events(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setTickets(data as any);
    setLoading(false);
  }, []);

  return { tickets, loading, refresh: fetch };
}
