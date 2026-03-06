import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { BeachZone, Sunbed } from '@/shared/types';

interface ZoneWithSunbeds extends BeachZone {
  sunbeds: Sunbed[];
}

export function useAdminBeachZones() {
  const [zones, setZones] = useState<ZoneWithSunbeds[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [zonesRes, sunbedsRes] = await Promise.all([
      supabase.from('beach_zones').select('*').order('sort_order'),
      supabase.from('sunbeds').select('*').order('label'),
    ]);

    const zonesData = (zonesRes.data ?? []) as BeachZone[];
    const sunbedsData = (sunbedsRes.data ?? []) as Sunbed[];

    const enriched: ZoneWithSunbeds[] = zonesData.map((z) => ({
      ...z,
      sunbeds: sunbedsData.filter((s) => s.zone_id === z.id),
    }));

    setZones(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePrice = useCallback(async (zoneId: string, basePrice: number) => {
    await supabase.from('beach_zones').update({ base_price: basePrice }).eq('id', zoneId);
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, base_price: basePrice } : z)),
    );
  }, []);

  const toggleZone = useCallback(async (zoneId: string, isActive: boolean) => {
    await supabase.from('beach_zones').update({ is_active: isActive }).eq('id', zoneId);
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, is_active: isActive } : z)),
    );
  }, []);

  const toggleSunbed = useCallback(async (sunbedId: string, isActive: boolean) => {
    await supabase.from('sunbeds').update({ is_active: isActive }).eq('id', sunbedId);
    setZones((prev) =>
      prev.map((z) => ({
        ...z,
        sunbeds: z.sunbeds.map((s) =>
          s.id === sunbedId ? { ...s, is_active: isActive } : s,
        ),
      })),
    );
  }, []);

  const toggleAllSunbedsInZone = useCallback(async (zoneId: string, isActive: boolean) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;

    const sunbedIds = zone.sunbeds.map((s) => s.id);
    await supabase.from('sunbeds').update({ is_active: isActive }).in('id', sunbedIds);

    setZones((prev) =>
      prev.map((z) =>
        z.id === zoneId
          ? { ...z, sunbeds: z.sunbeds.map((s) => ({ ...s, is_active: isActive })) }
          : z,
      ),
    );
  }, [zones]);

  const renameSunbed = useCallback(async (sunbedId: string, label: string) => {
    await supabase.from('sunbeds').update({ label }).eq('id', sunbedId);
    setZones((prev) =>
      prev.map((z) => ({
        ...z,
        sunbeds: z.sunbeds.map((s) =>
          s.id === sunbedId ? { ...s, label } : s,
        ),
      })),
    );
  }, []);

  return { zones, loading, refresh: fetchData, updatePrice, toggleZone, toggleSunbed, toggleAllSunbedsInZone, renameSunbed };
}
