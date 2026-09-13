import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { FONT_SIZE, FONTS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  progress: number;
  size?: number;
  label?: string;
  value?: string;
  strokeWidth?: number;
  /** Solid stroke color, e.g. for a set of rings that must read as distinct
   * metrics (protein/carbs/fat). Omit to keep the default primary→secondary
   * gradient used for a single "this metric" ring. */
  color?: string;
}

export const ProgressRing: React.FC<Props> = ({
  progress,
  size = 72,
  label,
  value,
  strokeWidth = 6,
  color,
}) => {
  const colors = useThemeColors();
  const gradId = `ringGrad-${label ?? 'r'}`;
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(0);
  const cx = size / 2;
  const cy = size / 2;

  useEffect(() => {
    animatedProgress.value = withTiming(clamped, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Each ring needs its own gradient id: siblings sharing "ringGrad"
            can resolve to whichever <LinearGradient> the renderer saw first,
            so every ring in a row (e.g. protein/carbs/fat) rendered the same
            color regardless of its own Stops. */}
        {!color && (
          <Defs>
            <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.primary} />
              <Stop offset="100%" stopColor={colors.secondary} />
            </LinearGradient>
          </Defs>
        )}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={colors.surfaceBorder}
          strokeWidth={strokeWidth}
          fill={colors.inset}
        />
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={color ?? `url(#${gradId})`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      <View style={styles.center}>
        {value ? <Text style={[styles.value, { color: colors.text }]}>{value}</Text> : null}
        {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: FONT_SIZE.md, fontFamily: FONTS.bodyExtra },
  label: { fontSize: FONT_SIZE.xs, marginTop: 2 },
});
