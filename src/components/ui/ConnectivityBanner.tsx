import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FONTS, RADIUS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useConnectivity } from '../../services/network';
import { LARGE_SCREEN_HEADER_HEIGHT } from './ScreenHeader';

/** Clears the 64pt floating tab bar plus its bottom offset. */
const TAB_BAR_CLEARANCE = 84;
const BACK_ONLINE_MS = 2200;

interface Props {
  /** True on tab screens: sit above the floating tab bar. Elsewhere the pill
   *  goes just under the header, clear of footer buttons and their messages. */
  aboveTabBar: boolean;
}

/**
 * A small pill while the device is offline, then a brief
 * "Back online" once it reconnects. Deliberately not a full-width strip: it
 * mustn't cover headers or primary buttons, and it ignores touches so it can
 * never block one. "Server unreachable" is not shown here — that's a
 * per-request failure each screen reports in context.
 */
export const ConnectivityBanner: React.FC<Props> = ({ aboveTabBar }) => {
  const { isOffline, known } = useConnectivity();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!known) return;
    if (isOffline) {
      wasOffline.current = true;
      setShowBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowBackOnline(true);
    const t = setTimeout(() => setShowBackOnline(false), BACK_ONLINE_MS);
    return () => clearTimeout(t);
  }, [isOffline, known]);

  const visible = known && (isOffline || showBackOnline);
  if (!visible) return null;

  const offline = isOffline;
  const tint = offline ? colors.warning : colors.success;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        aboveTabBar
          ? { bottom: Math.max(insets.bottom, 10) + TAB_BAR_CLEARANCE }
          : { top: insets.top + LARGE_SCREEN_HEADER_HEIGHT + 8 },
      ]}
    >
      <Animated.View
        key={offline ? 'offline' : 'online'}
        entering={aboveTabBar ? FadeInDown.duration(220) : FadeInUp.duration(220)}
        exiting={aboveTabBar ? FadeOutDown.duration(180) : FadeOutUp.duration(180)}
        style={[styles.pill, { backgroundColor: colors.overlay, borderColor: colors.overlayBorder }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Ionicons name={offline ? 'cloud-offline-outline' : 'cloud-done-outline'} size={16} color={tint} />
        <Text style={[styles.text, { color: colors.text }]}>
          {offline ? 'You’re offline' : 'Back online'}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  text: { fontSize: 13, fontFamily: FONTS.bodySemi },
});
