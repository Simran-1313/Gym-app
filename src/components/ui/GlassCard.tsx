import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SPACING } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  noPadding?: boolean;
  /** @deprecated kept for backward-compat call sites; the new elevation-surface card has no tilt. */
  noTilt?: boolean;
  innerStyle?: StyleProp<ViewStyle>;
  /** Renders on the surface-2 tier instead of surface-1 — a nested chip/tile inside another card. */
  elevated?: boolean;
}

/**
 * A solid, layered card — the base building block of the redesign. Depth comes
 * from stepping up one elevation tier plus a soft ambient shadow, not from a
 * blur pass and a translucent tint. Cheaper to render than the previous glass
 * treatment, and reads calmer at a glance, which matters on screens (Home,
 * Activity) that stack half a dozen of these at once.
 */
export const GlassCard: React.FC<Props> = ({ children, style, glowColor, noPadding, innerStyle, elevated }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = useThemeColors();

  const cardStyle: ViewStyle = {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: elevated ? colors.surface2 : colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  };

  const shadowStyle: ViewStyle = isDark
    ? {
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }
    : {
        shadowColor: '#1E293B',
        shadowOpacity: 0.1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      };

  return (
    <View style={[cardStyle, shadowStyle, style]}>
      {/* Optional accent wash — a hint of brand color top-down, used sparingly for a card that needs to stand out (e.g. the daily insight card). */}
      {glowColor ? (
        <LinearGradient
          colors={[`${glowColor}14`, 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      <View style={[styles.inner, noPadding && styles.noPadding, innerStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  inner: { padding: SPACING.md },
  noPadding: { padding: 0 },
});
