import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, cartAPI, handleAPIError } from '@/api/api';

type CheckoutRouteProp = RouteProp<RootStackParamList, 'Checkout'>;
type CheckoutNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;

interface DeliveryAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  additionalInfo: string;
}

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigationProp>();
  const route = useRoute<CheckoutRouteProp>();
  const { cartItems } = route.params;

  const [loading, setLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'home_delivery' | 'pickup'>('home_delivery');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'wallet' | 'ussd'>('card');
  const [customerNotes, setCustomerNotes] = useState('');

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    additionalInfo: '',
  });

  const calculateSubtotal = () => {
    return cartItems.reduce((total: number, item: any) => {
      return total + item.product.finalPrice * item.quantity;
    }, 0);
  };

  const calculateDeliveryFee = () => {
    if (deliveryType === 'pickup') return 0;
    
    
    let totalFee = 0;
    cartItems.forEach((item: any) => {
      if (item.product.deliveryOptions?.deliveryFee) {
        totalFee += item.product.deliveryOptions.deliveryFee;
      }
    });
    
    return totalFee || 1500; 
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateDeliveryFee();
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const validateForm = () => {
    if (deliveryType === 'home_delivery') {
      if (!deliveryAddress.fullName.trim()) {
        Alert.alert('Required', 'Please enter your full name');
        return false;
      }
      if (!deliveryAddress.phone.trim()) {
        Alert.alert('Required', 'Please enter your phone number');
        return false;
      }
      if (!deliveryAddress.address.trim()) {
        Alert.alert('Required', 'Please enter your delivery address');
        return false;
      }
      if (!deliveryAddress.city.trim()) {
        Alert.alert('Required', 'Please enter your city');
        return false;
      }
      if (!deliveryAddress.state.trim()) {
        Alert.alert('Required', 'Please enter your state');
        return false;
      }
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const orderData = {
        items: cartItems.map((item: any) => ({
          product: item.product._id,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant,
        })),
        deliveryType,
        deliveryAddress: deliveryType === 'home_delivery' ? deliveryAddress : undefined,
        paymentMethod,
        customerNotes: customerNotes.trim() || undefined,
      };

      const response = await orderAPI.createOrder(orderData);

      if (response.success) {
        
        await cartAPI.clearCart();

        Alert.alert(
          'Order Created',
          'Your order has been placed successfully. Please proceed to payment.',
          [
            {
              text: 'OK',
              onPress: () => {
                
                navigation.navigate('CustomerOrders');
              },
            },
          ]
        );
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Checkout</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          {}
          <View className="mb-6">
            <Text className="text-gray-900 text-lg font-bold mb-3">Delivery Method</Text>
            
            <TouchableOpacity
              onPress={() => setDeliveryType('home_delivery')}
              className={`p-4 rounded-2xl border-2 mb-3 ${
                deliveryType === 'home_delivery'
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center ${
                      deliveryType === 'home_delivery' ? 'bg-pink-100' : 'bg-gray-100'
                    }`}
                  >
                    <Ionicons
                      name="home"
                      size={24}
                      color={deliveryType === 'home_delivery' ? '#eb278d' : '#6b7280'}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-gray-900 text-base font-bold">Home Delivery</Text>
                    <Text className="text-gray-500 text-sm">Deliver to your address</Text>
                  </View>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    deliveryType === 'home_delivery'
                      ? 'border-pink-500 bg-pink-500'
                      : 'border-gray-300'
                  }`}
                >
                  {deliveryType === 'home_delivery' && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDeliveryType('pickup')}
              className={`p-4 rounded-2xl border-2 ${
                deliveryType === 'pickup'
                  ? 'border-pink-500 bg-pink-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center ${
                      deliveryType === 'pickup' ? 'bg-pink-100' : 'bg-gray-100'
                    }`}
                  >
                    <Ionicons
                      name="storefront"
                      size={24}
                      color={deliveryType === 'pickup' ? '#eb278d' : '#6b7280'}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-gray-900 text-base font-bold">Pickup</Text>
                    <Text className="text-gray-500 text-sm">Pickup from seller</Text>
                  </View>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    deliveryType === 'pickup'
                      ? 'border-pink-500 bg-pink-500'
                      : 'border-gray-300'
                  }`}
                >
                  {deliveryType === 'pickup' && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {}
          {deliveryType === 'home_delivery' && (
            <View className="mb-6">
              <Text className="text-gray-900 text-lg font-bold mb-3">Delivery Address</Text>
              
              <View className="bg-white rounded-2xl p-4" style={{ gap: 12 }}>
                <View>
                  <Text className="text-gray-700 text-sm font-semibold mb-2">Full Name *</Text>
                  <TextInput
                    className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                    placeholder="Enter your full name"
                    value={deliveryAddress.fullName}
                    onChangeText={(text) =>
                      setDeliveryAddress({ ...deliveryAddress, fullName: text })
                    }
                  />
                </View>

                <View>
                  <Text className="text-gray-700 text-sm font-semibold mb-2">Phone Number *</Text>
                  <TextInput
                    className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                    placeholder="08012345678"
                    keyboardType="phone-pad"
                    value={deliveryAddress.phone}
                    onChangeText={(text) =>
                      setDeliveryAddress({ ...deliveryAddress, phone: text })
                    }
                  />
                </View>

                <View>
                  <Text className="text-gray-700 text-sm font-semibold mb-2">Address *</Text>
                  <TextInput
                    className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                    placeholder="Street address"
                    multiline
                    numberOfLines={2}
                    value={deliveryAddress.address}
                    onChangeText={(text) =>
                      setDeliveryAddress({ ...deliveryAddress, address: text })
                    }
                  />
                </View>

                <View className="flex-row" style={{ gap: 12 }}>
                  <View className="flex-1">
                    <Text className="text-gray-700 text-sm font-semibold mb-2">City *</Text>
                    <TextInput
                      className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                      placeholder="City"
                      value={deliveryAddress.city}
                      onChangeText={(text) =>
                        setDeliveryAddress({ ...deliveryAddress, city: text })
                      }
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-gray-700 text-sm font-semibold mb-2">State *</Text>
                    <TextInput
                      className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                      placeholder="State"
                      value={deliveryAddress.state}
                      onChangeText={(text) =>
                        setDeliveryAddress({ ...deliveryAddress, state: text })
                      }
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-gray-700 text-sm font-semibold mb-2">Additional Info</Text>
                  <TextInput
                    className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                    placeholder="Landmark, gate code, etc. (optional)"
                    value={deliveryAddress.additionalInfo}
                    onChangeText={(text) =>
                      setDeliveryAddress({ ...deliveryAddress, additionalInfo: text })
                    }
                  />
                </View>
              </View>
            </View>
          )}

          {}
          <View className="mb-6">
            <Text className="text-gray-900 text-lg font-bold mb-3">Payment Method</Text>
            
            {['card', 'bank_transfer', 'wallet', 'ussd'].map((method) => (
              <TouchableOpacity
                key={method}
                onPress={() => setPaymentMethod(method as any)}
                className={`p-4 rounded-2xl border-2 mb-3 ${
                  paymentMethod === method
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`w-12 h-12 rounded-full items-center justify-center ${
                        paymentMethod === method ? 'bg-pink-100' : 'bg-gray-100'
                      }`}
                    >
                      <Ionicons
                        name={
                          method === 'card'
                            ? 'card'
                            : method === 'wallet'
                            ? 'wallet'
                            : 'cash'
                        }
                        size={24}
                        color={paymentMethod === method ? '#eb278d' : '#6b7280'}
                      />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-gray-900 text-base font-bold capitalize">
                        {method.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      paymentMethod === method
                        ? 'border-pink-500 bg-pink-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {paymentMethod === method && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {}
          <View className="mb-6">
            <Text className="text-gray-900 text-lg font-bold mb-3">Order Notes (Optional)</Text>
            <TextInput
              className="bg-white px-4 py-3 rounded-2xl text-gray-900 border border-gray-200"
              placeholder="Any special instructions for the seller..."
              multiline
              numberOfLines={3}
              value={customerNotes}
              onChangeText={setCustomerNotes}
            />
          </View>

          {}
          <View className="bg-white p-5 rounded-2xl mb-6">
            <Text className="text-gray-900 text-lg font-bold mb-4">Order Summary</Text>
            
            <View style={{ gap: 12 }}>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">Subtotal ({cartItems.length} items)</Text>
                <Text className="text-gray-900 text-sm font-semibold">
                  {formatPrice(calculateSubtotal())}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">Delivery Fee</Text>
                <Text className="text-gray-900 text-sm font-semibold">
                  {deliveryType === 'pickup' ? 'Free' : formatPrice(calculateDeliveryFee())}
                </Text>
              </View>

              <View className="border-t border-gray-200 pt-3 flex-row justify-between items-center">
                <Text className="text-gray-900 text-lg font-bold">Total</Text>
                <Text className="text-pink-600 text-2xl font-bold">
                  {formatPrice(calculateTotal())}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {}
      <View
        className="bg-white px-5 py-4 border-t border-gray-100"
        style={{
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
          }),
        }}
      >
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#eb278d', '#f472b6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 rounded-2xl items-center"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View className="flex-row items-center">
                <Text className="text-white text-lg font-bold mr-2">Place Order</Text>
                <Text className="text-white text-lg font-bold">
                  {formatPrice(calculateTotal())}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View className="mt-3 flex-row items-center justify-center">
          <Ionicons name="shield-checkmark" size={16} color="#10b981" />
          <Text className="text-gray-500 text-xs ml-2">
            Your payment is secure and encrypted
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CheckoutScreen;