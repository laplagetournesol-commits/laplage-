import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '@/shared/ui/Modal';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';
import { i18n } from '@/shared/i18n';
import { formatLocalDate } from '@/shared/lib/date';

interface CalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelect: (date: string) => void;
  minDate?: string;
}

const WEEKDAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const;
const MONTH_KEYS = [
  'monthJan', 'monthFeb', 'monthMar', 'monthApr', 'monthMay', 'monthJun',
  'monthJul', 'monthAug', 'monthSep', 'monthOct', 'monthNov', 'monthDec',
] as const;

export function CalendarPicker({ visible, onClose, selectedDate, onSelect, minDate }: CalendarPickerProps) {
  const { theme } = useSunMode();
  const initial = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const today = useMemo(() => formatLocalDate(new Date()), []);
  const min = minDate ?? today;

  const days = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={i18n.t('selectDate') ?? 'Choisir une date'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: theme.text }]}>
          {i18n.t(MONTH_KEYS[viewMonth])} {viewYear}
        </Text>
        <TouchableOpacity onPress={goNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_KEYS.map((k) => (
          <Text key={k} style={[styles.weekdayLabel, { color: theme.textSecondary }]}>
            {i18n.t(k)}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((cell, i) => {
          if (!cell) {
            return <View key={`empty-${i}`} style={styles.cell} />;
          }
          const isPast = cell.dateStr < min;
          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.dateStr === today;

          return (
            <TouchableOpacity
              key={cell.dateStr}
              style={[
                styles.cell,
                isSelected && { backgroundColor: colors.brand },
                !isSelected && isToday && { borderWidth: 1, borderColor: colors.brand },
              ]}
              disabled={isPast}
              onPress={() => {
                onSelect(cell.dateStr);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.cellText,
                  { color: isSelected ? colors.white : isPast ? theme.cardBorder : theme.text },
                ]}
              >
                {cell.day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}

interface DayCell {
  day: number;
  dateStr: string;
}

function buildMonthGrid(year: number, month: number): (DayCell | null)[] {
  const firstDay = new Date(year, month, 1);
  // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(month + 1).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    cells.push({ day: d, dateStr: `${year}-${m}-${day}` });
  }
  return cells;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 8,
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  cellText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
