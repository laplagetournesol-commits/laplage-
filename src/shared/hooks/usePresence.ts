import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';

/**
 * Présence temps réel façon Messenger.
 * Chaque utilisateur connecté "track" sa présence sur un canal partagé.
 * Retourne l'ensemble des user_id actuellement en ligne (app ouverte).
 * Zéro écriture en base : tout est éphémère (Supabase Realtime Presence).
 */
export function usePresence(uid: string | null): Set<string> {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) {
      setOnline(new Set());
      return;
    }
    const channel = supabase.channel('social-presence', {
      config: { presence: { key: uid } },
    });

    const sync = () => {
      const state = channel.presenceState();
      setOnline(new Set(Object.keys(state)));
    };

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  return online;
}
