import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { ActiveSubscription, User } from '../../types';
import { RootStackParams, TabParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { StatBadge } from '../../components/ui/StatBadge';
import { StaggerItem } from '../../components/ui/StaggerItem';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParams, 'Home'>,
  NativeStackNavigationProp<RootStackParams>
>;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const daysRemaining = (endDate: string) => {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const statusColor: Record<string, string> = {
  ACTIVE: COLORS.success,
  EXPIRED: COLORS.error,
  FROZEN: COLORS.info,
  CANCELLED: COLORS.textMuted,
};

const SubscriptionCard: React.FC<{ sub: ActiveSubscription }> = ({ sub }) => {
  const days = daysRemaining(sub.endDate);
  const color = statusColor[sub.status] ?? COLORS.textMuted;
  const progress = sub.status === 'ACTIVE' ? days / sub.plan.durationDays : 0;
  const expiringSoon = sub.status === 'ACTIVE' && days < 7;

  const glowOpacity = useSharedValue(expiringSoon ? 0.4 : 0);
  useEffect(() => {
    if (expiringSoon) {
      glowOpacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })),
        -1,
        false,
      );
    }
  }, [expiringSoon, glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <GlassCard glowColor={expiringSoon ? COLORS.danger : color} style={styles.subCard}>
      {expiringSoon ? (
        <Animated.View style={[styles.expireGlow, glowStyle]} pointerEvents="none" />
      ) : null}
      <View style={styles.subHeader}>
        <StatBadge icon="ribbon-outline" label="Status" value={sub.status} color={color} />
        <Text style={styles.planPrice}>₹{sub.plan.price}</Text>
      </View>
      <View style={styles.subBody}>
        <View style={styles.subInfoBlock}>
          <Text style={styles.planName}>{sub.plan.name}</Text>
          <Text style={styles.planDuration}>{sub.plan.durationDays}-day plan</Text>
          <View style={styles.subRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.subInfoText}>
              {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
            </Text>
          </View>
        </View>
        {sub.status === 'ACTIVE' ? (
          <ProgressRing
            progress={progress}
            size={80}
            value={`${days}`}
            label="days left"
          />
        ) : null}
      </View>
    </GlassCard>
  );
};

const QuickActionBtn: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: string;
  index: number;
}> = ({ icon, label, onPress, accent = COLORS.primary, index }) => (
  <StaggerItem index={index} style={styles.quickBtnWrap}>
    <GlassCard glowColor={accent} style={styles.quickBtn} noPadding>
      <AnimatedPressableTile icon={icon} label={label} onPress={onPress} accent={accent} />
    </GlassCard>
  </StaggerItem>
);

const AnimatedPressableTile: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent: string;
}> = ({ icon, label, onPress, accent }) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => {
          scale.value = withSequence(withTiming(0.94, { duration: 80 }), withTiming(1, { duration: 120 }));
          onPress();
        }}
        style={styles.quickInner}
      >
        <View style={[styles.quickIcon, { shadowColor: accent }]}>
          <Ionicons name={icon} size={24} color={accent} />
        </View>
        <Text style={styles.quickLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

export const HomeScreen: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const nav = useNavigation<HomeNavProp>();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

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

  const openRootScreen = (name: 'DietPlan' | 'WorkoutPlan', params: { generate: true }) => {
    nav.dispatch(CommonActions.navigate({ name, params }));
  };

  const handleCreateDiet = () => {
    if (!requireProfile()) return;
    openRootScreen('DietPlan', { generate: true });
  };

  const handleCreateWorkout = () => {
    if (!requireProfile()) return;
    openRootScreen('WorkoutPlan', { generate: true });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const sub = (user as User & { activeSubscription?: ActiveSubscription | null })?.activeSubscription;

  const quickActions = [
    { icon: 'nutrition-outline' as const, label: 'Create Diet', accent: COLORS.accent, onPress: handleCreateDiet },
    { icon: 'barbell-outline' as const, label: 'Create Workout', onPress: handleCreateWorkout },
    { icon: 'calendar-outline' as const, label: 'Book Class', onPress: () => nav.navigate('Classes') },
    { icon: 'time-outline' as const, label: 'Check-ins', onPress: () => nav.navigate('CheckIns') },
    { icon: 'bookmark-outline' as const, label: 'My Bookings', onPress: () => nav.navigate('Classes') },
    { icon: 'person-outline' as const, label: 'Profile', onPress: () => nav.navigate('Profile') },
  ];

  return (
    <AnimatedScreen>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.heroRow}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0] ?? 'Member'} 💪</Text>
          </View>
          <GlassCard glowColor={COLORS.primary} style={styles.avatarCard} noPadding>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{user?.name?.[0]?.toUpperCase() ?? 'M'}</Text>
            </View>
          </GlassCard>
        </Animated.View>

        <Text style={styles.sectionLabel}>Membership</Text>
        {sub ? (
          <SubscriptionCard sub={sub} />
        ) : (
          <GlassCard glowColor={COLORS.warning}>
            <View style={styles.noSub}>
              <Ionicons name="alert-circle-outline" size={28} color={COLORS.warning} />
              <Text style={styles.noSubText}>No active membership found.</Text>
              <Text style={styles.noSubHint}>Contact your gym to get started.</Text>
            </View>
          </GlassCard>
        )}

        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action, i) => (
            <QuickActionBtn key={action.label} {...action} index={i} />
          ))}
        </View>

        {user?.isFirstLogin && (
          <GlassCard glowColor={COLORS.warning}>
            <View style={styles.alertBanner}>
              <Ionicons name="information-circle" size={20} color={COLORS.warning} />
              <Text style={styles.alertText}>Please change your temporary password in Profile settings.</Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  greeting: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  name: { ...TYPOGRAPHY.hero, color: COLORS.text, fontSize: 28, marginTop: 2 },
  avatarCard: { borderRadius: RADIUS.full },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: COLORS.primary, fontSize: FONT_SIZE.xl, fontWeight: '700' },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subCard: { gap: SPACING.sm, overflow: 'hidden' },
  expireGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: `${COLORS.danger}18`,
    borderRadius: RADIUS.lg,
  },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  subInfoBlock: { flex: 1, gap: 4 },
  planPrice: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '800' },
  planName: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  planDuration: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  subInfoText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  noSub: { alignItems: 'center', gap: SPACING.xs },
  noSubText: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  noSubHint: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quickBtnWrap: { width: '48%' },
  quickBtn: { borderRadius: RADIUS.lg },
  quickInner: { alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  quickLabel: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '600', textAlign: 'center' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  alertText: { color: COLORS.warning, fontSize: FONT_SIZE.sm, flex: 1, lineHeight: 18 },
});
