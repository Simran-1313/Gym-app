import React from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { AnimatedButton } from './AnimatedButton';
import { FONTS } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useThemeColors } from '../../hooks/useThemeColors';

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
  /** Extra content between the subtitle and the actions (progress bar, timer…). */
  children?: React.ReactNode;
  /** Hides the secondary action for sheets that only acknowledge. */
  hideCancel?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The app's one modal: a bottom sheet, matching `.modal-sheet` in
 * docs/UI_PROTOTYPE.html — grab handle, 26px top corners, slides up from the
 * bottom edge, capped at 78% of the screen.
 *
 * It is deliberately not a centered dialog. On a phone the bottom edge is the
 * only part of the screen a thumb reaches comfortably, so the actions belong
 * there, and the actions stack rather than sitting side by side so neither is
 * the small target.
 */
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
  children,
  hideCancel = false,
  style,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Android's back gesture should dismiss the sheet, not pop the screen behind it.
  React.useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loading) return true;
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, loading, onCancel]);

  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.35)' },
          ]}
          onPress={loading ? undefined : onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
      </Animated.View>

      <Animated.View
        // Same spring family both ways — a springy entrance followed by a
        // linear-duration exit reads as two different objects, not one sheet
        // being pulled up and let go. The exit is tuned snappier (no
        // overshoot) since dismissal should read as decisive, not lingering.
        entering={SlideInDown.springify().damping(22).stiffness(240)}
        exiting={SlideOutDown.springify().damping(26).stiffness(300)}
        style={[
          styles.sheet,
          {
            backgroundColor: colors.overlay,
            borderColor: colors.overlayBorder,
            paddingBottom: insets.bottom + 26,
          },
          style,
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.overlayBorder }]} />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{message}</Text>

        {children}

        <AnimatedButton
          label={confirmLabel}
          variant="primary"
          destructive={destructive}
          onPress={onConfirm}
          loading={loading}
        />
        {hideCancel ? null : (
          <>
            <View style={{ height: 10 }} />
            <AnimatedButton
              label={cancelLabel}
              variant="ghost"
              onPress={onCancel}
              disabled={loading}
            />
          </>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '78%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  title: { fontFamily: FONTS.bodyExtra, fontSize: 16, marginBottom: 4 },
  sub: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 18, marginBottom: 18 },
});
