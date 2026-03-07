import { useState, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import type { RestaurantTable, RestaurantZone } from '@/shared/types';

export type RestaurantBookingStep = 'select' | 'confirm';

interface BookingState {
  step: RestaurantBookingStep;
  date: string;
  timeSlot: 'lunch' | 'dinner';
  table: (RestaurantTable & { zone: RestaurantZone }) | null;
  guestCount: number;
  specialRequests: string;
}

export function useRestaurantBooking() {
  const [state, setState] = useState<BookingState>({
    step: 'select',
    date: getDefaultDate(),
    timeSlot: 'lunch',
    table: null,
    guestCount: 2,
    specialRequests: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDate = useCallback((date: string) => {
    setState((s) => ({ ...s, date, table: null, step: 'select' }));
  }, []);

  const setTimeSlot = useCallback((timeSlot: 'lunch' | 'dinner') => {
    setState((s) => ({ ...s, timeSlot, table: null, step: 'select' }));
  }, []);

  const selectTable = useCallback((table: (RestaurantTable & { zone: RestaurantZone }) | null) => {
    setState((s) => ({ ...s, table }));
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

  const minSpend = state.table?.zone?.min_spend ?? 0;
  const depositAmount = Math.ceil(minSpend * 0.3);

  const submitBooking = useCallback(async () => {
    if (!state.table) return { success: false };
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour réserver');

      const { data: reservation, error: resError } = await supabase
        .from('restaurant_reservations')
        .insert({
          user_id: user.id,
          table_id: state.table.id,
          date: state.date,
          time_slot: state.timeSlot,
          guest_count: state.guestCount,
          status: 'confirmed',
          deposit_amount: depositAmount,
          deposit_paid: false,
          special_requests: state.specialRequests || null,
        })
        .select()
        .single();

      if (resError) throw new Error(resError.message);

      // +10 Beach Tokens
      await supabase.from('token_transactions').insert({
        user_id: user.id,
        amount: 10,
        type: 'earn',
        reason: 'Réservation restaurant',
        reference_type: 'restaurant_reservation',
        reference_id: reservation.id,
      });

      // Push de confirmation
      apiCall('/api/notifications/booking-confirmed', {
        type: 'restaurant',
        reservationId: reservation.id,
      }).catch(() => {});

      setSubmitting(false);
      return { success: true, reservationId: reservation.id, qrCode: reservation.qr_code };
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      return { success: false, reservationId: undefined, qrCode: undefined };
    }
  }, [state, depositAmount]);

  const reset = useCallback(() => {
    setState({
      step: 'select',
      date: getDefaultDate(),
      timeSlot: 'lunch',
      table: null,
      guestCount: 2,
      specialRequests: '',
    });
    setError(null);
  }, []);

  return {
    ...state,
    submitting,
    error,
    minSpend,
    depositAmount,
    setDate,
    setTimeSlot,
    selectTable,
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
