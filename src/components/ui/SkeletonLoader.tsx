import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonLoader: React.FC<Props> = ({ height = 72, style }) => {
  const colors = useThemeColors();
  const translateX = useSharedValue(-200);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(400, { duration: 1500, easing: Easing.linear }),
      -1,
      false,
    );
  }, [translateX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.card, { height, backgroundColor: colors.surface, borderColor: colors.surfaceBorder }, style]}>
      <Animated.View style={[styles.shimmerWrap, shimmerStyle]}>
        <LinearGradient
          colors={[colors.transparent, colors.inset, colors.transparent]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmer}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  shimmerWrap: { ...StyleSheet.absoluteFill },
  shimmer: { flex: 1, width: 200 },
});
