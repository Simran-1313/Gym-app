import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import {
  DARK_COLORS,
  FONTS,
  LIGHT_COLORS,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  shadow,
  type ThemeColors,
} from '../../config/theme';
import { ActiveSubscription, User, ActivitySummary, CheckIn } from '../../types';
import { getCheckIns } from '../../services/member.service';
import { getActivitySummary, logWater } from '../../services/activity.service';
import { RootStackParams, TabParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { FitnessAvatar } from '../../components/ui/FitnessAvatar';
import { GymLogo } from '../../components/ui/GymLogo';
import { SceneryBackdrop } from '../../components/ui/SceneryBackdrop';
import { GlowLineChart } from '../../components/ui/GlowLineChart';
import { MOTIVATIONAL_QUOTES } from '../../constants/quotes';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParams, 'Home'>,
  NativeStackNavigationProp<RootStackParams>
>;

const { width: SCREEN_W } = Dimensions.get('window');
const GUTTER = SPACING.gutter;
const CARD_W = SCREEN_W - GUTTER * 2;

/** Accent used on the photographic hero. Fixed to the bright teal in both
 *  themes — light mode's deeper teal disappears against the dark photo. */
const HERO_ACCENT = '#5EEAD4';

const daysRemaining = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const greetingIcon = (): keyof typeof Ionicons.glyphMap => {
  const h = new Date().getHours();
  if (h < 12) return 'partly-sunny-outline';
  if (h < 17) return 'sunny-outline';
  return 'moon-outline';
};

const calcTotalMinutes = (checkIns: CheckIn[]): number =>
  checkIns.reduce((total, ci) => {
    // A session with no checkout is credited a nominal 45 minutes rather than
    // zero, so an in-progress visit still moves the ring.
    if (!ci.checkedOutAt) return total + 45;
    const diff = new Date(ci.checkedOutAt).getTime() - new Date(ci.checkedInAt).getTime();
    return total + Math.round(diff / 60000);
  }, 0);

const estimateCalories = (totalMinutes: number): number => Math.round(totalMinutes * 8);

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

/* ─────────────────────── Sub-components ─────────────────────── */

const SectionHeading: React.FC<{
  title: string;
  colors: ThemeColors;
  action?: { label: string; onPress: () => void };
}> = ({ title, colors, action }) => (
  <View style={styles.sectionHead}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    {action && (
      <Pressable onPress={action.onPress} hitSlop={8} style={styles.sectionAction}>
        <Text style={[styles.sectionActionText, { color: colors.textSecondary }]}>
          {action.label}
        </Text>
        <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
      </Pressable>
    )}
  </View>
);

/** One of the four stat tiles under the hero. */
const MetricTile: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  status: string;
  tint: string;
  colors: ThemeColors;
  isDark: boolean;
  onPress?: () => void;
  delay: number;
}> = ({ icon, label, value, status, tint, colors, isDark, onPress, delay }) => (
  <Animated.View entering={FadeInUp.duration(320).delay(delay)} style={styles.tileWrap}>
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.tile,
        shadow(isDark, 'sm'),
        {
          backgroundColor: pressed ? colors.cardPressed : colors.surface,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: `${tint}1F` }]}>
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text style={[styles.tileLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.tileValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={styles.tileStatusRow}>
        <View style={[styles.tileDot, { backgroundColor: tint }]} />
        <Text style={[styles.tileStatus, { color: colors.textMuted }]} numberOfLines={1}>
          {status}
        </Text>
      </View>
    </Pressable>
  </Animated.View>
);

/** A day marker in the weekly strip: hollow when idle, teal arc when trained. */
const DayRing: React.FC<{
  label: string;
  progress: number;
  isToday: boolean;
  colors: ThemeColors;
}> = ({ label, progress, isToday, colors }) => {
  const size = isToday ? 30 : 24;
  const r = size / 2 - 2.5;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={styles.dayCol}>
      <Text
        style={[
          styles.dayLabel,
          {
            color: isToday ? colors.text : colors.textMuted,
            fontFamily: isToday ? FONTS.bodySemi : FONTS.bodyMedium,
          },
        ]}
      >
        {label}
      </Text>
      <View style={styles.dayRingSlot}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.textFaint}
            strokeWidth={2.5}
            fill="none"
          />
          {progress > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={colors.primary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - Math.min(1, progress))}
              // Start the arc at 12 o'clock instead of 3 o'clock.
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
        </Svg>
      </View>
      {isToday && <Text style={[styles.dayToday, { color: colors.primary }]}>Today</Text>}
    </View>
  );
};

