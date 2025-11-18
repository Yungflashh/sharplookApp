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
  console.log('✅ API Response:', {
    status: response.status,
    statusText: response.statusText,
    url: response.config.url,
    data: response.data
  });
  return response;
}, async (error: AxiosError) => {
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
  updatePreferences: async (preferences: {
    notificationsEnabled?: boolean;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    bookingUpdates?: boolean;
    newMessages?: boolean;
    paymentAlerts?: boolean;
    reminderNotifications?: boolean;
    promotions?: boolean;
    darkMode?: boolean;
    fingerprintEnabled?: boolean;
  }) => {
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
    const response = await api.get('users/vendors', {
      params
    });
    return response.data;
  },
  getVendorProfile: async (vendorId: string) => {
    const response = await api.get(`/vendors/${vendorId}/profile`);
    return response.data;
  },
  getVendorDetail: async (vendorId: string, options?: {
    includeServices?: boolean;
    includeReviews?: boolean;
    reviewsLimit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.includeServices !== undefined) {
      params.append('includeServices', String(options.includeServices));
    }
    if (options?.includeReviews !== undefined) {
      params.append('includeReviews', String(options.includeReviews));
    }
    if (options?.reviewsLimit) {
      params.append('reviewsLimit', String(options.reviewsLimit));
    }
    const queryString = params.toString();
    const url = queryString ? `/users/vendors/${vendorId}?${queryString}` : `/users/vendors/${vendorId}`;
    const response = await api.get(url);
    return response.data;
  },
  getVendorServices: async (vendorId: string, page: number = 1) => {
    const response = await api.get(`/users/vendors/${vendorId}/services`, {
      params: {
        page,
        limit: 10
      }
    });
    return response.data;
  },
  getVendorReviews: async (vendorId: string, page: number = 1) => {
    const response = await api.get(`/users/vendors/${vendorId}/reviews`, {
      params: {
        page,
        limit: 10
      }
    });
    return response.data;
  },
  getVendorAvailability: async (vendorId: string, date?: string) => {
    const response = await api.get(`/users/vendors/${vendorId}/availability`, {
      params: date ? {
        date
      } : {}
    });
    return response.data;
  },
  getVendorStats: async (vendorId: string) => {
    const response = await api.get(`/users/vendors/${vendorId}/stats`);
    return response.data;
  }
};
export const disputeAPI = {
  createDispute: async (disputeData: {
    bookingId: string;
    reason: string;
    description: string;
    category: string;
    evidence?: {
      type: string;
      content: string;
    }[];
  }) => {
    const response = await api.post('/disputes', disputeData);
    return response.data;
  },
  getMyDisputes: async (params?: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/disputes/my-disputes', {
      params
    });
    return response.data;
  },
  getDisputeById: async (disputeId: string) => {
    const response = await api.get(`/disputes/${disputeId}`);
    return response.data;
  },
  addEvidence: async (disputeId: string, evidence: {
    type: string;
    content: string;
  }[]) => {
    const response = await api.post(`/disputes/${disputeId}/evidence`, {
      evidence
    });
    return response.data;
  },
  addMessage: async (disputeId: string, message: string, attachments?: string[]) => {
    const response = await api.post(`/disputes/${disputeId}/messages`, {
      message,
      attachments
    });
    return response.data;
  },
  getAllDisputes: async (params?: {
    status?: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/disputes', {
      params
    });
    return response.data;
  },
  getDisputeStats: async () => {
    const response = await api.get('/disputes/stats');
    return response.data;
  },
  assignDispute: async (disputeId: string, assignToId: string) => {
    const response = await api.post(`/disputes/${disputeId}/assign`, {
      assignToId
    });
    return response.data;
  },
  updatePriority: async (disputeId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const response = await api.put(`/disputes/${disputeId}/priority`, {
      priority
    });
    return response.data;
  },
  resolveDispute: async (disputeId: string, resolutionData: {
    resolution: 'refund_client' | 'pay_vendor' | 'partial_refund' | 'no_action';
    resolutionDetails: string;
    refundAmount?: number;
    vendorPaymentAmount?: number;
  }) => {
    const response = await api.post(`/disputes/${disputeId}/resolve`, resolutionData);
    return response.data;
  },
  closeDispute: async (disputeId: string) => {
    const response = await api.post(`/disputes/${disputeId}/close`);
    return response.data;
  }
};
export const reviewAPI = {
  createReview: async (reviewData: {
    bookingId: string;
    rating: number;
    title?: string;
    comment: string;
    detailedRatings?: {
      quality?: number;
      punctuality?: number;
      communication?: number;
      value?: number;
    };
    images?: string[];
  }) => {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },
  getMyReviews: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/reviews/my-reviews', {
      params
    });
    return response.data;
  },
  getReviewsForUser: async (userId: string, params?: {
    rating?: number;
    minRating?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get(`/reviews/user/${userId}`, {
      params
    });
    return response.data;
  },
  getServiceReviews: async (serviceId: string, params?: {
    rating?: number;
    minRating?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get(`/reviews/service/${serviceId}`, {
      params
    });
    return response.data;
  },
  getReviewById: async (reviewId: string) => {
    const response = await api.get(`/reviews/${reviewId}`);
    return response.data;
  },
  respondToReview: async (reviewId: string, comment: string) => {
    const response = await api.post(`/reviews/${reviewId}/respond`, {
      comment
    });
    return response.data;
  },
  voteHelpful: async (reviewId: string, isHelpful: boolean) => {
    const response = await api.post(`/reviews/${reviewId}/vote`, {
      isHelpful
    });
    return response.data;
  },
  flagReview: async (reviewId: string, reason: string) => {
    const response = await api.post(`/reviews/${reviewId}/flag`, {
      reason
    });
    return response.data;
  },
  getReviewStats: async (userId: string) => {
    const response = await api.get(`/reviews/user/${userId}/stats`);
    return response.data;
  },
  getAllReviews: async (params?: {
    isFlagged?: boolean;
    isApproved?: boolean;
    rating?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/reviews', {
      params
    });
    return response.data;
  },
  approveReview: async (reviewId: string) => {
    const response = await api.post(`/reviews/${reviewId}/approve`);
    return response.data;
  },
  hideReview: async (reviewId: string, reason: string) => {
    const response = await api.post(`/reviews/${reviewId}/hide`, {
      reason
    });
    return response.data;
  },
  unhideReview: async (reviewId: string) => {
    const response = await api.post(`/reviews/${reviewId}/unhide`);
    return response.data;
  }
};
export const bookingAPI = {
  createBooking: async (bookingData: {
    service: string;
    scheduledDate: string;
    scheduledTime?: string;
    location?: {
      address: string;
      city: string;
      state: string;
      coordinates: [number, number];
    };
    clientNotes?: string;
  }) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },
  getBookingById: async (bookingId: string) => {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  },
  getMyBookings: async (params?: {
    role?: 'client' | 'vendor';
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/bookings/my-bookings', {
      params
    });
    return response.data;
  },
  acceptBooking: async (bookingId: string) => {
    const response = await api.post(`/bookings/${bookingId}/accept`);
    return response.data;
  },
  rejectBooking: async (bookingId: string, reason?: string) => {
    const response = await api.post(`/bookings/${bookingId}/reject`, {
      reason
    });
    return response.data;
  },
  startBooking: async (bookingId: string) => {
    const response = await api.post(`/bookings/${bookingId}/start`);
    return response.data;
  },
  markComplete: async (bookingId: string) => {
    const response = await api.post(`/bookings/${bookingId}/complete`);
    return response.data;
  },
  cancelBooking: async (bookingId: string, reason?: string) => {
    const response = await api.post(`/bookings/${bookingId}/cancel`, {
      reason
    });
    return response.data;
  },
  updateBooking: async (bookingId: string, updates: {
    clientNotes?: string;
    vendorNotes?: string;
  }) => {
    const response = await api.put(`/bookings/${bookingId}`, updates);
    return response.data;
  },
  getBookingStats: async (role: 'client' | 'vendor' = 'client') => {
    const response = await api.get('/bookings/stats', {
      params: {
        role
      }
    });
    return response.data;
  },
  createOffer: async (offerData: {
    category: string;
    serviceDescription: string;
    preferredDate: string;
    preferredTime?: string;
    budgetRange: {
      min: number;
      max: number;
    };
    location: {
      address: string;
      city: string;
      state: string;
      coordinates: [number, number];
    };
    images?: string[];
    notes?: string;
  }) => {
    const response = await api.post('/bookings/offers', offerData);
    return response.data;
  },
  getAvailableOffers: async (params?: {
    category?: string;
    priceMin?: number;
    priceMax?: number;
    latitude?: number;
    longitude?: number;
    maxDistance?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/bookings/offers/available', {
      params
    });
    return response.data;
  },
  getMyOffers: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/bookings/offers/my-offers', {
      params
    });
    return response.data;
  },
  getMyResponses: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/bookings/offers/my-responses', {
      params
    });
    return response.data;
  },
  getOfferById: async (offerId: string) => {
    const response = await api.get(`/bookings/offers/${offerId}`);
    return response.data;
  },
  respondToOffer: async (offerId: string, responseData: {
    proposedPrice: number;
    message?: string;
    estimatedDuration?: number;
  }) => {
    const response = await api.post(`/bookings/offers/${offerId}/respond`, responseData);
    return response.data;
  },
  counterOffer: async (offerId: string, responseId: string, counterPrice: number) => {
    const response = await api.post(`/bookings/offers/${offerId}/responses/${responseId}/counter`, {
      counterPrice
    });
    return response.data;
  },
  acceptResponse: async (offerId: string, responseId: string) => {
    const response = await api.post(`/bookings/offers/${offerId}/responses/${responseId}/accept`);
    return response.data;
  },
  closeOffer: async (offerId: string) => {
    const response = await api.post(`/bookings/offers/${offerId}/close`);
    return response.data;
  }
};
export const paymentAPI = {
  initializePayment: async (paymentData: {
    bookingId: string;
    metadata?: any;
  }) => {
    const response = await api.post('/payments/initialize', paymentData);
    return response.data;
  },
  verifyPayment: async (reference: string) => {
    const response = await api.get(`/payments/verify/${reference}`);
    return response.data;
  },
  getPaymentById: async (paymentId: string) => {
    const response = await api.get(`/payments/${paymentId}`);
    return response.data;
  },
  getMyPayments: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/payments/my-payments', {
      params
    });
    return response.data;
  }
};
export const walletAPI = {
  getBalance: async () => {
    const response = await api.get('/wallet/balance');
    return response.data;
  },
  getTransactions: async (params?: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/wallet/transactions', {
      params
    });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/wallet/stats');
    return response.data;
  },
  requestWithdrawal: async (withdrawalData: {
    amount: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    narration?: string;
  }) => {
    const response = await api.post('/wallet/withdraw', withdrawalData);
    return response.data;
  },
  getMyWithdrawals: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/wallet/withdrawals/my-withdrawals', {
      params
    });
    return response.data;
  },
  getWithdrawalById: async (withdrawalId: string) => {
    const response = await api.get(`/wallet/withdrawals/${withdrawalId}`);
    return response.data;
  }
};
export const servicesAPI = {
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
  }, images?: any[]) => {
    console.log('🔵 [START] createService called');
    console.log('📦 Service Data:', serviceData);
    console.log('🖼️ Images array:', images);
    console.log('🖼️ Images length:', images?.length);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      console.log('🔑 Token retrieved:', token ? 'Yes' : 'No');
      if (!images || images.length === 0) {
        console.log('📤 No images - using JSON request');
        const response = await api.post('/services', serviceData);
        console.log('✅ JSON response:', response.data);
        return response.data;
      }
      console.log('🖼️ Images detected - using FormData');
      console.log('🔍 Creating FormData instance...');
      const formData = new FormData();
      console.log('✅ FormData created');
      console.log('📝 Appending name:', serviceData.name);
      formData.append('name', serviceData.name);
      console.log('📝 Appending description:', serviceData.description);
      formData.append('description', serviceData.description);
      console.log('📝 Appending category:', serviceData.category);
      formData.append('category', serviceData.category);
      console.log('📝 Appending basePrice:', serviceData.basePrice);
      formData.append('basePrice', String(serviceData.basePrice));
      console.log('📝 Appending priceType:', serviceData.priceType);
      formData.append('priceType', serviceData.priceType);
      console.log('📝 Appending currency:', serviceData.currency);
      formData.append('currency', serviceData.currency);
      console.log('📝 Appending duration:', serviceData.duration);
      formData.append('duration', String(serviceData.duration));
      console.log('📝 Appending serviceArea:', serviceData.serviceArea);
      formData.append('serviceArea', JSON.stringify(serviceData.serviceArea));
      console.log('✅ All text fields appended');
      console.log('🖼️ Starting image append loop...');
      console.log('🖼️ Images to process:', images.length);
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          console.log(`\n📸 Processing image ${i + 1}/${images.length}`);
          const image = images[i];
          console.log('📸 Image object:', image);
          console.log('📸 Image URI:', image.uri);
          console.log('📸 Image type:', image.type);
          console.log('📸 Image name:', image.name);
          if (image.uri && !image.uri.startsWith('http')) {
            console.log(`📸 Appending image ${i + 1} to FormData...`);
            try {
              formData.append('images', {
                uri: image.uri,
                type: image.type || 'image/jpeg',
                name: image.name || `image_${i}.jpg`
              } as any);
              console.log(`✅ Image ${i + 1} appended successfully`);
            } catch (appendError) {
              console.error(`❌ Error appending image ${i + 1}:`, appendError);
              throw appendError;
            }
          } else {
            console.log(`⏭️ Skipping image ${i + 1} (existing URL)`);
          }
        }
      }
      console.log('✅ All images processed');
      console.log('🌐 Preparing fetch request...');
      console.log('🌐 URL:', `${API_BASE_URL}/services`);
      console.log('🌐 Method: POST');
      console.log('🌐 Headers:', {
        'Authorization': token ? 'Bearer ***' : 'None',
        'Content-Type': 'multipart/form-data'
      });
      console.log('🚀 Sending fetch request...');
      const response = await fetch(`${API_BASE_URL}/services`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });
      console.log('📥 Response received');
      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);
      const result = await response.json();
      console.log('📥 Response data:', result);
      if (!response.ok) {
        console.error('❌ Response not OK:', result);
        throw new Error(result.message || 'Failed to create service');
      }
      console.log('✅ Service created successfully');
      return result;
    } catch (error) {
      console.error('❌❌❌ ERROR CAUGHT ❌❌❌');
      console.error('Error type:', typeof error);
      console.error('Error name:', (error as any)?.name);
      console.error('Error message:', (error as any)?.message);
      console.error('Error stack:', (error as any)?.stack);
      console.error('Full error object:', error);
      throw error;
    }
  },
  updateService: async (serviceId: string, serviceData: any, images?: any[]) => {
    console.log('🔵 [START] updateService called');
    console.log('🆔 Service ID:', serviceId);
    console.log('📦 Service Data:', serviceData);
    console.log('🖼️ Images:', images);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!images || images.length === 0) {
        console.log('📤 No new images - using JSON request');
        const response = await api.put(`/services/${serviceId}`, serviceData);
        return response.data;
      }
      console.log('🖼️ New images detected - using FormData');
      const formData = new FormData();
      console.log('📝 Appending service data fields...');
      const keys = Object.keys(serviceData);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = serviceData[key];
        console.log(`📝 Field ${i + 1}: ${key} =`, value);
        if (key === 'serviceArea' && typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'images') {
          const existingUrls: string[] = [];
          for (let j = 0; j < value.length; j++) {
            const img = value[j];
            if (typeof img === 'string' && img.startsWith('http')) {
              existingUrls.push(img);
            }
          }
          if (existingUrls.length > 0) {
            console.log('📝 Existing images:', existingUrls);
            formData.append('existingImages', JSON.stringify(existingUrls));
          }
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }
      console.log('🖼️ Appending new images...');
      for (let i = 0; i < images.length; i++) {
        console.log(`📸 Processing new image ${i + 1}/${images.length}`);
        const image = images[i];
        console.log('📸 Image:', image);
        if (image.uri && !image.uri.startsWith('http')) {
          try {
            formData.append('images', {
              uri: image.uri,
              type: image.type || 'image/jpeg',
              name: image.name || `image_${i}.jpg`
            } as any);
            console.log(`✅ Image ${i + 1} appended`);
          } catch (appendError) {
            console.error(`❌ Error appending image ${i + 1}:`, appendError);
            throw appendError;
          }
        }
      }
      console.log('🚀 Sending update request...');
      const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });
      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response data:', result);
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update service');
      }
      return result;
    } catch (error) {
      console.error('❌ Update service error:', error);
      console.error('Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        stack: (error as any)?.stack
      });
      throw error;
    }
  },
  getMyServices: async () => {
    const response = await api.get('/services/vendor/my-services');
    return response.data;
  },
  getServiceById: async (serviceId: string) => {
    const response = await api.get(`/services/${serviceId}`);
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
  }
};
export const offerAPI = {
  createOffer: async (offerData: {
    title: string;
    description: string;
    category: string;
    service?: string;
    proposedPrice: number;
    location: {
      address: string;
      city: string;
      state: string;
      coordinates: [number, number];
    };
    preferredDate?: string;
    preferredTime?: string;
    flexibility?: 'flexible' | 'specific' | 'urgent';
    expiresInDays?: number;
  }, images?: any[]) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!images || images.length === 0) {
        const response = await api.post('/offers', offerData);
        return response.data;
      }
      const formData = new FormData();
      formData.append('title', offerData.title);
      formData.append('description', offerData.description);
      formData.append('category', offerData.category);
      if (offerData.service) formData.append('service', offerData.service);
      formData.append('proposedPrice', String(offerData.proposedPrice));
      formData.append('location', JSON.stringify(offerData.location));
      if (offerData.preferredDate) formData.append('preferredDate', offerData.preferredDate);
      if (offerData.preferredTime) formData.append('preferredTime', offerData.preferredTime);
      if (offerData.flexibility) formData.append('flexibility', offerData.flexibility);
      if (offerData.expiresInDays) formData.append('expiresInDays', String(offerData.expiresInDays));
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (image.uri) {
          formData.append('images', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.name || `offer_image_${i}.jpg`
          } as any);
        }
      }
      const response = await fetch(`${API_BASE_URL}/offers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      return result;
    } catch (error) {
      console.error('Create offer error:', error);
      throw error;
    }
  },
  getMyOffers: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/offers/my-offers', {
      params
    });
    return response.data;
  },
  getAvailableOffers: async (params?: {
    category?: string;
    priceMin?: number;
    priceMax?: number;
    latitude?: number;
    longitude?: number;
    maxDistance?: number;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/offers/available/list', {
      params
    });
    return response.data;
  },
  getOfferById: async (offerId: string) => {
    const response = await api.get(`/offers/${offerId}`);
    return response.data;
  },
  respondToOffer: async (offerId: string, responseData: {
    proposedPrice: number;
    message?: string;
    estimatedDuration?: number;
  }) => {
    const response = await api.post(`/offers/${offerId}/respond`, responseData);
    return response.data;
  },
  counterOffer: async (offerId: string, responseId: string, counterPrice: number) => {
    const response = await api.post(`/offers/${offerId}/responses/${responseId}/counter`, {
      counterPrice
    });
    return response.data;
  },
  acceptResponse: async (offerId: string, responseId: string) => {
    const response = await api.post(`/offers/${offerId}/responses/${responseId}/accept`);
    return response.data;
  },
  closeOffer: async (offerId: string) => {
    const response = await api.post(`/offers/${offerId}/close`);
    return response.data;
  },
  getMyResponses: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/offers/responses/my-responses', {
      params
    });
    return response.data;
  },
  acceptCounterOffer: async (offerId: string, responseId: string) => {
    try {
      const response = await api.post(`/offers/${offerId}/responses/${responseId}/accept-counter`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  vendorCounterOffer: async (offerId: string, responseId: string, proposedPrice: number) => {
    try {
      const response = await api.post(`/offers/${offerId}/responses/${responseId}/vendor-counter`, {
        proposedPrice
      });
      return response.data;
    } catch (error) {
      throw error;
    }
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
export const notificationAPI = {
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    isRead?: boolean;
  }) => {
    const response = await api.get('/notifications', {
      params
    });
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },
  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
  clearAllNotifications: async () => {
    const response = await api.delete('/notifications');
    return response.data;
  },
  getNotificationSettings: async () => {
    const response = await api.get('/notifications/settings');
    return response.data;
  },
  updateNotificationSettings: async (settings: {
    notificationsEnabled?: boolean;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    bookingUpdates?: boolean;
    newMessages?: boolean;
    paymentAlerts?: boolean;
    reminderNotifications?: boolean;
    promotions?: boolean;
  }) => {
    const response = await api.put('/notifications/settings', settings);
    return response.data;
  },
  registerDeviceToken: async (data: {
    token: string;
    deviceType: 'ios' | 'android' | 'web';
    deviceName?: string;
  }) => {
    const response = await api.post('/notifications/register-device', data);
    return response.data;
  },
  unregisterDeviceToken: async (token: string) => {
    const response = await api.post('/notifications/unregister-device', {
      token
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