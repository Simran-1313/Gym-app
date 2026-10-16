import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { metricTint } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { shade } from '../../utils/color';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  moveProgress: number;     // Red Ring (Calories)
  exerciseProgress: number; // Lime Green Ring (Minutes)
  standProgress: number;    // Cyan Ring (Water/Hydration)
  size?: number;
}

export const AppleActivityRings: React.FC<Props> = ({
  moveProgress,
  exerciseProgress,
  standProgress,
  size = 140,
}) => {
  // Same metric tints as the legend beside the rings, so they follow light
  // mode; each ring runs from its tint to a slightly deeper shade.
  const colors = useThemeColors();
  const move = metricTint(colors, 'CALORIES');
  const exercise = metricTint(colors, 'DURATION');
  const water = metricTint(colors, 'WATER');

  const strokeWidth = size * 0.085;
  const center = size / 2;

  // Radii for the three concentric rings
  const r1 = size * 0.4;
  const r2 = size * 0.29;
  const r3 = size * 0.18;

  // Circumferences
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  // Animated shared values
  const animatedMove = useSharedValue(0);
  const animatedExercise = useSharedValue(0);
  const animatedStand = useSharedValue(0);

  useEffect(() => {
    const animationConfig = {
      duration: 1000,
      easing: Easing.bezier(0.16, 1, 0.3, 1), // smooth bezier easing
    };
    animatedMove.value = withTiming(Math.min(0.999, Math.max(0.001, moveProgress)), animationConfig);
    animatedExercise.value = withTiming(Math.min(0.999, Math.max(0.001, exerciseProgress)), animationConfig);
    animatedStand.value = withTiming(Math.min(0.999, Math.max(0.001, standProgress)), animationConfig);
  }, [moveProgress, exerciseProgress, standProgress]);

  // Animated props mapping strokeDashoffset
  const propsMove = useAnimatedProps(() => ({
    strokeDashoffset: c1 * (1 - animatedMove.value),
  }));

  const propsExercise = useAnimatedProps(() => ({
    strokeDashoffset: c2 * (1 - animatedExercise.value),
  }));

  const propsStand = useAnimatedProps(() => ({
    strokeDashoffset: c3 * (1 - animatedStand.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={move} />
            <Stop offset="100%" stopColor={shade(move, -0.18)} />
          </LinearGradient>
          <LinearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={exercise} />
            <Stop offset="100%" stopColor={shade(exercise, -0.18)} />
          </LinearGradient>
          <LinearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={water} />
            <Stop offset="100%" stopColor={shade(water, -0.18)} />
          </LinearGradient>
        </Defs>

        {/* Outer Ring Background (Red) */}
        <Circle
          cx={center}
          cy={center}
          r={r1}
          stroke={`${move}22`}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Middle Ring Background (Green) */}
        <Circle
          cx={center}
          cy={center}
          r={r2}
          stroke={`${exercise}22`}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Inner Ring Background (Cyan) */}
        <Circle
          cx={center}
          cy={center}
          r={r3}
          stroke={`${water}22`}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Outer Ring Active (Red) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={r1}
            stroke="url(#redGrad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={c1}
            animatedProps={propsMove}
          />

          {/* Middle Ring Active (Green) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={r2}
            stroke="url(#greenGrad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={c2}
            animatedProps={propsExercise}
          />

          {/* Inner Ring Active (Cyan) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={r3}
            stroke="url(#cyanGrad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={c3}
            animatedProps={propsStand}
          />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
