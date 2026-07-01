import React, { useCallback, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { ActiveSubscription, User } from '../../types';
import { RootStackParams, TabParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { FitnessAvatar } from '../../components/ui/FitnessAvatar';
import { AppleActivityRings } from '../../components/ui/AppleActivityRings';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParams, 'Home'>,
  NativeStackNavigationProp<RootStackParams>
>;

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop';

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

const ActionCard: React.FC<{
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accent?: string;
  wide?: boolean;
  delay?: number;
}> = ({ title, subtitle, icon, onPress, accent = '#FF4F18', wide, delay = 0 }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <Animated.View entering={FadeInUp.duration(280).delay(delay)} style={wide ? styles.wideCard : styles.smallCard}>
      <Pressable onPress={onPress}>
        <GlassCard glowColor={accent} noPadding style={styles.cardShell}>
          <LinearGradient
            colors={
              isDark 
                ? (wide ? ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.045)'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.03)'])
                : (wide ? ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)'] : ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.78)'])
            }
            style={[styles.actionCard, wide && styles.actionCardWide]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.actionCopy}>
              <Text style={[wide ? styles.wideCardTitle : styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>{subtitle}</Text>
            </View>
            <View style={[wide ? styles.wideIcon : styles.cardIcon, { backgroundColor: `${accent}18` }]}>
              <Ionicons name={icon} size={wide ? 28 : 22} color={accent} />
            </View>
          </LinearGradient>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
};

const ProductsBanner: React.FC<{ onPress: () => void; delay?: number }> = ({ onPress, delay = 0 }) => (
  <Animated.View entering={FadeInUp.duration(300).delay(delay)} style={styles.productsBannerWrap}>
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      <LinearGradient
        colors={['#5B21B6', '#7C3AED', '#9333EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.productsBanner}
      >
        <View style={styles.productsBannerGlow} />
        <View style={styles.productsBannerContent}>
          <View style={styles.productsBannerIcon}>
            <Ionicons name="bag-handle" size={28} color="#fff" />
          </View>
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

export const HomeScreen: React.FC = () => {
  const { user, refreshUser, theme, toggleTheme } = useAuth();
  const nav = useNavigation<HomeNavProp>();
  const insets = useSafeAreaInsets();
  
  const [refreshing, setRefreshing] = useState(false);
  const [waterLogged, setWaterLogged] = useState(1250); // in ml
  const [quoteIndex, setQuoteIndex] = useState(0);

  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const sub = (user as User & { activeSubscription?: ActiveSubscription | null })?.activeSubscription;
  const activeDays = sub?.status === 'ACTIVE' ? daysRemaining(sub.endDate) : 0;

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

  // Open the plan screen in "view" mode. The screen shows the saved plan
  // (from cache, no reload) and offers an explicit "Generate New Plan" action,
  // so we never silently regenerate on every tap.
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

  // Round button dynamically themed colors
  const roundButtonTheme = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    borderWidth: 1,
  };

  return (
    <AnimatedScreen noBackground>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 118 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* Banner area */}
        <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.hero} resizeMode="cover">
          <LinearGradient
            colors={isDark ? ['rgba(0,0,0,0.5)', 'rgba(4,4,7,0.4)', '#040407'] : ['rgba(242,244,248,0.3)', 'rgba(242,244,248,0.5)', '#F2F4F8']}
            style={styles.heroOverlay}
          />

          <View style={[styles.topBar, { top: Math.max(insets.top, 16) }]}>
            <View style={styles.profileSummaryRow}>
              <FitnessAvatar name={user?.name} uri={user?.avatarUrl} size={42} />
              <View>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{greeting()}</Text>
                <Pressable onPress={() => nav.navigate('Profile')} style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{user?.name?.split(' ')[0] ?? 'Member'}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable style={[styles.roundButton, roundButtonTheme]} onPress={toggleTheme}>
                <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={20} color={colors.text} />
              </Pressable>
              <Pressable style={[styles.roundButton, roundButtonTheme]} onPress={() => nav.navigate('CheckIns')}>
                <Ionicons name="qr-code-outline" size={20} color={colors.text} />
              </Pressable>
              <Pressable style={[styles.roundButton, roundButtonTheme]} onPress={handleNotificationPress}>
                <Ionicons name="notifications-outline" size={20} color={colors.text} />
                <View style={styles.badge} />
              </Pressable>
            </View>
          </View>

          <Animated.View entering={FadeInUp.duration(320).delay(100)} style={[styles.heroContent, { paddingTop: Math.max(insets.top, 16) + 40 }]}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>FitStack Premium</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Elevating your fitness, diet, and training splits.
            </Text>
          </Animated.View>
        </ImageBackground>

        <View style={[styles.dashboardBody, { backgroundColor: colors.background }]}>
          {/* Motivational widget */}
          <Animated.View entering={FadeInUp.duration(320).delay(120)}>
            <Pressable onPress={handleQuoteCycle}>
              <GlassCard glowColor={colors.primaryGlow} style={styles.quoteCard}>
                <View style={styles.quoteHeader}>
                  <Ionicons name="flame" size={16} color={colors.primary} />
                  <Text style={[styles.quoteTitle, { color: colors.textSecondary }]}>MOTIVATION OF THE DAY</Text>
                </View>
                <Text style={[styles.quoteText, { color: colors.text }]}>{MOTIVATIONAL_QUOTES[quoteIndex]}</Text>
                <Text style={[styles.quoteTip, { color: colors.textMuted }]}>Tap to cycle quotes</Text>
              </GlassCard>
            </Pressable>
          </Animated.View>

          {/* Today's Activity Stats */}
          <Animated.View entering={FadeInUp.duration(320).delay(150)}>
            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              nav.navigate('Activity');
            }}>
              <GlassCard glowColor={colors.accent} style={styles.statsCard}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TODAY'S ACTIVITY</Text>
                <View style={styles.healthDashboardRow}>
                  <AppleActivityRings
                    moveProgress={0.6}
                    exerciseProgress={0.75}
                    standProgress={waterProgress}
                    size={110}
                  />
                  <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#FF1243' }]} />
                      <View>
                        <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Move</Text>
                        <Text style={[styles.legendValue, { color: colors.text }]}>480 / 800 kcal</Text>
                      </View>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#00E676' }]} />
                      <View>
                        <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Exercise</Text>
                        <Text style={[styles.legendValue, { color: colors.text }]}>45 / 60 min</Text>
                      </View>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#00B0FF' }]} />
                      <View>
                        <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Stand/Water</Text>
                        <Text style={[styles.legendValue, { color: colors.text }]}>{(waterLogged / 1000).toFixed(1)} / 3.0 L</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          </Animated.View>

          {/* Interactive Water Logger */}
          <Animated.View entering={FadeInUp.duration(320).delay(180)}>
            <GlassCard glowColor="#29B6F6" style={styles.waterTracker}>
              <View style={styles.waterHeader}>
                <View style={styles.waterTitleRow}>
                  <View style={[styles.waterIconWrap, { backgroundColor: 'rgba(41,182,246,0.12)' }]}>
                    <Ionicons name="water" size={18} color="#29B6F6" />
                  </View>
                  <Text style={[styles.waterTitle, { color: colors.text }]}>Daily Hydration</Text>
                </View>
                <Text style={[styles.waterStats, { color: colors.textSecondary }]}>{waterLogged} / 3000 ml</Text>
              </View>

              <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Animated.View 
                  layout={Layout.springify()} 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: waterProgress > 0 ? `${Math.max(6, Math.min(100, waterProgress * 100))}%` : '0%',
                      borderRadius: RADIUS.full,
                    },
                    waterProgress >= 1 && { backgroundColor: colors.success }
                  ]} 
                />
              </View>

              <View style={styles.waterButtons}>
                <Pressable 
                  style={[styles.waterBtn, styles.waterBtnMinus, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]} 
                  onPress={() => handleWaterIncrement(-250)}
                >
                  <Ionicons name="remove" size={16} color={colors.textSecondary} />
                  <Text style={[styles.waterBtnText, { color: colors.text }]}>250ml</Text>
                </Pressable>
                <Pressable 
                  style={[styles.waterBtn, styles.waterBtnPlus, { backgroundColor: '#29B6F6', borderColor: '#29B6F6' }]} 
                  onPress={() => handleWaterIncrement(250)}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={[styles.waterBtnText, { color: '#FFFFFF' }]}>250ml</Text>
                </Pressable>
              </View>

              {waterProgress >= 1 && (
                <Animated.View entering={FadeInUp} style={[styles.successBanner, {
                  backgroundColor: isDark ? 'rgba(0, 230, 118, 0.08)' : 'rgba(0, 200, 83, 0.08)',
                  borderColor: isDark ? 'rgba(0, 230, 118, 0.15)' : 'rgba(0, 200, 83, 0.12)',
                }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={[styles.successBannerText, { color: colors.success }]}>Daily hydration target met! Great job! 🎉</Text>
                </Animated.View>
              )}
            </GlassCard>
          </Animated.View>

          {/* Today's Workout Redirect Card */}
          <ActionCard
            wide
            title="Start Daily Workout"
            subtitle={sub?.status === 'ACTIVE' ? `Day focus & targets • ${activeDays} active days left` : "View your training split & sets"}
            icon="barbell"
            onPress={handleCreateWorkout}
            accent={colors.primary}
            delay={200}
          />

          {/* Additional Quick Actions */}
          <Text style={[styles.gridSectionTitle, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
          <View style={styles.actionGrid}>
            <ActionCard title="AI Diet Plan" subtitle="Meals & macros" icon="nutrition" onPress={handleCreateDiet} accent={colors.success} delay={220} />
            <ActionCard title="Classes" subtitle="Book workout" icon="calendar" onPress={() => nav.navigate('Classes')} accent={colors.info} delay={240} />
            <ActionCard title="Body Test" subtitle="Update profile" icon="body" onPress={() => nav.navigate('Onboarding')} accent={colors.warning} delay={260} />
            <ActionCard title="Profile Settings" subtitle="View stats" icon="person" onPress={() => nav.navigate('Profile')} accent={colors.accent} delay={280} />
          </View>

          <ProductsBanner onPress={handleProductsPress} delay={300} />
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    minHeight: 280,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    justifyContent: 'space-between',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
  },
  topBar: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4F18',
  },
  heroContent: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  eyebrow: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  name: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    maxWidth: 160,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
  },
  heroSubtitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
    maxWidth: 320,
  },
  dashboardBody: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.md,
  },
  quoteCard: {
    gap: SPACING.xs,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  quoteTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  quoteText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    lineHeight: 20,
  },
  quoteTip: {
    fontSize: 10,
    textAlign: 'right',
  },
  statsCard: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  gridSectionTitle: {
    fontSize: 11,
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
  waterTracker: {
    gap: SPACING.sm,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  waterIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  waterStats: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 10,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginVertical: SPACING.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#29B6F6',
  },
  waterButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  waterBtn: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
  },
  waterBtnMinus: {
    backgroundColor: 'transparent',
  },
  waterBtnPlus: {
    shadowColor: '#29B6F6',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  waterBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  successBannerText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    flex: 1,
  },
  wideCard: { width: '100%' },
  smallCard: { width: '48%' },
  cardShell: {
    borderRadius: RADIUS.lg,
  },
  actionCard: {
    height: 120,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  actionCardWide: {
    height: 98,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: SPACING.xs,
    paddingRight: SPACING.sm,
  },
  wideCardTitle: {
    fontSize: FONT_SIZE.xl,
    lineHeight: 25,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    lineHeight: 18,
    fontWeight: '900',
  },
  cardSubtitle: {
    fontSize: FONT_SIZE.xs,
    lineHeight: 15,
  },
  wideIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.md,
  },
  productsBannerWrap: {
    width: '100%',
    marginTop: SPACING.sm,
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
    fontSize: FONT_SIZE.xl,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  productsBannerSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  productsBannerArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
