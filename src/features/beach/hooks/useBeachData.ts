import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { BeachZone, Sunbed } from '@/shared/types';

interface SunbedWithAvailability extends Sunbed {
  zone: BeachZone;
  isReserved: boolean;
}

export function useSunbeds(date: string) {
  const [sunbeds, setSunbeds] = useState<SunbedWithAvailability[]>([]);
  const [zones, setZones] = useState<BeachZone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Récupérer zones + transats en parallèle
    const [zonesRes, sunbedsRes, reservationsRes] = await Promise.all([
      supabase.from('beach_zones').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('sunbeds').select('*').eq('is_active', true),
      supabase.from('beach_reservations').select('sunbed_id, secondary_sunbed_id').eq('date', date).in('status', ['confirmed', 'checked_in']),
    ]);

    const zonesData = (zonesRes.data ?? []) as BeachZone[];
    const sunbedsData = (sunbedsRes.data ?? []) as Sunbed[];
    const reservedIds = new Set<string>();
    for (const r of (reservationsRes.data ?? []) as { sunbed_id: string; secondary_sunbed_id: string | null }[]) {
      reservedIds.add(r.sunbed_id);
      if (r.secondary_sunbed_id) reservedIds.add(r.secondary_sunbed_id);
    }

    const zoneMap = new Map(zonesData.map((z) => [z.id, z]));

    const enriched: SunbedWithAvailability[] = sunbedsData.map((s) => ({
      ...s,
      zone: zoneMap.get(s.zone_id)!,
      isReserved: reservedIds.has(s.id),
    }));

    setZones(zonesData);
    setSunbeds(enriched);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime : écouter les nouvelles réservations
  useEffect(() => {
    const channel = supabase
      .channel('beach-reservations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'beach_reservations',
        },
        () => {
          // Rafraîchir les données quand une réservation change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const availableCount = (zoneId: string) =>
    sunbeds.filter((s) => s.zone_id === zoneId && !s.isReserved).length;

  const totalCount = (zoneId: string) =>
    sunbeds.filter((s) => s.zone_id === zoneId).length;

  return { sunbeds, zones, loading, availableCount, totalCount, refresh: fetchData };
}
