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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, cartAPI, handleAPIError, userAPI, sharpPayAPI, paymentAPI } from '@/api/api';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  blue: '#3B82F6',
  blueSoft: '#DBEAFE',
  blueDark: '#1D4ED8',
  green: '#10B981',
  greenSoft: '#D1FAE5',
  gold: '#F59E0B',
  goldSoft: '#FEF3C7',
  orange: '#F97316',
  orangeSoft: '#FFEDD5',
  red: '#EF4444',
  redSoft: '#FEE2E2',
  purple: '#8B5CF6',
  purpleSoft: '#EDE9FE',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Nav = NativeStackNavigationProp<RootStackParamList, 'Checkout'>;
type RouteP = RouteProp<RootStackParamList, 'Checkout'>;

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

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Labelled text field */
const Field: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <View>
    <Text
      style={{
        fontSize: 12,
        fontWeight: '700',
        color: BRAND.textSecondary,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: 7,
      }}
    >
      {label}
      {required && (
        <Text style={{ color: BRAND.primary }}> *</Text>
      )}
    </Text>
    {children}
  </View>
);

/** Styled text input */
const StyledInput: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  hasError?: boolean;
}> = ({ hasError, ...props }) => (
  <TextInput
    style={{
      backgroundColor: BRAND.surfaceAlt,
      borderWidth: 1.5,
      borderColor: hasError ? BRAND.red : BRAND.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 14,
      color: BRAND.textPrimary,
      textAlignVertical: props.multiline ? 'top' : 'center',
    }}
    placeholderTextColor={BRAND.textMuted}
    autoCorrect={false}
    {...props}
  />
);

/** Section wrapper card */
const Section: React.FC<{ title: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  icon,
  children,
  action,
}) => (
  <View
    style={{
      backgroundColor: BRAND.surface,
      borderRadius: 20,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: BRAND.border,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
        android: { elevation: 2 },
      }),
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            backgroundColor: BRAND.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Ionicons name={icon} size={15} color={BRAND.primary} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.2 }}>
          {title}
        </Text>
      </View>
      {action}
    </View>
    {children}
  </View>
);

