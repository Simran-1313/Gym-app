import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { FONTS, RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** A quieter second way forward, shown as a text link under the action. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** `error` tints amber and gives the action a retry glyph. Defaults to
   *  `error` for warning icons, so existing call sites pick it up. */
  tone?: 'empty' | 'error';
}

/** Decorative satellites around the badge: [angle°, distance, size, opacity]. */
const ORBIT: [number, number, number, number][] = [
  [-38, 70, 8, 0.9],
  [205, 64, 6, 0.55],
  [140, 72, 4, 0.4],
  [12, 74, 3, 0.35],
];

/**
 * The app's one "nothing here" surface — empty lists, failed loads.
 *
 * The badge sits in soft concentric halos with a few orbiting dots, so the
 * moment reads as designed rather than as a missing screen, and the colour
 * says which kind of nothing it is: teal for "nothing yet", amber for
 * "something went wrong". It enters once (fade, then the badge springs in)
 * and then holds still: an empty state is a resting state, and a looping
 * animation would pull the eye from the one action that matters.
 */
export const EmptyState: React.FC<Props> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  tone,
}) => {
  const colors = useThemeColors();
  const onPrimary = '#FFFFFF';
  const isError = (tone ?? (icon.startsWith('warning') ? 'error' : 'empty')) === 'error';
  const accent = isError ? colors.warning : colors.primary;

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.container}>
      <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
        {/* A faint wash from the top so the card isn't a flat slab. */}
        <View pointerEvents="none" style={[styles.wash, { backgroundColor: `${accent}0A` }]} />

        <View style={styles.art}>
          <Animated.View
            entering={FadeIn.duration(500).delay(80)}
            style={[styles.halo, styles.haloOuter, { borderColor: `${accent}1F` }]}
          />
          <Animated.View
            entering={FadeIn.duration(500).delay(40)}
            style={[styles.halo, styles.haloInner, { backgroundColor: `${accent}0F`, borderColor: `${accent}26` }]}
          />
          {ORBIT.map(([deg, dist, size, opacity]) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <Animated.View
                key={deg}
                entering={FadeIn.duration(400).delay(220)}
                style={[
                  styles.dot,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: accent,
                    opacity,
                    transform: [{ translateX: Math.cos(rad) * dist }, { translateY: Math.sin(rad) * dist }],
                  },
                ]}
              />
            );
          })}
          <Animated.View
            entering={ZoomIn.springify().damping(14).stiffness(180).delay(120)}
            style={[styles.badge, { backgroundColor: colors.surfaceElevated, borderColor: `${accent}40` }]}
          >
            <View style={[StyleSheet.absoluteFill, styles.badgeFill, { backgroundColor: `${accent}1A` }]} />
            <Ionicons name={icon} size={30} color={accent} />
          </Animated.View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}

        {actionLabel && onAction ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onAction();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.actionPill,
              { backgroundColor: colors.primarySolid },
              pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
            ]}
          >
            {isError ? <Ionicons name="refresh" size={15} color={onPrimary} /> : null}
            <Text style={[styles.actionText, { color: onPrimary }]}>{actionLabel}</Text>
            {isError ? null : <Ionicons name="arrow-forward" size={14} color={onPrimary} />}
          </Pressable>
        ) : null}

        {secondaryLabel && onSecondary ? (
          <Pressable
            onPress={onSecondary}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.5 }]}
          >
            <Text style={[styles.secondaryText, { color: colors.primary }]}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
};

const ART = 156;

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    width: '100%',
  },
  card: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },

  art: {
    width: ART,
    height: ART,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  halo: { position: 'absolute', borderRadius: RADIUS.full, borderWidth: 1 },
  haloOuter: { width: ART, height: ART },
  haloInner: { width: 112, height: 112 },
  dot: { position: 'absolute' },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeFill: { borderRadius: 24 },

  title: {
    fontSize: 18,
    fontFamily: FONTS.displaySemi,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    paddingHorizontal: 22,
    height: 44,
    borderRadius: RADIUS.full,
  },
  actionText: {
    fontSize: 13.5,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.2,
  },
  secondary: { marginTop: 14 },
  secondaryText: { fontSize: 13, fontFamily: FONTS.bodySemi },
});
