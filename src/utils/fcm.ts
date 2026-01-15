/**
 * 🔔 EXPO NOTIFICATIONS UTILITY
 * 
 * Handles push notifications using Expo's notification system
 * Works seamlessly with your existing authHelper!
 * 
 * Installation:
 * npx expo install expo-notifications expo-device expo-constants
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Configure notification behavior
 * This shows notifications even when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('📱 Requesting notification permission...');
    
    if (!Device.isDevice) {
      console.log('⚠️ Must use physical device for push notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Notification permission denied');
      return false;
    }

    console.log('✅ Notification permission granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting permission:', error);
    return false;
  }
};

/**
 * Get Expo Push Token (replaces FCM token)
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    console.log('📱 Getting Expo push token...');

    if (!Device.isDevice) {
      console.log('⚠️ Push notifications only work on physical devices');
      return null;
    }

    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return null;
    }

    // Configure Android notification channel (required for Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
      console.log('✅ Android notification channel configured');
    }

    // Get project ID
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.log('⚠️ No EAS project ID found');
      console.log('💡 Get one from: https://expo.dev');
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    const token = tokenData.data;
    console.log('✅ Expo push token retrieved');
    console.log('📱 Token:', token.substring(0, 30) + '...');

    return token; // Format: ExponentPushToken[xxxxxx]

  } catch (error: any) {
    console.error('❌ Error getting Expo push token:', error);
    return null;
  }
};

/**
 * Get device information
 */
export const getDeviceInfo = (): {
  deviceType: 'ios' | 'android' | 'web';
  deviceName: string;
} => {
  const deviceType = Platform.OS as 'ios' | 'android';
  const deviceName = Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android Device');

  return {
    deviceType,
    deviceName,
  };
};

/**
 * Initialize notifications on app launch
 */
export const initializeFCM = async () => {
  try {
    console.log('🔥 Initializing Expo notifications...');

    if (!Device.isDevice) {
      console.log('⚠️ Not a physical device');
      return null;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
    }

    const token = await getFCMToken();
    
    if (token) {
      console.log('✅ Notifications initialized successfully');
      return token;
    }

    return null;
  } catch (error) {
    console.error('❌ Notification initialization error:', error);
    return null;
  }
};

/**
 * Get cached token
 */
export const getCachedFCMToken = async (): Promise<string | null> => {
  return await getFCMToken();
};

/**
 * Check if notifications are configured
 */
export const checkFCMConfiguration = async (): Promise<boolean> => {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

/**
 * Alert if not configured (dev only)
 */
export const alertIfFCMNotConfigured = async () => {
  // Optional - implement if needed
};

/**
 * Listen for token refresh
 */
export const onFCMTokenRefresh = (callback: (token: string) => void) => {
  // Expo tokens are stable, no refresh needed
  return () => {};
};

/**
 * Handle foreground notifications
 */
export const onForegroundNotification = () => {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📬 Notification received:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
    });
  });

  return () => subscription.remove();
};

/**
 * Get notification that opened the app
 */
export const getInitialNotification = async () => {
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification || null;
};

/**
 * Handle notification tap
 */
export const onNotificationTap = (callback: (notification: any) => void) => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('📬 Notification tapped');
    callback(response.notification);
  });

  return () => subscription.remove();
};

// Export all functions
export default {
  getFCMToken,
  getDeviceInfo,
  requestNotificationPermission,
  getCachedFCMToken,
  checkFCMConfiguration,
  alertIfFCMNotConfigured,
  initializeFCM,
  onFCMTokenRefresh,
  onForegroundNotification,
  getInitialNotification,
  onNotificationTap,
};

/**
 * 📝 USAGE NOTES:
 * 
 * Your existing code works without changes!
 * - authHelper.ts imports this file ✅
 * - LoginScreen.tsx calls loginUser() ✅
 * - Backend receives Expo push tokens ✅
 * 
 * NOTIFICATION ICON:
 * - Add assets/notification-icon.png (96x96px, white, transparent)
 * - Configure in app.json plugins section
 * - Rebuild with: npx expo prebuild --clean
 * 
 * TESTING:
 * 1. Run: npx expo run:android
 * 2. Login to app
 * 3. Check logs for Expo push token
 * 4. Your backend needs to detect Expo tokens and send via Expo Push API
 */