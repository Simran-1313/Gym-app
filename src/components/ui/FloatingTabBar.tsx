import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInUp,
  useAnimatedScrollHandler,
  useAnimatedStyle as useReanimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DARK_COLORS, LIGHT_COLORS, RADIUS } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Classes: ['barbell', 'barbell-outline'],
  Products: ['bag', 'bag-outline'],
  CheckIns: ['time', 'time-outline'],
  Profile: ['person', 'person-outline'],
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
  const scale = useSharedValue(focused ? 1.15 : 1);
  const [active, inactive] = TAB_ICONS[name] ?? ['help', 'help-outline'];
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, { damping: 12, stiffness: 200 });
  }, [focused, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.9, { damping: 10 }, () => {
      scale.value = withSpring(focused ? 1.15 : 1);
    });
    onPress();
  };

  return (
    <AnimatedPressable onPress={handlePress} style={styles.tabBtn}>
      <Animated.View style={[styles.iconWrap, animStyle]}>
        <Ionicons
          name={focused ? active : inactive}
          size={23}
          color={focused ? colors.primary : colors.textMuted}
        />
        {focused ? (
          <Animated.View 
            entering={FadeInUp.duration(180)} 
            style={[
              styles.activeDot,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              }
            ]} 
          />
        ) : null}
        {focused ? <View style={[styles.glow, { backgroundColor: `${colors.primary}18` }]} /> : null}
      </Animated.View>
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

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View 
        style={[
          styles.bar,
          {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
            backgroundColor: isDark ? 'rgba(12, 12, 16, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          }
        ]}
      >
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
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  inner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
    position: 'absolute',
    bottom: -10,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  glow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    zIndex: -1,
  },
});
