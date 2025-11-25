import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation.types';
import { walletAPI, handleAPIError } from '@/api/api';

interface WalletFundingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const WalletFundingModal: React.FC<WalletFundingModalProps> = ({
  visible,
  onClose,
  onSuccess,
  currentBalance,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  
  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  const formatCurrency = (value: number) => {
    return `₦${value.toLocaleString()}`;
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
  };

  const handleInitializeFunding = async () => {
    
    const fundAmount = parseFloat(amount);

    if (isNaN(fundAmount) || fundAmount < 100) {
      Alert.alert('Invalid Amount', 'Minimum funding amount is ₦100');
      return;
    }

    if (fundAmount > 1000000) {
      Alert.alert('Invalid Amount', 'Maximum funding amount is ₦1,000,000');
      return;
    }

    try {
      setLoading(true);

      
      const response = await walletAPI.initializeWalletFunding(fundAmount, {
        source: 'mobile_app',
        type: 'wallet_funding',
      });

      console.log('✅ Wallet funding initialized:', response);

      if (response.success) {
        const { authorizationUrl, reference, payment } = response.data;

        
        handleClose();

        
        navigation.navigate('WalletPayment', {
          amount: fundAmount,
          reference: reference,
          authorizationUrl: authorizationUrl,
          paymentId: payment?._id || payment?.id,
        });
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl max-h-[90%]">
          {}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-900">Fund Wallet</Text>
            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 items-center justify-center rounded-full bg-gray-100"
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
            {}
            <View className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-6">
              <Text className="text-gray-600 text-sm mb-1">Current Balance</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {formatCurrency(currentBalance)}
              </Text>
            </View>

            {}
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Quick Select
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {quickAmounts.map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  onPress={() => handleQuickAmount(quickAmount)}
                  className={`px-4 py-3 rounded-xl border-2 ${
                    amount === quickAmount.toString()
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 bg-white'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      amount === quickAmount.toString()
                        ? 'text-pink-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {formatCurrency(quickAmount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {}
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Enter Amount
            </Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 mb-2">
              <Text className="text-xl font-semibold text-gray-600 mr-2">₦</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                className="flex-1 py-4 text-lg font-semibold text-gray-900"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <Text className="text-xs text-gray-500 mb-6">
              Min: ₦100 • Max: ₦1,000,000
            </Text>

            {}
            <View className="bg-blue-50 rounded-2xl p-4 mb-6">
              <View className="flex-row items-center mb-3">
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text className="text-sm font-semibold text-blue-900 ml-2">
                  Supported Payment Methods
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { icon: 'card', label: 'Debit Card' },
                  { icon: 'business', label: 'Bank Transfer' },
                  { icon: 'phone-portrait', label: 'USSD' },
                  { icon: 'qr-code', label: 'QR Code' },
                ].map((method, index) => (
                  <View
                    key={index}
                    className="flex-row items-center bg-white px-3 py-2 rounded-lg"
                  >
                    <Ionicons name={method.icon as any} size={14} color="#3b82f6" />
                    <Text className="text-xs text-gray-700 ml-1.5">
                      {method.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {}
            <TouchableOpacity
              onPress={handleInitializeFunding}
              disabled={!amount || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  !amount || loading
                    ? ['#d1d5db', '#9ca3af']
                    : ['#eb278d', '#f472b6']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="rounded-xl py-4 items-center"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="card" size={20} color="white" />
                    <Text className="text-white text-base font-bold ml-2">
                      Continue to Payment
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {}
            <View className="flex-row items-center justify-center mt-4 mb-2">
              <Ionicons name="shield-checkmark" size={16} color="#10b981" />
              <Text className="text-xs text-gray-500 ml-1">
                Secured by Paystack
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default WalletFundingModal;