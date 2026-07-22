import React, { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import { getCheckIns } from '../../services/member.service';
import {
  getActivitySummary,
  getActivityAnalytics,
  logWorkout,
  logWater,
  syncDevice,
  getSyncDeviceStatus,
} from '../../services/activity.service';
import {
  ActivitySummary,
  AnalyticsDataPoint,
  CheckIn,
  SyncDeviceStatus,
  WorkoutType,
} from '../../types';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppleActivityRings } from '../../components/ui/AppleActivityRings';
import { AppleBarChart } from '../../components/ui/AppleBarChart';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
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

const calcTotalMinutes = (checkIns: CheckIn[]): number => {
  return checkIns.reduce((total, ci) => {
    if (!ci.checkedOutAt) return total + 45;
    const diff = new Date(ci.checkedOutAt).getTime() - new Date(ci.checkedInAt).getTime();
    return total + Math.round(diff / 60000);
  }, 0);
};

const estimateCalories = (totalMinutes: number): number => {
  return Math.round(totalMinutes * 8);
};

const WORKOUT_TYPES: { type: WorkoutType; label: string; icon: keyof typeof Ionicons.glyphMap; calPerMin: number }[] = [
  { type: 'HIIT', label: 'HIIT Training', icon: 'flame', calPerMin: 12 },
  { type: 'STRENGTH', label: 'Strength Training', icon: 'barbell', calPerMin: 8 },
  { type: 'CARDIO', label: 'Cardio Workout', icon: 'heart', calPerMin: 10 },
  { type: 'RUNNING', label: 'Treadmill Run', icon: 'walk', calPerMin: 11 },
  { type: 'YOGA', label: 'Yoga & Stretch', icon: 'leaf', calPerMin: 5 },
];

