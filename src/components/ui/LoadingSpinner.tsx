import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { COLORS } from '../../config/theme';

interface Props {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<Props> = ({ size = 'large', fullScreen = false }) => {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={COLORS.primary} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={COLORS.primary} />;
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
