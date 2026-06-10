import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { FloatingTabBar } from '../components/ui/FloatingTabBar';
import { COLORS } from '../config/theme';
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

export type AuthStackParams = {
  Login: undefined;
  ChangePassword: undefined;
};

export type ClassesStackParams = {
  ClassSchedules: undefined;
  MyBookings: undefined;
};

export type TabParams = {
  Home: undefined;
  Classes: undefined;
  CheckIns: undefined;
  Profile: undefined;
};

export type RootStackParams = {
  MainTabs: undefined;
  Onboarding: undefined;
  DietPlan: { plan?: AiPlan; fromOnboarding?: boolean; generate?: boolean } | undefined;
  WorkoutPlan: { plan?: AiPlan; generate?: boolean } | undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const ClassesStack = createNativeStackNavigator<ClassesStackParams>();
const RootStack = createNativeStackNavigator<RootStackParams>();
const Tab = createBottomTabNavigator<TabParams>();

const stackAnimation = Platform.OS === 'ios' ? 'fade_from_bottom' : 'slide_from_right';

const screenOptions = {
  headerStyle: { backgroundColor: 'transparent' },
  headerTransparent: true,
  headerTintColor: COLORS.text,
  headerTitleStyle: { color: COLORS.text, fontWeight: '600' as const },
  contentStyle: { backgroundColor: 'transparent' },
  animation: stackAnimation as 'fade_from_bottom' | 'slide_from_right',
};

const ClassesNavigator: React.FC = () => (
  <ClassesStack.Navigator screenOptions={screenOptions}>
    <ClassesStack.Screen name="ClassSchedules" component={ClassesScreen} options={{ title: 'Classes' }} />
    <ClassesStack.Screen name="MyBookings" component={BookingsScreen} options={{ title: 'My Bookings' }} />
  </ClassesStack.Navigator>
);

const MainTabs: React.FC = () => (
  <Tab.Navigator
    tabBar={(props) => <FloatingTabBar {...props} />}
    screenOptions={{
      headerStyle: { backgroundColor: 'transparent' },
      headerTransparent: true,
      headerTintColor: COLORS.text,
      headerTitleStyle: { color: COLORS.text, fontWeight: '600' as const },
      sceneStyle: styles.tabScene,
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
    <Tab.Screen
      name="Classes"
      component={ClassesNavigator}
      options={{ title: 'Classes', headerShown: false }}
    />
    <Tab.Screen name="CheckIns" component={CheckInsScreen} options={{ title: 'Check-ins' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
  </Tab.Navigator>
);

export const AppNavigator: React.FC = () => {
  const { user, isLoading, isFirstLogin } = useAuth();

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
      <AuthStack.Navigator screenOptions={screenOptions}>
        <AuthStack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{ title: 'Set New Password', headerLeft: () => null }}
        />
      </AuthStack.Navigator>
    );
  } else if (user.isOnboarded === false) {
    content = (
      <RootStack.Navigator screenOptions={screenOptions}>
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
      <RootStack.Navigator screenOptions={screenOptions}>
        <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <RootStack.Screen name="DietPlan" component={DietPlanScreen} options={{ title: 'My Diet Plan' }} />
        <RootStack.Screen name="WorkoutPlan" component={WorkoutPlanScreen} options={{ title: 'My Workout Plan' }} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: 'Update Fitness Profile' }} />
      </RootStack.Navigator>
    );
  }

  return <NavigationContainer>{content}</NavigationContainer>;
};

const styles = StyleSheet.create({
  tabScene: { backgroundColor: 'transparent' },
});
