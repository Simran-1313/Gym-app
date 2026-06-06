import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, SPACING } from '../../config/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<Props> = ({ icon, title, subtitle }) => (
  <View style={styles.container}>
    <Ionicons name={icon} size={56} color={COLORS.textMuted} />
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
