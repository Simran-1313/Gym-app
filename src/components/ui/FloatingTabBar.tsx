import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DARK_COLORS, LIGHT_COLORS, RADIUS, FONT_SIZE } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.View;

const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Classes: ['barbell', 'barbell-outline'],
  Chat: ['chatbubbles', 'chatbubbles-outline'],
  CheckIns: ['time', 'time-outline'],
  Profile: ['person', 'person-outline'],
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Home',
  Classes: 'Gym',
  Chat: 'Chat',
  CheckIns: 'Check-In',
  Profile: 'Profile',
};

const TAB_COLORS: Record<string, keyof typeof DARK_COLORS> = {
  Home: 'primary', // Cyan
  Classes: 'accent', // Purple
  Chat: 'info', // Blue
  CheckIns: 'warning', // Yellow
  Profile: 'secondary', // Pink
};

function TabIcon({
  name,
  focused,
  onPress,
  index,
  totalTabs,
}: {
  name: string;
  focused: boolean;
  onPress: () => void;
  index: number;
  totalTabs: number;
}) {
  const scale = useSharedValue(focused ? 1 : 1);
  const iconScale = useSharedValue(focused ? 1.12 : 1);
  const labelOpacity = useSharedValue(focused ? 1 : 0);
  const labelTranslateY = useSharedValue(focused ? 0 : 6);
  const pillScale = useSharedValue(focused ? 1 : 0);
  const glowOpacity = useSharedValue(focused ? 1 : 0);

  const [active, inactive] = TAB_ICONS[name] ?? ['help', 'help-outline'];
  const label = TAB_LABELS[name] ?? name;
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const tabColorKey = TAB_COLORS[name] ?? 'primary';
  const activeColor = colors[tabColorKey] as string;

  useEffect(() => {
    iconScale.value = withSpring(focused ? 1.15 : 1, { damping: 14, stiffness: 220 });
    labelOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
    labelTranslateY.value = withSpring(focused ? 0 : 6, { damping: 16, stiffness: 180 });
    pillScale.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 200 });
    glowOpacity.value = withTiming(focused ? 1 : 0, { duration: 250 });
  }, [focused, iconScale, labelOpacity, labelTranslateY, pillScale, glowOpacity]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: labelTranslateY.value }],
  }));

  const pillAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: pillScale.value },
      { scaleY: interpolate(pillScale.value, [0, 1], [0.5, 1], Extrapolation.CLAMP) },
    ],
    opacity: pillScale.value,
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowOpacity.value, [0, 1], [0, 0.6], Extrapolation.CLAMP),
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Squish-and-bounce
    iconScale.value = withSpring(0.8, { damping: 8, stiffness: 400 }, () => {
      iconScale.value = withSpring(focused ? 1.15 : 1, { damping: 12, stiffness: 200 });
    });
    onPress();
  };

  return (
    <AnimatedPressable onPress={handlePress} style={styles.tabBtn}>
      {/* Background pill for active tab */}
      <AnimatedView
        style={[
          styles.activePill,
          pillAnimStyle,
          {
            backgroundColor: isDark ? `${activeColor}15` : `${activeColor}12`,
            borderColor: isDark ? `${activeColor}30` : `${activeColor}20`,
          },
        ]}
      />

      {/* Glow behind active icon */}
      <AnimatedView
        style={[
          styles.tabGlow,
          glowAnimStyle,
          { backgroundColor: `${activeColor}25` },
        ]}
      />

      {/* Icon */}
      <AnimatedView style={[styles.iconWrap, iconAnimStyle]}>
        <Ionicons
          name={focused ? active : inactive}
          size={22}
          color={focused ? activeColor : colors.textMuted}
        />
      </AnimatedView>

      {/* Label — only visible for active tab */}
      <AnimatedView style={[styles.labelWrap, labelAnimStyle]}>
        <Text
          style={[
            styles.tabLabel,
            { color: activeColor },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </AnimatedView>
    </AnimatedPressable>
  );
}

export const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  const focusedRoute = state.routes[state.index];
  const nestedState = focusedRoute.state as { index?: number } | undefined;
  if (nestedState && typeof nestedState.index === 'number' && nestedState.index > 0) {
    return null;
  }

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      {/* Outer shadow layer for 3D depth */}
      <View style={[styles.shadowLayer, { shadowColor: isDark ? '#000' : '#4A4A68' }]} />
      <BlurView
        tint={isDark ? 'dark' : 'light'}
        intensity={isDark ? 100 : 85}
        style={[
          styles.bar,
          {
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(200,205,215,0.5)',
            backgroundColor: isDark ? 'rgba(0,0,0,0.92)' : 'rgba(255,255,255,0.55)',
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)']
              : ['rgba(255,255,255,0.6)', 'rgba(245,247,250,0.3)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Top edge inner highlight */}
        <View
          style={[
            styles.topEdge,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(255,255,255,0.8)',
            },
          ]}
          pointerEvents="none"
        />
        <View style={styles.inner}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabIcon
                key={route.key}
                name={route.name}
                focused={focused}
                onPress={onPress}
                index={index}
                totalTabs={state.routes.length}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  shadowLayer: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 4,
    bottom: -4,
    borderRadius: RADIUS.xl + 4,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bar: {
    width: '100%',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 68,
    paddingHorizontal: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    width: '80%',
    height: 52,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  tabGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    zIndex: -1,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    marginTop: 2,
    height: 14,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
