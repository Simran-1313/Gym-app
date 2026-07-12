import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

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
import { FitnessAvatar } from '../../components/ui/FitnessAvatar';
import { EmptyState } from '../../components/ui/EmptyState';

/* ─────── Sub-components ─────── */

const InfoRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string }> = ({
  icon, label, value,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <View style={s.infoRow}>
      <View style={[s.infoIconWrap, { backgroundColor: `${colors.primary}12` }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={s.infoText}>
        <Text style={[s.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[s.infoValue, { color: colors.text }]}>{value || '—'}</Text>
      </View>
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
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }}
      style={({ pressed }) => [s.menuRow, pressed && { opacity: 0.7 }]}
    >
      <View style={[s.menuIconWrap, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.menuLabel, { color: colors.text }]}>{label}</Text>
      <View style={s.menuRight}>
        {rightElement ?? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
      </View>
    </Pressable>
  );
};

const MetricTile: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  delay?: number;
}> = ({ icon, label, value, delay = 0 }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <Animated.View entering={FadeInUp.duration(300).delay(delay)} style={[s.metricTile, {
      backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.5)',
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(200,205,215,0.35)',
    }]}>
      <View style={[s.metricIconWrap, { backgroundColor: `${colors.primary}12` }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[s.metricLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.metricValue, { color: colors.text }]}>{value}</Text>
    </Animated.View>
  );
};

