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
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp, FadeInRight, Layout, ZoomIn, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING, GRADIENTS } from '../../config/theme';
import { ActiveSubscription, User } from '../../types';
import { RootStackParams, TabParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { FitnessAvatar } from '../../components/ui/FitnessAvatar';
import { AppleActivityRings } from '../../components/ui/AppleActivityRings';
import { HeroFigure3D } from '../../components/ui/HeroFigure3D';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParams, 'Home'>,
  NativeStackNavigationProp<RootStackParams>
>;

const MOTIVATIONAL_QUOTES = [
  "The only bad workout is the one that didn't happen. ⚡",
  "Your body can stand almost anything. Convince your mind. 🧠",
  "Success starts with self-discipline. 🎯",
  "No pain, no gain. Shut up and train! 🦾",
  "Energy flows where attention goes. Focus on your goals today. 🔥"
];

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
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

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
          colors={['#5B21B6', '#7C3AED', '#9333EA']}
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

export const HomeScreen: React.FC = () => {
  const { user, refreshUser, theme, toggleTheme } = useAuth();
  const nav = useNavigation<HomeNavProp>();
  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [refreshing, setRefreshing] = useState(false);
  const [waterLogged, setWaterLogged] = useState(1250); // in ml
  const [quoteIndex, setQuoteIndex] = useState(0);

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
  let bmiColor = colors.success;
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
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const handleWaterIncrement = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setWaterLogged((prev) => Math.max(0, Math.min(4000, prev + amount)));
  };

  const handleQuoteCycle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

  const handleNotificationPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    nav.navigate('Notifications');
  };

  const handleProductsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    nav.navigate('Products');
  };

  const waterProgress = waterLogged / 3000;

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
          <Pressable onPress={() => nav.navigate('Profile')} style={styles.profileSummaryRow}>
            <FitnessAvatar name={user?.name} uri={user?.avatarUrl} size={36} />
            <View>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {user?.name?.split(' ')[0] ?? 'Member'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start' }}>
                <Ionicons name="trophy" size={10} color="#FFD700" />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFD700', marginLeft: 4 }}>Gold Tier</Text>
              </View>
            </View>
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable style={styles.minimalButton} onPress={toggleTheme}>
              <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color={colors.text} />
            </Pressable>
            <Pressable style={styles.minimalButton} onPress={handleNotificationPress}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <View style={styles.badge} />
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
            <Text style={[styles.heroTitle, { color: colors.text }]}>FitStack</Text>
          </Animated.View>
          
          <Animated.View entering={FadeInRight.duration(500).delay(200)} style={styles.heroFigureWrap}>
            <HeroFigure3D size={110} />
          </Animated.View>
        </View>

        {/* Dynamic Island Motivation Banner (Compact) */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.motivationWrap}>
          <Pressable onPress={handleQuoteCycle}>
            <LinearGradient
              colors={isDark ? ['rgba(124,77,255,0.15)', 'rgba(124,77,255,0.05)'] : ['rgba(124,77,255,0.12)', 'rgba(124,77,255,0.03)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.motivationBanner}
            >
              <View style={[styles.motivationIconWrap, { backgroundColor: colors.accent }]}>
                <Ionicons name="sparkles" size={12} color="#FFF" />
              </View>
              <Text style={[styles.motivationText, { color: colors.accent }]} numberOfLines={1}>
                {MOTIVATIONAL_QUOTES[quoteIndex]}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View style={styles.dashboardBody}>
          {/* Bento Box Dashboard: Rings + Water side by side */}
          <View style={[styles.bentoBox, { marginBottom: SPACING.sm }]}>
            {/* Left: Activity Rings */}
            <Animated.View entering={FadeInUp.duration(320).delay(105)} style={styles.bentoLeft}>
              <Pressable style={{ flex: 1 }} onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                nav.navigate('Activity');
              }}>
                <GlassCard glowColor={colors.accent} style={styles.bentoCard} innerStyle={{ flex: 1, padding: SPACING.md }}>
                  <Text style={[styles.bentoTitle, { color: colors.textSecondary }]}>ACTIVITY</Text>
                  <View style={styles.ringsWrap}>
                    <AppleActivityRings
                      moveProgress={0.6}
                      exerciseProgress={0.75}
                      standProgress={waterProgress}
                      size={100}
                    />
                  </View>
                  <View style={styles.bentoLegendRow}>
                    <View style={styles.bentoLegendDot}><Ionicons name="flame" size={10} color={colors.danger} /></View>
                    <View style={styles.bentoLegendDot}><Ionicons name="fitness" size={10} color={colors.success} /></View>
                    <View style={styles.bentoLegendDot}><Ionicons name="water" size={10} color={colors.info} /></View>
                  </View>
                </GlassCard>
              </Pressable>
            </Animated.View>

            {/* Right: Water Tracker */}
            <Animated.View entering={FadeInUp.duration(320).delay(110)} style={styles.bentoRight}>
              <GlassCard glowColor="#29B6F6" style={styles.bentoCard} innerStyle={{ flex: 1, padding: SPACING.md }}>
                <View style={styles.bentoHeaderRow}>
                  <Text style={[styles.bentoTitle, { color: colors.textSecondary }]}>HYDRATION</Text>
                  <Text style={[styles.bentoValue, { color: colors.text }]}>{waterLogged}ml</Text>
                </View>

                {/* Vertical Water Bar */}
                <View style={styles.bentoWaterBody}>
                  <View style={[styles.verticalProgressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Animated.View
                      layout={Layout.springify()}
                      style={[
                        styles.verticalProgressBarFill,
                        {
                          height: waterProgress > 0 ? `${Math.max(8, Math.min(100, waterProgress * 100))}%` : '0%',
                        },
                        waterProgress >= 1 && { backgroundColor: colors.success }
                      ]}
                    />
                  </View>
                  <View style={styles.bentoWaterControls}>
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
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>12.4k</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontWeight: '600' }}>KG LIFTED</Text>
                  <Text style={{ fontSize: 10, color: colors.success, marginTop: 4 }}>↑ 12%</Text>
                </View>
                <View style={{ width: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginHorizontal: 8 }} />
                {/* Metric 2 */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>4/5</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontWeight: '600' }}>WORKOUTS</Text>
                  <Text style={{ fontSize: 10, color: colors.success, marginTop: 4 }}>On Track</Text>
                </View>
                <View style={{ width: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginHorizontal: 8 }} />
                {/* Metric 3 */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>3,200</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontWeight: '600' }}>KCAL BURNED</Text>
                  <Text style={{ fontSize: 10, color: colors.success, marginTop: 4 }}>↑ 5%</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Daily Goal Premium Banner */}
          <Animated.View entering={FadeInUp.duration(320).delay(120)}>
            <Pressable onPress={handleCreateWorkout} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
              <LinearGradient
                colors={[...GRADIENTS.accent]}
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
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>HIIT Cardio</Text>
                    <Text style={{ fontSize: 13, color: colors.info, marginTop: 2, fontWeight: '600' }}>Starts in 45 mins</Text>
                  </View>
                </View>
                <Pressable onPress={() => nav.navigate('Classes')} style={{ backgroundColor: colors.info, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Join</Text>
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
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent, marginBottom: 4 }}>FitCoach AI Insight</Text>
                  <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>You crushed leg day yesterday! Focus on active recovery and high protein today to maximize muscle growth.</Text>
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
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
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
    fontWeight: '800',
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
    backgroundColor: '#FF4F18',
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
    borderColor: 'rgba(255,79,24,0.2)',
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
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  dashboardBody: {
    paddingHorizontal: 14,
    gap: SPACING.md,
  },

  // Daily Workout Banner
  dailyWorkoutBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#FF4F18',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dailyWorkoutCopy: {
    flex: 1,
  },
  dailyWorkoutTitle: {
    color: '#FFF',
    fontSize: FONT_SIZE.lg,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dailyWorkoutSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
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
    fontWeight: '800',
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
    fontWeight: '700',
    textAlign: 'center',
  },

  // Bento Box
  bentoBox: {
    flexDirection: 'row',
    gap: SPACING.sm,
    height: 195,
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
    fontWeight: '800',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  bentoValue: {
    fontSize: 12,
    fontWeight: '800',
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
    fontWeight: '800',
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
    fontWeight: '900',
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
    fontWeight: '700',
    marginBottom: 2,
  },
  bmiStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bmiControlValue: {
    fontSize: 14,
    fontWeight: '800',
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
    shadowColor: '#7C3AED',
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
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.75)',
  },
  productsBannerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '900',
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
