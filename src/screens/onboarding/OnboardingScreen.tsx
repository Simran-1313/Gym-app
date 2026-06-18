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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../context/AuthContext';
import { submitProfile, getProfile } from '../../services/member.service';
import { COLORS, DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
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
    width.value = withTiming(progress, { duration: 400 });
  }, [progress, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, barStyle]} />
    </View>
  );
};

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

  useEffect(() => {
    const loadProfile = async () => {
      const existing = await getProfile();
      if (existing) {
        if (existing.age) setAge(String(existing.age));
        if (existing.weight) setWeight(String(existing.weight));
        if (existing.height) setHeight(String(existing.height));
        if (existing.gender) setGender(existing.gender);
        if (existing.fitnessGoal) setGoal(existing.fitnessGoal);
        if (existing.dietPreference) setDiet(existing.dietPreference);
        if (existing.activityLevel) setActivity(existing.activityLevel);
        if (existing.allergies) setAllergies(existing.allergies);
      }
    };
    loadProfile();
  }, []);

  const completion = useMemo(() => {
    let filled = 0;
    const total = 7;
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

      if (aiPlan) {
        navigation.replace('DietPlan', { plan: aiPlan, fromOnboarding: true });
      } else {
        Alert.alert(
          'Profile Saved',
          'Your profile was saved but the diet plan could not be generated. You can retry from your profile.',
          [{ text: 'OK', onPress: () => refreshUser() }],
        );
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <GlassCard glowColor={COLORS.primary} style={styles.logoCard} noPadding>
              <View style={styles.logoInner}>
                <Ionicons name="fitness" size={36} color={COLORS.primary} />
              </View>
            </GlassCard>
            <Text style={[styles.title, { color: colors.text }]}>Tell us about yourself</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>We'll use this to build your personalised diet plan.</Text>
            <FormProgress progress={completion} />
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>{Math.round(completion * 100)}% complete</Text>
          </View>

          <GlassCard glowColor={COLORS.accent} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Info</Text>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <GlassInput label="Age" placeholder="25" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} editable={!loading} />
              </View>
              <View style={styles.flex1}>
                <GlassInput label="Weight (kg)" placeholder="70" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={6} editable={!loading} />
              </View>
              <View style={styles.flex1}>
                <GlassInput label="Height (cm)" placeholder="175" value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={6} editable={!loading} />
              </View>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Gender</Text>
            <OptionSelector options={GENDER_OPTIONS} selected={gender} onSelect={setGender} disabled={loading} />
          </GlassCard>

          <GlassCard glowColor={COLORS.primary} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Goals</Text>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Fitness Goal</Text>
            <OptionSelector options={GOAL_OPTIONS} selected={goal} onSelect={setGoal} disabled={loading} />
          </GlassCard>

          <GlassCard glowColor={COLORS.primaryGlow} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Diet Preference</Text>
            <OptionSelector options={DIET_OPTIONS} selected={diet} onSelect={setDiet} disabled={loading} />
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Activity Level</Text>
            <OptionSelector options={ACTIVITY_OPTIONS} selected={activity} onSelect={setActivity} disabled={loading} />
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

          <AnimatedButton
            label={loading ? 'Generating your diet plan…' : 'Create My Plan'}
            onPress={handleSubmit}
            loading={loading}
            icon={loading ? <AiLoadingPulse icon="nutrition-outline" size={22} /> : undefined}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
  header: { alignItems: 'center', marginBottom: SPACING.sm },
  logoCard: { marginBottom: SPACING.md, borderRadius: RADIUS.xl },
  logoInner: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPOGRAPHY.title, textAlign: 'center' as const },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center' as const, marginTop: SPACING.xs, lineHeight: 20 },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    marginTop: SPACING.md,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  progressLabel: { fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
  section: { gap: SPACING.md },
  sectionTitle: { ...TYPOGRAPHY.heading },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '500' as const, marginTop: SPACING.xs },
  row: { flexDirection: 'row', gap: SPACING.sm },
  flex1: { flex: 1 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  textArea: { minHeight: 72, textAlignVertical: 'top', paddingTop: SPACING.sm },
});
