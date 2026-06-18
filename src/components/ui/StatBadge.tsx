import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE, RADIUS, SPACING } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

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
  color,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const actualColor = color || themeColors.primary;

  return (
    <View style={[
      styles.pill,
      {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.surfaceBorder,
      }
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: `${actualColor}22`, shadowColor: actualColor }]}>
        <Ionicons name={icon} size={14} color={actualColor} />
      </View>
      <View>
        <Text style={[styles.label, { color: themeColors.textMuted }]}>{label}</Text>
        <Text style={[styles.value, { color: themeColors.text }]}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
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
  label: { fontSize: FONT_SIZE.xs },
  value: { fontSize: FONT_SIZE.sm, fontWeight: '700' },
});
