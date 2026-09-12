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
import { CommonActions, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../context/PlansContext';
import { FONT_SIZE, FONTS, GRADIENTS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { DietPlanDay } from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';
import { normalizeDietPlanContent } from '../../utils/dietPlan';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { StatBadge } from '../../components/ui/StatBadge';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AiLoadingPulse } from '../../components/ui/AiLoadingPulse';

const formatUpdated = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const MealCard: React.FC<{ meal: DietPlanDay['meals'][0] }> = ({ meal }) => {
  const colors = useThemeColors();
  return (
    <GlassCard glowColor={colors.accent} style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <Text style={[styles.mealName, { color: colors.text }]}>{meal.name}</Text>
        <StatBadge icon="flame-outline" label="Cal" value={`${meal.calories}`} color={colors.warning} />
      </View>
      {(Array.isArray(meal.items) ? meal.items : []).map((item, i) => (
        <View key={i} style={styles.mealItemRow}>
          <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
          <Text style={[styles.mealItem, { color: colors.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </GlassCard>
  );
};

export const DietPlanScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const route = useRoute<RouteProp<RootStackParams, 'DietPlan'>>();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const colors = useThemeColors();
  const { diet, loadPlan, generatePlan, setPlan } = usePlans();

  const [selectedDay, setSelectedDay] = useState(0);
  // True while we're waiting for a background-generated plan (after onboarding).
  const [awaitingBackground, setAwaitingBackground] = useState(false);

  // Hydrate once on mount — never re-run on context updates (prevents flicker).
  useEffect(() => {
    const paramPlan = route.params?.plan ?? null;
    const shouldGenerate = !!route.params?.generate;
    const fromOnboarding = !!route.params?.fromOnboarding;

    if (paramPlan) {
      setPlan('DIET', paramPlan);
      return;
    }
    if (shouldGenerate) {
      generatePlan('DIET');
      return;
    }
    // If coming straight from onboarding without a pre-loaded plan, the AI is
    // still generating in the background. Start polling until it appears.
    if (fromOnboarding) setAwaitingBackground(true);
    loadPlan('DIET');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 5 s while awaiting the background-generated plan (up to 90 s).
  useEffect(() => {
    if (!awaitingBackground || diet.plan || diet.generating) return;

    const poll = setInterval(() => loadPlan('DIET', true), 5000);
    const giveUp = setTimeout(() => {
      setAwaitingBackground(false);
      clearInterval(poll);
    }, 90000);

    // Stop polling as soon as the plan arrives.
    if (diet.loaded && diet.plan) {
      setAwaitingBackground(false);
      clearInterval(poll);
      clearTimeout(giveUp);
    }

    return () => {
      clearInterval(poll);
      clearTimeout(giveUp);
    };
  }, [awaitingBackground, diet.plan, diet.generating, diet.loaded, loadPlan]);

  const plan = diet.plan;
  const content = plan ? normalizeDietPlanContent(plan.content) : null;
  const cameFromOnboarding = !user?.isOnboarded || !!route.params?.fromOnboarding;
  const showBlockingLoader = (diet.generating || diet.loading || awaitingBackground) && !content;

  const handleGenerateNew = useCallback(() => {
    Alert.alert(
      'Generate a fresh plan?',
      'This builds a new 7-day diet plan from your current fitness profile. It can take up to a minute.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setSelectedDay(0);
            await generatePlan('DIET');
          },
        },
      ],
    );
  }, [generatePlan]);

  const handleDone = async () => {
    await refreshUser();

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // Onboarding arrives here through `replace`, so this screen is the only
    // route on the stack and there is nothing to go back to — without an
    // explicit destination the button does nothing at all. Reset to the app
    // root instead, but only once the post-onboarding stack is mounted;
    // otherwise the auth state flip that refreshUser just triggered is what
    // swaps the navigator.
    if (navigation.getState()?.routeNames.includes('MainTabs')) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
    }
  };

  const renderBody = () => {
    if (showBlockingLoader) {
      return (
        <View style={styles.center}>
          <AiLoadingPulse icon="nutrition-outline" size={48} />
          <Text style={[styles.loadingTitle, { color: colors.text }]}>
            {diet.generating
              ? 'Crafting your diet plan'
              : awaitingBackground
              ? 'Preparing your plan…'
              : 'Loading your diet plan'}
          </Text>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {diet.generating || awaitingBackground
              ? 'Our AI nutritionist is balancing your meals and macros. This usually takes under a minute.'
              : 'Fetching your saved plan…'}
          </Text>
        </View>
      );
    }

    if (!content) {
      return (
        <View style={styles.center}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }, diet.error && { borderColor: `${colors.danger}40`, backgroundColor: `${colors.danger}10` }]}>
            <Ionicons name={diet.error ? "warning-outline" : "nutrition-outline"} size={42} color={diet.error ? colors.danger : colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{diet.error ? "Oops, something went wrong!" : "No diet plan yet"}</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {diet.error ?? 'Generate a personalised 7-day diet plan from your fitness profile.'}
          </Text>
          {diet.error ? (
            <AnimatedButton label="Try Again" onPress={() => loadPlan('DIET')} />
          ) : (
            <>
              <AnimatedButton
                label={diet.generating ? 'Generating…' : 'Generate My Diet Plan'}
                onPress={() => generatePlan('DIET')}
                loading={diet.generating}
                disabled={diet.generating}
                icon={<Ionicons name="sparkles" size={18} color={colors.white} />}
              />
              <AnimatedButton
                label="Update Fitness Profile"
                variant="secondary"
                onPress={() => navigation.navigate('Onboarding')}
                icon={<Ionicons name="create-outline" size={16} color={colors.primary} />}
              />
            </>
          )}
        </View>
      );
    }

    const maxMacro = Math.max(content.macros.proteinG, content.macros.carbsG, content.macros.fatG, 1);
    const activeDay = content.days[selectedDay] ?? content.days[0];
    const updatedLabel = formatUpdated(plan?.createdAt);

    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={diet.loading}
            onRefresh={() => loadPlan('DIET', true)}
            tintColor={colors.primary}
          />
        }
      >
        {diet.generating && (
          <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <AiLoadingPulse icon="sparkles" size={18} />
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>Generating a fresh plan…</Text>
          </View>
        )}

        <GlassCard glowColor={colors.primary} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Your Diet Plan</Text>
          </View>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{content.summary}</Text>
          {!!updatedLabel && (
            <View style={styles.updatedRow}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.updatedText, { color: colors.textMuted }]}>Updated {updatedLabel}</Text>
            </View>
          )}

          <View style={styles.caloriesRow}>
            <Ionicons name="flame" size={22} color={colors.warning} />
            <Text style={[styles.caloriesValue, { color: colors.text }]}>{content.calories}</Text>
            <Text style={[styles.caloriesUnit, { color: colors.textMuted }]}>kcal / day</Text>
          </View>

          <View style={styles.macrosRow}>
            <ProgressRing
              progress={content.macros.proteinG / maxMacro}
              size={72}
              value={`${content.macros.proteinG}g`}
              label="Protein"
            />
            <ProgressRing
              progress={content.macros.carbsG / maxMacro}
              size={72}
              value={`${content.macros.carbsG}g`}
              label="Carbs"
            />
            <ProgressRing
              progress={content.macros.fatG / maxMacro}
              size={72}
              value={`${content.macros.fatG}g`}
              label="Fat"
            />
          </View>
        </GlassCard>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabs}>
          {content.days.map((day, i) => {
            const active = selectedDay === i;
            return (
              <Pressable key={day.day} onPress={() => setSelectedDay(i)}>
                {active ? (
                  <LinearGradient colors={[...GRADIENTS.primary]} style={styles.dayTabActive}>
                    <Text style={[styles.dayTabTextActive, { color: colors.white }]}>{day.day}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.dayTab, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <Text style={[styles.dayTabText, { color: colors.textSecondary }]}>{day.day}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View key={selectedDay}>
          {(activeDay.meals ?? []).map((meal, idx) => (
            <MealCard key={`${meal.name}-${idx}`} meal={meal} />
          ))}
        </View>

        <AnimatedButton
          label={diet.generating ? 'Generating…' : 'Generate New Plan'}
          variant="secondary"
          onPress={handleGenerateNew}
          loading={diet.generating}
          disabled={diet.generating}
          icon={<Ionicons name="sparkles" size={18} color={colors.primary} />}
        />

        {cameFromOnboarding && <AnimatedButton label="Continue to App" onPress={handleDone} />}
      </ScrollView>
    );
  };

  return (
    <ScreenBackground>
      <View style={[styles.shell, { paddingTop: insets.top + 56 }]}>
        {renderBody()}
      </View>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  shell: { flex: 1 },
  root: { flex: 1 },
  scroll: { padding: SPACING.lg, gap: SPACING.md },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  loadingTitle: { ...TYPOGRAPHY.title, fontSize: FONT_SIZE.lg, textAlign: 'center' },
  loadingText: { fontSize: FONT_SIZE.md, textAlign: 'center', lineHeight: 22 },
  errorText: { fontSize: FONT_SIZE.md, textAlign: 'center', lineHeight: 22 },

  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyTitle: { ...TYPOGRAPHY.title, fontSize: FONT_SIZE.xl, textAlign: 'center' },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  bannerText: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.bodySemi },

  summaryCard: { gap: SPACING.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  summaryTitle: { ...TYPOGRAPHY.title, fontSize: FONT_SIZE.xl },
  summaryText: { ...TYPOGRAPHY.body, lineHeight: 21 },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  updatedText: { fontSize: FONT_SIZE.xs },

  caloriesRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.xs },
  caloriesValue: { fontSize: FONT_SIZE.hero, fontFamily: FONTS.bodyExtra },
  caloriesUnit: { fontSize: FONT_SIZE.sm },

  macrosRow: { flexDirection: 'row', justifyContent: 'space-around' },

  dayTabs: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  dayTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  dayTabActive: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  dayTabText: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.bodySemi },
  dayTabTextActive: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.bodyBold },

  mealCard: { gap: SPACING.sm, marginBottom: SPACING.sm },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealName: { ...TYPOGRAPHY.heading },
  mealItemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  bullet: { width: 5, height: 5, borderRadius: RADIUS.full },
  mealItem: { fontSize: FONT_SIZE.sm, flex: 1, lineHeight: 19 },
});
