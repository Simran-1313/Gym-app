import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { GlassCard } from '../ui/GlassCard';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useActivity } from '../../context/ActivityContext';
import { FONTS, MOTION, RADIUS, SPACING } from '../../config/theme';
import {
  HYDRATION_DAY,
  expectedIntakeMl,
  hydrationDayProgress,
} from '../../utils/activity';

/** Past this multiple of the goal, the card stops encouraging more. */
const PLENTY_RATIO = 1.5;

const formatLitres = (ml: number) => (ml / 1000).toFixed(2);

const formatMl = (ml: number) => (ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} ml`);

const formatClock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatAgo = (iso: string, now: number) => {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m ago` : `${h}h ago`;
};

/** Ticks once a minute so "behind pace" and "2h ago" stay true while the
 *  screen sits open. */
const useMinuteClock = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
};

/**
 * Today's water, shared by Home and Activity. Reads and writes the activity
 * store directly so both screens always show the same count.
 *
 * Above the goal the bar doesn't just sit full: the track rescales so the
 * goal becomes a tick inside it and the extra shows as its own segment, and
 * the status line moves from pacing to when the goal was reached — then to a
 * gentle "that's plenty" once intake is well past it.
 */
export const HydrationCard: React.FC = () => {
  const colors = useThemeColors();
  const { water, addWater } = useActivity();
  const now = useMinuteClock();
  const tint = colors.tint.hydration;

  const { totalMl, goalMl, logs } = water;
  const overGoal = totalMl >= goalMl;
  const extraMl = Math.max(0, totalMl - goalMl);
  const plenty = totalMl >= goalMl * PLENTY_RATIO;

  // Track scale: the goal until it's passed, then the total — so the goal
  // stays visible as a tick instead of the bar clipping at 100%.
  const scaleMl = Math.max(goalMl, totalMl, 1);
  const baseFrac = Math.min(totalMl, goalMl) / scaleMl;
  const extraFrac = extraMl / scaleMl;
  const goalFrac = goalMl / scaleMl;

  const expected = expectedIntakeMl(goalMl, new Date(now));
  const behind = expected - totalMl;
  const paceFrac = hydrationDayProgress(new Date(now));

  const lastLog = logs.length ? logs[logs.length - 1] : null;
  const goalReachedAt = (() => {
    let running = 0;
    for (const l of logs) {
      running += l.amountMl;
      if (running >= goalMl) return l.timestamp;
    }
    return null;
  })();

  /* ── Animated fills, in px so the spring runs on the UI thread ── */
  const [trackW, setTrackW] = useState(0);
  const baseW = useSharedValue(0);
  const extraW = useSharedValue(0);
  useEffect(() => {
    if (!trackW) return;
    baseW.value = withSpring(baseFrac * trackW, MOTION.press);
    extraW.value = withSpring(extraFrac * trackW, MOTION.press);
  }, [baseFrac, extraFrac, trackW, baseW, extraW]);
  const baseStyle = useAnimatedStyle(() => ({ width: baseW.value }));
  // The extra segment rides on the end of the base fill, so they move as one.
  const extraStyle = useAnimatedStyle(() => ({ left: baseW.value, width: extraW.value }));

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  /* ── Taps ── */
  const prevTotal = useRef(totalMl);
  useEffect(() => {
    // One success tap the moment the goal is crossed — not on every add after.
    if (prevTotal.current < goalMl && totalMl >= goalMl) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    prevTotal.current = totalMl;
  }, [totalMl, goalMl]);

  const add = (ml: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    addWater(ml);
  };

  /* ── Status line ── */
  let statusIcon: keyof typeof Ionicons.glyphMap;
  let statusColor: string;
  let status: string;
  if (plenty) {
    statusIcon = 'leaf-outline';
    statusColor = colors.textSecondary;
    status = `${formatMl(extraMl)} past your goal — plenty for today. Sip with meals from here.`;
  } else if (overGoal) {
    statusIcon = 'checkmark-circle';
    statusColor = colors.success;
    status = goalReachedAt
      ? `Goal reached at ${formatClock(goalReachedAt)}${extraMl ? ` · +${formatMl(extraMl)} extra` : ''}`
      : `Goal reached${extraMl ? ` · +${formatMl(extraMl)} extra` : ''}`;
  } else if (expected === 0) {
    statusIcon = 'sunny-outline';
    statusColor = colors.textSecondary;
    status = `Your day starts at ${HYDRATION_DAY.startHour} AM — a glass on waking is a strong start`;
  } else if (behind > 0) {
    statusIcon = 'time-outline';
    statusColor = colors.warning;
    status = `${formatMl(behind)} behind pace · aim for ${formatMl(expected)} by now`;
  } else {
    statusIcon = 'trending-up';
    statusColor = colors.success;
    status =
      -behind >= 250 ? `Ahead of pace by ${formatMl(-behind)}` : 'Right on pace for your goal';
  }

  return (
    <GlassCard>
      <View style={s.head}>
        <View style={s.titleRow}>
          <View style={[s.icon, { backgroundColor: `${tint}1F` }]}>
            <Ionicons name="water" size={13} color={tint} />
          </View>
          <Text style={[s.title, { color: colors.text }]}>Hydration</Text>
        </View>
        {lastLog ? (
          <Text style={[s.meta, { color: colors.textMuted }]}>
            Last glass {formatAgo(lastLog.timestamp, now)}
          </Text>
        ) : null}
      </View>

      <View style={s.readout}>
        <Text style={[s.value, { color: colors.text }]}>
          {formatLitres(totalMl)}
          <Text style={[s.unit, { color: colors.textMuted }]}> L</Text>
        </Text>
        <Text style={[s.goal, { color: colors.textMuted }]}>
          of {(goalMl / 1000).toFixed(1)} L
        </Text>
      </View>

      {/* Track: goal portion, extra portion, a goal tick once exceeded, and a
          pace marker for where an even day would have you by now. */}
      <View style={s.trackWrap}>
        <View style={[s.track, { backgroundColor: colors.inset }]} onLayout={onTrackLayout}>
          <Animated.View style={[s.fill, { backgroundColor: tint }, baseStyle]} />
          <Animated.View
            style={[s.fill, s.extra, { backgroundColor: `${tint}73` }, extraStyle]}
          />
        </View>
        {overGoal && extraMl > 0 ? (
          <View style={[s.goalTick, { left: goalFrac * trackW - 1, backgroundColor: colors.text }]} />
        ) : null}
        {!overGoal && expected > 0 ? (
          <View
            pointerEvents="none"
            style={[s.paceMarker, { left: paceFrac * trackW - 1, backgroundColor: colors.textSecondary }]}
          />
        ) : null}
      </View>

      <View style={s.statusRow}>
        <Ionicons name={statusIcon} size={14} color={statusColor} />
        <Text style={[s.status, { color: colors.textSecondary }]} numberOfLines={2}>
          {status}
        </Text>
      </View>

      <View style={s.btns}>
        <Pressable
          onPress={() => add(-250)}
          disabled={totalMl <= 0}
          accessibilityLabel="Remove 250 millilitres"
          hitSlop={4}
          style={({ pressed }) => [
            s.btn,
            s.btnSquare,
            {
              backgroundColor: pressed ? colors.cardPressed : 'transparent',
              borderColor: colors.cardBorder,
              opacity: totalMl <= 0 ? 0.4 : 1,
            },
          ]}
        >
          <Ionicons name="remove" size={18} color={colors.textSecondary} />
        </Pressable>
        {[250, 500].map((ml) => (
          <Pressable
            key={ml}
            onPress={() => add(ml)}
            accessibilityLabel={`Add ${ml} millilitres`}
            style={({ pressed }) => [
              s.btn,
              s.btnWide,
              {
                backgroundColor: pressed ? `${tint}33` : `${tint}1A`,
                borderColor: `${tint}40`,
              },
            ]}
          >
            <Ionicons name="add" size={17} color={tint} />
            <Text style={[s.btnText, { color: tint }]}>{ml} ml</Text>
          </Pressable>
        ))}
      </View>
    </GlassCard>
  );
};

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 24, height: 24, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONTS.displaySemi, fontSize: 15, letterSpacing: -0.2 },
  meta: { fontFamily: FONTS.bodyMedium, fontSize: 11.5, fontVariant: ['tabular-nums'] },

  readout: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10, marginBottom: 12 },
  value: { fontFamily: FONTS.displayBold, fontSize: 28, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: FONTS.bodySemi, fontSize: 14 },
  goal: { fontFamily: FONTS.bodyMedium, fontSize: 13, fontVariant: ['tabular-nums'] },

  trackWrap: { justifyContent: 'center' },
  track: { height: 10, borderRadius: RADIUS.full, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: RADIUS.full },
  extra: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  goalTick: { position: 'absolute', width: 2, height: 16, borderRadius: 1 },
  paceMarker: { position: 'absolute', width: 2, height: 16, borderRadius: 1, opacity: 0.55 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  status: { flex: 1, fontFamily: FONTS.bodyMedium, fontSize: 12.5, lineHeight: 17 },

  btns: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  btn: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  btnSquare: { width: 52 },
  btnWide: { flex: 1 },
  btnText: { fontFamily: FONTS.bodySemi, fontSize: 13.5, fontVariant: ['tabular-nums'] },
});
