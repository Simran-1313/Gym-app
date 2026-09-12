import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { useThemeColors } from '../../hooks/useThemeColors';
import { FONT_SIZE, FONTS, RADIUS, SPACING } from '../../config/theme';
import { getCheckIns } from '../../services/member.service';
import { CheckIn } from '../../types';

const GRID_DAYS = 35; // five weeks — matches what fits on screen without scrolling a second axis
const MILESTONES = [
  { days: 7, name: 'Bronze', icon: 'medal-outline' as const },
  { days: 14, name: 'Silver', icon: 'medal-outline' as const },
  { days: 30, name: 'Gold', icon: 'trophy-outline' as const },
  { days: 60, name: 'Platinum', icon: 'trophy' as const },
];
const MONTHLY_GOAL = 12; // sessions/month — a reasonable "3x/week" consistency target

const dayKey = (iso: string) => new Date(iso).toDateString();

/** Longest run of consecutive calendar days (ending today or yesterday) with at least one check-in. */
const computeStreaks = (checkIns: CheckIn[]) => {
  const daysWithVisit = new Set(checkIns.map((c) => dayKey(c.checkedInAt)));
  let current = 0;
  const cursor = new Date();
  // A missed *today* doesn't break a streak until the day is over — start from today, fall back to yesterday.
  if (!daysWithVisit.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (daysWithVisit.has(cursor.toDateString())) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Best streak within the loaded window (not lifetime — see fetch comment below).
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  const load = useCallback(async () => {
    try {
      // Best-effort recent-history window for the streak/contribution grid — not
      // full lifetime history, since there's no dedicated streak endpoint yet
      // (confirmed absent from the backend; see the engineering audit).
      const res = await getCheckIns(1, 90);
      setCheckIns(res.checkIns);
    } catch {
      setCheckIns([]);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

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

  return (
    <AnimatedScreen>
      <ScrollView
        style={s.root}
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110, paddingHorizontal: 16, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Animated.View entering={FadeInUp.duration(350)}>
          <Text style={[s.pageTitle, { color: colors.text }]}>Challenges</Text>
        </Animated.View>

        <StaggerItem index={0}>
          <GlassCard style={s.statsRow}>
            <Stat value={String(current)} label="Day streak" colors={colors} />
            <View style={[s.statDivider, { backgroundColor: colors.surfaceBorder }]} />
            <Stat value={String(best)} label="Best streak" colors={colors} />
            <View style={[s.statDivider, { backgroundColor: colors.surfaceBorder }]} />
            <Stat value={sessionsThisMonth >= MONTHLY_GOAL ? '🎯' : String(sessionsThisMonth)} label="This month" colors={colors} />
          </GlassCard>
        </StaggerItem>

        {nextMilestone ? (
          <StaggerItem index={1}>
            <GlassCard elevated glowColor={colors.warning} style={s.badgeHero}>
              <View style={s.badgeRow}>
                <View style={[s.badgeIcon, { backgroundColor: `${colors.warning}1F`, borderColor: `${colors.warning}4D` }]}>
                  <Ionicons name={nextMilestone.icon} size={24} color={colors.warning} />
                </View>
                <View>
                  <Text style={[s.badgeTitle, { color: colors.text }]}>{nextMilestone.name} Badge</Text>
                  <Text style={[s.badgeSub, { color: colors.textMuted }]}>
                    {nextMilestone.days - current} more {nextMilestone.days - current === 1 ? 'day' : 'days'} at this pace
                  </Text>
                </View>
              </View>
              <View style={[s.badgeTrack, { backgroundColor: colors.surface3 }]}>
                <View style={[s.badgeFill, { backgroundColor: colors.warning, width: `${Math.min(100, (current / nextMilestone.days) * 100)}%` }]} />
              </View>
            </GlassCard>
          </StaggerItem>
        ) : (
          <StaggerItem index={1}>
            <GlassCard elevated glowColor={colors.warning} style={s.badgeHero}>
              <View style={s.badgeRow}>
                <View style={[s.badgeIcon, { backgroundColor: `${colors.warning}1F`, borderColor: `${colors.warning}4D` }]}>
                  <Ionicons name="trophy" size={24} color={colors.warning} />
                </View>
                <View>
                  <Text style={[s.badgeTitle, { color: colors.text }]}>Platinum Streak</Text>
                  <Text style={[s.badgeSub, { color: colors.textMuted }]}>60+ days — every milestone unlocked</Text>
                </View>
              </View>
            </GlassCard>
          </StaggerItem>
        )}

        <StaggerItem index={2}>
          <GlassCard style={s.gridCard}>
            <Text style={[s.gridLabel, { color: colors.textMuted }]}>Last {GRID_DAYS} days</Text>
            <View style={s.grid}>
              {gridDays.map((d, i) => {
                const count = visitsByDay[d.toDateString()] ?? 0;
                const isToday = i === gridDays.length - 1;
                const bg = count === 0 ? colors.surface2 : count === 1 ? `${colors.primary}40` : count === 2 ? `${colors.primary}90` : colors.primary;
                return (
                  <View
                    key={d.toISOString()}
                    style={[
                      s.gridSq,
                      { backgroundColor: bg, borderColor: isToday ? colors.primary : 'transparent', borderWidth: isToday ? 2 : 0 },
                    ]}
                  />
                );
              })}
            </View>
          </GlassCard>
        </StaggerItem>

        <StaggerItem index={3}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>ACTIVE CHALLENGE</Text>
          <GlassCard style={s.challengeCard}>
            <View style={[s.challengeIcon, { backgroundColor: `${colors.primary}1F` }]}>
              <Ionicons name="barbell-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.challengeTitle, { color: colors.text }]}>Monthly Consistency</Text>
              <Text style={[s.challengeSub, { color: colors.textMuted }]}>
                {sessionsThisMonth} of {MONTHLY_GOAL} sessions this month
              </Text>
              <View style={[s.challengeTrack, { backgroundColor: colors.surface2 }]}>
                <View style={[s.challengeFill, { backgroundColor: colors.primary, width: `${monthlyProgress * 100}%` }]} />
              </View>
            </View>
          </GlassCard>
        </StaggerItem>
      </ScrollView>
    </AnimatedScreen>
  );
};

const Stat: React.FC<{ value: string; label: string; colors: ReturnType<typeof useThemeColors> }> = ({ value, label, colors }) => (
  <View style={s.stat}>
    <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1 },
  pageTitle: { fontSize: 26, fontFamily: FONTS.bodyExtra, letterSpacing: -0.5 },

  statsRow: { flexDirection: 'row', paddingVertical: 4 },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, height: '80%', alignSelf: 'center' },
  statValue: { fontSize: 18, fontFamily: FONTS.bodyExtra },
  statLabel: { fontSize: 10.5, marginTop: 3 },

  badgeHero: { gap: 0 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badgeIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badgeTitle: { fontSize: 15, fontFamily: FONTS.bodyExtra },
  badgeSub: { fontSize: 12, marginTop: 3 },
  badgeTrack: { height: 6, borderRadius: 10, overflow: 'hidden', marginTop: 16 },
  badgeFill: { height: '100%', borderRadius: 10 },

  gridCard: { gap: 10 },
  gridLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemi, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridSq: { width: '11.5%', aspectRatio: 1, borderRadius: 5 },

  sectionTitle: { fontSize: 11, fontFamily: FONTS.displayBold, letterSpacing: 0.8, marginBottom: SPACING.sm },
  challengeCard: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  challengeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  challengeTitle: { fontSize: 13.5, fontFamily: FONTS.bodyBold },
  challengeSub: { fontSize: 11.5, marginTop: 2 },
  challengeTrack: { height: 5, borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  challengeFill: { height: '100%', borderRadius: 10 },
});
