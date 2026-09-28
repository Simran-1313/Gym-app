import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { ScreenBackground } from './ScreenBackground';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noBackground?: boolean;
}

/**
 * Every screen used to pop in with a 450ms spring fade-up on mount, on top of
 * the native stack push/tab-switch transition the OS already plays. Two
 * arrivals stacked on every navigation read as slow rather than polished —
 * the native transition is the one with a reason to exist (it's how the
 * platform tells you where the new screen came from); this second one
 * wasn't adding information, just delay. Content now renders immediately.
 */
export const AnimatedScreen: React.FC<Props> = ({
  children,
  style,
  noBackground = false,
}) => {
  const content = <View style={[styles.content, style]}>{children}</View>;

  if (noBackground) return content;

  return <ScreenBackground>{content}</ScreenBackground>;
};

const styles = StyleSheet.create({
  content: { flex: 1 },
});
