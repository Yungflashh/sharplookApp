import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
export const linking = {
  prefixes: ['sharpLook://', 'https://sharpLook.com', 'https://*.sharpLook.com'],
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
      Cart: 'cart'
    }
  }
};
export const useDeepLinking = () => {
  const navigation = useNavigation();
  useEffect(() => {
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('Initial URL:', initialUrl);
        handleDeepLink(initialUrl);
      }
    };
    const subscription = Linking.addEventListener('url', ({
      url
    }) => {
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
    const {
      hostname,
      path,
      queryParams
    } = Linking.parse(url);
    console.log('Parsed:', {
      hostname,
      path,
      queryParams
    });
    if (path?.includes('payment/verify') || path?.includes('payment') || queryParams?.reference) {
      console.log('Payment verification callback detected');
      return;
    }
    if (path?.includes('bookings/') && !path?.includes('payment')) {
      const bookingId = path.split('bookings/')[1]?.split('/')[0];
      if (bookingId) {
        navigation.navigate('BookingDetail' as never, {
          bookingId
        } as never);
      }
      return;
    }
    if (path?.includes('vendors/')) {
      const vendorId = path.split('vendors/')[1]?.split('/')[0];
      if (vendorId) {
        navigation.navigate('VendorDetail' as never, {
          vendorId
        } as never);
      }
      return;
    }
    if (path?.includes('chat/')) {
      const vendorId = path.split('chat/')[1]?.split('/')[0];
      if (vendorId) {
        navigation.navigate('ChatDetail' as never, {
          vendorId,
          vendorName: 'Vendor'
        } as never);
      }
      return;
    }
  };
};