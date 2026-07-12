import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  isDark: boolean;
}

/* ─── Small bright circle that roams the entire screen ─── */
const RoamingDot = ({
  color,
  size,
  // Waypoints: the dot travels through these [x,y] positions in order
  waypoints,
  durations,
}: {
  color: string;
  size: number;
  waypoints: { x: number; y: number }[];
  durations: number[];
}) => {
  const translateX = useSharedValue(waypoints[0].x);
  const translateY = useSharedValue(waypoints[0].y);

  useEffect(() => {
    // Build X waypoint sequence
    const xSteps = waypoints.slice(1).map((wp, i) =>
      withTiming(wp.x, { duration: durations[i], easing: Easing.inOut(Easing.ease) })
    );
    // Build Y waypoint sequence
    const ySteps = waypoints.slice(1).map((wp, i) =>
      withTiming(wp.y, { duration: durations[i], easing: Easing.inOut(Easing.ease) })
    );

    translateX.value = withRepeat(withSequence(...xSteps), -1, true);
    translateY.value = withRepeat(withSequence(...ySteps), -1, true);
  }, [durations, translateX, translateY, waypoints]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
};

/* ─── Main Background ─── */
export const AnimatedMeshBackground: React.FC<Props> = ({ isDark }) => {
  const bg = isDark ? '#06060A' : '#EAECF2';

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />

      {/* ═══ 3 bright roaming dots, blurred ═══ */}
      <View style={[StyleSheet.absoluteFill, { filter: [{ blur: 16 }] } as any]} pointerEvents="none">
        {/* 🔴 Red dot — sweeps top-left → bottom-right → top-right → back */}
        <RoamingDot
          color="#FF3B30"
          size={180}
          waypoints={[
            { x: W * 0.1, y: H * 0.05 },
            { x: W * 0.7, y: H * 0.4 },
            { x: W * 0.2, y: H * 0.8 },
            { x: W * 0.8, y: H * 0.15 },
            { x: W * 0.1, y: H * 0.05 },
          ]}
          durations={[3500, 4000, 3800, 3200]}
        />

        {/* 🔵 Sky blue dot — sweeps right → center → bottom-left → top → back */}
        <RoamingDot
          color="#00BFFF"
          size={160}
          waypoints={[
            { x: W * 0.8, y: H * 0.1 },
            { x: W * 0.4, y: H * 0.35 },
            { x: W * 0.05, y: H * 0.7 },
            { x: W * 0.6, y: H * 0.85 },
            { x: W * 0.8, y: H * 0.1 },
          ]}
          durations={[4000, 3500, 3800, 4200]}
        />

        {/* 🟢 Green dot — sweeps bottom → top-right → left → center → back */}
        <RoamingDot
          color="#34C759"
          size={170}
          waypoints={[
            { x: W * 0.3, y: H * 0.9 },
            { x: W * 0.75, y: H * 0.2 },
            { x: W * 0.1, y: H * 0.45 },
            { x: W * 0.5, y: H * 0.65 },
            { x: W * 0.3, y: H * 0.9 },
          ]}
          durations={[3800, 4200, 3500, 3800]}
        />
      </View>

      {/* ═══ Frosted tint overlay ═══ */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(6,6,10,0.55)'
              : 'rgba(240,242,248,0.45)',
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
};
