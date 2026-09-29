import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { getCheckIns } from '../../services/member.service';
import {
  getActivitySummary,
  getActivityAnalytics,
  logWorkout,
  logWater,
  getSyncDeviceStatus,
} from '../../services/activity.service';
import {
  ActivitySummary,
  AnalyticsDataPoint,
  CheckIn,
  SyncDeviceStatus,
  WorkoutType,
} from '../../types';
import { FONT_SIZE, FONTS, RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { shade, solidFillFor } from '../../utils/color';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppleActivityRings } from '../../components/ui/AppleActivityRings';
import { AppleBarChart } from '../../components/ui/AppleBarChart';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { useAuth } from '../../context/AuthContext';
import { RootStackParams } from '../../navigation/AppNavigator';

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

const estimateCalories = (totalMinutes: number): number => Math.round(totalMinutes * 8);

const WORKOUT_TYPES: { type: WorkoutType; label: string; icon: keyof typeof Ionicons.glyphMap; calPerMin: number }[] = [
  { type: 'HIIT', label: 'HIIT Training', icon: 'flame', calPerMin: 12 },
  { type: 'STRENGTH', label: 'Strength', icon: 'barbell', calPerMin: 8 },
  { type: 'CARDIO', label: 'Cardio', icon: 'heart', calPerMin: 10 },
  { type: 'RUNNING', label: 'Running', icon: 'walk', calPerMin: 11 },
  { type: 'YOGA', label: 'Yoga', icon: 'leaf', calPerMin: 5 },
];

