import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, Alert,
  ActivityIndicator, RefreshControl, Platform, TextInput, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, handleAPIError } from '@/api/api';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079', primaryDark: '#B5315F',
  primarySoft: '#FEF0F5', primaryMuted: '#FCDCE9',
  blue: '#3B82F6', blueSoft: '#DBEAFE',
  green: '#10B981', greenSoft: '#D1FAE5',
  gold: '#F59E0B', goldSoft: '#FEF3C7',
  purple: '#8B5CF6', purpleSoft: '#EDE9FE',
  indigo: '#6366F1', indigoSoft: '#E0E7FF',
  orange: '#F97316', orangeSoft: '#FFEDD5',
  red: '#EF4444', redSoft: '#FEE2E2',
  surface: '#FFFFFF', surfaceAlt: '#F9FAFB',
  border: '#F3F4F6', borderStrong: '#E5E7EB',
  textPrimary: '#111827', textSecondary: '#6B7280', textMuted: '#9CA3AF',
};

const shadow = (color = '#000', opacity = 0.07, radius = 8, y = 2) =>
  Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: radius },
    android: { elevation: Math.round(radius / 2) },
  });

// ─── Types ────────────────────────────────────────────────────────────────────
type Nav = NativeStackNavigationProp<RootStackParamList, 'VendorProductOrders'>;
type FilterStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'completed' | 'confirmed';

interface Order {
  _id: string; orderNumber: string;
  items: Array<{
    product: { _id: string; name: string; images: string[] };
    quantity: number; price: number;
    selectedVariant?: { name: string; option: string };
  }>;
  customer: { _id: string; firstName: string; lastName: string; phone?: string };
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'completed' | 'confirmed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed' | 'escrowed' | 'released';
  deliveryType: 'home_delivery' | 'pickup';
  deliveryAddress?: { fullName: string; phone: string; address: string; city: string; state: string };
  trackingNumber?: string; courierService?: string; customerNotes?: string;
  sellerConfirmedDelivery: boolean; customerConfirmedDelivery: boolean; createdAt: string;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; border: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; accentColor: string }> = {
  pending:          { bg: BRAND.goldSoft,   text: '#92400E', border: '#FDE68A', icon: 'time-outline',                 iconColor: BRAND.gold,   accentColor: BRAND.gold   },
  confirmed:        { bg: BRAND.blueSoft,   text: '#1E40AF', border: '#BFDBFE', icon: 'checkmark-circle-outline',     iconColor: BRAND.blue,   accentColor: BRAND.blue   },
  processing:       { bg: BRAND.blueSoft,   text: '#1E40AF', border: '#BFDBFE', icon: 'hourglass-outline',            iconColor: BRAND.blue,   accentColor: BRAND.blue   },
  shipped:          { bg: BRAND.purpleSoft, text: '#5B21B6', border: '#DDD6FE', icon: 'airplane-outline',             iconColor: BRAND.purple, accentColor: BRAND.purple },
  out_for_delivery: { bg: BRAND.indigoSoft, text: '#3730A3', border: '#C7D2FE', icon: 'car-outline',                  iconColor: BRAND.indigo, accentColor: BRAND.indigo },
  delivered:        { bg: BRAND.greenSoft,  text: '#065F46', border: '#A7F3D0', icon: 'checkmark-done-outline',       iconColor: BRAND.green,  accentColor: BRAND.green  },
  completed:        { bg: BRAND.greenSoft,  text: '#065F46', border: '#A7F3D0', icon: 'checkmark-done-circle-outline',iconColor: BRAND.green,  accentColor: BRAND.green  },
  cancelled:        { bg: BRAND.redSoft,    text: '#991B1B', border: '#FECACA', icon: 'close-circle-outline',         iconColor: BRAND.red,    accentColor: BRAND.red    },
};
const getStatusCfg = (s: string) => STATUS_CFG[s] ?? { bg: BRAND.surfaceAlt, text: BRAND.textSecondary, border: BRAND.border, icon: 'help-circle-outline' as any, iconColor: BRAND.textMuted, accentColor: BRAND.border };

const PAYMENT_CFG: Record<string, { bg: string; text: string; border: string }> = {
  escrowed: { bg: BRAND.blueSoft,   text: '#1E40AF', border: BRAND.blue   },
  released: { bg: BRAND.greenSoft,  text: '#065F46', border: BRAND.green  },
  paid:     { bg: BRAND.greenSoft,  text: '#065F46', border: BRAND.green  },
  pending:  { bg: BRAND.goldSoft,   text: '#92400E', border: BRAND.gold   },
  refunded: { bg: BRAND.purpleSoft, text: '#5B21B6', border: BRAND.purple },
  failed:   { bg: BRAND.redSoft,    text: '#991B1B', border: BRAND.red    },
};
const getPaymentCfg = (s: string) => PAYMENT_CFG[s] ?? { bg: BRAND.surfaceAlt, text: BRAND.textSecondary, border: BRAND.border };

