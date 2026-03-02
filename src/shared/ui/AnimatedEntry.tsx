import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';

interface AnimatedEntryProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  style?: any;
}

export function AnimatedEntry({
  children,
  delay = 0,
  duration = 500,
  direction = 'up',
  distance = 20,
  style,
}: AnimatedEntryProps) {
  const opacity = useSharedValue(0);
  const translate = useSharedValue(distance);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    translate.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 90 }));
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const transform =
      direction === 'up' || direction === 'down'
        ? [{ translateY: direction === 'up' ? translate.value : -translate.value }]
        : [{ translateX: direction === 'left' ? translate.value : -translate.value }];

    return {
      opacity: opacity.value,
      transform,
    };
  });

  return (
    <Animated.View style={[style, animStyle]}>
      {children}
    </Animated.View>
  );
}

interface AnimatedScaleProps {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}

export function AnimatedScale({ children, delay = 0, style }: AnimatedScaleProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 120 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      {children}
    </Animated.View>
  );
}
