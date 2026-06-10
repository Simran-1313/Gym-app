import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';

interface Props extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const GlassInput: React.FC<Props> = ({
  label,
  containerStyle,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  style,
  ...rest
}) => {
  const focused = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focused.value,
      [0, 1],
      [COLORS.surfaceBorder, COLORS.primary],
    ),
  }));

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View style={[styles.inputRow, borderStyle]}>
        {leftIcon}
        <TextInput
          {...rest}
          style={[styles.input, style]}
          placeholderTextColor={COLORS.textMuted}
          onFocus={(e) => {
            focused.value = withTiming(1, { duration: 200 });
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focused.value = withTiming(0, { duration: 200 });
            setIsFocused(false);
            onBlur?.(e);
          }}
        />
        {rightIcon}
      </Animated.View>
      {isFocused ? <View style={styles.focusGlow} pointerEvents="none" /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { gap: SPACING.xs },
  label: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    minHeight: 52,
    gap: SPACING.sm,
  },
  input: { flex: 1, color: COLORS.text, fontSize: FONT_SIZE.md },
  focusGlow: {
    position: 'absolute',
    bottom: -2,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: 2,
    opacity: 0.5,
  },
});
