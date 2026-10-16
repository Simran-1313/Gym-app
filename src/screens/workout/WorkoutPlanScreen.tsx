import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlans } from '../../context/PlansContext';
import { FONTS, RADIUS, SPACING } from '../../config/theme';
import { WorkoutDay, WorkoutExercise } from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AiLoadingPulse } from '../../components/ui/AiLoadingPulse';

/**
 * Ported from `#screen-workout-plan` in docs/UI_PROTOTYPE.html: a 3-stat pill
 * row, a 7-day tab strip that highlights today and marks rest days, and one
 * `.wi-row` per exercise for the selected day.
 *
 * The prototype's exercise rows also carry a Done/Next/Pending status pill —
 * that requires per-set completion history the backend has no endpoint for
 * (`POST /member/activity/workouts` only logs a session-level summary, not
 * individual sets), so it isn't rendered here rather than faked with numbers
 * that would look real but aren't backed by anything.
 */

const formatUpdated = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const WEEKDAY_MATCH = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** True when `day.day` names the same weekday as `now` — plans are generated
 * with weekday-named days (or a rest day) rather than calendar dates. */
const isToday = (day: string, now: Date): boolean => {
  const key = day.trim().toLowerCase().slice(0, 3);
  return WEEKDAY_MATCH[now.getDay()] === key;
};

const isRestDay = (day: WorkoutDay): boolean =>
  (day.exercises?.length ?? 0) === 0 || /\brest\b/i.test(day.focus ?? '');

const ExerciseRow: React.FC<{ exercise: WorkoutExercise }> = ({ exercise }) => {
  const colors = useThemeColors();
  return (
    <GlassCard style={s.wiRow} innerStyle={s.wiRowInner}>
      <View style={[s.wiIcon, { backgroundColor: colors.inset }]}>
        <Ionicons name="barbell-outline" size={17} color={colors.text} />
      </View>
      <View style={s.flex1}>
        <Text style={[s.wiName, { color: colors.text }]} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={[s.wiMeta, { color: colors.textMuted }]}>
          {exercise.sets} sets × {exercise.reps} · rest {exercise.rest}
        </Text>
      </View>
    </GlassCard>
  );
};

