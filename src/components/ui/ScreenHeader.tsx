import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, FONT_SIZE } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

/**
 * The one screen header in the app, in two variants — same component, same
 * source of truth, so neither drifts from the other over time.
 *
 * `default` — a pushed screen with a back action (My Diet Plan is where this
 * was pulled from): 56pt content row, `colors.surfaceElevated` background
 * with a bottom hairline reading as a bar sitting *above* the content, a
 * 24px back chevron, `FONTS.displaySemi` at 17px, centered in the row.
 *
 * `large` — a bottom-tab root (Classes, Chat, Check-In, Profile). These
 * used to get the exact same compact bar as every pushed sub-screen, which
 * made a tab's own top-level page read as just one more pushed screen —
 * there was nothing left to tell a member "you're on a main section" versus
 * "you're three taps deep in a flow." This is the same distinction iOS
 * itself draws between a large-title root and a pushed detail screen: a
 * bigger, bolder, left-aligned title that sits flush with the page
 * (`colors.background`, no hairline, no bar) rather than floating a
 * strip above it. Never takes a back action — a tab root has nowhere to
 * go back to by definition.
 */
export const SCREEN_HEADER_HEIGHT = 56;
export const LARGE_SCREEN_HEADER_HEIGHT = 64;

interface Props {
  title: string;
  /** Omit on a tab-root screen with nothing to go back to — the back slot
   *  collapses to an empty spacer so the title's left edge still lines up
   *  with every other screen's. Ignored entirely when `variant="large"`. */
  onBack?: () => void;
  /** A single right-side action (edit pencil, calendar icon, …). */
  right?: React.ReactNode;
  variant?: 'default' | 'large';
}

export const ScreenHeader: React.FC<Props> = ({ title, onBack, right, variant = 'default' }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  if (variant === 'large') {
    return (
      <View style={[styles.largeWrap, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.largeRow}>
          <Text style={[styles.largeTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {right ? <View style={styles.largeRightSlot}>{right}</View> : null}
        </View>
      </View>
    );
  }

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

  largeWrap: {},
  largeRow: {
    height: LARGE_SCREEN_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  largeTitle: {
    flex: 1,
    fontSize: 32,
    fontFamily: FONTS.displayExtra,
    letterSpacing: -0.7,
  },
  largeRightSlot: { marginLeft: 12, paddingBottom: 2 },
});
