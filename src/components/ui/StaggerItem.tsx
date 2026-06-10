import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}

export const StaggerItem: React.FC<Props> = ({ children, index = 0, style }) => (
  <Animated.View
    entering={FadeInDown.delay(index * 50).duration(350).springify()}
    style={style}
  >
    {children}
  </Animated.View>
);
