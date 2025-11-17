import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { paymentAPI, handleAPIError } from '@/api/api';
type PaymentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'Payment'>;
const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<PaymentScreenNavigationProp>();
  const route = useRoute<PaymentScreenRouteProp>();
  const {
    bookingId,
    amount
  } = route.params;
  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [reference, setReference] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showDoneButton, setShowDoneButton] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  useEffect(() => {
    initializePayment();
  }, [bookingId]);
  useEffect(() => {
    if (!reference || verifying || !paymentUrl) return;
    const doneButtonTimer = setTimeout(() => {
      setShowDoneButton(true);
    }, 15000);
    const startPollingTimer = setTimeout(() => {
      console.log('🔄 Starting automatic payment polling...');
      setConfirmingPayment(true);
      const pollInterval = setInterval(async () => {
        try {
          console.log('📊 Polling payment status for:', reference);
          const response = await paymentAPI.verifyPayment(reference);
          if (response.success && response.data.payment.status === 'completed') {
            console.log('✅ Payment confirmed via polling!');
            clearInterval(pollInterval);
            setVerifying(false);
            setShowDoneButton(false);
            setConfirmingPayment(false);
            setTimeout(() => {
              Alert.alert('Payment Successful! 🎉', 'Your payment has been confirmed. The vendor will be notified.', [{
                text: 'View Booking',
                onPress: () => {
                  navigation.replace('BookingDetail', {
                    bookingId
                  });
                }
              }], {
                cancelable: false
              });
            }, 300);
          } else if (response.success && response.data.payment.status === 'failed') {
            console.log('❌ Payment failed');
            clearInterval(pollInterval);
            setConfirmingPayment(false);
            Alert.alert('Payment Failed', 'Your payment could not be completed. Please try again.', [{
              text: 'Try Again',
              onPress: () => initializePayment()
            }, {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => navigation.goBack()
            }]);
          }
        } catch (error) {
          console.log('Poll error (will retry):', error);
        }
      }, 5000);
      setTimeout(() => {
        console.log('⏱️ Stopping payment polling');
        clearInterval(pollInterval);
        setConfirmingPayment(false);
      }, 180000);
      return () => clearInterval(pollInterval);
    }, 20000);
    return () => {
      clearTimeout(doneButtonTimer);
      clearTimeout(startPollingTimer);
    };
  }, [reference, verifying, paymentUrl]);
  const initializePayment = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.initializePayment({
        bookingId,
        metadata: {
          bookingId,
          platform: Platform.OS
        }
      });
      console.log('Payment initialized:', response);
      if (response.success) {
        setPaymentUrl(response.data.authorizationUrl);
        setReference(response.data.payment.reference);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Payment initialization error:', apiError);
      Alert.alert('Payment Error', apiError.message || 'Failed to initialize payment', [{
        text: 'Try Again',
        onPress: () => initializePayment()
      }, {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => navigation.goBack()
      }]);
    } finally {
      setLoading(false);
    }
  };
  const handleNavigationStateChange = async (navState: any) => {
    const {
      url
    } = navState;
    console.log('Navigation state changed:', url);
    if (url.includes('/payment/verify') || url.includes('sharpLook://') || url.includes('status=success') || url.includes('trxref=')) {
      console.log('Payment callback detected');
      if (!verifying) {
        await verifyPayment();
      }
      return;
    }
    if (url.includes('status=cancelled') || url.includes('cancel')) {
      Alert.alert('Payment Cancelled', 'Your payment was cancelled. Would you like to try again?', [{
        text: 'No',
        style: 'cancel',
        onPress: () => navigation.goBack()
      }, {
        text: 'Yes',
        onPress: () => initializePayment()
      }]);
    }
  };
  const verifyPayment = async () => {
    try {
      setVerifying(true);
      console.log('Verifying payment:', reference);
      const response = await paymentAPI.verifyPayment(reference);
      console.log('Payment verification:', response);
      if (response.success) {
        const payment = response.data.payment;
        if (payment.status === 'completed') {
          setVerifying(false);
          setTimeout(() => {
            Alert.alert('Payment Successful! 🎉', 'Your payment has been confirmed. The vendor will be notified.', [{
              text: 'View Booking',
              onPress: () => {
                navigation.replace('BookingDetail', {
                  bookingId
                });
              }
            }], {
              cancelable: false
            });
          }, 300);
        } else if (payment.status === 'failed') {
          setVerifying(false);
          Alert.alert('Payment Failed', 'Your payment could not be processed. Please try again.', [{
            text: 'Try Again',
            onPress: () => initializePayment()
          }, {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack()
          }]);
        }
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Payment verification error:', apiError);
      setVerifying(false);
      Alert.alert('Verification Error', 'Could not verify payment. Please contact support if you were charged.', [{
        text: 'OK',
        onPress: () => navigation.goBack()
      }]);
    }
  };
  const handleWebViewError = (syntheticEvent: any) => {
    const {
      nativeEvent
    } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    Alert.alert('Connection Error', 'Failed to load payment page. Please check your internet connection.', [{
      text: 'Try Again',
      onPress: () => initializePayment()
    }, {
      text: 'Cancel',
      style: 'cancel',
      onPress: () => navigation.goBack()
    }]);
  };
  if (loading) {
    return <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-600 mt-4">Initializing payment...</Text>
        </View>
      </SafeAreaView>;
  }
  if (verifying) {
    return <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-gray-600 mt-4">Verifying payment...</Text>
          <Text className="text-gray-400 text-sm mt-2">Please wait...</Text>
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => {
          Alert.alert('Cancel Payment', 'Are you sure you want to cancel this payment?', [{
            text: 'No',
            style: 'cancel'
          }, {
            text: 'Yes',
            style: 'destructive',
            onPress: () => navigation.goBack()
          }]);
        }} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-gray-900">Secure Payment</Text>

          <View className="w-10" />
        </View>

        {}
        <View className="mt-4 bg-pink-50 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-gray-600">Amount to Pay</Text>
              <Text className="text-2xl font-bold text-pink-600 mt-1">
                ₦{amount}
              </Text>
            </View>
            <View className="bg-pink-100 p-3 rounded-full">
              <Ionicons name="shield-checkmark" size={24} color="#eb278d" />
            </View>
          </View>
        </View>
      </View>

      {}
      {paymentUrl ? <>
          <WebView source={{
        uri: paymentUrl
      }} onNavigationStateChange={handleNavigationStateChange} onError={handleWebViewError} onMessage={event => {
        console.log('WebView message:', event.nativeEvent.data);
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.event === 'success' || data.status === 'success') {
            console.log('Payment success message received');
            if (!verifying) {
              verifyPayment();
            }
          }
        } catch (e) {}
      }} onShouldStartLoadWithRequest={request => {
        console.log('Should start load:', request.url);
        if (request.url.startsWith('sharpLook://')) {
          console.log('Deep link detected:', request.url);
          if (request.url.includes('payment/verify') && !verifying) {
            verifyPayment();
          }
          return false;
        }
        return true;
      }} startInLoadingState={true} renderLoading={() => <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#eb278d" />
                <Text className="text-gray-600 mt-4">Loading payment page...</Text>
              </View>} style={{
        flex: 1
      }} javaScriptEnabled={true} domStorageEnabled={true} sharedCookiesEnabled={true} originWhitelist={['*']} mixedContentMode="always" />

          {}
          {showDoneButton && !verifying && !confirmingPayment && <View className="absolute bottom-20 left-5 right-5">
              <TouchableOpacity onPress={() => {
          Alert.alert('Verify Payment', 'Have you completed the payment successfully?', [{
            text: 'Not Yet',
            style: 'cancel'
          }, {
            text: 'Yes, Verify Now',
            onPress: () => {
              if (!verifying && reference) {
                setShowDoneButton(false);
                setConfirmingPayment(true);
                verifyPayment();
              }
            }
          }]);
        }} className="bg-pink-600 py-4 rounded-2xl shadow-lg" style={{
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4
          },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8
        }}>
                <Text className="text-white text-center text-base font-bold">
                  ✓ I've Completed Payment
                </Text>
              </TouchableOpacity>
            </View>}

          {}
          {confirmingPayment && <View className="absolute inset-0 bg-white/95 items-center justify-center">
              <View className="bg-white rounded-3xl p-8 shadow-2xl items-center" style={{
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 8
          },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 12
        }}>
                <View className="w-20 h-20 rounded-full bg-pink-100 items-center justify-center mb-4">
                  <ActivityIndicator size="large" color="#eb278d" />
                </View>
                
                <Text className="text-xl font-bold text-gray-900 mb-2">
                  Confirming Payment
                </Text>
                
                <Text className="text-gray-600 text-center mb-4">
                  Please wait while we verify your payment...
                </Text>
                
                <View className="flex-row items-center gap-2">
                  <View className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                  <View className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{
              animationDelay: '0.2s'
            }} />
                  <View className="w-2 h-2 bg-pink-300 rounded-full animate-pulse" style={{
              animationDelay: '0.4s'
            }} />
                </View>
              </View>
            </View>}
        </> : <View className="flex-1 items-center justify-center p-5">
          <Ionicons name="alert-circle-outline" size={64} color="#d1d5db" />
          <Text className="text-gray-400 text-lg font-semibold mt-4">
            Payment URL not available
          </Text>
          <TouchableOpacity className="mt-6 bg-pink-500 px-6 py-3 rounded-xl" onPress={initializePayment}>
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>}

      {}
      <View className="bg-gray-50 px-5 py-3 border-t border-gray-100">
        <View className="flex-row items-center justify-center">
          <Ionicons name="lock-closed" size={16} color="#10b981" />
          <Text className="text-sm text-gray-600 ml-2">
            Secured by <Text className="font-bold">Paystack</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>;
};
export default PaymentScreen;