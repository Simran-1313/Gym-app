import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { FONTS, SPACING } from '../../config/theme';
import { LogWorkoutPayload, WorkoutType } from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { SuccessBurst } from '../../components/ui/SuccessBurst';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { logWorkout } from '../../services/activity.service';

/**
 * Ported from `#screen-workout-session` in docs/UI_PROTOTYPE.html: the big
 * weight/rep display card, `.btn-ghost` −2.5/+2.5 kg steppers, `.section-row`
 * "Set history" label, and `.card.wi-row.done` rows (teal-tinted, checkmark
 * icon) for completed sets. The prototype only shows one hardcoded exercise
 * ("Bench Press") advancing through its own sets — this screen advances
 * through every exercise in the day's plan, one at a time, set by set.
 *
 * Per-set weight/reps are LIVE, IN-MEMORY state for the duration of this
 * session only — `POST /member/activity/workouts` (see activity.service's
 * `logWorkout`) has no per-set/per-weight persistence, only a session-level
 * summary. So nothing here is presented as a saved historical record while
 * mid-session; on finish (or early exit) we call `logWorkout` exactly once
 * with an honest summary built from the real session clock.
 */

const DEFAULT_WEIGHT_KG = 20;
const WEIGHT_STEP_KG = 2.5;

interface CompletedSet {
  setNumber: number;
  weight: number;
  reps: string;
}

interface SessionSummary {
  durationMinutes: number;
  caloriesBurned: number;
  setsCompleted: number;
}

// Free-text `day.focus` → the closest real `WorkoutType` enum value. Falls
// back to STRENGTH, which is what most gym-assigned split days actually are.
const FOCUS_PATTERNS: Array<[RegExp, WorkoutType]> = [
  [/hiit/i, 'HIIT'],
  [/box/i, 'BOXING'],
  [/pilates/i, 'PILATES'],
  [/yoga/i, 'YOGA'],
  [/cycl|spin|bike/i, 'CYCLING'],
  [/run|treadmill|sprint/i, 'RUNNING'],
  [/cardio|conditioning/i, 'CARDIO'],
];

const mapFocusToWorkoutType = (focus: string): WorkoutType => {
  const hit = FOCUS_PATTERNS.find(([re]) => re.test(focus));
  return hit ? hit[1] : 'STRENGTH';
};

// Rough, clearly-labeled kcal/minute rates per workout type — a MET-based
// rule of thumb (moderate-intensity averages), not a measured value. There's
// no heart-rate sensor or wearable feeding this screen, so avgHeartRate /
// maxHeartRate are simply omitted from the logged payload rather than guessed.
const KCAL_PER_MIN: Record<WorkoutType, number> = {
  STRENGTH: 6,
  HIIT: 10,
  CARDIO: 8,
  RUNNING: 11,
  CYCLING: 8,
  YOGA: 3,
  PILATES: 4,
  BOXING: 9,
};

type Nav = NativeStackNavigationProp<RootStackParams>;
type SessionRoute = RouteProp<RootStackParams, 'WorkoutSession'>;

