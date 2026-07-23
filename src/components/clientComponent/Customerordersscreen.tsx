import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  green: '#10B981',
  red: '#EF4444',
  surface: '#FFFFFF',
  bg: '#FFF5F8',
  border: '#F0F0F0',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

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
  isRated?: boolean;
  createdAt: string;
}

const PAYMENT_BADGE: Record<string, { bg: string; text: string }> = {
  paid:     { bg: '#D1FAE5', text: '#065F46' },
  escrowed: { bg: '#DBEAFE', text: '#1E40AF' },
  released: { bg: '#D1FAE5', text: '#065F46' },
  refunded: { bg: '#FFEDD5', text: '#9A3412' },
  failed:   { bg: '#FEE2E2', text: '#991B1B' },
  pending:  { bg: '#FEF3C7', text: '#92400E' },
};

const STATUS_LABEL: Record<string, { bg: string; text: string }> = {
  pending:          { bg: '#FEF3C7', text: '#92400E' },
  processing:       { bg: '#DBEAFE', text: '#1E40AF' },
  confirmed:        { bg: '#DBEAFE', text: '#1E40AF' },
  shipped:          { bg: '#EDE9FE', text: '#5B21B6' },
  out_for_delivery: { bg: '#EEF2FF', text: '#3730A3' },
  delivered:        { bg: '#D1FAE5', text: '#065F46' },
  completed:        { bg: '#D1FAE5', text: '#065F46' },
  cancelled:        { bg: '#FEE2E2', text: '#991B1B' },
};

const CustomerOrdersScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [orders, setOrders]                 = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter]     = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading]   = useState<string | null>(null);
  const [confirmModal, setConfirmModal]     = useState({ visible: false, title: '', message: '', onConfirm: () => {} });
  const [cancelModal, setCancelModal]       = useState({ visible: false, orderId: '' });
  const [cancelReason, setCancelReason]     = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getMyOrders({ page: 1, limit: 100 });
      if (response.success) {
        let list: any[] = [];
        if (Array.isArray(response.data?.data))        list = response.data.data;
        else if (Array.isArray(response.data))         list = response.data;
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
    setFilteredOrders(filtered);
  }, [orders, activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  const handleCancelOrder = (orderId: string) => {
    setCancelReason('');
    setCancelModal({ visible: true, orderId });
  };

  const submitCancelOrder = async () => {
    const reason = cancelReason.trim();
    if (!reason) { toast.error('Required', 'Please provide a cancellation reason'); return; }
    const orderId = cancelModal.orderId;
    setCancelModal({ visible: false, orderId: '' });
    try {
      setActionLoading(orderId);
      await orderAPI.cancelOrder(orderId, reason);
      toast.success('Cancelled', 'Order cancelled. Refund will be processed.');
      fetchOrders();
    } catch (error) {
      toast.error('Error', handleAPIError(error).message || 'Failed to cancel order');
    } finally { setActionLoading(null); }
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

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day} ${month}, ${year}  ·  ${time}`;
  };

  const formatPrice = (p: number) => `₦ ${p.toLocaleString()}`;

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all',        label: 'All'        },
    { key: 'pending',    label: 'Pending'    },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped',    label: 'Shipped'    },
    { key: 'delivered',  label: 'Delivered'  },
    { key: 'completed',  label: 'Completed'  },
    { key: 'cancelled',  label: 'Cancelled'  },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>Loading orders…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <SafeAreaView style={{ backgroundColor: BRAND.surface }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

        {/* ── HEADER ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
          backgroundColor: BRAND.surface,
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}
          >
            <Ionicons name="chevron-back" size={26} color={BRAND.primary} />
          </TouchableOpacity>

          <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.4 }}>
            My Orders
          </Text>
        </View>

        {/* ── FILTER PILLS ── */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, gap: 8 }}
          style={{ backgroundColor: BRAND.surface, borderBottomWidth: 1, borderBottomColor: BRAND.border }}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.75}
                style={{
                  paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: isActive ? BRAND.primary : BRAND.bg,
                  borderWidth: 1, borderColor: isActive ? BRAND.primary : BRAND.borderStrong,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#fff' : BRAND.textSecondary }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── ORDER LIST ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />
        }
      >
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const isActionLoading = actionLoading === order._id;
            const orderItems = Array.isArray(order.items) ? order.items : [];
            const sellerName =
              order.seller?.vendorProfile?.businessName ||
              `${order.seller?.firstName || ''} ${order.seller?.lastName || ''}`.trim() ||
              'Unknown Seller';
            const payBadge = PAYMENT_BADGE[order.paymentStatus] || PAYMENT_BADGE.pending;
            const stBadge  = STATUS_LABEL[order.status] || { bg: '#F3F4F6', text: '#6B7280' };
            const isDone   = order.status === 'completed' || order.status === 'delivered';

            return (
              <TouchableOpacity
                key={order._id}
                onPress={() => navigation.navigate('OrderDetail', { orderId: order._id, userType: 'customer' })}
                activeOpacity={0.97}
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: BRAND.border,
                  overflow: 'hidden',
                  ...Platform.select({
                    android: { elevation: 3 },
                    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
                  }),
                }}
              >
                {/* DATE + PAYMENT BADGE */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 14, paddingVertical: 11,
                  borderBottomWidth: 1, borderBottomColor: BRAND.border,
                }}>
                  <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500' }}>
                    {formatDateTime(order.createdAt)}
                  </Text>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: payBadge.bg,
                    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
                  }}>
                    <Ionicons name="checkmark-circle" size={11} color={payBadge.text} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: payBadge.text, marginLeft: 3, textTransform: 'capitalize' }}>
                      {order.paymentStatus}
                    </Text>
                  </View>
                </View>

                {/* PRODUCT ROWS */}
                <View style={{ paddingHorizontal: 14 }}>
                  {orderItems.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
                        idx < orderItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: BRAND.border },
                      ]}
                    >
                      <Image
                        source={{ uri: item?.product?.images?.[0] || 'https://via.placeholder.com/150' }}
                        style={{ width: 62, height: 62, borderRadius: 10, backgroundColor: BRAND.bg }}
                        resizeMode="cover"
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 3 }} numberOfLines={1}>
                          {item?.product?.name || 'Product'}
                        </Text>
                        {item?.selectedVariant && (
                          <Text style={{ fontSize: 11, color: BRAND.textMuted, marginBottom: 2 }}>
                            {item.selectedVariant.name}: {item.selectedVariant.option}
                          </Text>
                        )}
                        <Text style={{ fontSize: 12, color: BRAND.textSecondary }}>
                          Qty: {item?.quantity || 0}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginLeft: 8 }}>
                        {formatPrice((item?.price || 0) * (item?.quantity || 0))}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* ORDER STATUS BADGE (non-completed orders) */}
                {!isDone && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 10, paddingTop: 2 }}>
                    <View style={{
                      alignSelf: 'flex-start',
                      backgroundColor: stBadge.bg,
                      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: stBadge.text, textTransform: 'capitalize' }}>
                        {order.status.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  </View>
                )}

                {/* CONFIRM DELIVERY BUTTON */}
                {order.status === 'delivered' && !order.customerConfirmedDelivery && (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); handleConfirmDelivery(order._id); }}
                    disabled={isActionLoading}
                    activeOpacity={0.85}
                    style={{
                      marginHorizontal: 14, marginBottom: 10,
                      backgroundColor: BRAND.green, borderRadius: 10,
                      paddingVertical: 11, alignItems: 'center',
                      flexDirection: 'row', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {isActionLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Confirm Received</Text>
                        </>
                    }
                  </TouchableOpacity>
                )}

                {/* CANCEL BUTTON */}
                {order.canCancel && (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); handleCancelOrder(order._id); }}
                    disabled={isActionLoading}
                    activeOpacity={0.8}
                    style={{
                      marginHorizontal: 14, marginBottom: 10,
                      borderWidth: 1.5, borderColor: BRAND.red,
                      borderRadius: 10, paddingVertical: 10,
                      alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5,
                    }}
                  >
                    {isActionLoading
                      ? <ActivityIndicator size="small" color={BRAND.red} />
                      : <>
                          <Ionicons name="close-circle-outline" size={15} color={BRAND.red} />
                          <Text style={{ color: BRAND.red, fontSize: 13, fontWeight: '600' }}>Cancel Order</Text>
                        </>
                    }
                  </TouchableOpacity>
                )}

                {/* BOTTOM BUTTONS: Leave Review | Chat Vendor */}
                <View style={{
                  flexDirection: 'row', gap: 10,
                  paddingHorizontal: 14, paddingVertical: 12,
                  borderTopWidth: 1, borderTopColor: BRAND.border,
                }}>
                  {/* Left button */}
                  {isDone && !order.isRated ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        navigation.navigate('CreateReview', {
                          bookingId: order._id,
                          vendorName: sellerName,
                          serviceName: orderItems[0]?.product?.name || 'Order',
                          completedAt: order.createdAt,
                        });
                      }}
                      activeOpacity={0.8}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        paddingVertical: 11, borderRadius: 10, gap: 3,
                        borderWidth: 1.5, borderColor: BRAND.primary,
                        backgroundColor: BRAND.surface,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND.primary }}>Leave Review</Text>
                      <Ionicons name="chevron-forward" size={13} color={BRAND.primary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation?.(); navigation.navigate('OrderDetail', { orderId: order._id, userType: 'customer' }); }}
                      activeOpacity={0.8}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                        paddingVertical: 11, borderRadius: 10, gap: 3,
                        borderWidth: 1.5, borderColor: '#E5E7EB',
                        backgroundColor: BRAND.surface,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND.textSecondary }}>View Details</Text>
                      <Ionicons name="chevron-forward" size={13} color={BRAND.textSecondary} />
                    </TouchableOpacity>
                  )}

                  {/* Chat Vendor */}
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      if (order.seller?._id) {
                        navigation.navigate('ChatDetail', {
                          otherUserId: order.seller._id,
                          otherUserName: sellerName,
                        });
                      }
                    }}
                    activeOpacity={0.85}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      paddingVertical: 11, borderRadius: 10, gap: 3,
                      backgroundColor: BRAND.primary,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Chat Vendor</Text>
                    <Ionicons name="chevron-forward" size={13} color="#fff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          /* EMPTY STATE */
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
            <View style={{
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: BRAND.primarySoft,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Ionicons name="bag-outline" size={42} color={BRAND.primary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 8, letterSpacing: -0.4 }}>
              No Orders Yet
            </Text>
            <Text style={{ fontSize: 14, color: BRAND.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
              {activeFilter !== 'all'
                ? `No ${activeFilter.replace(/_/g, ' ')} orders found`
                : "You haven't placed any orders yet. Start shopping!"}
            </Text>
            <TouchableOpacity
              onPress={activeFilter !== 'all' ? () => setActiveFilter('all') : () => navigation.navigate('Marketplace')}
              activeOpacity={0.85}
              style={{ backgroundColor: BRAND.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {activeFilter !== 'all' ? 'View All Orders' : 'Start Shopping'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, visible: false })); }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />

      {/* CANCEL MODAL */}
      {cancelModal.visible && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: BRAND.surface, borderRadius: 20, padding: 22, width: '100%',
            ...Platform.select({
              android: { elevation: 24 },
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
            }),
          }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 3 }}>
              Cancel Order
            </Text>
            <Text style={{ fontSize: 13, color: BRAND.textMuted, marginBottom: 16 }}>
              Tell us why you're cancelling
            </Text>

            <TextInput
              style={{
                backgroundColor: BRAND.bg,
                borderWidth: 1.5,
                borderColor: cancelReason.length > 0 ? BRAND.primary : BRAND.border,
                borderRadius: 12,
                paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
                fontSize: 14, color: BRAND.textPrimary,
                textAlignVertical: 'top', minHeight: 90,
                marginBottom: 16,
              }}
              placeholder="e.g. Changed my mind, found a better price…"
              placeholderTextColor={BRAND.textMuted}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              autoFocus
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setCancelModal({ visible: false, orderId: '' })}
                activeOpacity={0.8}
                style={{
                  flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
                  borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: BRAND.bg,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: BRAND.textSecondary }}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitCancelOrder}
                disabled={!cancelReason.trim()}
                activeOpacity={0.85}
                style={{
                  flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
                  backgroundColor: cancelReason.trim() ? BRAND.red : '#FCA5A5',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default CustomerOrdersScreen;
