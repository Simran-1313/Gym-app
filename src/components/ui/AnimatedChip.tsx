import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { DARK_COLORS, FONT_SIZE, FONTS, GRADIENTS, LIGHT_COLORS, RADIUS, SPACING } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

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
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Press *in* to 0.96 and release back to 1, rather than bouncing outward on
  // release — the finger is still on the chip, so the feedback should track it.
  const springIn = { damping: 18, stiffness: 320 };

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={() => {
          scale.value = withSpring(0.96, springIn);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, springIn);
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: Boolean(disabled) }}
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
          <Animated.View style={[styles.chipOutline, {
            borderColor: colors.surfaceBorder,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          }]}>
            <Text style={[styles.text, { color: colors.textSecondary }]}>{label}</Text>
          </Animated.View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chipOuter: { borderRadius: RADIUS.full, overflow: 'hidden' },
  // 44pt is the smallest comfortable touch target; the old 8pt padding left
  // these at ~34 and they were easy to miss.
  chipInner: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  chipOutline: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  text: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.bodyMedium },
  textSelected: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontFamily: FONTS.bodyBold },
  disabled: { opacity: 0.5 },
});
