import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';
import { registerDeviceToken } from '../services/member.service';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Dynamically require expo-notifications only if NOT running in Expo Go
// to prevent SDK 53+ module-level warning crashes.
const Notifications = isExpoGo ? null : require('expo-notifications');

export const usePushNotifications = (isAuthenticated: boolean) => {
  const notificationListener = useRef<NotificationsType.Subscription | null>(null);
  const responseListener = useRef<NotificationsType.Subscription | null>(null);
  const tokenListener = useRef<NotificationsType.Subscription | null>(null);

  useEffect(() => {
    if (isExpoGo || !Notifications) {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║          ⚠️  EXPO GO — FCM NOT SUPPORTED  ⚠️           ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log('║  FCM device tokens CANNOT be obtained in Expo Go.   ║');
      console.log('║  Expo removed Firebase/FCM native module from       ║');
      console.log('║  Expo Go starting with SDK 53.                      ║');
      console.log('║                                                      ║');
      console.log('║  To test push notifications / get an FCM token:     ║');
      console.log('║  → Run: npx expo run:android                        ║');
      console.log('║  → Use a DEVELOPMENT BUILD on a physical device.    ║');
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log('');
      return;
    }

    // Set notification handler safely inside useEffect to avoid top-level "runtime not ready" errors on boot
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (!isAuthenticated) {
      // Clean up listeners on logout
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
      }
      if (tokenListener.current) {
        tokenListener.current.remove();
        tokenListener.current = null;
      }
      return;
    }

    const setupPushNotifications = async () => {
      if (!Device.isDevice) {
        console.log('[PushNotifications] Must use physical device for Push Notifications');
        return;
      }

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('[PushNotifications] Notification permission not granted');
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        // Get the native FCM/APNs token
        const devicePushToken = await Notifications.getDevicePushTokenAsync();
        const token = devicePushToken.data;
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        console.log('====================================');
        console.log('FCM Device Token:', token);
        console.log('====================================');
        console.log(`[PushNotifications] Fetched push token for platform: ${platform}`);

        // Register to backend
        await registerDeviceToken({ token, platform });
        console.log('[PushNotifications] Token registered successfully');

        // Watch for token refreshes
        tokenListener.current = Notifications.addPushTokenListener(async (pushToken: NotificationsType.DevicePushToken) => {
          console.log('[PushNotifications] Token refreshed:', pushToken.data);
          try {
            await registerDeviceToken({
              token: pushToken.data,
              platform: Platform.OS === 'ios' ? 'ios' : 'android',
            });
            console.log('[PushNotifications] Refreshed token registered successfully');
          } catch (err) {
            console.error('[PushNotifications] Failed to register refreshed token:', err);
          }
        });
      } catch (error) {
        console.error('[PushNotifications] Error during push notification setup:', error);
      }
    };

    setupPushNotifications();

    // Listeners for foreground notifications and clicks
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: NotificationsType.Notification) => {
      console.log('[PushNotifications] Notification received in foreground:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: NotificationsType.NotificationResponse) => {
      console.log('[PushNotifications] Notification clicked:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
      }
      if (tokenListener.current) {
        tokenListener.current.remove();
        tokenListener.current = null;
      }
    };
  }, [isAuthenticated]);
};