const formatPrice = (n: number) => `₦${n.toLocaleString()}`;
const formatDate  = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatStatus = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// ─── Action button helper ─────────────────────────────────────────────────────
const GradBtn: React.FC<{
  colors: [string, string]; onPress: () => void; icon: keyof typeof Ionicons.glyphMap;
  label: string; shadowColor: string; isLoading: boolean; disabled?: boolean;
}> = ({ colors, onPress, icon, label, shadowColor, isLoading, disabled }) => (
  <TouchableOpacity onPress={onPress} disabled={isLoading || disabled} activeOpacity={0.85}
    style={{ borderRadius: 13, overflow: 'hidden', opacity: disabled ? 0.55 : 1 }}>
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        ...shadow(shadowColor, 0.3, 8, 3) }}>
      {isLoading ? <ActivityIndicator size="small" color="#fff" />
        : <><Ionicons name={icon} size={16} color="#fff" /><Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{label}</Text></>}
    </LinearGradient>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const VendorProductOrdersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [orders, setOrders]               = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [activeFilter, setActiveFilter]   = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderAPI.getMySellerOrders({ page: 1, limit: 100 });
      if (res.success) {
        const raw =
          (res.data?.data && Array.isArray(res.data.data)) ? res.data.data :
          Array.isArray(res.data) ? res.data :
          res.data?.orders ?? [];
        const safe = raw.map((o: any) => ({
          ...o,
          items: Array.isArray(o.items) ? o.items : [],
          customer: o.customer || { _id: '', firstName: 'Unknown', lastName: 'Customer' },
        }));
        setOrders(safe);
      }
    } catch (error) {
      Alert.alert('Error', handleAPIError(error).message);
    } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  React.useEffect(() => {
    let f = orders;
    if (activeFilter !== 'all') f = f.filter((o) => o.status === activeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter((o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.toLowerCase().includes(q)
      );
    }
    setFilteredOrders(f);
  }, [orders, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setActionLoading(orderId);
      await orderAPI.updateOrderStatus(orderId, newStatus);
      Alert.alert('Updated', 'Order status updated');
      fetchOrders();
    } catch (e) { Alert.alert('Error', handleAPIError(e).message); }
    finally { setActionLoading(null); }
  };

  const handleAddTracking = (orderId: string) => {
    Alert.prompt('Add Tracking', 'Enter tracking number, courier (comma-separated)',
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Add', onPress: async (val) => {
          const [trackingNumber, courierService = 'Local Courier'] = (val || '').split(',').map((s) => s.trim());
          if (!trackingNumber) { Alert.alert('Invalid', 'Please enter a tracking number'); return; }
          try {
            setActionLoading(orderId);
            await orderAPI.addTrackingInfo(orderId, trackingNumber, courierService);
            Alert.alert('Added', 'Tracking information added');
            fetchOrders();
          } catch (e) { Alert.alert('Error', handleAPIError(e).message); }
          finally { setActionLoading(null); }
       }}],
      'plain-text', '', 'default'
    );
  };

  const handleConfirmDelivery = (orderId: string) => {
    Alert.alert('Confirm Delivery', 'Have you delivered this order?',
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Confirm', onPress: async () => {
          try {
            setActionLoading(orderId);
            await orderAPI.confirmDelivery(orderId, 'seller');
            Alert.alert('Confirmed', 'Delivery confirmed');
            fetchOrders();
          } catch (e) { Alert.alert('Error', handleAPIError(e).message); }
          finally { setActionLoading(null); }
       }}]
    );
  };

  // ── Action buttons ────────────────────────────────────────────────────────
  const getActionButtons = (order: Order) => {
    const isLoading = actionLoading === order._id;
    if (order.status === 'pending' || order.status === 'confirmed') return (
      <GradBtn colors={[BRAND.blue, '#2563EB']} onPress={() => handleUpdateStatus(order._id, 'processing')}
        icon="checkmark-circle-outline" label="Accept & Process" shadowColor={BRAND.blue} isLoading={isLoading} />
    );
    if (order.status === 'processing') return (
      <View style={{ gap: 8 }}>
        {order.deliveryType === 'home_delivery' && !order.trackingNumber && (
          <GradBtn colors={[BRAND.purple, '#7C3AED']} onPress={() => handleAddTracking(order._id)}
            icon="location-outline" label="Add Tracking" shadowColor={BRAND.purple} isLoading={isLoading} />
        )}
        <GradBtn colors={[BRAND.green, '#059669']}
          onPress={() => handleUpdateStatus(order._id, 'shipped')}
          icon={order.deliveryType === 'pickup' ? 'storefront-outline' : 'airplane-outline'}
          label={order.deliveryType === 'pickup' ? 'Ready for Pickup' : 'Mark as Shipped'}
          shadowColor={BRAND.green} isLoading={isLoading} />
      </View>
    );
    if (order.status === 'shipped') return (
      <GradBtn colors={[BRAND.indigo, '#4F46E5']} onPress={() => handleUpdateStatus(order._id, 'out_for_delivery')}
        icon="car-outline" label={order.deliveryType === 'pickup' ? 'Customer Picked Up' : 'Out for Delivery'}
        shadowColor={BRAND.indigo} isLoading={isLoading} />
    );
    if (order.status === 'out_for_delivery') return (
      <GradBtn colors={[BRAND.green, '#059669']} onPress={() => handleUpdateStatus(order._id, 'delivered')}
        icon="checkmark-done-outline" label="Mark as Delivered" shadowColor={BRAND.green} isLoading={isLoading} />
    );
    if (order.status === 'delivered' && !order.sellerConfirmedDelivery) return (
      <GradBtn colors={[BRAND.green, '#059669']} onPress={() => handleConfirmDelivery(order._id)}
        icon="checkmark-circle-outline" label="Confirm Delivery" shadowColor={BRAND.green} isLoading={isLoading} />
    );
    return null;
  };

  // ── Filter counts ─────────────────────────────────────────────────────────
  const counts = {
    all: orders.length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    out_for_delivery: orders.filter((o) => o.status === 'out_for_delivery').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all',              label: 'All'           },
    { key: 'confirmed',        label: 'New'           },
    { key: 'processing',       label: 'Processing'    },
    { key: 'shipped',          label: 'Shipped'       },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered',        label: 'Delivered'     },
    { key: 'completed',        label: 'Completed'     },
  ];

  // ── Order card ────────────────────────────────────────────────────────────
  const renderOrderCard = (order: Order) => {
    const cfg = getStatusCfg(order.status);
    const payCfg = getPaymentCfg(order.paymentStatus);
    const items = Array.isArray(order.items) ? order.items : [];
    const hasAction = getActionButtons(order) !== null;

    return (
      <TouchableOpacity key={order._id}
        onPress={() => navigation.navigate('OrderDetail', { orderId: order._id, userType: 'vendor' })}
        activeOpacity={0.93}
      >
        <View style={[{
          backgroundColor: BRAND.surface, borderRadius: 20, padding: 16,
          marginBottom: 14, borderWidth: 1, borderColor: BRAND.border,
          borderTopWidth: 3, borderTopColor: cfg.accentColor,
        }, shadow()]}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.2, marginBottom: 5 }}>
                Order #{order.orderNumber || 'N/A'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={13} color={BRAND.primary} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND.textSecondary }}>
                  {order.customer?.firstName} {order.customer?.lastName}
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: cfg.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: cfg.border, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={cfg.icon} size={12} color={cfg.iconColor} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.text }}>{formatStatus(order.status)}</Text>
            </View>
          </View>

          {/* Items */}
          {items.length > 0 && (
            <View style={{ backgroundColor: BRAND.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: BRAND.border, gap: 10 }}>
              {items.map((item, i) => (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingBottom: i < items.length - 1 ? 10 : 0,
                  borderBottomWidth: i < items.length - 1 ? 1 : 0,
                  borderBottomColor: BRAND.border,
                }}>
                  <Image
                    source={{ uri: item?.product?.images?.[0] || 'https://via.placeholder.com/150' }}
                    style={{ width: 60, height: 60, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 2 }} numberOfLines={1}>
                      {item?.product?.name || 'Product'}
                    </Text>
                    {item?.selectedVariant && (
                      <Text style={{ fontSize: 11, color: BRAND.textMuted, marginBottom: 3 }}>
                        {item.selectedVariant.name}: {item.selectedVariant.option}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, color: BRAND.textMuted }}>Qty: {item?.quantity || 0}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.primary }}>{formatPrice((item?.price || 0) * (item?.quantity || 0))}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Details block */}
          <View style={{ backgroundColor: BRAND.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: hasAction ? 12 : 8, borderWidth: 1, borderColor: BRAND.border, gap: 10 }}>
            {/* Date */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND.blueSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Ionicons name="calendar-outline" size={16} color={BRAND.blue} />
              </View>
              <View>
                <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 1 }}>Order Date</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>{formatDate(order.createdAt)}</Text>
              </View>
            </View>

            {/* Delivery type */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Ionicons name={order.deliveryType === 'home_delivery' ? 'home-outline' : 'storefront-outline'} size={16} color={BRAND.green} />
              </View>
              <View>
                <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 1 }}>Delivery</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>{order.deliveryType?.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'N/A'}</Text>
              </View>
            </View>

            {/* Address */}
            {order.deliveryAddress && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND.purpleSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name="location-outline" size={16} color={BRAND.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 1 }}>Address</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>{order.deliveryAddress.address}, {order.deliveryAddress.city}</Text>
                  <Text style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 1 }}>{order.deliveryAddress.phone}</Text>
                </View>
              </View>
            )}

            {/* Tracking */}
            {order.trackingNumber && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND.orangeSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name="locate-outline" size={16} color={BRAND.orange} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 1 }}>Tracking</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>{order.trackingNumber}</Text>
                  {order.courierService && <Text style={{ fontSize: 11, color: BRAND.textMuted }}>{order.courierService}</Text>}
                </View>
              </View>
            )}

            {/* Amount + payment */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name="cash-outline" size={16} color={BRAND.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 1 }}>Total</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.3 }}>{formatPrice(order.totalAmount || 0)}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: payCfg.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: payCfg.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: payCfg.text }}>{formatStatus(order.paymentStatus || 'pending')}</Text>
              </View>
            </View>

            {/* Notes */}
            {order.customerNotes && (
              <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: BRAND.border }}>
                <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 3 }}>Customer Note</Text>
                <Text style={{ fontSize: 12, color: BRAND.textSecondary, lineHeight: 17 }}>{order.customerNotes}</Text>
              </View>
            )}
          </View>

          {/* Delivery confirmation chips */}
          {order.status === 'delivered' && (
            <View style={{ backgroundColor: BRAND.blueSoft, borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderColor: '#BFDBFE' }}>
              {[
                { confirmed: order.sellerConfirmedDelivery,   label: 'You confirmed'      },
                { confirmed: order.customerConfirmedDelivery, label: 'Customer confirmed'  },
              ].map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={c.confirmed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={c.confirmed ? BRAND.green : BRAND.textMuted}
                  />
                  <Text style={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: '600' }}>{c.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action buttons */}
          {getActionButtons(order)}

          {/* Details link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('OrderDetail', { orderId: order._id, userType: 'vendor' })}
            activeOpacity={0.8}
            style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: BRAND.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.primary }}>View Full Details</Text>
            <Ionicons name="arrow-forward-circle-outline" size={16} color={BRAND.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>Loading orders…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <View style={[{
        backgroundColor: BRAND.surface,
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: BRAND.border,
      }, shadow('#000', 0.05, 8, 2)]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}
          style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: BRAND.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.border, marginRight: 12 }}>
          <Ionicons name="arrow-back" size={20} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.4 }}>Product Orders</Text>
          <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
          </Text>
        </View>
      </View>

      {/* ── SEARCH + FILTERS (sticky) ─────────────────────────────────────── */}
      <View style={{ backgroundColor: BRAND.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: BRAND.border, marginBottom: 10 }}>
          <Ionicons name="search" size={16} color={BRAND.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: BRAND.textPrimary, paddingVertical: 0 }}
            placeholder="Search orders…"
            placeholderTextColor={BRAND.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={17} color={BRAND.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const cnt = counts[f.key];
            return (
              <TouchableOpacity key={f.key} onPress={() => setActiveFilter(f.key)} activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: active ? BRAND.primary : BRAND.surfaceAlt,
                  borderWidth: 1.5, borderColor: active ? BRAND.primary : BRAND.border,
                  ...(active ? shadow(BRAND.primary, 0.25, 8, 3) : {}),
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : BRAND.textSecondary }}>{f.label}</Text>
                {cnt > 0 && (
                  <View style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : BRAND.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: active ? '#fff' : BRAND.textMuted }}>{cnt}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── ORDER LIST ────────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}
      >
        {filteredOrders.length > 0 ? (
          filteredOrders.map(renderOrderCard)
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
            <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Ionicons name="receipt-outline" size={42} color={BRAND.primary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 8, letterSpacing: -0.3 }}>No Orders</Text>
            <Text style={{ fontSize: 13, color: BRAND.textMuted, textAlign: 'center', lineHeight: 20 }}>
              {activeFilter !== 'all'
                ? `No ${formatStatus(activeFilter).toLowerCase()} orders yet`
                : "Product orders from customers will appear here"}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default VendorProductOrdersScreen;