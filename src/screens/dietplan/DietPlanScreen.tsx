import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { generateDietPlan, getAiPlan, getAiPlans } from '../../services/member.service';
import { COLORS, FONT_SIZE, GRADIENTS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { AiPlan, DietPlanDay } from '../../types';
import { RootStackParams } from '../../navigation/AppNavigator';
import { normalizeDietPlanContent } from '../../utils/dietPlan';
import { AnimatedScreen } from '../../components/ui/AnimatedScreen';
import { GlassCard } from '../../components/ui/GlassCard';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { StatBadge } from '../../components/ui/StatBadge';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { AiLoadingPulse } from '../../components/ui/AiLoadingPulse';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const MealCard: React.FC<{ meal: DietPlanDay['meals'][0]; index: number }> = ({ meal, index }) => (
  <Animated.View entering={FadeIn.delay(index * 60).duration(300)}>
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
  </Animated.View>
);

export const DietPlanScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const route = useRoute<RouteProp<RootStackParams, 'DietPlan'>>();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const paramPlan = route.params?.plan ?? null;
  const shouldGenerate = !!route.params?.generate;

  const [plan, setPlan] = useState<AiPlan | null>(paramPlan);
  const [loading, setLoading] = useState(!paramPlan);
  const [generating, setGenerating] = useState(shouldGenerate);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  const generateNew = useCallback(async () => {
    setLoading(true);
    setGenerating(true);
    setError(null);
    try {
      const newPlan = await generateDietPlan();
      setPlan(newPlan);
      setSelectedDay(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate diet plan.';
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
      const latestDiet = plans.find((p) => p.type === 'DIET');
      if (!latestDiet) {
        setError('No diet plan found. Complete your fitness profile to generate one.');
        setPlan(null);
        return;
      }
      const full = await getAiPlan(latestDiet.id);
      setPlan(full);
      setSelectedDay(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load your diet plan.');
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

  const cameFromOnboarding = !user?.isOnboarded || !!route.params?.fromOnboarding;

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Plan',
      'This will take you back to the profile form so you can update your details and generate a fresh plan.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => navigation.navigate('Onboarding') },
      ],
    );
  };

  const handleDone = async () => {
    await refreshUser();
    if (navigation.canGoBack()) navigation.goBack();
  };

  if (loading) {
    return (
      <AnimatedScreen>
        <View style={[styles.center, { paddingTop: insets.top + 56 }]}>
          {generating ? <AiLoadingPulse icon="nutrition-outline" size={48} /> : <LoadingSpinner />}
          <Text style={styles.loadingText}>
            {generating
              ? 'Generating your personalized diet plan…\nThis may take up to a minute.'
              : 'Loading your diet plan…'}
          </Text>
        </View>
      </AnimatedScreen>
    );
  }

  if (error || !plan) {
    return (
      <AnimatedScreen>
        <View style={[styles.center, { paddingTop: insets.top + 56 }]}>
          <Ionicons name="nutrition-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorText}>{error ?? 'No plan available.'}</Text>
          <AnimatedButton
            label="Retry"
            onPress={shouldGenerate ? generateNew : fetchLatest}
          />
        </View>
      </AnimatedScreen>
    );
  }

  const content = normalizeDietPlanContent(plan.content);

  if (!content || content.days.length === 0) {
    return (
      <AnimatedScreen>
        <View style={[styles.center, { paddingTop: insets.top + 56 }]}>
          <Ionicons name="nutrition-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorText}>
            This diet plan has an unsupported format. Try regenerating from Home.
          </Text>
          <AnimatedButton label="Retry" onPress={fetchLatest} />
        </View>
      </AnimatedScreen>
    );
  }

  const maxMacro = Math.max(content.macros.proteinG, content.macros.carbsG, content.macros.fatG, 1);
  const activeDay = content.days[selectedDay] ?? content.days[0];

  return (
    <AnimatedScreen>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 40 }]}
      >
        <GlassCard glowColor={COLORS.primary} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles" size={20} color={COLORS.accent} />
            <Text style={styles.summaryTitle}>Your Diet Plan</Text>
          </View>
          <Text style={styles.summaryText}>{content.summary}</Text>

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

        <Animated.View key={selectedDay} entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)}>
          {(activeDay.meals ?? []).map((meal, idx) => (
            <MealCard key={`${meal.name}-${idx}`} meal={meal} index={idx} />
          ))}
        </Animated.View>

        <AnimatedButton
          label="Regenerate Plan"
          variant="secondary"
          onPress={handleRegenerate}
          icon={<Ionicons name="refresh" size={18} color={COLORS.primary} />}
        />

        {cameFromOnboarding && (
          <AnimatedButton label="Continue to App" onPress={handleDone} />
        )}
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

  summaryCard: { gap: SPACING.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  summaryTitle: { ...TYPOGRAPHY.title, color: COLORS.text, fontSize: FONT_SIZE.xl },
  summaryText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 21 },

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