/* ─────── Main Screen ─────── */

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser, theme, toggleTheme } = useAuth();
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

  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = () => {
    setProfileError(null);
    getProfile()
      .then(setProfile)
      .catch((err: any) => setProfileError(err.message || 'Failed to load profile'));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const formatGoal = (g: string) => ({
    WEIGHT_LOSS: 'Weight Loss 📉', MUSCLE_GAIN: 'Muscle Gain 🦾',
    FITNESS: 'Fitness ⚡', ENDURANCE: 'Endurance 🏃',
  }[g] ?? g);

  const formatActivity = (level: string) => ({
    SEDENTARY: 'Sedentary 💼', LIGHT: 'Light 🚶',
    MODERATE: 'Moderate 🏃', VERY_ACTIVE: 'Active ⚡',
  }[level] ?? level);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name cannot be empty.'); return; }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() || undefined, avatarUrl: avatarUrl.trim() || null });
      await refreshUser();
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    } finally { setSaving(false); }
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setAvatarUrl(selectedUri);
      
      // Auto-save the avatar if we are not in edit mode
      if (!editing) {
        try {
          await updateProfile({ name: user?.name ?? '', avatarUrl: selectedUri });
          await refreshUser();
        } catch (e) {
          console.warn('Failed to auto-save avatar', e);
        }
      }
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); setShowLogoutConfirm(false); }
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
        style={s.root}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        {/* ── Inline page title ── */}
        <Animated.View entering={FadeInUp.duration(350)} style={s.pageHeader}>
          <Text style={[s.pageTitle, { color: colors.text }]}>Profile</Text>
          <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>Manage your account & fitness data</Text>
        </Animated.View>

        {/* ── Hero Profile Card (Centered Avatar Redesign) ── */}
        <Animated.View entering={FadeInUp.duration(400).delay(80)}>
          <GlassCard glowColor={colors.primary} style={s.heroCardCenter}>
            <View style={s.heroCenterWrap}>
              <FitnessAvatar 
                name={user?.name} 
                uri={avatarUrl || user?.avatarUrl} 
                size={110} 
                editable 
                onPress={handlePickImage} 
                style={s.heroAvatar}
              />
              <Text style={[s.heroNameCenter, { color: colors.text }]}>{user?.name ?? 'Member'}</Text>
              <Text style={[s.heroEmailCenter, { color: colors.textSecondary }]} numberOfLines={1}>{user?.email ?? ''}</Text>
              <View style={[s.memberBadgeCenter, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
                <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
                <Text style={[s.memberSince, { color: colors.primary }]}>Since {memberSince}</Text>
              </View>
            </View>
            
            {/* Status pill */}
            <View style={[s.statusStrip, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
              <View style={s.statusLeft}>
                <View style={[s.statusDot, { backgroundColor: user?.isActive ? colors.success : colors.danger }]} />
                <Text style={[s.statusText, { color: colors.textSecondary }]}>
                  Account {user?.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <Pressable onPress={() => setEditing(!editing)} style={({ pressed }) => [s.editPill, pressed && { opacity: 0.7 }, { borderColor: `${colors.primary}30`, backgroundColor: editing ? `${colors.primary}15` : 'transparent' }]}>
                <Ionicons name={editing ? "close-outline" : "create-outline"} size={13} color={colors.primary} />
                <Text style={[s.editPillText, { color: colors.primary }]}>{editing ? "Cancel Edit" : "Edit Profile"}</Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>

        {user?.isFirstLogin && (
          <GlassCard glowColor={colors.warning}>
            <View style={s.alertBanner}>
              <Ionicons name="warning" size={18} color={colors.warning} />
              <Text style={[s.alertText, { color: colors.warning }]}>Please change your temporary password.</Text>
            </View>
          </GlassCard>
        )}

        {/* ── Edit Mode ── */}
        {editing && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <GlassCard style={s.editCard}>
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>EDIT DETAILS</Text>
              <GlassInput label="Full Name" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" editable={!saving} />
              <GlassInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" editable={!saving} />
              {/* Removed Avatar URL input! Handled via ImagePicker now. */}
              
              <View style={s.editActions}>
                <AnimatedButton 
                  label="Cancel" 
                  variant="secondary" 
                  onPress={() => { setEditing(false); setName(user?.name ?? ''); setPhone(user?.phone ?? ''); }} 
                  disabled={saving} 
                  style={s.flex1} 
                />
                <AnimatedButton 
                  label="Save Changes" 
                  onPress={handleSave} 
                  loading={saving} 
                  style={s.flex1} 
                />
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* ── Fitness Metrics ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>FITNESS METRICS</Text>
          {profileError ? (
            <EmptyState
              icon="warning-outline"
              title="Oops, something went wrong!"
              subtitle={profileError}
              actionLabel="Try Again"
              onAction={loadProfile}
            />
          ) : (
            <>
              <View style={s.metricsGrid}>
                <MetricTile icon="barbell-outline" label="Weight" value={profile?.weight ? `${profile.weight} kg` : '—'} delay={100} />
                <MetricTile icon="resize-outline" label="Height" value={profile?.height ? `${profile.height} cm` : '—'} delay={150} />
                <MetricTile icon="trophy-outline" label="Goal" value={profile?.fitnessGoal ? formatGoal(profile.fitnessGoal) : '—'} delay={200} />
                <MetricTile icon="pulse-outline" label="Activity" value={profile?.activityLevel ? formatActivity(profile.activityLevel) : '—'} delay={250} />
              </View>
              <AnimatedButton
                label="Update Fitness Profile"
                variant="secondary"
                onPress={() => navigation.navigate('Onboarding')}
                icon={<Ionicons name="create-outline" size={16} color={colors.primary} />}
              />
            </>
          )}
        </View>

        {/* ── Quick Links ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>QUICK LINKS</Text>
          <GlassCard style={s.menuCard}>
            <MenuRow icon="nutrition-outline" label="My Diet Plan" onPress={() => navigation.navigate('DietPlan')} />
            <View style={[s.sep, { backgroundColor: colors.surfaceBorder }]} />
            <MenuRow icon="barbell-outline" label="My Workout Plan" onPress={() => navigation.navigate('WorkoutPlan')} />
            <View style={[s.sep, { backgroundColor: colors.surfaceBorder }]} />
            <MenuRow icon="fitness-outline" label="Activity Dashboard" onPress={() => navigation.navigate('Activity')} />
            <View style={[s.sep, { backgroundColor: colors.surfaceBorder }]} />
            <MenuRow icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
          </GlassCard>
        </View>

        {/* ── Preferences ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>
          <GlassCard style={s.menuCard}>
            <View style={s.menuRow}>
              <View style={[s.menuIconWrap, { backgroundColor: `${colors.primary}14` }]}>
                <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.primary} />
              </View>
              <Text style={[s.menuLabel, { color: colors.text }]}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: 'rgba(0,0,0,0.1)', true: `${colors.primary}60` }}
                thumbColor="#FFF"
              />
            </View>
          </GlassCard>
        </View>

        {/* ── Logout ── */}
        <View style={{ marginTop: SPACING.xs }}>
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

/* ─────── Styles ─────── */

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 14, gap: 14 },

  pageHeader: { gap: 4, marginBottom: 4 },
  pageTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: FONT_SIZE.sm },

  // Centered Hero card
  heroCardCenter: { gap: 0, paddingBottom: 0, paddingTop: SPACING.xl },
  heroCenterWrap: { alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md },
  heroAvatar: { marginBottom: SPACING.xs },
  heroNameCenter: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  heroEmailCenter: { fontSize: FONT_SIZE.md, textAlign: 'center' },
  memberBadgeCenter: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1, marginTop: 4,
  },
  memberSince: { fontSize: 11, fontWeight: '700' },
  statusStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.lg, marginHorizontal: -SPACING.md, paddingHorizontal: SPACING.md,
    paddingVertical: 12, borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1,
  },
  editPillText: { fontSize: 11, fontWeight: '700' },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  alertText: { fontSize: FONT_SIZE.sm, flex: 1 },

  section: { gap: SPACING.sm },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 10 },
  infoIconWrap: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1 },
  infoLabel: { fontSize: FONT_SIZE.xs, marginBottom: 2 },
  infoValue: { fontSize: FONT_SIZE.md, fontWeight: '500' },

  // Edit
  editCard: { gap: SPACING.md, padding: SPACING.lg },
  editActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  flex1: { flex: 1 },

  // Metrics
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  metricTile: {
    width: '48%', borderRadius: RADIUS.lg, padding: SPACING.md, gap: 6, borderWidth: 1,
  },
  metricIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: FONT_SIZE.lg, fontWeight: '800' },

  // Menu
  menuCard: { gap: 0 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 13 },
  menuIconWrap: { width: 34, height: 34, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: FONT_SIZE.md, fontWeight: '500', flex: 1 },
  menuRight: {},
  sep: { height: StyleSheet.hairlineWidth },
});
