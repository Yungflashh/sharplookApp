import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { cartAPI } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  gold: '#F59E0B',
  goldSoft: '#FEF3C7',
  green: '#10B981',
  greenSoft: '#D1FAE5',
  orange: '#F97316',
  orangeSoft: '#FFEDD5',
  red: '#EF4444',
  redSoft: '#FEE2E2',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Nav = NativeStackNavigationProp<RootStackParamList, 'Cart'>;

interface CartItem {
  product: {
    _id: string;
    name: string;
    images: string[];
    price: number;
    finalPrice: number;
    compareAtPrice?: number;
    stock: number;
    seller: { _id: string; firstName: string; lastName: string };
  };
  quantity: number;
  selectedVariant?: { name: string; option: string };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CartScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  // ── Data ───────────────────────────────────────────────────────────────────
  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await cartAPI.getCart();
      setCart(cartData);
    } catch {
      toast.error('Error', 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadCart(); }, []));

  const handleUpdateQuantity = async (productId: string, newQty: number, variant?: any) => {
    try {
      setUpdating(productId);
      setCart(await cartAPI.updateCartItem(productId, newQty, variant));
    } catch {
      toast.error('Error', 'Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = (productId: string, variant?: any) => {
    setConfirmModal({
      visible: true,
      title: 'Remove Item',
      message: 'Remove this item from your cart?',
      onConfirm: async () => {
        try {
          setCart(await cartAPI.removeFromCart(productId, variant));
        } catch {
          toast.error('Error', 'Failed to remove item');
        }
      },
    });
  };

  const handleClearCart = () => {
    setConfirmModal({
      visible: true,
      title: 'Clear Cart',
      message: 'Remove all items from your cart?',
      onConfirm: async () => {
        try {
          await cartAPI.clearCart();
          setCart([]);
        } catch {
          toast.error('Error', 'Failed to clear cart');
        }
      },
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) { toast.info('Empty Cart', 'Your cart is empty'); return; }
    const itemsBySeller = cart.reduce((acc, item) => {
      const id = item.product.seller._id;
      if (!acc[id]) acc[id] = [];
      acc[id].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);
    navigation.navigate('Checkout', { cartItems: cart, itemsBySeller: Object.keys(itemsBySeller).length });
  };

  const subtotal = cart.reduce((t, i) => t + i.product.finalPrice * i.quantity, 0);
  const formatPrice = (p: number) => `₦${p.toLocaleString()}`;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>
            Loading cart…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: BRAND.surface,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: BRAND.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 3 },
          }),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: BRAND.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: BRAND.border,
              marginRight: 12,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={BRAND.textPrimary} />
          </TouchableOpacity>

          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 }}>
              My Cart
            </Text>
            <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {cart.length > 0 && (
          <TouchableOpacity
            onPress={handleClearCart}
            activeOpacity={0.8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: BRAND.redSoft,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#FECACA',
            }}
          >
            <Ionicons name="trash-outline" size={18} color={BRAND.red} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── EMPTY STATE ───────────────────────────────────────────────────── */}
      {cart.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View
            style={{
              width: 110,
              height: 110,
              borderRadius: 32,
              backgroundColor: BRAND.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              borderWidth: 1,
              borderColor: BRAND.primaryMuted,
              ...Platform.select({
                ios: { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14 },
                android: { elevation: 5 },
              }),
            }}
          >
            <Ionicons name="cart-outline" size={52} color={BRAND.primary} />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 8, letterSpacing: -0.4 }}>
            Your cart is empty
          </Text>
          <Text style={{ fontSize: 14, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
            Add products from the marketplace and they'll appear here
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('Marketplace')}
            activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={[BRAND.primary, BRAND.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingHorizontal: 28,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="storefront-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Browse Products</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ── CART ITEMS ─────────────────────────────────────────────── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {cart.map((item) => {
              const { product, quantity, selectedVariant } = item;
              const isUpdating = updating === product._id;
              const itemTotal = product.finalPrice * quantity;
              const discount =
                product.compareAtPrice && product.compareAtPrice > product.finalPrice
                  ? Math.round(
                      ((product.compareAtPrice - product.finalPrice) / product.compareAtPrice) * 100
                    )
                  : 0;

              return (
                <View
                  key={`${product._id}-${JSON.stringify(selectedVariant)}`}
                  style={{
                    backgroundColor: BRAND.surface,
                    borderRadius: 20,
                    marginBottom: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: BRAND.border,
                    ...Platform.select({
                      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
                      android: { elevation: 3 },
                    }),
                  }}
                >
                  {/* Top accent bar matching product price tier */}
                  <View style={{ height: 2.5, backgroundColor: BRAND.primaryMuted }} />

                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row' }}>
                      {/* Image */}
                      <TouchableOpacity
                        onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
                        activeOpacity={0.88}
                        style={{
                          width: 90,
                          height: 90,
                          borderRadius: 14,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: BRAND.border,
                        }}
                      >
                        <Image
                          source={{ uri: product.images[0] }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                        {discount > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 6,
                              left: 6,
                              backgroundColor: BRAND.red,
                              paddingHorizontal: 5,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>-{discount}%</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Details */}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: BRAND.textPrimary,
                              lineHeight: 19,
                              marginBottom: 4,
                            }}
                            numberOfLines={2}
                          >
                            {product.name}
                          </Text>
                        </TouchableOpacity>

                        {selectedVariant && (
                          <View
                            style={{
                              backgroundColor: BRAND.surfaceAlt,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 7,
                              alignSelf: 'flex-start',
                              marginBottom: 6,
                              borderWidth: 1,
                              borderColor: BRAND.border,
                            }}
                          >
                            <Text style={{ fontSize: 11, color: BRAND.textSecondary, fontWeight: '500' }}>
                              {selectedVariant.name}: {selectedVariant.option}
                            </Text>
                          </View>
                        )}

                        {/* Price */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <Text style={{ fontSize: 17, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.3 }}>
                            {formatPrice(product.finalPrice)}
                          </Text>
                          {product.compareAtPrice && product.compareAtPrice > product.finalPrice && (
                            <Text
                              style={{
                                fontSize: 12,
                                color: BRAND.textMuted,
                                textDecorationLine: 'line-through',
                                marginLeft: 6,
                              }}
                            >
                              {formatPrice(product.compareAtPrice)}
                            </Text>
                          )}
                        </View>

                        {/* Quantity stepper + delete */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          {/* Stepper */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: BRAND.surfaceAlt,
                              borderRadius: 11,
                              borderWidth: 1,
                              borderColor: BRAND.borderStrong,
                              overflow: 'hidden',
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => handleUpdateQuantity(product._id, quantity - 1, selectedVariant)}
                              disabled={isUpdating || quantity <= 1}
                              style={{
                                width: 34,
                                height: 34,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: quantity <= 1 ? 'transparent' : BRAND.surface,
                              }}
                            >
                              <Ionicons
                                name="remove"
                                size={17}
                                color={quantity <= 1 ? BRAND.textMuted : BRAND.textPrimary}
                              />
                            </TouchableOpacity>

                            <View
                              style={{
                                width: 38,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderLeftWidth: 1,
                                borderRightWidth: 1,
                                borderColor: BRAND.border,
                                height: 34,
                              }}
                            >
                              {isUpdating ? (
                                <ActivityIndicator size="small" color={BRAND.primary} />
                              ) : (
                                <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary }}>
                                  {quantity}
                                </Text>
                              )}
                            </View>

                            <TouchableOpacity
                              onPress={() => handleUpdateQuantity(product._id, quantity + 1, selectedVariant)}
                              disabled={isUpdating || quantity >= product.stock}
                              style={{
                                width: 34,
                                height: 34,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: quantity >= product.stock ? 'transparent' : BRAND.surface,
                              }}
                            >
                              <Ionicons
                                name="add"
                                size={17}
                                color={quantity >= product.stock ? BRAND.textMuted : BRAND.textPrimary}
                              />
                            </TouchableOpacity>
                          </View>

                          {/* Delete */}
                          <TouchableOpacity
                            onPress={() => handleRemoveItem(product._id, selectedVariant)}
                            activeOpacity={0.8}
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              backgroundColor: BRAND.redSoft,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: '#FECACA',
                            }}
                          >
                            <Ionicons name="trash-outline" size={15} color={BRAND.red} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Low stock warning */}
                    {product.stock < 10 && quantity < product.stock && (
                      <View
                        style={{
                          marginTop: 10,
                          backgroundColor: BRAND.orangeSoft,
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: '#FED7AA',
                        }}
                      >
                        <Ionicons name="alert-circle-outline" size={14} color={BRAND.orange} />
                        <Text style={{ fontSize: 12, color: '#9A3412', marginLeft: 6, fontWeight: '500' }}>
                          Only {product.stock - quantity} more available
                        </Text>
                      </View>
                    )}

                    {/* Item total row */}
                    <View
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: BRAND.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 13, color: BRAND.textMuted, fontWeight: '500' }}>
                        {quantity} × {formatPrice(product.finalPrice)}
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.2 }}>
                        {formatPrice(itemTotal)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* ── ORDER SUMMARY + CHECKOUT ────────────────────────────────── */}
          <View
            style={{
              backgroundColor: BRAND.surface,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 16,
              borderTopWidth: 1,
              borderTopColor: BRAND.border,
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 12 },
                android: { elevation: 10 },
              }),
            }}
          >
            {/* Summary rows */}
            <View
              style={{
                backgroundColor: BRAND.surfaceAlt,
                borderRadius: 16,
                padding: 14,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: BRAND.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 13, color: BRAND.textSecondary, fontWeight: '500' }}>
                  Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>
                  {formatPrice(subtotal)}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingBottom: 12,
                  marginBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: BRAND.border,
                }}
              >
                <Text style={{ fontSize: 13, color: BRAND.textSecondary, fontWeight: '500' }}>
                  Delivery fee
                </Text>
                <Text style={{ fontSize: 13, color: BRAND.textMuted, fontWeight: '500' }}>
                  Calculated at checkout
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.textPrimary }}>Total</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.5 }}>
                  {formatPrice(subtotal)}
                </Text>
              </View>
            </View>

            {/* Checkout CTA */}
            <TouchableOpacity onPress={handleCheckout} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
              <LinearGradient
                colors={[BRAND.primary, BRAND.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  ...Platform.select({
                    ios: { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
                    android: { elevation: 5 },
                  }),
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.1 }}>
                  Proceed to Checkout
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
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

export default CartScreen;