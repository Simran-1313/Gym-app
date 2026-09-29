import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { useThemeColors } from '../../hooks/useThemeColors';
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { getCheckIns } from '../../services/member.service';
import { CheckIn } from '../../types';

/** Five weeks of history — as many columns as fit at phone width without a second axis. */
const GRID_DAYS = 35;
const MONTHLY_GOAL = 12; // ~3 sessions/week

const MILESTONES = [
  { days: 7, name: 'Bronze', icon: 'medal-outline' as const },
  { days: 14, name: 'Silver', icon: 'medal-outline' as const },
  { days: 30, name: 'Gold', icon: 'trophy-outline' as const },
  { days: 60, name: 'Platinum', icon: 'trophy' as const },
];

const dayKey = (iso: string) => new Date(iso).toDateString();

/** Longest run of consecutive calendar days ending today (or yesterday, if today isn't logged yet). */
const computeStreaks = (checkIns: CheckIn[]) => {
  const daysWithVisit = new Set(checkIns.map((c) => dayKey(c.checkedInAt)));
  let current = 0;
  const cursor = new Date();
  // A missed *today* shouldn't break the streak until the day is actually over.
  if (!daysWithVisit.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (daysWithVisit.has(cursor.toDateString())) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sortedDays = [...daysWithVisit].map((d) => new Date(d).getTime()).sort((a, b) => a - b);
  let best = sortedDays.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const gapDays = Math.round((sortedDays[i] - sortedDays[i - 1]) / 86400000);
    run = gapDays === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best: Math.max(best, current) };
};

const visitCountByDay = (checkIns: CheckIn[]): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const c of checkIns) {
    const k = dayKey(c.checkedInAt);
    map[k] = (map[k] ?? 0) + 1;
  }
  return map;
};

