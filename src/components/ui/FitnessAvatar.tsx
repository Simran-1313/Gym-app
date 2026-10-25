import React, { useEffect, useState } from 'react';
import {
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { FONTS, MOTION, RADIUS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  name?: string | null;
  uri?: string | null;
  size?: number;
  editable?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

const initialsOf = (name?: string | null): string => {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
};

/**
 * A member's photo where they have one, their initials on a tinted circle
 * where they don't — never a stock photo standing in for a real person, and
 * never a wasted `name` prop (the previous version accepted `name` but
 * always rendered a stranger's Unsplash photo when `uri` was empty).
 *
 * The photo fades in over the initials once it has loaded, and a URL that
 * fails to load falls back to the initials instead of an empty circle.
 */
export const FitnessAvatar: React.FC<Props> = ({
  name,
  uri,
  size = 72,
  editable,
  onPress,
  accessibilityLabel,
  style,
  imageStyle,
}) => {
  const colors = useThemeColors();
  const radius = size / 2;
  const initials = initialsOf(name);

  const [failed, setFailed] = useState(false);
  const loadedOpacity = useSharedValue(0);
  useEffect(() => {
    setFailed(false);
    loadedOpacity.value = 0;
  }, [uri, loadedOpacity]);
  const imageFade = useAnimatedStyle(() => ({ opacity: loadedOpacity.value }));

  const pressScale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }));

  // The badge scales with the avatar so it never swallows a small one.
  const badge = Math.round(Math.min(28, Math.max(20, size * 0.34)));

  const avatarStyle: ViewStyle = {
    backgroundColor: `${colors.primary}22`,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    borderRadius: radius,
  };

  const showImage = !!uri && !failed;

  const body = (
    <Animated.View style={[style, { width: size, height: size }, pressStyle]}>
      <View style={avatarStyle}>
        {initials ? (
          <Text style={[styles.initials, { fontSize: size * 0.36, color: colors.primary }]}>
            {initials}
          </Text>
        ) : (
          <Ionicons name="person" size={size * 0.5} color={colors.primary} />
        )}
        {showImage ? (
          <Animated.Image
            source={{ uri }}
            onLoad={() => {
              loadedOpacity.value = withTiming(1, { duration: 220 });
            }}
            onError={() => setFailed(true)}
            style={[
              StyleSheet.absoluteFill,
              { width: size - 4, height: size - 4, borderRadius: radius },
              imageStyle as StyleProp<ImageStyle>,
              imageFade,
            ]}
          />
        ) : null}
      </View>

      {editable ? (
        <View
          style={[
            styles.editBadge,
            {
              width: badge,
              height: badge,
              right: size > 60 ? 0 : -2,
              bottom: size > 60 ? 0 : -2,
              backgroundColor: colors.primary,
              borderColor: colors.card,
            },
          ]}
        >
          <Ionicons name={uri ? 'pencil' : 'camera'} size={badge * 0.5} color={colors.white} />
        </View>
      ) : null}
    </Animated.View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressScale.value = withTiming(0.94, { duration: MOTION.pressSmall.duration });
      }}
      onPressOut={() => {
        pressScale.value = withTiming(1, { duration: MOTION.pressSmall.duration });
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  initials: { fontFamily: FONTS.bodyExtra, letterSpacing: 0.5 },
  editBadge: {
    position: 'absolute',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
