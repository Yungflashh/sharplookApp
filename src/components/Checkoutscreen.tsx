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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, cartAPI, handleAPIError, userAPI, sharpPayAPI, paymentAPI } from '@/api/api';

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
  coordinates?: [number, number];
}

interface DeliveryFeeInfo {
  distance: number;
  deliveryFee: number;
  estimatedDeliveryTime: string;
  canDeliver: boolean;
  message?: string;
}

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<CheckoutNavigationProp>();
  const route = useRoute<CheckoutRouteProp>();
  const { cartItems } = route.params;

  const [loading, setLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'home_delivery' | 'pickup'>('home_delivery');
  const [customerNotes, setCustomerNotes] = useState('');

  const [locationLoading, setLocationLoading] = useState(false);
  const [savedLocation, setSavedLocation] = useState<any>(null);
  const [showLocationOptions, setShowLocationOptions] = useState(false);

  const [deliveryFeeInfo, setDeliveryFeeInfo] = useState<DeliveryFeeInfo | null>(null);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const [addressError, setAddressError] = useState('');

  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    additionalInfo: '',
  });

  useEffect(() => {
    fetchUserLocation();
  }, []);

  useEffect(() => {
    if (deliveryType === 'home_delivery' && deliveryAddress.coordinates) {
      calculateDeliveryFeeForCart();
    }
  }, [deliveryAddress.coordinates, deliveryType]);

  const fetchUserLocation = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response.success && response.data.user.location) {
        setSavedLocation(response.data.user.location);
      }
    } catch (error) {
      console.error('Error fetching user location:', error);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      setWalletLoading(true);
      const response = await sharpPayAPI.getBalance();
      if (response.success) {
        setWalletBalance(response.data?.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  const useSavedLocation = () => {
    if (savedLocation) {
      setDeliveryAddress({
        ...deliveryAddress,
        address: savedLocation.address || '',
        city: savedLocation.city || '',
        state: savedLocation.state || '',
        country: savedLocation.country || 'Nigeria',
        coordinates: savedLocation.coordinates || undefined,
      });
      setShowLocationOptions(false);
      // Clear address error if saved location is valid
      if (savedLocation.address && savedLocation.address.trim().length >= 10) {
        setAddressError('');
      }
      Alert.alert('Success', 'Saved location applied!');
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to calculate delivery fees.',
          [{ text: 'OK' }]
        );
        setLocationLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;

      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocode && geocode.length > 0) {
        const addressData = geocode[0];
        const addressString = `${addressData.street || ''} ${addressData.streetNumber || ''}`.trim() || 'Address not available';

        setDeliveryAddress({
          ...deliveryAddress,
          address: addressString,
          city: addressData.city || addressData.subregion || '',
          state: addressData.region || '',
          country: addressData.country || 'Nigeria',
          coordinates: [longitude, latitude],
        });

        // Clear address error if location address is valid
        if (addressString.trim().length >= 10) {
          setAddressError('');
        }

        setShowLocationOptions(false);
        Alert.alert('Success', 'Current location captured!');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your location. Please ensure location services are enabled.',
        [{ text: 'OK' }]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const calculateDeliveryFeeForCart = async () => {
    if (!deliveryAddress.coordinates) return;

    setDeliveryFeeLoading(true);

    try {
      const firstItem = cartItems[0];

      if (!firstItem?.product?._id) {
        throw new Error('Invalid cart items');
      }

      const [longitude, latitude] = deliveryAddress.coordinates;

      const response = await orderAPI.calculateDeliveryFee(
        firstItem.product._id,
        latitude,
        longitude
      );

      if (response.success) {
        setDeliveryFeeInfo(response.data);

        if (!response.data.canDeliver) {
          Alert.alert(
            'Delivery Not Available',
            response.data.message || 'This location is outside the delivery range.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to calculate delivery fee');
    } finally {
      setDeliveryFeeLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total: number, item: any) => {
      return total + item.product.finalPrice * item.quantity;
    }, 0);
  };

  const calculateDeliveryFee = () => {
    if (deliveryType === 'pickup') return 0;

    if (deliveryFeeInfo && deliveryFeeInfo.canDeliver) {
      return deliveryFeeInfo.deliveryFee;
    }

    return 0;
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

      // Address validation with length check
      const address = deliveryAddress.address.trim();
      if (!address) {
        Alert.alert('Required', 'Please enter your delivery address');
        setAddressError('Address is required');
        return false;
      }
      if (address.length < 10) {
        Alert.alert('Invalid Address', 'Address must be at least 10 characters long');
        setAddressError('Address must be at least 10 characters');
        return false;
      }
      if (address.length > 500) {
        Alert.alert('Invalid Address', 'Address must be less than 500 characters');
        setAddressError('Address must be less than 500 characters');
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

      if (!deliveryAddress.coordinates || deliveryAddress.coordinates.length !== 2) {
        Alert.alert('Location Required', 'Please select your location to calculate delivery fee.', [
          {
            text: 'Add Location',
            onPress: () => setShowLocationOptions(true),
          },
        ]);
        return false;
      }

      if (deliveryFeeInfo && !deliveryFeeInfo.canDeliver) {
        Alert.alert(
          'Delivery Not Available',
          deliveryFeeInfo.message || 'This location is outside the delivery range.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }

    return true;
  };

  const handleProceedToPayment = async () => {
    if (!validateForm()) return;

    await fetchWalletBalance();
    setShowPaymentModal(true);
  };

  const handlePayFromWallet = async () => {
    const totalAmount = calculateTotal();

    if (walletBalance < totalAmount) {
      const shortfall = totalAmount - walletBalance;
      Alert.alert(
        'Insufficient Balance',
        `You need ₦${shortfall.toLocaleString()} more in your wallet. Would you like to fund your wallet?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Fund Wallet',
            onPress: () => {
              setShowPaymentModal(false);
              Alert.alert('Fund Wallet', 'Wallet funding feature coming soon!');
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay ₦${totalAmount.toLocaleString()} from your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              setPaymentProcessing(true);

              const orderData = {
                items: cartItems.map((item: any) => ({
                  product: item.product._id,
                  quantity: item.quantity,
                  selectedVariant: item.selectedVariant,
                })),
                deliveryType,
                deliveryAddress:
                  deliveryType === 'home_delivery'
                    ? {
                        ...deliveryAddress,
                        coordinates: deliveryAddress.coordinates,
                      }
                    : undefined,
                paymentMethod: 'wallet',
                customerNotes: customerNotes.trim() || undefined,
              };

              console.log('📦 Creating order with wallet payment:', orderData);

              const orderResponse = await orderAPI.createOrder(orderData);

              if (orderResponse.success) {
                const order = orderResponse.data.order;
                console.log('✅ Order created:', order._id);

                const paymentResponse = await paymentAPI.payOrderFromWallet(order._id);

                if (paymentResponse.success) {
                  await cartAPI.clearCart();

                  setShowPaymentModal(false);

                  Alert.alert('Success! 🎉', 'Payment successful! Your order has been placed.', [
                    {
                      text: 'View Order',
                      onPress: () => {
                        navigation.replace('OrderDetail', { orderId: order._id });
                      },
                    },
                  ]);
                }
              }
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Payment Failed', apiError.message);
            } finally {
              setPaymentProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handlePayWithCard = async () => {
    setShowPaymentModal(false);

    try {
      setLoading(true);

      const orderData = {
        items: cartItems.map((item: any) => ({
          product: item.product._id,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant,
        })),
        deliveryType,
        deliveryAddress:
          deliveryType === 'home_delivery'
            ? {
                ...deliveryAddress,
                coordinates: deliveryAddress.coordinates,
              }
            : undefined,
        paymentMethod: 'card',
        customerNotes: customerNotes.trim() || undefined,
      };

      console.log('📦 Creating order with card payment:', orderData);

      const response = await orderAPI.createOrder(orderData);

      if (response.success) {
        const order = response.data.order;
        console.log('✅ Order created:', order._id);

        await cartAPI.clearCart();

        navigation.replace('OrderPayment', {
          orderId: order._id,
          amount: order.totalAmount,
          orderNumber: order.orderNumber,
        });
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const canPayFromWallet = walletBalance >= calculateTotal();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
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
          {/* Delivery Method */}
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
                    <Text className="text-gray-500 text-sm">
                      {deliveryFeeInfo && deliveryFeeInfo.canDeliver
                        ? `${formatPrice(deliveryFeeInfo.deliveryFee)} • ${
                            deliveryFeeInfo.estimatedDeliveryTime
                          }`
                        : 'Calculated based on your location'}
                    </Text>
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
                    <Text className="text-gray-500 text-sm">Pickup from seller • Free</Text>
                  </View>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    deliveryType === 'pickup' ? 'border-pink-500 bg-pink-500' : 'border-gray-300'
                  }`}
                >
                  {deliveryType === 'pickup' && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Delivery Address */}
          {deliveryType === 'home_delivery' && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-900 text-lg font-bold">Delivery Address</Text>
                <TouchableOpacity
                  onPress={() => setShowLocationOptions(!showLocationOptions)}
                  className="flex-row items-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={18} color="#ec4899" />
                  <Text className="text-pink-500 font-semibold ml-1">Add Location</Text>
                </TouchableOpacity>
              </View>

              {/* Location Options */}
              {showLocationOptions && (
                <View className="bg-white rounded-2xl p-4 mb-4" style={{ gap: 12 }}>
                  {savedLocation && (
                    <TouchableOpacity
                      onPress={useSavedLocation}
                      className="bg-pink-50 border border-pink-200 rounded-xl p-4"
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="bookmark" size={20} color="#ec4899" />
                        <Text className="text-pink-600 font-semibold ml-2">Use Saved Location</Text>
                      </View>
                      <Text className="text-gray-700 text-sm">
                        {savedLocation.address}, {savedLocation.city}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={getCurrentLocation}
                    disabled={locationLoading}
                    className={`bg-blue-50 border border-blue-200 rounded-xl p-4 flex-row items-center justify-center ${
                      locationLoading ? 'opacity-50' : ''
                    }`}
                    activeOpacity={0.7}
                  >
                    {locationLoading ? (
                      <>
                        <ActivityIndicator size="small" color="#3b82f6" />
                        <Text className="text-blue-600 font-semibold ml-3">Getting Location...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="navigate" size={20} color="#3b82f6" />
                        <Text className="text-blue-600 font-semibold ml-2">
                          Use Current Location
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Delivery Fee Loading */}
              {deliveryFeeLoading && (
                <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex-row items-center">
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text className="text-blue-700 ml-3">Calculating delivery fee...</Text>
                </View>
              )}

              {/* Delivery Fee Info */}
              {deliveryFeeInfo && !deliveryFeeLoading && (
                <View
                  className={`rounded-2xl p-4 mb-4 ${
                    deliveryFeeInfo.canDeliver
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name={deliveryFeeInfo.canDeliver ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={deliveryFeeInfo.canDeliver ? '#059669' : '#dc2626'}
                    />
                    <Text
                      className={`font-semibold ml-2 ${
                        deliveryFeeInfo.canDeliver ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {deliveryFeeInfo.canDeliver ? 'Delivery Available' : 'Delivery Not Available'}
                    </Text>
                  </View>

                  {deliveryFeeInfo.canDeliver ? (
                    <>
                      <Text className="text-gray-700 text-sm mb-1">
                        📍 Distance: {deliveryFeeInfo.distance} km
                      </Text>
                      <Text className="text-gray-700 text-sm mb-1">
                        💰 Fee: {formatPrice(deliveryFeeInfo.deliveryFee)}
                      </Text>
                      <Text className="text-gray-700 text-sm">
                        🚚 Estimated: {deliveryFeeInfo.estimatedDeliveryTime}
                      </Text>
                    </>
                  ) : (
                    <Text className="text-red-600 text-sm">{deliveryFeeInfo.message}</Text>
                  )}
                </View>
              )}

              {/* Address Form */}
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
                    onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, phone: text })}
                  />
                </View>

                <View>
                  <Text className="text-gray-700 text-sm font-semibold mb-2">Address *</Text>
                  <TextInput
                    className={`bg-gray-50 px-4 py-3 rounded-xl text-gray-900 ${
                      addressError ? 'border-2 border-red-500' : ''
                    }`}
                    placeholder="Enter full street address (min. 10 characters)"
                    multiline
                    numberOfLines={2}
                    value={deliveryAddress.address}
                    onChangeText={(text) => {
                      setDeliveryAddress({ ...deliveryAddress, address: text });
                      // Clear error when user starts typing and reaches valid length
                      if (addressError && text.trim().length >= 10) {
                        setAddressError('');
                      }
                    }}
                    maxLength={500}
                  />

                  {/* Character count and validation feedback */}
                  <View className="flex-row items-center justify-between mt-1.5">
                    {addressError ? (
                      <View className="flex-row items-center flex-1">
                        <Ionicons name="alert-circle" size={14} color="#ef4444" />
                        <Text className="text-red-500 text-xs ml-1">{addressError}</Text>
                      </View>
                    ) : (
                      <Text
                        className={`text-xs ${
                          deliveryAddress.address.trim().length < 10
                            ? 'text-orange-600 font-semibold'
                            : 'text-green-600 font-semibold'
                        }`}
                      >
                        {deliveryAddress.address.trim().length < 10
                          ? `${10 - deliveryAddress.address.trim().length} more characters needed`
                          : '✓ Valid address'}
                      </Text>
                    )}
                    <Text className="text-xs text-gray-400">
                      {deliveryAddress.address.length}/500
                    </Text>
                  </View>
                </View>

                <View className="flex-row" style={{ gap: 12 }}>
                  <View className="flex-1">
                    <Text className="text-gray-700 text-sm font-semibold mb-2">City *</Text>
                    <TextInput
                      className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                      placeholder="City"
                      value={deliveryAddress.city}
                      onChangeText={(text) => setDeliveryAddress({ ...deliveryAddress, city: text })}
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

          {/* Order Notes */}
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

          {/* Order Summary */}
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
                  {deliveryType === 'pickup'
                    ? 'Free'
                    : deliveryFeeLoading
                    ? 'Calculating...'
                    : formatPrice(calculateDeliveryFee())}
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

      {/* Bottom Action */}
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
          onPress={handleProceedToPayment}
          disabled={
            loading ||
            deliveryFeeLoading ||
            (deliveryType === 'home_delivery' && deliveryFeeInfo && !deliveryFeeInfo.canDeliver)
          }
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
                <Ionicons name="card" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text className="text-white text-lg font-bold mr-2">Proceed to Payment</Text>
                <Text className="text-white text-lg font-bold">{formatPrice(calculateTotal())}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View className="mt-3 flex-row items-center justify-center">
          <Ionicons name="shield-checkmark" size={16} color="#10b981" />
          <Text className="text-gray-500 text-xs ml-2">Secure payment • Wallet or Card</Text>
        </View>
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl">
            {/* Modal Header */}
            <View className="px-6 py-4 border-b border-gray-100">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-gray-900">Choose Payment Method</Text>
                <TouchableOpacity
                  onPress={() => setShowPaymentModal(false)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-gray-100"
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#374151" />
                </TouchableOpacity>
              </View>
              <Text className="mt-2 text-sm text-gray-600">
                Select how you'd like to pay for this order
              </Text>
            </View>

            {walletLoading ? (
              <View className="items-center justify-center py-12">
                <ActivityIndicator size="large" color="#eb278d" />
                <Text className="mt-3 text-sm text-gray-500">Checking wallet balance...</Text>
              </View>
            ) : (
              <View className="px-6 py-6" style={{ gap: 16 }}>
                {/* Amount to Pay */}
                <View className="bg-gray-50 rounded-2xl p-4">
                  <Text className="text-sm text-gray-600 mb-1">Total Amount</Text>
                  <Text className="text-3xl font-bold text-gray-900">
                    {formatPrice(calculateTotal())}
                  </Text>
                </View>

                {/* SharpPAY Wallet Option */}
                <TouchableOpacity
                  onPress={handlePayFromWallet}
                  disabled={paymentProcessing}
                  className="rounded-2xl overflow-hidden border-2"
                  style={{
                    borderColor: canPayFromWallet ? '#eb278d' : '#d1d5db',
                    opacity: paymentProcessing ? 0.6 : 1,
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={canPayFromWallet ? ['#eb278d', '#f472b6'] : ['#f9fafb', '#f3f4f6']}
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
                            style={{ color: canPayFromWallet ? '#fff' : '#111827' }}
                          >
                            SharpPAY Wallet
                          </Text>
                          <Text
                            className="text-sm"
                            style={{
                              color: canPayFromWallet ? 'rgba(255,255,255,0.8)' : '#6b7280',
                            }}
                          >
                            Balance: {formatPrice(walletBalance)}
                          </Text>
                        </View>
                      </View>

                      {canPayFromWallet ? (
                        <View className="bg-white/20 px-3 py-1.5 rounded-full">
                          <Text className="text-xs font-bold text-white">⚡ INSTANT</Text>
                        </View>
                      ) : (
                        <View className="bg-red-100 px-3 py-1.5 rounded-full">
                          <Text className="text-xs font-bold text-red-700">Low Balance</Text>
                        </View>
                      )}
                    </View>

                    {canPayFromWallet ? (
                      <View
                        className="rounded-xl p-3"
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="checkmark-circle" size={16} color="#fff" />
                          <Text className="ml-2 text-sm font-medium text-white">
                            Instant payment • No fees
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="bg-orange-50 rounded-xl p-3">
                        <Text className="text-sm text-orange-800">
                          <Text className="font-bold">
                            Need {formatPrice(calculateTotal() - walletBalance)} more
                          </Text>{' '}
                          to pay from wallet
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Card Payment Option */}
                <TouchableOpacity
                  onPress={handlePayWithCard}
                  disabled={paymentProcessing}
                  className="bg-white border-2 border-gray-200 rounded-2xl p-5"
                  style={{ opacity: paymentProcessing ? 0.6 : 1 }}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100 mr-3">
                        <Ionicons name="card" size={24} color="#3b82f6" />
                      </View>
                      <View>
                        <Text className="text-lg font-bold text-gray-900">Card Payment</Text>
                        <Text className="text-sm text-gray-600">Pay with Debit/Credit Card</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </View>

                  <View className="mt-3 bg-blue-50 rounded-xl p-3">
                    <View className="flex-row items-center">
                      <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
                      <Text className="ml-2 text-sm text-blue-800">Secured by Paystack</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Processing Indicator */}
                {paymentProcessing && (
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
    </SafeAreaView>
  );
};

export default CheckoutScreen;