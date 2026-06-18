import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/auth.service';
import { getProfile } from '../../services/member.service';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY, GRADIENTS } from '../../config/theme';
import { RootStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { FitnessAvatar } from '../../components/ui/FitnessAvatar';

const InfoRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: `${colors.primary}12` }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value || '—'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </View>
  );
};

const MenuRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: string;
  rightElement?: React.ReactNode;
}> = ({ icon, label, onPress, accent, rightElement }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const color = accent ?? colors.primary;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={styles.menuRow}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.menuRight}>
        {rightElement ?? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
      </View>
    </Pressable>
  );
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser, theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      const p = await getProfile();
      setProfile(p);
    };
    fetchProfileData();
  }, []);

  const formatGoal = (g: string) => {
    const mapping: Record<string, string> = {
      WEIGHT_LOSS: 'Weight Loss 📉',
      MUSCLE_GAIN: 'Muscle Gain 🦾',
      FITNESS: 'Fitness ⚡',
      ENDURANCE: 'Endurance 🏃',
    };
    return mapping[g] ?? g;
  };

  const formatActivity = (level: string) => {
    const mapping: Record<string, string> = {
      SEDENTARY: 'Sedentary 💼',
      LIGHT: 'Light 🚶',
      MODERATE: 'Moderate 🏃',
      VERY_ACTIVE: 'Active ⚡',
    };
    return mapping[level] ?? level;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || null,
      });
      await refreshUser();
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';

  return (
    <AnimatedScreen>
      <GlassOverlay
        visible={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to log out?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        destructive
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* Hero Profile Header */}
        <Animated.View entering={FadeInUp.duration(400)}>
          <View style={styles.heroContainer}>
            <LinearGradient
              colors={[...GRADIENTS.primary, 'transparent']}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <GlassCard glowColor={colors.primary} style={styles.hero}>
              <FitnessAvatar
                name={user?.name}
                uri={user?.avatarUrl}
                size={88}
                editable
                onPress={() => setEditing(true)}
              />
              <Text style={[styles.heroName, { color: colors.text }]}>{user?.name ?? 'Member'}</Text>
              <Text style={[styles.heroEmail, { color: colors.textSecondary }]}>{user?.email ?? ''}</Text>
              <View style={[styles.memberBadge, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}30` }]}>
                <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                <Text style={[styles.memberSince, { color: colors.primary }]}>Member since {memberSince}</Text>
              </View>
            </GlassCard>
          </View>
        </Animated.View>

        {user?.isFirstLogin && (
          <GlassCard glowColor={colors.warning}>
            <View style={styles.alertBanner}>
              <Ionicons name="warning" size={18} color={colors.warning} />
              <Text style={[styles.alertText, { color: colors.warning }]}>Please change your temporary password.</Text>
            </View>
          </GlassCard>
        )}

        {/* Personal Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Personal Info</Text>
            {!editing && (
              <AnimatedButton label="Edit" variant="ghost" onPress={() => setEditing(true)} />
            )}
          </View>

          {editing ? (
            <Animated.View entering={FadeInUp.duration(300)}>
              <GlassCard style={styles.editCard}>
                <GlassInput label="Full Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" editable={!saving} />
                <GlassInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" editable={!saving} />
                <GlassInput label="Avatar URL" value={avatarUrl} onChangeText={setAvatarUrl} placeholder="https://example.com/avatar.jpg" autoCapitalize="none" keyboardType="url" editable={!saving} />
                <View style={styles.editActions}>
                  <AnimatedButton
                    label="Cancel"
                    variant="secondary"
                    onPress={() => {
                      setEditing(false);
                      setName(user?.name ?? '');
                      setPhone(user?.phone ?? '');
                      setAvatarUrl(user?.avatarUrl ?? '');
                    }}
                    disabled={saving}
                    style={styles.flex1}
                  />
                  <AnimatedButton label="Save" onPress={handleSave} loading={saving} style={styles.flex1} />
                </View>
              </GlassCard>
            </Animated.View>
          ) : (
            <GlassCard>
              <InfoRow icon="person-outline" label="Name" value={user?.name ?? ''} />
              <View style={[styles.separator, { backgroundColor: colors.surfaceBorder }]} />
              <InfoRow icon="mail-outline" label="Email" value={user?.email ?? ''} />
              <View style={[styles.separator, { backgroundColor: colors.surfaceBorder }]} />
              <InfoRow icon="call-outline" label="Phone" value={user?.phone ?? ''} />
            </GlassCard>
          )}
        </View>

        {/* Fitness Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Fitness Metrics</Text>
          <GlassCard glowColor={colors.accent}>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: colors.surfaceBorder }]}>
                <View style={[styles.metricIconWrap, { backgroundColor: `${colors.primary}14` }]}>
                  <Ionicons name="barbell-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Weight</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {profile?.weight ? `${profile.weight} kg` : '—'}
                </Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: colors.surfaceBorder }]}>
                <View style={[styles.metricIconWrap, { backgroundColor: `${colors.accent}14` }]}>
                  <Ionicons name="resize-outline" size={16} color={colors.accent} />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Height</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {profile?.height ? `${profile.height} cm` : '—'}
                </Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: colors.surfaceBorder }]}>
                <View style={[styles.metricIconWrap, { backgroundColor: `${colors.warning}14` }]}>
                  <Ionicons name="trophy-outline" size={16} color={colors.warning} />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Goal</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {profile?.fitnessGoal ? formatGoal(profile.fitnessGoal) : '—'}
                </Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: colors.surfaceBorder }]}>
                <View style={[styles.metricIconWrap, { backgroundColor: `${colors.success}14` }]}>
                  <Ionicons name="pulse-outline" size={16} color={colors.success} />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Activity</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {profile?.activityLevel ? formatActivity(profile.activityLevel) : '—'}
                </Text>
              </View>
            </View>
            
            <AnimatedButton
              label="Update Fitness Profile"
              variant="secondary"
              onPress={() => navigation.navigate('Onboarding')}
              style={{ marginTop: SPACING.md }}
              icon={<Ionicons name="create-outline" size={16} color={colors.primary} />}
            />
          </GlassCard>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <GlassCard style={styles.menuCard}>
            <MenuRow
              icon="nutrition-outline"
              label="My Diet Plan"
              onPress={() => navigation.navigate('DietPlan')}
              accent={colors.accent}
            />
            <View style={[styles.separator, { backgroundColor: colors.surfaceBorder }]} />
            <MenuRow
              icon="barbell-outline"
              label="My Workout Plan"
              onPress={() => navigation.navigate('WorkoutPlan')}
              accent={colors.info}
            />
            <View style={[styles.separator, { backgroundColor: colors.surfaceBorder }]} />
            <MenuRow
              icon="fitness-outline"
              label="Activity Dashboard"
              onPress={() => navigation.navigate('Activity')}
              accent={colors.success}
            />
            <View style={[styles.separator, { backgroundColor: colors.surfaceBorder }]} />
            <MenuRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => navigation.navigate('Notifications')}
              accent={colors.warning}
            />
          </GlassCard>
        </View>

        {/* Status & Logout */}
        <GlassCard style={styles.menuCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Ionicons
                name={user?.isActive ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={user?.isActive ? colors.success : colors.danger}
              />
              <Text style={[styles.menuLabel, { color: colors.text }]}>Account Status</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: user?.isActive ? `${colors.success}18` : `${colors.danger}18` }]}>
              <Text style={{ color: user?.isActive ? colors.success : colors.danger, fontSize: FONT_SIZE.xs, fontWeight: '700' }}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </GlassCard>

        <View style={{ marginTop: SPACING.sm }}>
          <AnimatedButton
            label="Logout"
            variant="secondary"
            onPress={() => setShowLogoutConfirm(true)}
            loading={loggingOut}
            icon={<Ionicons name="log-out-outline" size={20} color={colors.danger} />}
          />
        </View>
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md },

  heroContainer: { position: 'relative' },
  heroGradient: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    height: 160,
    borderRadius: RADIUS.xl,
    opacity: 0.15,
  },
  hero: { alignItems: 'center', gap: SPACING.sm },
  heroName: { ...TYPOGRAPHY.title, marginTop: SPACING.xs },
  heroEmail: { ...TYPOGRAPHY.body },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  memberSince: { fontSize: FONT_SIZE.xs, fontWeight: '600' },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  alertText: { fontSize: FONT_SIZE.sm, flex: 1 },

  section: { gap: SPACING.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 10 },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: FONT_SIZE.xs, marginBottom: 2 },
  infoValue: { fontSize: FONT_SIZE.md, fontWeight: '500' },
  separator: { height: 1 },

  editCard: { gap: SPACING.md },
  editActions: { flexDirection: 'row', gap: SPACING.md },
  flex1: { flex: 1 },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.sm,
  },
  metricCard: {
    width: '48%',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 6,
    borderWidth: 1,
  },
  metricIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: FONT_SIZE.xs,
  },
  metricValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },

  menuCard: { gap: 0 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 12,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: FONT_SIZE.md, fontWeight: '500', flex: 1 },
  menuRight: {},

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: SPACING.xs },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
});
