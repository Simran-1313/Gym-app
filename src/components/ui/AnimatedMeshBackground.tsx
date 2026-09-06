import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { DARK_COLORS, LIGHT_COLORS } from '../../config/theme';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  isDark: boolean;
}

/**
 * A single large, very soft bloom that drifts on a long loop.
 *
 * Built from a stack of concentric gradient rings rather than a blurred circle:
 * the `filter: blur()` style is inconsistent across Android versions, and a
 * 200px blur on a full-screen view is expensive to composite every frame.
 * Nested gradients cost nothing after layout.
 */
const Bloom = ({
  color,
  size,
  origin,
  drift,
  duration,
}: {
  color: string;
  size: number;
  origin: { x: number; y: number };
  drift: { x: number; y: number };
  duration: number;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [duration, progress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: origin.x + drift.x * progress.value },
      { translateY: origin.y + drift.y * progress.value },
    ],
    opacity: 0.55 + 0.45 * progress.value,
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2 },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[color, 'transparent']}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <LinearGradient
        colors={[color, 'transparent']}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <LinearGradient
        colors={[color, 'transparent']}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0.5, y: 0 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <LinearGradient
        colors={[color, 'transparent']}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
    </Animated.View>
  );
};

/**
 * App-wide ambient ground. Two slow teal blooms over near-black navy, then a
 * vignette to pull focus to the centre. Deliberately quiet — cards and the
 * teal accent must be the only things that draw the eye.
 */
export const AnimatedMeshBackground: React.FC<Props> = ({ isDark }) => {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const primaryBloom = isDark ? 'rgba(45,212,191,0.10)' : 'rgba(13,148,136,0.09)';
  const secondaryBloom = isDark ? 'rgba(56,116,168,0.10)' : 'rgba(96,150,205,0.10)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={colors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Bloom
        color={primaryBloom}
        size={W * 1.5}
        origin={{ x: -W * 0.45, y: -H * 0.14 }}
        drift={{ x: W * 0.22, y: H * 0.08 }}
        duration={22000}
      />
      <Bloom
        color={secondaryBloom}
        size={W * 1.3}
        origin={{ x: W * 0.3, y: H * 0.6 }}
        drift={{ x: -W * 0.18, y: -H * 0.1 }}
        duration={28000}
      />

      {/* Vignette: darkens the top and bottom so the header and floating tab
          bar always have contrast, whatever the bloom is doing behind them. */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(8,11,17,0.85)', 'transparent', 'rgba(8,11,17,0.9)']
            : ['rgba(245,247,250,0.8)', 'transparent', 'rgba(237,241,246,0.85)']
        }
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};
