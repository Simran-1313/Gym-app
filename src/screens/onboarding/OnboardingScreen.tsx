import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../context/PlansContext';
import { getProfile } from '../../services/member.service';
import { saveProfile } from '../../services/profileSave';
import { confirmOnline, useConnectivity } from '../../services/network';
import { FONTS, INPUT_LABEL, RADIUS, SPACING, TYPOGRAPHY, ThemeColors } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ActivityLevel, DietPreference, FitnessGoal, Gender } from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AnimatedChip } from '../../components/ui/AnimatedChip';
import { AiLoadingPulse } from '../../components/ui/AiLoadingPulse';
import {
  draftFromProfile,
  EMPTY_DRAFT,
  FieldErrors,
  firstInvalidStep,
  ONBOARDING_STEPS,
  OnboardingDraft,
  toProfileInput,
  validateStep,
} from '../../utils/onboardingProfile';
import { clearDraft, loadDraft, saveDraft } from '../../utils/onboardingDraftStore';

/**
 * "Tell us about yourself" — three short steps instead of one long form:
 *   1. Goal (one tap, advances by itself)
 *   2. Body (age, height, weight; gender optional)
 *   3. Food & activity (activity pre-set to the common case; allergies optional)
 *
 * Everything the member enters is kept as a local draft, so a dropped
 * connection, an expired session or an app restart never costs them the form.
 * Saving waits only for the *profile* to be stored — the diet plan carries on
 * in the background (PlansContext) and shows up on the Diet Plan screen.
 */

type Option<T extends string> = { value: T; label: string; hint?: string; icon?: keyof typeof Ionicons.glyphMap };

const GOAL_OPTIONS: Option<FitnessGoal>[] = [
  { value: 'WEIGHT_LOSS', label: 'Lose weight', hint: 'Burn fat with a calorie deficit', icon: 'flame-outline' },
  { value: 'MUSCLE_GAIN', label: 'Build muscle', hint: 'Get stronger with a protein-rich surplus', icon: 'barbell-outline' },
  { value: 'FITNESS', label: 'Stay fit', hint: 'Feel healthier and keep a balanced diet', icon: 'heart-outline' },
  { value: 'ENDURANCE', label: 'Improve endurance', hint: 'Fuel longer runs, rides and classes', icon: 'bicycle-outline' },
];