export const WorkoutSessionScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<SessionRoute>();
  const { day } = params;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const exercises = day.exercises ?? [];
  const totalExercises = exercises.length;
  const totalPlannedSets = useMemo(
    () => exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0),
    [exercises],
  );
  const workoutType = useMemo(() => mapFocusToWorkoutType(day.focus), [day.focus]);

  const startTimeRef = useRef(new Date());
  const finalizedRef = useRef(false);

  const [phase, setPhase] = useState<'active' | 'complete'>('active');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(1);
  const [weight, setWeight] = useState(DEFAULT_WEIGHT_KG);
  const [history, setHistory] = useState<CompletedSet[]>([]);
  const [completedSetsTotal, setCompletedSetsTotal] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [showBurst, setShowBurst] = useState(false);

  const currentExercise = exercises[exerciseIndex];

  useEffect(() => {
    navigation.setOptions({
      title: phase === 'complete' ? 'Workout Complete' : currentExercise?.name ?? day.focus,
    });
  }, [navigation, phase, currentExercise, day.focus]);

  const finalizeSession = useCallback(
    async (endedEarly: boolean, setsCompleted: number) => {
      if (finalizedRef.current) return;
      finalizedRef.current = true;

      const endTime = new Date();
      const durationMinutes = Math.max(
        1,
        Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 60000),
      );
      // Estimate only — see KCAL_PER_MIN comment above.
      const caloriesBurned = Math.round(durationMinutes * KCAL_PER_MIN[workoutType]);

      const payload: LogWorkoutPayload = {
        workoutType,
        startTime: startTimeRef.current.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes,
        caloriesBurned,
        source: 'APP_TIMER',
        notes: endedEarly
          ? `Ended early — ${setsCompleted} of ${totalPlannedSets} planned sets completed (${day.focus}).`
          : `Completed ${day.focus} — ${setsCompleted} sets across ${totalExercises} exercises.`,
      };

      try {
        await logWorkout(payload);
      } catch {
        // logWorkout already falls back to a local record on failure.
      }

      if (!endedEarly) {
        setSummary({ durationMinutes, caloriesBurned, setsCompleted });
      }
    },
    [day.focus, totalExercises, totalPlannedSets, workoutType],
  );

  // Intercept leaving the screen (back gesture/header back) before the
  // session has finished, so ending early still logs an honest summary
  // instead of silently losing the in-progress session.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (phase === 'complete' || finalizedRef.current) return;
      e.preventDefault();
      Alert.alert(
        'End workout?',
        'Your progress so far will be saved to your activity log.',
        [
          { text: 'Keep Going', style: 'cancel' },
          {
            text: 'End Workout',
            style: 'destructive',
            onPress: async () => {
              await finalizeSession(true, completedSetsTotal);
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });
    return sub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, phase, completedSetsTotal, finalizeSession]);

  const adjustWeight = useCallback((delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setWeight((w) => Math.max(0, Math.round((w + delta) * 10) / 10));
  }, []);

  const handleMarkSetComplete = useCallback(() => {
    if (!currentExercise || phase !== 'active') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const completedSet: CompletedSet = { setNumber: setIndex, weight, reps: currentExercise.reps };
    setHistory((h) => [...h, completedSet]);
    const newTotal = completedSetsTotal + 1;
    setCompletedSetsTotal(newTotal);

    const isLastSetOfExercise = setIndex >= (currentExercise.sets || 1);
    const isLastExercise = exerciseIndex >= totalExercises - 1;

    if (isLastSetOfExercise && isLastExercise) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPhase('complete');
      setShowBurst(true);
      void finalizeSession(false, newTotal);
      return;
    }

    if (isLastSetOfExercise) {
      setExerciseIndex((i) => i + 1);
      setSetIndex(1);
      setHistory([]);
      setWeight(DEFAULT_WEIGHT_KG);
    } else {
      setSetIndex((n) => n + 1);
    }
  }, [currentExercise, phase, setIndex, weight, completedSetsTotal, exerciseIndex, totalExercises, finalizeSession]);

  const renderActive = () => {
    if (!currentExercise) {
      return (
        <GlassCard elevated innerStyle={s.emptyInner}>
          <Text style={[s.summaryTitle, { color: colors.text }]}>Nothing to start</Text>
          <Text style={[s.summarySub, { color: colors.textMuted }]}>
            This day has no exercises planned.
          </Text>
        </GlassCard>
      );
    }

    return (
      <>
        <GlassCard elevated style={s.metricCard} innerStyle={s.metricCardInner}>
          <Text style={[s.eyebrow, { color: colors.textMuted }]}>
            EXERCISE {exerciseIndex + 1} OF {totalExercises} · SET {setIndex} OF {currentExercise.sets}
          </Text>
          <View style={s.weightRow}>
            <Text style={[s.weightValue, { color: colors.text }]}>{weight}</Text>
            <Text style={[s.weightUnit, { color: colors.textMuted }]}> kg</Text>
          </View>
          <Text style={[s.repsTarget, { color: colors.textMuted }]}>
            {currentExercise.reps} reps target
          </Text>
        </GlassCard>

        <View style={s.stepperRow}>
          <AnimatedButton
            variant="ghost"
            label={`− ${WEIGHT_STEP_KG} kg`}
            onPress={() => adjustWeight(-WEIGHT_STEP_KG)}
            style={s.flex1}
          />
          <AnimatedButton
            variant="ghost"
            label={`+ ${WEIGHT_STEP_KG} kg`}
            onPress={() => adjustWeight(WEIGHT_STEP_KG)}
            style={s.flex1}
          />
        </View>

        <AnimatedButton label="Mark Set Complete" onPress={handleMarkSetComplete} />

        <Text style={[s.sectionTitle, { color: colors.text }]}>Set history</Text>
        {history.length === 0 ? (
          <Text style={[s.emptyHistoryText, { color: colors.textMuted }]}>
            No sets logged yet for this exercise.
          </Text>
        ) : (
          history.map((set) => (
            <StaggerItem key={`${exerciseIndex}-${set.setNumber}`} reflow>
              <GlassCard
                style={[s.historyRow, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}
                innerStyle={s.historyRowInner}
              >
                <View style={[s.historyIcon, { backgroundColor: `${colors.primary}29` }]}>
                  <Ionicons name="checkmark" size={17} color={colors.primary} />
                </View>
                <View>
                  <Text style={[s.historyName, { color: colors.text }]}>Set {set.setNumber}</Text>
                  <Text style={[s.historyMeta, { color: colors.textMuted }]}>
                    {set.weight}kg × {set.reps} reps
                  </Text>
                </View>
              </GlassCard>
            </StaggerItem>
          ))
        )}
      </>
    );
  };

  const renderComplete = () => (
    <>
      <GlassCard elevated style={s.metricCard} innerStyle={s.summaryInner}>
        <Ionicons name="checkmark-circle" size={40} color={colors.success} />
        <Text style={[s.summaryTitle, { color: colors.text }]}>Workout Complete</Text>
        <Text style={[s.summarySub, { color: colors.textMuted }]}>
          Nice work — logged to your activity.
        </Text>
        <View style={s.summaryStatsRow}>
          <SummaryStat label="Duration" value={`${summary?.durationMinutes ?? 0} min`} colors={colors} />
          <SummaryStat label="Sets" value={`${summary?.setsCompleted ?? completedSetsTotal}`} colors={colors} />
          <SummaryStat label="Calories" value={`~${summary?.caloriesBurned ?? 0}`} colors={colors} />
        </View>
        <Text style={[s.estimateNote, { color: colors.textFaint }]}>
          Calories are an estimate based on workout type and duration, not a measured value.
        </Text>
      </GlassCard>
      <AnimatedButton label="Back to Plan" onPress={() => navigation.goBack()} />
    </>
  );

  return (
    <AnimatedScreen>
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
      >
        {phase === 'active' ? renderActive() : renderComplete()}
      </ScrollView>
      <SuccessBurst visible={showBurst} onDone={() => setShowBurst(false)} />
    </AnimatedScreen>
  );
};

