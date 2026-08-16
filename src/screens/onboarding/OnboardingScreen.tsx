import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { submitProfile, getProfile } from '../../services/member.service';
import { COLORS, DARK_COLORS, FONTS, GRADIENTS, LIGHT_COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import {
  ActivityLevel,
  DietPreference,
  FitnessGoal,
  Gender,
} from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AnimatedChip } from '../../components/ui/AnimatedChip';
import { AiLoadingPulse } from '../../components/ui/AiLoadingPulse';

type Option<T extends string> = { value: T; label: string };

/** age, weight, height, gender, goal, diet, activity — drives the progress bar. */
const REQUIRED_FIELDS = 7;

const GENDER_OPTIONS: Option<Gender>[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const GOAL_OPTIONS: Option<FitnessGoal>[] = [
  { value: 'WEIGHT_LOSS', label: 'Weight Loss' },
  { value: 'MUSCLE_GAIN', label: 'Muscle Gain' },
  { value: 'FITNESS', label: 'General Fitness' },
  { value: 'ENDURANCE', label: 'Endurance' },
];

const DIET_OPTIONS: Option<DietPreference>[] = [
  { value: 'VEG', label: 'Vegetarian' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'NON_VEG', label: 'Non-Veg' },
  { value: 'KETO', label: 'Keto' },
];

const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  { value: 'SEDENTARY', label: 'Sedentary' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'VERY_ACTIVE', label: 'Active' },
];

function OptionSelector<T extends string>({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: Option<T>[];
  selected: T | null;
  onSelect: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.optionsRow}>
      {options.map((opt, i) => (
        <AnimatedChip
          key={opt.value}
          label={opt.label}
          selected={selected === opt.value}
          onPress={() => onSelect(opt.value)}
          disabled={disabled}
          index={i}
        />
      ))}
    </View>
  );
}

const FormProgress: React.FC<{ progress: number }> = ({ progress }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    // Ease-out so the bar settles instead of stopping dead on each field.
    width.value = withTiming(progress, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [progress, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFillWrap, barStyle]}>
        <LinearGradient
          colors={[...GRADIENTS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.progressFill}
        />
      </Animated.View>
    </View>
  );
};

