import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface CartItem {
  id: string;
  name: string;
  vendor: string;
  price: number;
  quantity: number;
  image: string;
  duration: string;
}

const CartScreen: React.FC = () => {
  const [promoCode, setPromoCode] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Hair Styling & Treatment',
      vendor: 'AdeChioma Signature',
      price: 15000,
      quantity: 1,
      image: '',
      duration: '2 hours',
    },
    {
      id: '2',
      name: 'Full Body Spa Massage',
      vendor: 'Tossyglams Spa',
      price: 25000,
      quantity: 1,
      image: '',
      duration: '90 minutes',
    },
    {
      id: '3',
      name: 'Professional Makeup',
      vendor: 'Rin_Adex Beauty',
      price: 20000,
      quantity: 1,
      image: '',
      duration: '1 hour',
    },
  ]);

  const updateQuantity = (id: string, increment: boolean) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.id === id) {
          const newQuantity = increment ? item.quantity + 1 : Math.max(1, item.quantity - 1);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = 0;
  const deliveryFee = 0;
  const total = subtotal - discount + deliveryFee;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-5 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity className="w-10 h-10 items-center justify-center mr-3">
              <Ionicons name="arrow-back" size={24} color="#eb278d" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">My Cart</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {cartItems.length > 0 ? (
          <>
            {/* Cart Items */}
            <View className="px-5 py-4">
              {cartItems.map((item, index) => (
                <View
                  key={item.id}
                  className="bg-white rounded-2xl mb-3 overflow-hidden"
                  style={{
                    ...Platform.select({
                      ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                      },
                      android: {
                        elevation: 3,
                      },
                    }),
                  }}
                >
                  <View className="flex-row p-4">
                    {/* Service Image */}
                    <View className="w-24 h-24 rounded-xl bg-pink-50 items-center justify-center mr-3">
                      <Ionicons name="sparkles" size={40} color="#eb278d" />
                    </View>

                    {/* Service Details */}
                    <View className="flex-1">
                      <View className="flex-row items-start justify-between mb-1">
                        <Text className="text-base font-bold text-gray-900 flex-1 pr-2">
                          {item.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeItem(item.id)}
                          className="w-7 h-7 rounded-full bg-red-50 items-center justify-center"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>

                      <Text className="text-xs text-gray-500 mb-2">{item.vendor}</Text>

                      <View className="flex-row items-center mb-3">
                        <Ionicons name="time-outline" size={14} color="#9ca3af" />
                        <Text className="text-xs text-gray-500 ml-1">{item.duration}</Text>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <Text className="text-lg font-bold text-pink-600">
                          ₦{(item.price * item.quantity).toLocaleString()}
                        </Text>

                        {/* Quantity Controls */}
                        <View className="flex-row items-center">
                          <TouchableOpacity
                            onPress={() => updateQuantity(item.id, false)}
                            className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center"
                            activeOpacity={0.7}
                          >
                            <Ionicons name="remove" size={16} color="#6b7280" />
                          </TouchableOpacity>
                          <Text className="mx-3 text-base font-bold text-gray-900">
                            {item.quantity}
                          </Text>
                          <TouchableOpacity
                            onPress={() => updateQuantity(item.id, true)}
                            className="w-8 h-8 rounded-lg bg-pink-500 items-center justify-center"
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Promo Code */}
            <View className="px-5 py-2">
              <View
                className="bg-white rounded-2xl p-4"
                style={{
                  ...Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                    },
                    android: {
                      elevation: 2,
                    },
                  }),
                }}
              >
                <Text className="text-sm font-bold text-gray-900 mb-3">Promo Code</Text>
                <View className="flex-row items-center">
                  <View className="flex-1 flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mr-2">
                    <Ionicons name="pricetag-outline" size={20} color="#9ca3af" />
                    <TextInput
                      className="flex-1 ml-2 text-sm text-gray-900"
                      placeholder="Enter promo code"
                      placeholderTextColor="#9ca3af"
                      value={promoCode}
                      onChangeText={setPromoCode}
                    />
                  </View>
                  <TouchableOpacity
                    className="bg-pink-500 px-6 py-3 rounded-xl"
                    activeOpacity={0.8}
                  >
                    <Text className="text-white font-bold text-sm">Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Price Summary */}
            <View className="px-5 py-4">
              <View
                className="bg-white rounded-2xl p-4"
                style={{
                  ...Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                    },
                    android: {
                      elevation: 2,
                    },
                  }),
                }}
              >
                <Text className="text-base font-bold text-gray-900 mb-4">Order Summary</Text>

                <View className="flex-row justify-between mb-3">
                  <Text className="text-sm text-gray-600">Subtotal</Text>
                  <Text className="text-sm font-semibold text-gray-900">
                    ₦{subtotal.toLocaleString()}
                  </Text>
                </View>

                {discount > 0 && (
                  <View className="flex-row justify-between mb-3">
                    <Text className="text-sm text-gray-600">Discount</Text>
                    <Text className="text-sm font-semibold text-green-600">
                      -₦{discount.toLocaleString()}
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between mb-3">
                  <Text className="text-sm text-gray-600">Delivery Fee</Text>
                  <Text className="text-sm font-semibold text-gray-900">
                    {deliveryFee === 0 ? 'Free' : `₦${deliveryFee.toLocaleString()}`}
                  </Text>
                </View>

                <View className="border-t border-gray-200 pt-3 mt-2">
                  <View className="flex-row justify-between">
                    <Text className="text-base font-bold text-gray-900">Total</Text>
                    <Text className="text-xl font-bold text-pink-600">
                      ₦{total.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Padding */}
            <View className="h-32" />
          </>
        ) : (
          // Empty Cart
          <View className="flex-1 items-center justify-center px-5 py-20">
            <View className="w-32 h-32 rounded-full bg-pink-50 items-center justify-center mb-6">
              <Ionicons name="cart-outline" size={64} color="#eb278d" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              Looks like you haven't added any services yet
            </Text>
            <TouchableOpacity
              className="bg-pink-500 px-8 py-4 rounded-xl"
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold">Browse Services</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Checkout Button */}
      {cartItems.length > 0 && (
        <View
          className="px-5 py-4 bg-white border-t border-gray-200"
          style={{
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              },
              android: {
                elevation: 8,
              },
            }),
          }}
        >
          <TouchableOpacity activeOpacity={0.9}>
            <LinearGradient
              colors={['#eb278d', '#f472b6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="py-4 rounded-xl items-center"
              style={{
                shadowColor: '#eb278d',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <View className="flex-row items-center justify-center">
                <Text className="text-white text-lg font-bold mr-2">Proceed to Checkout</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </View>
              <Text className="text-white/90 text-xs mt-1">
                ₦{total.toLocaleString()}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default CartScreen;