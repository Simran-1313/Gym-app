import React, { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useThemeColors } from '../../hooks/useThemeColors';
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { useActivity } from '../../context/ActivityContext';
import {
  STREAK_MILESTONES,
  StreakMilestone,
  dayKey,
  nextMilestone,
  startOfDay,
  visitCountByDay,
} from '../../utils/activity';

type Colors = ReturnType<typeof useThemeColors>;

const MONTHLY_GOAL = 12; // ~3 sessions/week

/* Contribution graph geometry. Thirteen weeks is a quarter — the window the
   shared store loads (90 days) — laid out GitHub-style: one column per week,
   one row per weekday, Monday on top. */
const GRAPH_WEEKS = 13;
const TILE_GAP = 3;
const DAY_LABEL_W = 16;
const DAY_LABELS = ['M', '', 'W', '', 'F', '', ''];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Glyph per rung of the ladder: medals for the early rungs, trophies after. */
const MILESTONE_ICON: Record<StreakMilestone['name'], keyof typeof Ionicons.glyphMap> = {
  Bronze: 'medal-outline',
  Silver: 'medal',
  Gold: 'trophy-outline',
  Platinum: 'trophy',
};

const formatDate = (d: Date) =>
  d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export const ChallengesScreen: React.FC = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { loaded, checkIns, refresh, stats } = useActivity();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh(true);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const { current, best } = stats.streak;
  const visitsByDay = useMemo(() => visitCountByDay(checkIns), [checkIns]);

  const sessionsThisMonth = useMemo(() => {
    const monthStart = startOfDay(new Date());
    monthStart.setDate(1);
    return new Set(
      checkIns
        .filter((c) => new Date(c.checkedInAt) >= monthStart)
        .map((c) => dayKey(c.checkedInAt)),
    ).size;
  }, [checkIns]);

  if (!loaded) return <LoadingSpinner fullScreen />;

  const monthlyProgress = Math.min(1, sessionsThisMonth / MONTHLY_GOAL);

  // Badges are earned on the best run ever (a badge, once won, stays won);
  // the next rung is the first one not yet earned, paced by the current run.
  const target = STREAK_MILESTONES.find((m) => best < m.days) ?? null;
  const targetProgress = target ? Math.min(1, current / target.days) : 1;
  const daysToTarget = target ? Math.max(0, target.days - current) : 0;
  const streakGoal = nextMilestone(current);
  const streakProgress = streakGoal ? Math.min(1, current / streakGoal.days) : 1;

  return (
    <AnimatedScreen>
      <ScreenHeader
        title="Challenges"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <ScrollView
        style={s.root}
        contentContainerStyle={[
          s.content,
          { paddingTop: SPACING.md, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Streak stats: three columns split by hairline rules ── */}
        <GlassCard innerStyle={s.statsRow}>
          <Stat value={String(current)} label="Day streak" colors={colors} />
          <View style={[s.statDivider, { backgroundColor: colors.cardBorder }]} />
          <Stat value={String(best)} label="Best streak" colors={colors} />
          <View style={[s.statDivider, { backgroundColor: colors.cardBorder }]} />
          <Stat value={String(sessionsThisMonth)} label="This month" colors={colors} />
        </GlassCard>

        {/* ── Streak badges: the whole ladder, so what's next is always visible ── */}
        <GlassCard>
          <View style={s.cardHead}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Streak badges</Text>
            <Text style={[s.cardMeta, { color: colors.textMuted }]}>
              {STREAK_MILESTONES.filter((m) => best >= m.days).length} of {STREAK_MILESTONES.length}
            </Text>
          </View>

          <View style={s.ladder}>
            {STREAK_MILESTONES.map((m) => {
              const state = best >= m.days ? 'earned' : m === target ? 'next' : 'locked';
              return (
                <BadgeMedallion
                  key={m.name}
                  milestone={m}
                  state={state}
                  progress={state === 'next' ? targetProgress : 0}
                  daysToGo={state === 'next' ? daysToTarget : 0}
                  colors={colors}
                />
              );
            })}
          </View>

          <View style={[s.rule, { backgroundColor: colors.cardBorder }]} />

          <View style={s.nextRow}>
            <Text style={[s.nextTitle, { color: colors.text }]}>
              {target ? `Next: ${target.name}` : 'Every badge unlocked'}
            </Text>
            <Text style={[s.nextMeta, { color: colors.textMuted }]}>
              {target ? `${current} / ${target.days} days` : `${best}-day best`}
            </Text>
          </View>
          <View style={[s.track, { backgroundColor: colors.inset }]}>
            <View
              style={[
                s.fill,
                { backgroundColor: colors.primary, width: `${Math.max(2, targetProgress * 100)}%` },
              ]}
            />
          </View>
          <Text style={[s.nextSub, { color: colors.textSecondary }]}>
            {target
              ? current === 0
                ? `Check in today to start a run toward ${target.name}.`
                : `${daysToTarget} more ${daysToTarget === 1 ? 'day' : 'days'} in a row to earn ${target.name}.`
              : `You've held a ${STREAK_MILESTONES[STREAK_MILESTONES.length - 1].days}+ day streak.`}
          </Text>
        </GlassCard>

        {/* ── Contribution graph ── */}
        <ContributionGraph visitsByDay={visitsByDay} colors={colors} />

        {/* ── Active challenges ── */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Active challenges</Text>
        </View>

        <GlassCard innerStyle={s.challengeRow}>
          <View style={[s.chIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="barbell-outline" size={20} color={colors.primary} />
          </View>
          <View style={s.chBody}>
            <Text style={[s.chTitle, { color: colors.text }]}>Monthly Consistency</Text>
            <Text style={[s.chSub, { color: colors.textMuted }]}>
              {sessionsThisMonth} of {MONTHLY_GOAL} sessions this month
            </Text>
            <View style={[s.chTrack, { backgroundColor: colors.inset }]}>
              <View
                style={[
                  s.fill,
                  { backgroundColor: colors.primary, width: `${Math.max(2, monthlyProgress * 100)}%` },
                ]}
              />
            </View>
          </View>
          <View style={[s.chBadge, { backgroundColor: colors.primarySoft }]}>
            <Text style={[s.chBadgeText, { color: colors.primary }]}>
              {monthlyProgress >= 1 ? 'Done' : 'Active'}
            </Text>
          </View>
        </GlassCard>

        <GlassCard innerStyle={s.challengeRow}>
          <View style={[s.chIcon, { backgroundColor: `${colors.tint.energy}24` }]}>
            <Ionicons name="flame-outline" size={20} color={colors.tint.energy} />
          </View>
          <View style={s.chBody}>
            <Text style={[s.chTitle, { color: colors.text }]}>Keep the Streak</Text>
            <Text style={[s.chSub, { color: colors.textMuted }]}>
              {streakGoal
                ? `${current} of ${streakGoal.days} days toward ${streakGoal.name}`
                : `${current} days and counting`}
            </Text>
            <View style={[s.chTrack, { backgroundColor: colors.inset }]}>
              <View
                style={[
                  s.fill,
                  { backgroundColor: colors.tint.energy, width: `${Math.max(2, streakProgress * 100)}%` },
                ]}
              />
            </View>
          </View>
          <View style={[s.chBadge, { backgroundColor: `${colors.tint.energy}24` }]}>
            <Text style={[s.chBadgeText, { color: colors.tint.energy }]}>
              {current > 0 ? 'Active' : 'Start'}
            </Text>
          </View>
        </GlassCard>
      </ScrollView>
    </AnimatedScreen>
  );
};

/* ─────────────────────────── Badge medallion ─────────────────────────── */

const MEDAL = 52;
const RING_STROKE = 3;

const BadgeMedallion: React.FC<{
  milestone: StreakMilestone;
  state: 'earned' | 'next' | 'locked';
  progress: number;
  daysToGo: number;
  colors: Colors;
}> = ({ milestone, state, progress, daysToGo, colors }) => {
  const icon = MILESTONE_ICON[milestone.name];
  const r = (MEDAL - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;

  let caption: string;
  if (state === 'earned') caption = 'Earned';
  else if (state === 'next') caption = `${daysToGo} ${daysToGo === 1 ? 'day' : 'days'} to go`;
  else caption = `${milestone.days} days`;

  return (
    <View
      style={s.medalCol}
      accessible
      accessibilityLabel={`${milestone.name} badge, ${milestone.days}-day streak. ${caption}.`}
    >
      <View style={s.medalWrap}>
        {state === 'earned' && (
          <View style={[s.medal, { backgroundColor: colors.primarySolid }]}>
            <Ionicons name={icon} size={22} color="#FFFFFF" />
          </View>
        )}

        {state === 'next' && (
          <View style={[s.medal, { backgroundColor: colors.primarySoft }]}>
            <Svg width={MEDAL} height={MEDAL} style={StyleSheet.absoluteFill}>
              <Circle
                cx={MEDAL / 2}
                cy={MEDAL / 2}
                r={r}
                stroke={colors.inset}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={MEDAL / 2}
                cy={MEDAL / 2}
                r={r}
                stroke={colors.primary}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - Math.max(0.02, progress))}
                fill="none"
                transform={`rotate(-90 ${MEDAL / 2} ${MEDAL / 2})`}
              />
            </Svg>
            <Ionicons name={icon} size={22} color={colors.primary} />
          </View>
        )}

        {state === 'locked' && (
          <View
            style={[
              s.medal,
              { backgroundColor: colors.inset, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.cardBorder },
            ]}
          >
            <Ionicons name={icon} size={22} color={colors.textFaint} />
            <View
              style={[
                s.lockPip,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.cardBorder },
              ]}
            >
              <Ionicons name="lock-closed" size={9} color={colors.textMuted} />
            </View>
          </View>
        )}
      </View>

      <Text
        style={[s.medalName, { color: state === 'locked' ? colors.textMuted : colors.text }]}
        numberOfLines={1}
      >
        {milestone.name}
      </Text>
      <Text
        style={[s.medalCaption, { color: state === 'next' ? colors.primary : colors.textFaint }]}
        numberOfLines={1}
      >
        {caption}
      </Text>
    </View>
  );
};

/* ───────────────────────── Contribution graph ───────────────────────── */

const ContributionGraph: React.FC<{ visitsByDay: Record<string, number>; colors: Colors }> = ({
  visitsByDay,
  colors,
}) => {
  const [gridWidth, setGridWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    setGridWidth((prev) => (prev === w ? prev : w));
  }, []);

  const { weeks, today, activeDays } = useMemo(() => {
    const todayStart = startOfDay(new Date());
    // Monday of the current week (getDay: Sun=0 … Sat=6).
    const mondayOffset = (todayStart.getDay() + 6) % 7;
    const firstMonday = new Date(todayStart);
    firstMonday.setDate(todayStart.getDate() - mondayOffset - (GRAPH_WEEKS - 1) * 7);

    let active = 0;
    const cols: { days: (Date | null)[]; monthLabel: string | null }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < GRAPH_WEEKS; w++) {
      const days: (Date | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(firstMonday);
        date.setDate(firstMonday.getDate() + w * 7 + d);
        if (date.getTime() > todayStart.getTime()) {
          days.push(null); // future — no tile at all
        } else {
          days.push(date);
          if ((visitsByDay[date.toDateString()] ?? 0) > 0) active += 1;
        }
      }
      // Label a column when it's the first to show a new month (by its Monday).
      const month = (days[0] as Date).getMonth();
      cols.push({ days, monthLabel: month !== lastMonth ? MONTHS[month] : null });
      lastMonth = month;
    }
    // The very first column always gets a label; drop it if the next column
    // labels a new month too, so two names never collide.
    if (cols.length > 1 && cols[1].monthLabel) cols[0].monthLabel = null;
    return { weeks: cols, today: todayStart, activeDays: active };
  }, [visitsByDay]);

  const tile = gridWidth > 0 ? Math.floor((gridWidth - TILE_GAP * (GRAPH_WEEKS - 1)) / GRAPH_WEEKS) : 0;
  const levels = [colors.inset, `${colors.primary}40`, `${colors.primary}73`, `${colors.primary}B3`, colors.primary];
  const levelFor = (count: number) => levels[Math.min(4, count)];

  const selectedDate = selected ? new Date(selected) : null;
  const selectedCount = selected ? visitsByDay[selected] ?? 0 : 0;

  return (
    <GlassCard>
      <View style={s.cardHead}>
        <Text style={[s.cardTitle, { color: colors.text }]}>Check-in history</Text>
        <Text style={[s.cardMeta, { color: colors.textMuted }]}>Last {GRAPH_WEEKS} weeks</Text>
      </View>

      <View style={s.graphRow}>
        {/* Weekday labels, offset by the month-label row */}
        <View style={{ width: DAY_LABEL_W, paddingTop: 16 }}>
          {DAY_LABELS.map((l, i) => (
            <View key={i} style={{ height: tile || 14, marginBottom: i < 6 ? TILE_GAP : 0, justifyContent: 'center' }}>
              <Text style={[s.axisText, { color: colors.textFaint }]}>{l}</Text>
            </View>
          ))}
        </View>

        <View style={s.graphBody} onLayout={onLayout}>
          {tile > 0 && (
            <>
              <View style={[s.monthRow, { gap: TILE_GAP }]}>
                {weeks.map((wk, i) => (
                  <View key={i} style={{ width: tile }}>
                    {wk.monthLabel && (
                      <Text style={[s.axisText, s.monthText, { color: colors.textMuted }]} numberOfLines={1}>
                        {wk.monthLabel}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: TILE_GAP }}>
                {weeks.map((wk, wi) => (
                  <View key={wi} style={{ gap: TILE_GAP }}>
                    {wk.days.map((date, di) => {
                      if (!date) return <View key={di} style={{ width: tile, height: tile }} />;
                      const key = date.toDateString();
                      const count = visitsByDay[key] ?? 0;
                      const isToday = date.getTime() === today.getTime();
                      const isSelected = key === selected;
                      return (
                        <Pressable
                          key={di}
                          onPress={() => setSelected((prev) => (prev === key ? null : key))}
                          hitSlop={1}
                          accessibilityRole="button"
                          accessibilityLabel={`${formatDate(date)}: ${count} ${count === 1 ? 'check-in' : 'check-ins'}`}
                          style={[
                            s.tile,
                            {
                              width: tile,
                              height: tile,
                              backgroundColor: levelFor(count),
                              borderColor: count === 0 ? colors.cardBorder : 'transparent',
                            },
                            (isToday || isSelected) && {
                              borderWidth: 1.5,
                              borderColor: isSelected ? colors.text : colors.primary,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      <View style={s.graphFoot}>
        <Text style={[s.caption, { color: colors.textSecondary }]} numberOfLines={1}>
          {selectedDate
            ? `${formatDate(selectedDate)} · ${selectedCount === 0 ? 'No check-ins' : `${selectedCount} ${selectedCount === 1 ? 'check-in' : 'check-ins'}`}`
            : `${activeDays} active ${activeDays === 1 ? 'day' : 'days'} in the last ${GRAPH_WEEKS} weeks`}
        </Text>
        <View style={s.legendRow}>
          <Text style={[s.legendText, { color: colors.textFaint }]}>Less</Text>
          {levels.map((c, i) => (
            <View
              key={i}
              style={[
                s.legendSq,
                { backgroundColor: c },
                i === 0 && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.cardBorder },
              ]}
            />
          ))}
          <Text style={[s.legendText, { color: colors.textFaint }]}>More</Text>
        </View>
      </View>
    </GlassCard>
  );
};

const Stat: React.FC<{ value: string; label: string; colors: Colors }> = ({ value, label, colors }) => (
  <View style={s.stat}>
    <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.gutter, gap: SPACING.md },

  /* Streak stats — the row lives on GlassCard's innerStyle, since the card
     wraps its children in a padded View of its own. */
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...TYPOGRAPHY.metric, fontSize: 24 },
  statLabel: { fontFamily: FONTS.body, fontSize: 11, marginTop: 3 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 30 },

  /* Card heading shared by the badge and history cards */
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  cardTitle: { fontFamily: FONTS.bodySemi, fontSize: 14 },
  cardMeta: { fontFamily: FONTS.body, fontSize: 12 },

  /* Badge ladder */
  ladder: { flexDirection: 'row', justifyContent: 'space-between' },
  medalCol: { flex: 1, alignItems: 'center' },
  medalWrap: { width: MEDAL, height: MEDAL },
  medal: {
    width: MEDAL,
    height: MEDAL,
    borderRadius: MEDAL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockPip: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalName: { fontFamily: FONTS.bodySemi, fontSize: 12, marginTop: 8 },
  medalCaption: { fontFamily: FONTS.body, fontSize: 10.5, marginTop: 2 },

  rule: { height: StyleSheet.hairlineWidth, marginVertical: SPACING.md },
  nextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nextTitle: { fontFamily: FONTS.bodySemi, fontSize: 13 },
  nextMeta: { fontFamily: FONTS.body, fontSize: 12 },
  nextSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 8 },
  track: { height: 6, borderRadius: RADIUS.full, overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', borderRadius: RADIUS.full },

  /* Contribution graph */
  graphRow: { flexDirection: 'row', gap: 4 },
  graphBody: { flex: 1 },
  monthRow: { flexDirection: 'row', height: 16, overflow: 'visible' },
  monthText: { width: 32, position: 'absolute', left: 0, top: 0 },
  axisText: { fontFamily: FONTS.body, fontSize: 10 },
  tile: { borderRadius: 3, borderWidth: StyleSheet.hairlineWidth },
  graphFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: 12,
  },
  caption: { fontFamily: FONTS.body, fontSize: 11.5, flexShrink: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSq: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontFamily: FONTS.body, fontSize: 10, marginHorizontal: 2 },

  /* Section heading */
  sectionRow: { marginTop: SPACING.xs },
  sectionTitle: { ...TYPOGRAPHY.heading, fontSize: 16 },

  /* Challenge rows */
  challengeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  chIcon: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  chBody: { flex: 1 },
  chTitle: { fontFamily: FONTS.bodySemi, fontSize: 14 },
  chSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  chTrack: { height: 5, borderRadius: RADIUS.full, overflow: 'hidden', marginTop: 9 },
  chBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  chBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 10.5 },
});
