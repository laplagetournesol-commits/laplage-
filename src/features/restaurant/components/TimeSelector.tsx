import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { supabase } from '@/shared/lib/supabase';
import { i18n } from '@/shared/i18n';

interface TimeSelectorProps {
  selectedTime: string;
  selectedDate: string;
  onSelect: (time: string) => void;
}

// Fallback si la BDD est inaccessible
const DEFAULT_LUNCH = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
const DEFAULT_DINNER = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'];
const DEFAULT_DINNER_DAYS = [5, 6, 0]; // vendredi, samedi, dimanche

type ContinuousCfg = { enabled: boolean; start: string; end: string; interval: number };

/** Génère les créneaux d'un service continu (ex. 12:00 → 23:00 toutes les 30 min). */
function genSlots(start: string, end: string, interval: number): string[] {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cur = sh * 60 + sm;
  const endM = eh * 60 + em;
  const step = interval > 0 ? interval : 30;
  const out: string[] = [];
  while (cur <= endM && out.length < 60) {
    out.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
    cur += step;
  }
  return out;
}

export function TimeSelector({ selectedTime, selectedDate, onSelect }: TimeSelectorProps) {
  const { theme } = useSunMode();
  const [lunchSlots, setLunchSlots] = useState<string[]>(DEFAULT_LUNCH);
  const [dinnerSlots, setDinnerSlots] = useState<string[]>(DEFAULT_DINNER);
  const [dinnerDays, setDinnerDays] = useState<number[]>(DEFAULT_DINNER_DAYS);
  const [dinnerExtraDates, setDinnerExtraDates] = useState<string[]>([]);
  const [closures, setClosures] = useState<{ date: string; slot: string }[]>([]);
  const [continuous, setContinuous] = useState<ContinuousCfg>({ enabled: false, start: '12:00', end: '23:00', interval: 30 });
  const [continuousDates, setContinuousDates] = useState<{ date: string; start: string; end: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: cl }] = await Promise.all([
        supabase.from('restaurant_settings').select('key, value'),
        supabase.from('restaurant_closures').select('date, slot'),
      ]);
      if (data) {
        for (const row of data) {
          if (row.key === 'lunch_slots') setLunchSlots(row.value as string[]);
          if (row.key === 'dinner_slots') setDinnerSlots(row.value as string[]);
          if (row.key === 'dinner_days') setDinnerDays(row.value as number[]);
          if (row.key === 'dinner_extra_dates') setDinnerExtraDates(row.value as string[]);
          if (row.key === 'continuous_service') setContinuous(row.value as ContinuousCfg);
          if (row.key === 'continuous_service_dates') setContinuousDates(row.value as { date: string; start: string; end: string }[]);
        }
      }
      if (cl) setClosures(cl as { date: string; slot: string }[]);
      setLoading(false);
    })();
  }, []);

  const lunchClosed = closures.some((c) => c.date === selectedDate && c.slot === 'lunch');
  const dinnerClosed = closures.some((c) => c.date === selectedDate && c.slot === 'dinner');

  const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
  const dinnerOpenByPolicy = dinnerDays.includes(dayOfWeek) || dinnerExtraDates.includes(selectedDate);

  // Service continu : surcharge du jour, sinon permanent, sinon créneaux midi/soir classiques
  const override = continuousDates.find((d) => d.date === selectedDate);
  const usingContinuous = !!override || continuous.enabled;
  const baseSlots = override
    ? genSlots(override.start, override.end, continuous.interval || 30)
    : continuous.enabled
      ? genSlots(continuous.start, continuous.end, continuous.interval || 30)
      : [...lunchSlots, ...(dinnerOpenByPolicy ? dinnerSlots : [])];

  // Retirer les créneaux fermés (midi = avant 18h, soir = 18h et après)
  const slots = baseSlots.filter((t) => {
    const h = parseInt(t.split(':')[0], 10);
    if (h < 18 && lunchClosed) return false;
    if (h >= 18 && dinnerClosed) return false;
    return true;
  });

  if (loading) {
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={[styles.closedBanner, { backgroundColor: theme.card }]}>
        <Text style={[styles.closedText, { color: theme.textSecondary }]}>
          {i18n.t('restaurantClosedThisDay')}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {!usingContinuous && !dinnerOpenByPolicy && !lunchClosed && (
        <View style={[styles.closedBanner, { backgroundColor: theme.card }]}>
          <Text style={[styles.closedText, { color: theme.textSecondary }]}>
            {i18n.t('dinnerWeekendOnly')}
          </Text>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {slots.map((time) => {
          const isSelected = time === selectedTime;
          const hour = parseInt(time.split(':')[0]);
          const isEvening = hour >= 19;

          return (
            <TouchableOpacity
              key={time}
              onPress={() => onSelect(time)}
              style={[
                styles.timeItem,
                {
                  backgroundColor: isSelected ? colors.brand : theme.card,
                  borderColor: isSelected ? colors.brand : theme.cardBorder,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeText,
                  { color: isSelected ? colors.white : theme.text },
                ]}
              >
                {time.replace(':', 'h')}
              </Text>
              <Text
                style={[
                  styles.periodText,
                  { color: isSelected ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                ]}
              >
                {isEvening ? i18n.t('dinner') : i18n.t('lunch')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 8,
  },
  closedBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closedText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  timeItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 60,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  periodText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
