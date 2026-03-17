import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import type { RestaurantZone } from '@/shared/types';

export type RestaurantBookingStep = 'select' | 'confirm';

interface BookingState {
  step: RestaurantBookingStep;
  date: string;
  time: string;
  zone: RestaurantZone | null;
  guestCount: number;
  specialRequests: string;
}

export function useRestaurantBooking() {
  const [state, setState] = useState<BookingState>({
    step: 'select',
    date: getDefaultDate(),
    time: '12:00',
    zone: null,
    guestCount: 2,
    specialRequests: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requireDeposit, setRequireDeposit] = useState(false);

  useEffect(() => {
    supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'require_deposit')
      .single()
      .then(({ data }) => {
        if (data) setRequireDeposit(data.value as boolean);
      });
  }, []);

  const setDate = useCallback((date: string) => {
    setState((s) => ({ ...s, date }));
  }, []);

  const setTime = useCallback((time: string) => {
    setState((s) => ({ ...s, time }));
  }, []);

  const selectZone = useCallback((zone: RestaurantZone | null) => {
    setState((s) => ({ ...s, zone }));
  }, []);

  const goToConfirm = useCallback(() => {
    setState((s) => ({ ...s, step: 'confirm' }));
  }, []);

  const goBack = useCallback(() => {
    setState((s) => ({ ...s, step: 'select' }));
  }, []);

  const setGuestCount = useCallback((count: number) => {
    setState((s) => ({ ...s, guestCount: Math.max(1, Math.min(count, 12)) }));
  }, []);

  const setSpecialRequests = useCallback((text: string) => {
    setState((s) => ({ ...s, specialRequests: text }));
  }, []);

  const depositAmount = requireDeposit ? 30 * state.guestCount : 0;

  // Déduire le time_slot pour la BDD (lunch/dinner)
  const timeSlotForDB = parseInt(state.time.split(':')[0]) < 18 ? 'lunch' : 'dinner';

  const submitBooking = useCallback(async () => {
    if (!state.zone) return { success: false };
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour réserver');

      // Vérifier la capacité max
      const maxKey = timeSlotForDB === 'lunch' ? 'max_covers_lunch' : 'max_covers_dinner';
      const { data: maxSetting } = await supabase
        .from('restaurant_settings')
        .select('value')
        .eq('key', maxKey)
        .single();

      if (maxSetting) {
        const maxCovers = maxSetting.value as number;
        const { data: existing } = await supabase
          .from('restaurant_reservations')
          .select('guest_count')
          .eq('date', state.date)
          .eq('time_slot', timeSlotForDB)
          .eq('status', 'confirmed');

        const totalCovers = (existing ?? []).reduce((sum: number, r: { guest_count: number }) => sum + r.guest_count, 0);
        if (totalCovers + state.guestCount > maxCovers) {
          throw new Error(`Complet pour ce service ! (${totalCovers}/${maxCovers} couverts)`);
        }
      }

      const { data: reservation, error: resError } = await supabase
        .from('restaurant_reservations')
        .insert({
          user_id: user.id,
          zone_id: state.zone.id,
          table_id: null,
          date: state.date,
          time: state.time,
          time_slot: timeSlotForDB,
          guest_count: state.guestCount,
          status: 'pending',
          deposit_amount: depositAmount,
          deposit_paid: false,
          special_requests: state.specialRequests || null,
        })
        .select()
        .single();

      if (resError) throw new Error(resError.message);

      // Le push sera envoyé après le paiement (dans restaurant.tsx)

      setSubmitting(false);
      return { success: true, reservationId: reservation.id, qrCode: reservation.qr_code };
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      return { success: false, reservationId: undefined, qrCode: undefined };
    }
  }, [state, depositAmount, timeSlotForDB]);

  const reset = useCallback(() => {
    setState({
      step: 'select',
      date: getDefaultDate(),
      time: '12:00',
      zone: null,
      guestCount: 2,
      specialRequests: '',
    });
    setError(null);
  }, []);

  return {
    ...state,
    submitting,
    error,
    depositAmount,
    requireDeposit,
    setDate,
    setTime,
    selectZone,
    setGuestCount,
    setSpecialRequests,
    goToConfirm,
    goBack,
    submitBooking,
    reset,
  };
}

function getDefaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
