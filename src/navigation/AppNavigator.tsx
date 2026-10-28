import React, { useState } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { FloatingTabBar } from '../components/ui/FloatingTabBar';
import { ConnectivityBanner } from '../components/ui/ConnectivityBanner';
import { PlanReadyToast } from '../components/ui/PlanReadyToast';
import { EmptyState } from '../components/ui/EmptyState';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { FONT_SIZE, FONTS, ThemeColors } from '../config/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { ActiveSubscription, AiPlan, WorkoutDay } from '../types';

// A flat, solid header — one elevation tier above the screen body, separated
// by a single hairline. Replaces a blurred/gradient strip: cheaper to render,
// and consistent with every other surface in the app now being solid instead
// of translucent-over-blur.
const SleekHeaderBackground = ({ colors }: { colors: ThemeColors }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceElevated }]}>
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.surfaceBorder,
      }}
    />
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
import { WorkoutSessionScreen } from '../screens/workout/WorkoutSessionScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { ActivityScreen } from '../screens/activity/ActivityScreen';
import { MetricDetailScreen } from '../screens/activity/MetricDetailScreen';
import { ProductsScreen } from '../screens/products/ProductsScreen';
import { ProductDetailScreen } from '../screens/products/ProductDetailScreen';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { AiCoachScreen } from '../screens/chat/AiCoachScreen';
import { MembershipScreen } from '../screens/membership/MembershipScreen';
import { CheckoutScreen } from '../screens/membership/CheckoutScreen';
import { ChallengesScreen } from '../screens/challenges/ChallengesScreen';
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
  // A live, in-memory set-by-set tracker for one day's exercise list — see
  // WorkoutSessionScreen for why per-set weight/reps live only for the
  // session's duration rather than being persisted (no backend endpoint for
  // it) and why only a session-level summary is logged on finish.
  WorkoutSession: { day: WorkoutDay };
  Notifications: undefined;
  Activity: undefined;
  // Per-metric drill-down opened from Activity's (and Home's) metric chips.
  MetricDetail: { metric: 'CALORIES' | 'DURATION' | 'WATER' };
  Products: undefined;
  Membership: undefined;
  Checkout: { subscription: ActiveSubscription };
  Challenges: undefined;
  // Also reachable from Profile, not just through the first-login gate — the
  // prototype has an in-app "Change Password" row (#screen-change-password-inapp).
  ChangePassword: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const ClassesStack = createNativeStackNavigator<ClassesStackParams>();
const ProductsStack = createNativeStackNavigator<ProductsStackParams>();
const ChatStack = createNativeStackNavigator<ChatStackParams>();
const RootStack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabParams>();

// One push transition on both platforms: the native horizontal slide,
// which keeps the iOS edge-swipe back gesture.
const stackAnimation = 'slide_from_right';

// Sleek screen options — modern minimal header with reduced height feel
const makeScreenOptions = (colors: ThemeColors) => ({
  headerStyle: { backgroundColor: 'transparent' },
  headerTransparent: true,
  contentStyle: { backgroundColor: 'transparent' },
  animation: stackAnimation as 'slide_from_right',
  headerTintColor: colors.text,
  headerTitleStyle: {
    color: colors.text,
    fontFamily: FONTS.displaySemi,
    fontSize: FONT_SIZE.lg,
    letterSpacing: -0.3,
  },
  headerShadowVisible: false,
  headerBackground: () => <SleekHeaderBackground colors={colors} />,
  headerBackTitleVisible: false,
});

const ProductsNavigator: React.FC = () => {
  const colors = useThemeColors();

  return (
    <ProductsStack.Navigator screenOptions={makeScreenOptions(colors)}>
      <ProductsStack.Screen name="ProductList" component={ProductsScreen} options={{ headerShown: false }} />
      <ProductsStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
    </ProductsStack.Navigator>
  );
};

const ChatNavigator: React.FC = () => {
  const colors = useThemeColors();

  return (
    <ChatStack.Navigator screenOptions={makeScreenOptions(colors)}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: false }} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ headerShown: false }} />
      <ChatStack.Screen name="AiCoach" component={AiCoachScreen} options={{ headerShown: false }} />
    </ChatStack.Navigator>
  );
};

const ClassesNavigator: React.FC = () => {
  const colors = useThemeColors();

  return (
    <ClassesStack.Navigator screenOptions={makeScreenOptions(colors)}>
      <ClassesStack.Screen name="ClassSchedules" component={ClassesScreen} options={{ headerShown: false }} />
      <ClassesStack.Screen name="MyBookings" component={BookingsScreen} options={{ headerShown: false }} />
    </ClassesStack.Navigator>
  );
};

