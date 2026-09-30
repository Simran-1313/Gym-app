import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { getCheckIns } from '../../services/member.service';
import { CheckIn, Meta } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { FONTS, RADIUS } from '../../config/theme';
import type { ThemeColors } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { StaggerItem } from '../../components/ui/StaggerItem';

/**
 * Ported from `#screen-checkins` in docs/UI_PROTOTYPE.html.
 *
 * Every number below is lifted from that file's stylesheet rather than
 * eyeballed: `.scroll` gutter 18, `.checkin-row` 14/15 padding with a 9px
 * rhythm, `.checkin-icon` 40×40 r12, `.checkin-name` 13.5/600,
 * `.checkin-meta` 11.5, `.checkin-badge` 9.5/700 pill, `.section-label`
 * 10.5/700 uppercase at .08em.
 */

/* ─── Prototype metrics ─── */

const GUTTER = 18; // .scroll { padding: 0 18px 18px }
const ROW_GAP = 9; // .checkin-row { margin-bottom: 9px }
/** rgba(teal, 0.14) — the accent wash behind `.checkin-icon` / `.checkin-badge`. */
const TEAL_WASH = '24';

/* ─── Helpers ─── */

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return '—'; }
};

/**
 * The prototype labels rows "Today", "Yesterday", "Mon", "Sun" — a relative
 * day for the last week, then a plain date. Anything older than a week reads
 * as a weekday name that could be any of several weeks.
 */
const relativeDay = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days > 1 && days < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return '—'; }
};

const duration = (inTime: string, outTime: string | null): string => {
  if (!outTime) return 'In progress';
  try {
    const diff = new Date(outTime).getTime() - new Date(inTime).getTime();
    if (isNaN(diff) || diff < 0) return '—';
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  } catch { return '—'; }
};

/** `.checkin-name` copy and glyph per check-in method, per the prototype rows. */
const METHOD: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  QR: { label: 'QR Check-In', icon: 'shield-checkmark-outline' },
  BIOMETRIC: { label: 'Biometric Scan', icon: 'finger-print-outline' },
  MANUAL: { label: 'Manual Check-In', icon: 'document-text-outline' },
};

/* ─── Section label (`.section-label`) ─── */

const SectionLabel: React.FC<{ children: string; colors: ThemeColors; first?: boolean }> = ({
  children,
  colors,
  first,
}) => (
  <Text style={[s.sectionLabel, { color: colors.textMuted }, first && s.sectionLabelFirst]}>
    {children}
  </Text>
);

/* ─── Check-in row (`.card.checkin-row`) ─── */

