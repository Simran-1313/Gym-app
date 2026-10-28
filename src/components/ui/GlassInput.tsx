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
import { INPUT, INPUT_LABEL, INPUT_TEXT } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props extends TextInputProps {
  /** React 19 passes `ref` as a plain prop; it lands on the inner TextInput via `rest`. */
  ref?: React.Ref<TextInput>;
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Inline validation message; also turns the border to the danger color. */
  error?: string | null;
}

export const GlassInput: React.FC<Props> = ({
  label,
  containerStyle,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  style,
  multiline,
  error,
  ...rest
}) => {
  const colors = useThemeColors();

  const focused = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focused.value,
      [0, 1],
      [error ? colors.danger : colors.surfaceBorder, error ? colors.danger : colors.primary],
    ),
  }));

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <Animated.View
        style={[
          styles.inputRow,
          multiline && styles.inputRowMultiline,
          borderStyle,
          { backgroundColor: colors.surface },
        ]}
      >
        {leftIcon}
        <TextInput
          {...rest}
          multiline={multiline}
          style={[styles.input, multiline && styles.inputMultiline, { color: colors.text }, style]}
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
      {error ? (
        <Text style={[styles.error, { color: colors.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { gap: INPUT.labelGap },
  label: INPUT_LABEL,
  // Explicit height (not vertical padding) so iOS and Android render the same box.
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: INPUT.radius,
    borderWidth: INPUT.borderWidth,
    paddingHorizontal: INPUT.paddingHorizontal,
    height: INPUT.height,
    gap: INPUT.gap,
  },
  inputRowMultiline: {
    height: undefined,
    minHeight: INPUT.multilineMinHeight,
    alignItems: 'flex-start',
    paddingVertical: INPUT.multilinePaddingVertical,
  },
  input: INPUT_TEXT,
  error: { fontFamily: INPUT_LABEL.fontFamily, fontSize: 12, lineHeight: 16 },
  inputMultiline: { height: undefined, minHeight: INPUT.multilineMinHeight - INPUT.multilinePaddingVertical * 2 - INPUT.borderWidth * 2, textAlignVertical: 'top' },
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
