import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { ActiveSubscription, User } from '../../types';
import { TabParams } from '../../navigation/AppNavigator';

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

  return (
    <View style={[styles.subCard, { borderColor: color }]}>
      <View style={styles.subHeader}>
        <View style={[styles.statusBadge, { backgroundColor: color + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{sub.status}</Text>
        </View>
        <Text style={styles.planPrice}>₹{sub.plan.price}</Text>
      </View>

      <Text style={styles.planName}>{sub.plan.name}</Text>
      <Text style={styles.planDuration}>{sub.plan.durationDays}-day plan</Text>

      <View style={styles.subRow}>
        <View style={styles.subInfo}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.subInfoText}>
            {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
          </Text>
        </View>
      </View>

      {sub.status === 'ACTIVE' && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(100, (days / sub.plan.durationDays) * 100)}%`, backgroundColor: color }]} />
        </View>
      )}

      {sub.status === 'ACTIVE' ? (
        <Text style={[styles.daysLeft, { color }]}>{days} days remaining</Text>
      ) : null}
    </View>
  );
};

const QuickActionBtn: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickBtn} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.quickIcon}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

export const HomeScreen: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const nav = useNavigation<BottomTabNavigationProp<TabParams>>();
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <View style={styles.heroRow}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name}>{user?.name?.split(' ')[0] ?? 'Member'} 💪</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{user?.name?.[0]?.toUpperCase() ?? 'M'}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Membership</Text>
      {sub ? (
        <SubscriptionCard sub={sub} />
      ) : (
        <View style={styles.noSub}>
          <Ionicons name="alert-circle-outline" size={28} color={COLORS.warning} />
          <Text style={styles.noSubText}>No active membership found.</Text>
          <Text style={styles.noSubHint}>Contact your gym to get started.</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Quick Actions</Text>
      <View style={styles.quickGrid}>
        <QuickActionBtn icon="barbell-outline" label="Book Class" onPress={() => nav.navigate('Classes')} />
        <QuickActionBtn icon="time-outline" label="Check-ins" onPress={() => nav.navigate('CheckIns')} />
        <QuickActionBtn icon="bookmark-outline" label="My Bookings" onPress={() => nav.navigate('Classes')} />
        <QuickActionBtn icon="person-outline" label="Profile" onPress={() => nav.navigate('Profile')} />
      </View>

      {user?.isFirstLogin && (
        <View style={styles.alertBanner}>
          <Ionicons name="information-circle" size={20} color={COLORS.warning} />
          <Text style={styles.alertText}>Please change your temporary password in Profile settings.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },

  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  greeting: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  name: { color: COLORS.text, fontSize: FONT_SIZE.xxl, fontWeight: '800', marginTop: 2 },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarLetter: { color: COLORS.primary, fontSize: FONT_SIZE.xl, fontWeight: '700' },

  sectionLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },

  subCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    gap: SPACING.sm,
  },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '700', textTransform: 'uppercase' },
  planPrice: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '800' },
  planName: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  planDuration: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  subRow: { flexDirection: 'row', alignItems: 'center' },
  subInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subInfoText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  progressBar: { height: 4, backgroundColor: COLORS.surface, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  daysLeft: { fontSize: FONT_SIZE.sm, fontWeight: '600' },

  noSub: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  noSubText: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  noSubHint: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  quickBtn: { alignItems: 'center', width: '45%', gap: SPACING.sm },
  quickIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  quickLabel: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '500' },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '22',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning + '44',
  },
  alertText: { color: COLORS.warning, fontSize: FONT_SIZE.sm, flex: 1, lineHeight: 18 },
});
