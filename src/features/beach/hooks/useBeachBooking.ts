import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import { getSeasonalPrice, getSeasonalInclusions, zoneToPricingCategory, pricingCategoryLabel } from '@/shared/lib/seasonalPricing';
import type { Sunbed, BeachZone, Addon } from '@/shared/types';

export type BookingStep = 'select' | 'addons' | 'confirm';

interface SelectedAddon {
  addon: Addon;
  quantity: number;
}

interface SunbedWithZone extends Sunbed {
  zone: BeachZone;
  isReserved?: boolean;
}

interface BookingState {
  step: BookingStep;
  date: string;
  sunbed: SunbedWithZone | null;
  secondarySunbed: SunbedWithZone | null;
  guestCount: number;
  selectedAddons: SelectedAddon[];
  specialRequests: string;
  seasonalPrice: number | null;
  seasonLabel: string | null;
  seasonInclusions: string[];
  categoryLabel: string | null;
}

export function useBeachBooking() {
  const [state, setState] = useState<BookingState>({
    step: 'select',
    date: getDefaultDate(),
    sunbed: null,
    secondarySunbed: null,
    guestCount: 1,
    selectedAddons: [],
    specialRequests: '',
    seasonalPrice: null,
    seasonLabel: null,
    seasonInclusions: [],
    categoryLabel: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger le prix saisonnier quand date ou sunbed change
  useEffect(() => {
    if (!state.sunbed) return;
    const zoneType = state.sunbed.zone.zone_type;
    getSeasonalPrice(zoneType, state.date).then(({ price, seasonLabel }) => {
      const inclusions = getSeasonalInclusions(zoneType, seasonLabel);
      const catLabel = pricingCategoryLabel(zoneToPricingCategory(zoneType));
      setState((s) => ({
        ...s,
        seasonalPrice: price,
        seasonLabel,
        seasonInclusions: inclusions,
        categoryLabel: catLabel,
      }));
    });
  }, [state.date, state.sunbed?.id]);

  const setDate = useCallback((date: string) => {
    setState((s) => ({ ...s, date, sunbed: null, secondarySunbed: null, step: 'select', seasonalPrice: null, seasonLabel: null, seasonInclusions: [], categoryLabel: null }));
  }, []);

  const selectSunbed = useCallback((sunbed: SunbedWithZone | null) => {
    setState((s) => ({ ...s, sunbed, secondarySunbed: null }));
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

  // Chercher et définir le transat voisin quand guest_count >= 2
  const updateSecondary = useCallback((allSunbeds: SunbedWithZone[]) => {
    setState((s) => {
      if (!s.sunbed || s.guestCount < 2 || s.sunbed.is_double) {
        return s.secondarySunbed ? { ...s, secondarySunbed: null } : s;
      }
      // Chercher les voisins dans la même rangée (même zone, même svg_y)
      const sameRow = allSunbeds
        .filter((sb) =>
          sb.zone_id === s.sunbed!.zone_id &&
          Number(sb.svg_y) === Number(s.sunbed!.svg_y) &&
          sb.id !== s.sunbed!.id &&
          !sb.isReserved
        )
        .sort((a, b) => Number(a.svg_x) - Number(b.svg_x));

      const x = Number(s.sunbed.svg_x);
      // Voisin le plus proche (préférer la droite)
      let best: SunbedWithZone | null = null;
      let bestDist = Infinity;
      for (const sb of sameRow) {
        const dist = Math.abs(Number(sb.svg_x) - x);
        if (dist < bestDist) {
          bestDist = dist;
          best = sb;
        }
      }
      if (best?.id === s.secondarySunbed?.id) return s;
      return { ...s, secondarySunbed: best };
    });
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

  // Calculs de prix — prix saisonnier prioritaire, sinon base_price
  const unitPrice = state.seasonalPrice ?? state.sunbed?.zone?.base_price ?? 0;
  const basePrice = unitPrice * state.guestCount;
  const addonsTotal = state.selectedAddons.reduce(
    (sum, a) => sum + a.addon.price * a.quantity,
    0
  );
  const totalPrice = basePrice + addonsTotal;
  const depositAmount = totalPrice; // Plage : paiement 100% d'avance

  // Soumettre la réservation
  const submitBooking = useCallback(async () => {
    if (!state.sunbed) return { success: false };
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Vous devez être connecté pour réserver');

      // Vérifier s'il existe déjà une réservation pending pour ce transat/date
      const { data: existing } = await supabase
        .from('beach_reservations')
        .select('*')
        .eq('user_id', user.id)
        .eq('sunbed_id', state.sunbed.id)
        .eq('date', state.date)
        .eq('status', 'pending')
        .maybeSingle();

      let reservation = existing;

      if (!reservation) {
        // Créer la réservation
        const { data: newRes, error: resError } = await supabase
          .from('beach_reservations')
          .insert({
            user_id: user.id,
            sunbed_id: state.sunbed.id,
            secondary_sunbed_id: state.secondarySunbed?.id ?? null,
            date: state.date,
            status: 'pending',
            total_price: totalPrice,
            deposit_amount: depositAmount,
            deposit_paid: false,
            guest_count: state.guestCount,
            special_requests: state.specialRequests || null,
          })
          .select()
          .single();

        if (resError) throw new Error(resError.message);
        reservation = newRes;
      }

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

        if (addonError) throw new Error(addonError.message);
      }

      // La notification push sera envoyée APRÈS le paiement (dans beach.tsx)

      setSubmitting(false);
      return { success: true, reservationId: reservation.id, qrCode: reservation.qr_code };
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      return { success: false, reservationId: undefined, qrCode: undefined };
    }
  }, [state, totalPrice, depositAmount]);

  const reset = useCallback(() => {
    setState({
      step: 'select',
      date: getDefaultDate(),
      sunbed: null,
      secondarySunbed: null,
      guestCount: 1,
      selectedAddons: [],
      specialRequests: '',
      seasonalPrice: null,
      seasonLabel: null,
      seasonInclusions: [],
      categoryLabel: null,
    });
    setError(null);
  }, []);

  return {
    ...state,
    submitting,
    error,
    unitPrice,
    basePrice,
    addonsTotal,
    totalPrice,
    depositAmount,
    setDate,
    selectSunbed,
    setGuestCount,
    updateSecondary,
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
