import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';

interface DateSelectorProps {
  selectedDate: string;
  onSelect: (date: string) => void;
}

function getNext14Days(): { date: string; dayName: string; dayNum: string; month: string; isToday: boolean }[] {
  const days: ReturnType<typeof getNext14Days> = [];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
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
  const days = getNext14Days();

  return (
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
              {day.isToday ? "Auj." : day.dayName}
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
    </ScrollView>
  );
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
