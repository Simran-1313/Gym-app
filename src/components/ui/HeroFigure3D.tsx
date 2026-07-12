import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { DARK_COLORS, LIGHT_COLORS } from '../../config/theme';

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const HeroFigure3D: React.FC<Props> = ({ size = 180, style }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Floating animation
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [0, -8]) },
    ],
  }));

  // Shadow scale syncs with float for realistic grounding
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: interpolate(float.value, [0, 1], [1, 0.85]) },
      { scaleY: interpolate(float.value, [0, 1], [1, 0.7]) },
    ],
    opacity: interpolate(float.value, [0, 1], [0.35, 0.15]),
  }));

  return (
    <View style={[styles.container, { width: size, height: size + 20 }, style]}>
      {/* Ground shadow */}
      <Animated.View style={[styles.shadow, shadowStyle]}>
        <View
          style={[
            styles.shadowInner,
            {
              backgroundColor: isDark ? colors.primary : 'rgba(0,0,0,0.15)',
              width: size * 0.5,
              height: size * 0.08,
              borderRadius: size * 0.25,
            },
          ]}
        />
      </Animated.View>
      {/* Floating figure */}
      <Animated.View style={[styles.figureWrap, floatStyle]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            {/* Body skin gradient — 3D shading */}
            <LinearGradient id="skin3d" x1="0.15" y1="0" x2="0.85" y2="1">
              <Stop offset="0" stopColor="#FFD4B8" />
              <Stop offset="0.4" stopColor="#F0A880" />
              <Stop offset="0.7" stopColor="#D98A60" />
              <Stop offset="1" stopColor="#C47048" />
            </LinearGradient>
            {/* Shirt gradient */}
            <LinearGradient id="tank3d" x1="0" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor="#FF6B35" />
              <Stop offset="0.5" stopColor="#FF4F18" />
              <Stop offset="1" stopColor="#D93D08" />
            </LinearGradient>
            {/* Shorts gradient */}
            <LinearGradient id="shorts3d" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#2A2D3A" />
              <Stop offset="1" stopColor="#15161B" />
            </LinearGradient>
            {/* Hair gradient */}
            <LinearGradient id="hair3d" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#4A2E22" />
              <Stop offset="1" stopColor="#1F100A" />
            </LinearGradient>
            {/* Dumbbell metal */}
            <LinearGradient id="metal3d" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#D0D0D8" />
              <Stop offset="0.5" stopColor="#8A8A95" />
              <Stop offset="1" stopColor="#606068" />
            </LinearGradient>
            {/* Dumbbell weight plate */}
            <LinearGradient id="plate3d" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3A3A48" />
              <Stop offset="0.5" stopColor="#25252F" />
              <Stop offset="1" stopColor="#18181E" />
            </LinearGradient>
            {/* Background glow */}
            <RadialGradient id="bgGlow" cx="0.5" cy="0.45" r="0.5">
              <Stop offset="0" stopColor={isDark ? '#FF4F1830' : '#FF4F1818'} />
              <Stop offset="1" stopColor="transparent" />
            </RadialGradient>
            {/* Shoe gradient */}
            <LinearGradient id="shoe3d" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FF5722" />
              <Stop offset="1" stopColor="#D84315" />
            </LinearGradient>
          </Defs>

          {/* Background aura glow */}
          <Circle cx="100" cy="90" r="80" fill="url(#bgGlow)" />

          {/* === LEGS === */}
          {/* Left leg */}
          <Path
            d="M82 138 L78 172 Q77 178 80 180 L86 180 Q89 179 88 174 L92 138Z"
            fill="url(#skin3d)"
          />
          {/* Right leg */}
          <Path
            d="M108 138 L112 172 Q113 178 110 180 L104 180 Q101 179 102 174 L98 138Z"
            fill="url(#skin3d)"
          />
          {/* Left shoe */}
          <Path
            d="M76 178 Q74 183 78 185 L90 185 Q94 184 92 180 L86 179Z"
            fill="url(#shoe3d)"
          />
          {/* Right shoe */}
          <Path
            d="M114 178 Q116 183 112 185 L100 185 Q96 184 98 180 L104 179Z"
            fill="url(#shoe3d)"
          />

          {/* === SHORTS === */}
          <Path
            d="M76 122 L72 142 Q74 146 85 145 L95 132 L105 145 Q116 146 118 142 L114 122Z"
            fill="url(#shorts3d)"
          />

          {/* === TORSO — tank top === */}
          <Path
            d="M74 82 Q72 88 72 100 L74 124 Q80 128 95 128 Q110 128 116 124 L118 100 Q118 88 116 82 Q108 74 95 74 Q82 74 74 82Z"
            fill="url(#tank3d)"
          />
          {/* Tank top V-neck detail */}
          <Path
            d="M88 76 L95 90 L102 76"
            stroke="#D93D08"
            strokeWidth="1.5"
            fill="none"
            opacity="0.6"
          />
          {/* Tank top side highlight */}
          <Path
            d="M76 85 Q74 100 76 120"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
            fill="none"
          />

          {/* === ARMS === */}
          {/* Left upper arm (slightly flexed, holding dumbbell at side) */}
          <Path
            d="M74 84 Q66 86 60 94 L58 108 Q60 114 64 112 L72 100 Q74 94 74 88Z"
            fill="url(#skin3d)"
          />
          {/* Left forearm + hand */}
          <Path
            d="M58 108 L52 124 Q50 128 54 130 L58 128 L62 116 Q64 112 62 110Z"
            fill="url(#skin3d)"
          />

          {/* Right upper arm (curling dumbbell — bent at 90deg) */}
          <Path
            d="M116 84 Q124 86 130 92 L134 102 Q132 108 128 106 L120 98 Q118 92 116 88Z"
            fill="url(#skin3d)"
          />
          {/* Right forearm (curled up holding dumbbell) */}
          <Path
            d="M130 92 L138 82 Q140 78 136 74 L132 76 L128 88 Q128 92 130 94Z"
            fill="url(#skin3d)"
          />
          {/* Bicep bulge highlight */}
          <Ellipse cx="132" cy="94" rx="5" ry="7" fill="rgba(255,255,255,0.1)" />

          {/* === LEFT DUMBBELL (hanging at side) === */}
          {/* Handle */}
          <Rect x="48" y="124" width="12" height="4" rx="2" fill="url(#metal3d)" />
          {/* Left plate */}
          <Rect x="44" y="121" width="6" height="10" rx="2" fill="url(#plate3d)" />
          {/* Right plate */}
          <Rect x="58" y="121" width="6" height="10" rx="2" fill="url(#plate3d)" />

          {/* === RIGHT DUMBBELL (held in curl position) === */}
          {/* Handle */}
          <Rect x="130" y="70" width="12" height="4" rx="2" fill="url(#metal3d)" transform="rotate(-10 136 72)" />
          {/* Left plate */}
          <Rect x="126" y="67" width="6" height="10" rx="2" fill="url(#plate3d)" transform="rotate(-10 129 72)" />
          {/* Right plate */}
          <Rect x="140" y="67" width="6" height="10" rx="2" fill="url(#plate3d)" transform="rotate(-10 143 72)" />

          {/* === HEAD === */}
          {/* Neck */}
          <Path
            d="M89 74 Q90 66 95 66 Q100 66 101 74"
            fill="url(#skin3d)"
          />
          {/* Head shape */}
          <Ellipse cx="95" cy="54" rx="17" ry="20" fill="url(#skin3d)" />
          {/* Hair */}
          <Path
            d="M78 50 Q80 32 95 30 Q110 32 112 50 Q110 40 95 38 Q80 40 78 50Z"
            fill="url(#hair3d)"
          />
          {/* Side hair */}
          <Path d="M78 50 Q76 56 78 60" stroke="url(#hair3d)" strokeWidth="4" fill="none" />
          <Path d="M112 50 Q114 56 112 60" stroke="url(#hair3d)" strokeWidth="4" fill="none" />
          {/* Eyes */}
          <Ellipse cx="89" cy="52" rx="2.5" ry="3" fill="#1A1A2E" />
          <Ellipse cx="101" cy="52" rx="2.5" ry="3" fill="#1A1A2E" />
          {/* Eye highlights */}
          <Circle cx="90" cy="51" r="1" fill="rgba(255,255,255,0.7)" />
          <Circle cx="102" cy="51" r="1" fill="rgba(255,255,255,0.7)" />
          {/* Eyebrows */}
          <Path d="M85 47 Q89 44 93 46" stroke="#2B1714" strokeWidth="2" fill="none" strokeLinecap="round" />
          <Path d="M97 46 Q101 44 105 47" stroke="#2B1714" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Confident smile */}
          <Path
            d="M90 60 Q95 65 100 60"
            stroke="#8B4A35"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Nose */}
          <Path
            d="M95 50 L93 57 Q95 59 97 57Z"
            fill="#D08A65"
            opacity="0.5"
          />
          {/* Ear */}
          <Ellipse cx="78" cy="54" rx="3" ry="5" fill="#E8A070" />
          <Ellipse cx="112" cy="54" rx="3" ry="5" fill="#E8A070" />

          {/* === 3D lighting highlights === */}
          {/* Shoulder highlight */}
          <Ellipse cx="82" cy="82" rx="6" ry="3" fill="rgba(255,255,255,0.08)" />
          <Ellipse cx="108" cy="82" rx="6" ry="3" fill="rgba(255,255,255,0.08)" />
          {/* Chest highlight */}
          <Ellipse cx="90" cy="95" rx="8" ry="12" fill="rgba(255,255,255,0.05)" />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  figureWrap: {
    alignItems: 'center',
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowInner: {
    // Dimensions set inline
  },
});
