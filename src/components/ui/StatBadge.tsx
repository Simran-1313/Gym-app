import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_SIZE, FONTS, RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

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
  const themeColors = useThemeColors();

  const actualColor = color || themeColors.primary;

  return (
    <View style={[
      styles.pill,
      {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.surfaceBorder,
      }
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: `${actualColor}22` }]}>
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
  },
  label: { fontSize: FONT_SIZE.xs },
  value: { fontSize: FONT_SIZE.sm, fontFamily: FONTS.bodyBold },
});
