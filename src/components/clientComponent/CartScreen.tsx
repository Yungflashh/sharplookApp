import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { cartAPI } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

const PRIMARY   = '#E04079';
const PRI_DARK  = '#B5315F';
const PRI_SOFT  = '#FEF0F5';
const PRI_MUTED = '#FCDCE9';
const TEXT1     = '#111827';
const TEXT2     = '#6B7280';
const TEXT3     = '#9CA3AF';
const BORDER    = '#F3F4F6';
const SURFACE   = '#FFFFFF';
const BG        = '#FFF5F9';

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
    category?: { _id: string; name: string };
    seller: { _id: string; firstName: string; lastName: string };
  };
  quantity: number;
  selectedVariant?: { name: string; option: string };
}

const CartScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();

  const [loading, setLoading]       = useState(true);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [updating, setUpdating]     = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    visible: false, title: '', message: '', onConfirm: () => {},
  });

  const loadCart = async () => {
    try {
      setLoading(true);
      setCart(await cartAPI.getCart());
    } catch {
      toast.error('Error', 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadCart(); }, []));

  const handleUpdateQuantity = async (productId: string, newQty: number, variant?: any) => {
    if (newQty < 1) {
      setConfirmModal({
        visible: true,
        title: 'Remove Item',
        message: 'Remove this item from your cart?',
        onConfirm: async () => {
          try { setCart(await cartAPI.removeFromCart(productId, variant)); }
          catch { toast.error('Error', 'Failed to remove item'); }
        },
      });
      return;
    }
    try {
      setUpdating(productId);
      setCart(await cartAPI.updateCartItem(productId, newQty, variant));
    } catch {
      toast.error('Error', 'Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) { toast.info('Empty Cart', 'Your cart is empty'); return; }
    navigation.navigate('Checkout');
  };

  const subtotal = cart.reduce((t, i) => t + i.product.finalPrice * i.quantity, 0);
  const fmt = (p: number) => `₦ ${p.toLocaleString()}`;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* Header */}
      <View style={{ backgroundColor: SURFACE, paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: PRI_MUTED }}
          >
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT1, letterSpacing: -0.4 }}>My Cart</Text>
            <Text style={{ fontSize: 12, color: TEXT3, fontWeight: '500', marginTop: 1 }}>
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          <View style={{ position: 'relative' }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: PRI_MUTED }}>
              <Ionicons name="cart-outline" size={22} color={PRIMARY} />
            </View>
            {cart.length > 0 && (
              <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: SURFACE }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{cart.length > 99 ? '99+' : cart.length}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Empty state */}
      {cart.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 100, height: 100, borderRadius: 28, backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: PRI_MUTED }}>
            <Ionicons name="cart-outline" size={48} color={PRIMARY} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT1, marginBottom: 8, letterSpacing: -0.4 }}>Your cart is empty</Text>
          <Text style={{ fontSize: 14, color: TEXT2, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
            Add products from the marketplace and they'll appear here
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Marketplace')} activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden' }}>
            <LinearGradient colors={[PRIMARY, PRI_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingHorizontal: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="storefront-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Browse Products</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Cart items */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {cart.map((item) => {
              const { product, quantity, selectedVariant } = item;
              const isUpdating = updating === product._id;
              return (
                <View
                  key={`${product._id}-${JSON.stringify(selectedVariant)}`}
                  style={{
                    backgroundColor: SURFACE,
                    borderRadius: 16,
                    marginBottom: 12,
                    padding: 14,
                    flexDirection: 'row',
                    borderWidth: 1,
                    borderColor: BORDER,
                    ...Platform.select({
                      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
                      android: { elevation: 2 },
                    }),
                  }}
                >
                  {/* Image */}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
                    activeOpacity={0.88}
                  >
                    <Image
                      source={{ uri: product.images[0] }}
                      style={{ width: 76, height: 76, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>

                  {/* Details */}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 3 }} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: TEXT3, fontWeight: '500', marginBottom: 6 }}>
                      {product.category?.name ?? `${product.seller.firstName} ${product.seller.lastName}`}
                    </Text>

                    {selectedVariant && (
                      <Text style={{ fontSize: 11, color: TEXT2, marginBottom: 4 }}>
                        {selectedVariant.name}: {selectedVariant.option}
                      </Text>
                    )}

                    {/* Price row + stepper */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: PRIMARY, letterSpacing: -0.3 }}>
                        {fmt(product.finalPrice)}
                      </Text>

                      {/* Stepper */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: PRI_SOFT, borderRadius: 20, paddingHorizontal: 4, paddingVertical: 3, borderWidth: 1, borderColor: PRI_MUTED, gap: 2 }}>
                        <TouchableOpacity
                          onPress={() => handleUpdateQuantity(product._id, quantity - 1, selectedVariant)}
                          disabled={isUpdating}
                          activeOpacity={0.7}
                          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: PRI_MUTED }}
                        >
                          <Ionicons name="remove" size={15} color={PRIMARY} />
                        </TouchableOpacity>

                        <View style={{ width: 26, alignItems: 'center' }}>
                          {isUpdating
                            ? <ActivityIndicator size="small" color={PRIMARY} />
                            : <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT1 }}>{quantity}</Text>
                          }
                        </View>

                        <TouchableOpacity
                          onPress={() => handleUpdateQuantity(product._id, quantity + 1, selectedVariant)}
                          disabled={isUpdating || quantity >= product.stock}
                          activeOpacity={0.7}
                          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: quantity >= product.stock ? PRI_MUTED : PRIMARY, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Ionicons name="add" size={15} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={{ backgroundColor: SURFACE, paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: BORDER }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 13, color: TEXT2, fontWeight: '500' }}>Subtotal</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT1 }}>{fmt(subtotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: BORDER }}>
              <Text style={{ fontSize: 13, color: TEXT2, fontWeight: '500' }}>Delivery Fee</Text>
              <Text style={{ fontSize: 13, color: TEXT3, fontWeight: '500' }}>Calculated at checkout</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT1 }}>Total</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: PRIMARY, letterSpacing: -0.4 }}>{fmt(subtotal)}</Text>
            </View>

            <TouchableOpacity onPress={handleCheckout} activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient
                colors={[PRIMARY, PRI_DARK]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Check out</Text>
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
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />
    </View>
  );
};

export default CartScreen;
