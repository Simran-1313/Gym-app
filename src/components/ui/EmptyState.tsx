import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { DARK_COLORS, LIGHT_COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<Props> = ({ icon, title, subtitle, actionLabel, onAction }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const floatY = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [floatY, glowScale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.container}>
      <View style={[styles.dashedBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
        
        {/* Soft Glowing Aura Behind Icon */}
        <Animated.View style={[styles.glowAura, glowStyle]}>
          <LinearGradient
            colors={[`${colors.primary}25`, `${colors.primary}00`]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {/* Floating Icon Container */}
        <Animated.View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }, iconStyle]}>
          <Ionicons name={icon} size={38} color={colors.primary} />
        </Animated.View>

        {/* Text Content */}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}

        {/* Action Pill (Optional) */}
        {actionLabel && onAction && (
          <Pressable 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onAction();
            }}
            style={({ pressed }) => [
              styles.actionPill, 
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }
            ]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFF" style={{ marginLeft: 4 }} />
          </Pressable>
        )}

      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    width: '100%',
  },
  dashedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 40,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  glowAura: {
    position: 'absolute',
    top: '15%',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.8,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  actionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
