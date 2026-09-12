import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { DARK_COLORS, FONTS, LIGHT_COLORS, RADIUS, shadow } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Classes: ['barbell', 'barbell-outline'],
  Chat: ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
  CheckIns: ['trophy', 'trophy-outline'],
  Profile: ['person', 'person-outline'],
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Home',
  Classes: 'Workouts',
  Chat: 'Chat',
  CheckIns: 'Check-In',
  Profile: 'Profile',
};

function TabIcon({
  name,
  focused,
  onPress,
}: {
  name: string;
  focused: boolean;
  onPress: () => void;
}) {
  const iconScale = useSharedValue(1);
  const activeProgress = useSharedValue(focused ? 1 : 0);

  const [active, inactive] = TAB_ICONS[name] ?? ['ellipse', 'ellipse-outline'];
  const label = TAB_LABELS[name] ?? name;
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  useEffect(() => {
    activeProgress.value = withTiming(focused ? 1 : 0, { duration: 220 });
  }, [focused, activeProgress]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  // The active tab gets a soft teal disc behind the glyph rather than a full
  // pill — the mockup keeps the bar's silhouette unbroken.
  const discStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [
      { scale: interpolate(activeProgress.value, [0, 1], [0.6, 1], Extrapolation.CLAMP) },
    ],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    iconScale.value = withSpring(0.86, { damping: 10, stiffness: 420 }, () => {
      iconScale.value = withSpring(1, { damping: 13, stiffness: 220 });
    });
    onPress();
  };

  return (
    <AnimatedPressable onPress={handlePress} style={styles.tabBtn}>
      <View style={styles.iconSlot}>
        <Animated.View
          style={[styles.activeDisc, discStyle, { backgroundColor: colors.primarySoft }]}
        />
        <Animated.View style={iconAnimStyle}>
          <Ionicons
            name={focused ? active : inactive}
            size={22}
            color={focused ? colors.primary : colors.textMuted}
          />
        </Animated.View>
      </View>

      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? colors.primary : colors.textMuted,
            fontFamily: focused ? FONTS.bodySemi : FONTS.bodyMedium,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Hide the bar once a tab's nested stack has pushed a detail screen, so a
  // chat room or product page gets the full height.
  const focusedRoute = state.routes[state.index];
  const nestedState = focusedRoute.state as { index?: number } | undefined;
  if (nestedState && typeof nestedState.index === 'number' && nestedState.index > 0) {
    return null;
  }

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 10) + 2 }]}>
      <View style={[styles.bar, shadow(isDark, 'lg'), { borderColor: colors.cardBorder }]}>
        <BlurView
          tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          intensity={isDark ? 60 : 70}
          style={StyleSheet.absoluteFill}
        />
        {/* Blur alone is too transparent over the moving ambient bloom; this
            near-opaque wash keeps the inactive glyphs legible. */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(16,22,30,0.88)' : 'rgba(255,255,255,0.9)' },
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
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 4,
    paddingTop: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '100%',
  },
  iconSlot: {
    width: 40,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDisc: {
    position: 'absolute',
    width: 40,
    height: 28,
    borderRadius: RADIUS.full,
  },
  tabLabel: {
    fontSize: 10.5,
    letterSpacing: 0.1,
    textAlign: 'center',
    marginTop: 3,
  },
});