/** Delivery method option */
const DeliveryOption: React.FC<{
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
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: selected ? BRAND.primary : BRAND.border,
      backgroundColor: selected ? BRAND.primarySoft : BRAND.surfaceAlt,
      marginBottom: 10,
    }}
  >
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: selected ? BRAND.primaryMuted : BRAND.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}
    >
      <Ionicons name={icon} size={22} color={selected ? BRAND.primary : BRAND.textSecondary} />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 2 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: '400' }}>{subtitle}</Text>
    </View>

    {/* Radio dot */}
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: selected ? BRAND.primary : BRAND.borderStrong,
        backgroundColor: selected ? BRAND.primary : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
    </View>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { cartItems } = route.params;
  const insets = useSafeAreaInsets();

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

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchUserLocation(); }, []);

  useEffect(() => {
    if (deliveryType === 'home_delivery' && deliveryAddress.coordinates) {
      calculateDeliveryFeeForCart();
    }
  }, [deliveryAddress.coordinates, deliveryType]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fetchUserLocation = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response.success && response.data.user.location) {
        setSavedLocation(response.data.user.location);
      }
    } catch {}
  };

  const fetchWalletBalance = async () => {
    try {
      setWalletLoading(true);
      const response = await sharpPayAPI.getBalance();
      if (response.success) setWalletBalance(response.data?.balance || 0);
    } catch {} finally { setWalletLoading(false); }
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
      if (savedLocation.address?.trim().length >= 10) setAddressError('');
      Alert.alert('Applied', 'Saved location applied to your address.');
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to calculate delivery fees.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo?.length > 0) {
        const d = geo[0];
        const addr = `${d.street || ''} ${d.streetNumber || ''}`.trim() || 'Address not available';
        setDeliveryAddress({
          ...deliveryAddress,
          address: addr,
          city: d.city || d.subregion || '',
          state: d.region || '',
          country: d.country || 'Nigeria',
          coordinates: [longitude, latitude],
        });
        if (addr.trim().length >= 10) setAddressError('');
        setShowLocationOptions(false);
        Alert.alert('Got it', 'Your current location has been applied.');
      }
    } catch {
      Alert.alert('Location Error', 'Unable to get your location. Please ensure location services are enabled.');
    } finally {
      setLocationLoading(false);
    }
  };

  const calculateDeliveryFeeForCart = async () => {
    if (!deliveryAddress.coordinates) return;
    setDeliveryFeeLoading(true);
    try {
      const firstItem = cartItems[0];
      if (!firstItem?.product?._id) throw new Error('Invalid cart items');
      const [longitude, latitude] = deliveryAddress.coordinates;
      const response = await orderAPI.calculateDeliveryFee(firstItem.product._id, latitude, longitude);
      if (response.success) {
        setDeliveryFeeInfo(response.data);
        if (!response.data.canDeliver) {
          Alert.alert('Delivery Not Available', response.data.message || 'This location is outside the delivery range.');
        }
      }
    } catch (error) {
      Alert.alert('Error', handleAPIError(error).message || 'Failed to calculate delivery fee');
    } finally {
      setDeliveryFeeLoading(false);
    }
  };

  const subtotal = cartItems.reduce((t: number, i: any) => t + i.product.finalPrice * i.quantity, 0);
  const deliveryFee = deliveryType === 'pickup' ? 0 : (deliveryFeeInfo?.canDeliver ? deliveryFeeInfo.deliveryFee : 0);
  const total = subtotal + deliveryFee;
  const formatPrice = (p: number) => `₦${p.toLocaleString()}`;

  const validateForm = () => {
    if (deliveryType === 'home_delivery') {
      if (!deliveryAddress.fullName.trim()) { Alert.alert('Required', 'Please enter your full name'); return false; }
      if (!deliveryAddress.phone.trim()) { Alert.alert('Required', 'Please enter your phone number'); return false; }
      const addr = deliveryAddress.address.trim();
      if (!addr) { Alert.alert('Required', 'Please enter your delivery address'); setAddressError('Address is required'); return false; }
      if (addr.length < 10) { Alert.alert('Invalid Address', 'Address must be at least 10 characters'); setAddressError('Address must be at least 10 characters'); return false; }
      if (!deliveryAddress.city.trim()) { Alert.alert('Required', 'Please enter your city'); return false; }
      if (!deliveryAddress.state.trim()) { Alert.alert('Required', 'Please enter your state'); return false; }
      if (!deliveryAddress.coordinates?.length) {
        Alert.alert('Location Required', 'Please select your location to calculate delivery fee.', [{ text: 'Add Location', onPress: () => setShowLocationOptions(true) }]);
        return false;
      }
      if (deliveryFeeInfo && !deliveryFeeInfo.canDeliver) {
        Alert.alert('Delivery Not Available', deliveryFeeInfo.message || 'This location is outside the delivery range.');
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

  const buildOrderData = (method: 'wallet' | 'card') => ({
    items: cartItems.map((i: any) => ({ product: i.product._id, quantity: i.quantity, selectedVariant: i.selectedVariant })),
    deliveryType,
    deliveryAddress: deliveryType === 'home_delivery' ? deliveryAddress : undefined,
    paymentMethod: method,
    customerNotes: customerNotes.trim() || undefined,
  });

  const handlePayFromWallet = async () => {
    if (walletBalance < total) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${formatPrice(total - walletBalance)} more in your wallet.`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Fund Wallet', onPress: () => { setShowPaymentModal(false); Alert.alert('Fund Wallet', 'Wallet funding coming soon!'); } }]
      );
      return;
    }
    Alert.alert('Confirm Payment', `Pay ${formatPrice(total)} from your wallet?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay Now',
        onPress: async () => {
          try {
            setPaymentProcessing(true);
            const orderRes = await orderAPI.createOrder(buildOrderData('wallet'));
            if (orderRes.success) {
              const order = orderRes.data.order;
              const payRes = await paymentAPI.payOrderFromWallet(order._id);
              if (payRes.success) {
                await cartAPI.clearCart();
                setShowPaymentModal(false);
                Alert.alert('Payment Successful 🎉', 'Your order has been placed!', [{ text: 'View Order', onPress: () => navigation.replace('OrderDetail', { orderId: order._id }) }]);
              }
            }
          } catch (error) {
            Alert.alert('Payment Failed', handleAPIError(error).message);
          } finally {
            setPaymentProcessing(false);
          }
        },
      },
    ]);
  };

  const handlePayWithCard = async () => {
    setShowPaymentModal(false);
    try {
      setLoading(true);
      const response = await orderAPI.createOrder(buildOrderData('card'));
      if (response.success) {
        const order = response.data.order;
        await cartAPI.clearCart();
        navigation.replace('OrderPayment', { orderId: order._id, amount: order.totalAmount, orderNumber: order.orderNumber });
      }
    } catch (error) {
      Alert.alert('Error', handleAPIError(error).message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const canPayFromWallet = walletBalance >= total;

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
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 3 },
          }),
        }}
      >
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
            Checkout
          </Text>
          <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {/* ── SCROLL CONTENT ───────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── DELIVERY METHOD ──────────────────────────────────────────── */}
        <Section title="Delivery Method" icon="bicycle-outline">
          <DeliveryOption
            icon="home-outline"
            title="Home Delivery"
            subtitle={
              deliveryFeeInfo?.canDeliver
                ? `${formatPrice(deliveryFeeInfo.deliveryFee)} · ${deliveryFeeInfo.estimatedDeliveryTime}`
                : 'Calculated based on your location'
            }
            selected={deliveryType === 'home_delivery'}
            onPress={() => setDeliveryType('home_delivery')}
          />
          <DeliveryOption
            icon="storefront-outline"
            title="Pickup"
            subtitle="Collect from seller · Free"
            selected={deliveryType === 'pickup'}
            onPress={() => setDeliveryType('pickup')}
          />
        </Section>

        {/* ── DELIVERY ADDRESS ─────────────────────────────────────────── */}
        {deliveryType === 'home_delivery' && (
          <Section
            title="Delivery Address"
            icon="location-outline"
            action={
              <TouchableOpacity
                onPress={() => setShowLocationOptions(!showLocationOptions)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: BRAND.primarySoft,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: BRAND.primaryMuted,
                }}
              >
                <Ionicons name="navigate-outline" size={13} color={BRAND.primary} />
                <Text style={{ fontSize: 12, color: BRAND.primary, fontWeight: '700', marginLeft: 4 }}>
                  {showLocationOptions ? 'Hide' : 'Add Location'}
                </Text>
              </TouchableOpacity>
            }
          >
            {/* Location picker */}
            {showLocationOptions && (
              <View style={{ marginBottom: 14, gap: 10 }}>
                {savedLocation && (
                  <TouchableOpacity
                    onPress={useSavedLocation}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: BRAND.primarySoft,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: BRAND.primaryMuted,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                      <Ionicons name="bookmark-outline" size={15} color={BRAND.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.primary, marginLeft: 6 }}>
                        Use Saved Location
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: BRAND.textSecondary }}>
                      {savedLocation.address}, {savedLocation.city}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={getCurrentLocation}
                  disabled={locationLoading}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: BRAND.blueSoft,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: locationLoading ? 0.6 : 1,
                  }}
                >
                  {locationLoading ? (
                    <>
                      <ActivityIndicator size="small" color={BRAND.blue} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.blue, marginLeft: 8 }}>
                        Getting location…
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="navigate" size={16} color={BRAND.blue} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.blue, marginLeft: 6 }}>
                        Use Current Location
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Delivery fee status */}
            {deliveryFeeLoading && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: BRAND.blueSoft,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: '#BFDBFE',
                }}
              >
                <ActivityIndicator size="small" color={BRAND.blue} />
                <Text style={{ fontSize: 13, color: BRAND.blue, marginLeft: 10, fontWeight: '500' }}>
                  Calculating delivery fee…
                </Text>
              </View>
            )}

            {deliveryFeeInfo && !deliveryFeeLoading && (
              <View
                style={{
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 14,
                  borderWidth: 1,
                  backgroundColor: deliveryFeeInfo.canDeliver ? BRAND.greenSoft : BRAND.redSoft,
                  borderColor: deliveryFeeInfo.canDeliver ? '#6EE7B7' : '#FECACA',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: deliveryFeeInfo.canDeliver ? 10 : 0 }}>
                  <Ionicons
                    name={deliveryFeeInfo.canDeliver ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={deliveryFeeInfo.canDeliver ? BRAND.green : BRAND.red}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      marginLeft: 6,
                      color: deliveryFeeInfo.canDeliver ? '#065F46' : '#991B1B',
                    }}
                  >
                    {deliveryFeeInfo.canDeliver ? 'Delivery Available' : 'Delivery Not Available'}
                  </Text>
                </View>
                {deliveryFeeInfo.canDeliver ? (
                  <View style={{ gap: 4 }}>
                    {[
                      { icon: 'locate-outline', text: `${deliveryFeeInfo.distance} km away` },
                      { icon: 'cash-outline', text: formatPrice(deliveryFeeInfo.deliveryFee) },
                      { icon: 'time-outline', text: deliveryFeeInfo.estimatedDeliveryTime },
                    ].map((row, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={row.icon as any} size={13} color="#065F46" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '500' }}>{row.text}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: '#991B1B', marginTop: 2 }}>{deliveryFeeInfo.message}</Text>
                )}
              </View>
            )}

            {/* Address form */}
            <View style={{ gap: 12 }}>
              <Field label="Full Name" required>
                <StyledInput
                  placeholder="Enter your full name"
                  value={deliveryAddress.fullName}
                  onChangeText={(t) => setDeliveryAddress({ ...deliveryAddress, fullName: t })}
                />
              </Field>

              <Field label="Phone Number" required>
                <StyledInput
                  placeholder="08012345678"
                  keyboardType="phone-pad"
                  value={deliveryAddress.phone}
                  onChangeText={(t) => setDeliveryAddress({ ...deliveryAddress, phone: t })}
                />
              </Field>

              <Field label="Street Address" required>
                <StyledInput
                  placeholder="Enter your full street address (min. 10 characters)"
                  multiline
                  numberOfLines={2}
                  value={deliveryAddress.address}
                  maxLength={500}
                  hasError={!!addressError}
                  onChangeText={(t) => {
                    setDeliveryAddress({ ...deliveryAddress, address: t });
                    if (addressError && t.trim().length >= 10) setAddressError('');
                  }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                  {addressError ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="alert-circle" size={12} color={BRAND.red} />
                      <Text style={{ fontSize: 11, color: BRAND.red, marginLeft: 4, fontWeight: '500' }}>{addressError}</Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: deliveryAddress.address.trim().length < 10 ? BRAND.orange : BRAND.green,
                      }}
                    >
                      {deliveryAddress.address.trim().length < 10
                        ? `${10 - deliveryAddress.address.trim().length} more characters needed`
                        : '✓ Valid address'}
                    </Text>
                  )}
                  <Text style={{ fontSize: 11, color: BRAND.textMuted }}>
                    {deliveryAddress.address.length}/500
                  </Text>
                </View>
              </Field>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="City" required>
                    <StyledInput
                      placeholder="City"
                      value={deliveryAddress.city}
                      onChangeText={(t) => setDeliveryAddress({ ...deliveryAddress, city: t })}
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="State" required>
                    <StyledInput
                      placeholder="State"
                      value={deliveryAddress.state}
                      onChangeText={(t) => setDeliveryAddress({ ...deliveryAddress, state: t })}
                    />
                  </Field>
                </View>
              </View>

              <Field label="Additional Info">
                <StyledInput
                  placeholder="Landmark, gate code, etc. (optional)"
                  value={deliveryAddress.additionalInfo}
                  onChangeText={(t) => setDeliveryAddress({ ...deliveryAddress, additionalInfo: t })}
                />
              </Field>
            </View>
          </Section>
        )}

        {/* ── ORDER NOTES ──────────────────────────────────────────────── */}
        <Section title="Order Notes" icon="create-outline">
          <StyledInput
            placeholder="Special instructions for the seller (optional)…"
            multiline
            numberOfLines={3}
            value={customerNotes}
            onChangeText={setCustomerNotes}
          />
        </Section>

        {/* ── ORDER SUMMARY ────────────────────────────────────────────── */}
        <Section title="Order Summary" icon="receipt-outline">
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: BRAND.textSecondary, fontWeight: '500' }}>
                Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>
                {formatPrice(subtotal)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: BRAND.textSecondary, fontWeight: '500' }}>
                Delivery fee
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>
                {deliveryType === 'pickup' ? 'Free' : deliveryFeeLoading ? 'Calculating…' : formatPrice(deliveryFee)}
              </Text>
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: BRAND.border,
                paddingTop: 12,
                marginTop: 2,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.textPrimary }}>Total</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.5 }}>
                {formatPrice(total)}
              </Text>
            </View>
          </View>
        </Section>
      </ScrollView>

      {/* ── BOTTOM CTA ───────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: BRAND.surface,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: insets.bottom + 14,
          borderTopWidth: 1,
          borderTopColor: BRAND.border,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 12 },
            android: { elevation: 10 },
          }),
        }}
      >
        <TouchableOpacity
          onPress={handleProceedToPayment}
          disabled={loading || deliveryFeeLoading || (deliveryType === 'home_delivery' && !!deliveryFeeInfo && !deliveryFeeInfo.canDeliver)}
          activeOpacity={0.85}
          style={{ borderRadius: 16, overflow: 'hidden', opacity: loading ? 0.7 : 1 }}
        >
          <LinearGradient
            colors={[BRAND.primary, BRAND.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="card-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.1 }}>
                  Proceed to Payment
                </Text>
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                    {formatPrice(total)}
                  </Text>
                </View>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
          <Ionicons name="shield-checkmark-outline" size={13} color={BRAND.green} />
          <Text style={{ fontSize: 11, color: BRAND.textMuted, marginLeft: 5, fontWeight: '500' }}>
            Secure payment · Wallet or Card
          </Text>
        </View>
      </View>

      {/* ── PAYMENT MODAL ────────────────────────────────────────────────── */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 20 },
                android: { elevation: 16 },
              }),
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: BRAND.borderStrong }} />
            </View>

            {/* Modal header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: BRAND.border,
              }}
            >
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.3 }}>
                  Choose Payment
                </Text>
                <Text style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 2, fontWeight: '500' }}>
                  Select how you'd like to pay
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                activeOpacity={0.8}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  backgroundColor: BRAND.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: BRAND.border,
                }}
              >
                <Ionicons name="close" size={18} color={BRAND.textPrimary} />
              </TouchableOpacity>
            </View>

            {walletLoading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
                <ActivityIndicator size="large" color={BRAND.primary} />
                <Text style={{ color: BRAND.textMuted, fontSize: 13, marginTop: 12, fontWeight: '500' }}>
                  Checking wallet balance…
                </Text>
              </View>
            ) : (
              <View style={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
                {/* Amount chip */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: BRAND.surfaceAlt,
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: BRAND.border,
                  }}
                >
                  <Text style={{ fontSize: 13, color: BRAND.textSecondary, fontWeight: '500' }}>
                    Total to pay
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.5 }}>
                    {formatPrice(total)}
                  </Text>
                </View>

                {/* Wallet option */}
                <TouchableOpacity
                  onPress={handlePayFromWallet}
                  disabled={paymentProcessing}
                  activeOpacity={0.85}
                  style={{ borderRadius: 18, overflow: 'hidden', opacity: paymentProcessing ? 0.6 : 1 }}
                >
                  <LinearGradient
                    colors={canPayFromWallet ? [BRAND.primary, BRAND.primaryDark] : [BRAND.surfaceAlt, BRAND.border]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 14,
                            backgroundColor: canPayFromWallet ? 'rgba(255,255,255,0.2)' : BRAND.borderStrong,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}
                        >
                          <Ionicons name="wallet-outline" size={22} color={canPayFromWallet ? '#fff' : BRAND.textMuted} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: canPayFromWallet ? '#fff' : BRAND.textPrimary }}>
                            SharpPAY Wallet
                          </Text>
                          <Text style={{ fontSize: 12, color: canPayFromWallet ? 'rgba(255,255,255,0.75)' : BRAND.textMuted, marginTop: 1 }}>
                            Balance: {formatPrice(walletBalance)}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 4,
                          borderRadius: 20,
                          backgroundColor: canPayFromWallet ? 'rgba(255,255,255,0.25)' : BRAND.redSoft,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: canPayFromWallet ? '#fff' : BRAND.red,
                            letterSpacing: 0.5,
                          }}
                        >
                          {canPayFromWallet ? '⚡ INSTANT' : 'LOW BALANCE'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        backgroundColor: canPayFromWallet ? 'rgba(255,255,255,0.15)' : BRAND.orangeSoft,
                        borderRadius: 10,
                        padding: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons
                        name={canPayFromWallet ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                        size={14}
                        color={canPayFromWallet ? '#fff' : BRAND.orange}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          marginLeft: 6,
                          fontWeight: '600',
                          color: canPayFromWallet ? '#fff' : '#9A3412',
                        }}
                      >
                        {canPayFromWallet
                          ? 'Instant payment · No extra fees'
                          : `Need ${formatPrice(total - walletBalance)} more to use wallet`}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Card option */}
                <TouchableOpacity
                  onPress={handlePayWithCard}
                  disabled={paymentProcessing}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: BRAND.surface,
                    borderRadius: 18,
                    padding: 18,
                    borderWidth: 1.5,
                    borderColor: BRAND.border,
                    opacity: paymentProcessing ? 0.6 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          backgroundColor: BRAND.blueSoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name="card-outline" size={22} color={BRAND.blue} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: BRAND.textPrimary }}>
                          Card Payment
                        </Text>
                        <Text style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 1 }}>
                          Debit / Credit card
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        backgroundColor: BRAND.surfaceAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="chevron-forward" size={16} color={BRAND.textMuted} />
                    </View>
                  </View>

                  <View
                    style={{
                      backgroundColor: BRAND.blueSoft,
                      borderRadius: 10,
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="shield-checkmark-outline" size={14} color={BRAND.blue} />
                    <Text style={{ fontSize: 12, color: '#1D4ED8', marginLeft: 6, fontWeight: '600' }}>
                      Secured by Paystack
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Processing */}
                {paymentProcessing && (
                  <View
                    style={{
                      backgroundColor: BRAND.primarySoft,
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: BRAND.primaryMuted,
                    }}
                  >
                    <ActivityIndicator size="small" color={BRAND.primary} />
                    <Text style={{ fontSize: 13, color: BRAND.primary, marginLeft: 10, fontWeight: '600' }}>
                      Processing payment…
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