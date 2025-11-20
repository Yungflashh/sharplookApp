import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { cartAPI } from '@/api/api';

type CartNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Cart'>;

interface CartItem {
  product: {
    _id: string;
    name: string;
    images: string[];
    price: number;
    finalPrice: number;
    compareAtPrice?: number;
    stock: number;
    seller: {
      _id: string;
      firstName: string;
      lastName: string;
    };
  };
  quantity: number;
  selectedVariant?: {
    name: string;
    option: string;
  };
}

const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await cartAPI.getCart();
      setCart(cartData);
    } catch (error) {
      console.error('Load cart error:', error);
      Alert.alert('Error', 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  const handleUpdateQuantity = async (
    productId: string,
    newQuantity: number,
    variant?: any
  ) => {
    try {
      setUpdating(productId);
      const updatedCart = await cartAPI.updateCartItem(productId, newQuantity, variant);
      setCart(updatedCart);
    } catch (error) {
      console.error('Update quantity error:', error);
      Alert.alert('Error', 'Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (productId: string, variant?: any) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item from cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedCart = await cartAPI.removeFromCart(productId, variant);
            setCart(updatedCart);
          } catch (error) {
            console.error('Remove item error:', error);
            Alert.alert('Error', 'Failed to remove item');
          }
        },
      },
    ]);
  };

  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Are you sure you want to clear your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await cartAPI.clearCart();
            setCart([]);
          } catch (error) {
            console.error('Clear cart error:', error);
            Alert.alert('Error', 'Failed to clear cart');
          }
        },
      },
    ]);
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => {
      return total + item.product.finalPrice * item.quantity;
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    
    return subtotal;
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty');
      return;
    }

    
    const itemsBySeller = cart.reduce((acc, item) => {
      const sellerId = item.product.seller._id;
      if (!acc[sellerId]) {
        acc[sellerId] = [];
      }
      acc[sellerId].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);

    
    navigation.navigate('Checkout', { 
      cartItems: cart,
      itemsBySeller: Object.keys(itemsBySeller).length
    });
  };

  const renderCartItem = (item: CartItem) => {
    const { product, quantity, selectedVariant } = item;
    const itemTotal = product.finalPrice * quantity;
    const isUpdating = updating === product._id;

    return (
      <View
        key={`${product._id}-${JSON.stringify(selectedVariant)}`}
        className="bg-white rounded-2xl p-4 mb-3"
        style={{
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
            android: { elevation: 3 },
          }),
        }}
      >
        <View className="flex-row">
          {}
          <TouchableOpacity
            onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
          >
            <Image
              source={{ uri: product.images[0] }}
              className="w-24 h-24 rounded-xl"
              resizeMode="cover"
            />
          </TouchableOpacity>

          {}
          <View className="flex-1 ml-3">
            <TouchableOpacity
              onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
            >
              <Text className="text-gray-900 text-sm font-bold mb-1" numberOfLines={2}>
                {product.name}
              </Text>
            </TouchableOpacity>

            {selectedVariant && (
              <View className="bg-gray-100 px-2 py-1 rounded-lg self-start mb-2">
                <Text className="text-gray-600 text-xs">
                  {selectedVariant.name}: {selectedVariant.option}
                </Text>
              </View>
            )}

            <View className="flex-row items-center mb-2">
              <Text className="text-pink-600 text-lg font-bold">
                {formatPrice(product.finalPrice)}
              </Text>
              {product.compareAtPrice && product.compareAtPrice > product.finalPrice && (
                <Text className="text-gray-400 text-xs line-through ml-2">
                  {formatPrice(product.compareAtPrice)}
                </Text>
              )}
            </View>

            {}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center bg-gray-100 rounded-xl">
                <TouchableOpacity
                  onPress={() =>
                    handleUpdateQuantity(product._id, quantity - 1, selectedVariant)
                  }
                  disabled={isUpdating || quantity <= 1}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={quantity <= 1 ? '#d1d5db' : '#374151'}
                  />
                </TouchableOpacity>

                <View className="w-10 items-center">
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#eb278d" />
                  ) : (
                    <Text className="text-gray-900 text-sm font-bold">{quantity}</Text>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() =>
                    handleUpdateQuantity(product._id, quantity + 1, selectedVariant)
                  }
                  disabled={isUpdating || quantity >= product.stock}
                  className="w-8 h-8 items-center justify-center"
                >
                  <Ionicons
                    name="add"
                    size={18}
                    color={quantity >= product.stock ? '#d1d5db' : '#374151'}
                  />
                </TouchableOpacity>
              </View>

              {}
              <TouchableOpacity
                onPress={() => handleRemoveItem(product._id, selectedVariant)}
                className="w-8 h-8 rounded-full bg-red-100 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {}
        {product.stock < 10 && quantity < product.stock && (
          <View className="mt-3 bg-orange-50 p-2 rounded-lg flex-row items-center">
            <Ionicons name="alert-circle" size={16} color="#f97316" />
            <Text className="text-orange-600 text-xs ml-2">
              Only {product.stock - quantity} more available
            </Text>
          </View>
        )}

        {}
        <View className="mt-3 pt-3 border-t border-gray-100 flex-row justify-between items-center">
          <Text className="text-gray-500 text-sm">Item Total:</Text>
          <Text className="text-gray-900 text-base font-bold">{formatPrice(itemTotal)}</Text>
        </View>
      </View>
    );
  };

  const renderEmptyCart = () => (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <LinearGradient
        colors={['#fce7f3', '#fdf2f8']}
        className="w-32 h-32 rounded-full items-center justify-center mb-6"
      >
        <Ionicons name="cart-outline" size={64} color="#eb278d" />
      </LinearGradient>
      <Text className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</Text>
      <Text className="text-gray-500 text-center mb-6">
        Start adding products to your cart and they'll appear here
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Marketplace')}
        className="bg-pink-500 px-8 py-4 rounded-2xl"
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text className="text-white text-base font-bold">Browse Products</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4">Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pb-4"
      >
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3"
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View>
                <Text className="text-white text-2xl font-bold">My Cart</Text>
                <Text className="text-white/80 text-sm">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>

            {cart.length > 0 && (
              <TouchableOpacity
                onPress={handleClearCart}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {cart.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          {/* Cart Items */}
          <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
            {cart.map(renderCartItem)}

            {/* Delivery Note */}
            <View className="bg-blue-50 p-4 rounded-2xl mb-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <View className="flex-1 ml-3">
                  <Text className="text-blue-900 text-sm font-semibold mb-1">
                    Multiple Sellers
                  </Text>
                  <Text className="text-blue-700 text-xs leading-5">
                    Your cart contains items from different sellers. You'll complete separate
                    orders for each seller during checkout.
                  </Text>
                </View>
              </View>
            </View>

            <View className="h-32" />
          </ScrollView>

          {}
          <View
            className="bg-white px-5 py-4"
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
            {}
            <View className="mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600 text-sm">Subtotal</Text>
                <Text className="text-gray-900 text-sm font-semibold">
                  {formatPrice(calculateSubtotal())}
                </Text>
              </View>
              <View className="flex-row justify-between mb-3 pb-3 border-b border-gray-200">
                <Text className="text-gray-600 text-sm">Delivery Fee</Text>
                <Text className="text-gray-900 text-sm font-semibold">Calculated at checkout</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-900 text-lg font-bold">Total</Text>
                <Text className="text-pink-600 text-2xl font-bold">
                  {formatPrice(calculateTotal())}
                </Text>
              </View>
            </View>

            {}
            <TouchableOpacity
              onPress={handleCheckout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#eb278d', '#f472b6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 rounded-2xl items-center"
                style={{
                  shadowColor: '#eb278d',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-center">
                  <Text className="text-white text-lg font-bold mr-2">Proceed to Checkout</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

export default CartScreen;