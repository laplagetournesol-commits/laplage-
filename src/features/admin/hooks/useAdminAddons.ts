import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Addon } from '@/shared/types';

export function useAdminAddons() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAddons = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('addons')
      .select('*')
      .order('sort_order');

    if (data) setAddons(data as Addon[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  const createAddon = useCallback(async (addon: Omit<Addon, 'id'>) => {
    const { data, error } = await supabase
      .from('addons')
      .insert(addon)
      .select()
      .single();

    if (error) throw error;
    if (data) setAddons((prev) => [...prev, data as Addon]);
    return data as Addon;
  }, []);

  const updateAddon = useCallback(async (id: string, updates: Partial<Addon>) => {
    const { error } = await supabase.from('addons').update(updates).eq('id', id);
    if (error) throw error;
    setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const deleteAddon = useCallback(async (id: string) => {
    const { error } = await supabase.from('addons').delete().eq('id', id);
    if (error) throw error;
    setAddons((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleAvailability = useCallback(async (id: string, isAvailable: boolean) => {
    await supabase.from('addons').update({ is_available: isAvailable }).eq('id', id);
    setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, is_available: isAvailable } : a)));
  }, []);

  return { addons, loading, refresh: fetchAddons, createAddon, updateAddon, deleteAddon, toggleAvailability };
}
