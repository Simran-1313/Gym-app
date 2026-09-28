import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  /**
   * Adds `layout` + `exiting` on top of the mount fade, for screens where
   * StaggerItem is mapped directly into a ScrollView and list membership can
   * change after mount — a booking moving from Upcoming to Past on cancel,
   * a row being removed. Without it, surviving rows snap to their new
   * position in one frame (same key, so `entering` never re-fires) and a
   * removed row just vanishes.
   *
   * Left off by default because several screens use StaggerItem as a
   * FlatList/SectionList `renderItem` — layout animations on a virtualized,
   * recycled cell fight the list's own measurement and can replay on reuse.
   * Only opt in from a plain `.map()` inside a ScrollView.
   */
  reflow?: boolean;
}

/**
 * A short fade for a row that's genuinely new — data just arrived, a card
 * was inserted. It used to also grow its delay with `index`, so a 20-row
 * list took over a second to finish "arriving" every time its screen
 * mounted, and springed in with a visible bounce on top of that. Neither
 * detail was communicating anything about the data; both are gone. What's
 * left is the one thing this needs to do: keep new content from just
 * popping into existence with no transition at all.
 */
export const StaggerItem: React.FC<Props> = ({ children, style, reflow = false }) => (
  <Animated.View
    entering={FadeIn.duration(160)}
    exiting={reflow ? FadeOut.duration(160) : undefined}
    layout={reflow ? LinearTransition.duration(220) : undefined}
    style={style}
  >
    {children}
  </Animated.View>
);
