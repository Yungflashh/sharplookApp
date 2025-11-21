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
import * as Location from 'expo-location';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, cartAPI, handleAPIError, userAPI } from '@/api/api';

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
        
        setDeliveryAddress({
          ...deliveryAddress,
          address: `${addressData.street || ''} ${addressData.streetNumber || ''}`.trim() || 'Address not available',
          city: addressData.city || addressData.subregion || '',
          state: addressData.region || '',
          country: addressData.country || 'Nigeria',
          coordinates: [longitude, latitude], 
        });

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
      
      
      if (!deliveryAddress.coordinates || deliveryAddress.coordinates.length !== 2) {
        Alert.alert(
          'Location Required',
          'Please select your location to calculate delivery fee.',
          [
            {
              text: 'Add Location',
              onPress: () => setShowLocationOptions(true)
            }
          ]
        );
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

    try {
      setLoading(true);

      
      const orderData = {
        items: cartItems.map((item: any) => ({
          product: item.product._id,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant,
        })),
        deliveryType,
        deliveryAddress: deliveryType === 'home_delivery' ? {
          ...deliveryAddress,
          coordinates: deliveryAddress.coordinates,
        } : undefined,
        paymentMethod: 'card', 
        customerNotes: customerNotes.trim() || undefined,
      };

      console.log('📦 Creating order with data:', orderData);

      
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
                    <Text className="text-gray-500 text-sm">
                      {deliveryFeeInfo && deliveryFeeInfo.canDeliver
                        ? `${formatPrice(deliveryFeeInfo.deliveryFee)} • ${deliveryFeeInfo.estimatedDeliveryTime}`
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

              {}
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
                        <Text className="text-blue-600 font-semibold ml-2">Use Current Location</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {}
              {deliveryFeeLoading && (
                <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex-row items-center">
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text className="text-blue-700 ml-3">Calculating delivery fee...</Text>
                </View>
              )}

              {deliveryFeeInfo && !deliveryFeeLoading && (
                <View className={`rounded-2xl p-4 mb-4 ${
                  deliveryFeeInfo.canDeliver 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <View className="flex-row items-center mb-2">
                    <Ionicons 
                      name={deliveryFeeInfo.canDeliver ? 'checkmark-circle' : 'alert-circle'} 
                      size={20} 
                      color={deliveryFeeInfo.canDeliver ? '#059669' : '#dc2626'} 
                    />
                    <Text className={`font-semibold ml-2 ${
                      deliveryFeeInfo.canDeliver ? 'text-green-700' : 'text-red-700'
                    }`}>
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
          onPress={handleProceedToPayment}
          disabled={loading || deliveryFeeLoading || (deliveryType === 'home_delivery' && deliveryFeeInfo && !deliveryFeeInfo.canDeliver)}
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
            Secure payment powered by Paystack
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CheckoutScreen;