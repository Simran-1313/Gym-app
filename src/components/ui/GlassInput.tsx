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
import { FONT_SIZE, FONTS, RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

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
  const colors = useThemeColors();

  const focused = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focused.value,
      [0, 1],
      [colors.surfaceBorder, colors.primary],
    ),
  }));

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <Animated.View style={[styles.inputRow, borderStyle, { backgroundColor: colors.surface }]}>
        {leftIcon}
        <TextInput
          {...rest}
          style={[styles.input, { color: colors.text }, style]}
          placeholderTextColor={colors.textMuted}
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
      {isFocused ? <View style={[styles.focusGlow, { backgroundColor: colors.primaryGlow }]} pointerEvents="none" /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { gap: SPACING.sm },
  // `.field-label { font-size:11.5px; font-weight:700; text-transform:none but visually all-caps copy }`
  label: {
    fontSize: 11.5,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    minHeight: 54,
    gap: SPACING.sm,
  },
  input: { flex: 1, fontSize: FONT_SIZE.md, fontFamily: FONTS.body, paddingVertical: SPACING.sm },
  focusGlow: {
    position: 'absolute',
    bottom: -2,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 2,
    opacity: 0.5,
  },
});
