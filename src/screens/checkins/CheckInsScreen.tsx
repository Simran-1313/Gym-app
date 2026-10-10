import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { getCheckIns } from '../../services/member.service';
import { CheckIn, Meta } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useActivity } from '../../context/ActivityContext';
import { dayKey, startOfDay } from '../../utils/activity';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';

/**
 * Session history, Apple Fitness "Workouts" style: a three-up summary that
 * reads from the shared activity store (so it matches Home and Challenges),
 * then the paginated history grouped by day, one card per day.
 */

type Colors = ReturnType<typeof useThemeColors>;

/* ─── Row geometry ─── */

const TILE = 40;
const ROW_PAD_X = SPACING.md;
const ROW_GAP = 12;
/** Separators start where the row's text does, like a grouped iOS list. */
const SEPARATOR_INSET = ROW_PAD_X + TILE + ROW_GAP;

/* ─── Helpers ─── */

const METHOD: Record<CheckIn['method'], { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  QR: { label: 'QR check-in', icon: 'qr-code-outline' },
  BIOMETRIC: { label: 'Biometric', icon: 'finger-print-outline' },
  MANUAL: { label: 'Manual check-in', icon: 'hand-left-outline' },
};
const FALLBACK_METHOD = { label: 'Check-in', icon: 'enter-outline' as const };

const formatClock = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatMinutes = (mins: number) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const sessionMinutes = (ci: CheckIn): number | null => {
  if (!ci.checkedOutAt) return null;
  const diff = new Date(ci.checkedOutAt).getTime() - new Date(ci.checkedInAt).getTime();
  if (isNaN(diff) || diff < 0) return null;
  return Math.round(diff / 60000);
};

