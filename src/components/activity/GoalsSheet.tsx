import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useActivity } from '../../context/ActivityContext';
import { ActivityGoals } from '../../types';
import { FONTS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AnimatedChip } from '../ui/AnimatedChip';
import { GlassOverlay } from '../ui/GlassOverlay';

/** Sensible steps for each target, inside the ranges the API accepts. */
const OPTIONS: { key: keyof ActivityGoals; label: string; values: number[]; format: (v: number) => string }[] = [
  { key: 'daysPerWeek', label: 'Gym days a week', values: [2, 3, 4, 5, 6], format: (v) => `${v}` },
  { key: 'weeklyActiveMinutesGoal', label: 'Active minutes a week', values: [150, 300, 450, 600], format: (v) => `${v} min` },
  { key: 'weeklyCaloriesGoal', label: 'Calories a week', values: [1500, 2400, 3500, 5000], format: (v) => `${v.toLocaleString('en-IN')} kcal` },
  { key: 'dailyWaterGoal', label: 'Water a day', values: [2000, 2500, 3000, 3500, 4000], format: (v) => `${v / 1000} L` },
];

/**
 * The member's own targets for the rings, Home tiles and Challenges. Saved to
 * their profile, so every screen and device reads the same numbers.
 *
 * Renders a GlassOverlay, which fills its parent: place it last inside the
 * screen's root.
 */
export const GoalsSheet: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const colors = useThemeColors();
  const { goals, saveGoals } = useActivity();
  const [draft, setDraft] = useState<ActivityGoals>(goals);
  const [saving, setSaving] = useState(false);

  // Start from what's saved each time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(goals);
  }, [visible, goals]);

  const save = async () => {
    setSaving(true);
    try {
      await saveGoals(draft);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (err) {
      Alert.alert('Goals not saved', err instanceof Error ? err.message : 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassOverlay
      visible={visible}
      title="Your goals"
      message="Set what a good week looks like for you. Your rings and streaks follow these."
      confirmLabel="Save goals"
      loading={saving}
      onConfirm={save}
      onCancel={onClose}
    >
      <View style={styles.form}>
        {OPTIONS.map((o) => {
          // A value set elsewhere (or an API default) that isn't one of the steps still shows, selected.
          const current = draft[o.key];
          const values = o.values.includes(current) ? o.values : [...o.values, current].sort((a, b) => a - b);
          return (
            <View key={o.key} style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{o.label}</Text>
              <View style={styles.chipRow}>
                {values.map((v, i) => (
                  <AnimatedChip
                    key={v}
                    index={i}
                    label={o.format(v)}
                    selected={current === v}
                    onPress={() => setDraft((d) => ({ ...d, [o.key]: v }))}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </GlassOverlay>
  );
};

const styles = StyleSheet.create({
  form: { gap: 14, marginBottom: 6 },
  field: { gap: 8 },
  label: { fontSize: 12, fontFamily: FONTS.bodySemi },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
