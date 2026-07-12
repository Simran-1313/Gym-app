import React from 'react';
import {
  Image,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { DARK_COLORS, LIGHT_COLORS, RADIUS } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

interface Props {
  name?: string | null;
  uri?: string | null;
  size?: number;
  editable?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export const FitnessAvatar: React.FC<Props> = ({
  name,
  uri,
  size = 72,
  editable,
  onPress,
  style,
  imageStyle,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const radius = size / 2;

  const avatarStyle: ViewStyle = {
    backgroundColor: `${colors.primary}22`,
    borderWidth: 2,
    borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
    width: size,
    height: size,
    borderRadius: radius,
  };

  const body = (
    <View style={[avatarStyle, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: radius, backgroundColor: colors.card },
            imageStyle,
          ]}
        />
      ) : (
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=1000&auto=format&fit=crop' }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: radius, backgroundColor: colors.card },
            imageStyle,
          ]}
        />
      )}

      {editable ? (
        <View style={[styles.editBadge, {
          backgroundColor: isDark ? colors.white : colors.white,
          borderColor: isDark ? colors.black : 'rgba(0,0,0,0.15)',
        }]}>
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

const DefaultAvatarSvg: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Defs>
      <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#343A46" />
        <Stop offset="1" stopColor="#15161B" />
      </LinearGradient>
      <LinearGradient id="skin" x1="0.2" y1="0" x2="0.8" y2="1">
        <Stop offset="0" stopColor="#FFD0B3" />
        <Stop offset="0.55" stopColor="#F2A27D" />
        <Stop offset="1" stopColor="#D97855" />
      </LinearGradient>
      <LinearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#5A382D" />
        <Stop offset="1" stopColor="#2B1714" />
      </LinearGradient>
      <LinearGradient id="shirt" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FF7A45" />
        <Stop offset="1" stopColor="#E6451A" />
      </LinearGradient>
    </Defs>
    <Circle cx="60" cy="60" r="60" fill="url(#bg)" />
    <Ellipse cx="60" cy="103" rx="34" ry="8" fill="#000" opacity="0.22" />
    <Path
      d="M28 108c3-22 16-35 32-35s29 13 32 35H28Z"
      fill="url(#shirt)"
    />
    <Path
      d="M45 77c2 9 8 14 15 14s13-5 15-14v-9H45v9Z"
      fill="url(#skin)"
    />
    <Path
      d="M36 48c0-18 11-31 27-31 15 0 26 12 26 30v12c0 19-12 33-28 33S36 78 36 59V48Z"
      fill="url(#skin)"
    />
    <Path
      d="M34 50c1-23 13-36 31-36 16 0 27 11 27 29 0 7-2 13-4 18-3-19-13-25-30-25-10 0-18 3-24 14Z"
      fill="url(#hair)"
    />
    <Path
      d="M47 58c0 3 2 5 4 5s4-2 4-5-2-5-4-5-4 2-4 5Zm24 0c0 3 2 5 4 5s4-2 4-5-2-5-4-5-4 2-4 5Z"
      fill="#241B19"
    />
    <Path
      d="M56 70c3 3 9 3 12 0"
      stroke="#7F3B2E"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M38 49c8-10 18-14 34-12 9 1 15 5 20 13-2-22-13-36-29-36-17 0-29 13-25 35Z"
      fill="url(#hair)"
      opacity="0.88"
    />
    <Circle cx="43" cy="64" r="7" fill="#F0A17D" opacity="0.7" />
    <Circle cx="80" cy="64" r="7" fill="#F0A17D" opacity="0.7" />
    <Path
      d="M36 108c4-14 13-22 24-22s20 8 24 22H36Z"
      fill="#111318"
      opacity="0.35"
    />
  </Svg>
);

const styles = StyleSheet.create({
  image: {},
  initialWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
