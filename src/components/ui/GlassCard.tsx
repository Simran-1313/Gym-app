import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DARK_COLORS, LIGHT_COLORS, RADIUS, SPACING, shadow } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  noPadding?: boolean;
  /** Retained so existing call sites keep compiling; tilt is gone by design. */
  noTilt?: boolean;
  innerStyle?: StyleProp<ViewStyle>;
  /** Raises the surface a step for cards that sit on top of other cards. */
  elevated?: boolean;
}

/**
 * The one card surface in the app.
 *
 * Previously this stacked a blur, three gradients and a perspective tilt. All
 * of it is gone: over an animated ground, translucent cards let the moving
 * bloom show through and the text swims. A near-opaque surface with a hairline
 * border reads cleaner, holds contrast regardless of what is behind it, and
 * composites far cheaper in a scrolling list.
 */
export const GlassCard: React.FC<Props> = ({
  children,
  style,
  glowColor,
  noPadding,
  innerStyle,
  elevated,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: colors.cardBorder,
        },
        shadow(isDark, elevated ? 'lg' : 'md'),
        style,
      ]}
    >
      {/* Top-edge sheen. One gradient, low opacity — enough to stop the surface
          reading as a flat rectangle, not enough to look glassy. */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,255,255,0.045)', 'transparent']
            : ['rgba(255,255,255,0.9)', 'transparent']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {glowColor ? (
        <LinearGradient
          colors={[glowColor, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.8 }}
          style={[StyleSheet.absoluteFill, { opacity: 0.14 }]}
          pointerEvents="none"
        />
      ) : null}

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
