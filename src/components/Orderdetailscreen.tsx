import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  TextInput,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
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
  bg: '#FFF5F8',
  border: '#F0F0F0',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

type Nav    = NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>;
type RouteP = RouteProp<RootStackParamList, 'OrderDetail'>;
type DisputeReason =
  | 'product_not_received' | 'product_damaged' | 'wrong_product'
  | 'product_not_as_described' | 'quality_issue' | 'delivery_issue'
  | 'payment_issue' | 'other';

interface Order {
  _id: string;
  orderNumber: string;
  items: Array<{
    product: { _id: string; name: string; images: string[] };
    quantity: number;
    price: number;
    selectedVariant?: { name: string; option: string };
  }>;
  customer: { _id: string; firstName: string; lastName: string; email: string; phone?: string };
  seller:   { _id: string; firstName: string; lastName: string; email: string; phone?: string; vendorProfile?: { businessName: string } };
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  status: string;
  paymentMethod?: string;
  paymentReference?: string;
  isPaid: boolean;
  escrowStatus?: string;
  escrowedAmount?: number;
  deliveryType: 'home_delivery' | 'pickup';
  deliveryAddress?: { fullName: string; phone: string; address: string; city: string; state: string; additionalInfo?: string };
  trackingNumber?: string;
  courierService?: string;
  customerNotes?: string;
  sellerNotes?: string;
  customerConfirmedDelivery: boolean;
  sellerConfirmedDelivery: boolean;
  canCancel?: boolean;
  hasDispute: boolean;
  dispute?: { _id: string; status: string; reason: string };
  statusHistory: Array<{ status: string; updatedAt: string; note?: string }>;
  timeline: Array<{ status: string; timestamp: string; note?: string }>;
  isRated: boolean;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLOR: Record<string, { dot: string; bg: string; text: string }> = {
  pending:          { dot: BRAND.gold,    bg: BRAND.goldSoft,   text: '#92400E' },
  processing:       { dot: BRAND.blue,    bg: BRAND.blueSoft,   text: '#1E40AF' },
  confirmed:        { dot: BRAND.blue,    bg: BRAND.blueSoft,   text: '#1E40AF' },
  shipped:          { dot: BRAND.purple,  bg: BRAND.purpleSoft, text: '#5B21B6' },
  out_for_delivery: { dot: '#6366F1',     bg: '#EEF2FF',        text: '#3730A3' },
  delivered:        { dot: BRAND.green,   bg: BRAND.greenSoft,  text: '#065F46' },
  completed:        { dot: BRAND.green,   bg: BRAND.greenSoft,  text: '#065F46' },
  cancelled:        { dot: BRAND.red,     bg: BRAND.redSoft,    text: '#991B1B' },
};
const getStatusColor = (s: string) =>
  STATUS_COLOR[s] || { dot: BRAND.textMuted, bg: BRAND.border, text: BRAND.textSecondary };

const Section: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[{
    backgroundColor: BRAND.surface,
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: BRAND.border,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
    }),
  }, style]}>
    {children}
  </View>
);