/** Icon + title, so each card announces what it's asking for. */
const SectionHeader: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  color: string;
  tint: string;
}> = ({ icon, title, color, tint }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIcon, { backgroundColor: `${tint}1F` }]}>
      <Ionicons name={icon} size={16} color={tint} />
    </View>
    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
  </View>
);

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { refreshUser, theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [diet, setDiet] = useState<DietPreference | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [allergies, setAllergies] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const existing = await getProfile();
        if (cancelled || !existing) return;
        if (existing.age) setAge(String(existing.age));
        if (existing.weight) setWeight(String(existing.weight));
        if (existing.height) setHeight(String(existing.height));
        if (existing.gender) setGender(existing.gender);
        if (existing.fitnessGoal) setGoal(existing.fitnessGoal);
        if (existing.dietPreference) setDiet(existing.dietPreference);
        if (existing.activityLevel) setActivity(existing.activityLevel);
        if (existing.allergies) setAllergies(existing.allergies);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const completion = useMemo(() => {
    let filled = 0;
    const total = REQUIRED_FIELDS;
    if (age) filled++;
    if (weight) filled++;
    if (height) filled++;
    if (gender) filled++;
    if (goal) filled++;
    if (diet) filled++;
    if (activity) filled++;
    return filled / total;
  }, [age, weight, height, gender, goal, diet, activity]);

  const handleSubmit = async () => {
    const ageNum = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!ageNum || ageNum < 10 || ageNum > 120) {
      Alert.alert('Invalid Age', 'Please enter a valid age (10–120).');
      return;
    }
    if (!weightNum || weightNum <= 0 || weightNum > 500) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight in kg.');
      return;
    }
    if (!heightNum || heightNum <= 0 || heightNum > 300) {
      Alert.alert('Invalid Height', 'Please enter a valid height in cm.');
      return;
    }
    if (!goal || !diet || !activity) {
      Alert.alert('Missing Fields', 'Please select your goal, diet preference, and activity level.');
      return;
    }

    setLoading(true);
    try {
      const { aiPlan } = await submitProfile({
        age: ageNum,
        weight: weightNum,
        height: heightNum,
        gender: gender ?? undefined,
        fitnessGoal: goal,
        dietPreference: diet,
        activityLevel: activity,
        allergies: allergies.trim() || undefined,
      });

      // Refresh auth so isOnboarded is set before navigation.
      await refreshUser();

      if (aiPlan) {
        // Plan was already generated (e.g. cache hit) — pass it directly.
        navigation.replace('DietPlan', { plan: aiPlan, fromOnboarding: true });
      } else {
        // Plan is generating in the background. Navigate to the DietPlan screen
        // without a pre-loaded plan — it will fetch from the API once ready.
        navigation.replace('DietPlan', { fromOnboarding: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save your profile.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {profileLoading ? (
          <View style={styles.profileLoader}>
            <AiLoadingPulse icon="fitness-outline" size={40} />
            <Text style={[styles.profileLoaderText, { color: colors.textSecondary }]}>
              Loading your profile…
            </Text>
          </View>
        ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Tell us about yourself</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We'll use this to build your personalised diet and training plans.
            </Text>

            <View style={styles.progressBlock}>
              <FormProgress progress={completion} />
              <View style={styles.progressMeta}>
                <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                  {Math.round(completion * 100)}% complete
                </Text>
                <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                  {REQUIRED_FIELDS - Math.round(completion * REQUIRED_FIELDS)} left
                </Text>
              </View>
            </View>
          </Animated.View>

          <GlassCard glowColor={COLORS.accent} innerStyle={styles.section}>
            <SectionHeader icon="person-outline" title="Personal info" color={colors.text} tint={COLORS.accent} />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <GlassInput label="Age" placeholder="25" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} editable={!loading} />
              </View>
              <View style={styles.flex1}>
                <GlassInput label="Weight" placeholder="70 kg" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={6} editable={!loading} />
              </View>
              <View style={styles.flex1}>
                <GlassInput label="Height" placeholder="175 cm" value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={6} editable={!loading} />
              </View>
            </View>
            <View style={styles.group}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Gender</Text>
              <OptionSelector options={GENDER_OPTIONS} selected={gender} onSelect={setGender} disabled={loading} />
            </View>
          </GlassCard>

          <GlassCard glowColor={COLORS.primary} innerStyle={styles.section}>
            <SectionHeader icon="trophy-outline" title="Goals" color={colors.text} tint={COLORS.primary} />
            <View style={styles.group}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>What are you training for?</Text>
              <OptionSelector options={GOAL_OPTIONS} selected={goal} onSelect={setGoal} disabled={loading} />
            </View>
          </GlassCard>

          <GlassCard glowColor={COLORS.primaryGlow} innerStyle={styles.section}>
            <SectionHeader icon="restaurant-outline" title="Preferences" color={colors.text} tint={COLORS.primaryGlow} />
            <View style={styles.group}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Diet preference</Text>
              <OptionSelector options={DIET_OPTIONS} selected={diet} onSelect={setDiet} disabled={loading} />
            </View>
            <View style={styles.group}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Activity level</Text>
              <OptionSelector options={ACTIVITY_OPTIONS} selected={activity} onSelect={setActivity} disabled={loading} />
            </View>
            <GlassInput
              label="Allergies (optional)"
              placeholder="e.g. peanuts, lactose"
              value={allergies}
              onChangeText={setAllergies}
              multiline
              numberOfLines={2}
              editable={!loading}
              style={styles.textArea}
            />
          </GlassCard>

          <View style={styles.footer}>
            <AnimatedButton
              label="Create My Plan"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
            />
            <Text style={[styles.footerNote, { color: colors.textMuted }]}>
              You can update these details anytime from your profile.
            </Text>
          </View>
        </ScrollView>
        )}
      </KeyboardAvoidingView>
    </AnimatedScreen>
  );
};

// One spacing scale: 8 inside a label/control pair, 16 between groups in a
// card, 24 between cards, 32 before and after the page's edges.
const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  profileLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  profileLoaderText: { ...TYPOGRAPHY.body, textAlign: 'center' as const },

  header: { gap: SPACING.sm },
  title: { ...TYPOGRAPHY.title },
  subtitle: { ...TYPOGRAPHY.body },
  progressBlock: { gap: SPACING.sm, marginTop: SPACING.xs },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  progressFillWrap: { height: '100%', borderRadius: RADIUS.full, overflow: 'hidden' as const },
  progressFill: { flex: 1, borderRadius: RADIUS.full },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { ...TYPOGRAPHY.caption, fontFamily: FONTS.bodyMedium },

  section: { padding: SPACING.lg, gap: SPACING.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...TYPOGRAPHY.heading, fontFamily: FONTS.displaySemi },

  // A label and the control it names belong together — 8 apart, while the
  // card's own 16 gap keeps one group clear of the next.
  group: { gap: SPACING.sm },
  fieldLabel: { ...TYPOGRAPHY.label },
  row: { flexDirection: 'row', gap: SPACING.sm },
  flex1: { flex: 1 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: SPACING.sm },

  footer: { gap: SPACING.md, marginTop: SPACING.xs },
  footerNote: { ...TYPOGRAPHY.caption, textAlign: 'center' as const, lineHeight: 18 },
});
