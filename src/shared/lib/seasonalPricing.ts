import { supabase } from './supabase';
import type { BeachZoneType } from '@/shared/types';

export type PricingCategory = 'transat' | 'transat_front_row' | 'bed' | 'chaise_longue';

/** Mapping zone BDD → catégorie de tarification */
export function zoneToPricingCategory(zoneType: BeachZoneType): PricingCategory {
  switch (zoneType) {
    case 'standard':
    case 'premium':
      return 'transat';
    case 'front_row':
      return 'transat_front_row';
    case 'vip_cabana':
      return 'bed';
    case 'chaise_longue':
      return 'chaise_longue';
  }
}

/** Label lisible par catégorie */
export function pricingCategoryLabel(category: PricingCategory): string {
  switch (category) {
    case 'transat':
      return 'Transat';
    case 'transat_front_row':
      return 'Transat 1ère rangée';
    case 'bed':
      return 'Bed';
    case 'chaise_longue':
      return 'Chaise longue';
  }
}

interface SeasonalPriceResult {
  price: number | null;
  seasonLabel: string | null;
}

/**
 * Récupère le prix saisonnier pour un type de zone à une date donnée.
 * Retourne null si aucune saison ne couvre la date (fallback sur base_price).
 */
export async function getSeasonalPrice(
  zoneType: BeachZoneType,
  date: string
): Promise<SeasonalPriceResult> {
  const category = zoneToPricingCategory(zoneType);

  const { data, error } = await supabase
    .from('seasonal_pricing')
    .select('fixed_price, label')
    .eq('pricing_category', category)
    .lte('start_date', date)
    .gte('end_date', date)
    .limit(1)
    .single();

  if (error || !data) {
    return { price: null, seasonLabel: null };
  }

  return { price: data.fixed_price, seasonLabel: data.label };
}

/**
 * Retourne les inclusions textuelles selon la zone et la saison.
 */
export function getSeasonalInclusions(
  zoneType: BeachZoneType,
  seasonLabel: string | null
): string[] {
  const category = zoneToPricingCategory(zoneType);
  const inclusions: string[] = [];

  // Inclusions de base par catégorie
  if (category === 'transat' || category === 'transat_front_row') {
    inclusions.push('Parasol + table inclus');
  }
  if (category === 'bed') {
    inclusions.push('Parasol + table inclus');
    inclusions.push('Service prioritaire');
  }

  // Inclusions saisonnières
  if (seasonLabel === 'Été' && category === 'bed') {
    inclusions.push('Cocktail maison offert');
  }

  return inclusions;
}
