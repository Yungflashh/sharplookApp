import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { walletAPI, handleAPIError } from '@/api/api';
import socketService from '@/services/socket.service';

type WalletPaymentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WalletPayment'>;
type WalletPaymentScreenRouteProp = RouteProp<RootStackParamList, 'WalletPayment'>;

const WalletPaymentScreen: React.FC = () => {
  const navigation = useNavigation<WalletPaymentScreenNavigationProp>();
  const route = useRoute<WalletPaymentScreenRouteProp>();
  
  const { amount, reference, authorizationUrl } = route.params;
  
  const [verifying, setVerifying] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showManualButton, setShowManualButton] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!paymentConfirmed) {
        setShowManualButton(true);
      }
    }, 10000); 

    return () => clearTimeout(timer);
  }, [paymentConfirmed]);

  
  useEffect(() => {
    console.log('🔌 Setting up wallet payment socket listener for:', reference);

    
    const connected = socketService.isSocketConnected();
    setSocketConnected(connected);
    
    if (!connected) {
      console.log('🔌 Socket not connected, attempting to connect...');
      socketService.connect();
    }

    
    const handlePaymentSuccess = (data: any) => {
      console.log('💰 Payment success received via socket:', data);
      
      
      if (data.reference === reference) {
        console.log('✅ This payment matches our reference!');
        setPaymentConfirmed(true);
        
       
      }
    };

    
    const handlePaymentFailed = (data: any) => {
      console.log('❌ Payment failed received via socket:', data);
      
      if (data.reference === reference) {
        toast.error('Payment Failed', data.reason || 'Your wallet funding could not be completed. Please try again.');
        navigation.goBack();
      }
    };

    
    socketService.onWalletFunded(handlePaymentSuccess);
    socketService.onWalletFundingFailed(handlePaymentFailed);

    
    return () => {
      console.log('🧹 Cleaning up wallet payment socket listeners');
      socketService.removeListener('wallet:funded');
      socketService.removeListener('wallet:funding:failed');
    };
  }, [reference, amount, navigation]);

  const verifyPayment = async () => {
    if (verifying || paymentConfirmed) return;

    try {
      setVerifying(true);
      console.log('🔍 Manually verifying wallet payment:', reference);

      const response = await walletAPI.verifyWalletFunding(reference);
      console.log('📊 Verification response:', response);

      if (response.success) {
        const payment = response.data.payment;

        if (payment.status === 'completed' || payment.status === 'success') {
          setVerifying(false);
          setPaymentConfirmed(true);

          toast.success('Wallet Funded!', `Your wallet has been credited with ₦${amount.toLocaleString()}`);
        } else if (payment.status === 'failed') {
          setVerifying(false);

          toast.error('Payment Failed', 'Your wallet funding could not be processed. Please try again.');
        } else if (payment.status === 'pending') {
          setVerifying(false);

          toast.info('Payment Pending', 'Your payment is still being processed. Please wait a moment and try again.');
        } else {
          setVerifying(false);

          toast.info('Payment Status', `Current status: ${payment.status}. Please try again or contact support.`);
        }
      } else {
        setVerifying(false);
        toast.error('Error', 'Could not verify payment. Please try again.');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('❌ Verification error:', apiError);
      setVerifying(false);

      toast.error('Verification Error', 'Could not verify payment. Please check your wallet balance or contact support if you were charged.');
    }
  };

  const handleCancel = () => {
    setConfirmModal({
      visible: true,
      title: 'Cancel Payment',
      message: 'Are you sure you want to cancel this payment?',
      onConfirm: () => navigation.goBack(),
    });
  };

  const handleWebViewError = () => {
    toast.error('Connection Error', 'Failed to load payment page. Please check your internet connection.');
    navigation.goBack();
  };

  
  if (paymentConfirmed) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-5">
          <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={60} color="#10b981" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</Text>
          <Text className="text-gray-600 text-center mb-6">
            Your wallet has been credited with ₦{amount.toLocaleString()}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Main')}
            className="bg-pink-600 px-8 py-4 rounded-2xl"
          >
            <Text className="text-white font-bold text-base">View Wallet</Text>
          </TouchableOpacity>
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

          <Text className="text-lg font-bold text-gray-900">Fund Wallet</Text>

          <View className="w-10" />
        </View>

        {}
        <View className="mt-4 bg-pink-50 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-gray-600">Amount to Fund</Text>
              <Text className="text-2xl font-bold text-pink-600 mt-1">
                ₦{amount.toLocaleString()}
              </Text>
            </View>
            <View className="bg-pink-100 p-3 rounded-full">
              <Ionicons name="wallet" size={24} color="#eb278d" />
            </View>
          </View>
        </View>

        {}
        <View className="mt-3 flex-row items-center justify-center">
          <View className={`w-2 h-2 rounded-full mr-2 ${socketConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <Text className="text-xs text-gray-500">
            {socketConnected ? 'Live updates enabled' : 'Connecting...'}
          </Text>
        </View>
      </View>

      {}
      {authorizationUrl ? (
        <View className="flex-1">
          <WebView
            source={{ uri: authorizationUrl }}
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
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white font-semibold">Go Back</Text>
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
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({...prev, visible: false})); }}
        onCancel={() => setConfirmModal(prev => ({...prev, visible: false}))}
      />
    </SafeAreaView>
  );
};

export default WalletPaymentScreen;