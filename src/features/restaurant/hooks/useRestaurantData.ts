import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { RestaurantZone, RestaurantTable } from '@/shared/types';

interface TableWithAvailability extends RestaurantTable {
  zone: RestaurantZone;
  isReserved: boolean;
}

export function useRestaurantTables(date: string, timeSlot: 'lunch' | 'dinner') {
  const [tables, setTables] = useState<TableWithAvailability[]>([]);
  const [zones, setZones] = useState<RestaurantZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [zonesRes, tablesRes, reservationsRes] = await Promise.all([
      supabase.from('restaurant_zones').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('restaurant_tables').select('*').eq('is_active', true),
      supabase.from('restaurant_reservations')
        .select('table_id')
        .eq('date', date)
        .eq('time_slot', timeSlot)
        .not('status', 'in', '("cancelled")'),
    ]);

    const zonesData = (zonesRes.data ?? []) as RestaurantZone[];
    const tablesData = (tablesRes.data ?? []) as RestaurantTable[];
    const reservedIds = new Set((reservationsRes.data ?? []).map((r: { table_id: string }) => r.table_id));

    const zoneMap = new Map(zonesData.map((z) => [z.id, z]));

    const enriched: TableWithAvailability[] = tablesData.map((t) => ({
      ...t,
      zone: zoneMap.get(t.zone_id)!,
      isReserved: reservedIds.has(t.id),
    }));

    setZones(zonesData);
    setTables(enriched);
    setLoading(false);
  }, [date, timeSlot]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('restaurant-reservations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_reservations' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const availableCount = (zoneId: string) =>
    tables.filter((t) => t.zone_id === zoneId && !t.isReserved).length;

  const totalCount = (zoneId: string) =>
    tables.filter((t) => t.zone_id === zoneId).length;

  return { tables, zones, loading, availableCount, totalCount, refresh: fetchData };
}