export const ActivityScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [chartPoints, setChartPoints] = useState<AnalyticsDataPoint[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<SyncDeviceStatus | null>(null);
  const [waterLoggedMl, setWaterLoggedMl] = useState(1250);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Segment states for interactive chart
  const [activeMetric, setActiveMetric] = useState<'CALORIES' | 'DURATION' | 'WATER'>('CALORIES');
  const [viewMode, setViewMode] = useState<'HOURLY' | 'DAILY' | 'MONTHLY'>('DAILY');

  // Live Workout Timer Modal state
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<typeof WORKOUT_TYPES[0]>(WORKOUT_TYPES[0]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutElapsedSec, setWorkoutElapsedSec] = useState(0);
  const timerRef = useRef<any>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [checkInRes, summaryRes, analyticsRes, deviceRes] = await Promise.all([
        getCheckIns(1, 15),
        getActivitySummary(),
        getActivityAnalytics(activeMetric, viewMode),
        getSyncDeviceStatus(),
      ]);

      setCheckIns(checkInRes.checkIns);
      setSummary(summaryRes);
      setChartPoints(analyticsRes.points);
      setDeviceStatus(deviceRes);
      if (summaryRes.metrics?.hydration?.consumedMl) {
        setWaterLoggedMl(summaryRes.metrics.hydration.consumedMl);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load activity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch analytics chart points whenever metric or view mode changes
  useEffect(() => {
    getActivityAnalytics(activeMetric, viewMode)
      .then((res) => setChartPoints(res.points))
      .catch((err) => console.log('Analytics error:', err));
  }, [activeMetric, viewMode]);

  // Live workout timer effect
  useEffect(() => {
    if (isWorkoutActive) {
      timerRef.current = setInterval(() => {
        setWorkoutElapsedSec((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isWorkoutActive]);

  const handleMetricSelect = (metric: typeof activeMetric) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setActiveMetric(metric);
  };

  const handleSegmentSelect = (mode: typeof viewMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setViewMode(mode);
  };

  const handleAddWater = async (amountMl: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const newTotal = Math.min(4000, waterLoggedMl + amountMl);
    setWaterLoggedMl(newTotal);
    try {
      await logWater({ amountMl });
    } catch (e) {
      console.log('Water log API error:', e);
    }
  };

  const handleToggleDeviceSync = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const isConnecting = !deviceStatus?.isConnected;
    try {
      const updated = await syncDevice({
        provider: 'APPLE_HEALTH',
        deviceName: 'Smartwatch / Health Connect',
        syncedAt: new Date().toISOString(),
        metrics: { stepCount: 8450, activeCalories: 450 },
      });
      setDeviceStatus({ ...updated, isConnected: isConnecting });
      Alert.alert(
        isConnecting ? 'Device Connected 🎉' : 'Device Disconnected',
        isConnecting
          ? 'Your smartwatch & health app metrics are now synchronized.'
          : 'Health app auto-sync turned off.',
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to toggle device sync');
    }
  };

  const handleStartWorkoutSession = () => {
    setWorkoutElapsedSec(0);
    setIsWorkoutActive(true);
  };

  const handleFinishWorkoutSession = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsWorkoutActive(false);

    const minutes = Math.max(1, Math.round(workoutElapsedSec / 60));
    const calories = Math.round(minutes * selectedWorkout.calPerMin);

    try {
      await logWorkout({
        workoutType: selectedWorkout.type,
        startTime: new Date(Date.now() - workoutElapsedSec * 1000).toISOString(),
        endTime: new Date().toISOString(),
        durationMinutes: minutes,
        caloriesBurned: calories,
        source: 'APP_TIMER',
      });
      Alert.alert(
        'Workout Saved! 🔥',
        `Great job! You completed ${minutes}m of ${selectedWorkout.label} and burned ~${calories} kcal.`,
      );
      loadData();
    } catch (e) {
      console.log('Save workout error:', e);
    } finally {
      setIsWorkoutModalOpen(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainderSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSec.toString().padStart(2, '0')}`;
  };

  if (loading) return <LoadingSpinner fullScreen />;

  if (error) {
    return (
      <AnimatedScreen>
        <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, paddingTop: headerHeight }]}>
          <EmptyState
            icon="warning-outline"
            title="Oops, something went wrong!"
            subtitle={error}
            actionLabel="Try Again"
            onAction={loadData}
          />
        </View>
      </AnimatedScreen>
    );
  }

  const weeklyCheckIns = checkIns.filter(
    (ci) => Date.now() - new Date(ci.checkedInAt).getTime() < 7 * 24 * 60 * 60 * 1000,
  );
  const weeklyVisits = weeklyCheckIns.length;

  const totalMinutes = calcTotalMinutes(weeklyCheckIns);
  const totalCalories = estimateCalories(totalMinutes);
  const exerciseGoal = 300;
  const calorieGoal = 2400;

  const moveProgress = Math.min(1, totalCalories / calorieGoal);
  const exerciseProgress = Math.min(1, totalMinutes / exerciseGoal);
  const hydrationProgress = Math.min(1, waterLoggedMl / 3000);

  return (
    <AnimatedScreen>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Apple Fitness Rings Dashboard */}
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
                  <Text style={[styles.legendValue, { color: colors.text }]}>{(waterLoggedMl / 1000).toFixed(2)} / 3.0 L</Text>
                </View>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Live Smartwatch Workout Trigger Card */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <GlassCard glowColor={colors.primary} style={styles.actionCard}>
            <View style={styles.actionRow}>
              <View style={[styles.actionIconWrap, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="stopwatch" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Live Smartwatch Tracker</Text>
                <Text style={[styles.actionSub, { color: colors.textMuted }]}>Track live workouts with real-time calorie burn</Text>
              </View>
              <AnimatedButton
                label="Start"
                onPress={() => setIsWorkoutModalOpen(true)}
                icon={<Ionicons name="play" size={16} color={colors.white} />}
              />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Smartwatch / Health App Device Sync Card */}
        <Animated.View entering={FadeInUp.duration(400).delay(130)}>
          <GlassCard glowColor={deviceStatus?.isConnected ? colors.success : undefined} style={styles.syncCard}>
            <View style={styles.actionRow}>
              <View style={[styles.actionIconWrap, { backgroundColor: deviceStatus?.isConnected ? `${colors.success}20` : 'rgba(255,255,255,0.08)' }]}>
                <Ionicons name="watch-outline" size={22} color={deviceStatus?.isConnected ? colors.success : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  {deviceStatus?.isConnected ? 'Wearable Synced ⌚' : 'Pair Activity Tracker'}
                </Text>
                <Text style={[styles.actionSub, { color: colors.textMuted }]}>
                  {deviceStatus?.isConnected
                    ? `Connected to ${deviceStatus.deviceName || 'Smart Device'}`
                    : 'Auto-sync Apple Health, Health Connect & Smartwatches'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleToggleDeviceSync}
                style={[
                  styles.syncToggleBtn,
                  { backgroundColor: deviceStatus?.isConnected ? colors.success : colors.surfaceBorder },
                ]}
              >
                <Text style={styles.syncToggleText}>{deviceStatus?.isConnected ? 'Synced' : 'Pair'}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>

        {/* AI Insight Widget */}
        <Animated.View entering={FadeInUp.duration(400).delay(150)}>
          <GlassCard glowColor={colors.accent} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="sparkles" size={16} color={colors.accent} />
              <Text style={[styles.insightTitle, { color: colors.accent }]}>AI INSIGHT</Text>
            </View>
            <Text style={[styles.insightText, { color: colors.text }]}>
              {summary?.aiInsight ||
                `You're on a roll! You've burned ${totalCalories} kcal this week across ${weeklyVisits} workouts. Keep pushing to hit your goal!`}
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Hydration Quick-Log Card */}
        <GlassCard glowColor="#00B0FF" style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="water" size={20} color="#00B0FF" />
              <Text style={[styles.waterTitle, { color: colors.text }]}>Hydration Logger</Text>
            </View>
            <Text style={[styles.waterValue, { color: colors.primary }]}>{waterLoggedMl} ml / 3000 ml</Text>
          </View>
          <View style={styles.waterBtnRow}>
            <TouchableOpacity onPress={() => handleAddWater(250)} style={[styles.waterBtn, { backgroundColor: isDark ? 'rgba(0,176,255,0.15)' : 'rgba(0,176,255,0.1)' }]}>
              <Ionicons name="add" size={16} color="#00B0FF" />
              <Text style={[styles.waterBtnText, { color: '#00B0FF' }]}>+250 ml</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleAddWater(500)} style={[styles.waterBtn, { backgroundColor: isDark ? 'rgba(0,176,255,0.15)' : 'rgba(0,176,255,0.1)' }]}>
              <Ionicons name="add" size={16} color="#00B0FF" />
              <Text style={[styles.waterBtnText, { color: '#00B0FF' }]}>+500 ml</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Segmented metrics grid (Tappable cards) */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>SELECT METRIC TO ANALYSE</Text>
        <View style={styles.metricsGrid}>
          <Pressable onPress={() => handleMetricSelect('CALORIES')} style={styles.metricCardWrapper}>
            <GlassCard
              glowColor={activeMetric === 'CALORIES' ? '#FF1243' : undefined}
              style={[styles.metricCard, activeMetric === 'CALORIES' && { borderColor: '#FF124355' }]}
            >
              <Ionicons name="flame" size={18} color={activeMetric === 'CALORIES' ? '#FF1243' : colors.textMuted} />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Move</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{totalCalories} kcal</Text>
            </GlassCard>
          </Pressable>

          <Pressable onPress={() => handleMetricSelect('DURATION')} style={styles.metricCardWrapper}>
            <GlassCard
              glowColor={activeMetric === 'DURATION' ? '#00E676' : undefined}
              style={[styles.metricCard, activeMetric === 'DURATION' && { borderColor: '#00E67655' }]}
            >
              <Ionicons name="time" size={18} color={activeMetric === 'DURATION' ? '#00E676' : colors.textMuted} />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Exercise</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{totalMinutes} mins</Text>
            </GlassCard>
          </Pressable>

          <Pressable onPress={() => handleMetricSelect('WATER')} style={styles.metricCardWrapper}>
            <GlassCard
              glowColor={activeMetric === 'WATER' ? '#00B0FF' : undefined}
              style={[styles.metricCard, activeMetric === 'WATER' && { borderColor: '#00B0FF55' }]}
            >
              <Ionicons name="water" size={18} color={activeMetric === 'WATER' ? '#00B0FF' : colors.textMuted} />
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Hydration</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{(waterLoggedMl / 1000).toFixed(2)} L</Text>
            </GlassCard>
          </Pressable>
        </View>

        {/* Dynamic Interactive Bar Chart */}
        <GlassCard
          glowColor={
            activeMetric === 'CALORIES' ? '#FF1243' : activeMetric === 'DURATION' ? '#00E676' : '#00B0FF'
          }
          style={styles.graphPanel}
        >
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
                    viewMode === mode && { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
                  ]}
                >
                  <Text style={[styles.segmentText, { color: viewMode === mode ? colors.text : colors.textMuted }]}>
                    {mode.slice(0, 1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Render AppleBarChart with dynamic chartPoints */}
          <AppleBarChart metricType={activeMetric} viewMode={viewMode} customData={chartPoints} />
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
                    },
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
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {totalCalories > 0 ? (totalCalories >= 1000 ? `${(totalCalories / 1000).toFixed(1)}k` : String(totalCalories)) : '0'}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Est. Calories</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
            <View style={styles.statsItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{totalMinutes > 0 ? `${totalMinutes}m` : '0m'}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Minutes</Text>
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      {/* Live Smartwatch Workout Tracker Modal */}
      <Modal visible={isWorkoutModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#12121E' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Smartwatch Workout Tracker ⌚</Text>
              <TouchableOpacity onPress={() => { setIsWorkoutActive(false); setIsWorkoutModalOpen(false); }}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Workout Type Selector */}
            <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>SELECT WORKOUT TYPE</Text>
            <View style={styles.typeGrid}>
              {WORKOUT_TYPES.map((w) => {
                const isSelected = selectedWorkout.type === w.type;
                return (
                  <TouchableOpacity
                    key={w.type}
                    onPress={() => setSelectedWorkout(w)}
                    disabled={isWorkoutActive}
                    style={[
                      styles.typeChip,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                      isSelected && { backgroundColor: `${colors.primary}25`, borderColor: colors.primary, borderWidth: 1 },
                    ]}
                  >
                    <Ionicons name={w.icon} size={16} color={isSelected ? colors.primary : colors.textMuted} />
                    <Text style={[styles.typeChipText, { color: isSelected ? colors.primary : colors.text }]}>{w.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Live Stopwatch & Calorie Counter */}
            <View style={styles.timerDisplay}>
              <Text style={[styles.timerSec, { color: colors.text }]}>{formatTimer(workoutElapsedSec)}</Text>
              <Text style={[styles.timerMeta, { color: colors.primary }]}>
                ~{Math.round(Math.max(1, workoutElapsedSec / 60) * selectedWorkout.calPerMin)} EST. KCAL BURNED
              </Text>
            </View>

            {/* Controls */}
            <View style={styles.modalActions}>
              {!isWorkoutActive ? (
                <AnimatedButton
                  label="Start Session"
                  onPress={handleStartWorkoutSession}
                  icon={<Ionicons name="play" size={18} color={colors.white} />}
                />
              ) : (
                <AnimatedButton
                  label="Finish Workout & Save"
                  onPress={handleFinishWorkoutSession}
                  icon={<Ionicons name="checkmark-done" size={18} color={colors.white} />}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.md },
  card: { gap: SPACING.sm },
  cardTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  actionCard: { padding: SPACING.md },
  syncCard: { padding: SPACING.md },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  actionIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  actionSub: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  syncToggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  syncToggleText: { color: '#FFF', fontSize: FONT_SIZE.xs, fontWeight: '700' },

  insightCard: { marginTop: SPACING.xs, padding: SPACING.md, gap: SPACING.xs, borderColor: 'rgba(255,158,24,0.3)' },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  insightText: { fontSize: FONT_SIZE.sm, lineHeight: 20, fontWeight: '500' },

  waterCard: { padding: SPACING.md, gap: SPACING.sm },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  waterTitle: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  waterValue: { fontSize: FONT_SIZE.sm, fontWeight: '800' },
  waterBtnRow: { flexDirection: 'row', gap: SPACING.sm },
  waterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: RADIUS.sm, gap: 4 },
  waterBtnText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },

  sectionHeader: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginTop: SPACING.sm, marginBottom: -SPACING.xs },
  healthDashboardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xs },
  legendContainer: { flex: 1, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  legendValue: { fontSize: FONT_SIZE.sm, fontWeight: '800', marginTop: 1 },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metricCardWrapper: { width: '31%' },
  metricCard: { padding: SPACING.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'transparent' },
  metricLabel: { fontSize: 10, fontWeight: '700' },
  metricValue: { fontSize: FONT_SIZE.sm, fontWeight: '800' },
  graphPanel: { gap: SPACING.sm },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  chartTitle: { fontSize: FONT_SIZE.sm, fontWeight: '800', letterSpacing: 0.5 },
  segmentControl: { flexDirection: 'row', borderRadius: RADIUS.sm, padding: 2, gap: 2 },
  segmentBtn: { width: 28, height: 24, borderRadius: RADIUS.sm - 2, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  streakText: { fontSize: FONT_SIZE.md, fontWeight: '600', marginTop: 2 },
  highlight: { fontWeight: '800' },
  weekContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  dayCol: { alignItems: 'center', gap: 6 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayDotText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  dayLabel: { fontSize: 10, fontWeight: '600' },
  statsSummary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: SPACING.xs },
  statsItem: { alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: FONT_SIZE.lg, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600' },
  divider: { width: 1, height: 28 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800' },
  selectorLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md },
  typeChipText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  timerDisplay: { alignItems: 'center', paddingVertical: SPACING.md, gap: 4 },
  timerSec: { fontSize: 44, fontWeight: '900', letterSpacing: 2 },
  timerMeta: { fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 1 },
  modalActions: { marginTop: SPACING.sm },
});
