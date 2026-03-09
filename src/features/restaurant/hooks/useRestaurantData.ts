import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { RestaurantZone } from '@/shared/types';

interface ZoneAvailability extends RestaurantZone {
  reservedCount: number;
  availableCount: number;
  isFull: boolean;
}

export function useRestaurantZones(date: string, timeSlot: 'lunch' | 'dinner') {
  const [zones, setZones] = useState<ZoneAvailability[]>([]);
  const [loading, setLoading] = useState(true);

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
        .not('status', 'in', '("cancelled")'),
    ]);

    const zonesData = (zonesRes.data ?? []) as RestaurantZone[];
    const reservations = reservationsRes.data ?? [];

    // Compter les réservations par zone
    const countByZone = new Map<string, number>();
    for (const r of reservations) {
      const current = countByZone.get(r.zone_id) ?? 0;
      countByZone.set(r.zone_id, current + 1);
    }

    const enriched: ZoneAvailability[] = zonesData.map((z) => {
      const reservedCount = countByZone.get(z.id) ?? 0;
      const availableCount = Math.max(0, z.capacity - reservedCount);
      return {
        ...z,
        reservedCount,
        availableCount,
        isFull: availableCount <= 0,
      };
    });

    setZones(enriched);
    setLoading(false);
  }, [date, timeSlot]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime — rafraîchir quand une réservation change
  useEffect(() => {
    const channel = supabase
      .channel('restaurant-reservations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_reservations' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const totalAvailable = zones.reduce((sum, z) => sum + z.availableCount, 0);
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);

  return { zones, loading, totalAvailable, totalCapacity, refresh: fetchData };
}
