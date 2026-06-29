import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { FloatingTabBar } from '../components/ui/FloatingTabBar';
import { DARK_COLORS, LIGHT_COLORS } from '../config/theme';
import { AiPlan } from '../types';

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

const screenOptions = {
  headerStyle: { backgroundColor: 'transparent' },
  headerTransparent: true,
  contentStyle: { backgroundColor: 'transparent' },
  animation: stackAnimation as 'fade_from_bottom' | 'slide_from_right',
};

const ProductsNavigator: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const dynamicScreenOptions = {
    ...screenOptions,
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text, fontWeight: '600' as const },
  };

  return (
    <ProductsStack.Navigator screenOptions={dynamicScreenOptions}>
      <ProductsStack.Screen name="ProductList" component={ProductsScreen} options={{ title: 'Products' }} />
      <ProductsStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
    </ProductsStack.Navigator>
  );
};

const ChatNavigator: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const dynamicScreenOptions = {
    ...screenOptions,
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text, fontWeight: '600' as const },
  };

  return (
    <ChatStack.Navigator screenOptions={dynamicScreenOptions}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
      <ChatStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.roomName })}
      />
    </ChatStack.Navigator>
  );
};

const ClassesNavigator: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const dynamicScreenOptions = {
    ...screenOptions,
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text, fontWeight: '600' as const },
  };

  return (
    <ClassesStack.Navigator screenOptions={dynamicScreenOptions}>
      <ClassesStack.Screen name="ClassSchedules" component={ClassesScreen} options={{ title: 'Classes' }} />
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
        headerTitleStyle: { color: colors.text, fontWeight: '600' as const },
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
      <Tab.Screen name="CheckIns" component={CheckInsScreen} options={{ title: 'Check-ins' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { user, isLoading, isFirstLogin, theme } = useAuth();

  // Register push notifications when user is logged in
  usePushNotifications(!!user);

  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const dynamicScreenOptions = {
    ...screenOptions,
    headerTintColor: colors.text,
    headerTitleStyle: { color: colors.text, fontWeight: '600' as const },
  };

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

  const navigationTheme = isDark ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background } } : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background } };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} {...({ translucent: true, backgroundColor: 'transparent' } as any)} />
      <NavigationContainer theme={navigationTheme}>{content}</NavigationContainer>
    </>
  );
};

const styles = StyleSheet.create({
  tabScene: { backgroundColor: 'transparent' },
});
