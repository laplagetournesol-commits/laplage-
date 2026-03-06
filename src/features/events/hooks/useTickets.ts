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

      // Créer le ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('event_tickets')
        .insert({
          event_id: event.id,
          user_id: user.id,
          ticket_type: ticketType,
          price,
          status: 'active',
        })
        .select()
        .single();

      if (ticketError) throw new Error(ticketError.message);

      // Mettre à jour le compteur (filtre atomique : rejeté si complet entre-temps)
      const { data: updated, error: updateError } = await supabase
        .from('events')
        .update({ tickets_sold: event.tickets_sold + 1 })
        .eq('id', event.id)
        .lt('tickets_sold', event.capacity)
        .select()
        .single();

      if (updateError || !updated) throw new Error('Événement complet');

      // +5 Beach Tokens
      await supabase.from('token_transactions').insert({
        user_id: user.id,
        amount: ticketType === 'vip' ? 20 : 5,
        type: 'earn',
        reason: `Ticket ${ticketType.toUpperCase()} — ${event.title}`,
        reference_type: 'event_ticket',
        reference_id: ticket.id,
      });

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
