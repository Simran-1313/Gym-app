import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ScreenBackground } from './ScreenBackground';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

/**
 * The platform's own activity indicator, in the theme's muted ink. Loading is
 * a wait, not a moment — so nothing bobs, pulses or scales; it just spins
 * quietly until the content replaces it.
 */
export const LoadingSpinner: React.FC<Props> = ({ size = 'large', fullScreen = false }) => {
  const colors = useThemeColors();
  const spinner = <ActivityIndicator size={size} color={colors.textMuted} />;

  if (fullScreen) {
    return (
      <ScreenBackground>
        <View style={styles.fullScreen}>{spinner}</View>
      </ScreenBackground>
    );
  }

  return spinner;
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
