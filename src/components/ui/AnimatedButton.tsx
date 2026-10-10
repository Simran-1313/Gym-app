import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { BUTTON, FONTS, MOTION, RADIUS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { shade, solidFillFor } from '../../utils/color';

/** White text is always the label color on a solid CTA fill — the fill
 *  itself (colors.primarySolid / a darkened danger) is what's guaranteed
 *  to carry it, rather than flipping the text color per background. */
const ON_SOLID = '#FFFFFF';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
  /** Renders the primary variant in the danger color — destructive confirms (e.g. "Log Out"). */
  destructive?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedButton: React.FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
  destructive = false,
}) => {
  const colors = useThemeColors();

  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, MOTION.press);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, MOTION.press);
  };

  const handlePress = () => {
    if (disabled || loading) return;
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    onPress();
  };

  const isDisabled = disabled || loading;

  // ── PRIMARY ──
  if (variant === 'primary') {
    // colors.primarySolid (or a darkened danger for the destructive case) is
    // deep enough that white always clears WCAG AA on it — see
    // solidFillFor's doc comment. Derived from the tenant's actual brand
    // color when one is set, not the fixed GRADIENTS.primary constant.
    const fill = destructive ? solidFillFor(colors.danger) : colors.primarySolid;
    const gradient = [fill, shade(fill, -0.18)] as const;
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[animStyle, s.btn, style, isDisabled && s.disabled]}
      >
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.btnInner}
        >
          {loading ? (
            <ActivityIndicator color={ON_SOLID} />
          ) : (
            <View style={s.row}>
              {icon}
              <Text style={[s.primaryLabel, { color: ON_SOLID }]}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // ── SECONDARY: Clean iOS Frosted Glass ──
  if (variant === 'secondary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          animStyle,
          s.btn,
          s.glassBtnOuter,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primaryBorder,
          },
          style,
          isDisabled && s.disabled
        ]}
      >
        <View style={s.btnInner}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={s.row}>
              {icon}
              <Text style={[s.glassLabel, { color: colors.primary }]}>{label}</Text>
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  }

  // ── GHOST ──
  // Matches `.btn-ghost` in the prototype: transparent, hairline outline, pill.
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        animStyle,
        s.btn,
        s.ghostOuter,
        { borderColor: colors.surfaceBorder },
        style,
        isDisabled && s.disabled,
      ]}
    >
      <View style={[s.btnInner, s.ghostInner]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={s.row}>
            {icon}
            <Text style={[s.ghostLabel, { color: colors.text }]}>{label}</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
};

const s = StyleSheet.create({
  btn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  btnInner: {
    height: BUTTON.height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Glass
  glassBtnOuter: {
    borderWidth: 1,
  },

  ghostOuter: { borderWidth: 1, borderRadius: RADIUS.full, backgroundColor: 'transparent' },
  ghostInner: { height: BUTTON.ghostHeight },

  // Labels
  primaryLabel: { fontSize: 16, fontFamily: FONTS.bodyBold, letterSpacing: 0.2 },
  glassLabel: { fontSize: 16, fontFamily: FONTS.bodySemi },
  ghostLabel: { fontSize: 14, fontFamily: FONTS.bodySemi },
  disabled: { opacity: 0.45 },
});
