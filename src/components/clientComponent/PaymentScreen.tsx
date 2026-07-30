import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import socketService from '@/services/socket.service';

type PaymentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'Payment'>;

/**
 * Updated PaymentScreen for Atomic Booking Flow
 * 
 * NEW FLOW (from CreateBookingScreen with Paystack):
 * - Receives: bookingId, amount, authorizationUrl, reference
 * - authorizationUrl is already generated during booking creation
 * - Just displays WebView and handles verification
 * 
 * LEGACY FLOW (if authorizationUrl not provided):
 * - Falls back to calling booking payment verification endpoint
 */
const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<PaymentScreenNavigationProp>();
  const route = useRoute<PaymentScreenRouteProp>();

  // Route params - authorizationUrl and reference are now passed from CreateBookingScreen
  const { 
    bookingId, 
    amount,
    authorizationUrl: initialAuthUrl,
    reference: initialReference 
  } = route.params;

  const [loading, setLoading] = useState(!initialAuthUrl); // Skip loading if URL already provided
  const [paymentUrl, setPaymentUrl] = useState(initialAuthUrl || '');
  const [reference, setReference] = useState(initialReference || '');
  const [verifying, setVerifying] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showManualButton, setShowManualButton] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  // Initialize payment only if authorizationUrl wasn't provided
  useEffect(() => {
    if (!initialAuthUrl) {
      // This shouldn't happen in the new flow, but handle gracefully
      console.log('⚠️ No authorizationUrl provided, booking may have been created without payment');
      checkBookingPaymentStatus();
    }
  }, [bookingId, initialAuthUrl]);

  // Show manual verification button after delay
  useEffect(() => {
    if (!paymentUrl || paymentConfirmed) return;

    const timer = setTimeout(() => {
      if (!paymentConfirmed) {
        setShowManualButton(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [paymentUrl, paymentConfirmed]);

  // Socket listeners for real-time payment updates
  useEffect(() => {
    if (!reference && !bookingId) return;

    console.log('🔌 Setting up payment socket listener');
    console.log('   Reference:', reference);
    console.log('   Booking ID:', bookingId);

    // Force reconnect socket when entering payment screen
    const setupSocket = async () => {
      try {
        // Disconnect and reconnect to ensure fresh connection
        console.log('🔌 Forcing socket reconnection...');
        socketService.disconnect();
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
        socketService.connect();
        
        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const connected = socketService.isSocketConnected();
        setSocketConnected(connected);
        console.log('🔌 Socket connected after reconnect:', connected);

        const socket = socketService.getSocket();
        if (!socket) {
          console.log('⚠️ Socket is null after reconnect attempt');
          return;
        }

        console.log('🔌 Socket ID:', socket.id);
        console.log('🔌 Socket connected:', socket.connected);

        // ✅ Listen for payment success
        const handleBookingPaid = (data: any) => {
          console.log('💰 ========================================');
          console.log('💰 payment:success / booking:created:paid RECEIVED!');
          console.log('💰 Data:', JSON.stringify(data, null, 2));
          console.log('💰 Our reference:', reference);
          console.log('💰 Our bookingId:', bookingId);
          console.log('💰 ========================================');

          // Check if this event is for our payment
          if (data.reference === reference || data.bookingId === bookingId) {
            console.log('✅ Payment confirmed via socket!');
            setPaymentConfirmed(true);
            setVerifying(false);
            setShowManualButton(false);
          } else {
            console.log('⚠️ Event received but not for this payment');
          }
        };

        // ✅ Listen for payment failure
        const handlePaymentFailed = (data: any) => {
          console.log('❌ ========================================');
          console.log('❌ payment:failed / booking:payment:failed RECEIVED!');
          console.log('❌ Data:', JSON.stringify(data, null, 2));
          console.log('❌ ========================================');

          if (data.reference === reference || data.bookingId === bookingId) {
            setVerifying(false);
            toast.error('Payment Failed', data.reason || 'Your payment could not be completed. Please try again.');
            navigation.goBack();
          }
        };

        // Remove any existing listeners first
        socket.off('payment:success');
        socket.off('payment:failed');
        socket.off('booking:created:paid');
        socket.off('booking:payment:failed');

        // ✅ Listen for the CORRECT events from webhook.controller.ts
        // Backend emits: 'payment:success' and 'payment:failed'
        socket.on('payment:success', handleBookingPaid);
        socket.on('payment:failed', handlePaymentFailed);
        
        // Also listen for alternative event names (from booking.service.ts)
        socket.on('booking:created:paid', handleBookingPaid);
        socket.on('booking:payment:failed', handlePaymentFailed);

        // Debug: Log ALL incoming socket events
        socket.onAny((eventName: string, data: any) => {
          console.log('🔔 [PaymentScreen] Socket event:', eventName);
          if (eventName.includes('booking') || eventName.includes('payment')) {
            console.log('🔔 Event data:', JSON.stringify(data, null, 2));
          }
        });

        console.log('✅ Socket listeners attached for payment:success & payment:failed');

        // Monitor connection status
        socket.on('connect', () => {
          console.log('🔌 Socket reconnected!');
          setSocketConnected(true);
        });

        socket.on('disconnect', (reason: string) => {
          console.log('🔌 Socket disconnected:', reason);
          setSocketConnected(false);
        });

      } catch (error) {
        console.error('❌ Socket setup error:', error);
      }
    };

    setupSocket();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up payment socket listeners');
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('payment:success');
        socket.off('payment:failed');
        socket.off('booking:created:paid');
        socket.off('booking:payment:failed');
        socket.offAny();
      }
    };
  }, [reference, bookingId, navigation]);

  // Check booking payment status (fallback if no authorizationUrl)
  const checkBookingPaymentStatus = async () => {
    try {
      setLoading(true);
      const response = await bookingAPI.getBookingById(bookingId);
      
      if (response.success) {
        const booking = response.data.booking || response.data;
        
        if (booking.paymentStatus === 'escrowed') {
          // Already paid!
          setPaymentConfirmed(true);
        } else if (booking.paymentStatus === 'pending') {
          // Need to show error - no payment URL available
          toast.warning('Payment Required', 'This booking requires payment. Please go back and create a new booking.');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
      toast.error('Error', 'Could not load booking information.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Verify payment via webhook/API (manual verification)
  const verifyPayment = async () => {
    if (verifying || paymentConfirmed) return;

    try {
      setVerifying(true);
      console.log('🔍 Manually verifying payment for booking:', bookingId);

      // Use the new booking payment verification endpoint
      const response = await bookingAPI.verifyPaystackPayment(reference);
      console.log('📊 Payment verification:', response);

      if (response.success) {
        const data = response.data;
        
        if (data.booking?.paymentStatus === 'escrowed' || data.paymentStatus === 'escrowed') {
          setVerifying(false);
          setPaymentConfirmed(true);
          setShowManualButton(false);
        } else {
          setVerifying(false);
          toast.info('Payment Pending', 'Your payment is still being processed. Please wait a moment and try again.');
        }
      } else {
        setVerifying(false);
        toast.error('Error', response.message || 'Could not verify payment. Please try again.');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('❌ Payment verification error:', apiError);
      setVerifying(false);

      toast.error('Verification Error', apiError.message || 'Could not verify payment. Please contact support if you were charged.');
    }
  };

  const handleCancel = () => {
    setConfirmModal({
      visible: true,
      title: 'Cancel Payment',
      message: 'Are you sure you want to cancel? Your booking will expire if payment is not completed within 30 minutes.',
      onConfirm: () => {
        // Navigate to booking detail to show pending status
        navigation.replace('BookingDetail', { bookingId });
      },
    });
  };

  const handleWebViewError = () => {
    setConfirmModal({
      visible: true,
      title: 'Connection Error',
      message: 'Failed to load payment page. Please check your internet connection.',
      onConfirm: () => setPaymentUrl(initialAuthUrl || ''),
    });
  };

  const handleViewBooking = () => {
    navigation.replace('BookingDetail', { bookingId });
  };

  // Handle WebView navigation state changes to detect payment completion
  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    
    // Detect Paystack callback URLs
    if (url.includes('callback') || url.includes('verify') || url.includes('success')) {
      console.log('🔍 Detected potential payment completion URL:', url);
      
      // Extract reference from URL if present
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const refFromUrl = urlParams.get('reference') || urlParams.get('trxref');
      
      if (refFromUrl) {
        setReference(refFromUrl);
      }
      
      // ✅ Force socket reconnect when returning from Paystack
      // This ensures we receive the socket event from backend
      console.log('🔌 Reconnecting socket after Paystack redirect...');
      socketService.disconnect();
      setTimeout(() => {
        socketService.connect();
        console.log('🔌 Socket reconnected, waiting for payment confirmation...');
      }, 500);
      
      // Note: Don't manually verify - let the socket event confirm payment
      // The backend webhook will emit booking:created:paid
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-600 mt-4 text-base">Loading payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Payment confirmed state
  if (paymentConfirmed) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-5">
          <View className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6">
            <Ionicons name="checkmark-circle" size={60} color="#10b981" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Payment Successful!
          </Text>
          <Text className="text-gray-600 text-center mb-2">
            Your payment of <Text className="font-bold text-pink-600">₦{amount?.toLocaleString()}</Text> has been confirmed.
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-2">
            Your booking is now confirmed and the vendor has been notified.
          </Text>
          
          {/* Payment secured badge */}
          <View className="bg-blue-50 rounded-xl px-4 py-3 flex-row items-center mb-8">
            <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
            <Text className="text-blue-700 ml-2 font-medium">
              Payment secured in escrow
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleViewBooking}
            className="bg-pink-600 px-8 py-4 rounded-2xl"
            style={{
              shadowColor: '#eb278d',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text className="text-white font-bold text-base">View Booking</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Verifying state
  if (verifying) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="text-gray-600 mt-4 text-base">Verifying payment...</Text>
          <Text className="text-gray-400 text-sm mt-2">Please wait...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        </View>
      </View>
    );
  }

          <Text className="text-lg font-bold text-gray-900">Complete Payment</Text>

          {/* Concentric circles */}
          <View style={styles.shieldOuter}>
            <View style={styles.shieldInner}>
              <Ionicons name="shield-checkmark" size={52} color={PINK} />
            </View>
          </View>
        </View>

        {/* Amount Display */}
        <View className="mt-4 bg-pink-50 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-gray-600">Amount to Pay</Text>
              <Text className="text-2xl font-bold text-pink-600 mt-1">
                ₦{amount?.toLocaleString()}
              </Text>
            </View>
            <View className="bg-pink-100 p-3 rounded-full">
              <Ionicons name="shield-checkmark" size={24} color="#eb278d" />
            </View>
          </View>
        </View>

        {/* Connection Status */}
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

        {/* Expiry Warning */}
        <View className="mt-3 bg-amber-50 rounded-xl p-3 flex-row items-center">
          <Ionicons name="time-outline" size={18} color="#f59e0b" />
          <Text className="text-amber-700 text-xs ml-2 flex-1">
            Complete payment within 30 minutes or your booking will expire
          </Text>
        </View>
      </View>

      {/* WebView */}
      {paymentUrl ? (
        <View className="flex-1">
          <WebView
            source={{ uri: paymentUrl }}
            onError={handleWebViewError}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState={true}
            renderLoading={() => (
              <View className="flex-1 items-center justify-center bg-white absolute inset-0">
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

          {/* Manual Verification Button */}
          {showManualButton && (
            <View className="px-5 py-4 bg-white border-t border-gray-100">
              <TouchableOpacity
                onPress={verifyPayment}
                disabled={verifying}
                className={`py-4 rounded-2xl ${verifying ? 'bg-gray-400' : 'bg-green-600'}`}
                style={{
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
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
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text className="text-white text-center text-base font-bold ml-2">
                      I've Completed Payment
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text className="text-gray-400 text-xs text-center mt-2">
                Tap if payment doesn't auto-confirm after completing on Paystack
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View className="flex-1 items-center justify-center p-5">
          <Ionicons name="alert-circle-outline" size={64} color="#d1d5db" />
          <Text className="text-gray-600 text-lg font-semibold mt-4 text-center">
            Payment URL not available
          </Text>
          <Text className="text-gray-400 text-sm mt-2 text-center">
            There was an issue loading the payment page.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-pink-500 px-6 py-3 rounded-xl"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer */}
      <View className="bg-gray-50 px-5 py-3 border-t border-gray-100">
        <View className="flex-row items-center justify-center">
          <Ionicons name="lock-closed" size={16} color="#10b981" />
          <Text className="text-sm text-gray-600 ml-2">
            Secured by <Text className="font-bold">Paystack</Text>
          </Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#d1d5db" />
          <Text style={styles.noUrlText}>Payment URL not available</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 12 }]}>
        <Ionicons name="lock-closed" size={12} color={GREEN} />
        <Text style={styles.footerText}>  256-bit SSL  ·  Secured by </Text>
        <Text style={[styles.footerText, { fontWeight: '700' }]}>Paystack</Text>
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

export default PaymentScreen;