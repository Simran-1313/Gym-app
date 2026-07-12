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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../context/PlansContext';
import { COLORS, FONT_SIZE, GRADIENTS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
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

const MealCard: React.FC<{ meal: DietPlanDay['meals'][0] }> = ({ meal }) => (
  <GlassCard glowColor={COLORS.accent} style={styles.mealCard}>
    <View style={styles.mealHeader}>
      <Text style={styles.mealName}>{meal.name}</Text>
      <StatBadge icon="flame-outline" label="Cal" value={`${meal.calories}`} color={COLORS.warning} />
    </View>
    {(Array.isArray(meal.items) ? meal.items : []).map((item, i) => (
      <View key={i} style={styles.mealItemRow}>
        <View style={styles.bullet} />
        <Text style={styles.mealItem}>{item}</Text>
      </View>
    ))}
  </GlassCard>
);

export const DietPlanScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const route = useRoute<RouteProp<RootStackParams, 'DietPlan'>>();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
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
    if (navigation.canGoBack()) navigation.goBack();
  };

  const renderBody = () => {
    if (showBlockingLoader) {
      return (
        <View style={styles.center}>
          <AiLoadingPulse icon="nutrition-outline" size={48} />
          <Text style={styles.loadingTitle}>
            {diet.generating
              ? 'Crafting your diet plan'
              : awaitingBackground
              ? 'Preparing your plan…'
              : 'Loading your diet plan'}
          </Text>
          <Text style={styles.loadingText}>
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
          <View style={[styles.emptyIconWrap, diet.error && { borderColor: `${COLORS.danger}40`, backgroundColor: `${COLORS.danger}10` }]}>
            <Ionicons name={diet.error ? "warning-outline" : "nutrition-outline"} size={42} color={diet.error ? COLORS.danger : COLORS.accent} />
          </View>
          <Text style={styles.emptyTitle}>{diet.error ? "Oops, something went wrong!" : "No diet plan yet"}</Text>
          <Text style={styles.errorText}>
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
                icon={<Ionicons name="sparkles" size={18} color={COLORS.white} />}
              />
              <AnimatedButton
                label="Update Fitness Profile"
                variant="secondary"
                onPress={() => navigation.navigate('Onboarding')}
                icon={<Ionicons name="create-outline" size={16} color={COLORS.primary} />}
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
            tintColor={COLORS.primary}
          />
        }
      >
        {diet.generating && (
          <View style={styles.banner}>
            <AiLoadingPulse icon="sparkles" size={18} />
            <Text style={styles.bannerText}>Generating a fresh plan…</Text>
          </View>
        )}

        <GlassCard glowColor={COLORS.primary} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles" size={20} color={COLORS.accent} />
            <Text style={styles.summaryTitle}>Your Diet Plan</Text>
          </View>
          <Text style={styles.summaryText}>{content.summary}</Text>
          {!!updatedLabel && (
            <View style={styles.updatedRow}>
              <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.updatedText}>Updated {updatedLabel}</Text>
            </View>
          )}

          <View style={styles.caloriesRow}>
            <Ionicons name="flame" size={22} color={COLORS.warning} />
            <Text style={styles.caloriesValue}>{content.calories}</Text>
            <Text style={styles.caloriesUnit}>kcal / day</Text>
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
                    <Text style={styles.dayTabTextActive}>{day.day}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.dayTab}>
                    <Text style={styles.dayTabText}>{day.day}</Text>
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
          icon={<Ionicons name="sparkles" size={18} color={COLORS.primary} />}
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
  loadingTitle: { ...TYPOGRAPHY.title, color: COLORS.text, fontSize: FONT_SIZE.lg, textAlign: 'center' },
  loadingText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, textAlign: 'center', lineHeight: 22 },
  errorText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, textAlign: 'center', lineHeight: 22 },

  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyTitle: { ...TYPOGRAPHY.title, color: COLORS.text, fontSize: FONT_SIZE.xl, textAlign: 'center' },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  bannerText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '600' },

  summaryCard: { gap: SPACING.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  summaryTitle: { ...TYPOGRAPHY.title, color: COLORS.text, fontSize: FONT_SIZE.xl },
  summaryText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 21 },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  updatedText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },

  caloriesRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.xs },
  caloriesValue: { color: COLORS.text, fontSize: FONT_SIZE.hero, fontWeight: '800' },
  caloriesUnit: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },

  macrosRow: { flexDirection: 'row', justifyContent: 'space-around' },

  dayTabs: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  dayTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  dayTabActive: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  dayTabText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  dayTabTextActive: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '700' },

  mealCard: { gap: SPACING.sm, marginBottom: SPACING.sm },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealName: { ...TYPOGRAPHY.heading, color: COLORS.text },
  mealItemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  bullet: { width: 5, height: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.primary },
  mealItem: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, flex: 1, lineHeight: 19 },
});
