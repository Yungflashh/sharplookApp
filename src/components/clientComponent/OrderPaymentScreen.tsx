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
import socketService from '@/services/socket.service';

type OrderPaymentNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderPayment'>;
type OrderPaymentRouteProp = RouteProp<RootStackParamList, 'OrderPayment'>;

const OrderPaymentScreen: React.FC = () => {
  const navigation = useNavigation<OrderPaymentNavigationProp>();
  const route = useRoute<OrderPaymentRouteProp>();
  // authorizationUrl and reference come directly from the checkout response.
  // The order doesn't exist yet — it is created on the backend when the
  // Paystack webhook fires after a successful charge.
  const { authorizationUrl, reference, totalAmount } = route.params;

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showManualButton, setShowManualButton] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Show the manual-confirm button after 10 s if the socket hasn't fired yet
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!paymentConfirmed) setShowManualButton(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [paymentConfirmed]);

  // Real-time confirmation via socket
  useEffect(() => {
    const connected = socketService.isSocketConnected();
    setSocketConnected(connected);
    if (!connected) socketService.connect();

    const handlePaymentSuccess = (data: any) => {
      if (data.reference !== reference) return;

      setConfirmedOrderId(data.orderId);
      setConfirmedOrderNumber(data.orderNumber);
      setPaymentConfirmed(true);
      setShowManualButton(false);

      setTimeout(() => {
        toast.success(
          'Payment Successful!',
          `Order #${data.orderNumber} is being processed.`,
        );
        navigation.replace('OrderDetail', { orderId: data.orderId });
      }, 500);
    };

    const handlePaymentFailed = (data: any) => {
      if (data.reference !== reference) return;

      setConfirmModal({
        visible: true,
        title: 'Payment Failed',
        message:
          data.reason ||
          'Your payment could not be completed. Please try again.',
        onConfirm: () => navigation.goBack(),
      });
    };

    socketService.onOrderPaymentSuccess(handlePaymentSuccess);
    socketService.onOrderPaymentFailed(handlePaymentFailed);

    return () => {
      socketService.removeListener('order:payment:success');
      socketService.removeListener('order:payment:failed');
    };
  }, [reference, navigation]);

  // If the order has already been confirmed (socket fired while button was visible),
  // navigate directly. Otherwise, let the user know confirmation is still in-flight.
  const handleManualCheck = () => {
    if (confirmedOrderId) {
      navigation.replace('OrderDetail', { orderId: confirmedOrderId });
      return;
    }
    toast.info(
      'Still Processing',
      'Payment is being confirmed. Check "My Orders" if you were charged.',
    );
  };

  const handleCancel = () => {
    setConfirmModal({
      visible: true,
      title: 'Cancel Payment',
      message:
        'Are you sure you want to cancel? Your cart has been cleared — you will need to re-add items to retry.',
      onConfirm: () => navigation.goBack(),
    });
  };

  const handleWebViewError = () => {
    setConfirmModal({
      visible: true,
      title: 'Connection Error',
      message:
        'Failed to load the payment page. Please check your internet connection.',
      onConfirm: () => {},
    });
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (paymentConfirmed) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-5">
          <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={60} color="#10b981" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            {confirmedOrderNumber
              ? `Your order #${confirmedOrderNumber} has been placed.`
              : 'Your order has been placed.'}
          </Text>
          <TouchableOpacity
            onPress={() =>
              confirmedOrderId &&
              navigation.replace('OrderDetail', { orderId: confirmedOrderId })
            }
            className="bg-pink-600 px-8 py-4 rounded-2xl"
          >
            <Text className="text-white font-bold text-base">View Order</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Payment WebView ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
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

        <View className="mt-4 bg-pink-50 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-gray-600">Total Amount</Text>
              <Text className="text-2xl font-bold text-pink-600 mt-1">
                ₦{totalAmount.toLocaleString()}
              </Text>
            </View>
            <View className="bg-pink-100 p-3 rounded-full">
              <Ionicons name="cart" size={24} color="#eb278d" />
            </View>
          </View>
        </View>

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

      {/* Paystack WebView */}
      <View className="flex-1">
        <WebView
          source={{ uri: authorizationUrl }}
          onError={handleWebViewError}
          startInLoadingState
          renderLoading={() => (
            <View className="flex-1 items-center justify-center bg-white">
              <ActivityIndicator size="large" color="#eb278d" />
              <Text className="text-gray-600 mt-4">Loading payment page...</Text>
            </View>
          )}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
        />

        {showManualButton && (
          <View className="px-5 py-4 bg-white border-t border-gray-100">
            <TouchableOpacity
              onPress={handleManualCheck}
              className="py-4 rounded-2xl bg-pink-600"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Text className="text-white text-center text-base font-bold">
                ✓ I've Completed Payment
              </Text>
            </TouchableOpacity>
            <Text className="text-gray-400 text-xs text-center mt-2">
              Tap if payment doesn't auto-confirm
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
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
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, visible: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

export default OrderPaymentScreen;
