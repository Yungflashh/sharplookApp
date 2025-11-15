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

  // Log request details
  console.log('🟢 API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`,
    data: config.data,
    headers: config.headers
  });

  return config;
}, (error: AxiosError) => {
  console.error('🔴 Request Interceptor Error:', error);
  return Promise.reject(error);
});
api.interceptors.response.use(response => {
  // Log successful responses
  console.log('✅ API Response:', {
    status: response.status,
    statusText: response.statusText,
    url: response.config.url,
    data: response.data
  });
  return response;
}, async (error: AxiosError) => {
  // Log the full error details
  console.error('🔴 API Error Interceptor:', {
    message: error.message,
    code: error.code,
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    statusText: error.response?.statusText,
    responseData: error.response?.data,
    requestData: error.config?.data
  });

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
      console.error('🔴 Token Refresh Error:', refreshError);
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
  setupProfile: async (setupData: {
    businessName: string;
    businessDescription: string;
    serviceCategories: string[];
    vendorType: 'home_service' | 'in_shop' | 'both';
    location: {
      coordinates: number[];
      address: string;
    };
  }) => {
    const response = await api.post('/vendors/setup', setupData);
    return response.data;
  },
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
  },
  getTopVendors: async () => {
    const response = await api.get('/users/top-vendors');
    return response.data;
  },
  getAllVendors: async (params?: {
    category?: string;
    location?: string;
    minRating?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/users/allVendors', {
      params
    });
    return response.data;
  },
  getVendorProfile: async (vendorId: string) => {
    const response = await api.get(`/vendors/${vendorId}/profile`);
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
export const servicesAPI = {
  getMyServices: async () => {
    const response = await api.get('/services/my-services');
    return response.data;
  },
  createService: async (serviceData: {
    name: string;
    description: string;
    category: string;
    basePrice: number;
    priceType: 'fixed' | 'variable';
    currency: string;
    duration: number;
    serviceArea: {
      type: string;
      coordinates: number[];
      radius: number;
    };
  }) => {
    const response = await api.post('/services', serviceData);
    return response.data;
  },
  getServiceById: async (serviceId: string) => {
    const response = await api.get(`/services/${serviceId}`);
    return response.data;
  },
  updateService: async (serviceId: string, serviceData: any) => {
    const response = await api.put(`/services/${serviceId}`, serviceData);
    return response.data;
  },
  deleteService: async (serviceId: string) => {
    const response = await api.delete(`/services/${serviceId}`);
    return response.data;
  },
  searchServices: async (params: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: {
      lat: number;
      lng: number;
      radius?: number;
    };
  }) => {
    const response = await api.get('/services/search', {
      params
    });
    return response.data;
  },
  getServiceReviews: async (serviceId: string) => {
    const response = await api.get(`/services/${serviceId}/reviews`);
    return response.data;
  },
  uploadServiceImages: async (serviceId: string, images: any[]) => {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append('images', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: image.fileName || `image_${index}.jpg`
      } as any);
    });
    const response = await api.post(`/services/${serviceId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  deleteServiceImage: async (serviceId: string, imageId: string) => {
    const response = await api.delete(`/services/${serviceId}/images/${imageId}`);
    return response.data;
  }
};
export const categoriesAPI = {
  getActiveCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  getById: async (categoryId: string) => {
    const response = await api.get(`/categories/${categoryId}`);
    return response.data;
  },
  searchCategories: async (query: string) => {
    const response = await api.get('/categories/search', {
      params: {
        query
      }
    });
    return response.data;
  }
};
export interface APIError {
  message: string;
  status: number;
  data?: any;
  fieldErrors?: Record<string, string>;
  isNetworkError?: boolean;
  isValidationError?: boolean;
}
export const handleAPIError = (error: any): APIError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED') {
        return {
          message: 'Request timeout. Please try again.',
          status: 0,
          isNetworkError: true
        };
      }
      return {
        message: 'Network error. Please check your internet connection and try again.',
        status: 0,
        isNetworkError: true
      };
    }
    const {
      status,
      data
    } = axiosError.response;
    if (status === 400 && data?.errors) {
      const fieldErrors: Record<string, string> = {};
      if (Array.isArray(data.errors)) {
        data.errors.forEach((err: any) => {
          if (err.field && err.message) {
            fieldErrors[err.field] = err.message;
          }
        });
      } else if (typeof data.errors === 'object') {
        Object.keys(data.errors).forEach(field => {
          fieldErrors[field] = data.errors[field];
        });
      }
      return {
        message: data.message || 'Please check your input and try again.',
        status,
        data,
        fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
        isValidationError: true
      };
    }
    let message = data?.message || 'An error occurred';
    switch (status) {
      case 401:
        message = data?.message || 'Invalid credentials. Please check your email and password.';
        break;
      case 403:
        message = data?.message || 'Access denied. You do not have permission to perform this action.';
        break;
      case 404:
        message = data?.message || 'Resource not found.';
        break;
      case 409:
        message = data?.message || 'This resource already exists.';
        break;
      case 422:
        message = data?.message || 'Invalid data provided.';
        break;
      case 429:
        message = 'Too many requests. Please try again later.';
        break;
      case 500:
        message = 'Server error. Please try again later.';
        break;
      case 503:
        message = 'Service temporarily unavailable. Please try again later.';
        break;
      default:
        message = data?.message || 'An unexpected error occurred.';
    }
    return {
      message,
      status,
      data
    };
  }
  return {
    message: error?.message || 'An unexpected error occurred',
    status: 500
  };
};
export default api;