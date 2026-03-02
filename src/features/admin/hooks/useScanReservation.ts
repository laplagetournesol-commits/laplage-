import { useState, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';

interface ScannedReservation {
  type: 'beach' | 'restaurant' | 'event';
  id: string;
  qrCode: string;
  status: string;
  date: string;
  // Client
  clientName: string;
  clientEmail: string;
  clientVipLevel: string;
  clientTokens: number;
  // Details
  locationLabel: string;
  zoneName: string;
  guestCount: number;
  timeSlot?: string;
  totalPrice?: number;
  depositAmount?: number;
  depositPaid?: boolean;
  specialRequests?: string | null;
  // Addons (beach only)
  addons?: { name: string; quantity: number }[];
  // Event only
  ticketType?: string;
  eventTitle?: string;
}

export function useScanReservation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ScannedReservation | null>(null);

  const scan = useCallback(async (qrCode: string) => {
    setLoading(true);
    setError(null);
    setReservation(null);

    try {
      // 1. Try beach reservation
      const { data: beach } = await supabase
        .from('beach_reservations')
        .select('*, sunbed:sunbeds(label, zone:beach_zones(name, zone_type)), profile:profiles(full_name, email, vip_level, beach_tokens)')
        .eq('qr_code', qrCode)
        .single();

      if (beach) {
        // Fetch addons
        const { data: addonRows } = await supabase
          .from('reservation_addons')
          .select('quantity, addon:addons(name)')
          .eq('reservation_id', beach.id);

        setReservation({
          type: 'beach',
          id: beach.id,
          qrCode: beach.qr_code,
          status: beach.status,
          date: beach.date,
          clientName: (beach as any).profile?.full_name ?? 'Inconnu',
          clientEmail: (beach as any).profile?.email ?? '',
          clientVipLevel: (beach as any).profile?.vip_level ?? 'standard',
          clientTokens: (beach as any).profile?.beach_tokens ?? 0,
          locationLabel: (beach as any).sunbed?.label ?? '',
          zoneName: (beach as any).sunbed?.zone?.name ?? '',
          guestCount: beach.guest_count,
          totalPrice: beach.total_price,
          depositAmount: beach.deposit_amount,
          depositPaid: beach.deposit_paid,
          specialRequests: beach.special_requests,
          addons: addonRows?.map((r: any) => ({
            name: r.addon?.name ?? '',
            quantity: r.quantity,
          })) ?? [],
        });
        setLoading(false);
        return;
      }

      // 2. Try restaurant reservation
      const { data: resto } = await supabase
        .from('restaurant_reservations')
        .select('*, table:restaurant_tables(label, seats, zone:restaurant_zones(name, zone_type)), profile:profiles(full_name, email, vip_level, beach_tokens)')
        .eq('qr_code', qrCode)
        .single();

      if (resto) {
        setReservation({
          type: 'restaurant',
          id: resto.id,
          qrCode: resto.qr_code,
          status: resto.status,
          date: resto.date,
          clientName: (resto as any).profile?.full_name ?? 'Inconnu',
          clientEmail: (resto as any).profile?.email ?? '',
          clientVipLevel: (resto as any).profile?.vip_level ?? 'standard',
          clientTokens: (resto as any).profile?.beach_tokens ?? 0,
          locationLabel: (resto as any).table?.label ?? '',
          zoneName: (resto as any).table?.zone?.name ?? '',
          guestCount: resto.guest_count,
          timeSlot: resto.time_slot,
          depositAmount: resto.deposit_amount,
          depositPaid: resto.deposit_paid,
          specialRequests: resto.special_requests,
        });
        setLoading(false);
        return;
      }

      // 3. Try event ticket
      const { data: ticket } = await supabase
        .from('event_tickets')
        .select('*, event:events(title, date, start_time, end_time, category), profile:profiles(full_name, email, vip_level, beach_tokens)')
        .eq('qr_code', qrCode)
        .single();

      if (ticket) {
        setReservation({
          type: 'event',
          id: ticket.id,
          qrCode: ticket.qr_code,
          status: ticket.status,
          date: (ticket as any).event?.date ?? '',
          clientName: (ticket as any).profile?.full_name ?? 'Inconnu',
          clientEmail: (ticket as any).profile?.email ?? '',
          clientVipLevel: (ticket as any).profile?.vip_level ?? 'standard',
          clientTokens: (ticket as any).profile?.beach_tokens ?? 0,
          locationLabel: (ticket as any).event?.title ?? '',
          zoneName: (ticket as any).event?.category ?? '',
          guestCount: 1,
          ticketType: ticket.ticket_type,
          eventTitle: (ticket as any).event?.title,
          totalPrice: ticket.price,
        });
        setLoading(false);
        return;
      }

      setError('QR code non reconnu');
      setLoading(false);
    } catch (err: any) {
      setError(err.message ?? 'Erreur de scan');
      setLoading(false);
    }
  }, []);

  const checkIn = useCallback(async () => {
    if (!reservation) return;

    try {
      if (reservation.type === 'beach') {
        await supabase
          .from('beach_reservations')
          .update({ status: 'checked_in' })
          .eq('id', reservation.id);
      } else if (reservation.type === 'restaurant') {
        await supabase
          .from('restaurant_reservations')
          .update({ status: 'checked_in' })
          .eq('id', reservation.id);
      } else if (reservation.type === 'event') {
        await supabase
          .from('event_tickets')
          .update({ status: 'used', checked_in_at: new Date().toISOString() })
          .eq('id', reservation.id);
      }

      setReservation((r) => r ? { ...r, status: reservation.type === 'event' ? 'used' : 'checked_in' } : null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [reservation]);

  const reset = useCallback(() => {
    setReservation(null);
    setError(null);
  }, []);

  return { scan, checkIn, reset, reservation, loading, error };
}
