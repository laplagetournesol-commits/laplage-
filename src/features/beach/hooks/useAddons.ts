import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Addon } from '@/shared/types';

/**
 * @param date — si fourni, filtre les addons saisonniers (available_from/until)
 */
export function useAddons(date?: string) {
  const [allAddons, setAllAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data, error: fetchError } = await supabase
        .from('addons')
        .select('*')
        .eq('is_available', true)
        .order('sort_order');
      if (fetchError) setError(fetchError.message);
      if (data) setAllAddons(data as Addon[]);
      setLoading(false);
    };
    fetch();
  }, []);

  // Filtrer les addons par disponibilité saisonnière
  const addons = useMemo(() => {
    if (!date) return allAddons;
    return allAddons.filter((addon) => {
      // Pas de restriction de date → toujours visible
      if (!addon.available_from && !addon.available_until) return true;
      // Vérifier que la date est dans la plage
      if (addon.available_from && date < addon.available_from) return false;
      if (addon.available_until && date > addon.available_until) return false;
      return true;
    });
  }, [allAddons, date]);

  return { addons, loading, error };
}
