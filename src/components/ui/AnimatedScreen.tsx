import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
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
  const content = (
    <Animated.View
      entering={FadeInUp.duration(400).delay(delay)}
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
