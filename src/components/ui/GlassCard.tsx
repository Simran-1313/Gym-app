import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** No longer renders a glow — kept so existing call sites keep compiling. */
  glowColor?: string;
  noPadding?: boolean;
  /** Retained so existing call sites keep compiling; tilt is gone by design. */
  noTilt?: boolean;
  innerStyle?: StyleProp<ViewStyle>;
  /** Raises the surface a step for cards that sit on top of other cards. */
  elevated?: boolean;
}

/**
 * The one card surface in the app: a flat, opaque panel with a hairline
 * border. No blur, no gradient sheen, no drop shadow — a resting card has no
 * functional reason to cast one (it isn't floating above anything), and
 * "elevated" is communicated the same way the rest of the design system
 * communicates it: a lighter background step (`surfaceElevated`), not a
 * shadow. Genuinely floating chrome — the bottom-sheet modal, the tab bar —
 * keeps its own shadow, because there it's load-bearing: it's what tells you
 * that surface sits above the content behind it.
 */
export const GlassCard: React.FC<Props> = ({
  children,
  style,
  noPadding,
  innerStyle,
  elevated,
}) => {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: colors.cardBorder,
        },
        style,
      ]}
    >
      <View style={[styles.inner, noPadding && styles.noPadding, innerStyle]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  inner: { padding: SPACING.md + 2 },
  noPadding: { padding: 0 },
});
