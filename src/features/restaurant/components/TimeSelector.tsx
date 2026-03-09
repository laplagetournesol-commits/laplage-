import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';

interface TimeSelectorProps {
  selectedTime: string;
  onSelect: (time: string) => void;
}

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
  '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
];

export function TimeSelector({ selectedTime, onSelect }: TimeSelectorProps) {
  const { theme } = useSunMode();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {TIME_SLOTS.map((time) => {
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
              {isEvening ? 'Soir' : 'Midi'}
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
