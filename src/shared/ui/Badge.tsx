import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@/shared/theme/colors';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'vip';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: colors.deepSeaLight, text: colors.deepSea },
  success: { bg: '#E8F5E9', text: '#2E7D32' },
  warning: { bg: '#FFF3E0', text: '#E65100' },
  error: { bg: '#FFEBEE', text: '#C62828' },
  vip: { bg: colors.sunYellowLight, text: '#A0850A' },
};

export function Badge({ label, variant = 'default', size = 'md', style }: BadgeProps) {
  const c = variantColors[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.bg },
        size === 'sm' && styles.sm,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: c.text },
          size === 'sm' && styles.textSm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  textSm: {
    fontSize: 10,
  },
});
