/**
 * FCM (Firebase Cloud Messaging) Utility
 * 
 * Handles push notification token management for React Native
 * 
 * Installation:
 * npm install @react-native-firebase/app @react-native-firebase/messaging
 * cd ios && pod install
 */

import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Request notification permissions (required for iOS)
 * @returns {Promise<boolean>} - True if permission granted
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('📱 Requesting notification permission...');
    
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ Notification permission granted:', authStatus);
      return true;
    } else {
      console.log('❌ Notification permission denied:', authStatus);
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Get FCM token from device
 * @returns {Promise<string | null>} - FCM token or null if unavailable
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    console.log('📱 Getting FCM token...');

    // Check if app has permission (iOS only)
    if (Platform.OS === 'ios') {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        console.log('⚠️ No notification permission on iOS, cannot get FCM token');
        return null;
      }
    } else {
      // For Android, also request permission (Android 13+)
      await requestNotificationPermission();
    }

    // Get FCM token
    const fcmToken = await messaging().getToken();

    if (fcmToken) {
      console.log('✅ FCM Token retrieved successfully');
      console.log('📱 Token (first 30 chars):', fcmToken.substring(0, 30) + '...');
      
      // Save token to AsyncStorage for later use
      await AsyncStorage.setItem('fcmToken', fcmToken);
      return fcmToken;
    } else {
      console.log('⚠️ No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

/**
 * Get device information
 * @returns {Object} - Device type and name
 */
export const getDeviceInfo = (): {
  deviceType: 'ios' | 'android' | 'web';
  deviceName: string;
} => {
  const deviceType = Platform.OS as 'ios' | 'android';
  
  let deviceName = 'Unknown Device';
  
  if (Platform.OS === 'ios') {
    // You can use react-native-device-info for more detailed info
    deviceName = 'iPhone';
  } else if (Platform.OS === 'android') {
    deviceName = 'Android Device';
  }

  console.log('📱 Device info:', { deviceType, deviceName });

  return {
    deviceType,
    deviceName,
  };
};

/**
 * Get cached FCM token from storage
 * @returns {Promise<string | null>}
 */
export const getCachedFCMToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('fcmToken');
    return token;
  } catch (error) {
    console.error('Error getting cached FCM token:', error);
    return null;
  }
};

/**
 * Check if FCM is properly configured
 * @returns {Promise<boolean>}
 */
export const checkFCMConfiguration = async (): Promise<boolean> => {
  try {
    // Try to get a token - if it fails, FCM is not configured
    const token = await messaging().getToken();
    return !!token;
  } catch (error) {
    console.error('❌ FCM not properly configured:', error);
    return false;
  }
};

/**
 * Show alert if FCM is not configured (dev only)
 */
export const alertIfFCMNotConfigured = async () => {
  if (__DEV__) {
    const isConfigured = await checkFCMConfiguration();
    if (!isConfigured) {
      Alert.alert(
        '⚠️ FCM Not Configured',
        'Push notifications will not work. Please configure Firebase Cloud Messaging.',
        [{ text: 'OK' }]
      );
    }
  }
};

/**
 * Initialize FCM on app launch
 * Call this in your App.tsx useEffect
 */
export const initializeFCM = async () => {
  try {
    console.log('🔥 Initializing FCM...');

    // Request permission
    const hasPermission = await requestNotificationPermission();
    
    if (hasPermission) {
      // Get token
      const token = await getFCMToken();
      
      if (token) {
        console.log('✅ FCM initialized successfully');
        return token;
      }
    }

    console.log('⚠️ FCM initialization completed but no token available');
    return null;
  } catch (error) {
    console.error('❌ FCM initialization error:', error);
    return null;
  }
};

/**
 * Listen for FCM token refresh
 * Call this in your App.tsx useEffect
 * @param callback - Function to call when token refreshes
 */
export const onFCMTokenRefresh = (callback: (token: string) => void) => {
  return messaging().onTokenRefresh(async (token) => {
    console.log('🔄 FCM Token refreshed:', token.substring(0, 30) + '...');
    
    // Save new token
    await AsyncStorage.setItem('fcmToken', token);
    
    // Call callback (e.g., to send to backend)
    callback(token);
  });
};

/**
 * Handle foreground notifications
 * Shows alert when notification received while app is open
 */
export const onForegroundNotification = () => {
  return messaging().onMessage(async (remoteMessage) => {
    console.log('📬 Notification received (foreground):', remoteMessage);

    // Show local notification or alert
    if (remoteMessage.notification) {
      Alert.alert(
        remoteMessage.notification.title || 'New Notification',
        remoteMessage.notification.body || '',
        [{ text: 'OK' }]
      );
    }
  });
};

/**
 * Get notification that opened the app (from killed state)
 */
export const getInitialNotification = async () => {
  const remoteMessage = await messaging().getInitialNotification();
  
  if (remoteMessage) {
    console.log('📬 App opened from notification:', remoteMessage);
    return remoteMessage;
  }
  
  return null;
};

/**
 * Handle notification tap (from background)
 */
export const onNotificationTap = (callback: (remoteMessage: any) => void) => {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('📬 App opened from notification (background):', remoteMessage);
    callback(remoteMessage);
  });
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