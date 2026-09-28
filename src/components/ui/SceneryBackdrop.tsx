import React from 'react';
import { Image, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  RadialGradient,
  Stop,
  Path,
  Rect,
  G,
  Circle,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../hooks/useThemeColors';

export type SceneryVariant = 'mountains' | 'equipment' | 'track';

interface Props {
  variant?: SceneryVariant;
  style?: StyleProp<ViewStyle>;
  /** Darkening pass over the art. Raise it when text sits directly on top. */
  scrimStrength?: number;
}

const MOUNTAIN_PHOTO = require('../../../assets/mountain.jpg');

/** Scale an rgba string's alpha, clamped so a strength above 1 cannot overflow. */
const withAlpha = (c: string, k: number) =>
  c.replace(/rgba\(([^)]+),\s*([\d.]+)\)/, (_m, rgb, a) =>
    `rgba(${rgb},${Math.min(1, parseFloat(a) * k).toFixed(3)})`);

/**
 * Vertical scrim for the photograph.
 *
 * Heaviest at the top, because that is where the sky is brightest AND where the
 * hero's metric sits — the two constraints coincide. It does not vary by theme:
 * the photo cannot recolour, so this card is a dark media surface in light mode
 * too, and its copy stays white either way.
 */
const PHOTO_SCRIM = [
  'rgba(6,14,20,0.86)',
  'rgba(6,14,20,0.40)',
  'rgba(6,14,20,0.32)',
  'rgba(6,14,20,0.72)',
] as const;

/** Extra darkening on the left, under the metric and caption column. */
const PHOTO_SIDE_SCRIM = ['rgba(6,14,20,0.62)', 'rgba(6,14,20,0.12)', 'transparent'] as const;

/**
 * Cool grade over the photograph.
 *
 * The source is a warm sunset — deep orange through the cloud band — and the
 * app's single accent is teal. Ungraded the two fight, and the teal sparkline
 * crossing the card reads as an error rather than a highlight. This pulls the
 * midtones toward the palette while leaving the lit summit warm, so it still
 * reads as alpenglow rather than a blue filter.
 */
const PHOTO_GRADE = 'rgba(12,52,64,0.34)';

export const SceneryBackdrop: React.FC<Props> = ({
  variant = 'mountains',
  style,
  scrimStrength = 1,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = useThemeColors();

  if (variant === 'mountains') {
    const scrim = PHOTO_SCRIM.map((c) => withAlpha(c, scrimStrength)) as unknown as
      readonly [string, string, string, string];

    return (
      <View style={[StyleSheet.absoluteFill, styles.clip, style]} pointerEvents="none">
        <Image source={MOUNTAIN_PHOTO} style={StyleSheet.absoluteFill} resizeMode="cover" />

        <View style={[StyleSheet.absoluteFill, { backgroundColor: PHOTO_GRADE }]} />

        <LinearGradient
          colors={PHOTO_SIDE_SCRIM}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        <LinearGradient
          colors={scrim}
          locations={[0, 0.3, 0.62, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  // ── Vector variants ───────────────────────────────────────────────────────
  // Still drawn: no photograph was supplied for these, and the equipment scene
  // has to recolour with the theme because its card is not a media card.

  const sky = isDark
    ? { top: '#0A141C', bottom: '#0D2029' }
    : { top: '#DCE9EB', bottom: '#EEF4F5' };

  const scrim = colors.scrim.map((c) => withAlpha(c, scrimStrength)) as unknown as
    readonly [string, string, string, string];

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky.top} />
            <Stop offset="1" stopColor={sky.bottom} />
          </SvgGradient>

          <RadialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={isDark ? '0.34' : '0.24'} />
            <Stop offset="0.5" stopColor={colors.primary} stopOpacity={isDark ? '0.13' : '0.09'} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </RadialGradient>

          <SvgGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={isDark ? '#5A6C7E' : '#B9C4CE'} />
            <Stop offset="1" stopColor={isDark ? '#28353F' : '#8B98A5'} />
          </SvgGradient>
        </Defs>

        <Rect x="0" y="0" width="400" height="220" fill="url(#sky)" />

        {variant === 'equipment' && (
          <G>
            <Circle cx="300" cy="120" r="130" fill="url(#glow)" />

            {/* Rear dumbbell, small and low-contrast to suggest depth of field. */}
            <G opacity={0.35} transform="translate(60,150) scale(0.62)">
              <Rect x="60" y="-8" width="120" height="16" rx="6" fill="url(#metal)" />
              <Rect x="30" y="-30" width="34" height="60" rx="9" fill="url(#metal)" />
              <Rect x="176" y="-30" width="34" height="60" rx="9" fill="url(#metal)" />
              <Rect x="6" y="-40" width="28" height="80" rx="10" fill="url(#metal)" />
              <Rect x="206" y="-40" width="28" height="80" rx="10" fill="url(#metal)" />
            </G>

            {/* Foreground dumbbell, tilted so it reads as resting on a floor. */}
            <G transform="translate(150,138) rotate(-11)">
              <Rect x="52" y="-9" width="120" height="18" rx="7" fill="url(#metal)" />
              <Rect x="22" y="-34" width="36" height="68" rx="10" fill="url(#metal)" />
              <Rect x="166" y="-34" width="36" height="68" rx="10" fill="url(#metal)" />
              <Rect x="-4" y="-46" width="30" height="92" rx="11" fill="url(#metal)" />
              <Rect x="198" y="-46" width="30" height="92" rx="11" fill="url(#metal)" />
              {/* Teal rim light along the top edges of the plates. */}
              <Rect x="-4" y="-46" width="30" height="3" rx="1.5" fill={colors.primary} opacity={0.42} />
              <Rect x="198" y="-46" width="30" height="3" rx="1.5" fill={colors.primary} opacity={0.42} />
            </G>

            <Path d="M0,196 L400,188 L400,220 L0,220 Z" fill={isDark ? '#0A1219' : '#C9D4DC'} />
          </G>
        )}

        {variant === 'track' && (
          <G>
            <Circle cx="200" cy="150" r="130" fill="url(#glow)" />
            {/* Converging lane lines — a running track in one-point perspective. */}
            {[0, 1, 2, 3, 4].map((i) => (
              <Path
                key={i}
                d={`M${-40 + i * 70},220 L${168 + i * 17},112`}
                stroke={colors.primary}
                strokeOpacity={0.16 + i * 0.03}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            ))}
            <Path d="M0,112 L400,112 L400,220 L0,220 Z" fill={isDark ? '#0A1219' : '#D4E4E4'} opacity={0.25} />
          </G>
        )}
      </Svg>

      <LinearGradient
        colors={scrim}
        locations={[0, 0.32, 0.62, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // The photo must not bleed past the card's rounded corners on Android.
  clip: { overflow: 'hidden' },
});
