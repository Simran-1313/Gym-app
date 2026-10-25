import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { getProfile } from '../../services/member.service';
import { FONTS, MOTION, RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { RootStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { EmptyState } from '../../components/ui/EmptyState';
import { FitnessAvatar } from '../../components/ui/FitnessAvatar';
import { EditProfileSheet } from '../../components/profile/EditProfileSheet';
import { AvatarPreview } from '../../components/profile/AvatarPreview';
import { goalLabel } from '../../components/profile/profileGoals';
import { MemberProfile } from '../../types';

/* ─────────────── Sub-components ─────────────── */

/** `.settings-row` — outline glyph, label, chevron; hairline between siblings. */
const SettingsRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  first?: boolean;
}> = ({ icon, label, onPress, right, first }) => {
  const colors = useThemeColors();

  const body = (
    <>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={[s.settingsLabel, { color: colors.text }]}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />}
    </>
  );

  const rowStyle = [
    s.settingsRow,
    !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder },
  ];

  if (!onPress) return <View style={rowStyle}>{body}</View>;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [...rowStyle, pressed && { opacity: 0.6 }]}
    >
      {body}
    </Pressable>
  );
};

/** `.toggle-switch` — 44×26 track, 20px knob sliding 18px on a spring. */
const ToggleSwitch: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => {
  const colors = useThemeColors();
  const x = useSharedValue(value ? 18 : 0);

  useEffect(() => {
    x.value = withSpring(value ? 18 : 0, MOTION.settle);
  }, [value, x]);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // Same shared value drives both: the track was snapping between colors.inset
  // and colors.primary instantly while the knob glided, so the two halves of
  // one control read as out of sync. Deriving the fill from `x` keeps them
  // mathematically locked to a single motion.
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(x.value, [0, 18], [colors.inset, colors.primary]),
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onToggle();
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={9}
    >
      <Animated.View style={[s.track, track]}>
        <Animated.View style={[s.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
};

/** `.metric-tile` — label over value, no icon. */
const MetricTile: React.FC<{ label: string; value: string; valueColor?: string; small?: boolean }> = ({
  label, value, valueColor, small,
}) => {
  const colors = useThemeColors();
  return (
    <GlassCard style={s.metricTile} innerStyle={s.metricTileInner}>
      <Text style={[s.mtLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.mtValue, small && s.mtValueSmall, { color: valueColor ?? colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </GlassCard>
  );
};

/* ─────────────── Metrics ─────────────── */

/** BMI bands: under 18.5 low, 18.5–24.9 healthy, 25–29.9 raised, 30+ high. */
const bmiOf = (weightKg?: number, heightCm?: number): number | null => {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  const v = weightKg / (m * m);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
};

/* ─────────────── Screen ─────────────── */

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const insets = useSafeAreaInsets();
  const { user, logout, theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';
  const colors = useThemeColors();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const loadProfile = () => {
    setProfileError(null);
    getProfile()
      .then(setProfile)
      .catch((err: unknown) =>
        setProfileError(err instanceof Error ? err.message : 'Failed to load profile'),
      );
  };

  useEffect(loadProfile, []);

  const openEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEditOpen(true);
  };

  // With a photo, tapping it shows it large; without one there's nothing to
  // look at, so the tap goes straight to adding one.
  const onAvatarPress = () => {
    if (!user?.avatarUrl) {
      openEdit();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPreviewOpen(true);
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
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : null;

  const bmi = bmiOf(profile?.weight, profile?.height);
  const bmiColor =
    bmi == null ? colors.text : bmi < 18.5 || bmi >= 30 ? colors.danger : bmi < 25 ? colors.success : colors.warning;

  const memberId = user?.id ? `Member ID · ${user.id.slice(-6).toUpperCase()}` : 'Member';

  return (
    <AnimatedScreen>
      <GlassOverlay
        visible={showLogoutConfirm}
        title="Log Out?"
        message="You'll need your email and password to sign back in."
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        destructive
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <EditProfileSheet
        visible={editOpen}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => {
          if (saved) setProfile(saved);
        }}
      />

      <AvatarPreview
        visible={previewOpen}
        uri={user?.avatarUrl}
        name={user?.name}
        subtitle={memberSince ? `Member since ${memberSince}` : null}
        onClose={() => setPreviewOpen(false)}
        onEdit={() => setEditOpen(true)}
      />

      <ScreenHeader
        title="Profile"
        variant="large"
        right={
          <Pressable
            onPress={openEdit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </Pressable>
        }
      />

      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
            {/* ── Member card ── */}
            <Animated.View entering={FadeInUp.duration(340)}>
              <GlassCard elevated innerStyle={s.memberCard}>
                <View style={s.avatarSlot}>
                  <FitnessAvatar
                    name={user?.name}
                    uri={user?.avatarUrl}
                    size={64}
                    editable={!user?.avatarUrl}
                    onPress={onAvatarPress}
                    accessibilityLabel={user?.avatarUrl ? 'View profile photo' : 'Add profile photo'}
                  />
                </View>
                <View style={s.flex1}>
                  <View style={[s.tierBadge, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[s.tierBadgeText, { color: colors.primary }]}>MEMBER</Text>
                  </View>
                  <Text style={[s.memberName, { color: colors.text }]} numberOfLines={1}>
                    {user?.name ?? 'Member'}
                  </Text>
                  <Text style={[s.memberId, { color: colors.textMuted }]} numberOfLines={1}>
                    {memberId}
                    {memberSince ? ` · Since ${memberSince}` : ''}
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>

            {/* ── 2×2 metrics ── */}
            {profileError ? (
              <EmptyState
                icon="warning-outline"
                title="Couldn’t load your metrics"
                subtitle={profileError}
                actionLabel="Try Again"
                onAction={loadProfile}
              />
            ) : (
              <Animated.View entering={FadeInUp.duration(340).delay(70)} style={s.metricsGrid}>
                <MetricTile label="Weight" value={profile?.weight ? `${profile.weight} kg` : '—'} />
                <MetricTile label="Height" value={profile?.height ? `${profile.height} cm` : '—'} />
                <MetricTile label="BMI" value={bmi != null ? String(bmi) : '—'} valueColor={bmiColor} />
                <MetricTile label="Goal" value={goalLabel(profile?.fitnessGoal)} small />
              </Animated.View>
            )}

        {/* ── Settings group 1 ── */}
        <Animated.View entering={FadeInUp.duration(340).delay(140)}>
          <GlassCard innerStyle={s.settingsCard}>
            <SettingsRow first icon="card-outline" label="Membership & Billing" onPress={() => navigation.navigate('Membership')} />
            <SettingsRow icon="nutrition-outline" label="My Diet Plan" onPress={() => navigation.navigate('DietPlan')} />
            <SettingsRow icon="barbell-outline" label="My Workout Plan" onPress={() => navigation.navigate('WorkoutPlan')} />
            <SettingsRow icon="pulse-outline" label="Activity Dashboard" onPress={() => navigation.navigate('Activity')} />
            <SettingsRow icon="person-outline" label="Update Fitness Profile" onPress={() => navigation.navigate('Onboarding')} />
            <SettingsRow icon="trophy-outline" label="Challenges & Badges" onPress={() => navigation.navigate('Challenges')} />
          </GlassCard>
        </Animated.View>

        {/* ── Settings group 2 ── */}
        <Animated.View entering={FadeInUp.duration(340).delay(200)}>
          <GlassCard innerStyle={s.settingsCard}>
            <SettingsRow first icon="bag-handle-outline" label="Gym Shop" onPress={() => navigation.navigate('Products')} />
            <SettingsRow icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
            <SettingsRow icon="lock-closed-outline" label="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
            <SettingsRow
              icon={isDark ? 'moon-outline' : 'sunny-outline'}
              label="Dark Mode"
              right={<ToggleSwitch value={isDark} onToggle={toggleTheme} />}
            />
          </GlassCard>
        </Animated.View>

        {/* ── Log out ── */}
        <Pressable
          onPress={() => setShowLogoutConfirm(true)}
          style={({ pressed }) => [
            s.logoutBtn,
            { backgroundColor: `${colors.danger}1F`, borderColor: `${colors.danger}4D` },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
        >
          <Text style={[s.logoutText, { color: colors.danger }]}>Log Out</Text>
        </Pressable>

        <Text style={[s.poweredBy, { color: colors.textFaint }]}>Powered by Clasendra</Text>
      </ScrollView>
    </AnimatedScreen>
  );
};

/* ─────────────── Styles ─────────────── */

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 12, gap: 12 },
  flex1: { flex: 1 },


  // Member card
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  avatarSlot: { width: 64, height: 64 },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.full, marginBottom: 6 },
  tierBadgeText: { fontSize: 10, fontFamily: FONTS.bodyBold, letterSpacing: 0.3 },
  memberName: { fontSize: 16, fontFamily: FONTS.bodyExtra },
  memberId: { fontSize: 11, marginTop: 2 },

  // Metrics
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricTile: { width: '48%', flexGrow: 1 },
  metricTileInner: { padding: 14 },
  mtLabel: { fontSize: 10, fontFamily: FONTS.bodySemi, textTransform: 'uppercase', letterSpacing: 0.4 },
  mtValue: { fontSize: 19, fontFamily: FONTS.bodyExtra, marginTop: 6 },
  mtValueSmall: { fontSize: 14 },

  // Settings
  settingsCard: { paddingHorizontal: 15, paddingVertical: 0 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, paddingHorizontal: 4 },
  settingsLabel: { flex: 1, fontSize: 13.5, fontFamily: FONTS.bodyMedium },

  track: { width: 44, height: 26, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  logoutBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  logoutText: { fontSize: 13, fontFamily: FONTS.bodyBold },

  poweredBy: { fontSize: 10, textAlign: 'center', marginTop: 16, letterSpacing: 0.4 },
});
