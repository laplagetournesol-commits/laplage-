import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { LiveCamera } from '@/shared/types';

export function useLiveCameras() {
  const [cameras, setCameras] = useState<LiveCamera[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('live_cameras')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) setCameras(data as LiveCamera[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { cameras, loading, refresh: fetch };
}

const CROWD_CONFIG = {
  low: { label: 'Calme', color: '#4CAF50', icon: '🟢' as const, percent: 30 },
  medium: { label: 'Modéré', color: '#FF9800', icon: '🟡' as const, percent: 60 },
  high: { label: 'Animé', color: '#F44336', icon: '🔴' as const, percent: 90 },
} as const;

export function getCrowdInfo(level: LiveCamera['crowd_level']) {
  if (!level) return CROWD_CONFIG.low;
  return CROWD_CONFIG[level];
}
