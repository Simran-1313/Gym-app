import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCheckIns } from '../../services/member.service';
import { CheckIn, Meta } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';

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

const duration = (inTime: string, outTime: string | null): string => {
  if (!outTime) return 'In progress';
  const diff = new Date(outTime).getTime() - new Date(inTime).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const CheckInCard: React.FC<{ item: CheckIn }> = ({ item }) => (
  <View style={styles.card}>
    <View style={styles.cardLeft}>
      <View style={styles.iconBox}>
        <Ionicons name={methodIcon[item.method] ?? 'enter-outline'} size={22} color={COLORS.primary} />
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
        <Text style={styles.method}>{item.method}</Text>
      </View>
    </View>
    <View style={styles.durationBox}>
      <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
      <Text style={styles.durationText}>{duration(item.checkedInAt, item.checkedOutAt)}</Text>
    </View>
  </View>
);

export const CheckInsScreen: React.FC = () => {
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
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={checkIns}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <CheckInCard item={item} />}
      ListEmptyComponent={
        <EmptyState
          icon="time-outline"
          title="No check-ins yet"
          subtitle="Your gym visit history will appear here."
        />
      }
      ListHeaderComponent={
        meta ? (
          <View style={styles.summary}>
            <Ionicons name="stats-chart-outline" size={16} color={COLORS.primary} />
            <Text style={styles.summaryText}>{meta.total} total visits</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
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
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  summaryText: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '600' },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1, gap: 4 },
  inTime: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  outTime: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  activeText: { color: COLORS.success, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  method: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, textTransform: 'uppercase', letterSpacing: 0.5 },

  durationBox: { alignItems: 'flex-end', gap: 2 },
  durationText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },

  loader: { marginVertical: SPACING.md },
  loadMoreBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  loadMoreText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
});