const GENDER_OPTIONS: Option<Gender>[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const DIET_OPTIONS: Option<DietPreference>[] = [
  { value: 'VEG', label: 'Vegetarian' },
  { value: 'NON_VEG', label: 'Non-veg' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'KETO', label: 'Keto' },
];

const ACTIVITY_OPTIONS: Option<ActivityLevel>[] = [
  { value: 'SEDENTARY', label: 'Mostly sitting', hint: 'Desk job, little exercise' },
  { value: 'LIGHT', label: 'Lightly active', hint: 'Exercise 1–2 days a week' },
  { value: 'MODERATE', label: 'Active', hint: 'Exercise 3–5 days a week' },
  { value: 'VERY_ACTIVE', label: 'Very active', hint: 'Hard training 6–7 days a week' },
];

const STEP_TITLES = ['What’s your main goal?', 'A bit about you', 'Food & activity'] as const;
const STEP_SUBTITLES = [
  'We’ll shape your diet and training around it.',
  'Used to work out your daily calories.',
  'So every meal in your plan is one you’ll actually eat.',
] as const;

/** How long a save may take before we tell the member it's still working. */
const SLOW_SAVE_MS = 8000;
/* ── Building blocks ── */

const StepProgress: React.FC<{ step: number; colors: ThemeColors }> = ({ step, colors }) => (
  <View style={baseStyles.progressWrap} accessibilityRole="progressbar" accessibilityLabel={`Step ${step + 1} of ${ONBOARDING_STEPS.length}`}>
    <View style={baseStyles.progressBars}>
      {ONBOARDING_STEPS.map((s, i) => (
        <View
          key={s}
          style={[
            baseStyles.progressBar,
            { backgroundColor: i <= step ? colors.primary : colors.surfaceBorder },
          ]}
        />
      ))}
    </View>
    <Text style={[baseStyles.progressLabel, { color: colors.textMuted }]}>
      Step {step + 1} of {ONBOARDING_STEPS.length}
    </Text>
  </View>
);

function ChoiceCard<T extends string>({
  option,
  selected,
  onPress,
  disabled,
  colors,
}: {
  option: Option<T>;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={option.hint ? `${option.label}. ${option.hint}` : option.label}
      style={({ pressed }) => [
        baseStyles.choiceCard,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.surfaceBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {option.icon ? (
        <View style={[baseStyles.choiceIcon, { backgroundColor: selected ? colors.primarySolid : colors.inset }]}>
          <Ionicons name={option.icon} size={20} color={selected ? colors.white : colors.textSecondary} />
        </View>
      ) : null}
      <View style={baseStyles.choiceText}>
        <Text style={[baseStyles.choiceLabel, { color: colors.text }]}>{option.label}</Text>
        {option.hint ? (
          <Text style={[baseStyles.choiceHint, { color: colors.textSecondary }]}>{option.hint}</Text>
        ) : null}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? colors.primary : colors.textMuted}
      />
    </Pressable>
  );
}

function ChipRow<T extends string>({
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
    <View style={baseStyles.chipRow} accessibilityRole="radiogroup">
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

const UnitSuffix: React.FC<{ unit: string; colors: ThemeColors }> = ({ unit, colors }) => (
  <Text style={[baseStyles.unit, { color: colors.textMuted }]}>{unit}</Text>
);

/* ── Screen ── */

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const { user, refreshUser, markOnboarded } = useAuth();
  const { trackGeneration } = usePlans();
  const { isOffline } = useConnectivity();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Reached two ways: the forced first-time flow (nothing to go back to) and
  // the "update later" flow from the main app (has a real back target).
  const forcedOnboarding = !user?.isOnboarded;
  const userId = user?.id ?? null;

  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [loadNote, setLoadNote] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [showAllergies, setShowAllergies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slowSave, setSlowSave] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const heightRef = useRef<TextInput>(null);
  const weightRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const step = draft.step;
  const stepKey = ONBOARDING_STEPS[step];
  const errors: FieldErrors = showErrors ? validateStep(stepKey, draft) : {};
  const isLastStep = step === ONBOARDING_STEPS.length - 1;

  /* ── Hydrate: local draft and/or the saved profile ── */

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const local = await loadDraft(userId);
      // First-time members: their own unfinished draft is the freshest thing
      // there is — show it at once rather than waiting on the network.
      if (forcedOnboarding && local) {
        if (!cancelled) {
          setDraft(local);
          setShowAllergies(!!local.allergies);
          setHydrated(true);
        }
        return;
      }

      try {
        const existing = await getProfile();
        if (cancelled) return;
        const next = existing ? draftFromProfile(existing) : local ?? EMPTY_DRAFT;
        setDraft(next);
        setShowAllergies(!!next.allergies);
      } catch {
        if (cancelled) return;
        // Couldn't reach the server: fall back to whatever was typed last.
        if (local) setDraft(local);
        if (!forcedOnboarding) {
          setLoadNote('Couldn’t load your saved profile, so some fields may be empty. You can still update them.');
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only on mount / account change — re-hydrating mid-edit would wipe input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Persist every change (debounced) so nothing typed is ever lost.
  useEffect(() => {
    if (!hydrated || !userId) return;
    const t = setTimeout(() => saveDraft(userId, draft), 400);
    return () => clearTimeout(t);
  }, [draft, hydrated, userId]);

  const update = useCallback(<K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    setSubmitError(null);
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  /* ── Navigation between steps ── */

  const goToStep = useCallback((next: number) => {
    setShowErrors(false);
    setDraft((d) => ({ ...d, step: next }));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const goBack = useCallback(() => {
    if (saving) return true;
    if (step > 0) {
      goToStep(step - 1);
      return true;
    }
    if (!forcedOnboarding && navigation.canGoBack()) {
      navigation.goBack();
      return true;
    }
    return false;
  }, [saving, step, goToStep, forcedOnboarding, navigation]);

  // Android back steps back through the form before leaving it.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => sub.remove();
  }, [goBack]);

  const selectGoal = (goal: FitnessGoal) => {
    Haptics.selectionAsync().catch(() => {});
    update('goal', goal);
    // One question on this step, so answering it is the "continue".
    setTimeout(() => {
      if (mounted.current) goToStep(1);
    }, 220);
  };

  /* ── Submit ── */

  const submit = async () => {
    const invalid = firstInvalidStep(draft);
    if (invalid !== -1) {
      goToStep(invalid);
      setShowErrors(true);
      return;
    }
    if (!userId) return;

    setSubmitError(null);
    if (!(await confirmOnline())) {
      setSubmitError('You’re offline. Your answers are saved on this device — tap Save again once you’re connected.');
      return;
    }

    const input = toProfileInput(draft);
    setSaving(true);
    setSlowSave(false);
    const slowTimer = setTimeout(() => mounted.current && setSlowSave(true), SLOW_SAVE_MS);

    const { saved, request } = saveProfile(input);

    try {
      await saved;
    } catch (err) {
      clearTimeout(slowTimer);
      if (!mounted.current) return;
      setSaving(false);
      setSubmitError(
        `${err instanceof Error ? err.message : 'We couldn’t save your profile.'} Your answers are kept — try again when you’re ready.`,
      );
      return;
    }
    clearTimeout(slowTimer);

    // Profile is stored. The diet plan may still be generating inside the
    // same request (or on the server afterwards) — hand it to the plan store,
    // which keeps watching after this screen is gone.
    trackGeneration('DIET', request.then((r) => r.aiPlan));
    await clearDraft(userId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (forcedOnboarding) {
      // Flips the navigator straight to the main app; refreshUser then syncs
      // the rest of /me in the background.
      markOnboarded();
      refreshUser();
      return;
    }

    refreshUser();
    if (mounted.current) {
      setSaving(false);
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.replace('DietPlan');
    }
  };

  const handleContinue = () => {
    if (isLastStep) {
      submit();
      return;
    }
    if (Object.keys(validateStep(stepKey, draft)).length > 0) {
      setShowErrors(true);
      return;
    }
    goToStep(step + 1);
  };

  /* ── Render ── */

  const renderStep = () => {
    if (stepKey === 'goal') {
      return (
        <View style={styles.cards} accessibilityRole="radiogroup">
          {GOAL_OPTIONS.map((opt) => (
            <ChoiceCard
              key={opt.value}
              option={opt}
              selected={draft.goal === opt.value}
              onPress={() => selectGoal(opt.value)}
              colors={colors}
            />
          ))}
          {errors.goal ? <Text style={styles.errorText}>{errors.goal}</Text> : null}
        </View>
      );
    }

    if (stepKey === 'body') {
      return (
        <GlassCard innerStyle={styles.section}>
          <GlassInput
            label="Age"
            placeholder="e.g. 28"
            value={draft.age}
            onChangeText={(v) => update('age', v.replace(/[^\d]/g, ''))}
            keyboardType="number-pad"
            maxLength={3}
            returnKeyType="next"
            onSubmitEditing={() => heightRef.current?.focus()}
            submitBehavior="submit"
            rightIcon={<UnitSuffix unit="years" colors={colors} />}
            error={errors.age}
            editable={!saving}
            accessibilityLabel="Age in years"
          />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <GlassInput
                ref={heightRef}
                label="Height"
                placeholder="170"
                value={draft.height}
                onChangeText={(v) => update('height', v.replace(/[^\d.,]/g, ''))}
                keyboardType="decimal-pad"
                maxLength={5}
                returnKeyType="next"
                onSubmitEditing={() => weightRef.current?.focus()}
                submitBehavior="submit"
                rightIcon={<UnitSuffix unit="cm" colors={colors} />}
                // Half-width field: let the text shrink so the unit stays inside.
                style={styles.shrinkInput}
                error={errors.height}
                editable={!saving}
                accessibilityLabel="Height in centimetres"
              />
            </View>
            <View style={styles.flex1}>
              <GlassInput
                ref={weightRef}
                label="Weight"
                placeholder="70"
                value={draft.weight}
                onChangeText={(v) => update('weight', v.replace(/[^\d.,]/g, ''))}
                keyboardType="decimal-pad"
                maxLength={5}
                returnKeyType="done"
                rightIcon={<UnitSuffix unit="kg" colors={colors} />}
                style={styles.shrinkInput}
                error={errors.weight}
                editable={!saving}
                accessibilityLabel="Weight in kilograms"
              />
            </View>
          </View>
          <View style={styles.group}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Gender <Text style={{ color: colors.textMuted }}>(optional)</Text>
            </Text>
            <ChipRow
              options={GENDER_OPTIONS}
              selected={draft.gender}
              // Tapping the selected chip again clears it — "prefer not to say".
              onSelect={(g) => update('gender', draft.gender === g ? null : g)}
              disabled={saving}
            />
          </View>
        </GlassCard>
      );
    }

    return (
      <>
        <GlassCard innerStyle={styles.section}>
          <View style={styles.group}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>How do you eat?</Text>
            <ChipRow options={DIET_OPTIONS} selected={draft.diet} onSelect={(v) => update('diet', v)} disabled={saving} />
            {errors.diet ? <Text style={styles.errorText}>{errors.diet}</Text> : null}
          </View>

          {showAllergies ? (
            <GlassInput
              label="Food allergies (optional)"
              placeholder="e.g. peanuts, lactose"
              value={draft.allergies}
              onChangeText={(v) => update('allergies', v)}
              maxLength={200}
              editable={!saving}
              autoFocus={!draft.allergies}
            />
          ) : (
            <Pressable
              onPress={() => setShowAllergies(true)}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.linkRow}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.link, { color: colors.primary }]}>Add food allergies</Text>
            </Pressable>
          )}
        </GlassCard>

        <View style={styles.group}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>How active are you?</Text>
          <View style={styles.cards} accessibilityRole="radiogroup">
            {ACTIVITY_OPTIONS.map((opt) => (
              <ChoiceCard
                key={opt.value}
                option={opt}
                selected={draft.activity === opt.value}
                onPress={() => update('activity', opt.value)}
                disabled={saving}
                colors={colors}
              />
            ))}
          </View>
          {errors.activity ? <Text style={styles.errorText}>{errors.activity}</Text> : null}
        </View>
      </>
    );
  };

  const canGoBackInHeader = step > 0 || (!forcedOnboarding && navigation.canGoBack());

  return (
    <AnimatedScreen>
      <ScreenHeader
        title={forcedOnboarding ? 'Your Fitness Profile' : 'Update Fitness Profile'}
        onBack={canGoBackInHeader && !saving ? () => goBack() : undefined}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!hydrated ? (
          <View style={styles.loader}>
            <AiLoadingPulse icon="fitness-outline" size={40} />
            <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Loading your profile…</Text>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              <StepProgress step={step} colors={colors} />

              <Animated.View key={stepKey} entering={FadeIn.duration(200)} style={styles.stepBody}>
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
                    {STEP_TITLES[step]}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{STEP_SUBTITLES[step]}</Text>
                </View>

                {loadNote && step === 0 ? (
                  <View style={[styles.notice, { borderColor: `${colors.warning}55`, backgroundColor: `${colors.warning}14` }]}>
                    <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
                    <Text style={[styles.noticeText, { color: colors.textSecondary }]}>{loadNote}</Text>
                  </View>
                ) : null}

                {renderStep()}
              </Animated.View>
            </ScrollView>

            {/* Pinned outside the scroll view so the keyboard pushes it up
                rather than covering it. */}
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, SPACING.md), borderTopColor: colors.surfaceBorder, backgroundColor: colors.background },
              ]}
            >
              {submitError ? (
                <View
                  style={[styles.notice, { borderColor: `${colors.danger}55`, backgroundColor: `${colors.danger}12` }]}
                  accessibilityLiveRegion="polite"
                >
                  <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                  <Text style={[styles.noticeText, { color: colors.text }]}>{submitError}</Text>
                </View>
              ) : saving && slowSave ? (
                <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
                  Still saving — the connection is slow. Your answers are safe on this device.
                </Text>
              ) : isLastStep && isOffline ? (
                <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
                  You’re offline. Your answers are saved on this device until you reconnect.
                </Text>
              ) : isLastStep ? (
                <Text style={[styles.footerNote, { color: colors.textMuted }]}>
                  Your diet plan is built in the background — you can start using the app right away.
                </Text>
              ) : null}

              <View style={styles.footerButtons}>
                {step > 0 ? (
                  <AnimatedButton
                    label="Back"
                    variant="secondary"
                    onPress={() => goBack()}
                    disabled={saving}
                    style={styles.backButton}
                  />
                ) : null}
                {/* Step 1 advances on tap; the button is there for a member who
                    already picked a goal and came back to it. */}
                {stepKey !== 'goal' || draft.goal ? (
                  <AnimatedButton
                    label={isLastStep ? (forcedOnboarding ? 'Save & Start' : 'Save Changes') : 'Continue'}
                    onPress={handleContinue}
                    loading={saving}
                    disabled={saving}
                    style={styles.flex1}
                  />
                ) : null}
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </AnimatedScreen>
  );
};

// Theme-independent layout, shared by the small components above.
const baseStyles = StyleSheet.create({
  progressWrap: { gap: SPACING.sm },
  progressBars: { flexDirection: 'row', gap: 6 },
  progressBar: { flex: 1, height: 6, borderRadius: RADIUS.full },
  progressLabel: { ...TYPOGRAPHY.caption, fontFamily: FONTS.bodyMedium },

  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 64,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  choiceIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1, gap: 2 },
  choiceLabel: { fontSize: 15, fontFamily: FONTS.bodySemi },
  choiceHint: { fontSize: 13, lineHeight: 18 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  unit: { fontSize: 14, fontFamily: FONTS.bodyMedium },
});

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  flex1: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  loaderText: { ...TYPOGRAPHY.body, textAlign: 'center' },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.gutter,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.lg,
  },
  stepBody: { gap: SPACING.lg },
  header: { gap: SPACING.xs },
  title: { ...TYPOGRAPHY.title },
  subtitle: { ...TYPOGRAPHY.body },

  cards: { gap: SPACING.sm },
  section: { padding: SPACING.md + 4, gap: SPACING.md },
  group: { gap: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm },
  shrinkInput: { minWidth: 0 },
  fieldLabel: { ...INPUT_LABEL },
  errorText: { fontFamily: FONTS.bodyMedium, fontSize: 12, lineHeight: 16, color: colors.danger },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  link: { fontSize: 14, fontFamily: FONTS.bodySemi },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },

  footer: {
    paddingHorizontal: SPACING.gutter,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButtons: { flexDirection: 'row', gap: SPACING.sm },
  backButton: { minWidth: 104 },
  footerNote: { ...TYPOGRAPHY.caption, textAlign: 'center', lineHeight: 18 },
});
