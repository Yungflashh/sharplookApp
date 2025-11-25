import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, handleAPIError } from '@/api/api';
import socketService from '@/services/socket.service';

type OrderPaymentNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderPayment'>;
type OrderPaymentRouteProp = RouteProp<RootStackParamList, 'OrderPayment'>;

const OrderPaymentScreen: React.FC = () => {
  const navigation = useNavigation<OrderPaymentNavigationProp>();
  const route = useRoute<OrderPaymentRouteProp>();
  const { orderId, amount, orderNumber } = route.params;

  const [loading, setLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [reference, setReference] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showManualButton, setShowManualButton] = useState(false);

  
  useEffect(() => {
    initializePayment();
  }, [orderId]);

  
  useEffect(() => {
    if (!paymentUrl || paymentConfirmed) return;

    const timer = setTimeout(() => {
      if (!paymentConfirmed) {
        setShowManualButton(true);
      }
    }, 10000); 

    return () => clearTimeout(timer);
  }, [paymentUrl, paymentConfirmed]);

  
  useEffect(() => {
    if (!reference) return;

    console.log('🔌 Setting up order payment socket listener for:', reference);

    
    const connected = socketService.isSocketConnected();
    setSocketConnected(connected);

    if (!connected) {
      console.log('🔌 Socket not connected, attempting to connect...');
      socketService.connect();
    }

    
    const handlePaymentSuccess = (data: any) => {
      console.log('💰 Order payment success received via socket:', data);

      
      if (data.reference === reference || data.orderId === orderId) {
        console.log('✅ This payment matches our reference!');
        setPaymentConfirmed(true);
        setVerifying(false);
        setShowManualButton(false);

        
        setTimeout(() => {
          Alert.alert(
            'Payment Successful! 🎉',
            `Your order #${orderNumber} has been paid successfully. The seller will process your order shortly.`,
            [
              {
                text: 'View Order',
                onPress: () => navigation.replace('OrderDetail', { orderId }),
              },
            ],
            { cancelable: false }
          );
        }, 500);
      }
    };

    
    const handlePaymentFailed = (data: any) => {
      console.log('❌ Order payment failed received via socket:', data);

      if (data.reference === reference || data.orderId === orderId) {
        setVerifying(false);
        Alert.alert(
          'Payment Failed',
          data.reason || 'Your payment could not be completed. Please try again.',
          [
            { text: 'Try Again', onPress: () => initializePayment() },
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
          ]
        );
      }
    };

    
    socketService.onOrderPaymentSuccess(handlePaymentSuccess);
    socketService.onOrderPaymentFailed(handlePaymentFailed);

    
    return () => {
      console.log('🧹 Cleaning up order payment socket listeners');
      socketService.removeListener('order:payment:success');
      socketService.removeListener('order:payment:failed');
    };
  }, [reference, orderId, orderNumber, navigation]);

  const initializePayment = async () => {
    try {
      setLoading(true);
      setPaymentConfirmed(false);
      setShowManualButton(false);

      const response = await orderAPI.initializeOrderPayment({
        orderId,
        metadata: {
          orderId,
          orderNumber,
          platform: Platform.OS,
        },
      });

      console.log('Payment initialized:', response);

      if (response.success) {
        setPaymentUrl(response.data.authorizationUrl);
        setReference(response.data.reference);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Payment initialization error:', apiError);

      Alert.alert(
        'Payment Error',
        apiError.message || 'Failed to initialize payment',
        [
          { text: 'Try Again', onPress: () => initializePayment() },
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async () => {
    if (verifying || paymentConfirmed) return;

    try {
      setVerifying(true);
      console.log('🔍 Manually verifying order payment:', reference);

      const response = await orderAPI.verifyOrderPayment(orderId, reference);
      console.log('📊 Payment verification:', response);

      if (response.success) {
        const order = response.data.order;

        if (order.isPaid) {
          setVerifying(false);
          setPaymentConfirmed(true);
          setShowManualButton(false);

          Alert.alert(
            'Payment Successful! 🎉',
            `Your order #${orderNumber} has been paid successfully. The seller will process your order shortly.`,
            [
              {
                text: 'View Order',
                onPress: () => navigation.replace('OrderDetail', { orderId }),
              },
            ],
            { cancelable: false }
          );
        } else {
          setVerifying(false);

          Alert.alert(
            'Payment Pending',
            'Your payment is still being processed. Please wait a moment and try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        setVerifying(false);
        Alert.alert('Error', 'Could not verify payment. Please try again.');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('❌ Payment verification error:', apiError);
      setVerifying(false);

      Alert.alert(
        'Verification Error',
        'Could not verify payment. Please contact support if you were charged.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment? Your order will not be processed.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleWebViewError = () => {
    Alert.alert(
      'Connection Error',
      'Failed to load payment page. Please check your internet connection.',
      [
        { text: 'Try Again', onPress: () => initializePayment() },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]
    );
  };

  
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-600 mt-4">Initializing payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  
  if (paymentConfirmed) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-5">
          <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={60} color="#10b981" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</Text>
          <Text className="text-gray-600 text-center mb-6">
            Your order #{orderNumber} has been paid successfully.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.replace('OrderDetail', { orderId })}
            className="bg-pink-600 px-8 py-4 rounded-2xl"
          >
            <Text className="text-white font-bold text-base">View Order</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  
  if (verifying) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-gray-600 mt-4">Verifying payment...</Text>
          <Text className="text-gray-400 text-sm mt-2">Please wait...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleCancel}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-gray-900">Secure Payment</Text>

          <View className="w-10" />
        </View>

        {}
        <View className="mt-4 bg-pink-50 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-gray-600">Order #{orderNumber}</Text>
              <Text className="text-2xl font-bold text-pink-600 mt-1">
                ₦{amount.toLocaleString()}
              </Text>
            </View>
            <View className="bg-pink-100 p-3 rounded-full">
              <Ionicons name="cart" size={24} color="#eb278d" />
            </View>
          </View>
        </View>

        {}
        <View className="mt-3 flex-row items-center justify-center">
          <View
            className={`w-2 h-2 rounded-full mr-2 ${
              socketConnected ? 'bg-green-500' : 'bg-yellow-500'
            }`}
          />
          <Text className="text-xs text-gray-500">
            {socketConnected ? 'Live updates enabled' : 'Connecting...'}
          </Text>
        </View>
      </View>

      {}
      {paymentUrl ? (
        <View className="flex-1">
          <WebView
            source={{ uri: paymentUrl }}
            onError={handleWebViewError}
            startInLoadingState={true}
            renderLoading={() => (
              <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#eb278d" />
                <Text className="text-gray-600 mt-4">Loading payment page...</Text>
              </View>
            )}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="always"
          />

          {}
          {showManualButton && (
            <View className="px-5 py-4 bg-white border-t border-gray-100">
              <TouchableOpacity
                onPress={verifyPayment}
                disabled={verifying}
                className={`py-4 rounded-2xl ${verifying ? 'bg-gray-400' : 'bg-pink-600'}`}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                {verifying ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#fff" />
                    <Text className="text-white text-center text-base font-bold ml-2">
                      Verifying...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white text-center text-base font-bold">
                    ✓ I've Completed Payment
                  </Text>
                )}
              </TouchableOpacity>

              <Text className="text-gray-400 text-xs text-center mt-2">
                Tap if payment doesn't auto-confirm
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View className="flex-1 items-center justify-center p-5">
          <Ionicons name="alert-circle-outline" size={64} color="#d1d5db" />
          <Text className="text-gray-400 text-lg font-semibold mt-4">
            Payment URL not available
          </Text>
          <TouchableOpacity
            className="mt-6 bg-pink-500 px-6 py-3 rounded-xl"
            onPress={initializePayment}
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {}
      <View className="bg-gray-50 px-5 py-3 border-t border-gray-100">
        <View className="flex-row items-center justify-center">
          <Ionicons name="lock-closed" size={16} color="#10b981" />
          <Text className="text-sm text-gray-600 ml-2">
            Secured by <Text className="font-bold">Paystack</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OrderPaymentScreen;