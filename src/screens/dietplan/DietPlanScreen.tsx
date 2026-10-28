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
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AiLoadingPulse } from '../../components/ui/AiLoadingPulse';
import { EmptyState } from '../../components/ui/EmptyState';
import { confirmOnline, useConnectivity } from '../../services/network';
import { PlanSlice, STALL_AFTER_MS } from '../../context/PlansContext';

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

/** Headline + icon per failure, so "offline" never reads as "server broken". */
const errorCopy = (slice: PlanSlice): { title: string; icon: 'cloud-offline-outline' | 'server-outline' | 'warning-outline' | 'time-outline' } => {
  switch (slice.errorKind) {
    case 'offline':
      return { title: 'You’re offline', icon: 'cloud-offline-outline' };
    case 'unreachable':
    case 'server':
      return { title: 'Service unavailable', icon: 'server-outline' };
    case 'timeout':
      return {
        title: slice.errorSource === 'generate' ? 'Generation took too long' : 'Server is slow to respond',
        icon: 'time-outline',
      };
    default:
      return {
        title: slice.errorSource === 'generate' ? 'Couldn’t generate your plan' : 'Couldn’t load your diet plan',
        icon: 'warning-outline',
      };
  }
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
  const { diet, loadPlan, generatePlan, setPlan, retry } = usePlans();
  const { isOffline } = useConnectivity();

  const [selectedDay, setSelectedDay] = useState(0);

  // Hydrate once on mount — never re-run on context updates (prevents flicker).
  // A generation started during onboarding is tracked by PlansContext, which
  // keeps watching for the plan whether or not this screen is open.
  useEffect(() => {
    const paramPlan = route.params?.plan ?? null;
    const shouldGenerate = !!route.params?.generate;

    if (paramPlan) {
      setPlan('DIET', paramPlan);
      return;
    }
    if (shouldGenerate) {
      generatePlan('DIET');
      return;
    }
    loadPlan('DIET');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = diet.plan;
  const content = plan ? normalizeDietPlanContent(plan.content) : null;
  const cameFromOnboarding = !user?.isOnboarded || !!route.params?.fromOnboarding;

  // Re-render once the watched generation counts as stalled, to offer a retry.
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (!diet.awaitingSince) {
      setStalled(false);
      return;
    }
    const remaining = diet.awaitingSince + STALL_AFTER_MS - Date.now();
    if (remaining <= 0) {
      setStalled(true);
      return;
    }
    setStalled(false);
    const t = setTimeout(() => setStalled(true), remaining);
    return () => clearTimeout(t);
  }, [diet.awaitingSince]);

  const handleRetry = useCallback(async () => {
    // Re-check before spending a request; the connectivity event may be stale.
    await confirmOnline();
    await retry('DIET');
  }, [retry]);

  const handleGenerateNew = useCallback(() => {
    if (isOffline) {
      Alert.alert('You’re offline', 'Connect to the internet to generate a new plan. Your current plan stays available.');
      return;
    }
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
  }, [generatePlan, isOffline]);

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
    if (!content && diet.generating) {
      return (
        <View style={s.center}>
          <AiLoadingPulse icon="nutrition-outline" size={48} />
          <Text style={[s.loadingTitle, { color: colors.text }]}>Building your diet plan</Text>
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>
            {isOffline
              ? 'You’re offline. We’ll check on your plan as soon as you reconnect.'
              : 'Our AI nutritionist is balancing your meals and macros. This usually takes under a minute.'}
          </Text>
          <Text style={[s.loadingHint, { color: colors.textMuted }]}>
            You can keep using the app — your plan will be here when it’s ready.
          </Text>
          {stalled && !isOffline ? (
            <AnimatedButton label="Taking too long? Try Again" onPress={handleRetry} />
          ) : null}
          {navigation.canGoBack() ? (
            <AnimatedButton label="Keep Exploring" variant="secondary" onPress={() => navigation.goBack()} />
          ) : null}
        </View>
      );
    }

    if (!content && (diet.loading || !diet.loaded)) {
      return (
        <View style={s.center}>
          <AiLoadingPulse icon="nutrition-outline" size={48} />
          <Text style={[s.loadingTitle, { color: colors.text }]}>Loading your diet plan</Text>
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>Fetching your saved plan…</Text>
        </View>
      );
    }

    if (!content && diet.error) {
      const copy = errorCopy(diet);
      return (
        <EmptyState
          icon={copy.icon}
          tone="error"
          title={copy.title}
          subtitle={diet.error}
          actionLabel={diet.errorSource === 'generate' ? 'Try Generating Again' : 'Try Again'}
          onAction={handleRetry}
          secondaryLabel={diet.errorKind === 'validation' ? 'Update Fitness Profile' : undefined}
          onSecondary={diet.errorKind === 'validation' ? () => navigation.navigate('Onboarding') : undefined}
        />
      );
    }

    if (!content) {
      // A plan exists but its content isn't in a shape we can render — say
      // so honestly rather than presenting it as a working plan.
      if (plan) {
        return (
          <EmptyState
            icon="warning-outline"
            title="This plan couldn’t be displayed"
            subtitle="The saved plan is incomplete. Generate a fresh one from your fitness profile."
            actionLabel="Generate New Plan"
            onAction={() => generatePlan('DIET')}
          />
        );
      }
      return (
        <EmptyState
          icon="nutrition-outline"
          title="No diet plan yet"
          subtitle="Generate a personalised 7-day diet plan from your fitness profile."
          actionLabel={isOffline ? 'Connect to Generate' : 'Generate My Diet Plan'}
          onAction={() => (isOffline ? handleRetry() : generatePlan('DIET'))}
          secondaryLabel="Update Fitness Profile"
          onSecondary={() => navigation.navigate('Onboarding')}
        />
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
            onRefresh={() => {
              if (!isOffline) loadPlan('DIET', true);
            }}
            tintColor={colors.primary}
          />
        }
      >
        {diet.generating && (
          <View style={[s.banner, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <AiLoadingPulse icon="sparkles" size={18} />
            <Text style={[s.bannerText, { color: colors.textSecondary }]}>
              Generating a fresh plan… you can leave this screen.
            </Text>
          </View>
        )}

        {diet.fromCache && (
          <View style={[s.banner, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}40` }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
            <Text style={[s.bannerText, s.bannerFlex, { color: colors.textSecondary }]}>
              {diet.errorKind === 'offline'
                ? 'You’re offline — showing the copy saved on this device. It’ll refresh when you reconnect.'
                : 'Couldn’t reach the server — showing the copy saved on this device. Pull down to refresh.'}
            </Text>
          </View>
        )}

        {!diet.generating && diet.errorSource === 'generate' && diet.error && (
          <Pressable
            onPress={handleRetry}
            accessibilityRole="button"
            style={[s.banner, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}40` }]}
          >
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={[s.bannerText, s.bannerFlex, { color: colors.textSecondary }]}>
              New plan failed: {diet.error} Your previous plan is shown.
            </Text>
            <Text style={[s.bannerAction, { color: colors.primary }]}>Retry</Text>
          </Pressable>
        )}

        {/* ── Daily Target ──
            The calorie readout and the three rings used to share one row
            (`justifyContent:'space-between'`, neither side allowed to shrink
            or wrap): on a narrow phone the two together need more width than
            the card has, and since nothing could give, the third ring was
            simply clipped by the card's edge. Stacking them — calories on
            their own row, rings on a full-width row below — means the rings
            always have the whole card's width to themselves, on any device,
            with no cropping possible regardless of screen size. */}
        <GlassCard elevated style={s.targetCard} innerStyle={s.targetCardInner}>
          <Text style={[s.eyebrow, { color: colors.textMuted }]}>DAILY TARGET</Text>
          <Text style={[s.targetValue, { color: colors.text }]}>
            {content.calories.toLocaleString('en-IN')}{' '}
            <Text style={[s.targetUnit, { color: colors.textMuted }]}>kcal</Text>
          </Text>
          <View style={s.ringsRow}>
            <ProgressRing progress={pct.protein / 100} size={68} strokeWidth={6} color={colors.primary} value={`${pct.protein}%`} label="Protein" />
            <ProgressRing progress={pct.carbs / 100} size={68} strokeWidth={6} color={colors.warning} value={`${pct.carbs}%`} label="Carbs" />
            <ProgressRing progress={pct.fat / 100} size={68} strokeWidth={6} color={colors.lavender} value={`${pct.fat}%`} label="Fat" />
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
      <ScreenHeader
        title="My Diet Plan"
        // The onboarding flow reaches this screen with nothing to go back to
        // (headerBackVisible: false on that route) — same rule here.
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <View style={s.shell}>{renderBody()}</View>
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

  banner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  bannerText: { fontSize: 12.5, fontFamily: FONTS.bodySemi },
  bannerFlex: { flex: 1, lineHeight: 17 },
  bannerAction: { fontSize: 13, fontFamily: FONTS.bodyBold },
  loadingHint: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },

  // `.card.card-elevated { padding:18px; margin-bottom:16px }`
  targetCard: { marginBottom: 2 },
  targetCardInner: { padding: 18 },
  eyebrow: { fontSize: 10.5, fontFamily: FONTS.bodyBold, letterSpacing: 0.8 },
  targetValue: { fontSize: 30, fontFamily: FONTS.bodyExtra, marginTop: 6 },
  targetUnit: { fontSize: 13, fontFamily: FONTS.bodySemi },
  // Full card width, evenly distributed — see the comment above the JSX for
  // why this moved off the calorie readout's row.
  ringsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
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
