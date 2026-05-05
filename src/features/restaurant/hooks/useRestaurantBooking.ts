import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import { formatLocalDate } from '@/shared/lib/date';
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
  const [forcedDeposit, setForcedDeposit] = useState(false);
  const [depositStartsOn, setDepositStartsOn] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('restaurant_settings')
      .select('key, value')
      .in('key', ['require_deposit', 'deposit_starts_on'])
      .then(({ data }) => {
        for (const row of data ?? []) {
          if (row.key === 'require_deposit') setForcedDeposit(row.value as boolean);
          if (row.key === 'deposit_starts_on') setDepositStartsOn(row.value as string);
        }
      });
  }, []);

  // Empreinte requise si la date de la résa est au-delà du seuil OU si admin a forcé
  const dateRequiresDeposit = depositStartsOn ? state.date >= depositStartsOn : false;
  const requireDeposit = forcedDeposit || dateRequiresDeposit;

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
    setState((s) => ({ ...s, guestCount: Math.max(1, Math.min(count, 99)) }));
  }, []);

  const setSpecialRequests = useCallback((text: string) => {
    setState((s) => ({ ...s, specialRequests: text }));
  }, []);

  const depositAmount = requireDeposit ? 25 * state.guestCount : 0;

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

      // Vérifier s'il existe déjà une réservation pending pour cette zone/date/créneau
      const { data: existingRes } = await supabase
        .from('restaurant_reservations')
        .select('*')
        .eq('user_id', user.id)
        .eq('zone_id', state.zone.id)
        .eq('date', state.date)
        .eq('time_slot', timeSlotForDB)
        .eq('status', 'pending')
        .maybeSingle();

      let reservation = existingRes;

      if (!reservation) {
        const { data: newRes, error: resError } = await supabase
          .from('restaurant_reservations')
          .insert({
            user_id: user.id,
            zone_id: state.zone.id,
            table_id: null,
            date: state.date,
            time: state.time,
            time_slot: timeSlotForDB,
            guest_count: state.guestCount,
            status: 'confirmed',
            deposit_amount: depositAmount,
            deposit_paid: false,
            special_requests: state.specialRequests || null,
          })
          .select()
          .single();

        if (resError) throw new Error(resError.message);
        reservation = newRes;
      }

      // Le push/email sera envoyé après confirmation (dans restaurant.tsx)

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
  return formatLocalDate(new Date());
}
