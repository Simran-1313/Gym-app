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
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, GRADIENTS, RADIUS } from '../../config/theme';
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
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // haptics unavailable
    }
    onPress();
  };

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[animStyle, styles.wrapper, style, isDisabled && styles.disabled]}
      >
        <LinearGradient
          colors={[...GRADIENTS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryInner}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <View style={styles.labelRow}>
              {icon}
              <Text style={styles.primaryText}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  const secondaryStyle: ViewStyle = {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: isDark ? colors.surface : 'rgba(255,79,24,0.06)',
    paddingHorizontal: 20,
  };

  const ghostStyle: ViewStyle = {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        animStyle,
        styles.wrapper,
        variant === 'secondary' ? secondaryStyle : ghostStyle,
        style,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.labelRow}>
          {icon}
          <Text
            style={[
              variant === 'secondary'
                ? { color: colors.primary, fontSize: FONT_SIZE.md, fontWeight: '700' }
                : { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontWeight: '600' },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrapper: { borderRadius: RADIUS.md, overflow: 'hidden' },
  primaryInner: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryText: { color: '#FFFFFF', fontSize: FONT_SIZE.lg, fontWeight: '700' },
  disabled: { opacity: 0.55 },
});
