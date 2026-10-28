import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, RADIUS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { usePlans } from '../../context/PlansContext';

const AUTO_DISMISS_MS = 6000;

interface Props {
  /** Name of the focused route, so the toast stays quiet on the plan screen itself. */
  currentRoute: string | undefined;
  /** Opens the plan screen, or null when it can't be reached from here. */
  onOpen: ((type: 'DIET' | 'WORKOUT') => void) | null;
}

/**
 * "Your plan is ready" — the counterpart to generating plans in the
 * background. Shown only when the member isn't already looking at the plan.
 */
export const PlanReadyToast: React.FC<Props> = ({ currentRoute, onOpen }) => {
  const { readyNotice, dismissReadyNotice } = usePlans();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const screenFor = readyNotice?.type === 'WORKOUT' ? 'WorkoutPlan' : 'DietPlan';
  const onPlanScreen = currentRoute === screenFor;

  useEffect(() => {
    if (!readyNotice) return;
    if (onPlanScreen) {
      dismissReadyNotice();
      return;
    }
    const t = setTimeout(dismissReadyNotice, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [readyNotice, onPlanScreen, dismissReadyNotice]);

  if (!readyNotice || onPlanScreen) return null;

  const label = readyNotice.type === 'WORKOUT' ? 'Your workout plan is ready' : 'Your diet plan is ready';

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Animated.View entering={FadeInUp.duration(240)} exiting={FadeOutUp.duration(180)}>
        <Pressable
          onPress={() => {
            dismissReadyNotice();
            onOpen?.(readyNotice.type);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${onOpen ? 'Open it.' : ''}`}
          style={[styles.toast, { backgroundColor: colors.overlay, borderColor: colors.overlayBorder }]}
        >
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
          {onOpen ? <Text style={[styles.action, { color: colors.primary }]}>View</Text> : null}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    minHeight: 48,
  },
  icon: { width: 28, height: 28, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontFamily: FONTS.bodySemi, flexShrink: 1 },
  action: { fontSize: 14, fontFamily: FONTS.bodyBold },
});
