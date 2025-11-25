import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { bookingAPI, sharpPayAPI, handleAPIError } from '@/api/api';

interface PaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  bookingAmount: number;
  onPaymentSuccess: () => void;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  visible,
  onClose,
  bookingId,
  bookingAmount,
  onPaymentSuccess,
}) => {
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [canPayFromWallet, setCanPayFromWallet] = useState(false);
  const [shortfall, setShortfall] = useState(0);

  useEffect(() => {
    if (visible) {
      checkWalletBalance();
    }
  }, [visible, bookingId]);

  const checkWalletBalance = async () => {
    try {
      setLoading(true);

      
      const balanceResponse = await sharpPayAPI.getBalance();
      const balance = balanceResponse.data?.balance || 0;
      setWalletBalance(balance);

      
      const canPayResponse = await bookingAPI.canPayFromWallet(bookingId);
      const { canPay, shortfall: walletShortfall } = canPayResponse.data;

      setCanPayFromWallet(canPay);
      setShortfall(walletShortfall || 0);
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Error checking wallet balance:', apiError);
      Alert.alert('Error', 'Failed to check wallet balance');
    } finally {
      setLoading(false);
    }
  };

  const handlePayFromWallet = async () => {
    if (!canPayFromWallet) {
      Alert.alert(
        'Insufficient Balance',
        `You need ₦${shortfall.toLocaleString()} more in your wallet. Would you like to fund your wallet?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Fund Wallet',
            onPress: () => {
              onClose();
              
              
              Alert.alert('Fund Wallet', 'Wallet funding feature coming soon!');
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay ₦${bookingAmount.toLocaleString()} from your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              setPaying(true);

              
              const response = await bookingAPI.payFromWallet({ bookingId });

              if (response.success) {
                Alert.alert(
                  'Success! 🎉',
                  'Payment successful! Your booking is now confirmed.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        onClose();
                        onPaymentSuccess();
                      },
                    },
                  ]
                );
              }
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Payment Failed', apiError.message);
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  const handlePayWithCard = () => {
    
    onClose();
    
    
    
    navigation.navigate('Payment', {
      bookingId,
      amount: bookingAmount,
    });
  };

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl">
          {}
          <View className="px-6 py-4 border-b border-gray-100">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">
                Choose Payment Method
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="h-8 w-8 items-center justify-center rounded-full bg-gray-100"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text className="mt-2 text-sm text-gray-600">
              Select how you'd like to pay for this booking
            </Text>
          </View>

          {loading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color="#eb278d" />
              <Text className="mt-3 text-sm text-gray-500">
                Checking wallet balance...
              </Text>
            </View>
          ) : (
            <View className="px-6 py-6" style={{ gap: 16 }}>
              {/* Amount to Pay */}
              <View className="bg-gray-50 rounded-2xl p-4">
                <Text className="text-sm text-gray-600 mb-1">Amount to Pay</Text>
                <Text className="text-3xl font-bold text-gray-900">
                  {formatPrice(bookingAmount)}
                </Text>
              </View>

              {/* SharpPAY Wallet Option */}
              <TouchableOpacity
                onPress={handlePayFromWallet}
                disabled={paying}
                className="rounded-2xl overflow-hidden border-2"
                style={{
                  borderColor: canPayFromWallet ? '#eb278d' : '#d1d5db',
                  opacity: paying ? 0.6 : 1,
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    canPayFromWallet
                      ? ['#eb278d', '#f472b6']
                      : ['#f9fafb', '#f3f4f6']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="p-5"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View
                        className="h-12 w-12 items-center justify-center rounded-full mr-3"
                        style={{
                          backgroundColor: canPayFromWallet
                            ? 'rgba(255,255,255,0.3)'
                            : '#e5e7eb',
                        }}
                      >
                        <Ionicons
                          name="wallet"
                          size={24}
                          color={canPayFromWallet ? '#fff' : '#6b7280'}
                        />
                      </View>
                      <View>
                        <Text
                          className="text-lg font-bold"
                          style={{
                            color: canPayFromWallet ? '#fff' : '#111827',
                          }}
                        >
                          SharpPAY Wallet
                        </Text>
                        <Text
                          className="text-sm"
                          style={{
                            color: canPayFromWallet
                              ? 'rgba(255,255,255,0.8)'
                              : '#6b7280',
                          }}
                        >
                          Balance: {formatPrice(walletBalance)}
                        </Text>
                      </View>
                    </View>

                    {canPayFromWallet ? (
                      <View className="bg-white/20 px-3 py-1.5 rounded-full">
                        <Text className="text-xs font-bold text-white">
                          ⚡ INSTANT
                        </Text>
                      </View>
                    ) : (
                      <View className="bg-red-100 px-3 py-1.5 rounded-full">
                        <Text className="text-xs font-bold text-red-700">
                          Low Balance
                        </Text>
                      </View>
                    )}
                  </View>

                  {canPayFromWallet ? (
                    <View
                      className="rounded-xl p-3"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    >
                      <View className="flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#fff"
                        />
                        <Text className="ml-2 text-sm font-medium text-white">
                          Instant payment • No fees
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View className="bg-orange-50 rounded-xl p-3">
                      <Text className="text-sm text-orange-800">
                        <Text className="font-bold">
                          Need {formatPrice(shortfall)} more
                        </Text>{' '}
                        to pay from wallet
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Paystack Card Option */}
              <TouchableOpacity
                onPress={handlePayWithCard}
                disabled={paying}
                className="bg-white border-2 border-gray-200 rounded-2xl p-5"
                style={{ opacity: paying ? 0.6 : 1 }}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100 mr-3">
                      <Ionicons name="card" size={24} color="#3b82f6" />
                    </View>
                    <View>
                      <Text className="text-lg font-bold text-gray-900">
                        Card Payment
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Pay with Debit/Credit Card
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>

                <View className="mt-3 bg-blue-50 rounded-xl p-3">
                  <View className="flex-row items-center">
                    <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
                    <Text className="ml-2 text-sm text-blue-800">
                      Secured by Paystack
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Payment Loading Indicator */}
              {paying && (
                <View className="bg-pink-50 rounded-2xl p-4 flex-row items-center">
                  <ActivityIndicator size="small" color="#eb278d" />
                  <Text className="ml-3 text-sm font-medium text-pink-900">
                    Processing payment...
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PaymentMethodModal;