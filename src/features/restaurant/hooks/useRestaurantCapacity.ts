import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';

interface CapacityInfo {
  maxCovers: number;
  currentCovers: number;
  remaining: number;
  isFull: boolean;
  loading: boolean;
}

export function useRestaurantCapacity(date: string, time: string): CapacityInfo {
  const [maxCovers, setMaxCovers] = useState(0);
  const [currentCovers, setCurrentCovers] = useState(0);
  const [loading, setLoading] = useState(true);

  const timeSlot = parseInt(time.split(':')[0]) < 18 ? 'lunch' : 'dinner';

  useEffect(() => {
    if (!date) return;

    (async () => {
      setLoading(true);

      // Récupérer le max en parallèle avec les réservations existantes
      const maxKey = timeSlot === 'lunch' ? 'max_covers_lunch' : 'max_covers_dinner';

      const [settingRes, reservationsRes] = await Promise.all([
        supabase.from('restaurant_settings').select('value').eq('key', maxKey).single(),
        supabase.from('restaurant_reservations')
          .select('guest_count')
          .eq('date', date)
          .eq('time_slot', timeSlot)
          .not('status', 'eq', 'cancelled'),
      ]);

      const max = (settingRes.data?.value as number) ?? 0;
      const total = (reservationsRes.data ?? []).reduce(
        (sum: number, r: { guest_count: number }) => sum + r.guest_count, 0
      );

      setMaxCovers(max);
      setCurrentCovers(total);
      setLoading(false);
    })();
  }, [date, timeSlot]);

  const remaining = Math.max(0, maxCovers - currentCovers);

  return {
    maxCovers,
    currentCovers,
    remaining,
    isFull: maxCovers > 0 && remaining === 0,
    loading,
  };
}
