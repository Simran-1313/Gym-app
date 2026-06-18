import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';

import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedButton } from './AnimatedButton';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, GLASS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  style?: StyleProp<ViewStyle>;
}

export const GlassOverlay: React.FC<Props> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const scale = useSharedValue(0.92);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 18, stiffness: 280 });
    } else {
      scale.value = 0.92;
    }
  }, [visible, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.backdrop}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.7)' }]} />
      <Animated.View style={[styles.card, cardStyle, {
        backgroundColor: isDark ? 'rgba(30,30,38,1)' : 'rgba(255,255,255,1)',
        borderColor: colors.surfaceBorder,
      }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
        <View style={styles.actions}>
          <AnimatedButton
            label={cancelLabel}
            variant="secondary"
            onPress={onCancel}
            style={styles.actionBtn}
            disabled={loading}
          />
          <AnimatedButton
            label={confirmLabel}
            variant={destructive ? 'primary' : 'primary'}
            onPress={onConfirm}
            loading={loading}
            style={styles.actionBtn}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  title: { ...TYPOGRAPHY.heading },
  message: { ...TYPOGRAPHY.body, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flex: 1 },
});
