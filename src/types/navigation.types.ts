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
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar?: string;
    conversationId?: string;
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
      _id:string;
      vendorProfile: {
        businessName: string;
        vendorType: string;
        profileImage?: string;
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
    bookingId?: string;  // Not available for card payments (booking created post-webhook)
    amount: number;
     authorizationUrl?: string;  // NEW: Pre-generated URL from booking creation
  reference?: string; 
  };
  CreateReview: {
    bookingId: string;
    vendorName: string;
    serviceName: string;
    vendorImage?: string;
    vendorRole?: string;
    completedAt?: string;
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
  ProductDetail: { productId: string };
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
    role: 'client' | 'vendor';
  };
  OngoingCall: {
    callId?: string;
    callType: 'voice' | 'video';
    isOutgoing: boolean;
    offer?: any; 
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
    offer?: any; 
  };
  SharedContent: {
    type: 'vendor' | 'product';
    id: string;
  };
  Referrals: undefined;
  ReferralLeaderboard: undefined;
  ApplyReferralCode: undefined;
  ReferralDetail: undefined;
  WalletPayment: {
    amount: number;
    reference: string;
    authorizationUrl: string;
    paymentType?: 'wallet_funding' | 'tier_upgrade';
  };
  ChangeWithdrawalPin: undefined;
  Subsriptions: undefined;
  UpgradeTier: undefined;
  DisputeOrderDetail: undefined;
  TermsPrivacy: undefined;
  Transactions: undefined;
  VendorServiceDetail: {
    serviceId: string;
  };
  Reschedule: {
    bookingId: string;
    scheduledDate: string;
    scheduledTime?: string;
    vendorName: string;
    serviceName: string;
    serviceImage?: string;
    serviceType?: string;
    location?: { address: string; city: string; state: string };
  };
  OngoingCall: {
    callId?: string;
    callType: 'voice' | 'video';
    isOutgoing: boolean;
    offer?: any; 
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
    offer?: any; 
  };
  SharedContent: {
    type: 'vendor' | 'product';
    id: string;
  };
  Referrals: undefined;
  ReferralLeaderboard: undefined;
  ApplyReferralCode: undefined;
  ReferralDetail: undefined;
  WalletPayment: {
    amount: number;
    reference: string;
    authorizationUrl: string;
    paymentType?: 'wallet_funding' | 'tier_upgrade';
  };
  ChangeWithdrawalPin: undefined;
  Subsriptions: undefined;
  UpgradeTier: undefined;
  DisputeOrderDetail: undefined;
  TermsPrivacy: undefined;
};
export type AuthStackParamList = {
  Login: { message?: string } | undefined;
  Register: { asVendor?: boolean } | undefined;
  ForgotPassword: undefined;
  VerifyResetCode: { email: string };
  ChangePassword: { email: string; code: string };
  ResetPasswordSuccess: undefined;
  VendorLogin: undefined;
    VerifyOtp: { email: string };  // Make sure this exists

  TermsPrivacyAuthScreen: { type: 'terms' | 'privacy'; onAccept?: () => void };
};
export type ClientTabParamList = {
  Home: undefined;
  Bookings: undefined;
  MarketPlace: undefined;
  Explore: undefined;
  Profile: undefined;
};
export type VendorTabParamList = {
  Dashboard: undefined;
  Bookings: undefined;
  'My Products': undefined;
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