export const ActivityScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const onBack = navigation.canGoBack() ? () => navigation.goBack() : undefined;
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = useThemeColors();
  const onPrimary = '#FFFFFF';
  // colors.accent isn't tenant-overridden, but it's still a bright teal that
  // white fails against directly — same fix as colors.primarySolid.
  const accentSolid = solidFillFor(colors.accent);
  const onAccent = '#FFFFFF';

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [chartPoints, setChartPoints] = useState<AnalyticsDataPoint[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<SyncDeviceStatus | null>(null);
  const [waterLoggedMl, setWaterLoggedMl] = useState(1250);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeMetric, setActiveMetric] = useState<'CALORIES' | 'DURATION' | 'WATER'>('CALORIES');
  const [viewMode, setViewMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');

  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<typeof WORKOUT_TYPES[0]>(WORKOUT_TYPES[0]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutElapsedSec, setWorkoutElapsedSec] = useState(0);
  const timerRef = useRef<any>(null);

  const loadData = useCallback(async () => {
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
      if (summaryRes.metrics?.hydration?.consumedMl !== undefined) {
        setWaterLoggedMl(summaryRes.metrics.hydration.consumedMl);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }, [activeMetric, viewMode]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    getActivityAnalytics(activeMetric, viewMode)
      .then((res) => setChartPoints(res.points))
      .catch((err) => console.log('Analytics error:', err));
  }, [activeMetric, viewMode]);

  useEffect(() => {
    if (isWorkoutActive) {
      timerRef.current = setInterval(() => setWorkoutElapsedSec((prev) => prev + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isWorkoutActive]);

  const handleMetricSelect = (metric: typeof activeMetric) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    setActiveMetric(metric);
    navigation.navigate('MetricDetail', { metric });
  };

  const handleSegmentSelect = (mode: typeof viewMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    setViewMode(mode);
  };

  const handleAddWater = async (amountMl: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    const newTotal = Math.max(0, Math.min(2000, waterLoggedMl + amountMl));
    if (newTotal === waterLoggedMl) return;
    const diff = newTotal - waterLoggedMl;
    setWaterLoggedMl(newTotal);
    
    if (newTotal >= 2000 && diff > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    try { await logWater({ amountMl: diff }); } catch (e) { console.log('Water log API error:', e); }
  };

  const handleWearableNotice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    Alert.alert('Coming Soon 🚀', 'Smartwatch & Health App integration is currently under active development. Stay tuned!');
  };

  const handleStartWorkoutSession = () => { setWorkoutElapsedSec(0); setIsWorkoutActive(true); };

  const handleFinishWorkoutSession = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
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
      Alert.alert('Workout Saved! 🔥', `Great job! You completed ${minutes}m of ${selectedWorkout.label} and burned ~${calories} kcal.`);
      loadData();
    } catch (e) { console.log('Save workout error:', e); }
    finally { setIsWorkoutModalOpen(false); }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainderSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <AnimatedScreen>
        <ScreenHeader title="Activity Dashboard" onBack={onBack} />
        <LoadingSpinner fullScreen />
      </AnimatedScreen>
    );
  }

  if (error) {
    return (
      <AnimatedScreen>
        <ScreenHeader title="Activity Dashboard" onBack={onBack} />
        <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }]}>
          <EmptyState icon="warning-outline" title="Oops, something went wrong!" subtitle={error} actionLabel="Try Again" onAction={loadData} />
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
  const waterProgress = Math.min(1, waterLoggedMl / 2000);

  const activeColor = activeMetric === 'CALORIES' ? '#F0B36B' : activeMetric === 'DURATION' ? '#2DD4BF' : '#6BB8F0';

  return (
    <AnimatedScreen>
      <ScreenHeader title="Activity Dashboard" onBack={onBack} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ BENTO BOX: Rings + Water Tracker Side by Side ═══ */}
        <View style={styles.bentoBox}>
          {/* Left: Activity Rings */}
          <View style={styles.bentoLeft}>
            <GlassCard glowColor={colors.accent} style={styles.bentoCardFull} innerStyle={styles.bentoCardInner}>
              <Text style={[styles.bentoLabel, { color: colors.textSecondary }]}>ACTIVITY</Text>
              <View style={styles.ringsCenter}>
                <AppleActivityRings
                  moveProgress={moveProgress}
                  exerciseProgress={exerciseProgress}
                  standProgress={waterProgress}
                  size={100}
                />
              </View>
              <View style={styles.bentoLegendRow}>
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.bentoLegendDot}><Ionicons name="flame" size={10} color="#F0B36B" /></View>
                  <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, fontFamily: FONTS.bodyMedium }}>Move</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.bentoLegendDot}><Ionicons name="fitness" size={10} color="#2DD4BF" /></View>
                  <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, fontFamily: FONTS.bodyMedium }}>Exercise</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.bentoLegendDot}><Ionicons name="water" size={10} color="#6BB8F0" /></View>
                  <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, fontFamily: FONTS.bodyMedium }}>Hydrate</Text>
                </View>
              </View>
            </GlassCard>
          </View>

          {/* Right: Water Tracker */}
          <View style={styles.bentoRight}>
            <GlassCard glowColor="#6BB8F0" style={styles.bentoCardFull} innerStyle={styles.bentoCardInner}>
              <View style={styles.bentoHeaderRow}>
                <Text style={[styles.bentoLabel, { color: colors.textSecondary }]}>HYDRATION</Text>
                <Text style={[styles.bentoValue, { color: '#6BB8F0' }]}>{Math.min(2000, waterLoggedMl)} ml</Text>
              </View>

              {/* Vertical Water Bar */}
              <View style={styles.bentoWaterBody}>
                <View style={[styles.verticalProgressBarBg, { backgroundColor: colors.inset }]}>
                  <View
                    style={[
                      styles.verticalProgressBarFill,
                      {
                        height: waterProgress > 0 ? `${Math.max(8, Math.min(100, waterProgress * 100))}%` : '0%',
                      },
                    ]}
                  />
                </View>
                <View style={styles.bentoWaterControls}>
                  {waterLoggedMl >= 2000 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <View style={{ backgroundColor: 'rgba(41, 182, 246, 0.15)', padding: 6, borderRadius: 12, alignItems: 'center', width: '100%' }}>
                        <Ionicons name="water" size={20} color="#6BB8F0" />
                        <Text style={{ color: '#6BB8F0', fontSize: 10, fontFamily: FONTS.bodyBold, textAlign: 'center', marginTop: 2 }}>
                          Wah! 🎉{'\n'}Goal Met
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Pressable
                        style={[styles.bentoWaterBtn, { backgroundColor: 'rgba(41,182,246,0.15)' }]}
                        onPress={() => handleAddWater(250)}
                      >
                        <Ionicons name="add" size={20} color="#6BB8F0" />
                      </Pressable>
                      <Pressable
                        style={[styles.bentoWaterBtn, { backgroundColor: colors.inset }]}
                        onPress={() => handleAddWater(500)}
                      >
                        <Ionicons name="water" size={18} color={colors.textSecondary} />
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </GlassCard>
          </View>
        </View>

        {/* ═══ WEEKLY SNAPSHOT — 3-stat row ═══ */}
        <View>
          <GlassCard glowColor={colors.primary} style={{ marginBottom: 0 }}>
            <View style={styles.snapshotHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>WEEKLY SNAPSHOT</Text>
              <Ionicons name="bar-chart" size={16} color={colors.primary} />
            </View>
            <View style={styles.snapshotStatsRow}>
              <View style={styles.snapshotStat}>
                <Text style={[styles.snapshotStatValue, { color: colors.text }]}>{weeklyVisits}</Text>
                <Text style={[styles.snapshotStatLabel, { color: colors.textSecondary }]}>WORKOUTS</Text>
              </View>
              <View style={[styles.snapshotDivider, { backgroundColor: colors.inset }]} />
              <View style={styles.snapshotStat}>
                <Text style={[styles.snapshotStatValue, { color: colors.text }]}>
                  {totalCalories >= 1000 ? `${(totalCalories / 1000).toFixed(1)}k` : totalCalories}
                </Text>
                <Text style={[styles.snapshotStatLabel, { color: colors.textSecondary }]}>KCAL BURNED</Text>
              </View>
              <View style={[styles.snapshotDivider, { backgroundColor: colors.inset }]} />
              <View style={styles.snapshotStat}>
                <Text style={[styles.snapshotStatValue, { color: colors.text }]}>{totalMinutes}m</Text>
                <Text style={[styles.snapshotStatLabel, { color: colors.textSecondary }]}>ACTIVE TIME</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* ═══ START WORKOUT — Premium Gradient Banner ═══ */}
        <View>
          <Pressable
            onPress={() => setIsWorkoutModalOpen(true)}
            style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient
              colors={[accentSolid, shade(accentSolid, -0.18)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.workoutBanner}
            >
              <View style={styles.workoutBannerGlow} />
              <View style={styles.workoutBannerContent}>
                <View style={styles.workoutBannerIcon}>
                  <Ionicons name="stopwatch" size={26} color={onAccent} />
                </View>
                <View style={styles.workoutBannerCopy}>
                  <Text style={[styles.workoutBannerTitle, { color: onAccent }]}>Start Live Workout</Text>
                  <Text style={[styles.workoutBannerSub, { color: `${onAccent}B8` }]}>Track session with real-time calorie burn</Text>
                </View>
                <View style={styles.workoutBannerPlayBtn}>
                  <Ionicons name="play" size={18} color={colors.accent} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ═══ WEARABLE TRACKER — Coming Soon ═══ */}
        <View>
          <GlassCard glowColor={undefined}>
            <View style={styles.wearableRow}>
              <View style={[styles.wearableIcon, { backgroundColor: colors.inset }]}>
                <Ionicons name="watch-outline" size={22} color={colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.wearableTitle, { color: colors.text }]}>Wearable Tracker</Text>
                <Text style={[styles.wearableSub, { color: colors.textMuted }]}>
                  Apple Health, Health Connect & Smartwatches
                </Text>
              </View>
              <Pressable
                onPress={handleWearableNotice}
                style={({ pressed }) => [
                  styles.comingSoonPill,
                  { backgroundColor: isDark ? 'rgba(255,158,24,0.18)' : 'rgba(255,158,24,0.12)' },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.comingSoonPillText}>Coming Soon</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>

        {/* ═══ AI INSIGHT ═══ */}
        <View>
          <GlassCard glowColor={colors.accent}>
            <View style={styles.insightRow}>
              <View style={[styles.insightIconWrap, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="sparkles" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightLabel, { color: colors.accent }]}>FitCoach AI Insight</Text>
                <Text style={[styles.insightBody, { color: colors.text }]}>
                  {summary?.aiInsight || `You've burned ${totalCalories} kcal this week across ${weeklyVisits} workouts. Keep pushing to hit your goal!`}
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* ═══ ANALYTICS & INTERACTIVE CHART ═══ */}
        <View>
          <GlassCard glowColor={activeColor}>
            {/* Header */}
            <View style={styles.analyticsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>ANALYTICS</Text>
              <View style={[styles.periodSegment, { backgroundColor: colors.inset }]}>
                {(['DAILY', 'MONTHLY'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => handleSegmentSelect(mode)}
                    style={[
                      styles.periodBtn,
                      viewMode === mode && { backgroundColor: colors.inset },
                    ]}
                  >
                    <Text style={[styles.periodText, { color: viewMode === mode ? colors.text : colors.textMuted }]}>
                      {mode === 'DAILY' ? 'D' : 'M'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Metric Selector — 3 tappable metric cards */}
            <View style={styles.metricCardsRow}>
              {([
                { key: 'CALORIES' as const, label: 'Move', value: `${totalCalories}`, unit: 'kcal', icon: 'flame' as const, color: '#F0B36B' },
                { key: 'DURATION' as const, label: 'Exercise', value: `${totalMinutes}`, unit: 'min', icon: 'time' as const, color: '#2DD4BF' },
                { key: 'WATER' as const, label: 'Hydration', value: `${(waterLoggedMl / 1000).toFixed(1)}`, unit: 'L', icon: 'water' as const, color: '#6BB8F0' },
              ]).map((m) => {
                const isActive = activeMetric === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => handleMetricSelect(m.key)}
                    style={[
                      styles.metricCard,
                      { backgroundColor: colors.inset },
                      isActive && { backgroundColor: `${m.color}18`, borderColor: `${m.color}55` },
                    ]}
                  >
                    <Ionicons name={m.icon} size={16} color={isActive ? m.color : colors.textMuted} />
                    <Text style={[styles.metricCardLabel, { color: colors.textMuted }]}>{m.label}</Text>
                    <Text style={[styles.metricCardValue, { color: isActive ? m.color : colors.text }]}>
                      {m.value} <Text style={styles.metricCardUnit}>{m.unit}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Chart */}
            <AppleBarChart metricType={activeMetric} viewMode={viewMode} customData={chartPoints} />
          </GlassCard>
        </View>

        {/* ═══ WEEKLY STREAK / CONSISTENCY ═══ */}
        <View>
          <GlassCard glowColor={colors.primary}>
            <View style={styles.snapshotHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>WEEKLY CONSISTENCY</Text>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            </View>

            <Text style={[styles.streakText, { color: colors.text }]}>
              You attended gym <Text style={{ fontFamily: FONTS.bodyExtra, color: colors.primary }}>{weeklyVisits} days</Text> this week!
            </Text>

            <View style={styles.daysRow}>
              {DAYS_OF_WEEK.map((day, index) => {
                const active = hasCheckedInOnDay(checkIns, index);
                return (
                  <View key={index} style={styles.dayCol}>
                    <View
                      style={[
                        styles.dayCircle,
                        {
                          backgroundColor: colors.inset,
                          borderColor: colors.insetBorder,
                        },
                        active && { backgroundColor: colors.primarySolid, borderColor: colors.primarySolid },
                      ]}
                    >
                      {active ? (
                        <Ionicons name="checkmark" size={14} color={onPrimary} />
                      ) : (
                        <Text style={[styles.dayCircleText, { color: colors.textMuted }]}>{day}</Text>
                      )}
                    </View>
                    <Text style={[styles.dayLabel, { color: active ? colors.primary : colors.textMuted }]}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>
        </View>
      </ScrollView>

      {/* ═══ LIVE WORKOUT MODAL ═══ */}
      <Modal visible={isWorkoutModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#121821' : '#FFFFFF' }]}>
            {/* Modal Handle */}
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Live Workout ⏱️</Text>
              <TouchableOpacity onPress={() => { setIsWorkoutActive(false); setIsWorkoutModalOpen(false); }}>
                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Workout Type Selector */}
            <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>SELECT TYPE</Text>
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
                      { backgroundColor: colors.inset },
                      isSelected && { backgroundColor: `${colors.primary}25`, borderColor: colors.primary, borderWidth: 1 },
                    ]}
                  >
                    <Ionicons name={w.icon} size={16} color={isSelected ? colors.primary : colors.textMuted} />
                    <Text style={[styles.typeChipText, { color: isSelected ? colors.primary : colors.text }]}>{w.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stopwatch & Calorie Counter */}
            <View style={styles.timerDisplay}>
              <Text style={[styles.timerSec, { color: colors.text }]}>{formatTimer(workoutElapsedSec)}</Text>
              <Text style={[styles.timerMeta, { color: colors.primary }]}>
                ~{Math.round(Math.max(1, workoutElapsedSec / 60) * selectedWorkout.calPerMin)} EST. KCAL
              </Text>
            </View>

            <View style={styles.modalActions}>
              {!isWorkoutActive ? (
                <AnimatedButton
                  label="Start Session"
                  onPress={handleStartWorkoutSession}
                  icon={<Ionicons name="play" size={18} color={colors.white} />}
                />
              ) : (
                <AnimatedButton
                  label="Finish & Save"
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
  content: { paddingHorizontal: SPACING.md, gap: SPACING.sm },

  sectionTitle: {
    fontSize: 11,
    fontFamily: FONTS.bodySemi,
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
  },

  /* ── BENTO BOX ── */
  bentoBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  bentoLeft: { flex: 1 },
  bentoRight: { flex: 1 },
  bentoCardFull: {
    flex: 1,
    minHeight: 190,
  },
  bentoCardInner: {
    flex: 1,
    padding: SPACING.md,
  },
  bentoLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodySemi,
    letterSpacing: 0.6,
  },
  ringsCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  bentoLegendDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoValue: {
    fontSize: 12,
    fontFamily: FONTS.bodyExtra,
  },
  bentoWaterBody: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.sm,
  },
  verticalProgressBarBg: {
    flex: 1,
    borderRadius: RADIUS.md,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  verticalProgressBarFill: {
    width: '100%',
    borderRadius: RADIUS.md,
    backgroundColor: '#6BB8F0',
  },
  bentoWaterControls: {
    gap: 8,
    justifyContent: 'flex-end',
  },
  bentoWaterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── WEEKLY SNAPSHOT ── */
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  snapshotStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  snapshotStat: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotStatValue: {
    fontSize: 20,
    fontFamily: FONTS.bodyExtra,
  },
  snapshotStatLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodySemi,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  snapshotDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 8,
  },

  /* ── WORKOUT BANNER ── */
  workoutBanner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  workoutBannerGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  workoutBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workoutBannerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutBannerCopy: {
    flex: 1,
  },
  workoutBannerTitle: {
    fontSize: 16,
    fontFamily: FONTS.bodyBold,
  },
  workoutBannerSub: {
    fontSize: 12,
    fontFamily: FONTS.bodySemi,
    marginTop: 2,
  },
  workoutBannerPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── WEARABLE ── */
  wearableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wearableIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wearableTitle: {
    fontSize: 15,
    fontFamily: FONTS.bodyBold,
  },
  wearableSub: {
    fontSize: 12,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  comingSoonPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,158,24,0.35)',
  },
  comingSoonPillText: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    color: '#FBBF24',
  },

  /* ── AI INSIGHT ── */
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightLabel: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 14,
    fontFamily: FONTS.body,
    lineHeight: 20,
  },

  /* ── ANALYTICS ── */
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  periodSegment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: RADIUS.md,
    gap: 2,
  },
  periodBtn: {
    width: 30,
    height: 26,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  metricCardsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 3,
  },
  metricCardLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodySemi,
  },
  metricCardValue: {
    fontSize: 13,
    fontFamily: FONTS.bodyExtra,
  },
  metricCardUnit: {
    fontSize: 10,
    fontFamily: FONTS.bodySemi,
    opacity: 0.6,
  },

  /* ── WEEKLY STREAK ── */
  streakText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemi,
    marginBottom: SPACING.sm,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayCircleText: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodySemi,
  },

  /* ── MODAL ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    alignSelf: 'center',
    marginBottom: SPACING.xs,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
  },
  selectorLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodySemi,
    letterSpacing: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  timerDisplay: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: 6,
  },
  timerSec: {
    fontSize: 52,
    fontFamily: FONTS.displayExtra,
    letterSpacing: 2,
  },
  timerMeta: {
    fontSize: 12,
    fontFamily: FONTS.bodySemi,
    letterSpacing: 1,
  },
  modalActions: {
    marginTop: SPACING.xs,
  },
});
