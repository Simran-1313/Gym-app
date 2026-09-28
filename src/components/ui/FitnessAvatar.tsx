import React from 'react';
import {
  Image,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  name?: string | null;
  uri?: string | null;
  size?: number;
  editable?: boolean;
  onPress?: () => void;
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
 */
export const FitnessAvatar: React.FC<Props> = ({
  name,
  uri,
  size = 72,
  editable,
  onPress,
  style,
  imageStyle,
}) => {
  const colors = useThemeColors();
  const radius = size / 2;
  const initials = initialsOf(name);

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

  const body = (
    <View style={[style, { width: size, height: size }]}>
      <View style={avatarStyle}>
        {uri ? (
          <Image
            source={{ uri }}
            style={[
              styles.image,
              { width: size, height: size, borderRadius: radius, backgroundColor: colors.card },
              imageStyle,
            ]}
          />
        ) : initials ? (
          <Text style={[styles.initials, { fontSize: size * 0.36, color: colors.primary }]}>
            {initials}
          </Text>
        ) : (
          <Ionicons name="person" size={size * 0.5} color={colors.primary} />
        )}
      </View>

      {editable ? (
        <View style={[styles.editBadge, { backgroundColor: colors.white, borderColor: colors.cardBorder }]}>
          <Ionicons name="pencil" size={14} color={colors.black} />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} hitSlop={10}>
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  image: {},
  initials: { fontFamily: FONTS.bodyExtra, letterSpacing: 0.5 },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
