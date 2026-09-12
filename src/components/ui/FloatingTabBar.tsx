import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { FONTS, RADIUS } from '../../config/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

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
  Classes: 'Classes',
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
  const iconScale = useSharedValue(focused ? 1.1 : 1);
  const labelOpacity = useSharedValue(focused ? 1 : 0);
  const labelTranslateY = useSharedValue(focused ? 0 : 6);
  const pillScale = useSharedValue(focused ? 1 : 0);

  const [active, inactive] = TAB_ICONS[name] ?? ['ellipse', 'ellipse-outline'];
  const label = TAB_LABELS[name] ?? name;
  const colors = useThemeColors();

  useEffect(() => {
    iconScale.value = withSpring(focused ? 1.1 : 1, { damping: 14, stiffness: 220 });
    labelOpacity.value = withTiming(focused ? 1 : 0, { duration: 180 });
    labelTranslateY.value = withSpring(focused ? 0 : 6, { damping: 16, stiffness: 180 });
    pillScale.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 200 });
  }, [focused, iconScale, labelOpacity, labelTranslateY, pillScale]);

  const iconAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));
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

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    iconScale.value = withSpring(0.85, { damping: 10, stiffness: 400 }, () => {
      iconScale.value = withSpring(focused ? 1.1 : 1, { damping: 12, stiffness: 200 });
    });
    onPress();
  };

  return (
    <AnimatedPressable onPress={handlePress} style={styles.tabBtn} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
      <AnimatedView
        style={[
          styles.activePill,
          pillAnimStyle,
          { backgroundColor: `${colors.primary}17`, borderColor: `${colors.primary}30` },
        ]}
      />
      <AnimatedView style={[styles.iconWrap, iconAnimStyle]}>
        <Ionicons name={focused ? active : inactive} size={22} color={focused ? colors.primary : colors.textMuted} />
      </AnimatedView>
      <AnimatedView style={[styles.labelWrap, labelAnimStyle]}>
        <Text style={[styles.tabLabel, { color: colors.primary }]} numberOfLines={1}>
          {label}
        </Text>
      </AnimatedView>
    </AnimatedPressable>
  );
}

export const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const focusedRoute = state.routes[state.index];
  const nestedState = focusedRoute.state as { index?: number } | undefined;
  if (nestedState && typeof nestedState.index === 'number' && nestedState.index > 0) {
    return null;
  }

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.overlay,
            borderColor: colors.surfaceBorder,
            shadowColor: '#000',
          },
        ]}
      >
        <View style={styles.inner}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };
            return <TabIcon key={route.key} name={route.name} focused={focused} onPress={onPress} />;
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  bar: {
    width: '100%',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 66,
    paddingHorizontal: 6,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative' },
  activePill: { position: 'absolute', width: '80%', height: 50, borderRadius: RADIUS.lg, borderWidth: 1 },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  labelWrap: { marginTop: 2, height: 14 },
  tabLabel: { fontSize: 10, fontFamily: FONTS.bodyBold, letterSpacing: 0.3, textAlign: 'center' },
});
