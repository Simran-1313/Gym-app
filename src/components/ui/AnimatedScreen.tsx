import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { ScreenBackground } from './ScreenBackground';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  noBackground?: boolean;
}

export const AnimatedScreen: React.FC<Props> = ({
  children,
  style,
  delay = 0,
  noBackground = false,
}) => {
  // 3D pop-in entrance: fade in from below + subtle scale for depth
  const content = (
    <Animated.View
      entering={FadeInUp.duration(450).delay(delay).springify().damping(18).stiffness(140)}
      style={[styles.content, style]}
    >
      {children}
    </Animated.View>
  );

  if (noBackground) return content;

  return <ScreenBackground>{content}</ScreenBackground>;
};

const styles = StyleSheet.create({
  content: { flex: 1 },
});
