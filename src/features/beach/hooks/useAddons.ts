import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Addon } from '@/shared/types';

export function useAddons() {
  const [addons, setAddons] = useState<Addon[]>([]);
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
      if (data) setAddons(data as Addon[]);
      setLoading(false);
    };
    fetch();
  }, []);

  return { addons, loading, error };
}
