import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, FONT_SIZE } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

/**
 * The one screen header in the app — every screen with a back action and a
 * title uses this, not its own hand-rolled navbar. My Diet Plan is the
 * reference this was pulled out of (it previously got these exact metrics
 * from React Navigation's native header + `makeScreenOptions` in
 * AppNavigator.tsx): 56pt content row under the safe area, `colors.surfaceElevated`
 * background with a bottom hairline, a 24px back chevron in a 32pt tap
 * target, 6px to the title, `FONTS.displaySemi` at 17px/-0.3 tracking,
 * vertically centered, 16px side padding.
 *
 * Built as a real component rather than left as native-header configuration
 * because the native header's title alignment differs by platform (iOS
 * left-aligns next to the back button, Android centers) — screens tested on
 * different platforms would drift apart even reading the same config. This
 * renders identically on both.
 */
export const SCREEN_HEADER_HEIGHT = 56;

interface Props {
  title: string;
  /** Omit on a tab-root screen with nothing to go back to — the back slot
   *  collapses to an empty spacer so the title's left edge still lines up
   *  with every other screen's. */
  onBack?: () => void;
  /** A single right-side action (edit pencil, calendar icon, …). */
  right?: React.ReactNode;
}

export const ScreenHeader: React.FC<Props> = ({ title, onBack, right }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top, backgroundColor: colors.surfaceElevated, borderBottomColor: colors.surfaceBorder },
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backSlot} />
        )}

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    height: SCREEN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
    marginRight: 6,
  },
  backSlot: { width: 32, marginRight: 6 },
  title: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONTS.displaySemi,
    letterSpacing: -0.3,
  },
  rightSlot: { minWidth: 32, alignItems: 'flex-end', justifyContent: 'center' },
});
