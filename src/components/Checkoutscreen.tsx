import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Platform, StatusBar, Image,
  Modal, Keyboard, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, cartAPI, handleAPIError, userAPI, sharpPayAPI, paymentAPI, walletAPI } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import LocationPickerModal, { LocationResult } from '@/components/LocationPickerModal';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const PRIMARY   = '#E04079';
const PRI_DARK  = '#B5315F';
const PRI_SOFT  = '#FEF0F5';
const PRI_MUTED = '#FCDCE9';
const GREEN     = '#10B981';
const GREEN_SOFT= '#D1FAE5';
const TEXT1     = '#111827';
const TEXT2     = '#6B7280';
const TEXT3     = '#9CA3AF';
const BORDER    = '#F3F4F6';
const SURFACE   = '#FFFFFF';
const BG        = '#FFF5F9';

const STEP_LABELS = ['Cart', 'Delivery', 'Review', 'Payment'];

type Nav = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;

interface CartItem {
  product: {
    _id: string;
    name: string;
    images: string[];
    price: number;
    finalPrice: number;
    stock: number;
    category?: { _id: string; name: string };
    seller: { _id: string; firstName: string; lastName: string };
  };
  quantity: number;
  selectedVariant?: { name: string; option: string };
}

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

// ─── Small components ─────────────────────────────────────────────────────────
const IconInput: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
  hasError?: boolean;
}> = ({ icon, placeholder, value, onChangeText, keyboardType, hasError }) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, borderRadius: 12,
    borderWidth: 1.5, borderColor: hasError ? PRIMARY : BORDER,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    marginBottom: 12,
  }}>
    <Ionicons name={icon} size={17} color={TEXT3} style={{ marginRight: 10 }} />
    <TextInput
      style={{ flex: 1, fontSize: 14, color: TEXT1, paddingVertical: 0 }}
      placeholder={placeholder}
      placeholderTextColor={TEXT3}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCorrect={false}
    />
  </View>
);

const DeliveryMethodCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}> = ({ icon, title, subtitle, selected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: selected ? PRI_SOFT : SURFACE,
      borderRadius: 14, borderWidth: 1.5,
      borderColor: selected ? PRIMARY : BORDER,
      padding: 14, marginBottom: 10,
    }}
  >
    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: selected ? PRI_MUTED : BORDER, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
      <Ionicons name={icon} size={22} color={selected ? PRIMARY : TEXT2} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 2 }}>{title}</Text>
      <Text style={{ fontSize: 12, color: TEXT2 }}>{subtitle}</Text>
    </View>
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? PRIMARY : BORDER, backgroundColor: selected ? PRIMARY : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
    </View>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();

  // step: 0=Delivery, 1=Review, 2=Payment
  const [step, setStep] = useState(0);

  // Cart
  const [cartItems, setCartItems]   = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(true);

  // Delivery
  const [deliveryType, setDeliveryType] = useState<'home_delivery' | 'pickup'>('home_delivery');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    fullName: '', phone: '', address: '', city: '', state: '', country: 'Nigeria', additionalInfo: '',
  });
  const [showMapPicker, setShowMapPicker]       = useState(false);
  const [clientLocation, setClientLocation]     = useState<LocationResult | null>(null);
  const [savedLocation, setSavedLocation]       = useState<LocationResult | null>(null);
  const [deliveryFee, setDeliveryFee]           = useState<number | null>(null);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);

  // Payment
  const [walletBalance, setWalletBalance]       = useState(0);
  const [walletLoading, setWalletLoading]       = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Add to balance sheet
  const [showAddBalance, setShowAddBalance]     = useState(false);
  const [addAmount, setAddAmount]               = useState('');
  const [addBalanceLoading, setAddBalanceLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const submittingRef = useRef(false);

  // ── Data loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setCartLoading(true);
        const [cartData, profileRes] = await Promise.all([
          cartAPI.getCart(),
          userAPI.getProfile().catch(() => null),
        ]);
        setCartItems(cartData);
        const loc = profileRes?.data?.user?.location;
        if (loc?.coordinates) {
          setSavedLocation({
            coordinates: loc.coordinates,
            address: loc.address || '',
            city: loc.city || '',
            state: loc.state || '',
            country: loc.country || 'Nigeria',
          });
        }
      } catch {
        toast.error('Error', 'Failed to load cart');
      } finally {
        setCartLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (deliveryType === 'home_delivery' && clientLocation) {
      calculateDeliveryFee();
    }
  }, [clientLocation, deliveryType]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  // Re-fetch balance when returning from WalletPayment
  useFocusEffect(useCallback(() => {
    if (step === 2) {
      sharpPayAPI.getBalance().then(r => { if (r.success) setWalletBalance(r.data?.balance || 0); }).catch(() => {});
    }
  }, [step]));

  const fmt = (p: number) => `₦ ${p.toLocaleString()}`;

  const subtotal   = cartItems.reduce((t, i) => t + i.product.finalPrice * i.quantity, 0);
  const totalFee   = deliveryType === 'pickup' ? 0 : (deliveryFee ?? 0);
  const total      = subtotal + totalFee;

  const handleLocationConfirm = (result: LocationResult) => {
    setClientLocation(result);
    setShowMapPicker(false);
    setDeliveryAddress(a => ({
      ...a,
      address: result.address,
      city: result.city,
      state: result.state,
      country: result.country || 'Nigeria',
      coordinates: result.coordinates,
    }));
  };

  const calculateDeliveryFee = async () => {
    if (!clientLocation || !cartItems[0]) return;
    setDeliveryFeeLoading(true);
    try {
      const [lng, lat] = clientLocation.coordinates;
      const res = await orderAPI.calculateDeliveryFee(cartItems[0].product._id, lat, lng);
      if (res.success) setDeliveryFee(res.data.canDeliver ? res.data.deliveryFee : 0);
    } catch {} finally {
      setDeliveryFeeLoading(false);
    }
  };

  const validateDelivery = () => {
    if (deliveryType === 'home_delivery') {
      if (!deliveryAddress.fullName.trim()) { toast.error('Required', 'Please enter your full name'); return false; }
      if (!deliveryAddress.phone.trim())    { toast.error('Required', 'Please enter your phone number'); return false; }
      if (!deliveryAddress.address.trim() && !clientLocation) {
        toast.error('Required', 'Please pick your location on the map or enter your address');
        return false;
      }
      if (deliveryAddress.address.trim().length > 0 && deliveryAddress.address.trim().length < 20) {
        toast.error('Address too short', 'Street address must be at least 20 characters');
        return false;
      }
    }
    return true;
  };

  const handleContinue = async () => {
    if (step === 0) {
      if (!validateDelivery()) return;
      setStep(1);
    } else if (step === 1) {
      setWalletLoading(true);
      try {
        const res = await sharpPayAPI.getBalance();
        if (res.success) setWalletBalance(res.data?.balance || 0);
      } catch {} finally { setWalletLoading(false); }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 0) navigation.goBack();
    else setStep(s => s - 1);
  };

  const buildOrderData = (method: 'wallet' | 'card') => ({
    items: cartItems.map(i => ({ product: i.product._id, quantity: i.quantity, selectedVariant: i.selectedVariant })),
    deliveryType,
    deliveryAddress: deliveryType === 'home_delivery' ? deliveryAddress : undefined,
    paymentMethod: method,
  });

  const handlePayFromWallet = () => {
    if (walletBalance < total) {
      setConfirmModal({
        visible: true,
        title: 'Insufficient Balance',
        message: `You need ${fmt(total - walletBalance)} more in your wallet. Fund your wallet to continue.`,
        onConfirm: () => {},
      });
      return;
    }
    setConfirmModal({
      visible: true,
      title: 'Confirm Payment',
      message: `Pay ${fmt(total)} from your LookReal Pay wallet?`,
      onConfirm: async () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        try {
          setPaymentProcessing(true);
          const orderRes = await orderAPI.createOrder(buildOrderData('wallet'));
          const order = orderRes?.data?.order;
          if (!order?._id) {
            toast.error('Payment failed', 'Something went wrong. Please try again.');
            return;
          }
          const payRes = await paymentAPI.payOrderFromWallet(order._id);
          if (payRes.success) {
            await cartAPI.clearCart();
            toast.success('Payment Successful!', 'Your order has been placed!');
            navigation.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [{ name: 'Main' }, { name: 'OrderDetail', params: { orderId: order._id, userType: 'customer' } }],
              })
            );
          }
        } catch (error) {
          toast.error('Payment failed', handleAPIError(error).message || 'Unable to process payment. Please try again.');
        } finally {
          setPaymentProcessing(false);
          submittingRef.current = false;
        }
      },
    });
  };

  const handlePayWithCard = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      setPaymentProcessing(true);
      const res = await orderAPI.createOrder(buildOrderData('card'));
      if (res.success) {
        await cartAPI.clearCart();
        navigation.navigate('WalletPayment', {
          amount: res.data.totalAmount,
          reference: res.data.reference,
          authorizationUrl: res.data.authorizationUrl,
          paymentType: 'order_payment',
        });
      }
    } catch (error) {
      toast.error('Payment failed', handleAPIError(error).message || 'Unable to initiate payment. Please try again.');
    } finally {
      setPaymentProcessing(false);
      submittingRef.current = false;
    }
  };

  const handleAddBalance = async () => {
    const amount = parseInt(addAmount.replace(/[^0-9]/g, ''), 10);
    if (!amount || amount < 100) { toast.error('Minimum ₦100', 'Please enter at least ₦100'); return; }
    try {
      setAddBalanceLoading(true);
      const res = await walletAPI.initializeWalletFunding(amount);
      if (res.success) {
        setShowAddBalance(false);
        setAddAmount('');
        navigation.navigate('WalletPayment', {
          amount,
          reference: res.data.reference,
          authorizationUrl: res.data.authorizationUrl,
          paymentType: 'wallet_funding',
        });
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setAddBalanceLoading(false);
    }
  };

  const HEADER_TITLES = ['Check out', 'Review', 'Payment Method'];

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (cartLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={{ color: TEXT3, fontSize: 13, marginTop: 12, fontWeight: '500' }}>Loading checkout…</Text>
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* Header */}
      <View style={{ backgroundColor: SURFACE, paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.8}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: PRI_MUTED }}
          >
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>

          <Text style={{ flex: 1, marginLeft: 12, fontSize: 19, fontWeight: '800', color: TEXT1, letterSpacing: -0.4 }}>
            {HEADER_TITLES[step]}
          </Text>

          <View style={{ position: 'relative' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: PRI_MUTED }}>
              <Ionicons name="cart-outline" size={20} color={PRIMARY} />
            </View>
            {cartItems.length > 0 && (
              <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: SURFACE }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>{cartItems.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Step progress bar */}
        <View style={{ flexDirection: 'row', paddingBottom: 14, gap: 4 }}>
          {STEP_LABELS.map((label, i) => {
            // Cart(i=0) always active; Delivery(i=1) active when step>=0; Review(i=2) when step>=1; Payment(i=3) when step>=2
            const active = i <= step + 1;
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ height: 4, width: '100%', borderRadius: 2, backgroundColor: active ? PRIMARY : BORDER, marginBottom: 5 }} />
                <Text style={{ fontSize: 9, color: active ? PRIMARY : TEXT3, fontWeight: active ? '700' : '500' }}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── STEP 0: DELIVERY ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Delivery Method */}
          <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT1, marginBottom: 12, letterSpacing: -0.3 }}>Delivery Method</Text>
          <DeliveryMethodCard
            icon="home-outline"
            title="Home Delivery"
            subtitle="Get it delivered to your door step"
            selected={deliveryType === 'home_delivery'}
            onPress={() => setDeliveryType('home_delivery')}
          />
          <DeliveryMethodCard
            icon="location-outline"
            title="Pick up"
            subtitle="Pick up from vendor location"
            selected={deliveryType === 'pickup'}
            onPress={() => setDeliveryType('pickup')}
          />

          {/* Delivery Address */}
          {deliveryType === 'home_delivery' && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT1, marginBottom: 12, letterSpacing: -0.3 }}>Delivery Address</Text>

              <IconInput
                icon="person-outline"
                placeholder="Full Name"
                value={deliveryAddress.fullName}
                onChangeText={t => setDeliveryAddress(a => ({ ...a, fullName: t }))}
              />
              <IconInput
                icon="call-outline"
                placeholder="Phone Number"
                value={deliveryAddress.phone}
                onChangeText={t => setDeliveryAddress(a => ({ ...a, phone: t }))}
                keyboardType="phone-pad"
              />
              <IconInput
                icon="location-outline"
                placeholder="Street Address (min. 20 characters)"
                value={deliveryAddress.address}
                onChangeText={t => setDeliveryAddress(a => ({ ...a, address: t }))}
              />
              {deliveryAddress.address.trim().length > 0 && deliveryAddress.address.trim().length < 20 && (
                <Text style={{ fontSize: 11, color: '#F97316', fontWeight: '500', marginTop: -8, marginBottom: 12, marginLeft: 4 }}>
                  {20 - deliveryAddress.address.trim().length} more characters needed
                </Text>
              )}

              {/* Map picker button */}
              <TouchableOpacity
                onPress={() => setShowMapPicker(true)}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRI_SOFT, borderRadius: 12, paddingVertical: 12, borderWidth: 1.5, borderColor: clientLocation ? PRIMARY : PRI_MUTED, gap: 8, marginTop: 4, marginBottom: 8 }}
              >
                <Ionicons name="map-outline" size={16} color={PRIMARY} />
                <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: '700' }}>
                  {clientLocation ? 'Change Location on Map' : 'Pick Location on Map'}
                </Text>
                {clientLocation && <Ionicons name="checkmark-circle" size={16} color={PRIMARY} />}
              </TouchableOpacity>

              {/* Delivery fee pill */}
              {deliveryFeeLoading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRI_SOFT, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: PRI_MUTED, marginTop: 4 }}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '500' }}>Calculating delivery fee…</Text>
                </View>
              )}
              {deliveryFee !== null && !deliveryFeeLoading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: GREEN_SOFT, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#6EE7B7', marginTop: 4 }}>
                  <Ionicons name="checkmark-circle" size={15} color={GREEN} />
                  <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600' }}>
                    Delivery fee: {fmt(deliveryFee)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── STEP 1: REVIEW ───────────────────────────────────────────────────── */}
      {step === 1 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

          {/* Delivery summary */}
          <View style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT1 }}>Delivery</Text>
              <TouchableOpacity onPress={() => setStep(0)} activeOpacity={0.7}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>Edit</Text>
              </TouchableOpacity>
            </View>
            {[
              { label: 'Name',     value: deliveryAddress.fullName || '—' },
              { label: 'Phone',    value: deliveryAddress.phone || '—' },
              { label: 'Location', value: deliveryType === 'home_delivery' ? 'Home Delivery' : 'Pick Up' },
              ...(deliveryType === 'home_delivery' ? [{ label: 'Address', value: [deliveryAddress.address, deliveryAddress.city, deliveryAddress.state].filter(Boolean).join(', ') || '—' }] : []),
            ].map(row => (
              <View key={row.label} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ width: 72, fontSize: 13, color: TEXT3, fontWeight: '500' }}>{row.label}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: TEXT1, fontWeight: '600' }}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* Order summary */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 10 }}>order summary</Text>
          {cartItems.map(item => (
            <View key={item.product._id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: BORDER }}>
              <Image source={{ uri: item.product.images[0] }} style={{ width: 52, height: 52, borderRadius: 10 }} resizeMode="cover" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT1 }} numberOfLines={1}>{item.product.name}</Text>
                <Text style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>Qty: {item.quantity}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT1, letterSpacing: -0.2 }}>
                {fmt(item.product.finalPrice)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── STEP 2: PAYMENT ──────────────────────────────────────────────────── */}
      {step === 2 && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

          <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT1, marginBottom: 14, letterSpacing: -0.3 }}>
            Choose Payment Method
          </Text>

          {walletLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={{ color: TEXT3, fontSize: 13, marginTop: 10, fontWeight: '500' }}>Loading wallet…</Text>
            </View>
          ) : (
            <>
              {/* LookReal Pay */}
              <TouchableOpacity
                onPress={handlePayFromWallet}
                disabled={paymentProcessing}
                activeOpacity={0.88}
                style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: PRI_MUTED, opacity: paymentProcessing ? 0.6 : 1 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {/* Logo */}
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: PRI_MUTED }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: PRIMARY }}>LR</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT1 }}>LookReal Pay</Text>
                    <Text style={{ fontSize: 12, color: TEXT2, marginTop: 1 }}>Pay with wallet balance</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT3} />
                </View>

                {/* Balance row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER }}>
                  <Text style={{ fontSize: 14, color: TEXT1, fontWeight: '600' }}>
                    Wallet Balance{' '}
                    <Text style={{ fontWeight: '800', color: PRIMARY }}>{fmt(walletBalance)}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAddBalance(true)}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: PRI_SOFT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: PRI_MUTED, gap: 4 }}
                  >
                    <Ionicons name="add-circle-outline" size={14} color={PRIMARY} />
                    <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '700' }}>Add to balance</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {/* Paystack */}
              <TouchableOpacity
                onPress={handlePayWithCard}
                disabled={paymentProcessing}
                activeOpacity={0.88}
                style={{ backgroundColor: SURFACE, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: BORDER, opacity: paymentProcessing ? 0.6 : 1 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#011B33', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#00C3F7', letterSpacing: 0.5 }}>PAY</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT1 }}>Paystack</Text>
                    <Text style={{ fontSize: 12, color: TEXT2, marginTop: 1 }}>Pay With Debit/Credit card</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT3} />
                </View>
              </TouchableOpacity>

              {/* Order items */}
              <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 10 }}>order summary</Text>
              {cartItems.map(item => (
                <View key={item.product._id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Image source={{ uri: item.product.images[0] }} style={{ width: 44, height: 44, borderRadius: 10 }} resizeMode="cover" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: TEXT1 }} numberOfLines={1}>{item.product.name}</Text>
                    <Text style={{ fontSize: 11, color: TEXT3 }}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT1 }}>
                    {fmt(item.product.finalPrice * item.quantity)}
                  </Text>
                </View>
              ))}

              {/* Processing overlay */}
              {paymentProcessing && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: PRI_SOFT, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: PRI_MUTED, marginTop: 8 }}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: '600' }}>Processing payment…</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── BOTTOM BUTTON ─────────────────────────────────────────────────────── */}
      {step < 2 && (
        <View style={{ backgroundColor: SURFACE, paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderTopColor: BORDER }}>
          <TouchableOpacity
            onPress={handleContinue}
            activeOpacity={0.85}
            style={{ borderRadius: 14, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={[PRIMARY, PRI_DARK]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Add to balance bottom sheet */}
      <Modal
        visible={showAddBalance}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setShowAddBalance(false); }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => { Keyboard.dismiss(); setShowAddBalance(false); }}
          />
          <TouchableOpacity activeOpacity={1}>
            <View style={{ backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
              {/* Handle */}
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 20 }} />

              <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT1, marginBottom: 4, letterSpacing: -0.4 }}>Fund Wallet</Text>
              <Text style={{ fontSize: 13, color: TEXT2, marginBottom: 20 }}>
                Current balance: <Text style={{ fontWeight: '700', color: PRIMARY }}>{fmt(walletBalance)}</Text>
              </Text>

              <Text style={{ fontSize: 12, fontWeight: '700', color: TEXT2, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>Amount (₦)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10, marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT3, marginRight: 6 }}>₦</Text>
                <TextInput
                  style={{ flex: 1, fontSize: 16, fontWeight: '700', color: TEXT1, paddingVertical: 0 }}
                  placeholder="Enter amount"
                  placeholderTextColor={TEXT3}
                  value={addAmount}
                  onChangeText={setAddAmount}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                onPress={handleAddBalance}
                disabled={addBalanceLoading || !addAmount || parseInt(addAmount) < 100}
                activeOpacity={0.85}
                style={{ borderRadius: 14, overflow: 'hidden', opacity: (!addAmount || parseInt(addAmount) < 100) ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={[PRIMARY, PRI_DARK]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 15, alignItems: 'center', justifyContent: 'center' }}
                >
                  {addBalanceLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Proceed to Fund Wallet</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <LocationPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleLocationConfirm}
        initialLocation={clientLocation ?? savedLocation}
      />

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

export default CheckoutScreen;