const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const days = Math.round((startOfDay(new Date()).getTime() - startOfDay(d).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
};

interface DayGroup {
  key: string;
  label: string;
  items: CheckIn[];
}

/** Groups in list order — the API returns newest first, so days stay ordered. */
const groupByDay = (checkIns: CheckIn[]): DayGroup[] => {
  const groups: DayGroup[] = [];
  const index = new Map<string, DayGroup>();
  for (const ci of checkIns) {
    const key = dayKey(ci.checkedInAt);
    let group = index.get(key);
    if (!group) {
      group = { key, label: dayLabel(ci.checkedInAt), items: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.items.push(ci);
  }
  return groups;
};

/* ─── Summary ─── */

const Stat: React.FC<{ value: string; label: string; colors: Colors }> = ({ value, label, colors }) => (
  <View style={s.stat}>
    <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const SummaryCard: React.FC<{ colors: Colors }> = ({ colors }) => {
  const { loaded, stats } = useActivity();
  const dash = '—';
  return (
    <GlassCard innerStyle={s.statsRow}>
      <Stat value={loaded ? String(stats.weeklyVisits) : dash} label="This week" colors={colors} />
      <View style={[s.statDivider, { backgroundColor: colors.cardBorder }]} />
      <Stat
        value={loaded ? formatMinutes(stats.weeklyMinutes) : dash}
        label="Active time"
        colors={colors}
      />
      <View style={[s.statDivider, { backgroundColor: colors.cardBorder }]} />
      <Stat value={loaded ? String(stats.streak.current) : dash} label="Day streak" colors={colors} />
    </GlassCard>
  );
};

/* ─── Session row ─── */

const SessionRow: React.FC<{ item: CheckIn; colors: Colors }> = ({ item, colors }) => {
  const method = METHOD[item.method] ?? FALLBACK_METHOD;
  const inProgress = !item.checkedOutAt;
  const mins = sessionMinutes(item);

  const time = inProgress
    ? `Since ${formatClock(item.checkedInAt)}`
    : `${formatClock(item.checkedInAt)} – ${formatClock(item.checkedOutAt as string)}`;

  return (
    <View style={s.row}>
      <View style={[s.tile, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={method.icon} size={19} color={colors.primary} />
      </View>

      <View style={s.rowCopy}>
        <Text style={[s.rowTitle, { color: colors.text }]} numberOfLines={1}>
          Gym session
        </Text>
        <Text style={[s.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {time} · {method.label}
        </Text>
      </View>

      {inProgress ? (
        <View style={[s.pill, { backgroundColor: `${colors.success}1F` }]}>
          <View style={[s.pillDot, { backgroundColor: colors.success }]} />
          <Text style={[s.pillText, { color: colors.success }]}>In progress</Text>
        </View>
      ) : (
        <Text style={[s.duration, { color: colors.text }]}>{mins != null ? formatMinutes(mins) : '—'}</Text>
      )}
    </View>
  );
};

const DaySection: React.FC<{ group: DayGroup; colors: Colors }> = ({ group, colors }) => (
  <View>
    <Text style={[s.sectionLabel, { color: colors.textMuted }]}>{group.label}</Text>
    <GlassCard noPadding>
      {group.items.map((ci, i) => (
        <View key={ci.id}>
          {i > 0 ? <View style={[s.separator, { backgroundColor: colors.cardBorder }]} /> : null}
          <SessionRow item={ci} colors={colors} />
        </View>
      ))}
    </GlassCard>
  </View>
);

/* ─── Loading skeleton: static shapes under a slow opacity breathe ─── */

const HistorySkeleton: React.FC<{ colors: Colors }> = ({ colors }) => {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);
  const breathe = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const block = { backgroundColor: colors.inset };

  return (
    <Animated.View style={[s.skeleton, breathe]}>
      <GlassCard innerStyle={s.statsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={s.stat}>
            <View style={[s.skelStatValue, block]} />
            <View style={[s.skelStatLabel, block]} />
          </View>
        ))}
      </GlassCard>
      <View>
        <View style={[s.skelSection, block]} />
        <GlassCard noPadding>
          {[0, 1, 2, 3].map((i) => (
            <View key={i}>
              {i > 0 ? <View style={[s.separator, { backgroundColor: colors.cardBorder }]} /> : null}
              <View style={s.row}>
                <View style={[s.tile, block]} />
                <View style={s.rowCopy}>
                  <View style={[s.skelLineWide, block]} />
                  <View style={[s.skelLineNarrow, block]} />
                </View>
                <View style={[s.skelDuration, block]} />
              </View>
            </View>
          ))}
        </GlassCard>
      </View>
    </Animated.View>
  );
};

/* ─── Main Screen ─── */

export const CheckInsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { refresh: refreshActivity } = useActivity();

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pg = 1) => {
    try {
      setError(null);
      const result = await getCheckIns(pg);
      if (pg === 1) { setCheckIns(result.checkIns); } else { setCheckIns((prev) => [...prev, ...result.checkIns]); }
      setMeta(result.meta);
      setPage(pg);
    } catch (err: unknown) {
      if (pg === 1) setError(err instanceof Error ? err.message : 'Failed to load check-ins');
    }
  }, []);

  useEffect(() => { load(1).finally(() => setLoading(false)); }, [load]);

  // The summary reads the shared store; reuse a recent load if one exists.
  useEffect(() => { refreshActivity().catch(() => {}); }, [refreshActivity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(1), refreshActivity(true).catch(() => {})]);
    setRefreshing(false);
  }, [load, refreshActivity]);

  const loadMore = useCallback(async () => {
    if (!meta?.hasNext || loadingMore) return;
    setLoadingMore(true); await load(page + 1); setLoadingMore(false);
  }, [meta, loadingMore, load, page]);

  const groups = useMemo(() => groupByDay(checkIns), [checkIns]);

  const retry = () => { setLoading(true); load(1).finally(() => setLoading(false)); };

  return (
    <AnimatedScreen>
      <ScreenHeader title="Check-Ins" variant="large" />

      {loading ? (
        <View style={[s.content, { paddingTop: SPACING.md }]}>
          <HistorySkeleton colors={colors} />
        </View>
      ) : (
        <FlatList
          style={s.root}
          contentContainerStyle={[s.content, { paddingTop: SPACING.md, paddingBottom: insets.bottom + 110 }]}
          data={error ? [] : groups}
          keyExtractor={(g) => g.key}
          renderItem={({ item }) => <DaySection group={item} colors={colors} />}
          ListHeaderComponent={<SummaryCard colors={colors} />}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            error ? (
              <EmptyState
                icon="warning-outline"
                title="Couldn't load your sessions"
                subtitle={error}
                actionLabel="Try Again"
                onAction={retry}
              />
            ) : (
              <EmptyState
                icon="time-outline"
                title="No sessions yet"
                subtitle="Your gym visits will appear here once you check in."
              />
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={s.footer} size="small" color={colors.textMuted} />
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </AnimatedScreen>
  );
};

/* ─── Styles ─── */

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.gutter, gap: SPACING.lg },

  /* Summary — same recipe as Challenges' stats row */
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...TYPOGRAPHY.metric, fontSize: 24, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: FONTS.body, fontSize: 11, marginTop: 3 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 30 },

  /* Day groups */
  sectionLabel: {
    fontFamily: FONTS.bodySemi,
    fontSize: 13,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: SEPARATOR_INSET },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    paddingHorizontal: ROW_PAD_X,
    paddingVertical: 12,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1 },
  rowTitle: { fontFamily: FONTS.bodySemi, fontSize: 15, letterSpacing: -0.1 },
  rowMeta: { fontFamily: FONTS.body, fontSize: 12.5, marginTop: 2, fontVariant: ['tabular-nums'] },
  duration: { fontFamily: FONTS.displaySemi, fontSize: 16, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: RADIUS.full,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: FONTS.bodySemi, fontSize: 11.5 },

  footer: { paddingVertical: SPACING.md },

  /* Skeleton */
  skeleton: { gap: SPACING.lg },
  skelStatValue: { width: 36, height: 22, borderRadius: 6 },
  skelStatLabel: { width: 52, height: 9, borderRadius: 4, marginTop: 7 },
  skelSection: { width: 70, height: 11, borderRadius: 4, marginBottom: SPACING.sm + 2, marginLeft: SPACING.xs },
  skelLineWide: { width: '55%', height: 12, borderRadius: 5 },
  skelLineNarrow: { width: '75%', height: 9, borderRadius: 4, marginTop: 7 },
  skelDuration: { width: 40, height: 14, borderRadius: 5 },
});
