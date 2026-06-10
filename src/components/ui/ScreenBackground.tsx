import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../config/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ScreenBackground: React.FC<Props> = ({ children, style }) => (
  <LinearGradient
    colors={[...COLORS.backgroundGradient]}
    style={[styles.root, style]}
    start={{ x: 0.5, y: 0 }}
    end={{ x: 0.5, y: 1 }}
  >
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
});
