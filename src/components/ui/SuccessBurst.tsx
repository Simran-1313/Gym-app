import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../config/theme';

interface Props {
  visible: boolean;
  onDone?: () => void;
}

export const SuccessBurst: React.FC<Props> = ({ visible, onDone }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 10, stiffness: 200 }),
        withTiming(1, { duration: 150 }),
      );
      opacity.value = withTiming(1, { duration: 200 });
      const t = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
        onDone?.();
      }, 1200);
      return () => clearTimeout(t);
    }
    scale.value = 0;
    opacity.value = 0;
  }, [visible, scale, opacity, onDone]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.burst, style]}>
        <Ionicons name="checkmark-circle" size={72} color={COLORS.success} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  burst: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