export const ChallengesScreen: React.FC = () => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  const load = useCallback(async () => {
    try {
      // Best-effort recent window: there's no dedicated streak endpoint, so the
      // streak and grid are derived from check-in history on the client.
      const res = await getCheckIns(1, 90);
      setCheckIns(res.checkIns);
    } catch {
      setCheckIns([]);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) return <LoadingSpinner fullScreen />;

  const { current, best } = computeStreaks(checkIns);
  const visitsByDay = visitCountByDay(checkIns);
  const nextMilestone = MILESTONES.find((m) => m.days > current) ?? null;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const sessionsThisMonth = new Set(
    checkIns.filter((c) => new Date(c.checkedInAt) >= monthStart).map((c) => dayKey(c.checkedInAt)),
  ).size;
  const monthlyProgress = Math.min(1, sessionsThisMonth / MONTHLY_GOAL);

  const gridDays = Array.from({ length: GRID_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (GRID_DAYS - 1 - i));
    return d;
  });

  const badgeProgress = nextMilestone ? Math.min(1, current / nextMilestone.days) : 1;
  const daysToBadge = nextMilestone ? nextMilestone.days - current : 0;

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
        <StaggerItem index={0}>
          <GlassCard innerStyle={s.statsRow}>
            <Stat value={String(current)} label="Day streak" colors={colors} />
            <View style={[s.statDivider, { backgroundColor: colors.cardBorder }]} />
            <Stat value={String(best)} label="Best streak" colors={colors} />
            <View style={[s.statDivider, { backgroundColor: colors.cardBorder }]} />
            <Stat value={String(sessionsThisMonth)} label="This month" colors={colors} />
          </GlassCard>
        </StaggerItem>

        {/* ── Next badge. A warm, always-dark celebratory surface, like the
             prototype's .badge-hero — it reads as a trophy case, not a card. ── */}
        <Animated.View entering={FadeInUp.duration(340).delay(60)}>
          <LinearGradient
            colors={['#16130D', '#0D0C0A', '#08090A']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[s.badgeHero, { borderColor: `${colors.warning}2E` }]}
          >
            <View style={s.badgeRow}>
              <View style={[s.badgeIcon, { backgroundColor: `${colors.warning}24`, borderColor: `${colors.warning}4D` }]}>
                <Ionicons name={nextMilestone?.icon ?? 'trophy'} size={24} color={colors.warning} />
              </View>
              <View style={s.badgeCopy}>
                <Text style={s.badgeTitle}>
                  {nextMilestone ? `${nextMilestone.name} Badge` : 'Platinum Streak'}
                </Text>
                <Text style={s.badgeSub}>
                  {nextMilestone
                    ? `${daysToBadge} more ${daysToBadge === 1 ? 'day' : 'days'} at this pace`
                    : '60+ days — every milestone unlocked'}
                </Text>
              </View>
            </View>

            <View style={s.badgeTrack}>
              <LinearGradient
                colors={[colors.warning, '#FFD08A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.badgeFill, { width: `${Math.max(3, badgeProgress * 100)}%` }]}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Contribution grid: one square per day, tinted by session count ── */}
        <StaggerItem index={2}>
          <GlassCard>
            <Text style={[s.gridLabel, { color: colors.textMuted }]}>LAST {GRID_DAYS} DAYS</Text>
            <View style={s.grid}>
              {gridDays.map((d, i) => {
                const count = visitsByDay[d.toDateString()] ?? 0;
                const isToday = i === gridDays.length - 1;
                const bg =
                  count === 0
                    ? colors.inset
                    : count === 1
                      ? `${colors.primary}40`
                      : count === 2
                        ? `${colors.primary}99`
                        : colors.primary;
                return (
                  <View
                    key={d.toISOString()}
                    style={[
                      s.gridSq,
                      { backgroundColor: bg },
                      isToday && { borderWidth: 2, borderColor: colors.primary },
                    ]}
                  />
                );
              })}
            </View>
            <View style={s.legendRow}>
              <Text style={[s.legendText, { color: colors.textFaint }]}>Less</Text>
              {[colors.inset, `${colors.primary}40`, `${colors.primary}99`, colors.primary].map((c, i) => (
                <View key={i} style={[s.legendSq, { backgroundColor: c }]} />
              ))}
              <Text style={[s.legendText, { color: colors.textFaint }]}>More</Text>
            </View>
          </GlassCard>
        </StaggerItem>

        {/* ── Active challenges ── */}
        <View style={s.sectionRow}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Active challenges</Text>
        </View>

        <StaggerItem index={3}>
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
                <View style={[s.chFill, { backgroundColor: colors.primary, width: `${Math.max(2, monthlyProgress * 100)}%` }]} />
              </View>
            </View>
            <View style={[s.chBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[s.chBadgeText, { color: colors.primary }]}>
                {monthlyProgress >= 1 ? 'Done' : 'Active'}
              </Text>
            </View>
          </GlassCard>
        </StaggerItem>

        <StaggerItem index={4}>
          <GlassCard innerStyle={s.challengeRow}>
            <View style={[s.chIcon, { backgroundColor: `${colors.tint.energy}24` }]}>
              <Ionicons name="flame-outline" size={20} color={colors.tint.energy} />
            </View>
            <View style={s.chBody}>
              <Text style={[s.chTitle, { color: colors.text }]}>Keep the Streak</Text>
              <Text style={[s.chSub, { color: colors.textMuted }]}>
                {nextMilestone
                  ? `${current} of ${nextMilestone.days} days toward ${nextMilestone.name}`
                  : `${current} days and counting`}
              </Text>
              <View style={[s.chTrack, { backgroundColor: colors.inset }]}>
                <View style={[s.chFill, { backgroundColor: colors.tint.energy, width: `${Math.max(2, badgeProgress * 100)}%` }]} />
              </View>
            </View>
            <View style={[s.chBadge, { backgroundColor: `${colors.tint.energy}24` }]}>
              <Text style={[s.chBadgeText, { color: colors.tint.energy }]}>
                {current > 0 ? 'Active' : 'Start'}
              </Text>
            </View>
          </GlassCard>
        </StaggerItem>
      </ScrollView>
    </AnimatedScreen>
  );
};

const Stat: React.FC<{ value: string; label: string; colors: ReturnType<typeof useThemeColors> }> = ({
  value,
  label,
  colors,
}) => (
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

  /* Next badge */
  badgeHero: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgeCopy: { flex: 1 },
  // Always-dark surface, so this copy stays light in both themes.
  badgeTitle: { fontFamily: FONTS.displaySemi, fontSize: 16, color: '#FFFFFF', letterSpacing: -0.2 },
  badgeSub: { fontFamily: FONTS.body, fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  badgeTrack: {
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    marginTop: 16,
  },
  badgeFill: { height: '100%', borderRadius: RADIUS.full },

  /* Contribution grid */
  gridLabel: { fontFamily: FONTS.bodySemi, fontSize: 10.5, letterSpacing: 1.2, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridSq: { width: '11.6%', aspectRatio: 1, borderRadius: 5 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, justifyContent: 'flex-end' },
  legendSq: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontFamily: FONTS.body, fontSize: 10 },

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
  chFill: { height: '100%', borderRadius: RADIUS.full },
  chBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  chBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 10.5 },
});
