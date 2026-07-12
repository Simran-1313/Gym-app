import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ScreenBackground: React.FC<Props> = ({ children, style }) => {
  return (
    <View style={[styles.root, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});
