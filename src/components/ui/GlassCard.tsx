import React from 'react';
import { Platform, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { RADIUS, SPACING } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  noPadding?: boolean;
  noTilt?: boolean;
  innerStyle?: StyleProp<ViewStyle>;
}

export const GlassCard: React.FC<Props> = ({ children, style, glowColor, noPadding, noTilt, innerStyle }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  // ─── Premium card surface ───
  // Dark: deep space glass with subtle luminosity
  // Light: frosted crystal with prismatic edge highlights
  const cardStyle: ViewStyle = {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: isDark
      ? 'rgba(18,18,28,0.55)'
      : 'rgba(255,255,255,0.42)',
    borderWidth: isDark ? 1 : 1.5,
    borderColor: isDark
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(255,255,255,0.65)',
  };

  // Layered shadow for true depth
  const shadowStyle: ViewStyle = isDark
    ? {
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }
    : {
        shadowColor: '#8B8FAE',
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      };

  // Perspective tilt gives a subtle 3D card feel
  const tiltStyle: ViewStyle = noTilt
    ? {}
    : {
        transform: [{ perspective: 1200 }, { rotateX: '0.3deg' }],
      };

  return (
    <View style={[cardStyle, shadowStyle, tiltStyle, style]}>
      {/* Frosted glass layer */}
      <BlurView
        tint={isDark ? 'dark' : 'light'}
        intensity={isDark ? 35 : 55}
        style={StyleSheet.absoluteFill}
      />

      {/* Primary surface gradient — gives the "glass" its unique color */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.025)', 'rgba(255,255,255,0.008)']
            : ['rgba(255,255,255,0.55)', 'rgba(248,250,255,0.3)', 'rgba(245,247,252,0.15)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Top-edge light reflection — simulates light hitting the top of a 3D surface */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,255,255,0.05)', 'transparent']
            : ['rgba(255,255,255,0.75)', 'transparent']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Left-edge prismatic highlight (light mode only) — gives "crystal" feel */}
      {!isDark && (
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'transparent']}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0.15, y: 0.7 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {/* Accent glow when specified */}
      {glowColor ? (
        <LinearGradient
          colors={[glowColor, 'transparent']}
          style={[StyleSheet.absoluteFill, { opacity: 0.1 }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.75 }}
          pointerEvents="none"
        />
      ) : null}

      {/* Bottom edge reflection */}
      <View
        style={[
          styles.bottomHighlight,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.55)' },
        ]}
        pointerEvents="none"
      />

      <View style={[styles.inner, noPadding && styles.noPadding, innerStyle]}>
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
  bottomHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
  },
});
