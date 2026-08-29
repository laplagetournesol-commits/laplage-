import { useState, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';

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
  // Contrôle de validité au scan (QR passé / déjà utilisé / autre jour)
  blocked?: boolean;
  warning?: string | null;
  warningLevel?: 'red' | 'orange' | null;
}

/** Date du jour en heure de Madrid (YYYY-MM-DD). */
function madridToday(): string {
  const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** Vérifie si un QR scanné est valide POUR AUJOURD'HUI. Bloque les QR passés / déjà utilisés / d'un autre jour. */
function computeValidity(date: string, status: string): { blocked: boolean; warning: string | null; warningLevel: 'red' | 'orange' | null } {
  const today = madridToday();
  const fmt = (d: string) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return d; } };
  const ok = { blocked: false, warning: null, warningLevel: null as null };

  if (status === 'cancelled') return { blocked: true, warning: 'Réservation annulée', warningLevel: 'red' };
  if (status === 'no_show') return { blocked: true, warning: 'Réservation non honorée (no-show)', warningLevel: 'red' };
  if (status === 'completed' || status === 'used') return { blocked: true, warning: 'Réservation terminée — ce QR a déjà été utilisé', warningLevel: 'red' };
  if (date && date < today) return { blocked: true, warning: `Réservation passée (${fmt(date)}) — QR expiré`, warningLevel: 'red' };
  if (date && date > today) return { blocked: true, warning: `Réservation pour le ${fmt(date)} — pas aujourd'hui`, warningLevel: 'orange' };
  if (status === 'checked_in') return { blocked: true, warning: 'Déjà enregistré — check-in déjà effectué', warningLevel: 'orange' };
  return ok;
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
        .select('*, sunbed:sunbeds!sunbed_id(label, zone:beach_zones(name, zone_type)), profile:profiles(full_name, email, vip_level)')
        .eq('qr_code', qrCode)
        .single();

      if (beach) {
        // Fetch addons
        const { data: addonRows } = await supabase
          .from('reservation_addons')
          .select('quantity, addon:addons(name)')
          .eq('reservation_id', beach.id);

        // Fetch all sunbeds linked to this reservation (multi-transat)
        const { data: linkedSunbeds } = await supabase
          .from('beach_reservation_sunbeds')
          .select('sunbed:sunbeds(label, zone:beach_zones(name))')
          .eq('reservation_id', beach.id);

        const labels = (linkedSunbeds ?? [])
          .map((r: any) => r.sunbed?.label)
          .filter(Boolean);
        const zoneNames = (linkedSunbeds ?? [])
          .map((r: any) => r.sunbed?.zone?.name)
          .filter(Boolean);
        const fallbackLabel = (beach as any).sunbed?.label ?? '';
        const fallbackZone = (beach as any).sunbed?.zone?.name ?? '';

        setReservation({
          type: 'beach',
          id: beach.id,
          qrCode: beach.qr_code,
          status: beach.status,
          date: beach.date,
          ...computeValidity(beach.date, beach.status),
          clientName: (beach as any).profile?.full_name ?? 'Inconnu',
          clientEmail: (beach as any).profile?.email ?? '',
          clientVipLevel: (beach as any).profile?.vip_level ?? 'standard',
          locationLabel: labels.length > 0 ? labels.join(', ') : fallbackLabel,
          zoneName: zoneNames.length > 0 ? Array.from(new Set(zoneNames)).join(', ') : fallbackZone,
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
        .select('*, table:restaurant_tables(label, seats, zone:restaurant_zones(name, zone_type)), profile:profiles(full_name, email, vip_level)')
        .eq('qr_code', qrCode)
        .single();

      if (resto) {
        setReservation({
          type: 'restaurant',
          id: resto.id,
          qrCode: resto.qr_code,
          status: resto.status,
          date: resto.date,
          ...computeValidity(resto.date, resto.status),
          clientName: (resto as any).profile?.full_name ?? 'Inconnu',
          clientEmail: (resto as any).profile?.email ?? '',
          clientVipLevel: (resto as any).profile?.vip_level ?? 'standard',
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
        .select('*, event:events(title, date, start_time, end_time, category), profile:profiles(full_name, email, vip_level)')
        .eq('qr_code', qrCode)
        .single();

      if (ticket) {
        setReservation({
          type: 'event',
          id: ticket.id,
          qrCode: ticket.qr_code,
          status: ticket.status,
          date: (ticket as any).event?.date ?? '',
          ...computeValidity((ticket as any).event?.date ?? '', ticket.status),
          clientName: (ticket as any).profile?.full_name ?? 'Inconnu',
          clientEmail: (ticket as any).profile?.email ?? '',
          clientVipLevel: (ticket as any).profile?.vip_level ?? 'standard',
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
    // Sécurité : jamais de check-in sur un QR passé / déjà utilisé / d'un autre jour.
    if (reservation.blocked) { setError(reservation.warning ?? 'Réservation non valide pour aujourd\'hui'); return; }

    try {
      if (reservation.type === 'beach') {
        await supabase
          .from('beach_reservations')
          .update({ status: 'checked_in' })
          .eq('id', reservation.id);
      } else if (reservation.type === 'restaurant') {
        // Libérer la pré-autorisation Stripe (empreinte CB)
        if (reservation.depositPaid) {
          try {
            await apiCall('/api/payments/cancel-hold', { reservationId: reservation.id });
          } catch {
            // Si l'annulation échoue, on continue le check-in quand même
            console.warn('Impossible d\'annuler la pré-autorisation Stripe');
          }
        }
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

  // Libérer le transat (admin: quand le client part)
  const release = useCallback(async () => {
    if (!reservation || reservation.type !== 'beach') return;

    try {
      await supabase
        .from('beach_reservations')
        .update({ status: 'completed' })
        .eq('id', reservation.id);

      setReservation((r) => r ? { ...r, status: 'completed' } : null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [reservation]);

  const reset = useCallback(() => {
    setReservation(null);
    setError(null);
  }, []);

  return { scan, checkIn, release, reset, reservation, loading, error };
}
