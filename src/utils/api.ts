import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const API_BASE_URL = 'https://sharplook-be.onrender.com/api/v1';
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error: AxiosError) => {
  return Promise.reject(error);
});
api.interceptors.response.use(response => response, async (error: AxiosError) => {
  const originalRequest = error.config as InternalAxiosRequestConfig & {
    _retry?: boolean;
  };
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });
        const {
          accessToken
        } = response.data.data;
        await AsyncStorage.setItem('accessToken', accessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      }
    } catch (refreshError) {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData', 'isAuthenticated']);
      return Promise.reject(refreshError);
    }
  }
  return Promise.reject(error);
});
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', {
      email,
      password
    });
    return response.data;
  },
  register: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    isVendor?: boolean;
    referralId?: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', {
      email
    });
    return response.data;
  },
  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword
    });
    return response.data;
  },
  verifyEmail: async (token: string) => {
    const response = await api.post('/auth/verify-email', {
      token
    });
    return response.data;
  },
  verifyPhone: async (code: string) => {
    const response = await api.post('/auth/verify-phone', {
      code
    });
    return response.data;
  },
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', {
      refreshToken
    });
    return response.data;
  }
};
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  updateProfile: async (userData: any) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },
  updatePreferences: async (preferences: any) => {
    const response = await api.put('/users/preferences', preferences);
    return response.data;
  },
  deleteAccount: async () => {
    const response = await api.delete('/users/account');
    return response.data;
  }
};
export const vendorAPI = {
  getProfile: async () => {
    const response = await api.get('/vendors/profile');
    return response.data;
  },
  updateProfile: async (vendorData: any) => {
    const response = await api.put('/vendors/profile', vendorData);
    return response.data;
  },
  updateAvailability: async (schedule: any) => {
    const response = await api.put('/vendors/availability', schedule);
    return response.data;
  },
  uploadDocument: async (documentData: FormData) => {
    const response = await api.post('/vendors/documents', documentData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  getBookings: async () => {
    const response = await api.get('/vendors/bookings');
    return response.data;
  }
};
export const bookingAPI = {
  create: async (bookingData: any) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/bookings');
    return response.data;
  },
  getById: async (bookingId: string) => {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  },
  update: async (bookingId: string, updateData: any) => {
    const response = await api.put(`/bookings/${bookingId}`, updateData);
    return response.data;
  },
  cancel: async (bookingId: string) => {
    const response = await api.post(`/bookings/${bookingId}/cancel`);
    return response.data;
  },
  complete: async (bookingId: string) => {
    const response = await api.post(`/bookings/${bookingId}/complete`);
    return response.data;
  }
};
export const walletAPI = {
  getBalance: async () => {
    const response = await api.get('/wallet/balance');
    return response.data;
  },
  getTransactions: async () => {
    const response = await api.get('/wallet/transactions');
    return response.data;
  },
  addFunds: async (amount: number, paymentMethod: string) => {
    const response = await api.post('/wallet/add-funds', {
      amount,
      paymentMethod
    });
    return response.data;
  },
  withdraw: async (amount: number, accountDetails: any) => {
    const response = await api.post('/wallet/withdraw', {
      amount,
      accountDetails
    });
    return response.data;
  }
};
export const handleAPIError = (error: any) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    if (axiosError.response) {
      return {
        message: axiosError.response.data?.message || 'An error occurred',
        status: axiosError.response.status,
        data: axiosError.response.data
      };
    } else if (axiosError.request) {
      return {
        message: 'Network error. Please check your connection.',
        status: 0
      };
    }
  }
  return {
    message: error.message || 'An unexpected error occurred',
    status: 500
  };
};
export default api;