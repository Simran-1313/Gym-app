import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, LayoutChangeEvent } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { getActivityAnalytics } from '../../services/activity.service';
import { AnalyticsDataPoint } from '../../types';
import { FONTS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AppleBarChart } from '../../components/ui/AppleBarChart';
import { RootStackParams } from '../../navigation/AppNavigator';

type Metric = 'CALORIES' | 'DURATION' | 'WATER';
type Period = 'HOURLY' | 'DAILY' | 'MONTHLY';

/** `.scroll{ padding:0 18px 18px }` */
const GUTTER = 18;

/**
 * Prototype's D/W/M/Y segmented control has no real yearly granularity in
 * this API — `getActivityAnalytics` only accepts HOURLY/DAILY/MONTHLY — so
 * this is a 3-way Day/Week/Month segment, not a 4th fabricated option.
 */
const SEGMENTS: { key: Period; label: string }[] = [
  { key: 'HOURLY', label: 'D' },
  { key: 'DAILY', label: 'W' },
  { key: 'MONTHLY', label: 'M' },
];

const PERIOD_CONTEXT: Record<Period, string> = {
  HOURLY: 'Today',
  DAILY: 'This week',
  MONTHLY: 'Last 6 months',
};

export const METRIC_TITLES: Record<Metric, string> = {
  CALORIES: 'Calories',
  DURATION: 'Active Minutes',
  WATER: 'Water',
};

const METRIC_META: Record<Metric, { color: string; about: string }> = {
  CALORIES: {
    color: '#F0B36B',
    about:
      "Your daily calorie burn reflects energy spent through workouts and everyday movement — useful for judging whether you're in a deficit or surplus for your goals.",
  },
  DURATION: {
    color: '#2DD4BF',
    about:
      'Active minutes track the time you spend in logged workouts and sessions — a measure of consistency and volume, not just intensity.',
  },
  WATER: {
    color: '#6BB8F0',
    about:
      'Staying hydrated supports recovery, performance, and everyday energy — logging your intake helps you build a consistent habit.',
  },
};

const sum = (points: AnalyticsDataPoint[]) => points.reduce((total, p) => total + p.value, 0);

/** Formats a real computed total next to the unit the API returned for it. */
const formatHeadline = (metric: Metric, total: number, unit: string): string => {
  if (metric === 'WATER' && total >= 1000 && /ml/i.test(unit)) {
    return `${(total / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })}L`;
  }
  const rounded = Math.round(total * 100) / 100;
  return `${rounded.toLocaleString('en-US')} ${unit}`;
};

type MetricDetailRoute = RouteProp<RootStackParams, 'MetricDetail'>;

