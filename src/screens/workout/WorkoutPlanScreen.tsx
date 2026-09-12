import React, { useCallback, useEffect } from 'react';
import {
  Alert,
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
import { FONT_SIZE, FONTS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { WorkoutDay, WorkoutPlanContent } from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';
import { ScreenBackground } from '../../components/ui/ScreenBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AiLoadingPulse } from '../../components/ui/AiLoadingPulse';
import { StatBadge } from '../../components/ui/StatBadge';

const formatUpdated = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const DayCard: React.FC<{ day: WorkoutDay }> = ({ day }) => {
  const colors = useThemeColors();
  return (
    <GlassCard glowColor={colors.primary} style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Ionicons name="barbell-outline" size={16} color={colors.primary} />
        <View style={styles.dayTitleWrap}>
          <Text style={[styles.dayTitle, { color: colors.text }]}>{day.day}</Text>
          <StatBadge icon="fitness-outline" label="Focus" value={day.focus} color={colors.accent} />
        </View>
      </View>
      {(day.exercises ?? []).map((ex, idx) => (
        <View key={`${ex.name}-${idx}`} style={[styles.exerciseRow, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>{ex.name}</Text>
          <Text style={[styles.exerciseMeta, { color: colors.textMuted }]}>
            {ex.sets} sets × {ex.reps} · rest {ex.rest}
          </Text>
        </View>
      ))}
    </GlassCard>
  );
};

export const WorkoutPlanScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const route = useRoute<RouteProp<RootStackParams, 'WorkoutPlan'>>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { workout, loadPlan, generatePlan, setPlan } = usePlans();

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
  const content = plan ? (plan.content as WorkoutPlanContent) : null;
  const days = content?.weeklyPlan ?? [];
  const showBlockingLoader = (workout.generating || workout.loading) && days.length === 0;

  const handleGenerateNew = useCallback(() => {
    Alert.alert(
      'Generate a fresh plan?',
      'This builds a new weekly workout split from your current fitness profile. It can take up to a minute.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => generatePlan('WORKOUT') },
      ],
    );
  }, [generatePlan]);

  const renderBody = () => {
    if (showBlockingLoader) {
      return (
        <View style={styles.center}>
          <AiLoadingPulse icon="barbell-outline" size={48} />
          <Text style={[styles.loadingTitle, { color: colors.text }]}>
            {workout.generating ? 'Building your workout split' : 'Loading your workout plan'}
          </Text>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {workout.generating
              ? 'Our AI coach is structuring your training week. This may take up to a minute.'
              : 'Fetching your saved plan…'}
          </Text>
        </View>
      );
    }

    if (days.length === 0) {
      return (
        <View style={styles.center}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }, workout.error && { borderColor: `${colors.danger}40`, backgroundColor: `${colors.danger}10` }]}>
            <Ionicons name={workout.error ? "warning-outline" : "barbell-outline"} size={42} color={workout.error ? colors.danger : colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{workout.error ? "Oops, something went wrong!" : "No workout plan yet"}</Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
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
                icon={<Ionicons name="sparkles" size={18} color="#04211F" />}
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

    const totalExercises = days.reduce((sum, d) => sum + (d.exercises?.length ?? 0), 0);
    const updatedLabel = formatUpdated(plan?.createdAt);

    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={workout.loading}
            onRefresh={() => loadPlan('WORKOUT', true)}
            tintColor={colors.primary}
          />
        }
      >
        {workout.generating && (
          <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <AiLoadingPulse icon="sparkles" size={18} />
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>Generating a fresh plan…</Text>
          </View>
        )}

        <GlassCard glowColor={colors.accent} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="fitness" size={20} color={colors.accent} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Your Workout Plan</Text>
          </View>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            {days.length}-day personalised split based on your fitness profile.
          </Text>
          <View style={styles.statsRow}>
            <StatBadge icon="calendar-outline" label="Days" value={`${days.length}`} color={colors.primary} />
            <StatBadge icon="barbell-outline" label="Exercises" value={`${totalExercises}`} color={colors.info} />
          </View>
          {!!updatedLabel && (
            <View style={styles.updatedRow}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.updatedText, { color: colors.textMuted }]}>Updated {updatedLabel}</Text>
            </View>
          )}
        </GlassCard>

        {days.map((day, i) => (
          <DayCard key={`${day.day}-${i}`} day={day} />
        ))}

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

  summaryCard: { gap: SPACING.sm },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  summaryTitle: { ...TYPOGRAPHY.title, fontSize: FONT_SIZE.xl },
  summaryText: { ...TYPOGRAPHY.body, lineHeight: 21 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  updatedText: { fontSize: FONT_SIZE.xs },

  dayCard: { gap: SPACING.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  dayTitleWrap: { flex: 1, gap: 8 },
  dayTitle: { ...TYPOGRAPHY.heading },

  exerciseRow: {
    borderRadius: 12,
    padding: SPACING.md,
    gap: 4,
    borderWidth: 1,
  },
  exerciseName: { fontSize: FONT_SIZE.md, fontFamily: FONTS.bodySemi },
  exerciseMeta: { fontSize: FONT_SIZE.sm },
});
