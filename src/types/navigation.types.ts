import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: {
    isVendor?: boolean;
  };
  Message: undefined;
  Notification: undefined;
  Chat: undefined;
  Cart: undefined;
  ChatDetail: {
    vendorId: string;
    vendorName: string;
  };
  AllVendors: undefined;
  VendorDetail: {
    vendorId: string;
  };
  CreateBooking: {
    service: {
      _id: string;
      name: string;
      description?: string;
      basePrice: number;
      duration?: number;
      category?: any;
      isActive?: boolean;
    };
    vendor: {
      _id: string;
      vendorProfile: {
        businessName: string;
        vendorType: string;
        location?: {
          address: string;
          city: string;
          state: string;
          coordinates: [number, number];
        };
      };
    };
  };
  BookingDetail: {
    bookingId: string;
  };
  Payment: {
    bookingId: string;
    amount: number;
  };
};
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VendorLogin: undefined;
  VendorProfileSetup: undefined;
};
export type ClientTabParamList = {
  Home: undefined;
  Bookings: undefined;
  Explore: undefined;
  Profile: undefined;
};
export type VendorTabParamList = {
  Dashboard: undefined;
  Bookings: undefined;
  Services: undefined;
  Profile: undefined;
};
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type ClientTabScreenProps<T extends keyof ClientTabParamList> = BottomTabScreenProps<ClientTabParamList, T>;
export type VendorTabScreenProps<T extends keyof VendorTabParamList> = BottomTabScreenProps<VendorTabParamList, T>;
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
export {};