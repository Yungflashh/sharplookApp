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
  Notifications: undefined;
  Chat: undefined;
  Cart: undefined;
  ChatDetail: {
    vendorId: string;
    vendorName: string;
  };
  ChatList: undefined;
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
  CreateReview: {
    bookingId: string;
    vendorName: string;
    serviceName: string;
  };
  Reviews: undefined;
  VendorMyResponses: undefined;
  PersonalInformation: undefined;
  Favourites: undefined;
  NotificationsSetting: undefined;
  PrivacySetting: undefined;
  HelpCenter: undefined;
  CreateOffer: undefined;
  MyOffers: undefined;
  OfferDetail: undefined;
  AvailableOffers: undefined;
  SetWithdrawalPin: undefined;
  Marketplace: undefined;
  AddProduct: undefined;
  EditProduct: undefined;
  ProductDetail: undefined;
  Checkout: undefined;
  Analytics: undefined;
  MyProducts: undefined;
  CustomerOrders: undefined;
  MyOrders: undefined;
  OrderDetail: undefined;
  VendorStoreSettings: undefined;
  OrderPayment: undefined;
  DisputeDetail: {
    disputeId: string;
  };
  Disputes: undefined;
  CreateDispute: {
    bookingId: string;
  };
  OngoingCall: {
    callId?: string;
    callType: 'voice' | 'video';
    isOutgoing: boolean;
    offer?: any; // SDP offer to be processed immediately
    otherUser: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  IncomingCall: {
    call: {
      _id: string;
      receiver: string;
      status: string;
    };
    caller: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    callType: 'voice' | 'video';
    offer?: any; // SDP offer from caller
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