const SectionTitle: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
}> = ({ icon, color, bg, title }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
      <Ionicons name={icon} size={15} color={color} />
    </View>
    <Text style={{ fontSize: 15, fontWeight: '800', color: BRAND.textPrimary, flex: 1, letterSpacing: -0.2 }}>{title}</Text>
  </View>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 }}>
    <Text style={{ fontSize: 12, color: BRAND.textMuted, width: 72 }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND.textPrimary, flex: 1 }}>{value}</Text>
  </View>
);

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<RouteP>();
  const insets     = useSafeAreaInsets();
  const { orderId, userType } = route.params;

  const [loading, setLoading]                         = useState(true);
  const [order, setOrder]                             = useState<Order | null>(null);
  const [showDisputeForm, setShowDisputeForm]         = useState(false);
  const [disputeReason, setDisputeReason]             = useState<DisputeReason>('product_not_as_described');
  const [disputeDescription, setDisputeDescription]   = useState('');
  const [creatingDispute, setCreatingDispute]         = useState(false);

  useEffect(() => { fetchOrder(); }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrderById(orderId);

      // structured debug logging
      console.log('\n╔══════════════════════════════════════════════╗');
      console.log('║         ORDER DETAIL RESPONSE DEBUG          ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log('\n▶ response.success       :', response.success);
      console.log('▶ typeof response.data   :', typeof response.data);
      console.log('▶ response.data keys     :', Object.keys(response.data || {}));
      const d = response.data;
      console.log('\n── Layer 1: response.data ──────────────────────');
      console.log('  response.data.order  :', d?.order ? '[object]' : d?.order);
      console.log('  response.data.data   :', d?.data ? (typeof d.data === 'object' ? '[object]' : d.data) : d?.data);
      const dd = d?.data;
      if (dd) {
        console.log('\n── Layer 2: response.data.data ─────────────────');
        console.log('  .orderNumber  :', dd?.orderNumber);
        console.log('  .status       :', dd?.status);
        console.log('  .order        :', dd?.order ? '[object]' : dd?.order);
      }
      const ddo = d?.data?.order;
      if (ddo) {
        console.log('\n── Layer 3: response.data.data.order ───────────');
        console.log('  .orderNumber :', ddo?.orderNumber);
        console.log('  .status      :', ddo?.status);
        console.log('  .items count :', Array.isArray(ddo?.items) ? ddo.items.length : 'NOT array');
      }
      if (d?.order && !ddo) {
        console.log('\n── Fallback path: response.data.order ──────────');
        console.log('  .orderNumber :', d.order?.orderNumber);
        console.log('  .status      :', d.order?.status);
      }
      console.log('\n════════════════════════════════════════════════\n');

      if (response.success) {
        let orderData: any = null;
        if (response.data?.order)                                  orderData = response.data.order;
        else if (response.data?.data?.order)                       orderData = response.data.data.order;
        else if (response.data?.data && !response.data.data.order) orderData = response.data.data;

        if (orderData) {
          console.log('\n── Timeline field discovery ────────────────');
          console.log('  .timeline      :', Array.isArray(orderData.timeline)      ? `array[${orderData.timeline.length}]`      : orderData.timeline);
          console.log('  .statusHistory :', Array.isArray(orderData.statusHistory) ? `array[${orderData.statusHistory.length}]` : orderData.statusHistory);

          if (Array.isArray(orderData.statusHistory)) {
            console.log('\n── statusHistory entries ────────────────────');
            orderData.statusHistory.forEach((h: any, i: number) => {
              console.log(`  [${i}]`, JSON.stringify(h));
            });
          }

          const resolveTimeline = () => {
            if (Array.isArray(orderData.statusHistory) && orderData.statusHistory.length > 0) {
              return orderData.statusHistory.map((h: any) => ({
                status:    h.status,
                timestamp: h.updatedAt,
                note:      h.note || undefined,
              }));
            }
            if (Array.isArray(orderData.timeline) && orderData.timeline.length > 0) return orderData.timeline;
            return [];
          };

          setOrder({
            ...orderData,
            items:         Array.isArray(orderData.items) ? orderData.items : [],
            timeline:      resolveTimeline(),
            statusHistory: Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [],
            paymentStatus: orderData.escrowStatus || (orderData.isPaid ? 'paid' : 'pending'),
            canCancel:     orderData.canCancel ?? ['pending', 'processing'].includes(orderData.status),
            customer:      orderData.customer || { _id: '', firstName: 'Unknown', lastName: 'Customer', email: '' },
            seller:        orderData.seller   || { _id: '', firstName: 'Unknown', lastName: 'Seller',   email: '' },
          });
        } else {
          throw new Error('Order data not found in response');
        }
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!order) return;
    const trimmed = disputeDescription.trim();
    if (!trimmed)              { toast.error('Required', 'Please provide a description');            return; }
    if (trimmed.length < 20)   { toast.error('Too Short', 'At least 20 characters required');        return; }
    if (trimmed.length > 2000) { toast.error('Too Long', 'Max 2000 characters');                     return; }
    try {
      setCreatingDispute(true);
      const response = await orderAPI.createDispute({ order: order._id, reason: disputeReason, description: trimmed });
      if (response.success) {
        toast.success('Dispute Created', 'Our team will review your dispute shortly.');
        setShowDisputeForm(false);
        setDisputeDescription('');
        fetchOrder();
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message || 'Failed to create dispute');
    } finally {
      setCreatingDispute(false);
    }
  };

  const handleViewDispute = async () => {
    if (order?.dispute) {
      const response = await orderAPI.getDisputeById(order.dispute);
      navigation.navigate('DisputeOrderDetail', { disputeorderId: response.data.dispute._id, userType: 'customer' });
    }
  };

  const formatPrice = (p: number) => `₦ ${p.toLocaleString()}`;
  const formatDate  = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const DISPUTE_CATEGORIES: { key: DisputeReason; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'product_not_as_described', label: 'Not As Described', icon: 'document-text-outline'  },
    { key: 'product_not_received',     label: 'Not Received',     icon: 'close-circle-outline'   },
    { key: 'product_damaged',          label: 'Damaged',          icon: 'alert-circle-outline'   },
    { key: 'wrong_product',            label: 'Wrong Product',    icon: 'swap-horizontal-outline' },
    { key: 'quality_issue',            label: 'Quality Issue',    icon: 'thumbs-down-outline'    },
    { key: 'delivery_issue',           label: 'Delivery Issue',   icon: 'car-outline'            },
    { key: 'payment_issue',            label: 'Payment Issue',    icon: 'card-outline'           },
    { key: 'other',                    label: 'Other',            icon: 'ellipsis-horizontal'    },
  ];

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="dark-content" backgroundColor={BRAND.bg} />
        <ActivityIndicator size="large" color={BRAND.primary} />
        <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>Loading order…</Text>
      </View>
    );
  }

  if (!order) return null;

  const orderItems    = Array.isArray(order.items)    ? order.items    : [];
  const orderTimeline = Array.isArray(order.timeline) ? order.timeline : [];
  const subtotal      = orderItems.reduce((s, i) => s + (i?.price || 0) * (i?.quantity || 0), 0);
  const sc            = getStatusColor(order.status);

  const sellerName  = order.seller?.vendorProfile?.businessName ||
    `${order.seller?.firstName || 'Unknown'} ${order.seller?.lastName || 'Seller'}`;
  const personName  = userType === 'vendor'
    ? `${order.customer?.firstName || 'Unknown'} ${order.customer?.lastName || 'Customer'}`
    : sellerName;
  const personEmail = userType === 'vendor' ? order.customer?.email : order.seller?.email;
  const personPhone = userType === 'vendor' ? order.customer?.phone : order.seller?.phone;

  const BACK_BTN_TOP = insets.top + 10;

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.bg} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: BRAND.surface,
          paddingTop: BACK_BTN_TOP + 44,
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: BRAND.border,
          ...Platform.select({
            android: { elevation: 3 },
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
          }),
        }}>
          {/* Status badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500' }}>
              #{order.orderNumber || 'N/A'}
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: sc.bg,
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc.dot, marginRight: 5 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: sc.text, textTransform: 'capitalize' }}>
                {order.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          {/* Seller name */}
          <Text style={{ fontSize: 17, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 3, letterSpacing: -0.3 }}>
            {sellerName}
          </Text>
          <Text style={{ fontSize: 12, color: BRAND.textMuted, marginBottom: 16 }}>
            Placed {formatDate(order.createdAt)}
          </Text>

          {/* Total amount */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: BRAND.primarySoft,
            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
            borderWidth: 1, borderColor: BRAND.primaryMuted,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND.textSecondary }}>Total Amount</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: BRAND.primary, letterSpacing: -0.5 }}>
              {formatPrice(order.totalAmount || 0)}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 14 }}>

          {/* ── ORDER TIMELINE ────────────────────────────────────────────── */}
          <Section>
            <SectionTitle icon="pulse-outline" color={sc.dot} bg={`${sc.dot}18`} title="Order Timeline" />
            {orderTimeline.length > 0 ? (
              orderTimeline.map((event, index) => {
                const c = getStatusColor(event.status);
                const isLast = index === orderTimeline.length - 1;
                return (
                  <View key={index} style={{ flexDirection: 'row' }}>
                    <View style={{ alignItems: 'center', marginRight: 12, width: 14 }}>
                      <View style={{
                        width: 12, height: 12, borderRadius: 6, backgroundColor: c.dot,
                        ...Platform.select({ android: { elevation: 2 } }),
                      }} />
                      {!isLast && <View style={{ width: 2, flex: 1, marginTop: 3, backgroundColor: `${c.dot}30`, minHeight: 18 }} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: isLast ? 0 : 14 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, textTransform: 'capitalize', marginBottom: 1 }}>
                        {event.status.replace(/_/g, ' ')}
                      </Text>
                      <Text style={{ fontSize: 11, color: BRAND.textMuted }}>{formatDateTime(event.timestamp)}</Text>
                      {event.note && (
                        <View style={{ backgroundColor: BRAND.bg, borderRadius: 8, padding: 8, marginTop: 5, borderWidth: 1, borderColor: BRAND.border }}>
                          <Text style={{ fontSize: 12, color: BRAND.textSecondary, lineHeight: 17 }}>{event.note}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={{ fontSize: 13, color: BRAND.textMuted, fontStyle: 'italic' }}>No timeline events yet.</Text>
            )}
          </Section>

          {/* ── ORDER ITEMS ───────────────────────────────────────────────── */}
          {orderItems.length > 0 && (
            <Section>
              <SectionTitle icon="bag-outline" color={BRAND.primary} bg={BRAND.primarySoft} title="Order Items" />
              {orderItems.map((item, index) => (
                <View
                  key={index}
                  style={[
                    { flexDirection: 'row', alignItems: 'center' },
                    index < orderItems.length - 1 && {
                      marginBottom: 12, paddingBottom: 12,
                      borderBottomWidth: 1, borderBottomColor: BRAND.border,
                    },
                  ]}
                >
                  <View style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: item?.product?.images?.[0] || 'https://via.placeholder.com/150' }}
                      style={{ width: 76, height: 76, borderRadius: 12, backgroundColor: BRAND.bg }}
                      resizeMode="cover"
                    />
                    <View style={{
                      position: 'absolute', top: -5, right: -5,
                      width: 22, height: 22, borderRadius: 7,
                      backgroundColor: BRAND.primary,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: BRAND.surface,
                    }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{item?.quantity || 0}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 4 }} numberOfLines={2}>
                      {item?.product?.name || 'Product'}
                    </Text>
                    {item?.selectedVariant && (
                      <View style={{ backgroundColor: BRAND.bg, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 5, borderWidth: 1, borderColor: BRAND.border }}>
                        <Text style={{ fontSize: 11, color: BRAND.textSecondary }}>
                          {item.selectedVariant.name}: {item.selectedVariant.option}
                        </Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, color: BRAND.textMuted }}>×{item?.quantity || 0} @ {formatPrice(item?.price || 0)}</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: BRAND.primary }}>
                        {formatPrice((item?.price || 0) * (item?.quantity || 0))}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Section>
          )}

          {/* ── CUSTOMER INFO (vendor view only) ─────────────────────────── */}
          {userType === 'vendor' && (
            <Section>
              <SectionTitle icon="person-outline" color={BRAND.primary} bg={BRAND.primarySoft} title="Customer Information" />
              <View style={{ backgroundColor: BRAND.bg, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: BRAND.border }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 8 }}>{personName}</Text>
                <Row label="Email" value={personEmail || 'N/A'} />
                {personPhone && <Row label="Phone" value={personPhone} />}
              </View>
            </Section>
          )}

          {/* ── DELIVERY INFO ─────────────────────────────────────────────── */}
          <Section>
            <SectionTitle icon="location-outline" color={BRAND.blue} bg={BRAND.blueSoft} title="Delivery Information" />

            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: BRAND.bg, borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 10,
              marginBottom: 10, borderWidth: 1, borderColor: BRAND.border,
            }}>
              <Ionicons
                name={order.deliveryType === 'home_delivery' ? 'home-outline' : 'storefront-outline'}
                size={14} color={BRAND.blue} style={{ marginRight: 8 }}
              />
              <Text style={{ fontSize: 12, color: BRAND.textMuted, marginRight: 8 }}>Type</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, textTransform: 'capitalize' }}>
                {order.deliveryType?.replace('_', ' ') || 'N/A'}
              </Text>
            </View>

            {order.deliveryAddress && order.deliveryType === 'home_delivery' && (
              <View style={{ backgroundColor: BRAND.bg, borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: BRAND.border }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  Delivery Address
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 6 }}>
                  {order.deliveryAddress.fullName}
                </Text>
                <Row label="Address" value={order.deliveryAddress.address} />
                <Row label="City"    value={`${order.deliveryAddress.city}, ${order.deliveryAddress.state}`} />
                <Row label="Phone"   value={order.deliveryAddress.phone} />
                {order.deliveryAddress.additionalInfo && (
                  <View style={{ backgroundColor: BRAND.goldSoft, borderRadius: 8, padding: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 11, color: '#92400E', fontStyle: 'italic' }}>
                      {order.deliveryAddress.additionalInfo}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {order.trackingNumber && (
              <View style={{ backgroundColor: BRAND.purpleSoft, borderRadius: 12, padding: 13, borderWidth: 1, borderColor: `${BRAND.purple}33` }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND.purple, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
                  Tracking Number
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#5B21B6', marginBottom: 2 }}>
                  {order.trackingNumber}
                </Text>
                {order.courierService && (
                  <Text style={{ fontSize: 12, color: BRAND.purple }}>{order.courierService}</Text>
                )}
              </View>
            )}
          </Section>

          {/* ── PAYMENT SUMMARY ───────────────────────────────────────────── */}
          <Section>
            <SectionTitle icon="wallet-outline" color={BRAND.green} bg={BRAND.greenSoft} title="Payment Summary" />
            <View style={{ gap: 9 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: BRAND.textSecondary }}>Subtotal ({orderItems.length} items)</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>{formatPrice(subtotal)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
                <Text style={{ fontSize: 13, color: BRAND.textSecondary }}>Delivery fee</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>
                  {order.deliveryType === 'pickup' || order.deliveryFee === 0
                    ? 'Free'
                    : order.deliveryFee
                    ? formatPrice(order.deliveryFee)
                    : 'Included'}
                </Text>
              </View>
              {order.discount > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
                  <Text style={{ fontSize: 13, color: BRAND.green }}>Discount</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.green }}>-{formatPrice(order.discount)}</Text>
                </View>
              )}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: BRAND.primarySoft, borderRadius: 11,
                paddingHorizontal: 13, paddingVertical: 11,
                borderWidth: 1, borderColor: BRAND.primaryMuted,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary }}>Total</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: BRAND.primary, letterSpacing: -0.5 }}>
                  {formatPrice(order.totalAmount || 0)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: BRAND.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: BRAND.border }}>
                <Text style={{ fontSize: 12, color: BRAND.textMuted }}>Payment status</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: BRAND.textPrimary, textTransform: 'capitalize' }}>
                  {(order as any).paymentStatus || 'pending'}
                </Text>
              </View>
            </View>
          </Section>

          {/* ── NOTES ─────────────────────────────────────────────────────── */}
          {(order.customerNotes || order.sellerNotes) && (
            <Section>
              <SectionTitle icon="document-text-outline" color={BRAND.gold} bg={BRAND.goldSoft} title="Notes" />
              {order.customerNotes && (
                <View style={{ backgroundColor: BRAND.blueSoft, borderRadius: 11, padding: 11, marginBottom: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND.blue, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.4 }}>Customer Note</Text>
                  <Text style={{ fontSize: 13, color: '#1E40AF', lineHeight: 18 }}>{order.customerNotes}</Text>
                </View>
              )}
              {order.sellerNotes && (
                <View style={{ backgroundColor: BRAND.purpleSoft, borderRadius: 11, padding: 11, borderWidth: 1, borderColor: `${BRAND.purple}33` }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND.purple, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.4 }}>Seller Note</Text>
                  <Text style={{ fontSize: 13, color: '#5B21B6', lineHeight: 18 }}>{order.sellerNotes}</Text>
                </View>
              )}
            </Section>
          )}

          {/* ── ACTIVE DISPUTE ────────────────────────────────────────────── */}
          {(order.hasDispute || order.dispute) && (
            <View style={{
              backgroundColor: BRAND.orangeSoft, borderRadius: 16, padding: 16, marginBottom: 12,
              borderWidth: 1.5, borderColor: '#FED7AA',
              ...Platform.select({ android: { elevation: 3 } }),
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: BRAND.orange, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="alert-circle" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#9A3412' }}>Dispute Active</Text>
                  <Text style={{ fontSize: 11, color: '#C2410C', marginTop: 1 }}>Action may be required</Text>
                </View>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 10, padding: 11, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#9A3412', width: 60 }}>Status</Text>
                  <Text style={{ fontSize: 12, color: '#9A3412', flex: 1, textTransform: 'capitalize' }}>{order.dispute?.status ?? '—'}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#9A3412', width: 60 }}>Reason</Text>
                  <Text style={{ fontSize: 12, color: '#9A3412', flex: 1, textTransform: 'capitalize' }}>{order.dispute?.reason?.replace(/_/g, ' ') ?? '—'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleViewDispute} activeOpacity={0.85} style={{ borderRadius: 11, overflow: 'hidden' }}>
                <LinearGradient
                  colors={[BRAND.orange, '#EA580C']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Ionicons name="eye-outline" size={15} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>View Dispute Details</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* ── CHAT VENDOR ───────────────────────────────────────────────── */}
          {userType !== 'vendor' && order.seller?._id && (
            <TouchableOpacity
              onPress={() => navigation.navigate('ChatDetail', { otherUserId: order.seller._id, otherUserName: sellerName })}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                paddingVertical: 14, borderRadius: 14, marginBottom: 12, gap: 7,
                backgroundColor: BRAND.blueSoft,
                borderWidth: 1.5, borderColor: '#BFDBFE',
              }}
            >
              <Ionicons name="chatbubble-outline" size={17} color={BRAND.blue} />
              <Text style={{ color: BRAND.blue, fontSize: 14, fontWeight: '700' }}>Chat with Vendor</Text>
            </TouchableOpacity>
          )}

          {/* ── LEAVE REVIEW ──────────────────────────────────────────────── */}
          {userType !== 'vendor' && (order.status === 'completed' || order.status === 'delivered') && !order.isRated && (
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateReview', {
                bookingId: order._id,
                vendorName: personName,
                serviceName: orderItems[0]?.product?.name || 'Order',
                completedAt: order.updatedAt,
              })}
              activeOpacity={0.85}
              style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}
            >
              <LinearGradient
                colors={[BRAND.gold, '#D97706']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 7 }}
              >
                <Ionicons name="star-outline" size={17} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Leave a Review</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── RAISE DISPUTE ─────────────────────────────────────────────── */}
          {!order.hasDispute && !order.dispute && (order.status === 'delivered' || order.status === 'completed') && !showDisputeForm && (
            <TouchableOpacity
              onPress={() => setShowDisputeForm(true)}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                paddingVertical: 14, borderRadius: 14, marginBottom: 12, gap: 7,
                backgroundColor: BRAND.redSoft,
                borderWidth: 1.5, borderColor: '#FECACA',
              }}
            >
              <Ionicons name="alert-circle-outline" size={17} color={BRAND.red} />
              <Text style={{ color: BRAND.red, fontSize: 14, fontWeight: '700' }}>Report Issue / Create Dispute</Text>
            </TouchableOpacity>
          )}

          {/* ── DISPUTE FORM ──────────────────────────────────────────────── */}
          {showDisputeForm && (
            <Section>
              <SectionTitle icon="warning-outline" color={BRAND.red} bg={BRAND.redSoft} title="Create Dispute" />

              <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
                Issue Type *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14, paddingBottom: 2 }}>
                {DISPUTE_CATEGORIES.map((cat) => {
                  const active = disputeReason === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      onPress={() => setDisputeReason(cat.key)}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                        backgroundColor: active ? BRAND.red : BRAND.bg,
                        borderWidth: 1.5, borderColor: active ? BRAND.red : BRAND.border,
                      }}
                    >
                      <Ionicons name={cat.icon} size={12} color={active ? '#fff' : BRAND.textMuted} style={{ marginRight: 5 }} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : BRAND.textSecondary }}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Description *
                </Text>
                <Text style={{
                  fontSize: 11, fontWeight: '600',
                  color: disputeDescription.length > 2000 ? BRAND.red : disputeDescription.length > 1800 ? BRAND.orange : BRAND.textMuted,
                }}>
                  {disputeDescription.length}/2000
                </Text>
              </View>
              <TextInput
                style={{
                  backgroundColor: BRAND.bg, borderWidth: 1.5, borderColor: BRAND.border,
                  borderRadius: 12, paddingHorizontal: 13, paddingTop: 11, paddingBottom: 11,
                  fontSize: 14, color: BRAND.textPrimary, textAlignVertical: 'top', minHeight: 120, marginBottom: 6,
                }}
                placeholder="Provide a detailed explanation (min 20 characters)…"
                placeholderTextColor={BRAND.textMuted}
                value={disputeDescription}
                onChangeText={setDisputeDescription}
                multiline
                maxLength={2000}
              />
              {disputeDescription.length > 0 && disputeDescription.length < 20 && (
                <Text style={{ fontSize: 11, color: BRAND.orange, marginBottom: 10 }}>
                  {20 - disputeDescription.length} more characters needed
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => { setShowDisputeForm(false); setDisputeDescription(''); }}
                  activeOpacity={0.8}
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: BRAND.borderStrong, backgroundColor: BRAND.bg }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateDispute}
                  disabled={creatingDispute || disputeDescription.trim().length < 20}
                  activeOpacity={0.85}
                  style={{
                    flex: 1, borderRadius: 12, overflow: 'hidden',
                    opacity: (creatingDispute || disputeDescription.trim().length < 20) ? 0.5 : 1,
                  }}
                >
                  <LinearGradient
                    colors={[BRAND.red, '#DC2626']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 13, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {creatingDispute
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Submit Dispute</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Section>
          )}
        </View>
      </ScrollView>

      {/* FLOATING BACK BUTTON */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          top: BACK_BTN_TOP,
          left: 16,
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: BRAND.surface,
          alignItems: 'center', justifyContent: 'center',
          ...Platform.select({
            android: { elevation: 6 },
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
          }),
        }}
      >
        <Ionicons name="chevron-back" size={22} color={BRAND.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

export default OrderDetailScreen;