export const MetricDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const colors = useThemeColors();
  const { params } = useRoute<MetricDetailRoute>();
  const metric = params.metric;
  const meta = METRIC_META[metric];

  const [period, setPeriod] = useState<Period>('HOURLY');
  const [chartPoints, setChartPoints] = useState<AnalyticsDataPoint[]>([]);
  const [chartUnit, setChartUnit] = useState('');
  const [weeklyPoints, setWeeklyPoints] = useState<AnalyticsDataPoint[]>([]);
  const [weeklyUnit, setWeeklyUnit] = useState('');
  const [loading, setLoading] = useState(true);

  const [segWidth, setSegWidth] = useState(0);
  const pillX = useSharedValue(0);
  const activeIndex = SEGMENTS.findIndex((s) => s.key === period);

  useEffect(() => {
    if (segWidth > 0) {
      pillX.value = withTiming((segWidth / SEGMENTS.length) * activeIndex, { duration: 220 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, segWidth]);

  const pillStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: pillX.value }],
      width: segWidth / SEGMENTS.length,
    }),
    [segWidth],
  );

  const onSegmentedLayout = (e: LayoutChangeEvent) => setSegWidth(e.nativeEvent.layout.width);

  // Chart + headline number always come from the same call, for the currently
  // selected segment — never mixed with a different source.
  const loadChart = useCallback(async (p: Period) => {
    try {
      const res = await getActivityAnalytics(metric, p);
      setChartPoints(res.points);
      setChartUnit(res.unit);
    } catch (err) {
      console.log('[MetricDetailScreen] chart load error:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric]);

  // The "7-day overview" strip is always week-scoped (DAILY), independent of
  // whichever segment the chart above is currently showing.
  const loadWeekly = useCallback(async () => {
    try {
      const res = await getActivityAnalytics(metric, 'DAILY');
      setWeeklyPoints(res.points);
      setWeeklyUnit(res.unit);
    } catch (err) {
      console.log('[MetricDetailScreen] weekly load error:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadChart(period), loadWeekly()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric]);

  useEffect(() => {
    loadChart(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const handleSegmentSelect = (p: Period) => {
    if (p === period) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPeriod(p);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const headlineTotal = sum(chartPoints);
  const headlineText = formatHeadline(metric, headlineTotal, chartUnit || '');

  const weeklyTotal = sum(weeklyPoints);
  const mostActive = weeklyPoints.reduce<AnalyticsDataPoint | null>(
    (best, p) => (!best || p.value > best.value ? p : best),
    null,
  );
  const leastActive = weeklyPoints.reduce<AnalyticsDataPoint | null>(
    (worst, p) => (!worst || p.value < worst.value ? p : worst),
    null,
  );

  return (
    <AnimatedScreen>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + 12, paddingBottom: insets.bottom + GUTTER },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* `.metric-num{ font-size:36px; font-weight:800 }` — headline block.
            Prototype's source-tag ("via Apple Health") is dropped entirely:
            this app has no wearable/HealthKit integration, so there is no
            real data source to attribute the number to. */}
        <View style={styles.headlineBlock}>
          <Text style={[styles.metricNum, { color: colors.text }]}>{headlineText}</Text>
          <Text style={[styles.metricContext, { color: colors.textMuted }]}>
            {PERIOD_CONTEXT[period]}
          </Text>
        </View>

        {/* `.segmented{ background:surface-2; border-radius:12; padding:4 }` */}
        <View
          onLayout={onSegmentedLayout}
          style={[styles.segmented, { backgroundColor: colors.inset }]}
        >
          {segWidth > 0 && (
            <Animated.View
              style={[styles.segPill, pillStyle, { backgroundColor: colors.surface }]}
            />
          )}
          {SEGMENTS.map((seg) => {
            const active = seg.key === period;
            return (
              <Pressable
                key={seg.key}
                style={styles.seg}
                onPress={() => handleSegmentSelect(seg.key)}
              >
                <Text
                  style={[
                    styles.segText,
                    { color: active ? colors.text : colors.textMuted },
                  ]}
                >
                  {seg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* `.chart-card{ padding:18px 16px 12px; margin:16px 0 }` — reuses the
            same bar chart the Activity dashboard's ANALYTICS card uses, so
            the visual language matches and the live re-draw when switching
            segments comes for free from its existing layout animation.
            The prototype's dual-line Today-vs-Yesterday comparison chart is
            not implemented: `getActivityAnalytics` returns one series for
            the requested period, with no previous-period series to compare
            against, and fabricating a second line would violate "preserve
            real data end to end". */}
        <GlassCard style={styles.chartCard} innerStyle={styles.chartCardInner}>
          <AppleBarChart metricType={metric} viewMode="DAILY" customData={chartPoints} />
        </GlassCard>

        {/* `.section-row{ margin:24px 2px 12px }`, overridden to 6px top here
            since the chart card above it already carries a 16px margin. */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionRowTitle, { color: colors.text }]}>7-day overview</Text>
        </View>

        {/* `.summary-strip{ display:grid; grid-template-columns:1fr 1fr 1fr; padding:16px 0 }` */}
        <GlassCard style={styles.summaryCard} innerStyle={styles.summaryInner}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatHeadline(metric, weeklyTotal, weeklyUnit || '')}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryDivider, { borderLeftColor: colors.cardBorder }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {mostActive?.displayValue ?? '—'}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Most active</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryDivider, { borderLeftColor: colors.cardBorder }]}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {leastActive?.displayValue ?? '—'}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Least active</Text>
          </View>
        </GlassCard>

        {/* `.about-block{ font-size:12.5px; line-height:1.65; padding:16px 2px 24px }` */}
        <Text style={[styles.aboutBlock, { color: colors.textMuted }]}>
          <Text style={[styles.aboutBold, { color: colors.text }]}>
            About {METRIC_TITLES[metric].toLowerCase()}.{' '}
          </Text>
          {meta.about}
        </Text>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER },

  headlineBlock: { marginTop: 12, marginHorizontal: 2, marginBottom: 4 },
  metricNum: {
    fontSize: 36,
    fontFamily: FONTS.displayExtra,
    fontVariant: ['tabular-nums'],
  },
  metricContext: {
    fontSize: 12.5,
    fontFamily: FONTS.bodyMedium,
    marginTop: 6,
  },

  segmented: {
    position: 'relative',
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
    marginBottom: 4,
  },
  segPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: 9,
  },
  seg: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    zIndex: 1,
  },
  segText: {
    fontSize: 12.5,
    fontFamily: FONTS.bodySemi,
  },

  chartCard: { marginVertical: 16 },
  chartCardInner: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 12 },

  sectionRow: {
    marginTop: 6,
    marginHorizontal: 2,
    marginBottom: 12,
  },
  sectionRowTitle: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
  },

  summaryCard: { marginBottom: 0 },
  summaryInner: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { borderLeftWidth: StyleSheet.hairlineWidth * 1.5 },
  summaryValue: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
  summaryLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bodyMedium,
    marginTop: 3,
  },

  aboutBlock: {
    fontSize: 12.5,
    lineHeight: 20.6,
    paddingTop: 16,
    paddingHorizontal: 2,
    paddingBottom: 24,
  },
  aboutBold: {
    fontFamily: FONTS.bodyBold,
  },
});
