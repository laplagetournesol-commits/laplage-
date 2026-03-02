import { useState, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Sunbed, BeachZone, Addon } from '@/shared/types';

export type BookingStep = 'select' | 'addons' | 'confirm';

interface SelectedAddon {
  addon: Addon;
  quantity: number;
}

interface BookingState {
  step: BookingStep;
  date: string;
  sunbed: (Sunbed & { zone: BeachZone }) | null;
  guestCount: number;
  selectedAddons: SelectedAddon[];
  specialRequests: string;
}

export function useBeachBooking() {
  const [state, setState] = useState<BookingState>({
    step: 'select',
    date: getDefaultDate(),
    sunbed: null,
    guestCount: 1,
    selectedAddons: [],
    specialRequests: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDate = useCallback((date: string) => {
    setState((s) => ({ ...s, date, sunbed: null, step: 'select' }));
  }, []);

  const selectSunbed = useCallback((sunbed: (Sunbed & { zone: BeachZone }) | null) => {
    setState((s) => ({ ...s, sunbed }));
  }, []);

  const goToAddons = useCallback(() => {
    setState((s) => ({ ...s, step: 'addons' }));
  }, []);

  const goToConfirm = useCallback(() => {
    setState((s) => ({ ...s, step: 'confirm' }));
  }, []);

  const goBack = useCallback(() => {
    setState((s) => ({
      ...s,
      step: s.step === 'confirm' ? 'addons' : 'select',
    }));
  }, []);

  const setGuestCount = useCallback((count: number) => {
    setState((s) => ({ ...s, guestCount: Math.max(1, Math.min(count, 10)) }));
  }, []);

  const toggleAddon = useCallback((addon: Addon) => {
    setState((s) => {
      const existing = s.selectedAddons.find((a) => a.addon.id === addon.id);
      if (existing) {
        return {
          ...s,
          selectedAddons: s.selectedAddons.filter((a) => a.addon.id !== addon.id),
        };
      }
      return {
        ...s,
        selectedAddons: [...s.selectedAddons, { addon, quantity: 1 }],
      };
    });
  }, []);

  const updateAddonQuantity = useCallback((addonId: string, quantity: number) => {
    setState((s) => ({
      ...s,
      selectedAddons: quantity <= 0
        ? s.selectedAddons.filter((a) => a.addon.id !== addonId)
        : s.selectedAddons.map((a) =>
            a.addon.id === addonId ? { ...a, quantity } : a
          ),
    }));
  }, []);

  const setSpecialRequests = useCallback((text: string) => {
    setState((s) => ({ ...s, specialRequests: text }));
  }, []);

  // Calculs de prix
  const basePrice = state.sunbed?.zone?.base_price ?? 0;
  const addonsTotal = state.selectedAddons.reduce(
    (sum, a) => sum + a.addon.price * a.quantity,
    0
  );
  const totalPrice = basePrice + addonsTotal;
  const depositAmount = Math.ceil(totalPrice * 0.3); // 30% d'acompte

  // Soumettre la réservation
  const submitBooking = useCallback(async () => {
    if (!state.sunbed) return { success: false };
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour réserver');

      // Créer la réservation
      const { data: reservation, error: resError } = await supabase
        .from('beach_reservations')
        .insert({
          user_id: user.id,
          sunbed_id: state.sunbed.id,
          date: state.date,
          status: 'confirmed',
          total_price: totalPrice,
          deposit_amount: depositAmount,
          deposit_paid: false, // Sera vrai après paiement Stripe
          guest_count: state.guestCount,
          special_requests: state.specialRequests || null,
        })
        .select()
        .single();

      if (resError) throw new Error(resError.message);

      // Ajouter les add-ons
      if (state.selectedAddons.length > 0 && reservation) {
        const addonRows = state.selectedAddons.map((a) => ({
          reservation_id: reservation.id,
          addon_id: a.addon.id,
          quantity: a.quantity,
          unit_price: a.addon.price,
        }));

        const { error: addonError } = await supabase
          .from('reservation_addons')
          .insert(addonRows);

        if (addonError) console.warn('Erreur addons:', addonError.message);
      }

      // Ajouter des Beach Tokens (10 tokens par réservation)
      await supabase.from('token_transactions').insert({
        user_id: user.id,
        amount: 10,
        type: 'earn',
        reason: 'Réservation plage',
        reference_type: 'beach_reservation',
        reference_id: reservation.id,
      });

      // Mettre à jour les tokens du profil
      try {
        await supabase.rpc('increment_tokens', { user_id: user.id, amount: 10 });
      } catch {
        // RPC pas encore créée, pas grave
      }

      setSubmitting(false);
      return { success: true, reservationId: reservation.id };
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      return { success: false };
    }
  }, [state, totalPrice, depositAmount]);

  const reset = useCallback(() => {
    setState({
      step: 'select',
      date: getDefaultDate(),
      sunbed: null,
      guestCount: 1,
      selectedAddons: [],
      specialRequests: '',
    });
    setError(null);
  }, []);

  return {
    ...state,
    submitting,
    error,
    basePrice,
    addonsTotal,
    totalPrice,
    depositAmount,
    setDate,
    selectSunbed,
    setGuestCount,
    toggleAddon,
    updateAddonQuantity,
    setSpecialRequests,
    goToAddons,
    goToConfirm,
    goBack,
    submitBooking,
    reset,
  };
}

function getDefaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1); // Demain par défaut
  return d.toISOString().split('T')[0];
}
