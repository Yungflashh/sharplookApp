import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, handleAPIError } from '@/api/api';
import { getFCMToken, getDeviceInfo } from './fcm'; // ✅ NEW IMPORT

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isVendor: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  walletBalance: number;
  [key: string]: any;
}

interface LoginResponse {
  success: boolean;
  message: string;
  timestamp: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

interface AuthResult {
  success: boolean;
  isVendor?: boolean;
  user?: User;
  error?: string;
}

/**
 * Login user with FCM token registration
 * ✅ UPDATED: Now includes automatic FCM token registration for push notifications
 */
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // ✅ STEP 1: Get FCM token (non-blocking - won't fail login if unavailable)
    let fcmToken: string | null = null;
    let deviceType: 'ios' | 'android' | 'web' = 'android';
    let deviceName: string = 'Unknown Device';

    try {
      const deviceInfo = getDeviceInfo();
      deviceType = deviceInfo.deviceType;
      deviceName = deviceInfo.deviceName;

      // Only use cached FCM token — NEVER await a fresh fetch here.
      // Notifications.getExpoPushTokenAsync has no timeout and can hang forever
      // on flaky networks, which would spin the login loader indefinitely.
      fcmToken = await AsyncStorage.getItem('cachedFcmToken');
      if (!fcmToken) {
        // Fire-and-forget: fetch in background so the NEXT login has it cached,
        // and RootNavigator will register it with the backend after login.
        getFCMToken().then((token) => {
          if (token) {
            AsyncStorage.setItem('cachedFcmToken', token).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (fcmError) {
      // Don't fail login if FCM fails
      console.error('⚠️ FCM error (continuing with login):', fcmError);
    }

    // ✅ STEP 2: Login with FCM token
    console.log('🔐 Authenticating with backend...');
    console.log('📱 Device info:', { deviceType, deviceName, hasFcmToken: !!fcmToken });

    const response: LoginResponse = await authAPI.login(
      email,
      password,
      fcmToken || undefined,  // ✅ Send FCM token
      deviceType,             // ✅ Send device type
      deviceName              // ✅ Send device name
    );

    if (response.success) {
      const {
        user,
        accessToken,
        refreshToken
      } = response.data;

      // Save tokens and user data
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      await AsyncStorage.setItem('isAuthenticated', 'true');
      await updateLastActive();

      const isVendor = user.isVendor === true;

      console.log('✅ Login successful:', {
        userId: user._id,
        email: user.email,
        isVendor: isVendor,
        role: user.role,
        fcmTokenRegistered: !!fcmToken, // ✅ Log FCM registration status
      });

      return {
        success: true,
        isVendor: isVendor,
        user
      };
    } else {
      console.error('❌ Login Failed:', {
        message: response.message || 'Login failed',
        response: response
      });
      return {
        success: false,
        error: response.message || 'Login failed'
      };
    }
  } catch (error: any) {
    console.error('❌ Login Error:', error);
    console.error('❌ Login Error Response:', error?.response);
    console.error('❌ Login Error Data:', error?.response?.data);
    console.error('❌ Login Error Status:', error?.response?.status);
    console.error('❌ Login Error Headers:', error?.response?.headers);

    const apiError = handleAPIError(error);
    console.error('❌ Login API Error (Processed):', {
      message: apiError.message,
      status: apiError.status,
      data: apiError.data,
      isNetworkError: apiError.isNetworkError,
      fieldErrors: apiError.fieldErrors,
      isValidationError: apiError.isValidationError
    });

    return {
      success: false,
      error: apiError.message
    };
  }
};

/**
 * Register user
 * Note: Can also be updated to include FCM token if needed in the future
 */
export const registerUser = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResult> => {
  try {
    const response = await authAPI.register(userData);

    if (response.success) {
      if (response.data.accessToken) {
        const {
          user,
          accessToken,
          refreshToken
        } = response.data;

        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        await AsyncStorage.setItem('isAuthenticated', 'true');

        return {
          success: true,
          isVendor: user.isVendor || false,
          user
        };
      }

      return {
        success: true
      };
    } else {
      console.error('❌ Registration Failed:', {
        message: response.message || 'Registration failed',
        response: response
      });
      return {
        success: false,
        error: response.message || 'Registration failed'
      };
    }
  } catch (error: any) {
    console.error('❌ Registration Error:', error);
    console.error('❌ Registration Error Response:', error?.response);
    console.error('❌ Registration Error Data:', error?.response?.data);
    console.error('❌ Registration Error Status:', error?.response?.status);
    console.error('❌ Registration Error Headers:', error?.response?.headers);

    const apiError = handleAPIError(error);
    console.error('❌ Registration API Error (Processed):', {
      message: apiError.message,
      status: apiError.status,
      data: apiError.data,
      isNetworkError: apiError.isNetworkError,
      fieldErrors: apiError.fieldErrors,
      isValidationError: apiError.isValidationError
    });

    return {
      success: false,
      error: apiError.message
    };
  }
};

/**
 * Logout user
 */
export const logoutUser = async (): Promise<AuthResult> => {
  try {
    await authAPI.logout();
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData', 'isAuthenticated', 'emailVerificationPending']);

    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Logout Error:', error);

    // Clear local storage even if API fails
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData', 'isAuthenticated', 'emailVerificationPending']);

    const apiError = handleAPIError(error);
    console.error('❌ Logout API Error:', {
      message: apiError.message,
      isNetworkError: apiError.isNetworkError
    });

    return {
      success: true,
      error: apiError.message
    };
  }
};

/**
 * Save tokens after registration but gate app entry behind email verification.
 * RootNavigator stays on Auth stack until confirmEmailVerification() is called.
 */
export const saveRegistrationAuth = async (
  accessToken: string,
  refreshToken: string,
  user: User
): Promise<void> => {
  await AsyncStorage.multiSet([
    ['accessToken', accessToken],
    ['refreshToken', refreshToken],
    ['userData', JSON.stringify(user)],
    ['emailVerificationPending', 'true'],
  ]);
};

/**
 * Called after OTP is confirmed — lifts the pending gate so RootNavigator
 * switches to Main on its next poll cycle.
 */
export const confirmEmailVerification = async (): Promise<void> => {
  await AsyncStorage.removeItem('emailVerificationPending');
};

/**
 * Check authentication status
 */
export const checkAuthStatus = async (): Promise<{
  isAuthenticated: boolean;
  isVendor: boolean;
  user: User | null;
}> => {
  try {
    const [accessToken, userData, pendingVerification] = await AsyncStorage.multiGet([
      'accessToken',
      'userData',
      'emailVerificationPending',
    ]);

    if (accessToken[1] && userData[1] && !pendingVerification[1]) {
      const user: User = JSON.parse(userData[1]);
      return {
        isAuthenticated: true,
        isVendor: user.isVendor || false,
        user
      };
    }

    return {
      isAuthenticated: false,
      isVendor: false,
      user: null
    };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return {
      isAuthenticated: false,
      isVendor: false,
      user: null
    };
  }
};

/**
 * Complete onboarding
 */
export const completeOnboarding = async (): Promise<{
  success: boolean;
}> => {
  try {
    await AsyncStorage.setItem('onboardingComplete', 'true');
    return {
      success: true
    };
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return {
      success: false
    };
  }
};

/**
 * Check onboarding status
 */
export const checkOnboardingStatus = async (): Promise<boolean> => {
  if (__DEV__) return false; // always show onboarding during development
  try {
    const status = await AsyncStorage.getItem('onboardingComplete');
    return status === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Update stored user
 */
export const updateStoredUser = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem('userData', JSON.stringify(user));
  } catch (error) {
    console.error('Error updating stored user:', error);
  }
};

/**
 * Get stored user
 */
export const getStoredUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
};

/**
 * Get stored token
 */
export const getStoredToken = async (): Promise<string | null> => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    return accessToken;
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
};

const INACTIVITY_LIMIT_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Record the current timestamp as the last active time.
 * Call this on login and whenever the app comes to foreground.
 */
export const updateLastActive = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('lastActive', Date.now().toString());
  } catch (error) {
    console.error('Error updating last active:', error);
  }
};

/**
 * Check if the user has been inactive for more than 3 days.
 * If so, logs them out and returns true.
 */
export const checkInactivityAndLogout = async (): Promise<boolean> => {
  try {
    const lastActiveStr = await AsyncStorage.getItem('lastActive');
    if (!lastActiveStr) {
      // No record yet — treat as active and set it now
      await updateLastActive();
      return false;
    }
    const elapsed = Date.now() - parseInt(lastActiveStr, 10);
    if (elapsed > INACTIVITY_LIMIT_MS) {
      console.log('🔒 User inactive for 3+ days — logging out');
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData', 'isAuthenticated', 'lastActive']);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking inactivity:', error);
    return false;
  }
};