/** Small ring gauge behind the hero's bolt icon — the energy score drawn as an
 *  arc, not just a static badge, so the number on the left has a visual echo. */
const EnergyDial: React.FC<{ progress: number }> = ({ progress }) => {
  const size = 44;
  const r = size / 2 - 4;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={3.5} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={HERO_ACCENT}
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
          />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="flash" size={16} color={HERO_ACCENT} />
        </View>
      </View>
    </View>
  );
};

/** Days to the next streak badge, matching ChallengesScreen's own milestone
 *  thresholds — the streak pill and the Challenges screen must agree on when
 *  "Bronze" unlocks, or the app is telling two different stories about it. */
const STREAK_MILESTONES = [7, 14, 30, 60];
const nextStreakBadge = (days: number): { label: string; remaining: number } | null => {
  const names = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  for (let i = 0; i < STREAK_MILESTONES.length; i++) {
    if (days < STREAK_MILESTONES[i]) return { label: names[i], remaining: STREAK_MILESTONES[i] - days };
  }
  return null;
};

/* ─────────────────────── Screen ─────────────────────── */

export const HomeScreen: React.FC = () => {
  const { user, refreshUser, gym, theme } = useAuth();
  const nav = useNavigation<HomeNavProp>();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const colors: ThemeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [refreshing, setRefreshing] = useState(false);
  const [waterLogged, setWaterLogged] = useState(0);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);

  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);

  const loadActivityData = useCallback(async () => {
    try {
      const [checkInRes, summaryRes] = await Promise.all([
        getCheckIns(1, 30),
        getActivitySummary(),
      ]);
      setCheckIns(checkInRes.checkIns || []);
      setSummary(summaryRes);
      if (summaryRes.metrics?.hydration?.consumedMl !== undefined) {
        setWaterLogged(summaryRes.metrics.hydration.consumedMl);
      }
    } catch (e) {
      console.log('Failed to fetch home activity data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadActivityData();
    }, [loadActivityData]),
  );

  const sub = (user as User & { activeSubscription?: ActiveSubscription | null })
    ?.activeSubscription;
  const activeDays = sub?.status === 'ACTIVE' ? daysRemaining(sub.endDate) : 0;

  /* ── Derived activity figures ── */

  const weeklyCheckIns = useMemo(
    () =>
      checkIns.filter(
        (ci) => Date.now() - new Date(ci.checkedInAt).getTime() < 7 * 24 * 60 * 60 * 1000,
      ),
    [checkIns],
  );

  const weeklyVisits = weeklyCheckIns.length;
  const totalMinutes = calcTotalMinutes(weeklyCheckIns);
  const totalCalories = estimateCalories(totalMinutes);

  const exerciseGoal = summary?.metrics?.exerciseDuration?.goal ?? 300;
  const calorieGoal = summary?.metrics?.calories?.goal ?? 2400;
  const waterGoal = summary?.metrics?.hydration?.goalMl ?? 2000;

  const moveProgress = Math.min(1, totalCalories / calorieGoal);
  const exerciseProgress = Math.min(1, totalMinutes / exerciseGoal);
  const waterProgress = Math.min(1, waterLogged / waterGoal);

  // Composite readiness score. There is no wearable integration, so this is an
  // average of the three goals the backend does track — not a sensor reading.
  const energyScore = Math.round(
    ((moveProgress + exerciseProgress + waterProgress) / 3) * 100,
  );

  const energyCopy =
    energyScore >= 75
      ? 'Strong momentum. Keep going.'
      : energyScore >= 40
        ? 'Good momentum. Keep going.'
        : 'Just getting started today.';

  /** Per-day calories for the last 7 days, oldest first — feeds the sparkline. */
  const dailySeries = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const from = new Date(today);
      from.setDate(from.getDate() - (6 - i));
      const to = new Date(from);
      to.setDate(to.getDate() + 1);

      const dayCheckIns = checkIns.filter((ci) => {
        const t = new Date(ci.checkedInAt).getTime();
        return t >= from.getTime() && t < to.getTime();
      });
      return estimateCalories(calcTotalMinutes(dayCheckIns));
    });
  }, [checkIns]);

  /** Mon–Sun strip for the weekly progress card. */
  const weekDays = useMemo(() => {
    const today = startOfDay(new Date());
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // JS weeks start Sunday; shift so Monday is index 0.
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(monday.getDate() - mondayOffset);

    return labels.map((label, i) => {
      const day = new Date(monday);
      day.setDate(day.getDate() + i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);

      const dayCheckIns = checkIns.filter((ci) => {
        const t = new Date(ci.checkedInAt).getTime();
        return t >= day.getTime() && t < next.getTime();
      });
      const minutes = calcTotalMinutes(dayCheckIns);
      return {
        label,
        progress: Math.min(1, minutes / 45),
        isToday: day.getTime() === today.getTime(),
      };
    });
  }, [checkIns]);

  /** Consecutive days ending today (or yesterday, if today isn't logged yet). */
  const streak = useMemo(() => {
    const daySet = new Set(
      checkIns.map((ci) => startOfDay(new Date(ci.checkedInAt)).getTime()),
    );
    const cursor = startOfDay(new Date());
    if (!daySet.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);

    let count = 0;
    while (daySet.has(cursor.getTime())) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [checkIns]);

  const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
  const bmiValue = parseFloat(bmi);
  let bmiCategory = 'Normal';
  let bmiColor: string = colors.success;
  if (bmiValue < 18.5) {
    bmiCategory = 'Underweight';
    bmiColor = colors.info;
  } else if (bmiValue > 30) {
    bmiCategory = 'Obese';
    bmiColor = colors.danger;
  } else if (bmiValue > 25) {
    bmiCategory = 'Overweight';
    bmiColor = colors.warning;
  }

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const quote = MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];

  /* ── Handlers ── */

  const requireProfile = (): boolean => {
    if (!user?.isOnboarded) {
      Alert.alert(
        'Profile Required',
        'Complete your fitness profile before generating AI plans.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up Profile', onPress: () => nav.navigate('Onboarding') },
        ],
      );
      return false;
    }
    return true;
  };

  const openRootScreen = (name: 'DietPlan' | 'WorkoutPlan') => {
    nav.dispatch(CommonActions.navigate({ name }));
  };

  const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  const handleCreateDiet = () => {
    if (!requireProfile()) return;
    openRootScreen('DietPlan');
  };

  const handleCreateWorkout = () => {
    tap();
    if (!requireProfile()) return;
    openRootScreen('WorkoutPlan');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadActivityData()]);
    setRefreshing(false);
  }, [refreshUser, loadActivityData]);

  const handleWaterIncrement = async (amount: number) => {
    tap();
    const newTotal = Math.max(0, Math.min(waterGoal, waterLogged + amount));
    if (newTotal === waterLogged) return;
    const diff = newTotal - waterLogged;
    setWaterLogged(newTotal);

    if (newTotal >= waterGoal && diff > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    try {
      await logWater({ amountMl: diff });
      loadActivityData();
    } catch (e) {
      console.log('Water log API error from home:', e);
    }
  };

  // The hero's backdrop is a photograph: it cannot recolour, so that card is a
  // dark media surface in both themes and its copy is always light. The workout
  // card is still vector art that follows the theme, hence the two sets.
  const onPhoto = '#FFFFFF';
  const onPhotoMuted = 'rgba(255,255,255,0.68)';
  const onPhotoRule = 'rgba(255,255,255,0.16)';
  const onPhotoFill = 'rgba(255,255,255,0.10)';

  const onArt = colors.text;
  const onArtMuted = colors.textSecondary;
  const onArtRule = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,29,45,0.12)';
  const onArtFill = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,29,45,0.05)';

  const headerTop = Math.max(insets.top, 12);

  return (
    <AnimatedScreen noBackground>
      {/* ── Fixed top bar ── */}
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <BlurView
          tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          intensity={isDark ? 45 : 60}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={
            isDark
              ? ['rgba(8,11,17,0.95)', 'rgba(8,11,17,0.55)']
              : ['rgba(245,247,250,0.96)', 'rgba(245,247,250,0.6)']
          }
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <GymLogo name={gym?.name} logo={gym?.logo} size={30} />
            <Text style={[styles.wordmark, { color: colors.text }]} numberOfLines={1}>
              {(gym?.name ?? 'Clasendra').toUpperCase()}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                tap();
                nav.navigate('Notifications');
              }}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: pressed ? colors.cardPressed : colors.surface,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => {
                tap();
                nav.navigate('Profile');
              }}
            >
              <FitnessAvatar name={user?.name} uri={user?.avatarUrl} size={38} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.root}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 110,
          paddingTop: headerTop + 58,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            progressViewOffset={headerTop + 58}
          />
        }
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* ── Greeting + streak ── */}
        <Animated.View entering={FadeInUp.duration(360)} style={styles.greetBlock}>
          <View style={styles.greetCopy}>
            <View style={styles.greetRow}>
              <Ionicons name={greetingIcon()} size={15} color={colors.textSecondary} />
              <Text style={[styles.greetLabel, { color: colors.textSecondary }]}>
                {greeting()},
              </Text>
            </View>
            <Text style={[styles.greetName, { color: colors.text }]} numberOfLines={1}>
              {user?.name?.split(' ')[0] ?? 'Member'}
            </Text>
            <Text style={[styles.greetQuote, { color: colors.textMuted }]} numberOfLines={2}>
              {quote}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              tap();
              nav.navigate('Challenges');
            }}
            style={({ pressed }) => [
              styles.streakPill,
              {
                backgroundColor: pressed ? colors.cardPressed : colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Ionicons name="flame" size={17} color={colors.tint.energy} />
            <View style={styles.streakCopy}>
              <Text style={[styles.streakTitle, { color: colors.text }]}>
                {streak} Day{streak === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.streakSub, { color: colors.textMuted }]}>
                {(() => {
                  const next = nextStreakBadge(streak);
                  return next ? `${next.remaining} day${next.remaining === 1 ? '' : 's'} to ${next.label}` : 'All badges unlocked';
                })()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        {/* ── Hero: today's energy ── */}
        <Animated.View entering={FadeInUp.duration(380).delay(60)} style={styles.block}>
          <Pressable
            onPress={() => {
              tap();
              nav.navigate('Activity');
            }}
            style={({ pressed }) => [
              styles.heroCard,
              shadow(isDark, 'lg'),
              { borderColor: colors.cardBorder, opacity: pressed ? 0.94 : 1 },
            ]}
          >
            <SceneryBackdrop variant="mountains" isDark={isDark} />

            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={[styles.eyebrow, { color: onPhotoMuted }]}>
                  TODAY'S ENERGY
                </Text>
                <Text style={[styles.heroValue, { color: onPhoto }]}>{energyScore}%</Text>
                <Text style={[styles.heroSub, { color: onPhotoMuted }]}>
                  {energyCopy}
                </Text>
              </View>

              <EnergyDial progress={energyScore / 100} />
            </View>

            <GlowLineChart
              data={dailySeries}
              color={HERO_ACCENT}
              width={CARD_W}
              height={68}
              style={styles.heroChart}
            />

            <View style={[styles.heroFooter, { borderTopColor: onPhotoRule }]}>
              {[
                { label: 'Calories', value: `${totalCalories}` },
                { label: 'Active Time', value: `${totalMinutes} min` },
                { label: 'Workouts', value: `${weeklyVisits}` },
              ].map((stat, i) => (
                <View
                  key={stat.label}
                  style={[
                    styles.heroStat,
                    i > 0 && { borderLeftWidth: 1, borderLeftColor: onPhotoRule },
                  ]}
                >
                  <Text style={[styles.heroStatLabel, { color: onPhotoMuted }]}>
                    {stat.label}
                  </Text>
                  <Text style={[styles.heroStatValue, { color: onPhoto }]}>{stat.value}</Text>
                </View>
              ))}
              <View style={[styles.heroArrow, { backgroundColor: 'rgba(45,212,191,0.18)' }]}>
                <Ionicons name="arrow-forward" size={15} color={HERO_ACCENT} />
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── Metric tiles ── */}
        <View style={[styles.block, styles.tileGrid]}>
          <MetricTile
            icon="flame"
            label="Calories"
            value={
              totalCalories >= 1000 ? `${(totalCalories / 1000).toFixed(1)}k` : `${totalCalories}`
            }
            status={`${Math.round(moveProgress * 100)}% of goal`}
            tint={colors.tint.energy}
            colors={colors}
            isDark={isDark}
            onPress={() => nav.navigate('Activity')}
            delay={90}
          />
          <MetricTile
            icon="fitness"
            label="Active"
            value={`${totalMinutes}m`}
            status={`${Math.round(exerciseProgress * 100)}% of goal`}
            tint={colors.tint.recovery}
            colors={colors}
            isDark={isDark}
            onPress={() => nav.navigate('Activity')}
            delay={120}
          />
          <MetricTile
            icon="water"
            label="Hydration"
            value={`${(waterLogged / 1000).toFixed(1)}L`}
            status={waterLogged >= waterGoal ? 'Goal met' : `of ${(waterGoal / 1000).toFixed(1)}L`}
            tint={colors.tint.hydration}
            colors={colors}
            isDark={isDark}
            delay={150}
          />
          <MetricTile
            icon="trophy"
            label="Sessions"
            value={`${weeklyVisits}`}
            status="This week"
            tint={colors.tint.oxygen}
            colors={colors}
            isDark={isDark}
            onPress={() => nav.navigate('CheckIns')}
            delay={180}
          />
        </View>

        {/* ── Today's workout ── */}
        <Animated.View entering={FadeInUp.duration(340).delay(200)} style={styles.block}>
          <View
            style={[
              styles.workoutCard,
              shadow(isDark, 'lg'),
              { borderColor: colors.cardBorder },
            ]}
          >
            <SceneryBackdrop variant="equipment" isDark={isDark} scrimStrength={1.1} />

            <View style={styles.workoutBody}>
              <Text style={[styles.eyebrow, { color: onArtMuted }]}>
                TODAY'S WORKOUT
              </Text>
              <Text style={[styles.workoutTitle, { color: onArt }]} numberOfLines={1}>
                {user?.isOnboarded ? 'Your Training Split' : 'Build Your Plan'}
              </Text>
              <Text style={[styles.workoutMeta, { color: onArtMuted }]}>
                {sub?.status === 'ACTIVE' ? `${activeDays} active days left` : 'Personalised by AI'}
              </Text>

              <Pressable
                onPress={handleCreateWorkout}
                style={({ pressed }) => [
                  styles.workoutBtn,
                  {
                    backgroundColor: pressed ? onArtRule : onArtFill,
                    borderColor: onArtRule,
                  },
                ]}
              >
                <Text style={[styles.workoutBtnText, { color: onArt }]}>View Plan</Text>
                <Ionicons name="arrow-forward" size={14} color={onArt} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleCreateWorkout}
              style={({ pressed }) => [
                styles.playFab,
                shadow(isDark, 'md'),
                { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.93 : 1 }] },
              ]}
            >
              <Ionicons name="play" size={21} color="#07231F" style={{ marginLeft: 2 }} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Weekly progress ── */}
        <Animated.View entering={FadeInUp.duration(340).delay(230)} style={styles.block}>
          <GlassCard>
            <View style={styles.weekHead}>
              <View style={styles.weekTitleRow}>
                <View style={[styles.weekIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="stats-chart" size={13} color={colors.primary} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly Progress</Text>
              </View>
              <Pressable
                onPress={() => nav.navigate('Activity')}
                hitSlop={8}
                style={styles.sectionAction}
              >
                <Text style={[styles.sectionActionText, { color: colors.textSecondary }]}>
                  View Details
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.weekStrip}>
              {weekDays.map((d) => (
                <DayRing
                  key={d.label}
                  label={d.label}
                  progress={d.progress}
                  isToday={d.isToday}
                  colors={colors}
                />
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Coach insight ── */}
        <Animated.View entering={FadeInUp.duration(340).delay(260)} style={styles.block}>
          <Pressable
            onPress={() => {
              tap();
              nav.navigate('Chat');
            }}
            style={({ pressed }) => [
              styles.coachCard,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primaryBorder,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View style={[styles.coachIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="sparkles" size={15} color="#07231F" />
            </View>
            <View style={styles.coachCopy}>
              <Text style={[styles.coachTitle, { color: colors.primary }]}>Your Coach</Text>
              <Text style={[styles.coachText, { color: colors.text }]} numberOfLines={3}>
                {summary?.aiInsight ||
                  `You've logged ${weeklyVisits} session${weeklyVisits === 1 ? '' : 's'} and ${totalCalories} kcal this week. Keep the streak alive.`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </Pressable>
        </Animated.View>

        {/* ── Hydration ── */}
        <Animated.View entering={FadeInUp.duration(340).delay(280)} style={styles.block}>
          <GlassCard>
            <View style={styles.weekHead}>
              <View style={styles.weekTitleRow}>
                <View style={[styles.weekIcon, { backgroundColor: `${colors.tint.hydration}1F` }]}>
                  <Ionicons name="water" size={13} color={colors.tint.hydration} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Hydration</Text>
              </View>
              <Text style={[styles.hydrationValue, { color: colors.tint.hydration }]}>
                {waterLogged} / {waterGoal} ml
              </Text>
            </View>

            <View style={[styles.hydrationTrack, { backgroundColor: colors.textFaint }]}>
              <View
                style={[
                  styles.hydrationFill,
                  {
                    width: `${Math.max(2, waterProgress * 100)}%`,
                    backgroundColor: colors.tint.hydration,
                  },
                ]}
              />
            </View>

            <View style={styles.hydrationBtns}>
              <Pressable
                onPress={() => handleWaterIncrement(-250)}
                disabled={waterLogged <= 0}
                style={({ pressed }) => [
                  styles.hydrationBtn,
                  {
                    backgroundColor: pressed ? colors.cardPressed : 'transparent',
                    borderColor: colors.cardBorder,
                    opacity: waterLogged <= 0 ? 0.4 : 1,
                  },
                ]}
              >
                <Ionicons name="remove" size={18} color={colors.textSecondary} />
                <Text style={[styles.hydrationBtnText, { color: colors.textSecondary }]}>
                  250 ml
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleWaterIncrement(250)}
                disabled={waterLogged >= waterGoal}
                style={({ pressed }) => [
                  styles.hydrationBtn,
                  {
                    backgroundColor: pressed
                      ? colors.cardPressed
                      : `${colors.tint.hydration}1A`,
                    borderColor: `${colors.tint.hydration}40`,
                    opacity: waterLogged >= waterGoal ? 0.4 : 1,
                  },
                ]}
              >
                <Ionicons name="add" size={18} color={colors.tint.hydration} />
                <Text style={[styles.hydrationBtnText, { color: colors.tint.hydration }]}>
                  250 ml
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>

        {/* ── Quick actions ── */}
        <View style={styles.block}>
          <SectionHeading title="Quick Actions" colors={colors} />
          <View style={styles.actionGrid}>
            {(
              [
                { title: 'Diet Plan', icon: 'nutrition', tint: colors.tint.recovery, onPress: handleCreateDiet },
                { title: 'Classes', icon: 'calendar', tint: colors.tint.hydration, onPress: () => nav.navigate('Classes') },
                { title: 'Body Profile', icon: 'body', tint: colors.tint.energy, onPress: () => nav.navigate('Onboarding') },
                { title: 'Store', icon: 'bag-handle', tint: colors.tint.sleep, onPress: () => nav.navigate('Products') },
              ] as const
            ).map((a, i) => (
              <Animated.View
                key={a.title}
                entering={FadeInUp.duration(300).delay(300 + i * 30)}
                style={styles.actionWrap}
              >
                <Pressable
                  onPress={() => {
                    tap();
                    a.onPress();
                  }}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    shadow(isDark, 'sm'),
                    {
                      backgroundColor: pressed ? colors.cardPressed : colors.surface,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <View style={[styles.actionIcon, { backgroundColor: `${a.tint}1F` }]}>
                    <Ionicons name={a.icon} size={19} color={a.tint} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1}>
                    {a.title}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* ── Upcoming class ── */}
        <Animated.View entering={FadeInUp.duration(340).delay(420)} style={styles.block}>
          <Pressable
            onPress={() => {
              tap();
              nav.navigate('Classes');
            }}
            style={({ pressed }) => [
              styles.upcomingCard,
              shadow(isDark, 'sm'),
              {
                backgroundColor: pressed ? colors.cardPressed : colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={[styles.upcomingIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="calendar" size={19} color={colors.primary} />
            </View>
            <View style={styles.upcomingCopy}>
              <Text style={[styles.upcomingTitle, { color: colors.text }]}>Book a Class</Text>
              <Text style={[styles.upcomingSub, { color: colors.textMuted }]}>
                See this week's schedule
              </Text>
            </View>
            <View style={[styles.upcomingCta, { backgroundColor: colors.primary }]}>
              <Text style={styles.upcomingCtaText}>Browse</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── BMI ── */}
        <Animated.View entering={FadeInUp.duration(340).delay(450)} style={styles.block}>
          <GlassCard>
            <View style={styles.weekHead}>
              <View style={styles.weekTitleRow}>
                <View style={[styles.weekIcon, { backgroundColor: `${bmiColor}1F` }]}>
                  <Ionicons name="body" size={13} color={bmiColor} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Body Mass Index</Text>
              </View>
              <View style={[styles.bmiBadge, { backgroundColor: `${bmiColor}1F` }]}>
                <Text style={[styles.bmiBadgeText, { color: bmiColor }]}>{bmiCategory}</Text>
              </View>
            </View>

            <View style={styles.bmiRow}>
              <Text style={[styles.bmiValue, { color: colors.text }]}>{bmi}</Text>

              <View style={styles.bmiControls}>
                {(
                  [
                    { label: 'Weight (kg)', value: weight, set: setWeight, min: 30, max: 250 },
                    { label: 'Height (cm)', value: height, set: setHeight, min: 100, max: 230 },
                  ] as const
                ).map((c) => (
                  <View key={c.label} style={styles.bmiControl}>
                    <Text style={[styles.bmiControlLabel, { color: colors.textMuted }]}>
                      {c.label}
                    </Text>
                    <View style={styles.bmiStepper}>
                      <Pressable
                        hitSlop={6}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          c.set((v) => Math.max(c.min, v - 1));
                        }}
                      >
                        <Ionicons name="remove-circle-outline" size={22} color={colors.textSecondary} />
                      </Pressable>
                      <Text style={[styles.bmiControlValue, { color: colors.text }]}>
                        {c.value}
                      </Text>
                      <Pressable
                        hitSlop={6}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          c.set((v) => Math.min(c.max, v + 1));
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.bmiScale}>
              <View style={[styles.bmiSeg, { backgroundColor: colors.info, flex: 1.85 }]} />
              <View style={[styles.bmiSeg, { backgroundColor: colors.success, flex: 0.65 }]} />
              <View style={[styles.bmiSeg, { backgroundColor: colors.warning, flex: 0.5 }]} />
              <View style={[styles.bmiSeg, { backgroundColor: colors.danger, flex: 1 }]} />
              <Animated.View
                layout={Layout.springify()}
                style={[
                  styles.bmiPip,
                  {
                    left: `${Math.min(97, Math.max(0, ((bmiValue - 10) / 30) * 100))}%`,
                    backgroundColor: colors.text,
                  },
                ]}
              />
            </View>
          </GlassCard>
        </Animated.View>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingBottom: 10,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  wordmark: {
    fontFamily: FONTS.displaySemi,
    fontSize: 15,
    letterSpacing: 2.6,
    flexShrink: 1,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },

  /* Layout */
  block: { paddingHorizontal: GUTTER, marginBottom: SPACING.md },

  /* Greeting */
  greetBlock: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  greetCopy: { flex: 1 },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greetLabel: { ...TYPOGRAPHY.body, fontFamily: FONTS.bodyMedium },
  greetName: { ...TYPOGRAPHY.hero, marginTop: 1 },
  greetQuote: { ...TYPOGRAPHY.caption, marginTop: 3, fontSize: 13 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    marginTop: 4,
  },
  streakCopy: { alignItems: 'flex-start' },
  streakTitle: { fontFamily: FONTS.bodySemi, fontSize: 13.5, letterSpacing: -0.2 },
  streakSub: { fontFamily: FONTS.body, fontSize: 10.5, marginTop: 1 },

  /* Hero */
  heroCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    minHeight: 250,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: SPACING.md + 2,
    paddingBottom: 0,
  },
  heroCopy: { flex: 1 },
  eyebrow: { ...TYPOGRAPHY.eyebrow },
  heroValue: { ...TYPOGRAPHY.display, marginTop: 6 },
  heroSub: { ...TYPOGRAPHY.body, marginTop: 2 },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  heroChart: { marginTop: -6 },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    // Pinned: the card's minHeight exceeds its content, and without this the
    // footer floats mid-card with a strip of artwork stranded below the rule.
    marginTop: 'auto',
    borderTopWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 4,
  },
  heroStat: { flex: 1, paddingHorizontal: 8 },
  heroStatLabel: { fontFamily: FONTS.body, fontSize: 10.5 },
  heroStatValue: { fontFamily: FONTS.displaySemi, fontSize: 15, marginTop: 2, letterSpacing: -0.2 },
  heroArrow: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Metric tiles */
  tileGrid: { flexDirection: 'row', gap: 9 },
  tileWrap: { flex: 1 },
  tile: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    padding: 11,
    minHeight: 108,
  },
  tileIcon: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  tileLabel: { fontFamily: FONTS.body, fontSize: 10.5 },
  tileValue: { fontFamily: FONTS.displaySemi, fontSize: 19, letterSpacing: -0.5, marginTop: 2 },
  tileStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  tileDot: { width: 5, height: 5, borderRadius: 2.5 },
  tileStatus: { fontFamily: FONTS.body, fontSize: 9.5, flex: 1 },

  /* Today's workout */
  workoutCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    minHeight: 172,
    justifyContent: 'flex-end',
  },
  workoutBody: { padding: SPACING.md + 2, paddingRight: 88 },
  workoutTitle: { ...TYPOGRAPHY.title, marginTop: 6 },
  workoutMeta: { ...TYPOGRAPHY.caption, fontSize: 12.5, marginTop: 3 },
  workoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginTop: 14,
  },
  workoutBtnText: { fontFamily: FONTS.bodySemi, fontSize: 13 },
  playFab: {
    position: 'absolute',
    right: SPACING.md + 2,
    bottom: SPACING.md + 2,
    width: 54,
    height: 54,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Cards */
  cardTitle: { ...TYPOGRAPHY.heading, fontSize: 16 },
  weekHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  weekTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  weekIcon: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm + 2,
  },
  sectionTitle: { ...TYPOGRAPHY.heading, fontSize: 16 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontFamily: FONTS.bodyMedium, fontSize: 12.5 },

  /* Weekly strip */
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', flex: 1 },
  dayLabel: { fontSize: 11 },
  dayRingSlot: { height: 32, justifyContent: 'center', marginTop: 8 },
  dayToday: { fontFamily: FONTS.bodyMedium, fontSize: 9.5, marginTop: 3 },

  /* Coach */
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  coachIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachCopy: { flex: 1 },
  coachTitle: { fontFamily: FONTS.bodySemi, fontSize: 12.5, marginBottom: 2 },
  coachText: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 18.5 },

  /* Hydration */
  hydrationValue: { fontFamily: FONTS.bodySemi, fontSize: 13 },
  hydrationTrack: { height: 8, borderRadius: RADIUS.full, overflow: 'hidden' },
  hydrationFill: { height: '100%', borderRadius: RADIUS.full },
  hydrationBtns: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  hydrationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  hydrationBtnText: { fontFamily: FONTS.bodySemi, fontSize: 13 },

  /* Quick actions */
  actionGrid: { flexDirection: 'row', gap: 9 },
  actionWrap: { flex: 1 },
  actionBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: { fontFamily: FONTS.bodyMedium, fontSize: 11 },

  /* Upcoming */
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  upcomingIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingCopy: { flex: 1 },
  upcomingTitle: { fontFamily: FONTS.displaySemi, fontSize: 15, letterSpacing: -0.2 },
  upcomingSub: { fontFamily: FONTS.body, fontSize: 12, marginTop: 2 },
  upcomingCta: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: RADIUS.full },
  upcomingCtaText: { color: '#07231F', fontFamily: FONTS.bodySemi, fontSize: 12.5 },

  /* BMI */
  bmiBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  bmiBadgeText: { fontFamily: FONTS.bodySemi, fontSize: 11 },
  bmiRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  bmiValue: { fontFamily: FONTS.displayBold, fontSize: 42, letterSpacing: -1.5 },
  bmiControls: { flex: 1, gap: 10 },
  bmiControl: {},
  bmiControlLabel: { fontFamily: FONTS.body, fontSize: 11, marginBottom: 3 },
  bmiStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bmiControlValue: { fontFamily: FONTS.displaySemi, fontSize: 16 },
  bmiScale: {
    flexDirection: 'row',
    height: 6,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  bmiSeg: { height: '100%' },
  bmiPip: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 12,
    borderRadius: 2,
  },
});
