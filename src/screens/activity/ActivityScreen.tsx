import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { getCheckIns } from '../../services/member.service';
import { CheckIn } from '../../types';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AppleActivityRings } from '../../components/ui/AppleActivityRings';
import { AppleBarChart } from '../../components/ui/AppleBarChart';
import { useAuth } from '../../context/AuthContext';

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const hasCheckedInOnDay = (checkIns: CheckIn[], dayIndex: number): boolean => {
  const targetDay = dayIndex === 6 ? 0 : dayIndex + 1;
  const now = new Date();
  
  return checkIns.some((ci) => {
    const ciDate = new Date(ci.checkedInAt);
    const isSameWeek = now.getTime() - ciDate.getTime() < 7 * 24 * 60 * 60 * 1000;
    return isSameWeek && ciDate.getDay() === targetDay;
  });
};

// Calculate total workout minutes from check-ins
const calcTotalMinutes = (checkIns: CheckIn[]): number => {
  return checkIns.reduce((total, ci) => {
    if (!ci.checkedOutAt) return total + 45; // assume 45 min if still active
    const diff = new Date(ci.checkedOutAt).getTime() - new Date(ci.checkedInAt).getTime();
    return total + Math.round(diff / 60000);
  }, 0);
};

// Estimate calories burned (rough: ~8 kcal per minute of gym exercise)
const estimateCalories = (totalMinutes: number): number => {
  return Math.round(totalMinutes * 8);
};

