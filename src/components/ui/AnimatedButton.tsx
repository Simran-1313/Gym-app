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

import { FONTS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

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
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(destructive ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const isDisabled = disabled || loading;

  // ── PRIMARY ──
  if (variant === 'primary') {
    const gradient = destructive ? ([colors.danger, colors.danger] as const) : ([colors.primary, colors.primaryDark] as const);
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[animStyle, s.btn, style, isDisabled && s.disabled]}
      >
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnInner}>
          {loading ? (
            <ActivityIndicator color="#04211F" />
          ) : (
            <View style={s.row}>
              {icon}
              <Text style={s.primaryLabel}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // ── SECONDARY: solid elevated surface, not a blur pass ──
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
          s.secondaryBtn,
          { backgroundColor: colors.surface2, borderColor: colors.surfaceBorder },
          style,
          isDisabled && s.disabled,
        ]}
      >
        <View style={s.btnInner}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={s.row}>
              {icon}
              <Text style={[s.secondaryLabel, { color: colors.primary }]}>{label}</Text>
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  }

  // ── GHOST ──
  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[animStyle, s.btn, { height: 44 }, style, isDisabled && s.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={s.row}>
          {icon}
          <Text style={[s.ghostLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

const s = StyleSheet.create({
  btn: {
    borderRadius: 14,
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
  secondaryBtn: {
    borderWidth: 1,
  },
  primaryLabel: { color: '#04211F', fontSize: 15, fontFamily: FONTS.bodyBold, letterSpacing: 0.2 },
  secondaryLabel: { fontSize: 15, fontFamily: FONTS.bodySemi },
  ghostLabel: { fontSize: 14, fontFamily: FONTS.bodySemi },
  disabled: { opacity: 0.45 },
});
