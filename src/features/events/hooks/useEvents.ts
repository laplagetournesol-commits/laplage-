import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Event, EventCategory } from '@/shared/types';

export function useEvents(category?: EventCategory | 'all') {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data } = await query;
    if (data) setEvents(data as Event[]);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, refresh: fetchEvents };
}

export function useEvent(id: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setEvent(data as Event);
      setLoading(false);
    };
    fetch();
  }, [id]);

  return { event, loading };
}
