import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { FONTS, RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<Props> = ({ icon, title, subtitle, actionLabel, onAction }) => {
  const colors = useThemeColors();
  const onPrimary = '#FFFFFF';

  return (
    <View style={styles.container}>
      <View style={[styles.dashedBox, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>



        {/* Still, not floating: an empty state is a resting state. */}
        <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={38} color={colors.primary} />
        </View>

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
              { backgroundColor: colors.primarySolid },
              pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }
            ]}
          >
            <Text style={[styles.actionText, { color: onPrimary }]}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={14} color={onPrimary} style={{ marginLeft: 4 }} />
          </Pressable>
        )}

      </View>
    </View>
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
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    overflow: 'hidden',
  },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.displaySemi,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.bodyMedium,
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
  },
  actionText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 0.3,
  },
});
