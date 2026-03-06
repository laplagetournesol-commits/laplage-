import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';

export interface Attendee {
  id: string;
  ticketType: 'standard' | 'vip';
  status: 'active' | 'used' | 'cancelled' | 'refunded';
  price: number;
  checkedInAt: string | null;
  createdAt: string;
  clientName: string;
  clientEmail: string;
}

export function useEventAttendees(eventId: string) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('event_tickets')
      .select('id, ticket_type, status, price, checked_in_at, created_at, profile:profiles(full_name, email)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (data) {
      setAttendees(
        data.map((t: any) => ({
          id: t.id,
          ticketType: t.ticket_type,
          status: t.status,
          price: t.price,
          checkedInAt: t.checked_in_at,
          createdAt: t.created_at,
          clientName: t.profile?.full_name ?? 'Inconnu',
          clientEmail: t.profile?.email ?? '',
        })),
      );
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  const checkIn = useCallback(async (ticketId: string) => {
    const now = new Date().toISOString();
    await supabase
      .from('event_tickets')
      .update({ status: 'used', checked_in_at: now })
      .eq('id', ticketId);

    setAttendees((prev) =>
      prev.map((a) =>
        a.id === ticketId ? { ...a, status: 'used', checkedInAt: now } : a,
      ),
    );
  }, []);

  const undoCheckIn = useCallback(async (ticketId: string) => {
    await supabase
      .from('event_tickets')
      .update({ status: 'active', checked_in_at: null })
      .eq('id', ticketId);

    setAttendees((prev) =>
      prev.map((a) =>
        a.id === ticketId ? { ...a, status: 'active', checkedInAt: null } : a,
      ),
    );
  }, []);

  const checkedInCount = attendees.filter((a) => a.status === 'used').length;
  const totalActive = attendees.filter((a) => a.status !== 'cancelled' && a.status !== 'refunded').length;

  return { attendees, loading, refresh: fetchAttendees, checkIn, undoCheckIn, checkedInCount, totalActive };
}
