import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, GRADIENTS } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
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
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

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
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    onPress();
  };

  const isDisabled = disabled || loading;

  // ── PRIMARY ──
  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[animStyle, s.btn, style, isDisabled && s.disabled]}
      >
        <LinearGradient
          colors={[...GRADIENTS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.btnInner}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
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
          { backgroundColor: isDark ? 'rgba(50,50,50,0.2)' : 'rgba(200,200,200,0.18)' },
          style,
          isDisabled && s.disabled
        ]}
      >
        <BlurView
          tint={isDark ? 'dark' : 'light'}
          intensity={Platform.OS === 'ios' ? 50 : 80}
          style={StyleSheet.absoluteFill}
        />
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

  // Glass
  glassBtnOuter: {
    backgroundColor: 'rgba(200,200,200,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,79,24,0.30)',
  },

  // Labels
  primaryLabel: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  glassLabel: { fontSize: 15, fontWeight: '600' },
  ghostLabel: { fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.45 },
});