export const WorkoutPlanScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const route = useRoute<RouteProp<RootStackParams, 'WorkoutPlan'>>();
  const insets = useSafeAreaInsets();
  const { workout, loadPlan, generatePlan, setPlan } = usePlans();
  const colors = useThemeColors();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    const paramPlan = route.params?.plan ?? null;
    const shouldGenerate = !!route.params?.generate;

    if (paramPlan) {
      setPlan('WORKOUT', paramPlan);
      return;
    }
    if (shouldGenerate) {
      generatePlan('WORKOUT');
      return;
    }
    loadPlan('WORKOUT');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = workout.plan;
  const content = plan ? (plan.content as { weeklyPlan: WorkoutDay[] }) : null;
  const days = content?.weeklyPlan ?? [];
  const showBlockingLoader = (workout.generating || workout.loading) && days.length === 0;

  const now = useMemo(() => new Date(), []);
  const todayIndex = useMemo(() => {
    const idx = days.findIndex((d) => isToday(d.day, now));
    return idx >= 0 ? idx : 0;
  }, [days, now]);

  const activeIndex = selectedDay ?? todayIndex;
  const activeDay = days[activeIndex];

  const handleGenerateNew = useCallback(() => {
    Alert.alert(
      'Generate a fresh plan?',
      'This builds a new weekly workout split from your current fitness profile. It can take up to a minute.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => { setSelectedDay(null); generatePlan('WORKOUT'); } },
      ],
    );
  }, [generatePlan]);

  const renderBody = () => {
    if (showBlockingLoader) {
      return (
        <View style={s.center}>
          <AiLoadingPulse icon="barbell-outline" size={48} />
          <Text style={[s.loadingTitle, { color: colors.text }]}>
            {workout.generating ? 'Building your workout split' : 'Loading your workout plan'}
          </Text>
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>
            {workout.generating
              ? 'Our AI coach is structuring your training week. This may take up to a minute.'
              : 'Fetching your saved plan…'}
          </Text>
        </View>
      );
    }

    if (days.length === 0) {
      return (
        <View style={s.center}>
          <View
            style={[
              s.emptyIconWrap,
              { backgroundColor: colors.surface, borderColor: colors.cardBorder },
              workout.error && { borderColor: `${colors.danger}40`, backgroundColor: `${colors.danger}10` },
            ]}
          >
            <Ionicons
              name={workout.error ? 'warning-outline' : 'barbell-outline'}
              size={42}
              color={workout.error ? colors.danger : colors.primary}
            />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>
            {workout.error ? 'Couldn’t load your workout plan' : 'No workout plan yet'}
          </Text>
          <Text style={[s.loadingText, { color: colors.textSecondary }]}>
            {workout.error ?? 'Generate a personalised training split from your fitness profile.'}
          </Text>
          {workout.error ? (
            <AnimatedButton label="Try Again" onPress={() => loadPlan('WORKOUT')} />
          ) : (
            <>
              <AnimatedButton
                label={workout.generating ? 'Generating…' : 'Generate My Workout Plan'}
                onPress={() => generatePlan('WORKOUT')}
                loading={workout.generating}
                disabled={workout.generating}
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

    const trainingDays = days.filter((d) => !isRestDay(d));
    const totalExercises = trainingDays.reduce((sum, d) => sum + (d.exercises?.length ?? 0), 0);
    const totalSets = trainingDays.reduce(
      (sum, d) => sum + (d.exercises ?? []).reduce((s2, ex) => s2 + (ex.sets || 0), 0),
      0,
    );
    const updatedLabel = formatUpdated(plan?.createdAt);
    const activeIsRest = activeDay ? isRestDay(activeDay) : false;
    const activeIsToday = activeIndex === todayIndex;

    return (
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl refreshing={workout.loading} onRefresh={() => loadPlan('WORKOUT', true)} tintColor={colors.primary} />
        }
      >
        {workout.generating && (
          <View style={[s.banner, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <AiLoadingPulse icon="sparkles" size={18} />
            <Text style={[s.bannerText, { color: colors.textSecondary }]}>Generating a fresh plan…</Text>
          </View>
        )}

        {/* ── Stat pills (`.stat-row` / `.stat-pill`) — every value is real ── */}
        <View style={s.statRow}>
          <View style={[s.statPill, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={[s.spV, { color: colors.text }]}>{trainingDays.length}</Text>
            <Text style={[s.spL, { color: colors.textMuted }]}>Days/Wk</Text>
          </View>
          <View style={[s.statPill, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="barbell-outline" size={16} color={colors.warning} />
            <Text style={[s.spV, { color: colors.text }]}>{totalExercises}</Text>
            <Text style={[s.spL, { color: colors.textMuted }]}>Exercises</Text>
          </View>
          <View style={[s.statPill, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="repeat-outline" size={16} color={colors.lavender} />
            <Text style={[s.spV, { color: colors.text }]}>{totalSets}</Text>
            <Text style={[s.spL, { color: colors.textMuted }]}>Total Sets</Text>
          </View>
        </View>

        {/* ── Day tabs (`.daytabs`) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayTabs}>
          {days.map((day, i) => {
            const active = i === activeIndex;
            const rest = isRestDay(day);
            const today = i === todayIndex;
            return (
              <Pressable
                key={`${day.day}-${i}`}
                onPress={() => setSelectedDay(i)}
                disabled={rest}
                style={[
                  s.dayTab,
                  rest && s.dayTabRest,
                  active
                    ? { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }
                    : { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[s.dayTabD, { color: active ? colors.primary : colors.textMuted }]}>
                  {day.day.slice(0, 3)}
                </Text>
                <Text style={[s.dayTabN, { color: colors.text }]} numberOfLines={1}>
                  {rest ? 'Rest' : day.focus}
                </Text>
                {today && !rest ? <View style={[s.dayTabDot, { backgroundColor: colors.primary }]} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Today card ── */}
        {activeDay ? (
          <GlassCard elevated style={s.todayCard} innerStyle={s.todayCardInner}>
            <Text style={[s.eyebrow, { color: colors.textMuted }]}>
              {activeIsToday ? 'TODAY' : activeDay.day.toUpperCase()}
              {activeIsToday ? ` · ${activeDay.day}` : ''}
            </Text>
            <Text style={[s.todayTitle, { color: colors.text }]}>
              {activeIsRest ? 'Rest Day' : activeDay.focus}
            </Text>
            {!activeIsRest && (
              <Text style={[s.todaySub, { color: colors.textMuted }]}>
                {(activeDay.exercises ?? []).length} exercises planned
              </Text>
            )}
          </GlassCard>
        ) : null}

        {activeDay && !activeIsRest ? (
          <AnimatedButton
            label="Start Workout"
            onPress={() => navigation.navigate('WorkoutSession', { day: activeDay })}
            icon={<Ionicons name="play" size={16} color="#FFFFFF" />}
          />
        ) : null}

        {!!updatedLabel && (
          <View style={s.updatedRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={[s.updatedText, { color: colors.textMuted }]}>Updated {updatedLabel}</Text>
          </View>
        )}

        {activeDay && !activeIsRest ? (
          <View>
            {(activeDay.exercises ?? []).map((ex, idx) => (
              <ExerciseRow key={`${ex.name}-${idx}`} exercise={ex} />
            ))}
          </View>
        ) : null}

        <AnimatedButton
          label={workout.generating ? 'Generating…' : 'Generate New Plan'}
          variant="secondary"
          onPress={handleGenerateNew}
          loading={workout.generating}
          disabled={workout.generating}
          icon={<Ionicons name="sparkles" size={18} color={colors.primary} />}
        />
      </ScrollView>
    );
  };

  return (
    <ScreenBackground>
      <ScreenHeader
        title="My Workout Plan"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <View style={s.shell}>{renderBody()}</View>
    </ScreenBackground>
  );
};

const s = StyleSheet.create({
  shell: { flex: 1 },
  root: { flex: 1 },
  flex1: { flex: 1 },
  scroll: { padding: SPACING.lg, gap: SPACING.md },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: SPACING.md },
  loadingTitle: { fontSize: 18, fontFamily: FONTS.bodyExtra, textAlign: 'center' },
  loadingText: { fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  emptyIconWrap: { width: 84, height: 84, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bodyExtra, textAlign: 'center' },

  banner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  bannerText: { fontSize: 12.5, fontFamily: FONTS.bodySemi },

  // `.stat-row { gap:10 }` / `.stat-pill { flex:1; gap:4; padding:12px 6px; radius:16 }`
  statRow: { flexDirection: 'row', gap: 10 },
  statPill: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16 },
  spV: { fontSize: 15, fontFamily: FONTS.bodyExtra },
  spL: { fontSize: 9.5, fontFamily: FONTS.bodySemi, textTransform: 'uppercase', letterSpacing: 0.3 },

  // `.daytabs`
  dayTabs: { gap: 8, paddingVertical: 2 },
  dayTab: { minWidth: 56, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  dayTabRest: { opacity: 0.5 },
  dayTabD: { fontSize: 9.5, fontFamily: FONTS.bodyBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  dayTabN: { fontSize: 12, fontFamily: FONTS.bodyExtra, marginTop: 3, maxWidth: 64 },
  dayTabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },

  // `.card.card-elevated { padding:18px; margin-bottom:14px }`
  todayCard: { marginBottom: 2 },
  todayCardInner: { padding: 18 },
  eyebrow: { fontSize: 10.5, fontFamily: FONTS.bodyBold, letterSpacing: 0.8 },
  todayTitle: { fontSize: 16, fontFamily: FONTS.bodyExtra, marginTop: 5 },
  todaySub: { fontSize: 12, marginTop: 2 },

  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  updatedText: { fontSize: 11 },

  // `.wi-row { gap:13; padding:15px; margin-bottom:9px }`
  wiRow: { marginBottom: 9 },
  wiRowInner: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 },
  wiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wiName: { fontSize: 13.5, fontFamily: FONTS.bodySemi },
  wiMeta: { fontSize: 11.5, marginTop: 2 },
});
