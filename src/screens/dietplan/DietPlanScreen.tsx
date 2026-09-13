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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../context/PlansContext';
import { FONTS, RADIUS, SPACING } from '../../config/theme';
import { DietPlanDay } from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';
import { normalizeDietPlanContent } from '../../utils/dietPlan';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AiLoadingPulse } from '../../components/ui/AiLoadingPulse';

/**
 * Ported from `#screen-diet-plan` in docs/UI_PROTOTYPE.html: a "Daily Target"
 * card with three macro rings, a 7-day tab strip (`.daytabs`), and one card
 * per meal reading as a single flowing sentence rather than a bullet list.
 */

const formatUpdated = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/** The prototype keys each meal card off an emoji drawn from its name. Falls
 * back to a fork/knife for anything that isn't one of the four usual slots. */
const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍛',
  snack: '🍌',
};

const emojiFor = (name: string): string => {
  const key = name.trim().toLowerCase();
  return MEAL_EMOJI[key] ?? '🍽️';
};

/** kcal contribution of each macro, as a % of the day's total calories —
 * derived straight from the plan's own grams (4 kcal/g protein & carbs,
 * 9 kcal/g fat), not an invented target percentage. */
const macroPercents = (macros: { proteinG: number; carbsG: number; fatG: number }, calories: number) => {
  if (!calories) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((macros.proteinG * 4 * 100) / calories),
    carbs: Math.round((macros.carbsG * 4 * 100) / calories),
    fat: Math.round((macros.fatG * 9 * 100) / calories),
  };
};

