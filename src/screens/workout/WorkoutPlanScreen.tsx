import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { generateWorkoutPlan, getAiPlan, getAiPlans } from '../../services/member.service';
import { COLORS, FONT_SIZE, SPACING, TYPOGRAPHY } from '../../config/theme';
import { AiPlan, WorkoutDay, WorkoutPlanContent } from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AiLoadingPulse } from '../../components/ui/AiLoadingPulse';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StaggerItem } from '../../components/ui/StaggerItem';
import { StatBadge } from '../../components/ui/StatBadge';

const DayCard: React.FC<{ day: WorkoutDay; index: number }> = ({ day, index }) => (
  <StaggerItem index={index}>
    <GlassCard glowColor={COLORS.primary} style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Ionicons name="barbell-outline" size={16} color={COLORS.primary} />
        <View style={styles.dayTitleWrap}>
          <Text style={styles.dayTitle}>{day.day}</Text>
          <StatBadge icon="fitness-outline" label="Focus" value={day.focus} color={COLORS.accent} />
        </View>
      </View>
      {day.exercises.map((ex, idx) => (
        <View key={`${ex.name}-${idx}`} style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{ex.name}</Text>
          <Text style={styles.exerciseMeta}>
            {ex.sets} sets × {ex.reps} · rest {ex.rest}
          </Text>
        </View>
      ))}
    </GlassCard>
  </StaggerItem>
);

export const WorkoutPlanScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const route = useRoute<RouteProp<RootStackParams, 'WorkoutPlan'>>();
  const insets = useSafeAreaInsets();
  const paramPlan = route.params?.plan ?? null;
  const shouldGenerate = !!route.params?.generate;

  const [plan, setPlan] = useState<AiPlan | null>(paramPlan);
  const [loading, setLoading] = useState(!paramPlan);
  const [generating, setGenerating] = useState(shouldGenerate);
  const [error, setError] = useState<string | null>(null);

  const generateNew = useCallback(async () => {
    setLoading(true);
    setGenerating(true);
    setError(null);
    try {
      const newPlan = await generateWorkoutPlan();
      setPlan(newPlan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate workout plan.';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { plans } = await getAiPlans(1, 10);
      const latest = plans.find((p) => p.type === 'WORKOUT');
      if (!latest) {
        setError('No workout plan found. Generate one from Quick Actions on Home.');
        setPlan(null);
        return;
      }
      const full = await getAiPlan(latest.id);
      setPlan(full);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load workout plan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (paramPlan) return;
    if (shouldGenerate) {
      generateNew();
      return;
    }
    fetchLatest();
  }, [paramPlan, shouldGenerate, generateNew, fetchLatest]);

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Plan',
      'Go to Home and tap "Create Workout" to generate a fresh plan from your profile.',
      [{ text: 'OK' }],
    );
  };

  if (loading) {
    return (
      <AnimatedScreen>
        <View style={[styles.center, { paddingTop: insets.top + 56 }]}>
          {generating ? <AiLoadingPulse icon="barbell-outline" size={48} /> : <LoadingSpinner />}
          <Text style={styles.loadingText}>
            {generating
              ? 'Generating your personalized workout plan…\nThis may take up to a minute.'
              : 'Loading your workout plan…'}
          </Text>
        </View>
      </AnimatedScreen>
    );
  }

  if (error || !plan) {
    return (
      <AnimatedScreen>
        <View style={[styles.center, { paddingTop: insets.top + 56 }]}>
          <Ionicons name="barbell-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{error ?? 'No plan available.'}</Text>
          <AnimatedButton label="Retry" onPress={shouldGenerate ? generateNew : fetchLatest} />
        </View>
      </AnimatedScreen>
    );
  }

  const content = plan.content as WorkoutPlanContent;

  return (
    <AnimatedScreen>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 40 }]}
      >
        <GlassCard glowColor={COLORS.accent} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="fitness" size={20} color={COLORS.accent} />
            <Text style={styles.summaryTitle}>Your Workout Plan</Text>
          </View>
          <Text style={styles.summaryText}>
            {content.weeklyPlan?.length ?? 0}-day personalised split based on your fitness profile.
          </Text>
        </GlassCard>

        {(content.weeklyPlan ?? []).map((day, i) => (
          <DayCard key={day.day} day={day} index={i} />
        ))}

        <AnimatedButton
          label="Regenerate Plan"
          variant="secondary"
          onPress={handleRegenerate}
          icon={<Ionicons name="refresh" size={18} color={COLORS.primary} />}
        />
      </ScrollView>
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: SPACING.lg, gap: SPACING.md },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, textAlign: 'center', lineHeight: 22 },
  errorText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, textAlign: 'center', lineHeight: 22 },

  summaryCard: { gap: SPACING.sm },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  summaryTitle: { ...TYPOGRAPHY.title, color: COLORS.text, fontSize: FONT_SIZE.xl },
  summaryText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 21 },

  dayCard: { gap: SPACING.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  dayTitleWrap: { flex: 1, gap: 8 },
  dayTitle: { ...TYPOGRAPHY.heading, color: COLORS.text },

  exerciseRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  exerciseName: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  exerciseMeta: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
});
