import React, { useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { checkAuthStatus, checkOnboardingStatus, checkInactivityAndLogout, updateLastActive } from '@/utils/authHelper';
import AuthNavigator from '@/navigation/AuthNavigator';
import VendorProfileSetup from '@/screens/auth/VendorProfileSetup';
import MessageScreen from '@/screens/vendor/MessageScreen';
import MainNavigator from '@/navigation/MainNavigator';
import SplashScreen from '@/screens/splash/SplashScreen';
import OnboardingScreen from '@/screens/splash/OnboardingScreen';
import ChatScreen from '../components/clientComponent/ChatScreen';
import CartScreen from '../components/clientComponent/CartScreen';

import AllVendorsScreen from '@/screens/client/AllVendorsScreen';
import AllServicesScreen from '@/screens/client/AllServicesScreen';
import VendorDetailScreen from '@/screens/client/VendorDetailsScreen';
import type { RootStackParamList } from '@/types/navigation.types';
import CreateBookingScreen from '@/components/clientComponent/CreateBooking';
import BookingDetailScreen from '@/components/clientComponent/BookingDetailScreen';
import { useDeepLinking } from '../utils/linking';
import PaymentScreen from '@/components/clientComponent/PaymentScreen';
import DisputesScreen from '@/components/DIsputesScreen';
import CreateDisputeScreen from '@/components/CreateDisputeScreen';
import DisputeDetailScreen from '@/components/DisputeDetail';
import CreateReviewScreen from '@/components/clientComponent/CreateReview';
import ReviewsScreen from '@/components/ReviewsScreen';
import PersonalInformationScreen from '@/components/clientComponent/ProfleSettings/PersonalInformationScreen';
import FavoritesScreen from '@/components/clientComponent/ProfleSettings/FavoritesScreen';
import PrivacySecurityScreen from '@/components/clientComponent/ProfleSettings/PrivacySecurityScreen';
import NotificationSettingsScreen from '@/components/clientComponent/ProfleSettings/NotificationSettingsScreen';
import HelpCenterScreen from '@/components/clientComponent/ProfleSettings/HelpCenterScreen';
import NotificationsScreen from '@/components/NoitificationScreen';
import CreateOfferScreen from '@/components/clientComponent/CreateOfferScreen';
import MyOffersScreen from '@/components/clientComponent/MyOffersScreen';
import OfferDetailScreen from '@/components/clientComponent/OfferDetailScreen';
import AvailableOffersScreen from '@/components/vendorComponent/AvailableOffersScreen';
import VendorMyResponsesScreen from '@/components/vendorComponent/VendorMyResponsesScreen';
import SetWithdrawalPinScreen from '@/components/clientComponent/ProfleSettings/SetWithdrawalPinScreen';
import ChatDetailScreen from '@/components/ChatDetailScreen';
import ChatListScreen from '@/components/ChatListScreen';
import IncomingCallScreen from '@/components/Incomingcallscreen';
import OngoingCallScreen from '@/components/Ongoingcallscreen';
import MarketplaceScreen from '@/screens/client/MarketPlaceScreen';
import ProductDetailScreen from '@/components/ProductDetailScreen';
import CheckoutScreen from '@/components/Checkoutscreen';
import AddEditProductScreen from '@/components/vendorComponent/Addeditproductscreen';
import VendorAnalyticsScreen from '@/components/vendorComponent/VendorAnalyticsScreen';
import VendorProductManagementScreen from '@/screens/vendor/Vendorproductmanagementscreen';
import VendorProductOrdersScreen from '@/components/vendorComponent/Vendorproductordersscreen';
import OrderDetailScreen from '@/components/Orderdetailscreen';
import VendorStoreSettingsScreen from '@/components/vendorComponent/VendorStoreSettingsScreen';
import OrderPaymentScreen from '@/components/clientComponent/OrderPaymentScreen';
import CustomerOrdersScreen from '@/components/clientComponent/Customerordersscreen';
import TransactionHistoryScreen from '@/components/TransactionHistoryScreen';
import callService from '@/services/call.service';
import socketService from '@/services/socket.service';
import { navigate } from '../utils/linking';
import { initializeFCM, onForegroundNotification, onNotificationTap, getDeviceInfo } from '@/utils/fcm';
import { notificationAPI, appAPI } from '@/api/api';
import Constants from 'expo-constants';
import UpdateModal from '@/components/UpdateModal';
import * as ExpoUpdates from 'expo-updates';
import ReferralScreen from '@/components/ReferralScreen';
import ReferralLeaderboard from '@/components/ReferralLeaderBoard';
import ApplyReferralCode from '@/components/ApplyReferralCode';
import ReferralDetailScreen from '@/components/ReferralDetailScreen';
import WalletPaymentScreen from '@/components/WalletPaymentScreen';
import ChangeWithdrawalPinScreen from '@/components/clientComponent/ProfleSettings/ChangeWithdrawalPinScreen';
import ChangePasswordScreen from '@/screens/settings/ChangePasswordScreen';
import SubscriptionScreen from '@/components/vendorComponent/SubscriptionScreen';
import UpgradeTierScreen from '@/components/vendorComponent/UpgradeTierScreen';
import DisputeOrderDetailScreen from '@/components/DisputeOrderDetailScreen';
import TermsPrivacyScreen from '@/components/TermsPrivacyScreen';
import SharedContentScreen from '@/screens/shared/SharedContentScreen';
import RescheduleScreen from '@/screens/client/RescheduleScreen';
import VendorServiceDetailScreen from '@/screens/vendor/VendorServiceDetailScreen';
import CategoryProductsScreen from '@/screens/client/CategoryProductsScreen';
import VendorProductDetailScreen from '@/screens/vendor/VendorProductDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Compare two version strings like "2.1" or "2.2.1"
const isVersionBelow = (current: string, minimum: string): boolean => {
  const cur = current.split('.').map(Number);
  const min = minimum.split('.').map(Number);
  const len = Math.max(cur.length, min.length);
  for (let i = 0; i < len; i++) {
    const c = cur[i] ?? 0;
    const m = min[i] ?? 0;
    if (c < m) return true;
    if (c > m) return false;
  }
  return false;
};

const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [authInitialRoute, setAuthInitialRoute] = useState<'Login' | 'VendorRegister' | 'Register'>('Login');
  const [updateInfo, setUpdateInfo] = useState<{
    visible: boolean;
    latestVersion: string;
    forceUpdate: boolean;
    updateMessage: string;
  }>({ visible: false, latestVersion: '', forceUpdate: false, updateMessage: '' });

  useEffect(() => {
    const handleIncomingCall = (data: any) => {
      console.log('📞 Incoming call received in RootNavigator:', data);
      if (data.call && data.caller) {
        navigate('IncomingCall', {
          call: data.call,
          caller: data.caller,
          callType: data.type || data.call?.type || 'voice',
          offer: data.offer
        });
      }
    };

    callService.on('call:incoming', handleIncomingCall);

    return () => {
      callService.removeListener('call:incoming', handleIncomingCall);
    };
  }, []);

  useEffect(() => {
    initializeApp();
  }, []);

  // Update lastActive whenever app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateLastActive();
      }
    });
    return () => sub.remove();
  }, []);

  // Set up push notification listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubForeground = onForegroundNotification();
    const unsubTap = onNotificationTap((notification) => {
      const data = notification.request.content.data;
      if (data?.bookingId) {
        navigate('BookingDetail', { bookingId: data.bookingId });
      } else if (data?.paymentId || data?.type === 'payment') {
        navigate('Transactions' as never);
      } else if (data?.conversationId) {
        navigate('ChatDetail', { conversationId: data.conversationId });
      } else if (data?.orderId) {
        navigate('OrderDetail', { orderId: data.orderId });
      } else {
        navigate('Notifications' as never);
      }
    });

    return () => {
      unsubForeground();
      unsubTap();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const authStatus = await checkAuthStatus();
      if (authStatus.isAuthenticated !== isAuthenticated) {
        console.log('🔄 Auth state changed:', authStatus.isAuthenticated);
        setIsAuthenticated(authStatus.isAuthenticated);
        setIsVendor(authStatus.isVendor);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const initializeApp = async () => {
    const splashStart = Date.now();
    try {
      // ── CRITICAL PATH: resolve auth as fast as possible ──────────────────
      // checkAuthStatus reads from AsyncStorage — no network needed, very fast
      const authStatus = await checkAuthStatus();

      // If authenticated, check 3-day inactivity before allowing access
      if (authStatus.isAuthenticated) {
        const wasInactive = await checkInactivityAndLogout();
        if (wasInactive) {
          setIsAuthenticated(false);
          setIsVendor(false);
          return;
        }
        await updateLastActive();
      }

      setIsAuthenticated(authStatus.isAuthenticated);
      setIsVendor(authStatus.isVendor);

      const onboardingDone = await checkOnboardingStatus();
      setHasCompletedOnboarding(onboardingDone);

      console.log('🔐 Auth status:', {
        isAuthenticated: authStatus.isAuthenticated,
        isVendor: authStatus.isVendor,
        userEmail: authStatus.user?.email
      });
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      setIsAuthenticated(false);
    } finally {
      // Clear loading screen immediately — user sees the app now
      setIsLoading(false);
      console.log('✅ App initialization complete');
    }

    // ── BACKGROUND TASKS: run after app is visible ────────────────────────
    // Re-read auth (non-blocking) to kick off socket + notifications
    const authStatus = await checkAuthStatus().catch(() => ({ isAuthenticated: false, isVendor: false }));

    if (authStatus.isAuthenticated) {
      // Connect socket in background
      socketService.connect();
      socketService.onConnected(() => {
        callService.initialize();
      });

      // Register push notification token in background
      initializeFCM().then(async (token) => {
        if (token) {
          const deviceInfo = getDeviceInfo();
          await notificationAPI.registerDeviceToken({
            token,
            deviceType: deviceInfo.deviceType,
            deviceName: deviceInfo.deviceName,
          }).catch(() => {});
          console.log('✅ Device token registered on app launch');
        }
      }).catch(() => {});
    }

    // Version check — small delay so network stack is ready, fully non-blocking
    setTimeout(async () => {
      try {
        const currentVersion = Constants.expoConfig?.version ?? '0.0';
        const versionData = await appAPI.checkVersion();
        const { minimumVersion, latestVersion, forceUpdate, updateMessage } = versionData.data;
        if (isVersionBelow(currentVersion, minimumVersion)) {
          setUpdateInfo({ visible: true, latestVersion, forceUpdate: true, updateMessage });
        } else if (isVersionBelow(currentVersion, latestVersion)) {
          setUpdateInfo({ visible: true, latestVersion, forceUpdate: false, updateMessage });
        }
      } catch {
        // Non-critical — never block app launch
      }

      // OTA update check — also non-blocking
      if (!__DEV__) {
        try {
          const update = await ExpoUpdates.checkForUpdateAsync();
          if (update.isAvailable) {
            console.log('📦 OTA update available — downloading...');
            await ExpoUpdates.fetchUpdateAsync();
            console.log('✅ OTA update downloaded — reloading app');
            await ExpoUpdates.reloadAsync();
          }
        } catch {
          // Never block app launch due to OTA failure
        }
      }
    }, 1500);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        onComplete={(isVendorUser) => {
          setAuthInitialRoute(isVendorUser ? 'VendorRegister' : 'Register');
          setHasCompletedOnboarding(true);
        }}
      />
    );
  }

  return (
    <>
    <UpdateModal
      visible={updateInfo.visible}
      latestVersion={updateInfo.latestVersion}
      forceUpdate={updateInfo.forceUpdate}
      updateMessage={updateInfo.updateMessage}
      onDismiss={() => setUpdateInfo(prev => ({ ...prev, visible: false }))}
    />
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{ animationTypeForReplace: 'pop' }}
          initialParams={{ initialRoute: authInitialRoute }}
        />
      ) : (
        <>
          <Stack.Screen 
            name="Main" 
            component={MainNavigator} 
            initialParams={{ isVendor }} 
            options={{ animationTypeForReplace: 'push' }} 
          />
          <Stack.Screen name="Message" component={MessageScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          
          <Stack.Screen name="AllVendors" component={AllVendorsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="AllServices" component={AllServicesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="VendorDetail" component={VendorDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CreateBooking" component={CreateBookingScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Disputes" component={DisputesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CreateDispute" component={CreateDisputeScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="DisputeOrderDetail" component={DisputeOrderDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CreateReview" component={CreateReviewScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Reviews" component={ReviewsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="VendorMyResponses" component={VendorMyResponsesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Favourites" component={FavoritesScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="NotificationsSetting" component={NotificationSettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="PrivacySetting" component={PrivacySecurityScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CreateOffer" component={CreateOfferScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="MyOffers" component={MyOffersScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="OfferDetail" component={OfferDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="AvailableOffers" component={AvailableOffersScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="SetWithdrawalPin" component={SetWithdrawalPinScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ChangeWithdrawalPin" component={ChangeWithdrawalPinScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ChatList" component={ChatListScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Subsriptions" component={SubscriptionScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="UpgradeTier" component={UpgradeTierScreen} options={{ animation: 'slide_from_right' }} />
          
          <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="AddProduct" component={AddEditProductScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="EditProduct" component={AddEditProductScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Analytics" component={VendorAnalyticsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="MyProducts" component={VendorProductManagementScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CustomerOrders" component={CustomerOrdersScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="MyOrders" component={VendorProductOrdersScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="VendorStoreSettings" component={VendorStoreSettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="OrderPayment" component={OrderPaymentScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Transactions" component={TransactionHistoryScreen} options={{ animation: 'slide_from_right' }} />
          
          <Stack.Screen 
            name="IncomingCall" 
            component={IncomingCallScreen} 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
              gestureEnabled: false
            }} 
          />
          <Stack.Screen 
            name="OngoingCall" 
            component={OngoingCallScreen} 
            options={{
              animation: 'fade',
              presentation: 'fullScreenModal',
              gestureEnabled: false,
              headerShown: false
            }} 
          />
          <Stack.Screen 
            name="Referrals" 
            component={ReferralScreen} 
            options={{
              animation: 'fade',
              presentation: 'fullScreenModal',
              gestureEnabled: false,
              headerShown: false
            }} 
          />
          <Stack.Screen 
            name="ReferralLeaderboard" 
            component={ReferralLeaderboard} 
            options={{
              animation: 'fade',
              presentation: 'fullScreenModal',
              gestureEnabled: false,
              headerShown: false
            }} 
          />
          <Stack.Screen 
            name="ApplyReferralCode" 
            component={ApplyReferralCode}
            options={{
              animation: 'fade',
              presentation: 'fullScreenModal',
              gestureEnabled: false,
              headerShown: false
            }}
          />
          <Stack.Screen 
            name="ReferralDetail" 
            component={ReferralDetailScreen}  
            options={{
              animation: 'fade',
              presentation: 'fullScreenModal',
              gestureEnabled: false,
              headerShown: false
            }} 
          />
          <Stack.Screen 
            name="WalletPayment" 
            component={WalletPaymentScreen}  
            options={{
              animation: 'fade',
              presentation: 'fullScreenModal',
              gestureEnabled: false,
              headerShown: false
            }} 
          />
          <Stack.Screen 
            name="TermsPrivacy" 
            component={TermsPrivacyScreen}  
            options={{
              animation: 'slide_from_right',
            }} 
          />
           <Stack.Screen
            name="SharedContent"
            component={SharedContentScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen name="Reschedule" component={RescheduleScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="VendorServiceDetail" component={VendorServiceDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CategoryProducts" component={CategoryProductsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="VendorProductDetail" component={VendorProductDetailScreen} options={{ animation: 'slide_from_right' }} />
        </>
      )}
    </Stack.Navigator>
    </>
  );
};

export default RootNavigator;