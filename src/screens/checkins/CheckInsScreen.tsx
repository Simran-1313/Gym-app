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

import { getCheckIns } from '../../services/member.service';
import { CheckIn, Meta } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatBadge } from '../../components/ui/StatBadge';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { StaggerItem } from '../../components/ui/StaggerItem';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

const methodIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  MANUAL: 'hand-left-outline',
  QR: 'qr-code-outline',
  BIOMETRIC: 'finger-print-outline',
};

const methodColor: Record<string, string> = {
  MANUAL: COLORS.accent,
  QR: COLORS.primary,
  BIOMETRIC: COLORS.success,
};

const duration = (inTime: string, outTime: string | null): string => {
  if (!outTime) return 'In progress';
  const diff = new Date(outTime).getTime() - new Date(inTime).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const CheckInCard: React.FC<{ item: CheckIn; index: number }> = ({ item, index }) => {
  const color = methodColor[item.method] ?? COLORS.primary;
  return (
    <StaggerItem index={index}>
      <GlassCard glowColor={color} style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: `${color}22`, shadowColor: color }]}>
            <Ionicons name={methodIcon[item.method] ?? 'enter-outline'} size={22} color={color} />
          </View>
          <View style={styles.details}>
            <Text style={styles.inTime}>{formatDateTime(item.checkedInAt)}</Text>
            {item.checkedOutAt ? (
              <Text style={styles.outTime}>Out: {formatDateTime(item.checkedOutAt)}</Text>
            ) : (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>Currently inside</Text>
              </View>
            )}
            <StatBadge icon="finger-print-outline" label="Method" value={item.method} color={color} />
          </View>
        </View>
        <View style={styles.durationBox}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.durationText}>{duration(item.checkedInAt, item.checkedOutAt)}</Text>
        </View>
      </GlassCard>
    </StaggerItem>
  );
};

export const CheckInsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async (pg = 1) => {
    try {
      const result = await getCheckIns(pg);
      if (pg === 1) {
        setCheckIns(result.checkIns);
      } else {
        setCheckIns((prev) => [...prev, ...result.checkIns]);
      }
      setMeta(result.meta);
      setPage(pg);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    load(1).finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1);
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!meta?.hasNext || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1);
    setLoadingMore(false);
  }, [meta, loadingMore, load, page]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <AnimatedScreen>
      <FlatList
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 100 }]}
        data={checkIns}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <CheckInCard item={item} index={index} />}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="No check-ins yet"
            subtitle="Your gym visit history will appear here."
          />
        }
        ListHeaderComponent={
          meta ? (
            <GlassCard glowColor={COLORS.primary} style={styles.summary}>
              <StatBadge icon="stats-chart-outline" label="Total visits" value={String(meta.total)} color={COLORS.primary} />
            </GlassCard>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <SkeletonLoader height={64} />
              <SkeletonLoader height={64} />
            </View>
          ) : meta?.hasNext ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
              <Text style={styles.loadMoreText}>Load more</Text>
            </TouchableOpacity>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.sm },

  summary: { marginBottom: SPACING.sm },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  details: { flex: 1, gap: 6 },
  inTime: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  outTime: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  activeText: { color: COLORS.success, fontSize: FONT_SIZE.xs, fontWeight: '600' },

  durationBox: { alignItems: 'flex-end', gap: 2 },
  durationText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },

  footer: { gap: SPACING.sm, marginTop: SPACING.sm },
  loadMoreBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  loadMoreText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
});
