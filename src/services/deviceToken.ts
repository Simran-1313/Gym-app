import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// expo-notifications is unavailable in Expo Go (SDK 53+), so require it lazily.
const Notifications = isExpoGo ? null : require('expo-notifications');

export interface DeviceTokenInfo {
  deviceToken: string;
  platform: 'ios' | 'android';
}

/**
 * Fetch the native FCM/APNs device token + platform for sending with auth requests.
 * Returns null (never throws) when running in Expo Go, on a simulator, or when
 * permission is denied — callers should treat a null result as "no token available".
 */
export const getDeviceTokenInfo = async (): Promise<DeviceTokenInfo | null> => {
  try {
    if (isExpoGo || !Notifications) {
      console.log('[getDeviceTokenInfo] Skipped: Expo Go / notifications module unavailable');
      return null;
    }

    if (!Device.isDevice) {
      console.log('[getDeviceTokenInfo] Skipped: must run on a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[getDeviceTokenInfo] Skipped: notification permission not granted');
      return null;
    }

    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
    console.log('[getDeviceTokenInfo] Resolved device token for platform:', platform);
    return { deviceToken: devicePushToken.data, platform };
  } catch (err) {
    console.warn('[getDeviceTokenInfo] Failed to resolve device token:', err);
    return null;
  }
};
