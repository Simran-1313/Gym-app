import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DARK_COLORS, LIGHT_COLORS } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ScreenBackground: React.FC<Props> = ({ children, style }) => {
  const { theme } = useAuth();
  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <LinearGradient
      colors={[...colors.backgroundGradient]}
      style={[styles.root, style]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
