import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert, // kept for Alert.prompt (text input dialogs)
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  blue: '#3B82F6',
  blueSoft: '#DBEAFE',
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
type Nav = NativeStackNavigationProp<RootStackParamList, 'CustomerOrders'>;
type FilterStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'completed' | 'cancelled';

interface Order {
  _id: string;
  orderNumber: string;
  items: Array<{
    product: { _id: string; name: string; images: string[] };
    quantity: number;
    price: number;
    selectedVariant?: { name: string; option: string };
  }>;
  seller: {
    _id: string;
    firstName: string;
    lastName: string;
    vendorProfile?: { businessName: string };
  };
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'completed' | 'confirmed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed' | 'escrowed' | 'released';
  deliveryType: 'home_delivery' | 'pickup';
  deliveryAddress?: { fullName: string; phone: string; address: string; city: string; state: string };
  trackingNumber?: string;
  courierService?: string;
  customerConfirmedDelivery: boolean;
  sellerConfirmedDelivery: boolean;
  canCancel: boolean;
  createdAt: string;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  bg: string; text: string; dot: string;
  icon: keyof typeof Ionicons.glyphMap; iconColor: string;
}> = {
  pending:          { bg: BRAND.goldSoft,   text: '#92400E', dot: BRAND.gold,   icon: 'time-outline',              iconColor: BRAND.gold   },
  processing:       { bg: BRAND.blueSoft,   text: '#1E40AF', dot: BRAND.blue,   icon: 'hourglass-outline',         iconColor: BRAND.blue   },
  confirmed:        { bg: BRAND.blueSoft,   text: '#1E40AF', dot: BRAND.blue,   icon: 'checkmark-circle-outline',  iconColor: BRAND.blue   },
  shipped:          { bg: BRAND.purpleSoft, text: '#5B21B6', dot: BRAND.purple, icon: 'airplane-outline',          iconColor: BRAND.purple },
  out_for_delivery: { bg: '#EEF2FF',        text: '#3730A3', dot: '#6366F1',    icon: 'car-outline',               iconColor: '#6366F1'    },
  delivered:        { bg: BRAND.greenSoft,  text: '#065F46', dot: BRAND.green,  icon: 'checkmark-done-outline',    iconColor: BRAND.green  },
  completed:        { bg: BRAND.greenSoft,  text: '#065F46', dot: BRAND.green,  icon: 'checkmark-done-circle-outline', iconColor: BRAND.green },
  cancelled:        { bg: BRAND.redSoft,    text: '#991B1B', dot: BRAND.red,    icon: 'close-circle-outline',      iconColor: BRAND.red    },
};

const getStatus = (s: string) =>
  STATUS_CONFIG[s] || { bg: BRAND.border, text: BRAND.textSecondary, dot: BRAND.textMuted, icon: 'help-circle-outline' as const, iconColor: BRAND.textMuted };

const PAYMENT_CONFIG: Record<string, { bg: string; text: string }> = {
  escrowed: { bg: BRAND.blueSoft,   text: '#1E40AF' },
  released: { bg: BRAND.greenSoft,  text: '#065F46' },
  refunded: { bg: BRAND.orangeSoft, text: '#9A3412' },
  paid:     { bg: BRAND.greenSoft,  text: '#065F46' },
  failed:   { bg: BRAND.redSoft,    text: '#991B1B' },
  pending:  { bg: BRAND.goldSoft,   text: '#92400E' },
};

