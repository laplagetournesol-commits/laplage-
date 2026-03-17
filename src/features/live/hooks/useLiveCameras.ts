import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { i18n } from '@/shared/i18n';
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

export function getCrowdInfo(level: LiveCamera['crowd_level']) {
  const config = {
    low: { label: i18n.t('crowdLow'), color: '#4CAF50', icon: '🟢' as const, percent: 30 },
    medium: { label: i18n.t('crowdMedium'), color: '#FF9800', icon: '🟡' as const, percent: 60 },
    high: { label: i18n.t('crowdHigh'), color: '#F44336', icon: '🔴' as const, percent: 90 },
  };
  if (!level) return config.low;
  return config[level];
}
