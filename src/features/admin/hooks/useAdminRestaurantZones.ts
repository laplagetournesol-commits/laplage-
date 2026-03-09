import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { RestaurantZone, RestaurantTable } from '@/shared/types';

interface ZoneWithTables extends RestaurantZone {
  tables: RestaurantTable[];
}

export function useAdminRestaurantZones() {
  const [zones, setZones] = useState<ZoneWithTables[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [zonesRes, tablesRes] = await Promise.all([
      supabase.from('restaurant_zones').select('*').order('sort_order'),
      supabase.from('restaurant_tables').select('*').order('label'),
    ]);

    const zonesData = (zonesRes.data ?? []) as RestaurantZone[];
    const tablesData = (tablesRes.data ?? []) as RestaurantTable[];

    const enriched: ZoneWithTables[] = zonesData.map((z) => ({
      ...z,
      tables: tablesData.filter((t) => t.zone_id === z.id),
    }));

    setZones(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateMinSpend = useCallback(async (zoneId: string, minSpend: number) => {
    await supabase.from('restaurant_zones').update({ min_spend: minSpend }).eq('id', zoneId);
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, min_spend: minSpend } : z)),
    );
  }, []);

  const updateCapacity = useCallback(async (zoneId: string, capacity: number) => {
    await supabase.from('restaurant_zones').update({ capacity }).eq('id', zoneId);
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, capacity } : z)),
    );
  }, []);

  const toggleZone = useCallback(async (zoneId: string, isActive: boolean) => {
    await supabase.from('restaurant_zones').update({ is_active: isActive }).eq('id', zoneId);
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, is_active: isActive } : z)),
    );
  }, []);

  const toggleTable = useCallback(async (tableId: string, isActive: boolean) => {
    await supabase.from('restaurant_tables').update({ is_active: isActive }).eq('id', tableId);
    setZones((prev) =>
      prev.map((z) => ({
        ...z,
        tables: z.tables.map((t) =>
          t.id === tableId ? { ...t, is_active: isActive } : t,
        ),
      })),
    );
  }, []);

  const toggleAllTablesInZone = useCallback(async (zoneId: string, isActive: boolean) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    const tableIds = zone.tables.map((t) => t.id);
    await supabase.from('restaurant_tables').update({ is_active: isActive }).in('id', tableIds);

    setZones((prev) =>
      prev.map((z) =>
        z.id === zoneId
          ? { ...z, tables: z.tables.map((t) => ({ ...t, is_active: isActive })) }
          : z,
      ),
    );
  }, [zones]);

  const renameTable = useCallback(async (tableId: string, label: string) => {
    await supabase.from('restaurant_tables').update({ label }).eq('id', tableId);
    setZones((prev) =>
      prev.map((z) => ({
        ...z,
        tables: z.tables.map((t) =>
          t.id === tableId ? { ...t, label } : t,
        ),
      })),
    );
  }, []);

  return { zones, loading, refresh: fetchData, updateMinSpend, updateCapacity, toggleZone, toggleTable, toggleAllTablesInZone, renameTable };
}
