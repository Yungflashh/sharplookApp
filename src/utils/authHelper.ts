import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, handleAPIError } from '@/utils/api';
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
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const response: LoginResponse = await authAPI.login(email, password);
    if (response.success) {
      const {
        user,
        accessToken,
        refreshToken
      } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      await AsyncStorage.setItem('isAuthenticated', 'true');
      const isVendor = user.isVendor === true;
      console.log('Login successful:', {
        userId: user._id,
        email: user.email,
        isVendor: isVendor,
        role: user.role
      });
      return {
        success: true,
        isVendor: isVendor,
        user
      };
    } else {
      return {
        success: false,
        error: response.message || 'Login failed'
      };
    }
  } catch (error) {
    const apiError = handleAPIError(error);
    return {
      success: false,
      error: apiError.message
    };
  }
};
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
      return {
        success: false,
        error: response.message || 'Registration failed'
      };
    }
  } catch (error) {
    const apiError = handleAPIError(error);
    return {
      success: false,
      error: apiError.message
    };
  }
};
export const logoutUser = async (): Promise<AuthResult> => {
  try {
    await authAPI.logout();
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData', 'isAuthenticated']);
    return {
      success: true
    };
  } catch (error) {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData', 'isAuthenticated']);
    const apiError = handleAPIError(error);
    return {
      success: true,
      error: apiError.message
    };
  }
};
export const checkAuthStatus = async (): Promise<{
  isAuthenticated: boolean;
  isVendor: boolean;
  user: User | null;
}> => {
  try {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const userData = await AsyncStorage.getItem('userData');
    if (accessToken && userData) {
      const user: User = JSON.parse(userData);
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
export const checkOnboardingStatus = async (): Promise<boolean> => {
  try {
    const status = await AsyncStorage.getItem('onboardingComplete');
    return status === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};
export const updateStoredUser = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem('userData', JSON.stringify(user));
  } catch (error) {
    console.error('Error updating stored user:', error);
  }
};
export const getStoredUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
};