const MainTabs: React.FC = () => {
  const colors = useThemeColors();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerTransparent: true,
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
          fontFamily: FONTS.displaySemi,
          fontSize: FONT_SIZE.lg,
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
        headerBackground: () => <SleekHeaderBackground colors={colors} />,
        sceneStyle: [styles.tabScene, { backgroundColor: colors.background }],
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
        options={{ title: 'Chat', headerShown: false }}
      />
      <Tab.Screen name="CheckIns" component={CheckInsScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
};

const navigationRef = createNavigationContainerRef<RootStackParams>();

/** Focused-route names that show the floating tab bar. */
const TAB_ROUTES = new Set(['Home', 'ClassSchedules', 'MyBookings', 'ChatList', 'CheckIns', 'Profile']);

/**
 * A saved session exists but couldn't be verified (offline or server down).
 * Offering a retry here — instead of the login form — means a member who
 * opens the app on a train isn't signed out by a tunnel. AuthContext also
 * retries on its own when the connection comes back.
 */
const SessionRestoreError: React.FC<{ message: string }> = ({ message }) => {
  const { retryRestore, abandonRestore } = useAuth();
  return (
    <ScreenBackground>
      <View style={styles.restoreWrap}>
        <EmptyState
          icon="cloud-offline-outline"
          tone="error"
          title="Can’t connect right now"
          subtitle={`${message} You’re still signed in — we’ll reconnect automatically.`}
          actionLabel="Try Again"
          onAction={retryRestore}
          secondaryLabel="Sign in with another account"
          onSecondary={abandonRestore}
        />
      </View>
    </ScreenBackground>
  );
};

export const AppNavigator: React.FC = () => {
  const { user, isLoading, isFirstLogin, theme, restoreError } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string | undefined>(undefined);

  // Register push notifications when user is logged in
  usePushNotifications(!!user);

  const isDark = theme === 'dark';
  const colors = useThemeColors();
  const dynamicScreenOptions = makeScreenOptions(colors);

  if (isLoading) return <LoadingSpinner fullScreen />;

  let content: React.ReactNode;
  // Keys the NavigationContainer below. The container owns navigation state
  // and carries it across a navigator swap; since both the onboarding and the
  // main stack contain an `Onboarding` route, finishing onboarding used to
  // leave the member on that route inside the main app. A fresh container per
  // phase starts each phase at its own first screen.
  const phase = !user ? 'auth' : isFirstLogin ? 'first-login' : user.isOnboarded === false ? 'onboarding' : 'app';

  if (!user && restoreError) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SessionRestoreError message={restoreError} />
      </>
    );
  }

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
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="DietPlan" component={DietPlanScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="WorkoutPlan" component={WorkoutPlanScreen} options={{ headerShown: false }} />
      </RootStack.Navigator>
    );
  } else {
    content = (
      <RootStack.Navigator screenOptions={dynamicScreenOptions}>
        <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="DietPlan" component={DietPlanScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="WorkoutPlan" component={WorkoutPlanScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="WorkoutSession" component={WorkoutSessionScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Activity" component={ActivityScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="MetricDetail" component={MetricDetailScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Products" component={ProductsNavigator} options={{ headerShown: false }} />
        <RootStack.Screen name="Membership" component={MembershipScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Challenges" component={ChallengesScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: false }} />
      </RootStack.Navigator>
    );
  }

  const navigationTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background } };

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} {...({ translucent: true, backgroundColor: 'transparent' } as any)} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      <NavigationContainer
        key={phase}
        ref={navigationRef}
        theme={navigationTheme}
        onReady={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name)}
        onStateChange={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name)}
      >
        {content}
      </NavigationContainer>
      {user ? (
        <PlanReadyToast
          currentRoute={currentRoute}
          onOpen={
            user.isOnboarded
              ? (type) => {
                  if (navigationRef.isReady()) navigationRef.navigate(type === 'WORKOUT' ? 'WorkoutPlan' : 'DietPlan');
                }
              : null
          }
        />
      ) : null}
      <ConnectivityBanner aboveTabBar={!!currentRoute && TAB_ROUTES.has(currentRoute)} />
    </>
  );
};

const styles = StyleSheet.create({
  tabScene: { backgroundColor: 'transparent' },
  restoreWrap: { flex: 1, justifyContent: 'center', padding: 20 },
});