const SummaryStat: React.FC<{ label: string; value: string; colors: ReturnType<typeof useThemeColors> }> = ({
  label,
  value,
  colors,
}) => (
  <View style={s.summaryStat}>
    <Text style={[s.summaryStatValue, { color: colors.text }]}>{value}</Text>
    <Text style={[s.summaryStatLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.gutter, gap: SPACING.md },

  emptyInner: { padding: 20, alignItems: 'center', gap: 4 },

  // `.card { padding:20px; text-align:center; margin-bottom:16px }`
  metricCard: { marginBottom: 2 },
  metricCardInner: { padding: 20, alignItems: 'center' },
  eyebrow: { fontSize: 10.5, fontFamily: FONTS.bodyBold, letterSpacing: 0.8, marginBottom: 6, textAlign: 'center' },
  weightRow: { flexDirection: 'row', alignItems: 'flex-end' },
  weightValue: { fontSize: 40, fontFamily: FONTS.displayExtra },
  weightUnit: { fontSize: 16, fontFamily: FONTS.bodySemi, marginBottom: 6 },
  repsTarget: { fontSize: 12.5, marginTop: 4 },

  // `display:flex; gap:10px; margin-bottom:16px`
  stepperRow: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },

  // `.section-row { margin:24px 2px 12px }` / `.st { font-size:14; font-weight:700 }`
  sectionTitle: { fontSize: 14, fontFamily: FONTS.bodyBold, marginTop: 8 },
  emptyHistoryText: { fontSize: 12.5 },

  // `.wi-row { gap:13; padding:15px; margin-bottom:9px }`
  historyRow: { marginBottom: 9 },
  historyRowInner: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15 },
  historyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  historyName: { fontSize: 13.5, fontFamily: FONTS.bodySemi },
  historyMeta: { fontSize: 11.5, marginTop: 2 },

  summaryInner: { padding: 24, alignItems: 'center', gap: 4 },
  summaryTitle: { fontSize: 18, fontFamily: FONTS.bodyExtra, marginTop: 8 },
  summarySub: { fontSize: 13, textAlign: 'center' },
  summaryStatsRow: { flexDirection: 'row', gap: 22, marginTop: 16 },
  summaryStat: { alignItems: 'center' },
  summaryStatValue: { fontSize: 18, fontFamily: FONTS.bodyExtra },
  summaryStatLabel: { fontSize: 10.5, fontFamily: FONTS.bodySemi, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
  estimateNote: { fontSize: 10.5, textAlign: 'center', marginTop: 14, lineHeight: 14 },
});
