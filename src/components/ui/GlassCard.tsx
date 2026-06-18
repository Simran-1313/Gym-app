import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SPACING, DARK_COLORS, LIGHT_COLORS } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  noPadding?: boolean;
}

export const GlassCard: React.FC<Props> = ({ children, style, glowColor, noPadding }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const cardStyle: ViewStyle = {
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    // FOOLPROOF FIX: Android hates BlurView. Using solid/semi-transparent background instead.
    backgroundColor: isDark ? 'rgba(30,30,38,0.95)' : 'rgba(255,255,255,0.98)',
    overflow: 'hidden',
  };

  const shadowStyle: ViewStyle = isDark
    ? {}
    : {
        shadowColor: '#000000',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      };

  return (
    <View style={[cardStyle, shadowStyle, style]}>
      {glowColor ? (
        <LinearGradient
          colors={[`${glowColor}15`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.8 }}
          pointerEvents="none"
        />
      ) : null}
      <View style={[styles.inner, noPadding && styles.noPadding]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inner: {
    padding: SPACING.md,
  },
  noPadding: { padding: 0 },
});
