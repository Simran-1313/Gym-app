import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { AnimatedButton } from '../ui/AnimatedButton';
import { FONTS, MOTION, RADIUS, SPACING } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  visible: boolean;
  uri?: string | null;
  name?: string | null;
  subtitle?: string | null;
  onClose: () => void;
  onEdit: () => void;
}

/** Past this drag (or a fast flick), letting go dismisses instead of springing back. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

/**
 * The member's photo, large. Opens from the Profile avatar so the 64px circle
 * isn't the only place the picture can actually be seen. The photo grows out
 * of a slightly smaller scale, follows a downward drag (the scrim thins as it
 * goes), and is dismissed by that drag, a tap outside, the close button or
 * Android's back.
 */
export const AvatarPreview: React.FC<Props> = ({ visible, uri, name, subtitle, onClose, onEdit }) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const side = Math.min(width - SPACING.lg * 2, height * 0.5, 360);

  const [mounted, setMounted] = useState(visible);
  const [failed, setFailed] = useState(false);
  const open = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setFailed(false);
      dragY.value = 0;
      open.value = withSpring(1, MOTION.press);
    }
  }, [visible, open, dragY]);

  // Animate out first, then unmount the Modal.
  const close = () => {
    open.value = withTiming(0, { duration: 180 }, (done) => {
      if (done) runOnJS(finishClose)();
    });
  };
  const finishClose = () => {
    setMounted(false);
    onClose();
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .onUpdate((e) => {
      // Upward drags are resisted; only down leads anywhere.
      dragY.value = e.translationY > 0 ? e.translationY : e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(close)();
      } else {
        dragY.value = withSpring(0, MOTION.settle);
      }
    });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: open.value * interpolate(dragY.value, [0, 300], [1, 0.35], 'clamp'),
  }));
  const photoStyle = useAnimatedStyle(() => ({
    opacity: open.value,
    transform: [
      { translateY: dragY.value },
      { scale: interpolate(open.value, [0, 1], [0.86, 1]) * interpolate(dragY.value, [0, 300], [1, 0.85], 'clamp') },
    ],
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: open.value * interpolate(dragY.value, [0, 80], [1, 0], 'clamp'),
  }));

  if (!mounted) return null;

  const showPhoto = uri && !failed;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={close}>
      <GestureHandlerRootView style={s.root}>
        <Animated.View style={[StyleSheet.absoluteFill, s.scrim, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close photo" />
        </Animated.View>

        <Animated.View style={[s.close, { top: insets.top + SPACING.sm }, chromeStyle]}>
          <Pressable
            onPress={close}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="close" size={22} color="#FFF" />
          </Pressable>
        </Animated.View>

        <View style={s.center} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                s.photo,
                { width: side, height: side, borderRadius: side / 2, backgroundColor: `${colors.primary}33` },
                photoStyle,
              ]}
            >
              {showPhoto ? (
                <Image
                  source={{ uri }}
                  style={{ width: side, height: side }}
                  resizeMode="cover"
                  onError={() => setFailed(true)}
                  accessibilityLabel={name ? `${name}'s profile photo` : 'Profile photo'}
                />
              ) : (
                <Ionicons name="person" size={side * 0.45} color="#FFF" />
              )}
            </Animated.View>
          </GestureDetector>

          <Animated.View style={[s.caption, chromeStyle]} pointerEvents="box-none">
            {name ? (
              <Text style={s.name} numberOfLines={1}>
                {name}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={s.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </Animated.View>
        </View>

        <Animated.View
          style={[s.actions, { paddingBottom: insets.bottom + SPACING.lg }, chromeStyle]}
          pointerEvents="box-none"
        >
          <AnimatedButton
            label="Edit Profile"
            variant="secondary"
            icon={<Ionicons name="create-outline" size={18} color={colors.text} />}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setMounted(false);
              onClose();
              onEdit();
            }}
          />
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.88)' },
  close: { position: 'absolute', right: SPACING.lg, zIndex: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photo: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  caption: { alignItems: 'center', marginTop: SPACING.lg, paddingHorizontal: SPACING.lg },
  name: { color: '#FFF', fontFamily: FONTS.bodyExtra, fontSize: 20, letterSpacing: -0.3 },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.bodyMedium, fontSize: 13, marginTop: 4 },
  actions: { paddingHorizontal: SPACING.lg },
});