const CheckInRow: React.FC<{ item: CheckIn; index: number }> = ({ item, index }) => {
  const colors = useThemeColors();
  const method = METHOD[item.method] ?? { label: 'Check-In', icon: 'enter-outline' as const };
  const isActive = !item.checkedOutAt;

  // The prototype tints the icon for QR entries and keeps the rest neutral;
  // the badge only goes teal on the newest row (or a session still running).
  const iconTinted = item.method === 'QR';
  const badgeTinted = isActive || index === 0;

  const out = item.checkedOutAt;

  return (
    <StaggerItem index={index}>
      <GlassCard style={s.rowCard} innerStyle={s.rowInner}>
        <View
          style={[
            s.checkinIcon,
            { backgroundColor: iconTinted ? `${colors.primary}${TEAL_WASH}` : colors.inset },
          ]}
        >
          <Ionicons name={method.icon} size={17} color={iconTinted ? colors.primary : colors.text} />
        </View>

        <View style={s.rowCopy}>
          <Text style={[s.checkinName, { color: colors.text }]} numberOfLines={1}>
            {method.label}
          </Text>
          <Text style={[s.checkinMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {relativeDay(item.checkedInAt)} · {formatTime(item.checkedInAt)}
            {out ? ` – ${formatTime(out)}` : ''}
          </Text>
        </View>

        <View
          style={[
            s.checkinBadge,
            { backgroundColor: badgeTinted ? `${colors.primary}${TEAL_WASH}` : colors.inset },
          ]}
        >
          <Text
            style={[s.checkinBadgeText, { color: badgeTinted ? colors.primary : colors.textSecondary }]}
          >
            {isActive ? 'Active' : duration(item.checkedInAt, out)}
          </Text>
        </View>
      </GlassCard>
    </StaggerItem>
  );
};

/* ─── Summary tile (`.card.card-elevated`, the 42-visits header) ─── */

const SummaryCard: React.FC<{ total: number }> = ({ total }) => {
  const colors = useThemeColors();

  return (
    <Animated.View entering={FadeInUp.duration(350)}>
      <GlassCard elevated style={s.summaryCard} innerStyle={s.summaryInner}>
        <View style={[s.summaryIcon, { backgroundColor: `${colors.primary}${TEAL_WASH}` }]}>
          <Ionicons name="home-outline" size={22} color={colors.primary} />
        </View>
        <View>
          <Text style={[s.summaryValue, { color: colors.text }]}>{total}</Text>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Total visits</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

/** The prototype's dimmed shimmer row that trails the list while more loads. */
const SkeletonRow: React.FC = () => (
  <GlassCard style={s.skeletonCard} innerStyle={s.rowInner}>
    <SkeletonLoader height={40} style={s.skeletonIcon} />
    <View style={s.rowCopy}>
      <SkeletonLoader height={12} style={s.skeletonBarWide} />
      <SkeletonLoader height={9} style={s.skeletonBarNarrow} />
    </View>
  </GlassCard>
);

/* ─── Main Screen ─── */

export const CheckInsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(1); setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!meta?.hasNext || loadingMore) return;
    setLoadingMore(true); await load(page + 1); setLoadingMore(false);
  }, [meta, loadingMore, load, page]);

  if (loading) return <LoadingSpinner fullScreen />;

  const listHeader = (
    <View>
      {meta ? <SummaryCard total={meta.total} /> : null}
      {error ? (
        <EmptyState
          icon="warning-outline"
          title="Oops, something went wrong!"
          subtitle={error}
          actionLabel="Try Again"
          onAction={() => { setLoading(true); load(1).finally(() => setLoading(false)); }}
        />
      ) : checkIns.length > 0 ? (
        <SectionLabel colors={colors} first>Recent</SectionLabel>
      ) : null}
    </View>
  );

  return (
    <AnimatedScreen>
      <ScreenHeader title="Check-Ins" variant="large" />

      <FlatList
        style={s.root}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 110 }]}
        data={error ? [] : checkIns}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <CheckInRow item={item} index={index} />}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !error ? (
            <EmptyState
              icon="time-outline"
              title="No check-ins yet"
              subtitle="Your gym visit history will appear here once you check in."
            />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <SkeletonRow />
          ) : meta?.hasNext ? (
            <Pressable style={s.loadMoreBtn} onPress={loadMore}>
              <Text style={[s.loadMoreText, { color: colors.primary }]}>Load more</Text>
            </Pressable>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />
    </AnimatedScreen>
  );
};

/* ─── Styles (values from the prototype stylesheet) ─── */

const s = StyleSheet.create({
  root: { flex: 1 },
  // .scroll { padding: 0 18px 18px }
  content: { paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: GUTTER },

  // .section-label { font-size:10.5; weight:700; letter-spacing:.08em; margin:14px 2px 10px }
  sectionLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.84,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 10,
    marginHorizontal: 2,
  },
  sectionLabelFirst: { marginTop: 14 },

  // .card.card-elevated { padding:18px; margin-bottom:16px; gap:14px }
  summaryCard: { marginBottom: 16 },
  summaryInner: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: { fontSize: 22, fontFamily: FONTS.bodyExtra },
  summaryLabel: { fontSize: 11.5, fontFamily: FONTS.body, marginTop: 2 },

  // .checkin-row { gap:13px; padding:14px 15px; margin-bottom:9px }
  rowCard: { marginBottom: ROW_GAP },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  rowCopy: { flex: 1 },

  // .checkin-icon { 40×40; radius 12 }
  checkinIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkinName: { fontSize: 13.5, fontFamily: FONTS.bodySemi }, // .checkin-name
  checkinMeta: { fontSize: 11.5, fontFamily: FONTS.body, marginTop: 2 }, // .checkin-meta

  // .checkin-badge { 9.5/700; padding 4px 9px; radius 100; uppercase; .02em }
  checkinBadge: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: RADIUS.full,
  },
  checkinBadgeText: {
    fontSize: 9.5,
    fontFamily: FONTS.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.19,
  },

  // The trailing shimmer row sits at .55 opacity in the prototype.
  skeletonCard: { marginBottom: ROW_GAP, opacity: 0.55 },
  skeletonIcon: { width: 40, borderRadius: 12 },
  skeletonBarWide: { width: '60%', borderRadius: 6 },
  skeletonBarNarrow: { width: '40%', borderRadius: 6, marginTop: 6 },

  loadMoreBtn: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { fontSize: 12.5, fontFamily: FONTS.bodySemi },
});