const getPayment = (s: string) => PAYMENT_CONFIG[s] || { bg: BRAND.border, text: BRAND.textSecondary };

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CustomerOrdersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [orders, setOrders]                 = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchFocused, setSearchFocused]   = useState(false);
  const [activeFilter, setActiveFilter]     = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading]   = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  // ── Data ───────────────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getMyOrders({ page: 1, limit: 100 });
      if (response.success) {
        let list: any[] = [];
        if (Array.isArray(response.data?.data))   list = response.data.data;
        else if (Array.isArray(response.data))    list = response.data;
        else if (Array.isArray(response.data?.orders)) list = response.data.orders;
        setOrders(list.map((o: any) => ({ ...o, items: Array.isArray(o.items) ? o.items : [] })));
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  React.useEffect(() => {
    let filtered = orders;
    if (activeFilter !== 'all') {
      filtered = filtered.filter((o) =>
        activeFilter === 'processing'
          ? o.status === 'processing' || o.status === 'confirmed'
          : o.status === activeFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.items.some((i) => i?.product?.name?.toLowerCase().includes(q))
      );
    }
    setFilteredOrders(filtered);
  }, [orders, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  const handleCancelOrder = (orderId: string) => {
    Alert.prompt('Cancel Order', 'Please provide a reason for cancellation:', [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async (reason) => {
          if (!reason?.trim()) { toast.error('Required', 'Please provide a cancellation reason'); return; }
          try {
            setActionLoading(orderId);
            await orderAPI.cancelOrder(orderId, reason);
            toast.success('Cancelled', 'Order cancelled. Refund will be processed.');
            fetchOrders();
          } catch (error) {
            toast.error('Error', handleAPIError(error).message || 'Failed to cancel order');
          } finally { setActionLoading(null); }
        },
      },
    ], 'plain-text');
  };

  const handleConfirmDelivery = (orderId: string) => {
    setConfirmModal({
      visible: true,
      title: 'Confirm Delivery',
      message: 'Have you received this order in good condition?',
      onConfirm: async () => {
        try {
          setActionLoading(orderId);
          await orderAPI.confirmDelivery(orderId, 'customer');
          toast.success('Confirmed!', 'Payment will be released to the seller.');
          fetchOrders();
        } catch (error) {
          toast.error('Error', handleAPIError(error).message || 'Failed to confirm delivery');
        } finally { setActionLoading(null); }
      },
    });
  };

  const formatPrice = (p: number) => `₦${p.toLocaleString()}`;
  const formatDate  = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const counts = {
    all:       orders.length,
    pending:   orders.filter((o) => o.status === 'pending').length,
    processing:orders.filter((o) => o.status === 'processing' || o.status === 'confirmed').length,
    shipped:   orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const FILTERS: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all',        label: 'All',        count: counts.all        },
    { key: 'processing', label: 'Processing', count: counts.processing },
    { key: 'shipped',    label: 'Shipped',    count: counts.shipped    },
    { key: 'delivered',  label: 'Delivered',  count: counts.delivered  },
    { key: 'completed',  label: 'Completed',  count: counts.completed  },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>
            Loading orders…
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
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 3 },
          }),
        }}
      >
        {/* Row 1: back + title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={{
              width: 40, height: 40, borderRadius: 13,
              backgroundColor: BRAND.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: BRAND.border,
              marginRight: 12,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={BRAND.textPrimary} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 }}>
              My Orders
            </Text>
            <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
              {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
            </Text>
          </View>
        </View>

        {/* Row 2: search */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: BRAND.surfaceAlt,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 11 : 9,
            marginBottom: 14,
            borderWidth: 1.5,
            borderColor: searchFocused ? BRAND.primary : BRAND.border,
          }}
        >
          <Ionicons name="search-outline" size={17} color={searchFocused ? BRAND.primary : BRAND.textMuted} />
          <TextInput
            style={{ flex: 1, marginLeft: 9, fontSize: 14, color: BRAND.textPrimary, paddingVertical: 0 }}
            placeholder="Search by order # or product…"
            placeholderTextColor={BRAND.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={BRAND.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Row 3: filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.75}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: isActive ? BRAND.primary : BRAND.surfaceAlt,
                  borderWidth: 1, borderColor: isActive ? BRAND.primary : BRAND.borderStrong,
                  ...Platform.select({
                    ios: isActive ? { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 } : {},
                    android: isActive ? { elevation: 3 } : {},
                  }),
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#fff' : BRAND.textSecondary }}>
                  {f.label}{f.count > 0 ? ` (${f.count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── ORDER LIST ───────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />
        }
      >
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const sc = getStatus(order.status);
            const pc = getPayment(order.paymentStatus);
            const isActionLoading = actionLoading === order._id;
            const orderItems = Array.isArray(order.items) ? order.items : [];
            const sellerName =
              order.seller?.vendorProfile?.businessName ||
              `${order.seller?.firstName || ''} ${order.seller?.lastName || ''}`.trim() ||
              'Unknown Seller';

            return (
              <TouchableOpacity
                key={order._id}
                onPress={() => navigation.navigate('OrderDetail', { orderId: order._id, userType: 'customer' })}
                activeOpacity={0.88}
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 20,
                  marginBottom: 14,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: BRAND.border,
                  ...Platform.select({
                    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
                    android: { elevation: 3 },
                  }),
                }}
              >
                {/* Status accent bar */}
                <View style={{ height: 3, backgroundColor: sc.dot }} />

                <View style={{ padding: 16 }}>
                  {/* ── Card header ──────────────────────────────────────── */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
                    <View
                      style={{
                        width: 44, height: 44, borderRadius: 13,
                        backgroundColor: BRAND.primarySoft,
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: 12,
                        borderWidth: 1, borderColor: BRAND.primaryMuted,
                      }}
                    >
                      <Ionicons name="receipt-outline" size={20} color={BRAND.primary} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.2, marginBottom: 3 }}>
                        Order #{order.orderNumber}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: BRAND.primary, marginRight: 5 }} />
                        <Text style={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: '500' }} numberOfLines={1}>
                          {sellerName}
                        </Text>
                      </View>
                    </View>

                    {/* Status badge */}
                    <View
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: sc.bg,
                        paddingHorizontal: 9, paddingVertical: 5,
                        borderRadius: 10, marginLeft: 8,
                      }}
                    >
                      <Ionicons name={sc.icon} size={12} color={sc.iconColor} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: sc.text, marginLeft: 4, textTransform: 'capitalize' }}>
                        {order.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  {/* ── Products ─────────────────────────────────────────── */}
                  {orderItems.length > 0 && (
                    <View
                      style={{
                        backgroundColor: BRAND.surfaceAlt,
                        borderRadius: 14,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: BRAND.border,
                      }}
                    >
                      {orderItems.map((item, idx) => (
                        <View
                          key={idx}
                          style={[
                            { flexDirection: 'row', alignItems: 'center' },
                            idx < orderItems.length - 1 && {
                              marginBottom: 10, paddingBottom: 10,
                              borderBottomWidth: 1, borderBottomColor: BRAND.border,
                            },
                          ]}
                        >
                          <Image
                            source={{ uri: item?.product?.images?.[0] || 'https://via.placeholder.com/150' }}
                            style={{ width: 56, height: 56, borderRadius: 11 }}
                            resizeMode="cover"
                          />
                          <View style={{ flex: 1, marginLeft: 11 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 2 }} numberOfLines={1}>
                              {item?.product?.name || 'Product'}
                            </Text>
                            {item?.selectedVariant && (
                              <Text style={{ fontSize: 11, color: BRAND.textMuted, marginBottom: 3 }}>
                                {item.selectedVariant.name}: {item.selectedVariant.option}
                              </Text>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 11, color: BRAND.textMuted, fontWeight: '500' }}>
                                Qty: {item?.quantity || 0}
                              </Text>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: BRAND.primary }}>
                                {formatPrice((item?.price || 0) * (item?.quantity || 0))}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* ── Tracking ─────────────────────────────────────────── */}
                  {order.trackingNumber && (
                    <View
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: BRAND.purpleSoft,
                        borderRadius: 12, padding: 12,
                        marginBottom: 12,
                        borderWidth: 1, borderColor: `${BRAND.purple}33`,
                      }}
                    >
                      <View
                        style={{
                          width: 34, height: 34, borderRadius: 10,
                          backgroundColor: `${BRAND.purple}22`,
                          alignItems: 'center', justifyContent: 'center',
                          marginRight: 10,
                        }}
                      >
                        <Ionicons name="locate-outline" size={16} color={BRAND.purple} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND.purple, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
                          Tracking
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#5B21B6' }}>
                          {order.trackingNumber}
                        </Text>
                        {order.courierService && (
                          <Text style={{ fontSize: 11, color: BRAND.purple, marginTop: 1 }}>{order.courierService}</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* ── Info chips row ───────────────────────────────────── */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {/* Date */}
                    <View
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center',
                        backgroundColor: BRAND.blueSoft,
                        borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9,
                      }}
                    >
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${BRAND.blue}22`, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                        <Ionicons name="calendar-outline" size={13} color={BRAND.blue} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: BRAND.blue, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 1 }}>Date</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: BRAND.textPrimary }}>{formatDate(order.createdAt)}</Text>
                      </View>
                    </View>

                    {/* Delivery */}
                    <View
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center',
                        backgroundColor: BRAND.greenSoft,
                        borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9,
                      }}
                    >
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${BRAND.green}22`, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                        <Ionicons name={order.deliveryType === 'home_delivery' ? 'home-outline' : 'storefront-outline'} size={13} color={BRAND.green} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: BRAND.green, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 1 }}>Delivery</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: BRAND.textPrimary }}>
                          {order.deliveryType === 'home_delivery' ? 'Home' : 'Pickup'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* ── Amount + payment status ──────────────────────────── */}
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: BRAND.primarySoft,
                      borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11,
                      marginBottom: 12,
                      borderWidth: 1, borderColor: BRAND.primaryMuted,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: BRAND.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <Ionicons name="cash-outline" size={15} color={BRAND.primary} />
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.5 }}>
                        {formatPrice(order.totalAmount)}
                      </Text>
                    </View>

                    <View style={{ backgroundColor: pc.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: pc.text, textTransform: 'capitalize' }}>
                        {order.paymentStatus}
                      </Text>
                    </View>
                  </View>

                  {/* ── Delivery confirmation row ────────────────────────── */}
                  {order.status === 'delivered' && (
                    <View
                      style={{
                        backgroundColor: BRAND.blueSoft,
                        borderRadius: 12, padding: 12, marginBottom: 12,
                        flexDirection: 'row', justifyContent: 'space-between',
                        borderWidth: 1, borderColor: '#BFDBFE',
                      }}
                    >
                      {[
                        { confirmed: order.customerConfirmedDelivery, label: 'You confirmed' },
                        { confirmed: order.sellerConfirmedDelivery,   label: 'Seller confirmed' },
                      ].map((item, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons
                            name={item.confirmed ? 'checkmark-circle' : 'ellipse-outline'}
                            size={17}
                            color={item.confirmed ? BRAND.green : BRAND.textMuted}
                          />
                          <Text style={{ fontSize: 12, color: BRAND.textSecondary, marginLeft: 5, fontWeight: '500' }}>
                            {item.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* ── Action buttons ───────────────────────────────────── */}
                  {order.status === 'delivered' && !order.customerConfirmedDelivery && (
                    <View style={{ gap: 8, marginBottom: 12 }}>
                      <TouchableOpacity
                        onPress={() => handleConfirmDelivery(order._id)}
                        disabled={isActionLoading}
                        activeOpacity={0.85}
                        style={{ borderRadius: 13, overflow: 'hidden' }}
                      >
                        <LinearGradient
                          colors={[BRAND.green, '#059669']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={{ paddingVertical: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                        >
                          {isActionLoading
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Confirm Received</Text>
                              </>
                          }
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => navigation.navigate('OrderDetail', { orderId: order._id, userType: 'customer' })}
                        activeOpacity={0.8}
                        style={{
                          paddingVertical: 12, borderRadius: 13,
                          borderWidth: 1.5, borderColor: BRAND.primary,
                          backgroundColor: BRAND.primarySoft,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: BRAND.primary, fontSize: 14, fontWeight: '700' }}>Report Issue</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {order.canCancel && (
                    <TouchableOpacity
                      onPress={() => handleCancelOrder(order._id)}
                      disabled={isActionLoading}
                      activeOpacity={0.8}
                      style={{
                        paddingVertical: 12, borderRadius: 13, marginBottom: 12,
                        borderWidth: 1.5, borderColor: BRAND.red,
                        backgroundColor: BRAND.redSoft,
                        alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                      }}
                    >
                      {isActionLoading
                        ? <ActivityIndicator size="small" color={BRAND.red} />
                        : <>
                            <Ionicons name="close-circle-outline" size={16} color={BRAND.red} />
                            <Text style={{ color: BRAND.red, fontSize: 14, fontWeight: '700' }}>Cancel Order</Text>
                          </>
                      }
                    </TouchableOpacity>
                  )}

                  {/* ── Footer ───────────────────────────────────────────── */}
                  <View
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 12, borderTopWidth: 1, borderTopColor: BRAND.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={12} color={BRAND.textMuted} />
                      <Text style={{ fontSize: 11, color: BRAND.textMuted, marginLeft: 4, fontWeight: '500' }}>
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.primarySoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                      <Text style={{ fontSize: 12, color: BRAND.primary, fontWeight: '700', marginRight: 3 }}>Details</Text>
                      <Ionicons name="arrow-forward" size={12} color={BRAND.primary} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          /* ── EMPTY STATE ───────────────────────────────────────────────── */
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 70, paddingHorizontal: 32 }}>
            <View
              style={{
                width: 100, height: 100, borderRadius: 30, overflow: 'hidden', marginBottom: 20,
                ...Platform.select({
                  ios: { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14 },
                  android: { elevation: 6 },
                }),
              }}
            >
              <LinearGradient colors={[BRAND.primary, BRAND.primaryDark]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="receipt-outline" size={46} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 8, letterSpacing: -0.4 }}>
              No Orders Yet
            </Text>
            <Text style={{ fontSize: 14, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
              {activeFilter !== 'all'
                ? `You don't have any ${activeFilter.replace('_', ' ')} orders`
                : "You haven't placed any orders yet. Start shopping!"}
            </Text>

            {activeFilter === 'all' ? (
              <TouchableOpacity onPress={() => navigation.navigate('Marketplace')} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
                <LinearGradient
                  colors={[BRAND.primary, BRAND.primaryDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 26, paddingVertical: 14, gap: 8 }}
                >
                  <Ionicons name="storefront-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Start Shopping</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setActiveFilter('all')}
                activeOpacity={0.8}
                style={{ backgroundColor: BRAND.primarySoft, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: BRAND.primaryMuted }}
              >
                <Text style={{ color: BRAND.primary, fontWeight: '700', fontSize: 14 }}>View All Orders</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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

export default CustomerOrdersScreen;