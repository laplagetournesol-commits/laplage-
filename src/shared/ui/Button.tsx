import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSunMode } from '@/shared/theme';
import { colors } from '@/shared/theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const { theme } = useSunMode();

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      gap: 8,
    };

    // Tailles
    switch (size) {
      case 'sm':
        Object.assign(base, { paddingHorizontal: 16, paddingVertical: 8 });
        break;
      case 'lg':
        Object.assign(base, { paddingHorizontal: 32, paddingVertical: 18 });
        break;
      default:
        Object.assign(base, { paddingHorizontal: 24, paddingVertical: 14 });
    }

    // Variantes
    switch (variant) {
      case 'primary':
        base.backgroundColor = colors.sunYellow;
        break;
      case 'secondary':
        base.backgroundColor = theme.accent;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1.5;
        base.borderColor = theme.accent;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
    }

    if (disabled || loading) {
      base.opacity = 0.5;
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
      letterSpacing: 0.3,
    };

    switch (size) {
      case 'sm':
        base.fontSize = 13;
        break;
      case 'lg':
        base.fontSize = 17;
        break;
      default:
        base.fontSize = 15;
    }

    switch (variant) {
      case 'primary':
        base.color = colors.black;
        break;
      case 'secondary':
        base.color = theme.period === 'night' ? colors.black : colors.white;
        break;
      case 'outline':
      case 'ghost':
        base.color = theme.accent;
        break;
    }

    return base;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? colors.black : theme.accent} />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
