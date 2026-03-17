import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { RestaurantZone } from '@/shared/types';

interface ZoneAvailability extends RestaurantZone {
  reservedCount: number;
  isFull: boolean;
}

export function useRestaurantZones(date: string, time: string) {
  const [zones, setZones] = useState<ZoneAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  // Déduire lunch/dinner pour la requête BDD
  const timeSlot = parseInt(time.split(':')[0]) < 18 ? 'lunch' : 'dinner';

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [zonesRes, reservationsRes] = await Promise.all([
      supabase
        .from('restaurant_zones')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('restaurant_reservations')
        .select('zone_id, guest_count')
        .eq('date', date)
        .eq('time_slot', timeSlot)
        .eq('status', 'confirmed'),
    ]);

    const zonesData = (zonesRes.data ?? []) as RestaurantZone[];
    const reservations = reservationsRes.data ?? [];

    const countByZone = new Map<string, number>();
    for (const r of reservations) {
      const current = countByZone.get(r.zone_id) ?? 0;
      countByZone.set(r.zone_id, current + (r.guest_count ?? 1));
    }

    const enriched: ZoneAvailability[] = zonesData.map((z) => {
      const reservedCount = countByZone.get(z.id) ?? 0;
      return {
        ...z,
        reservedCount,
        isFull: reservedCount >= z.capacity,
      };
    });

    setZones(enriched);
    setLoading(false);
  }, [date, timeSlot]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('restaurant-reservations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_reservations' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  return { zones, loading, refresh: fetchData };
}
