import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View, ImageBackground, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { FloatingTabBar } from '../components/ui/FloatingTabBar';
import { AnimatedMeshBackground } from '../components/ui/AnimatedMeshBackground';
import { DARK_COLORS, LIGHT_COLORS, FONT_SIZE } from '../config/theme';
import { AiPlan } from '../types';

// Sleek minimal header — no heavy bar, just a clean frosted strip
const SleekHeaderBackground = ({ isDark }: { isDark: boolean }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10,10,18,0.65)' : 'rgba(250,250,255,0.7)' }]}>
    <BlurView
      tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      intensity={isDark ? 60 : 70}
      style={StyleSheet.absoluteFill}
    />
    <LinearGradient
      colors={
        isDark
          ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.005)']
          : ['rgba(255,255,255,0.45)', 'rgba(248,249,252,0.15)']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
    {/* Subtle bottom separator */}
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 20,
      right: 20,
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    }} />
  </View>
);

import { LoginScreen } from '../screens/auth/LoginScreen';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ClassesScreen } from '../screens/classes/ClassesScreen';
import { BookingsScreen } from '../screens/classes/BookingsScreen';
import { CheckInsScreen } from '../screens/checkins/CheckInsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { DietPlanScreen } from '../screens/dietplan/DietPlanScreen';
import { WorkoutPlanScreen } from '../screens/workout/WorkoutPlanScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { ActivityScreen } from '../screens/activity/ActivityScreen';
import { ProductsScreen } from '../screens/products/ProductsScreen';
import { ProductDetailScreen } from '../screens/products/ProductDetailScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { AiCoachScreen } from '../screens/chat/AiCoachScreen';
import { usePushNotifications } from '../hooks/usePushNotifications';

export type AuthStackParams = {
  Login: undefined;
  ChangePassword: undefined;
};

export type ClassesStackParams = {
  ClassSchedules: undefined;
  MyBookings: undefined;
};

export type ProductsStackParams = {
  ProductList: undefined;
  ProductDetail: { productId: string };
};

export type ChatStackParams = {
  ChatList: undefined;
  ChatRoom: { roomId: string; roomName: string };
  AiCoach: undefined;
};

export type TabParams = {
  Home: undefined;
  Classes: undefined;
  Chat: undefined;
  CheckIns: undefined;
  Profile: undefined;
};

export type RootStackParams = {
  MainTabs: undefined;
  Onboarding: undefined;
  DietPlan: { plan?: AiPlan; fromOnboarding?: boolean; generate?: boolean } | undefined;
  WorkoutPlan: { plan?: AiPlan; generate?: boolean } | undefined;
  Notifications: undefined;
  Activity: undefined;
  Products: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const ClassesStack = createNativeStackNavigator<ClassesStackParams>();
const ProductsStack = createNativeStackNavigator<ProductsStackParams>();
const ChatStack = createNativeStackNavigator<ChatStackParams>();
const RootStack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabParams>();

const stackAnimation = Platform.OS === 'ios' ? 'fade_from_bottom' : 'slide_from_right';

// Sleek screen options — modern minimal header with reduced height feel
const makeScreenOptions = (isDark: boolean, colors: typeof DARK_COLORS) => ({
  headerStyle: { backgroundColor: 'transparent' },
  headerTransparent: true,
  contentStyle: { backgroundColor: 'transparent' },
  animation: stackAnimation as 'fade_from_bottom' | 'slide_from_right',
  headerTintColor: colors.text,
  headerTitleStyle: {
    color: colors.text,
    fontWeight: '700' as const,
    fontSize: FONT_SIZE.lg,
    letterSpacing: -0.3,
  },
  headerShadowVisible: false,
  headerBackground: () => <SleekHeaderBackground isDark={isDark} />,
  headerBackTitleVisible: false,
});

const ProductsNavigator: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ProductsStack.Navigator screenOptions={makeScreenOptions(isDark, colors)}>
      <ProductsStack.Screen name="ProductList" component={ProductsScreen} options={{ title: 'Products' }} />
      <ProductsStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
    </ProductsStack.Navigator>
  );
};

const ChatNavigator: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ChatStack.Navigator screenOptions={makeScreenOptions(isDark, colors)}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <ChatStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.roomName })}
      />
      <ChatStack.Screen
        name="AiCoach"
        component={AiCoachScreen}
        options={{ title: 'FitCoach AI' }}
      />
    </ChatStack.Navigator>
  );
};

const ClassesNavigator: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ClassesStack.Navigator screenOptions={makeScreenOptions(isDark, colors)}>
      <ClassesStack.Screen name="ClassSchedules" component={ClassesScreen} options={{ headerShown: false }} />
      <ClassesStack.Screen name="MyBookings" component={BookingsScreen} options={{ title: 'My Bookings' }} />
    </ClassesStack.Navigator>
  );
};

const MainTabs: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerTransparent: true,
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '700' as const,
          fontSize: FONT_SIZE.lg,
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
        headerBackground: () => <SleekHeaderBackground isDark={isDark} />,
        sceneStyle: styles.tabScene,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home', headerShown: false }} />
      <Tab.Screen
        name="Classes"
        component={ClassesNavigator}
        options={{ title: 'Classes', headerShown: false }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{ title: 'Messages', headerShown: false }}
      />
      <Tab.Screen name="CheckIns" component={CheckInsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { user, isLoading, isFirstLogin, theme } = useAuth();

  // Register push notifications when user is logged in
  usePushNotifications(!!user);

  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const dynamicScreenOptions = makeScreenOptions(isDark, colors);

  if (isLoading) return <LoadingSpinner fullScreen />;

  let content: React.ReactNode;

  if (!user) {
    content = (
      <AuthStack.Navigator screenOptions={{ headerShown: false, animation: stackAnimation }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
      </AuthStack.Navigator>
    );
  } else if (isFirstLogin) {
    content = (
      <AuthStack.Navigator screenOptions={dynamicScreenOptions}>
        <AuthStack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{ title: 'Set New Password', headerLeft: () => null }}
        />
      </AuthStack.Navigator>
    );
  } else if (user.isOnboarded === false) {
    content = (
      <RootStack.Navigator screenOptions={dynamicScreenOptions}>
        <RootStack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ title: 'Your Fitness Profile', headerLeft: () => null }}
        />
        <RootStack.Screen
          name="DietPlan"
          component={DietPlanScreen}
          options={{ title: 'My Diet Plan', headerBackVisible: false }}
        />
        <RootStack.Screen
          name="WorkoutPlan"
          component={WorkoutPlanScreen}
          options={{ title: 'My Workout Plan' }}
        />
      </RootStack.Navigator>
    );
  } else {
    content = (
      <RootStack.Navigator screenOptions={dynamicScreenOptions}>
        <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="DietPlan" component={DietPlanScreen} options={{ title: 'My Diet Plan' }} />
        <RootStack.Screen name="WorkoutPlan" component={WorkoutPlanScreen} options={{ title: 'My Workout Plan' }} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: 'Update Fitness Profile' }} />
        <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
        <RootStack.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity Dashboard' }} />
        <RootStack.Screen name="Products" component={ProductsNavigator} options={{ headerShown: false }} />
      </RootStack.Navigator>
    );
  }

  const navigationTheme = isDark ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: 'transparent' } } : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} {...({ translucent: true, backgroundColor: 'transparent' } as any)} />
      <AnimatedMeshBackground isDark={isDark} />
      <NavigationContainer theme={navigationTheme}>{content}</NavigationContainer>
    </>
  );
};

const styles = StyleSheet.create({
  tabScene: { backgroundColor: 'transparent' },
});
