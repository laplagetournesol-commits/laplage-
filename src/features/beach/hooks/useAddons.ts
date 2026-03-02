import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Addon } from '@/shared/types';

export function useAddons() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('addons')
        .select('*')
        .eq('is_available', true)
        .order('sort_order');
      if (data) setAddons(data as Addon[]);
      setLoading(false);
    };
    fetch();
  }, []);

  return { addons, loading };
}