export const ActivityScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  // Segment states for interactive chart
  const [activeMetric, setActiveMetric] = useState<'CALORIES' | 'DURATION' | 'WATER'>('CALORIES');
  const [viewMode, setViewMode] = useState<'HOURLY' | 'DAILY' | 'MONTHLY'>('DAILY');

  useEffect(() => {
    getCheckIns(1, 15)
      .then((res) => setCheckIns(res.checkIns))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullScreen />;

  const weeklyCheckIns = checkIns.filter(
    (ci) => Date.now() - new Date(ci.checkedInAt).getTime() < 7 * 24 * 60 * 60 * 1000
  );
  const weeklyVisits = weeklyCheckIns.length;

  // Calculate real data from check-ins
  const totalMinutes = calcTotalMinutes(weeklyCheckIns);
  const totalCalories = estimateCalories(totalMinutes);
  const exerciseGoal = 300; // 300 min / week
  const calorieGoal = 2400; // weekly calorie burn goal

  // Ring progress values from real data
  const moveProgress = Math.min(1, totalCalories / calorieGoal);
  const exerciseProgress = Math.min(1, totalMinutes / exerciseGoal);
  const hydrationProgress = 0.42; // placeholder — would come from water tracker

  const handleMetricSelect = (metric: typeof activeMetric) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveMetric(metric);
  };

  const handleSegmentSelect = (mode: typeof viewMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setViewMode(mode);
  };

  return (
    <AnimatedScreen>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Apple fitness rings dashboard */}
        <GlassCard glowColor={colors.primary} style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>ACTIVITY OVERVIEW</Text>
          <View style={styles.healthDashboardRow}>
            <AppleActivityRings
              moveProgress={moveProgress}
              exerciseProgress={exerciseProgress}
              standProgress={hydrationProgress}
              size={110}
            />
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF1243' }]} />
                <View>
                  <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Move</Text>
                  <Text style={[styles.legendValue, { color: colors.text }]}>{totalCalories} / {calorieGoal} kcal</Text>
                </View>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#00E676' }]} />
                <View>
                  <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Exercise</Text>
                  <Text style={[styles.legendValue, { color: colors.text }]}>{totalMinutes} / {exerciseGoal} min</Text>
                </View>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#00B0FF' }]} />
                <View>
                  <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Hydration</Text>
                  <Text style={[styles.legendValue, { color: colors.text }]}>1.25 / 3.0 L</Text>
                </View>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Segmented metrics grid (Tappable cards) */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>SELECT METRIC TO ANALYSE</Text>
        <View style={styles.metricsGrid}>
          <Pressable
            onPress={() => handleMetricSelect('CALORIES')}
            style={styles.metricCardWrapper}
          >
            <GlassCard
              glowColor={activeMetric === 'CALORIES' ? '#FF1243' : undefined}
              style={[
                styles.metricCard,
                activeMetric === 'CALORIES' && {
                  borderColor: '#FF124355',
                }
              ]}
            >
              <Ionicons
                name="flame"
                size={18}
                color={activeMetric === 'CALORIES' ? '#FF1243' : colors.textMuted}
              />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Move</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{totalCalories} kcal</Text>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={() => handleMetricSelect('DURATION')}
            style={styles.metricCardWrapper}
          >
            <GlassCard
              glowColor={activeMetric === 'DURATION' ? '#00E676' : undefined}
              style={[
                styles.metricCard,
                activeMetric === 'DURATION' && {
                  borderColor: '#00E67655',
                }
              ]}
            >
              <Ionicons
                name="time"
                size={18}
                color={activeMetric === 'DURATION' ? '#00E676' : colors.textMuted}
              />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Exercise</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{totalMinutes} mins</Text>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={() => handleMetricSelect('WATER')}
            style={styles.metricCardWrapper}
          >
            <GlassCard
              glowColor={activeMetric === 'WATER' ? '#00B0FF' : undefined}
              style={[
                styles.metricCard,
                activeMetric === 'WATER' && {
                  borderColor: '#00B0FF55',
                }
              ]}
            >
              <Ionicons
                name="water"
                size={18}
                color={activeMetric === 'WATER' ? '#00B0FF' : colors.textMuted}
              />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Hydration</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>1.25 L</Text>
            </GlassCard>
          </Pressable>
        </View>

        {/* Detailed Graph View Panel */}
        <GlassCard
          glowColor={
            activeMetric === 'CALORIES' ? '#FF124322' : activeMetric === 'DURATION' ? '#00E67622' : '#00B0FF22'
          }
          style={styles.graphPanel}
        >
          {/* Chart Segment Selectors */}
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>
              {activeMetric === 'CALORIES' ? 'CALORIES DETAILS' : activeMetric === 'DURATION' ? 'EXERCISE DETAILS' : 'HYDRATION DETAILS'}
            </Text>
            <View style={[styles.segmentControl, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
              {(['HOURLY', 'DAILY', 'MONTHLY'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => handleSegmentSelect(mode)}
                  style={[
                    styles.segmentBtn,
                    viewMode === mode && { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }
                  ]}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: viewMode === mode ? colors.text : colors.textMuted }
                  ]}>
                    {mode.slice(0, 1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Interactive Bar Chart */}
          <AppleBarChart metricType={activeMetric} viewMode={viewMode} />
        </GlassCard>

        {/* Weekly Check-Ins status */}
        <GlassCard glowColor={colors.primary} style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>WEEKLY CHECK-IN STATUS</Text>
          <Text style={[styles.streakText, { color: colors.text }]}>
            You checked in <Text style={[styles.highlight, { color: colors.primary }]}>{weeklyVisits} times</Text> this week!
          </Text>
          <View style={styles.weekContainer}>
            {DAYS_OF_WEEK.map((day, index) => {
              const active = hasCheckedInOnDay(checkIns, index);
              return (
                <View key={index} style={styles.dayCol}>
                  <View style={[
                    styles.dayDot,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                    active && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    }
                  ]}>
                    {active ? (
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    ) : (
                      <Text style={[styles.dayDotText, { color: colors.textMuted }]}>{day}</Text>
                    )}
                  </View>
                  <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{day}</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        {/* Workout Completion Summary */}
        <GlassCard glowColor={colors.info} style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>WORKOUT METRICS SUMMARY</Text>
          <View style={styles.statsSummary}>
            <View style={styles.statsItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{weeklyVisits}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Workouts Done</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
            <View style={styles.statsItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{totalCalories > 0 ? (totalCalories >= 1000 ? `${(totalCalories / 1000).toFixed(1)}k` : String(totalCalories)) : '0'}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Est. Calories</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
            <View style={styles.statsItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{totalMinutes > 0 ? `${totalMinutes}m` : '0m'}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Minutes</Text>
            </View>
          </View>
        </GlassCard>

        {/* Gym Attendance Log */}
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>RECENT GYM ATTENDANCE</Text>
          {checkIns.length === 0 ? (
            <Text style={[styles.emptyLog, { color: colors.textMuted }]}>No recent check-ins found.</Text>
          ) : (
            checkIns.slice(0, 3).map((item, idx) => (
              <View key={item.id} style={[
                styles.logItem,
                idx > 0 && [styles.logItemBorder, { borderTopColor: colors.surfaceBorder }]
              ]}>
                <View style={styles.logLeft}>
                  <View style={[styles.logIconWrap, { backgroundColor: `${colors.primary}12` }]}>
                    <Ionicons name="walk" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.logDate, { color: colors.text }]}>
                      {new Date(item.checkedInAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        weekday: 'short',
                      })}
                    </Text>
                    <Text style={[styles.logTime, { color: colors.textSecondary }]}>
                      Checked In: {new Date(item.checkedInAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
                <Text style={[
                  styles.logMethod,
                  {
                    color: colors.textMuted,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }
                ]}>{item.method}</Text>
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  card: { gap: SPACING.sm },
  cardTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: SPACING.sm,
    marginBottom: -SPACING.xs,
  },
  healthDashboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  legendContainer: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  legendValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    marginTop: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCardWrapper: {
    width: '31%',
  },
  metricCard: {
    padding: SPACING.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
  },
  graphPanel: {
    gap: SPACING.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  chartTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    padding: 2,
    gap: 2,
  },
  segmentBtn: {
    width: 28,
    height: 24,
    borderRadius: RADIUS.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  streakText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginTop: 2,
  },
  highlight: {
    fontWeight: '800',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayDotText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  statsItem: {
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 28,
  },
  emptyLog: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  logItemBorder: {
    borderTopWidth: 1,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logDate: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  logTime: {
    fontSize: FONT_SIZE.xs,
  },
  logMethod: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
});
