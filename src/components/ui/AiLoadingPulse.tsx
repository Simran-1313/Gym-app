import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  size?: number;
}

export const AiLoadingPulse: React.FC<Props> = ({
  icon = 'nutrition-outline',
  size = 32,
}) => {
  const colors = useThemeColors();
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  // Opacity only — the icon breathes in place; it never grows or moves.
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={animStyle}>
        <Ionicons name={icon} size={size} color={colors.primary} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
