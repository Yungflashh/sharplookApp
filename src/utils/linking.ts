import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation.types';

// Create a navigation ref that can be used outside of components
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Helper function to navigate using the ref
export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    // If navigation isn't ready yet, wait and retry
    setTimeout(() => navigate(name, params), 100);
  }
}

export const linking = {
  prefixes: ['LookReal://', 'https://lookreal.beauty', 'https://*.lookreal.beauty'],
  config: {
    screens: {
      Splash: 'splash',
      Onboarding: 'onboarding',
      Auth: {
        path: 'auth',
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          VendorLogin: 'vendor-login',
          VendorProfileSetup: 'vendor-setup'
        }
      },
      Main: {
        path: 'app',
        screens: {
          Home: 'home',
          Bookings: 'bookings',
          Explore: 'explore',
          Profile: 'profile',
          Dashboard: 'dashboard',
          Services: 'services'
        }
      },
      AllVendors: 'vendors',
      VendorDetail: {
        path: 'vendors/:vendorId',
        parse: {
          vendorId: (vendorId: string) => vendorId
        }
      },
      CreateBooking: {
        path: 'book/:serviceId',
        parse: {
          serviceId: (serviceId: string) => serviceId
        }
      },
      BookingDetail: {
        path: 'bookings/:bookingId',
        parse: {
          bookingId: (bookingId: string) => bookingId
        }
      },
      Payment: {
        path: 'bookings/:bookingId/payment',
        parse: {
          bookingId: (bookingId: string) => bookingId
        }
      },
      ChatDetail: {
        path: 'chat/:vendorId',
        parse: {
          vendorId: (vendorId: string) => vendorId
        }
      },
      Message: 'messages',
      Notification: 'notifications',
      Chat: 'chats',
      Cart: 'cart',
      SharedContent: {
        path: 'share/:type/:id',
        parse: {
          type: (type: string) => type,
          id: (id: string) => id
        }
      }
    }
  }
};

export const useDeepLinking = () => {
  // REMOVED: const navigation = useNavigation(); - This was causing the crash!
  // Now using navigationRef instead

  useEffect(() => {
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('Initial URL:', initialUrl);
        handleDeepLink(initialUrl);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link URL:', url);
      handleDeepLink(url);
    });

    getInitialURL();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    console.log('Handling deep link:', url);
    const { hostname, path, queryParams } = Linking.parse(url);
    console.log('Parsed:', { hostname, path, queryParams });

    // Payment verification - let the app handle naturally
    if (path?.includes('payment/verify') || path?.includes('payment') || queryParams?.reference) {
      console.log('Payment verification callback detected');
      return;
    }

    // Shared vendor profile: /share/vendor/:id
    if (path?.includes('share/vendor/')) {
      const vendorId = path.split('share/vendor/')[1]?.split('/')[0];
      if (vendorId) {
        navigate('VendorDetail', { vendorId });
      }
      return;
    }

    // Shared product: /share/product/:id
    if (path?.includes('share/product/')) {
      const productId = path.split('share/product/')[1]?.split('/')[0];
      if (productId) {
        navigate('ProductDetail', { productId });
      }
      return;
    }

    // Booking detail
    if (path?.includes('bookings/') && !path?.includes('payment')) {
      const bookingId = path.split('bookings/')[1]?.split('/')[0];
      if (bookingId) {
        navigate('BookingDetail', { bookingId });
      }
      return;
    }

    // Vendor detail
    if (path?.includes('vendors/')) {
      const vendorId = path.split('vendors/')[1]?.split('/')[0];
      if (vendorId) {
        navigate('VendorDetail', { vendorId });
      }
      return;
    }

    // Chat detail
    if (path?.includes('chat/')) {
      const vendorId = path.split('chat/')[1]?.split('/')[0];
      if (vendorId) {
        navigate('ChatDetail', { vendorId, vendorName: 'Vendor' });
      }
      return;
    }
  };
};