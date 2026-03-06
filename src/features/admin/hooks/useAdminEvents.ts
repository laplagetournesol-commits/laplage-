import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import type { Event } from '@/shared/types';

export function useAdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });

    if (data) setEvents(data as Event[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(async (event: Omit<Event, 'id' | 'tickets_sold' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('events')
      .insert({ ...event, tickets_sold: 0 })
      .select()
      .single();

    if (error) throw error;
    if (data) setEvents((prev) => [data as Event, ...prev]);
    return data as Event;
  }, []);

  const updateEvent = useCallback(async (id: string, updates: Partial<Event>) => {
    const { error } = await supabase.from('events').update(updates).eq('id', id);
    if (error) throw error;
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { events, loading, refresh: fetchEvents, createEvent, updateEvent, deleteEvent };
}
