import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_SIZE, GRADIENTS, RADIUS, SPACING } from '../../config/theme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  index?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedChip: React.FC<Props> = ({
  label,
  selected,
  onPress,
  disabled,
  index = 0,
}) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(1.08, { damping: 8, stiffness: 400 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
      <AnimatedPressable
        onPress={handlePress}
        disabled={disabled}
        style={[animStyle, styles.chipOuter, disabled && styles.disabled]}
      >
        {selected ? (
          <LinearGradient
            colors={[...GRADIENTS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.chipInner}
          >
            <Text style={styles.textSelected}>{label}</Text>
          </LinearGradient>
        ) : (
          <Animated.View style={styles.chipOutline}>
            <Text style={styles.text}>{label}</Text>
          </Animated.View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chipOuter: { borderRadius: RADIUS.full, overflow: 'hidden' },
  chipInner: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  chipOutline: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  text: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500' },
  textSelected: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
