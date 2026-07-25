import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Geofence } from '@/shared/lib/geo';

/**
 * Charge le centre + rayon de la plage (réglage admin `beach_geofence`).
 * null tant que non chargé. radius_m par défaut 150 si absent.
 */
export function useBeachGeofence(): Geofence | null {
  const [geo, setGeo] = useState<Geofence | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('restaurant_settings')
        .select('value')
        .eq('key', 'beach_geofence')
        .maybeSingle();
      const v: any = data?.value;
      if (alive && v && typeof v.lat === 'number' && typeof v.lng === 'number') {
        setGeo({ lat: v.lat, lng: v.lng, radius_m: Number(v.radius_m) || 150 });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return geo;
}
