import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { i18n } from '@/shared/i18n';
import { formatLocalDate } from '@/shared/lib/date';
import { CalendarPicker } from '@/shared/ui/CalendarPicker';

interface DateSelectorProps {
  selectedDate: string;
  onSelect: (date: string) => void;
}

function getNext14Days(): { date: string; dayName: string; dayNum: string; month: string; isToday: boolean }[] {
  const days: ReturnType<typeof getNext14Days> = [];
  const dayNames = [i18n.t('daySun'), i18n.t('dayMon'), i18n.t('dayTue'), i18n.t('dayWed'), i18n.t('dayThu'), i18n.t('dayFri'), i18n.t('daySat')];
  const monthNames = [i18n.t('monthJan'), i18n.t('monthFeb'), i18n.t('monthMar'), i18n.t('monthApr'), i18n.t('monthMay'), i18n.t('monthJun'), i18n.t('monthJul'), i18n.t('monthAug'), i18n.t('monthSep'), i18n.t('monthOct'), i18n.t('monthNov'), i18n.t('monthDec')];

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: formatLocalDate(d),
      dayName: dayNames[d.getDay()],
      dayNum: String(d.getDate()),
      month: monthNames[d.getMonth()],
      isToday: i === 0,
    });
  }
  return days;
}

export function DateSelector({ selectedDate, onSelect }: DateSelectorProps) {
  const { theme } = useSunMode();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const days = getNext14Days();
  const isFarDate = selectedDate && !days.some((d) => d.date === selectedDate);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {days.map((day) => {
          const isSelected = day.date === selectedDate;
          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => onSelect(day.date)}
              style={[
                styles.dayItem,
                {
                  backgroundColor: isSelected ? colors.brand : theme.card,
                  borderColor: isSelected ? colors.brand : theme.cardBorder,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayName,
                  { color: isSelected ? colors.white : theme.textSecondary },
                ]}
              >
                {day.isToday ? i18n.t('todayShort') : day.dayName}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  { color: isSelected ? colors.white : theme.text },
                ]}
              >
                {day.dayNum}
              </Text>
              <Text
                style={[
                  styles.month,
                  { color: isSelected ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                ]}
              >
                {day.month}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setCalendarOpen(true)}
          style={[
            styles.dayItem,
            {
              backgroundColor: isFarDate ? colors.brand : theme.card,
              borderColor: isFarDate ? colors.brand : theme.cardBorder,
              justifyContent: 'center',
            },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="calendar-outline"
            size={22}
            color={isFarDate ? colors.white : theme.text}
          />
          <Text
            style={[
              styles.month,
              { color: isFarDate ? 'rgba(255,255,255,0.85)' : theme.textSecondary, marginTop: 4 },
            ]}
          >
            {isFarDate ? formatShortDate(selectedDate) : i18n.t('otherDate') ?? '+ date'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <CalendarPicker
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelect={onSelect}
      />
    </>
  );
}

function formatShortDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString(i18n.locale, {
    day: 'numeric',
    month: 'short',
  });
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 8,
  },
  dayItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 56,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayNum: {
    fontSize: 20,
    fontWeight: '700',
  },
  month: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
