import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { checkAuthStatus, checkOnboardingStatus } from '@/utils/authHelper';
import AuthNavigator from '@/navigation/AuthNavigator';
import MessageScreen from '@/screens/vendor/MessageScreen';
import MainNavigator from '@/navigation/MainNavigator';
import ChatScreen from '../components/clientComponent/ChatScreen';
import CartScreen from '../components/clientComponent/CartScreen';

import AllVendorsScreen from '@/screens/client/AllVendorsScreen';
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
const Stack = createNativeStackNavigator<RootStackParamList>();
const RootNavigator = () => {
  useDeepLinking();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  useEffect(() => {
    initializeApp();
  }, []);
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
    try {
      console.log('🔄 Initializing app...');
      const authStatus = await checkAuthStatus();
      setIsAuthenticated(authStatus.isAuthenticated);
      setIsVendor(authStatus.isVendor);
      console.log('🔐 Auth status:', {
        isAuthenticated: authStatus.isAuthenticated,
        isVendor: authStatus.isVendor,
        userEmail: authStatus.user?.email
      });
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      console.log('✅ App initialization complete');
    }
  };
  if (isLoading) {
    return <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>;
  }
  return <Stack.Navigator screenOptions={{
    headerShown: false
  }}>
      {!isAuthenticated ? <Stack.Screen name="Auth" component={AuthNavigator} options={{
      animationTypeForReplace: 'pop'
    }} /> : <>
          <Stack.Screen name="Main" component={MainNavigator} initialParams={{
        isVendor
      }} options={{
        animationTypeForReplace: 'push'
      }} />
          <Stack.Screen name="Message" component={MessageScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          {}
          
          {}
          <Stack.Screen name="AllVendors" component={AllVendorsScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="VendorDetail" component={VendorDetailScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="CreateBooking" component={CreateBookingScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="Dispute" component={DisputesScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="CreateDispute" component={CreateDisputeScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="CreateReview" component={CreateReviewScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="Reviews" component={ReviewsScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} options={{
        animation: 'slide_from_right'
      }} />
          {}
          <Stack.Screen name="Favourites" component={FavoritesScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="NotificationsSetting" component={NotificationSettingsScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="PrivacySetting" component={PrivacySecurityScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{
        animation: 'slide_from_right'
      }} />
          <Stack.Screen name="CreateOffer" component={CreateOfferScreen} options={{
        animation: 'slide_from_right'
      }} />

      <Stack.Screen name="MyOffers" component={MyOffersScreen} options={{
        animation: 'slide_from_right'
      }} />
      <Stack.Screen name="OfferDetail" component={OfferDetailScreen} options={{
        animation: 'slide_from_right'
      }} />
      <Stack.Screen name="AvailableOffers" component={AvailableOffersScreen} options={{
        animation: 'slide_from_right'
      }} />

      <Stack.Screen name="SetWithdrawalPin" component={SetWithdrawalPinScreen} options={{
        animation: 'slide_from_right'
      }} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{
        animation: 'slide_from_right'
      }} />
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{
        animation: 'slide_from_right'
      }} />
      {}

      <Stack.Screen name="Marketplace" component={MarketplaceScreen} options={{
        animation: 'slide_from_right'
      }} />
      <Stack.Screen name="AddProduct" component={AddEditProductScreen} options={{
        animation: 'slide_from_right'
      }} />
      <Stack.Screen name="EditProduct" component={AddEditProductScreen} options={{
        animation: 'slide_from_right'
      }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{
        animation: 'slide_from_right'
      }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{
        animation: 'slide_from_right'
      }} />
          
        </>}
    </Stack.Navigator>;
};
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  }
});
export default RootNavigator;