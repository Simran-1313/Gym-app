import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { COLORS } from '../config/theme';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ClassesScreen } from '../screens/classes/ClassesScreen';
import { BookingsScreen } from '../screens/classes/BookingsScreen';
import { CheckInsScreen } from '../screens/checkins/CheckInsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

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

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const ClassesStack = createNativeStackNavigator<ClassesStackParams>();
const Tab = createBottomTabNavigator<TabParams>();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.text,
  headerTitleStyle: { color: COLORS.text, fontWeight: '600' as const },
  contentStyle: { backgroundColor: COLORS.background },
};

const ClassesNavigator: React.FC = () => (
  <ClassesStack.Navigator screenOptions={screenOptions}>
    <ClassesStack.Screen name="ClassSchedules" component={ClassesScreen} options={{ title: 'Classes' }} />
    <ClassesStack.Screen name="MyBookings" component={BookingsScreen} options={{ title: 'My Bookings' }} />
  </ClassesStack.Navigator>
);

const MainTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerStyle: { backgroundColor: COLORS.surface },
      headerTintColor: COLORS.text,
      headerTitleStyle: { color: COLORS.text, fontWeight: '600' as const },
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.cardBorder,
        height: 60,
        paddingBottom: 8,
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
          Home: ['home', 'home-outline'],
          Classes: ['barbell', 'barbell-outline'],
          CheckIns: ['time', 'time-outline'],
          Profile: ['person', 'person-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['help', 'help-outline'];
        return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
      },
    })}
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

  return (
    <NavigationContainer>
      {user ? (
        isFirstLogin ? (
          <AuthStack.Navigator screenOptions={screenOptions}>
            <AuthStack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ title: 'Set New Password', headerLeft: () => null }}
            />
          </AuthStack.Navigator>
        ) : (
          <MainTabs />
        )
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
};
