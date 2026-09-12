import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInRight, Layout, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { shade } from '../../utils/color';
import { FONT_SIZE, FONTS, GRADIENTS, RADIUS, SPACING } from '../../config/theme';
import { ActiveSubscription, User, ActivitySummary, CheckIn } from '../../types';
import { getCheckIns } from '../../services/member.service';
import { getActivitySummary, logWater } from '../../services/activity.service';
import { RootStackParams, TabParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { FitnessAvatar } from '../../components/ui/FitnessAvatar';
import { AppleActivityRings } from '../../components/ui/AppleActivityRings';
import { HeroFigure3D } from '../../components/ui/HeroFigure3D';
import { GymLogo } from '../../components/ui/GymLogo';
import { MOTIVATIONAL_QUOTES } from '../../constants/quotes';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParams, 'Home'>,
  NativeStackNavigationProp<RootStackParams>
>;

const daysRemaining = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// Compact horizontal action icon for Quick Actions row
const QuickAction: React.FC<{
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accent: string;
  delay?: number;
}> = ({ title, icon, onPress, accent, delay = 0 }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = useThemeColors();

  return (
    <Animated.View entering={FadeInUp.duration(300).delay(delay)} style={styles.quickActionWrap}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.quickActionBtn, pressed && { transform: [{ scale: 0.92 }], opacity: 0.8 }]}>
        <View style={[
          styles.quickActionIconWrap,
          {
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
          }
        ]}>
          <BlurView tint={isDark ? 'dark' : 'light'} intensity={Platform.OS === 'ios' ? 60 : 100} style={StyleSheet.absoluteFill} />
          {/* Subtle accent glow inside the glass */}
          <LinearGradient
            colors={[`${accent}40`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Ionicons name={icon} size={24} color={accent} style={{ zIndex: 2 }} />
        </View>
        <Text style={[styles.quickActionTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
};

const ProductsBanner: React.FC<{ onPress: () => void; delay?: number }> = ({ onPress, delay = 0 }) => {
  const colors = useThemeColors();
  const floatY = useSharedValue(0);

  React.useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }]
  }));

  return (
    <Animated.View entering={FadeInUp.duration(300).delay(delay)} style={styles.productsBannerWrap}>
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] }]}>
        <LinearGradient
          colors={[colors.accent, shade(colors.accent, -0.25), shade(colors.accent, -0.45)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.productsBanner}
        >
          <View style={styles.productsBannerGlow} />
          <View style={styles.productsBannerContent}>
            <Animated.View style={[styles.productsBannerIcon, iconStyle]}>
              <Ionicons name="bag-handle" size={28} color="#fff" />
            </Animated.View>
            <View style={styles.productsBannerCopy}>
              <Text style={styles.productsBannerEyebrow}>GYM STORE</Text>
              <Text style={styles.productsBannerTitle}>Shop Products</Text>
              <Text style={styles.productsBannerSubtitle}>Supplements, gear & essentials</Text>
            </View>
            <View style={styles.productsBannerArrow}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const calcTotalMinutes = (checkIns: CheckIn[]): number => {
  return checkIns.reduce((total, ci) => {
    if (!ci.checkedOutAt) return total + 45;
    const diff = new Date(ci.checkedOutAt).getTime() - new Date(ci.checkedInAt).getTime();
    return total + Math.round(diff / 60000);
  }, 0);
};

const estimateCalories = (totalMinutes: number): number => Math.round(totalMinutes * 8);

export const HomeScreen: React.FC = () => {
  const { user, refreshUser, gym, theme, toggleTheme } = useAuth();
  const nav = useNavigation<HomeNavProp>();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const colors = useThemeColors();

  const [refreshing, setRefreshing] = useState(false);
  const [waterLogged, setWaterLogged] = useState(0); // in ml
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);

  const loadActivityData = useCallback(async () => {
    try {
      const [checkInRes, summaryRes] = await Promise.all([
        getCheckIns(1, 15),
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
    }, [loadActivityData])
  );

  const sub = (user as User & { activeSubscription?: ActiveSubscription | null })?.activeSubscription;
  const activeDays = sub?.status === 'ACTIVE' ? daysRemaining(sub.endDate) : 0;

  // Pulse animation for the Daily Workout button
  const pulseScale = useSharedValue(1);
  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }]
  }));

  // Local BMI State
  const [weight, setWeight] = useState(75); // kg
  const [height, setHeight] = useState(175); // cm
  const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
  const bmiValue = parseFloat(bmi);
  let bmiCategory = 'Normal';
  let bmiColor: string = colors.success;
  if (bmiValue < 18.5) { bmiCategory = 'Underweight'; bmiColor = colors.info; }
  else if (bmiValue > 25) { bmiCategory = 'Overweight'; bmiColor = colors.warning; }
  else if (bmiValue > 30) { bmiCategory = 'Obese'; bmiColor = colors.danger; }

  const requireProfile = (): boolean => {
    if (!user?.isOnboarded) {
      Alert.alert('Profile Required', 'Complete your fitness profile before generating AI plans.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Set Up Profile', onPress: () => nav.navigate('Onboarding') },
      ]);
      return false;
    }
    return true;
  };

  const openRootScreen = (name: 'DietPlan' | 'WorkoutPlan') => {
    nav.dispatch(CommonActions.navigate({ name }));
  };

  const handleCreateDiet = () => {
    if (!requireProfile()) return;
    openRootScreen('DietPlan');
  };

  const handleCreateWorkout = () => {
    if (!requireProfile()) return;
    openRootScreen('WorkoutPlan');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadActivityData()]);
    setRefreshing(false);
  }, [refreshUser, loadActivityData]);

  const handleWaterIncrement = async (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    const newTotal = Math.max(0, Math.min(2000, waterLogged + amount));
    if (newTotal === waterLogged) return;
    const diff = newTotal - waterLogged;
    setWaterLogged(newTotal);

    if (newTotal >= 2000 && diff > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    try {
      await logWater({ amountMl: diff });
      loadActivityData();
    } catch (e) {
      console.log('Water log API error from home:', e);
    }
  };

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const quoteIndex = dayOfYear % MOTIVATIONAL_QUOTES.length;

  const handleNotificationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    nav.navigate('Notifications');
  };

  const handleProductsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    nav.navigate('Products');
  };

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
  const waterProgress = Math.min(1, waterLogged / 2000);

  return (
    <AnimatedScreen noBackground>
      {/* Floating Modern Pill Header */}
      <View style={[styles.floatingHeader, {
        top: Math.max(insets.top, 8),
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(200,205,215,0.5)',
        backgroundColor: isDark ? 'rgba(15,15,25,0.5)' : 'rgba(255,255,255,0.55)',
      }]}>
        <BlurView
          tint={isDark ? "dark" : "light"}
          intensity={isDark ? 50 : 70}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
              : ['rgba(255,255,255,0.5)', 'rgba(245,247,250,0.2)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.topBar}>
          <View style={styles.profileSummaryRow}>
            <GymLogo name={gym?.name} logo={gym?.logo} size={36} />
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {gym?.name ?? 'Clasendra'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start' }}>
                <Ionicons name="trophy" size={10} color="#FFD700" />
                <Text style={{ fontSize: 10, fontFamily: FONTS.bodyBold, color: '#FFD700', marginLeft: 4 }}>Gold Tier</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.minimalButton} onPress={toggleTheme}>
              <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color={colors.text} />
            </Pressable>
            <Pressable style={styles.minimalButton} onPress={handleNotificationPress}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              {/* Badge is hidden when there are no unread notifications */}
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + 118, paddingTop: Math.max(insets.top, 16) + 65 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} progressViewOffset={Math.max(insets.top, 16) + 65} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* Condensed Hero Section */}
        <View style={styles.hero}>
          <Animated.View entering={FadeInUp.duration(400).delay(80)} style={styles.heroTextBlock}>
            <Text style={[styles.heroGreeting, { color: colors.textSecondary }]}>
              {greeting()} 👋
            </Text>
            <Pressable onPress={() => nav.navigate('Profile')} style={styles.heroBrandRow}>
              <FitnessAvatar name={user?.name} uri={user?.avatarUrl} size={36} />
              <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={1}>
                {user?.name ?? 'Member'}
              </Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInRight.duration(500).delay(200)} style={styles.heroFigureWrap}>
            <HeroFigure3D size={110} />
          </Animated.View>
        </View>

        {/* Dynamic Island Motivation Banner (Compact) */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.motivationWrap}>
          <LinearGradient
            colors={isDark ? [`${colors.accent}26`, `${colors.accent}0D`] : [`${colors.accent}1F`, `${colors.accent}08`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.motivationBanner, { borderColor: `${colors.accent}33` }]}
          >
            <View style={[styles.motivationIconWrap, { backgroundColor: colors.accent }]}>
              <Ionicons name="sparkles" size={12} color="#FFF" />
            </View>
            <Text style={[styles.motivationText, { color: colors.accent }]}>
              {MOTIVATIONAL_QUOTES[quoteIndex]}
            </Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.dashboardBody}>
          {sub ? (
            <Animated.View entering={FadeInUp.duration(320).delay(102)}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); nav.navigate('Membership'); }}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              >
                <GlassCard noPadding innerStyle={styles.subStatusInner}>
                  <View
                    style={[
                      styles.subStatusDot,
                      { backgroundColor: sub.status === 'ACTIVE' ? colors.success : sub.status === 'FROZEN' ? colors.warning : colors.danger },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subStatusTitle, { color: colors.text }]}>
                      {sub.plan.name} · {sub.status === 'ACTIVE' ? 'Active' : sub.status.charAt(0) + sub.status.slice(1).toLowerCase()}
                    </Text>
                    <Text style={[styles.subStatusSub, { color: colors.textMuted }]}>
                      {sub.status === 'ACTIVE' ? `Renews in ${activeDays} days` : 'Tap to manage your membership'}
                    </Text>
                  </View>
                  <Text style={[styles.subStatusCta, { color: colors.primary }]}>Manage</Text>
                </GlassCard>
              </Pressable>
            </Animated.View>
          ) : null}

          {/* Bento Box Dashboard: Rings + Water side by side */}
          <View style={[styles.bentoBox, { marginBottom: SPACING.sm }]}>
            {/* Left: Activity Rings */}
            <Animated.View entering={FadeInUp.duration(320).delay(105)} style={styles.bentoLeft}>
              <Pressable style={{ flex: 1 }} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                nav.navigate('Activity');
              }}>
                <GlassCard glowColor={colors.accent} style={styles.bentoCard} innerStyle={{ flex: 1, padding: SPACING.md }}>
                  <Text style={[styles.bentoTitle, { color: colors.textSecondary }]}>ACTIVITY</Text>
                  <View style={styles.ringsWrap}>
                    <AppleActivityRings
                      moveProgress={moveProgress}
                      exerciseProgress={exerciseProgress}
                      standProgress={waterProgress}
                      size={100}
                    />
                  </View>
                  <View style={styles.bentoLegendRow}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={styles.bentoLegendDot}><Ionicons name="flame" size={10} color={colors.danger} /></View>
                      <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, fontFamily: FONTS.bodyMedium }}>Move</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <View style={styles.bentoLegendDot}><Ionicons name="fitness" size={10} color={colors.success} /></View>
                      <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, fontFamily: FONTS.bodyMedium }}>Exercise</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <View style={styles.bentoLegendDot}><Ionicons name="water" size={10} color={colors.info} /></View>
                      <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, fontFamily: FONTS.bodyMedium }}>Hydrate</Text>
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            </Animated.View>

            {/* Right: Water Tracker */}
            <Animated.View entering={FadeInUp.duration(320).delay(110)} style={styles.bentoRight}>
              <GlassCard glowColor="#29B6F6" style={styles.bentoCard} innerStyle={{ flex: 1, padding: SPACING.md }}>
                <View style={styles.bentoHeaderRow}>
                  <Text style={[styles.bentoTitle, { color: colors.textSecondary }]}>HYDRATION</Text>
                  <Text style={[styles.bentoValue, { color: '#29B6F6' }]}>{Math.min(2000, waterLogged)} ml</Text>
                </View>

                {/* Vertical Water Bar */}
                <View style={styles.bentoWaterBody}>
                  <View style={[styles.verticalProgressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
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
                    {waterLogged >= 2000 ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(41, 182, 246, 0.15)', padding: 6, borderRadius: 12, alignItems: 'center', width: '100%' }}>
                          <Ionicons name="water" size={20} color="#29B6F6" />
                          <Text style={{ color: '#29B6F6', fontSize: 10, fontFamily: FONTS.bodyBold, textAlign: 'center', marginTop: 2 }}>
                            Wah! 🎉{'\n'}Goal Met
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Pressable
                          style={[styles.bentoWaterBtn, { backgroundColor: 'rgba(41,182,246,0.15)' }]}
                          onPress={() => handleWaterIncrement(250)}
                        >
                          <Ionicons name="add" size={20} color="#29B6F6" />
                        </Pressable>
                        <Pressable
                          style={[styles.bentoWaterBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                          onPress={() => handleWaterIncrement(-250)}
                        >
                          <Ionicons name="remove" size={20} color={colors.textSecondary} />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          </View>

          {/* 📊 Enhanced Gym Stats (Weekly Snapshot) */}
          <Animated.View entering={FadeInUp.duration(320).delay(115)}>
            <GlassCard glowColor={colors.primary} style={{ marginBottom: SPACING.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>WEEKLY SNAPSHOT</Text>
                <Ionicons name="bar-chart" size={16} color={colors.primary} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                {/* Metric 1 */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontFamily: FONTS.bodyExtra, color: colors.text }}>{weeklyVisits}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontFamily: FONTS.bodySemi }}>WORKOUTS</Text>
                  <Text style={{ fontSize: 10, color: colors.success, marginTop: 4 }}>This Week</Text>
                </View>
                <View style={{ width: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginHorizontal: 8 }} />
                {/* Metric 2 */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontFamily: FONTS.bodyExtra, color: colors.text }}>
                    {totalCalories >= 1000 ? `${(totalCalories / 1000).toFixed(1)}k` : String(totalCalories)}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontFamily: FONTS.bodySemi }}>KCAL BURNED</Text>
                  <Text style={{ fontSize: 10, color: colors.success, marginTop: 4 }}>Est. Total</Text>
                </View>
                <View style={{ width: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginHorizontal: 8 }} />
                {/* Metric 3 */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontFamily: FONTS.bodyExtra, color: colors.text }}>{totalMinutes}m</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontFamily: FONTS.bodySemi }}>ACTIVE TIME</Text>
                  <Text style={{ fontSize: 10, color: colors.success, marginTop: 4 }}>Gym Time</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Daily Goal Premium Banner */}
          <Animated.View entering={FadeInUp.duration(320).delay(120)}>
            <Pressable onPress={handleCreateWorkout} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
              <LinearGradient
                colors={[...GRADIENTS.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dailyWorkoutBanner}
              >
                <View style={styles.dailyWorkoutGlow} />
                <View style={styles.dailyWorkoutCopy}>
                  <Text style={styles.dailyWorkoutTitle}>Start Daily Workout</Text>
                  <Text style={styles.dailyWorkoutSub}>
                    {sub?.status === 'ACTIVE' ? `${activeDays} active days left` : "View your training split & sets"}
                  </Text>
                </View>
                <Animated.View style={[styles.dailyWorkoutPlayBtn, pulseStyle]}>
                  <Ionicons name="play" size={20} color={colors.primary} />
                </Animated.View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Quick Actions - Horizontal Scroll (Saves Vertical Space) */}
          <View style={styles.quickActionsContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
              <QuickAction title="Diet Plan" icon="nutrition" onPress={handleCreateDiet} accent={colors.success} delay={140} />
              <QuickAction title="Classes" icon="calendar" onPress={() => nav.navigate('Classes')} accent={colors.info} delay={160} />
              <QuickAction title="Body Profile" icon="body" onPress={() => nav.navigate('Onboarding')} accent={colors.warning} delay={180} />
              <QuickAction title="Settings" icon="settings" onPress={() => nav.navigate('Profile')} accent={colors.accent} delay={200} />
            </ScrollView>
          </View>

          {/* 📅 Upcoming Schedule */}
          <Animated.View entering={FadeInUp.duration(320).delay(240)}>
            <GlassCard glowColor={colors.info} style={{ marginBottom: SPACING.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ backgroundColor: `${colors.info}15`, padding: 10, borderRadius: 12 }}>
                    <Ionicons name="calendar" size={24} color={colors.info} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontFamily: FONTS.bodyBold, color: colors.text }}>HIIT Cardio</Text>
                    <Text style={{ fontSize: 13, color: colors.info, marginTop: 2, fontFamily: FONTS.bodySemi }}>Starts in 45 mins</Text>
                  </View>
                </View>
                <Pressable onPress={() => nav.navigate('Classes')} style={{ backgroundColor: colors.info, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                  <Text style={{ color: '#FFF', fontFamily: FONTS.bodyBold, fontSize: 13 }}>Join</Text>
                </Pressable>
              </View>
            </GlassCard>
          </Animated.View>

          {/* 🤖 FitCoach AI Insight */}
          <Animated.View entering={FadeInUp.duration(320).delay(250)}>
            <GlassCard glowColor={colors.accent} style={{ marginBottom: SPACING.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ backgroundColor: `${colors.accent}15`, padding: 10, borderRadius: 12 }}>
                  <Ionicons name="hardware-chip" size={24} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: FONTS.bodyBold, color: colors.accent, marginBottom: 4 }}>FitCoach AI Insight</Text>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
                    {summary?.aiInsight || `You're on a roll! You've burned ${totalCalories} kcal this week across ${weeklyVisits} workouts. Keep pushing to hit your goal!`}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Interactive BMI Widget */}
          <Animated.View entering={FadeInUp.duration(320).delay(260)}>
            <GlassCard glowColor={bmiColor} style={styles.bmiCard} noPadding>
              <View style={{ padding: SPACING.md }}>
                <View style={styles.bmiHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BMI CALCULATOR</Text>
                  <View style={[styles.bmiBadge, { backgroundColor: `${bmiColor}22` }]}>
                    <Text style={[styles.bmiBadgeText, { color: bmiColor }]}>{bmiCategory}</Text>
                  </View>
                </View>

                <View style={styles.bmiDisplayRow}>
                  <Text style={[styles.bmiValue, { color: colors.text }]}>{bmi}</Text>
                  <View style={styles.bmiControlsWrap}>
                    <View style={styles.bmiControl}>
                      <Text style={[styles.bmiControlLabel, { color: colors.textMuted }]}>Weight (kg)</Text>
                      <View style={styles.bmiStepper}>
                        <Pressable onPress={() => { Haptics.selectionAsync(); setWeight(w => w - 1) }}>
                          <Ionicons name="remove-circle" size={24} color={colors.textSecondary} />
                        </Pressable>
                        <Text style={[styles.bmiControlValue, { color: colors.text }]}>{weight}</Text>
                        <Pressable onPress={() => { Haptics.selectionAsync(); setWeight(w => w + 1) }}>
                          <Ionicons name="add-circle" size={24} color={colors.primary} />
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.bmiControl}>
                      <Text style={[styles.bmiControlLabel, { color: colors.textMuted }]}>Height (cm)</Text>
                      <View style={styles.bmiStepper}>
                        <Pressable onPress={() => { Haptics.selectionAsync(); setHeight(h => h - 1) }}>
                          <Ionicons name="remove-circle" size={24} color={colors.textSecondary} />
                        </Pressable>
                        <Text style={[styles.bmiControlValue, { color: colors.text }]}>{height}</Text>
                        <Pressable onPress={() => { Haptics.selectionAsync(); setHeight(h => h + 1) }}>
                          <Ionicons name="add-circle" size={24} color={colors.info} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>

                {/* BMI Scale Bar */}
                <View style={styles.bmiScale}>
                  <View style={[styles.bmiScaleSegment, { backgroundColor: colors.info, flex: 1.85 }]} />
                  <View style={[styles.bmiScaleSegment, { backgroundColor: colors.success, flex: 0.65 }]} />
                  <View style={[styles.bmiScaleSegment, { backgroundColor: colors.warning, flex: 0.5 }]} />
                  <View style={[styles.bmiScaleSegment, { backgroundColor: colors.danger, flex: 1 }]} />
                  {/* Indicator Pip */}
                  <Animated.View
                    layout={Layout.springify()}
                    style={[styles.bmiIndicator, { left: `${Math.min(100, Math.max(0, (bmiValue - 10) / 30 * 100))}%`, backgroundColor: colors.text }]}
                  />
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          <ProductsBanner onPress={handleProductsPress} delay={280} />
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Hero (Condensed)
  hero: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  heroGreeting: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONTS.bodySemi,
    letterSpacing: 0.3,
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  heroTitle: {
    flexShrink: 1,
    fontSize: 24,
    fontFamily: FONTS.displayExtra,
    letterSpacing: -0.5,
  },
  heroFigureWrap: {
    marginTop: -20,
    marginRight: -10,
  },

  // Floating Header
  floatingHeader: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 100,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  name: {
    fontSize: 15,
    fontFamily: FONTS.bodyExtra,
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  minimalButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Dynamic Island Motivation Banner
  motivationWrap: {
    paddingHorizontal: 14,
    marginBottom: SPACING.md,
  },
  motivationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  motivationIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  motivationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.2,
  },

  dashboardBody: {
    paddingHorizontal: 14,
    gap: SPACING.md,
  },

  // Subscription status strip
  subStatusInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
  },
  subStatusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  subStatusTitle: { fontSize: 12.5, fontFamily: FONTS.bodyBold },
  subStatusSub: { fontSize: 11, marginTop: 2 },
  subStatusCta: { fontSize: 11, fontFamily: FONTS.bodyBold, flexShrink: 0 },

  // Daily Workout Banner
  dailyWorkoutBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#2DD4C8',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dailyWorkoutGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  dailyWorkoutCopy: {
    flex: 1,
  },
  dailyWorkoutTitle: {
    color: '#04211F',
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.5,
  },
  dailyWorkoutSub: {
    color: 'rgba(4,33,31,0.7)',
    fontSize: FONT_SIZE.xs,
    fontFamily: FONTS.bodyMedium,
    marginTop: 2,
  },
  dailyWorkoutPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3, // visually center the play icon
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },

  // Quick Actions (Horizontal)
  quickActionsContainer: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    marginLeft: 4,
  },
  quickActionsScroll: {
    gap: SPACING.md,
    paddingHorizontal: 4,
  },
  quickActionWrap: {
    width: 72,
    alignItems: 'center',
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  quickActionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    textAlign: 'center',
  },

  // Bento Box
  bentoBox: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    height: 170, // Fixed height to prevent child from expanding parent
  },
  bentoLeft: {
    flex: 1,
    height: '100%',
  },
  bentoRight: {
    width: 135, // slightly wider for buttons
    height: '100%',
  },
  bentoCard: {
    flex: 1,
  },
  bentoTitle: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtra,
    letterSpacing: 0.8,
  },

  // Rings
  ringsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.xs,
  },
  bentoLegendDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.04)', // Will be invisible mostly, just a circle around icon
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Vertical Water Tracker
  bentoHeaderRow: {
    marginBottom: 4,
  },
  bentoValue: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    marginTop: 1,
  },
  bentoWaterBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  verticalProgressBarBg: {
    width: 32,
    height: '100%',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  verticalProgressBarFill: {
    width: '100%',
    backgroundColor: '#29B6F6',
    borderRadius: RADIUS.full,
  },
  bentoWaterControls: {
    justifyContent: 'space-between',
    height: '100%',
  },
  bentoWaterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // BMI Calculator
  bmiCard: {
    marginTop: 2,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bmiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  bmiBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtra,
    textTransform: 'uppercase',
  },
  bmiDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  bmiValue: {
    fontSize: 48,
    fontFamily: FONTS.displayExtra,
    letterSpacing: -1,
  },
  bmiControlsWrap: {
    gap: SPACING.sm,
  },
  bmiControl: {
    alignItems: 'flex-end',
  },
  bmiControlLabel: {
    fontSize: 10,
    fontFamily: FONTS.bodyBold,
    marginBottom: 2,
  },
  bmiStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bmiControlValue: {
    fontSize: 14,
    fontFamily: FONTS.bodyExtra,
    minWidth: 24,
    textAlign: 'center',
  },
  bmiScale: {
    height: 6,
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: SPACING.xs,
    position: 'relative',
  },
  bmiScaleSegment: {
    height: '100%',
  },
  bmiIndicator: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 4,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },

  // Products Banner
  productsBannerWrap: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  productsBanner: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    minHeight: 96,
    justifyContent: 'center',
    shadowColor: '#7C8CFF',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  productsBannerGlow: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  productsBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  productsBannerIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  productsBannerCopy: {
    flex: 1,
    gap: 2,
  },
  productsBannerEyebrow: {
    fontSize: 10,
    fontFamily: FONTS.bodyExtra,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.75)',
  },
  productsBannerTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.displayBold,
    color: '#FFF',
  },
  productsBannerSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.75)',
  },
  productsBannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
