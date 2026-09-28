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

import { FONTS, MOTION, RADIUS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { bestTextOn } from '../../utils/color';

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
  // Computed from whatever colors.primary actually resolves to (default teal
  // or a tenant's own brand color) rather than assumed — see bestTextOn.
  const onPrimary = bestTextOn(colors.primary);

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
    // Derived from the resolved primary/primaryDark (tenant-aware), not the
    // fixed GRADIENTS.primary constant — a tenant's brand color used to only
    // reach colors.primary, never the button that's the app's main CTA.
    const gradient = destructive
      ? ([colors.danger, colors.danger] as const)
      : ([colors.primary, colors.primaryDark] as const);
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
            <ActivityIndicator color={destructive ? bestTextOn(colors.danger) : onPrimary} />
          ) : (
            <View style={s.row}>
              {icon}
              <Text
                style={[
                  s.primaryLabel,
                  { color: destructive ? bestTextOn(colors.danger) : onPrimary },
                ]}
              >
                {label}
              </Text>
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
    height: 50,
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
  ghostInner: { height: 44 },

  // Labels
  primaryLabel: { fontSize: 15, fontFamily: FONTS.bodyBold, letterSpacing: 0.2 },
  glassLabel: { fontSize: 15, fontFamily: FONTS.bodySemi },
  ghostLabel: { fontSize: 14, fontFamily: FONTS.bodySemi },
  disabled: { opacity: 0.45 },
});
