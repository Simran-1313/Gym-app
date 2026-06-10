import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
}

export const StatBadge: React.FC<Props> = ({
  icon,
  label,
  value,
  color = COLORS.primary,
}) => (
  <View style={styles.pill}>
    <View style={[styles.iconWrap, { backgroundColor: `${color}22`, shadowColor: color }]}>
      <Ionicons name={icon} size={14} color={color} />
    </View>
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  label: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  value: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '700' },
});
