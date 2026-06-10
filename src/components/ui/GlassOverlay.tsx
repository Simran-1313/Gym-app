import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedButton } from './AnimatedButton';
import { COLORS, FONT_SIZE, GLASS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';

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
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <BlurView intensity={GLASS.blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  title: { ...TYPOGRAPHY.heading, color: COLORS.text },
  message: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flex: 1 },
});
