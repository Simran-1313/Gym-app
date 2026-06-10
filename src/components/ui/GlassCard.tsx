import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GLASS, RADIUS, SPACING } from '../../config/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  noPadding?: boolean;
}

export const GlassCard: React.FC<Props> = ({ children, style, glowColor, noPadding }) => (
  <View style={[styles.outer, style]}>
    {glowColor ? (
      <LinearGradient
        colors={[`${glowColor}33`, 'transparent']}
        style={styles.glowOverlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        pointerEvents="none"
      />
    ) : null}
    <BlurView intensity={GLASS.blurIntensity} tint={GLASS.blurTint} style={styles.blur}>
      <View style={[styles.inner, noPadding && styles.noPadding]}>{children}</View>
    </BlurView>
  </View>
);

const styles = StyleSheet.create({
  outer: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: GLASS.borderWidth,
    borderColor: COLORS.surfaceBorder,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: RADIUS.lg,
  },
  blur: {
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  inner: {
    padding: SPACING.md,
  },
  noPadding: { padding: 0 },
});
