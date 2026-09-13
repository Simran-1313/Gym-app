import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/auth.service';
import { getProfile, submitProfile } from '../../services/member.service';
import { FONTS, RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { RootStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassOverlay } from '../../components/ui/GlassOverlay';
import { EmptyState } from '../../components/ui/EmptyState';
import { FitnessAvatar } from '../../components/ui/FitnessAvatar';
import { MemberProfile, FitnessGoal } from '../../types';

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
    x.value = withSpring(value ? 18 : 0, { damping: 18, stiffness: 260 });
  }, [value, x]);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onToggle();
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={[s.track, { backgroundColor: value ? colors.primary : colors.inset }]}
    >
      <Animated.View style={[s.knob, knob]} />
    </Pressable>
  );
};

/** `.stepper-row` — −/+ buttons flanking a value. */
const Stepper: React.FC<{
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
}> = ({ label, value, onChange, min, max }) => {
  const colors = useThemeColors();

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  return (
    <View style={s.flex1}>
      <Text style={[s.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={[s.stepperRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Pressable
          onPress={() => step(-1)}
          hitSlop={6}
          style={[s.stepperBtn, { backgroundColor: colors.surfaceElevated }]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={17} color={colors.text} />
        </Pressable>
        <Text style={[s.stepperVal, { color: colors.text }]}>{value}</Text>
        <Pressable
          onPress={() => step(1)}
          hitSlop={6}
          style={[s.stepperBtn, { backgroundColor: colors.surfaceElevated }]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={17} color={colors.text} />
        </Pressable>
      </View>
    </View>
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

/* ─────────────── Goals ─────────────── */

const GOALS: { key: FitnessGoal; label: string }[] = [
  { key: 'WEIGHT_LOSS', label: 'Lose Fat' },
  { key: 'MUSCLE_GAIN', label: 'Build Muscle' },
  { key: 'ENDURANCE', label: 'Endurance' },
  { key: 'FITNESS', label: 'General Fitness' },
];

const goalLabel = (g?: FitnessGoal) => GOALS.find((x) => x.key === g)?.label ?? '—';

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
  const { user, logout, refreshUser, theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';
  const colors = useThemeColors();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [weight, setWeight] = useState(0);
  const [height, setHeight] = useState(0);
  const [goal, setGoal] = useState<FitnessGoal | undefined>(undefined);

  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const loadProfile = () => {
    setProfileError(null);
    getProfile()
      .then((p) => {
        setProfile(p);
        if (p) {
          setWeight(p.weight);
          setHeight(p.height);
          setGoal(p.fitnessGoal);
        }
      })
      .catch((err: unknown) =>
        setProfileError(err instanceof Error ? err.message : 'Failed to load profile'),
      );
  };

  useEffect(loadProfile, []);

  const openEdit = () => {
    setName(user?.name ?? '');
    if (profile) {
      setWeight(profile.weight);
      setHeight(profile.height);
      setGoal(profile.fitnessGoal);
    }
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Your name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      if (name.trim() !== user?.name) {
        await updateProfile({ name: name.trim() });
      }

      // Only re-submit the fitness profile when a fitness value actually
      // changed — that endpoint regenerates the AI plan through an LLM, which
      // is far too heavy to run because someone renamed themselves.
      const fitnessChanged =
        profile != null &&
        (weight !== profile.weight || height !== profile.height || goal !== profile.fitnessGoal);

      if (fitnessChanged && profile && goal) {
        const { profile: saved } = await submitProfile({
          ...profile,
          weight,
          height,
          fitnessGoal: goal,
        });
        setProfile(saved);
      }

      await refreshUser();
      setEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err: unknown) {
      Alert.alert('Couldn’t save', err instanceof Error ? err.message : 'Update failed');
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

      {/* ── Navbar ── */}
      <View style={[s.navbar, { paddingTop: insets.top + 8 }]}>
        <View style={s.navIcon} />
        <Text style={[s.navTitle, { color: colors.text }]}>Profile</Text>
        <Pressable
          onPress={() => (editing ? setEditing(false) : openEdit())}
          style={({ pressed }) => [s.navIcon, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Cancel editing' : 'Edit profile'}
        >
          <Ionicons name={editing ? 'close' : 'create-outline'} size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {editing ? (
          /* ── Edit panel ── */
          <Animated.View entering={FadeInUp.duration(300)}>
            <GlassCard elevated innerStyle={s.editCard}>
              <Text style={[s.eyebrow, { color: colors.textMuted }]}>EDIT PROFILE</Text>

              <View style={s.field}>
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>FULL NAME</Text>
                <View style={[s.inputWrap, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Ionicons name="person-outline" size={16} color={colors.textFaint} />
                  <TextInput
                    style={[s.input, { color: colors.text }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={colors.textFaint}
                    autoCapitalize="words"
                    editable={!saving}
                  />
                </View>
              </View>

              {profile ? (
                <>
                  <View style={s.stepperPair}>
                    <Stepper label="WEIGHT (KG)" value={weight} onChange={setWeight} min={25} max={300} />
                    <Stepper label="HEIGHT (CM)" value={height} onChange={setHeight} min={90} max={250} />
                  </View>

                  <View style={s.field}>
                    <Text style={[s.fieldLabel, { color: colors.textMuted }]}>GOAL</Text>
                    <View style={s.chipGrid}>
                      {GOALS.map((g) => {
                        const active = goal === g.key;
                        return (
                          <Pressable
                            key={g.key}
                            onPress={() => {
                              Haptics.selectionAsync().catch(() => {});
                              setGoal(g.key);
                            }}
                            style={[
                              s.chip,
                              {
                                backgroundColor: active ? colors.primarySoft : colors.surface,
                                borderColor: active ? colors.primary : colors.cardBorder,
                              },
                            ]}
                          >
                            <Text style={[s.chipText, { color: active ? colors.primary : colors.textMuted }]}>
                              {g.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </>
              ) : null}

              <View style={s.editActions}>
                <AnimatedButton
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setEditing(false)}
                  disabled={saving}
                  style={s.flex1}
                />
                <AnimatedButton label="Save Changes" onPress={handleSave} loading={saving} style={s.flex1} />
              </View>
            </GlassCard>
          </Animated.View>
        ) : (
          <>
            {/* ── Member card ── */}
            <Animated.View entering={FadeInUp.duration(340)}>
              <GlassCard elevated innerStyle={s.memberCard}>
                <FitnessAvatar name={user?.name} uri={user?.avatarUrl} size={54} />
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
          </>
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
  content: { paddingHorizontal: 18, gap: 12 },
  flex1: { flex: 1 },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  navIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 16, fontFamily: FONTS.bodyBold },

  // Member card
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
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

  // Edit panel
  editCard: { padding: 18, gap: 0 },
  eyebrow: { fontSize: 10.5, fontFamily: FONTS.bodyBold, letterSpacing: 0.9, marginBottom: 14 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11.5, fontFamily: FONTS.bodyBold, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 13.5, fontFamily: FONTS.body, padding: 0 },

  stepperPair: { flexDirection: 'row', gap: 10 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  stepperBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepperVal: { fontSize: 16, fontFamily: FONTS.bodyExtra },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 12.5, fontFamily: FONTS.bodySemi },

  editActions: { flexDirection: 'row', gap: 10, marginTop: 6 },

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
