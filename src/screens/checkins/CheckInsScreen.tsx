import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';

import { getCheckIns } from '../../services/member.service';
import { CheckIn, Meta } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatBadge } from '../../components/ui/StatBadge';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { useAuth } from '../../context/AuthContext';

/* ─── Helpers ─── */

const formatDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return '—'; }
};

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return '—'; }
};

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return '—'; }
};

const methodIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  MANUAL: 'hand-left-outline',
  QR: 'qr-code-outline',
  BIOMETRIC: 'finger-print-outline',
};

const getMethodColor = (colors: typeof DARK_COLORS | typeof LIGHT_COLORS) => ({
  MANUAL: colors.accent,
  QR: colors.primary,
  BIOMETRIC: colors.success,
} as Record<string, string>);

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

/* ─── Check-In Card ─── */

const CheckInCard: React.FC<{ item: CheckIn; index: number }> = ({ item, index }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const mColors = getMethodColor(colors);
  const color = mColors[item.method] ?? colors.primary;
  const isActive = !item.checkedOutAt;

  return (
    <StaggerItem index={index}>
      <GlassCard glowColor={isActive ? colors.success : color} style={s.card}>
        <View style={s.cardTop}>
          {/* Icon */}
          <View style={[s.iconBox, { backgroundColor: `${color}15` }]}>
            <Ionicons name={methodIcon[item.method] ?? 'enter-outline'} size={20} color={color} />
          </View>

          {/* Details */}
          <View style={s.details}>
            <Text style={[s.dateText, { color: colors.text }]}>{formatDate(item.checkedInAt)}</Text>
            <View style={s.timeRow}>
              <Ionicons name="enter-outline" size={13} color={colors.textMuted} />
              <Text style={[s.timeText, { color: colors.textSecondary }]}>{formatTime(item.checkedInAt)}</Text>
              {item.checkedOutAt && (
                <>
                  <Ionicons name="arrow-forward" size={11} color={colors.textMuted} style={{ marginHorizontal: 2 }} />
                  <Ionicons name="exit-outline" size={13} color={colors.textMuted} />
                  <Text style={[s.timeText, { color: colors.textSecondary }]}>{formatTime(item.checkedOutAt)}</Text>
                </>
              )}
            </View>
          </View>

          {/* Duration / Active badge */}
          <View style={s.rightCol}>
            {isActive ? (
              <View style={[s.activeBadge, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}25` }]}>
                <View style={[s.activeDot, { backgroundColor: colors.success }]} />
                <Text style={[s.activeText, { color: colors.success }]}>Active</Text>
              </View>
            ) : (
              <View style={s.durationBox}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={[s.durationText, { color: colors.text }]}>{duration(item.checkedInAt, item.checkedOutAt)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom bar: method pill */}
        <View style={[s.cardBottom, { borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
          <View style={[s.methodPill, { backgroundColor: `${color}10`, borderColor: `${color}20` }]}>
            <Ionicons name={methodIcon[item.method] ?? 'enter-outline'} size={12} color={color} />
            <Text style={[s.methodText, { color }]}>{item.method}</Text>
          </View>
        </View>
      </GlassCard>
    </StaggerItem>
  );
};

/* ─── Summary Header ─── */

const SummaryHeader: React.FC<{ total: number }> = ({ total }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <Animated.View entering={FadeInUp.duration(350)}>
      <GlassCard glowColor={colors.primary} style={s.summaryCard}>
        <View style={s.summaryRow}>
          <View style={[s.summaryIconWrap, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="fitness-outline" size={22} color={colors.primary} />
          </View>
          <View style={s.summaryInfo}>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Total Gym Visits</Text>
            <Text style={[s.summaryValue, { color: colors.text }]}>{total}</Text>
          </View>
          <View style={[s.summaryBadge, { backgroundColor: `${colors.success}12` }]}>
            <Ionicons name="trending-up" size={16} color={colors.success} />
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

/* ─── Main Screen ─── */

export const CheckInsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

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

  const ListHeader = () => (
    <View style={s.listHeader}>
      {/* Inline page title */}
      <Animated.View entering={FadeInUp.duration(350)} style={s.pageHeader}>
        <Text style={[s.pageTitle, { color: colors.text }]}>Check-ins</Text>
        <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>Your gym visit history</Text>
      </Animated.View>
      {meta ? <SummaryHeader total={meta.total} /> : null}
      {error ? (
        <EmptyState
          icon="warning-outline"
          title="Oops, something went wrong!"
          subtitle={error}
          actionLabel="Try Again"
          onAction={() => { setLoading(true); load(1).finally(() => setLoading(false)); }}
        />
      ) : null}
    </View>
  );

  return (
    <AnimatedScreen>
      <FlatList
        style={s.root}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110 }]}
        data={error ? [] : checkIns}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <CheckInCard item={item} index={index} />}
        ListHeaderComponent={<ListHeader />}
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
            <View style={s.footer}>
              <SkeletonLoader height={64} />
              <SkeletonLoader height={64} />
            </View>
          ) : meta?.hasNext ? (
            <TouchableOpacity style={s.loadMoreBtn} onPress={loadMore}>
              <Text style={[s.loadMoreText, { color: colors.primary }]}>Load more</Text>
            </TouchableOpacity>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />
    </AnimatedScreen>
  );
};

/* ─── Styles ─── */

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 14, gap: 12 },

  listHeader: { gap: 12 },
  pageHeader: { gap: 4, marginBottom: 2 },
  pageTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: FONT_SIZE.sm },

  // Summary
  summaryCard: { gap: 0 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  summaryIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryInfo: { flex: 1, gap: 2 },
  summaryLabel: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  summaryValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  summaryBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Card
  card: { gap: 0, paddingBottom: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconBox: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  details: { flex: 1, gap: 3 },
  dateText: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  timeText: { fontSize: FONT_SIZE.xs, fontWeight: '500' },

  rightCol: { alignItems: 'flex-end' },
  durationBox: { alignItems: 'center', gap: 2 },
  durationText: { fontSize: FONT_SIZE.sm, fontWeight: '800' },

  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4 },
  activeText: { fontSize: 11, fontWeight: '700' },

  cardBottom: {
    marginTop: SPACING.sm, marginHorizontal: -SPACING.md, paddingHorizontal: SPACING.md,
    paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth,
  },
  methodPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  methodText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Error
  errorBox: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  errorText: { fontSize: FONT_SIZE.sm, textAlign: 'center' },
  retryText: { fontSize: FONT_SIZE.sm, fontWeight: '700', marginTop: 4 },

  // Footer
  footer: { gap: SPACING.sm, marginTop: SPACING.sm },
  loadMoreBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  loadMoreText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
});
