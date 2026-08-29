import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { apiCall } from '@/shared/lib/api';
import { i18n } from '@/shared/i18n';
import { getSeasonalPrice, getSeasonalInclusions, zoneToPricingCategory, pricingCategoryLabel } from '@/shared/lib/seasonalPricing';
import { formatLocalDate } from '@/shared/lib/date';
import { getDayPrivatization } from '@/shared/lib/privatization';
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

interface SunbedPriceEntry {
  price: number;
  seasonLabel: string | null;
}

interface BookingState {
  step: BookingStep;
  date: string;
  selectedSunbeds: SunbedWithZone[];
  guestCount: number;
  selectedAddons: SelectedAddon[];
  specialRequests: string;
}

export function useBeachBooking() {
  const [state, setState] = useState<BookingState>({
    step: 'select',
    date: getDefaultDate(),
    selectedSunbeds: [],
    guestCount: 1,
    selectedAddons: [],
    specialRequests: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceMap, setPriceMap] = useState<Map<string, SunbedPriceEntry>>(new Map());
  const [modifyingReservationId, setModifyingReservationId] = useState<string | null>(null);
  const [originalTotal, setOriginalTotal] = useState<number>(0);
  const [closedDates, setClosedDates] = useState<string[]>([]);

  // Jours de fermeture plage (indépendants du restaurant)
  useEffect(() => {
    supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'beach_closed_dates')
      .maybeSingle()
      .then(({ data }) => { if (data?.value) setClosedDates(data.value as string[]); });
  }, []);

  const isDateClosed = closedDates.includes(state.date);

  // Charger les prix saisonniers pour chaque transat sélectionné (par zone)
  useEffect(() => {
    if (state.selectedSunbeds.length === 0) {
      setPriceMap(new Map());
      return;
    }
    const uniqueZones = new Map<string, SunbedWithZone>();
    for (const sb of state.selectedSunbeds) {
      uniqueZones.set(sb.zone_id, sb);
    }
    let cancelled = false;
    Promise.all(
      Array.from(uniqueZones.values()).map(async (sb) => {
        const result = await getSeasonalPrice(sb.zone.zone_type, state.date);
        return [sb.zone_id, {
          price: result.price ?? sb.zone.base_price,
          seasonLabel: result.seasonLabel,
        }] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setPriceMap(new Map(entries));
    });
    return () => { cancelled = true; };
  }, [state.date, state.selectedSunbeds.map((s) => s.zone_id).sort().join(',')]);

  const setDate = useCallback((date: string) => {
    setState((s) => ({ ...s, date, selectedSunbeds: [], step: 'select' }));
  }, []);

  const toggleSunbed = useCallback((sunbed: SunbedWithZone) => {
    setState((s) => {
      const exists = s.selectedSunbeds.some((sb) => sb.id === sunbed.id);
      const next = exists
        ? s.selectedSunbeds.filter((sb) => sb.id !== sunbed.id)
        : [...s.selectedSunbeds, sunbed];
      // Personnes calculées automatiquement : 2 par Bed, 1 par transat/chaise longue
      const autoGuests = next.reduce((sum, sb) => sum + (sb.is_double ? 2 : 1), 0);
      return { ...s, selectedSunbeds: next, guestCount: autoGuests || 1 };
    });
  }, []);

  const clearSunbeds = useCallback(() => {
    setState((s) => ({ ...s, selectedSunbeds: [] }));
  }, []);

  const goToAddons = useCallback(() => setState((s) => ({ ...s, step: 'addons' })), []);
  const goToConfirm = useCallback(() => setState((s) => ({ ...s, step: 'confirm' })), []);
  const goBack = useCallback(() => {
    setState((s) => ({ ...s, step: s.step === 'confirm' ? 'addons' : 'select' }));
  }, []);

  const setGuestCount = useCallback((count: number) => {
    setState((s) => ({ ...s, guestCount: Math.max(1, Math.min(count, 99)) }));
  }, []);

  const toggleAddon = useCallback((addon: Addon) => {
    setState((s) => {
      const existing = s.selectedAddons.find((a) => a.addon.id === addon.id);
      if (existing) {
        return { ...s, selectedAddons: s.selectedAddons.filter((a) => a.addon.id !== addon.id) };
      }
      return { ...s, selectedAddons: [...s.selectedAddons, { addon, quantity: 1 }] };
    });
  }, []);

  const updateAddonQuantity = useCallback((addonId: string, quantity: number) => {
    setState((s) => ({
      ...s,
      selectedAddons: quantity <= 0
        ? s.selectedAddons.filter((a) => a.addon.id !== addonId)
        : s.selectedAddons.map((a) => a.addon.id === addonId ? { ...a, quantity } : a),
    }));
  }, []);

  const setSpecialRequests = useCallback((text: string) => {
    setState((s) => ({ ...s, specialRequests: text }));
  }, []);

  // Prix unitaire d'un transat (Bed = 70€ flat, sinon saisonnier ou base_price)
  const priceOf = useCallback((sunbed: SunbedWithZone): number => {
    if (sunbed.is_double) return 70;
    return priceMap.get(sunbed.zone_id)?.price ?? sunbed.zone.base_price;
  }, [priceMap]);

  const basePrice = useMemo(
    () => state.selectedSunbeds.reduce((sum, sb) => sum + priceOf(sb), 0),
    [state.selectedSunbeds, priceOf],
  );

  const addonsTotal = useMemo(
    () => state.selectedAddons.reduce((sum, a) => sum + a.addon.price * a.quantity, 0),
    [state.selectedAddons],
  );

  const totalPrice = basePrice + addonsTotal;
  const depositAmount = totalPrice;

  // Saison + inclusions affichées : dérivés du premier transat sélectionné
  const firstSunbed = state.selectedSunbeds[0];
  const firstSeason = firstSunbed ? priceMap.get(firstSunbed.zone_id)?.seasonLabel ?? null : null;
  const seasonLabel = firstSeason;
  const seasonInclusions = firstSunbed ? getSeasonalInclusions(firstSunbed.zone.zone_type, firstSeason) : [];
  const categoryLabel = firstSunbed ? pricingCategoryLabel(zoneToPricingCategory(firstSunbed.zone.zone_type)) : null;

  // Détail par ligne pour l'affichage : { sunbed, unitPrice }
  const lineItems = useMemo(
    () => state.selectedSunbeds.map((sb) => ({ sunbed: sb, unitPrice: priceOf(sb) })),
    [state.selectedSunbeds, priceOf],
  );

  /**
   * Charge une réservation existante pour la modifier. Pré-remplit la date
   * et les transats sélectionnés.
   */
  const loadForModification = useCallback(async (reservationId: string) => {
    setSubmitting(true);
    try {
      const { data: resa, error: resaErr } = await supabase
        .from('beach_reservations')
        .select('id, date, total_price, sunbeds:beach_reservation_sunbeds(sunbed:sunbeds(*, zone:beach_zones(*)))')
        .eq('id', reservationId)
        .single();
      if (resaErr || !resa) throw new Error(resaErr?.message ?? 'Résa introuvable');

      const sunbeds = (resa.sunbeds as any[])
        .map((row) => row.sunbed)
        .filter(Boolean) as SunbedWithZone[];

      setState((s) => ({
        ...s,
        step: 'select',
        date: resa.date,
        selectedSunbeds: sunbeds,
        guestCount: sunbeds.reduce((sum, sb) => sum + (sb.is_double ? 2 : 1), 0) || 1,
        selectedAddons: [],
        specialRequests: '',
      }));
      setModifyingReservationId(reservationId);
      setOriginalTotal(Number(resa.total_price ?? 0));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, []);

  /**
   * Soumet une modification de réservation. Renvoie { clientSecret } si un
   * paiement complémentaire est nécessaire (différence à régler), sinon
   * juste { success: true }.
   */
  const submitModification = useCallback(async () => {
    if (!modifyingReservationId || state.selectedSunbeds.length === 0) {
      return { success: false, error: i18n.t('selectSunbedFirst') };
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiCall<{
        success: boolean;
        newTotal: number;
        diff: number;
        extraClientSecret: string | null;
        refundedAmount: number;
      }>('/api/payments/reservations/modify-beach', {
        reservationId: modifyingReservationId,
        newDate: state.date,
        newSunbedIds: state.selectedSunbeds.map((sb) => sb.id),
      });
      setSubmitting(false);
      return {
        success: true,
        reservationId: modifyingReservationId,
        diff: result.diff,
        extraClientSecret: result.extraClientSecret,
        refundedAmount: result.refundedAmount,
      };
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      return { success: false, error: err.message };
    }
  }, [modifyingReservationId, state]);

  const submitBooking = useCallback(async () => {
    if (state.selectedSunbeds.length === 0) return { success: false };
    if (closedDates.includes(state.date)) {
      setError(i18n.t('beachClosedThisDay'));
      return { success: false };
    }
    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(i18n.t('errorMustBeLoggedInBooking'));

      // Privatisation (événement privé confirmé, portée journée) : plage bloquée ce jour.
      if ((await getDayPrivatization(state.date)).beach) throw new Error(i18n.t('slotPrivatized'));

      const firstId = state.selectedSunbeds[0].id;

      // Créer la réservation maître (sunbed_id = premier pour back-compat)
      const { data: newRes, error: resError } = await supabase
        .from('beach_reservations')
        .insert({
          user_id: user.id,
          sunbed_id: firstId,
          secondary_sunbed_id: null,
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
      const reservation = newRes;

      // Insérer toutes les liaisons transats
      const linkRows = state.selectedSunbeds.map((sb) => ({
        reservation_id: reservation.id,
        sunbed_id: sb.id,
        date: state.date,
        status: 'pending',
      }));
      const { error: linkError } = await supabase
        .from('beach_reservation_sunbeds')
        .insert(linkRows);
      if (linkError) {
        // Cleanup si la liaison échoue
        await supabase.from('beach_reservations').delete().eq('id', reservation.id);
        throw new Error(linkError.message);
      }

      // Add-ons
      if (state.selectedAddons.length > 0) {
        const addonRows = state.selectedAddons.map((a) => ({
          reservation_id: reservation.id,
          addon_id: a.addon.id,
          quantity: a.quantity,
          unit_price: a.addon.price,
        }));
        const { error: addonError } = await supabase.from('reservation_addons').insert(addonRows);
        if (addonError) throw new Error(addonError.message);
      }

      setSubmitting(false);
      return { success: true, reservationId: reservation.id, qrCode: reservation.qr_code };
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
      return { success: false, reservationId: undefined, qrCode: undefined };
    }
  }, [state, totalPrice, depositAmount, closedDates]);

  const reset = useCallback(() => {
    setState({
      step: 'select',
      date: getDefaultDate(),
      selectedSunbeds: [],
      guestCount: 1,
      selectedAddons: [],
      specialRequests: '',
    });
    setError(null);
    setPriceMap(new Map());
  }, []);

  return {
    ...state,
    submitting,
    error,
    isDateClosed,
    basePrice,
    addonsTotal,
    totalPrice,
    depositAmount,
    seasonLabel,
    seasonInclusions,
    categoryLabel,
    lineItems,
    setDate,
    toggleSunbed,
    clearSunbeds,
    setGuestCount,
    toggleAddon,
    updateAddonQuantity,
    setSpecialRequests,
    goToAddons,
    goToConfirm,
    goBack,
    submitBooking,
    reset,
    modifyingReservationId,
    isModifying: !!modifyingReservationId,
    originalTotal,
    loadForModification,
    submitModification,
  };
}

function getDefaultDate(): string {
  return formatLocalDate(new Date());
}