const MealCard: React.FC<{ meal: DietPlanDay['meals'][0] }> = ({ meal }) => {
  const colors = useThemeColors();
  const items = Array.isArray(meal.items) ? meal.items : [];

  return (
    <GlassCard style={s.mealCard} innerStyle={s.mealCardInner}>
      <View style={s.mealHeader}>
        <Text style={[s.mealName, { color: colors.text }]}>
          {emojiFor(meal.name)} {meal.name}
        </Text>
        <Text style={[s.mealCal, { color: colors.textMuted }]}>{meal.calories} kcal</Text>
      </View>
      {items.length > 0 ? (
        <Text style={[s.mealDesc, { color: colors.textMuted }]}>{items.join(', ')}</Text>
      ) : null}
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

    if (navigation.getState()?.routeNames.includes('MainTabs')) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] }));
    }
  };

  const renderBody = () => {
    if (showBlockingLoader) {
      return (
        <View style={s.center}>
          <AiLoadingPulse icon="nutrition-outline" size={48} />
          <Text style={[s.loadingTitle, { color: colors.text }]}>
            {diet.generating
              ? 'Crafting your diet plan'
              : awaitingBackground
              ? 'Preparing your plan…'
              : 'Loading your diet plan'}
          </Text>
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>
            {diet.generating || awaitingBackground
              ? 'Our AI nutritionist is balancing your meals and macros. This usually takes under a minute.'
              : 'Fetching your saved plan…'}
          </Text>
        </View>
      );
    }

    if (!content) {
      return (
        <View style={s.center}>
          <View
            style={[
              s.emptyIconWrap,
              { backgroundColor: colors.surface, borderColor: colors.cardBorder },
              diet.error && { borderColor: `${colors.danger}40`, backgroundColor: `${colors.danger}10` },
            ]}
          >
            <Ionicons
              name={diet.error ? 'warning-outline' : 'nutrition-outline'}
              size={42}
              color={diet.error ? colors.danger : colors.primary}
            />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>
            {diet.error ? 'Oops, something went wrong!' : 'No diet plan yet'}
          </Text>
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>
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

    const activeDay = content.days[selectedDay] ?? content.days[0];
    const updatedLabel = formatUpdated(plan?.createdAt);
    const pct = macroPercents(content.macros, content.calories);

    return (
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={diet.loading}
            onRefresh={() => loadPlan('DIET', true)}
            tintColor={colors.primary}
          />
        }
      >
        {diet.generating && (
          <View style={[s.banner, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <AiLoadingPulse icon="sparkles" size={18} />
            <Text style={[s.bannerText, { color: colors.textSecondary }]}>Generating a fresh plan…</Text>
          </View>
        )}

        {/* ── Daily Target ── */}
        <GlassCard elevated style={s.targetCard} innerStyle={s.targetCardInner}>
          <View style={s.targetTop}>
            <View>
              <Text style={[s.eyebrow, { color: colors.textMuted }]}>DAILY TARGET</Text>
              <Text style={[s.targetValue, { color: colors.text }]}>
                {content.calories.toLocaleString('en-IN')}{' '}
                <Text style={[s.targetUnit, { color: colors.textMuted }]}>kcal</Text>
              </Text>
            </View>
            <View style={s.ringsRow}>
              <ProgressRing progress={pct.protein / 100} size={64} strokeWidth={6} color={colors.primary} value={`${pct.protein}%`} label="Protein" />
              <ProgressRing progress={pct.carbs / 100} size={64} strokeWidth={6} color={colors.warning} value={`${pct.carbs}%`} label="Carbs" />
              <ProgressRing progress={pct.fat / 100} size={64} strokeWidth={6} color={colors.info} value={`${pct.fat}%`} label="Fat" />
            </View>
          </View>
          {!!updatedLabel && (
            <View style={s.updatedRow}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={[s.updatedText, { color: colors.textMuted }]}>Updated {updatedLabel}</Text>
            </View>
          )}
        </GlassCard>

        {/* ── Day tabs (`.daytabs`) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayTabs}>
          {content.days.map((day, i) => {
            const active = selectedDay === i;
            return (
              <Pressable
                key={day.day}
                onPress={() => setSelectedDay(i)}
                style={[
                  s.dayTab,
                  active
                    ? { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }
                    : { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[s.dayTabDay, { color: active ? colors.primary : colors.textMuted }]}>
                  {day.day.slice(0, 3)}
                </Text>
                <Text style={[s.dayTabNum, { color: colors.text }]}>{i + 1}</Text>
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
      <View style={[s.shell, { paddingTop: insets.top + 56 }]}>{renderBody()}</View>
    </ScreenBackground>
  );
};

const s = StyleSheet.create({
  shell: { flex: 1 },
  root: { flex: 1 },
  scroll: { padding: SPACING.lg, gap: SPACING.md },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: SPACING.md },
  loadingTitle: { fontSize: 18, fontFamily: FONTS.bodyExtra, textAlign: 'center' },
  loadingText: { fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  emptyIconWrap: { width: 84, height: 84, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bodyExtra, textAlign: 'center' },

  banner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  bannerText: { fontSize: 12.5, fontFamily: FONTS.bodySemi },

  // `.card.card-elevated { padding:18px; margin-bottom:16px }`
  targetCard: { marginBottom: 2 },
  targetCardInner: { padding: 18 },
  targetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontSize: 10.5, fontFamily: FONTS.bodyBold, letterSpacing: 0.8 },
  targetValue: { fontSize: 30, fontFamily: FONTS.bodyExtra, marginTop: 6 },
  targetUnit: { fontSize: 13, fontFamily: FONTS.bodySemi },
  ringsRow: { flexDirection: 'row', gap: 12 },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  updatedText: { fontSize: 11 },

  // `.daytabs { gap:8; padding:2px 2px 4px; margin-bottom:14px }`
  dayTabs: { gap: 8, paddingVertical: 2 },
  dayTab: { minWidth: 52, paddingHorizontal: 6, paddingVertical: 10, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  dayTabDay: { fontSize: 9.5, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  dayTabNum: { fontSize: 15, fontFamily: FONTS.bodyExtra, marginTop: 3 },

  // `.card { padding:15px; margin-bottom:10px }`
  mealCard: { marginBottom: 10 },
  mealCardInner: { padding: 15, gap: 8 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealName: { fontSize: 13, fontFamily: FONTS.bodyBold },
  mealCal: { fontSize: 11 },
  mealDesc: { fontSize: 12, lineHeight: 19 },
});
