import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/shared/theme/colors';
import { i18n } from '@/shared/i18n';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  emoji: string;
  image: any;
  titleKey: string;
  subtitleKey: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    emoji: '☀️',
    image: require('../../assets/beach-hero.jpg'),
    titleKey: 'onboarding1Title',
    subtitleKey: 'onboarding1Subtitle',
  },
  {
    id: '2',
    emoji: '🏖️',
    image: require('../../assets/pool-view.jpg'),
    titleKey: 'onboarding2Title',
    subtitleKey: 'onboarding2Subtitle',
  },
  {
    id: '3',
    emoji: '✨',
    image: require('../../assets/terrace-view.jpg'),
    titleKey: 'onboarding3Title',
    subtitleKey: 'onboarding3Subtitle',
  },
];

function SlideItem({ item, index, scrollX }: { item: OnboardingSlide; index: number; scrollX: Animated.SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [30, 0, 30], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }], opacity };
  });

  return (
    <View style={styles.slide}>
      <ImageBackground source={item.image} style={styles.slideImage} resizeMode="cover">
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)', 'rgba(15,27,45,0.95)']}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
      <Animated.View style={[styles.slideContent, animStyle]}>
        <Text style={styles.slideEmoji}>{item.emoji}</Text>
        <Text style={styles.slideTitle}>{i18n.t(item.titleKey)}</Text>
        <Text style={styles.slideSubtitle}>{i18n.t(item.subtitleKey)}</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('tournesol_onboarding_done', '1');
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const onScroll = (event: any) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.screen}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item, index }) => (
          <SlideItem item={item} index={index} scrollX={scrollX} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Bottom controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? colors.sunYellow : 'rgba(255,255,255,0.3)',
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>{i18n.t('onboardingSkip')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.nextBtn} activeOpacity={0.8}>
            <Text style={styles.nextText}>
              {isLast ? i18n.t('onboardingStart') : i18n.t('onboardingNext')}
            </Text>
            <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color={colors.black} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F1B2D' },
  slide: {
    width,
    height,
  },
  slideImage: {
    ...StyleSheet.absoluteFillObject,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 200,
    gap: 12,
  },
  slideEmoji: { fontSize: 56 },
  slideTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  slideSubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 24,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.sunYellow,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
});
