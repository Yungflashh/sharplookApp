import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, handleAPIError } from '@/api/api';

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
type Nav  = NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>;
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
  seller: { _id: string; firstName: string; lastName: string; email: string; phone?: string; vendorProfile?: { businessName: string } };
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  status: string;
  paymentMethod?: string;
  paymentReference?: string;
  isPaid: boolean;
  escrowStatus?: string;      // 'held' | 'released' | 'refunded'
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
  timeline: Array<{ status: string; timestamp: string; note?: string }>; // normalised from statusHistory
  isRated: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Status dot color ─────────────────────────────────────────────────────────
const statusDot = (s: string) => {
  switch (s.toLowerCase()) {
    case 'pending':                   return BRAND.gold;
    case 'confirmed': case 'processing': return BRAND.blue;
    case 'shipped':                   return BRAND.purple;
    case 'delivered': case 'completed': return BRAND.green;
    case 'cancelled':                 return BRAND.red;
    default:                          return BRAND.textMuted;
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Section card wrapper */
const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View
    style={[
      {
        backgroundColor: BRAND.surface,
        borderRadius: 20,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: BRAND.border,
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
          android: { elevation: 2 },
        }),
      },
      style,
    ]}
  >
    {children}
  </View>
);

/** Section header row */
const CardHeader: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  badge?: React.ReactNode;
}> = ({ icon, iconColor, iconBg, title, badge }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
    <View
      style={{
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: iconBg,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
      }}
    >
      <Ionicons name={icon} size={16} color={iconColor} />
    </View>
    <Text style={{ fontSize: 15, fontWeight: '800', color: BRAND.textPrimary, flex: 1, letterSpacing: -0.2 }}>
      {title}
    </Text>
    {badge}
  </View>
);

/** Key-value info row */
const InfoRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconColor?: string;
}> = ({ icon, label, value, iconColor = BRAND.textMuted }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
    <Ionicons name={icon} size={13} color={iconColor} style={{ marginRight: 8, width: 16 }} />
    <Text style={{ fontSize: 12, color: BRAND.textMuted, width: 70 }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND.textPrimary, flex: 1 }}>{value}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { orderId, userType } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading]                 = useState(true);
  const [order, setOrder]                     = useState<Order | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason]     = useState<DisputeReason>('product_not_as_described');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [creatingDispute, setCreatingDispute] = useState(false);

  useEffect(() => { fetchOrder(); }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrderById(orderId);

      // ── STRUCTURED DEBUG LOGGING ────────────────────────────────────────
      console.log('\n╔══════════════════════════════════════════════╗');
      console.log('║         ORDER DETAIL RESPONSE DEBUG          ║');
      console.log('╚══════════════════════════════════════════════╝');

      console.log('\n▶ response.success       :', response.success);
      console.log('▶ typeof response.data   :', typeof response.data);
      console.log('▶ response.data keys     :', Object.keys(response.data || {}));

      // Layer 1 — response.data
      const d = response.data;
      console.log('\n── Layer 1: response.data ──────────────────────');
      console.log('  response.data                 :', d ? '[object]' : d);
      console.log('  response.data.order           :', d?.order ? '[object]' : d?.order);
      console.log('  response.data.data            :', d?.data ? (typeof d.data === 'object' ? '[object]' : d.data) : d?.data);

      // Layer 2 — response.data.data
      const dd = d?.data;
      if (dd) {
        console.log('\n── Layer 2: response.data.data ─────────────────');
        console.log('  typeof                        :', typeof dd);
        console.log('  keys                          :', Array.isArray(dd) ? '[array]' : Object.keys(dd));
        console.log('  .order                        :', dd?.order ? '[object]' : dd?.order);
        console.log('  .orderNumber                  :', dd?.orderNumber);
        console.log('  .status                       :', dd?.status);
      }

      // Layer 3 — response.data.data.order (if present)
      const ddo = d?.data?.order;
      if (ddo) {
        console.log('\n── Layer 3: response.data.data.order ───────────');
        console.log('  .orderNumber                  :', ddo?.orderNumber);
        console.log('  .status                       :', ddo?.status);
        console.log('  .paymentStatus                :', ddo?.paymentStatus);
        console.log('  .deliveryType                 :', ddo?.deliveryType);
        console.log('  .totalAmount                  :', ddo?.totalAmount);
        console.log('  .items (count)                :', Array.isArray(ddo?.items) ? ddo.items.length : 'NOT an array');
        console.log('  .timeline (count)             :', Array.isArray(ddo?.timeline) ? ddo.timeline.length : 'NOT an array');
        console.log('  .statusHistory (count)        :', Array.isArray(ddo?.statusHistory) ? ddo.statusHistory.length : 'NOT an array');
        console.log('  .customer                     :', ddo?.customer ? '[object]' : ddo?.customer);
        console.log('  .seller                       :', ddo?.seller ? '[object]' : ddo?.seller);
        console.log('  .deliveryAddress              :', ddo?.deliveryAddress ? '[object]' : ddo?.deliveryAddress);
        console.log('  .trackingNumber               :', ddo?.trackingNumber);
        console.log('  .dispute                      :', ddo?.dispute ? '[object]' : ddo?.dispute);
        console.log('  .canCancel                    :', ddo?.canCancel);
        console.log('  .customerConfirmedDelivery    :', ddo?.customerConfirmedDelivery);
        console.log('  .sellerConfirmedDelivery      :', ddo?.sellerConfirmedDelivery);

        if (Array.isArray(ddo?.items) && ddo.items.length > 0) {
          console.log('\n  ── First item sample ───────────────────────');
          const fi = ddo.items[0];
          console.log('    .product                    :', fi?.product ? '[object]' : fi?.product);
          console.log('    .product._id                :', fi?.product?._id);
          console.log('    .product.name               :', fi?.product?.name);
          console.log('    .product.images (count)     :', Array.isArray(fi?.product?.images) ? fi.product.images.length : 'NOT an array');
          console.log('    .quantity                   :', fi?.quantity);
          console.log('    .price                      :', fi?.price);
          console.log('    .selectedVariant            :', fi?.selectedVariant);
        }

        if (Array.isArray(ddo?.timeline) && ddo.timeline.length > 0) {
          console.log('\n  ── Timeline events ─────────────────────────');
          ddo.timeline.forEach((ev: any, i: number) => {
            console.log(`    [${i}] status: ${ev?.status}, timestamp: ${ev?.timestamp}, note: ${ev?.note ?? '—'}`);
          });
        }

        if (ddo?.customer) {
          console.log('\n  ── customer ────────────────────────────────');
          const c = ddo.customer;
          console.log('    ._id                        :', c?._id);
          console.log('    .firstName                  :', c?.firstName);
          console.log('    .lastName                   :', c?.lastName);
          console.log('    .email                      :', c?.email);
          console.log('    .phone                      :', c?.phone);
        }

        if (ddo?.seller) {
          console.log('\n  ── seller ──────────────────────────────────');
          const s = ddo.seller;
          console.log('    ._id                        :', s?._id);
          console.log('    .firstName                  :', s?.firstName);
          console.log('    .lastName                   :', s?.lastName);
          console.log('    .email                      :', s?.email);
          console.log('    .phone                      :', s?.phone);
          console.log('    .vendorProfile?.businessName:', s?.vendorProfile?.businessName);
        }

        if (ddo?.dispute) {
          console.log('\n  ── dispute ─────────────────────────────────');
          console.log('    ._id                        :', ddo.dispute?._id);
          console.log('    .status                     :', ddo.dispute?.status);
          console.log('    .reason                     :', ddo.dispute?.reason);
        }
      }

      // Fallback path — response.data.order
      if (d?.order && !ddo) {
        console.log('\n── Fallback path: response.data.order ──────────');
        const o = d.order;
        console.log('  .orderNumber                  :', o?.orderNumber);
        console.log('  .status                       :', o?.status);
        console.log('  .items (count)                :', Array.isArray(o?.items) ? o.items.length : 'NOT an array');
        console.log('  .timeline (count)             :', Array.isArray(o?.timeline) ? o.timeline.length : 'NOT an array');
      }

      console.log('\n════════════════════════════════════════════════\n');
      // ── END DEBUG LOGGING ───────────────────────────────────────────────

      if (response.success) {
        let orderData: any = null;

        // ✅ Confirmed shape: response.data.order (from logs)
        if (response.data?.order)                                  orderData = response.data.order;
        else if (response.data?.data?.order)                       orderData = response.data.data.order;
        else if (response.data?.data && !response.data.data.order) orderData = response.data.data;

        if (orderData) {
          // Discover which key holds timeline events
          console.log('\n── Timeline field discovery ────────────────');
          console.log('  all orderData keys            :', Object.keys(orderData));
          console.log('  .timeline                     :', Array.isArray(orderData.timeline) ? `array[${orderData.timeline.length}]` : orderData.timeline);
          console.log('  .statusHistory                :', Array.isArray(orderData.statusHistory) ? `array[${orderData.statusHistory.length}]` : orderData.statusHistory);
          console.log('  .orderHistory                 :', Array.isArray(orderData.orderHistory) ? `array[${orderData.orderHistory.length}]` : orderData.orderHistory);
          console.log('  .history                      :', Array.isArray(orderData.history) ? `array[${orderData.history.length}]` : orderData.history);
          console.log('  .events                       :', Array.isArray(orderData.events) ? `array[${orderData.events.length}]` : orderData.events);

          // Log the actual statusHistory entries so we can see their shape
          if (Array.isArray(orderData.statusHistory)) {
            console.log('\n── statusHistory entries ────────────────────');
            orderData.statusHistory.forEach((h: any, i: number) => {
              console.log(`  [${i}] keys:`, Object.keys(h));
              console.log(`  [${i}] full:`, JSON.stringify(h));
            });
          }
          console.log('────────────────────────────────────────────────\n');

          // Resolve timeline — confirmed shape: statusHistory[].{ status, updatedAt, updatedBy, _id }
          const resolveTimeline = () => {
            if (Array.isArray(orderData.statusHistory) && orderData.statusHistory.length > 0) {
              return orderData.statusHistory.map((h: any) => ({
                status:    h.status,
                timestamp: h.updatedAt,   // confirmed key from logs
                note:      h.note || undefined,
              }));
            }
            if (Array.isArray(orderData.timeline) && orderData.timeline.length > 0)
              return orderData.timeline;
            return [];
          };

          setOrder({
            ...orderData,
            items:    Array.isArray(orderData.items) ? orderData.items : [],
            timeline: resolveTimeline(),
            // Normalise statusHistory so existing timeline UI works
            statusHistory: Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [],
            // Alias escrowStatus → paymentStatus for display
            paymentStatus: orderData.escrowStatus || (orderData.isPaid ? 'paid' : 'pending'),
            // canCancel may not come from API — derive from status
            canCancel: orderData.canCancel ?? ['pending', 'processing'].includes(orderData.status),
            customer: orderData.customer || { _id: '', firstName: 'Unknown', lastName: 'Customer', email: '' },
            seller:   orderData.seller   || { _id: '', firstName: 'Unknown', lastName: 'Seller',   email: '' },
          });
        } else {
          throw new Error('Order data not found in response');
        }
      }
    } catch (error) {
      Alert.alert('Error', handleAPIError(error).message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!order) return;
    const trimmed = disputeDescription.trim();
    if (!trimmed)              { Alert.alert('Required', 'Please provide a description');                          return; }
    if (trimmed.length < 20)   { Alert.alert('Too Short', 'Please provide at least 20 characters');               return; }
    if (trimmed.length > 2000) { Alert.alert('Too Long', 'Description cannot exceed 2000 characters');             return; }
    try {
      setCreatingDispute(true);
      const response = await orderAPI.createDispute({ order: order._id, reason: disputeReason, description: trimmed });
      if (response.success) {
        Alert.alert('Dispute Created', 'Your dispute has been submitted. Our team will review it shortly.', [
          { text: 'OK', onPress: () => { setShowDisputeForm(false); setDisputeDescription(''); fetchOrder(); } },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', handleAPIError(error).message || 'Failed to create dispute');
    } finally {
      setCreatingDispute(false);
    }
  };

  const handleFetchDisputeStatus = async () => {
    if (order?.dispute) {
      const response = await orderAPI.getDisputeById(order.dispute);
      navigation.navigate('DisputeOrderDetail', { disputeorderId: response.data.dispute._id, userType: 'customer' });
    }
  };

  const formatPrice = (p: number) => `₦${p.toLocaleString()}`;
  const formatDate  = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const DISPUTE_CATEGORIES: { key: DisputeReason; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'product_not_as_described', label: 'Not As Described', icon: 'document-text-outline' },
    { key: 'product_not_received',     label: 'Not Received',     icon: 'close-circle-outline'  },
    { key: 'product_damaged',          label: 'Damaged',          icon: 'alert-circle-outline'  },
    { key: 'wrong_product',            label: 'Wrong Product',    icon: 'swap-horizontal-outline'},
    { key: 'quality_issue',            label: 'Quality Issue',    icon: 'thumbs-down-outline'   },
    { key: 'delivery_issue',           label: 'Delivery Issue',   icon: 'car-outline'           },
    { key: 'payment_issue',            label: 'Payment Issue',    icon: 'card-outline'          },
    { key: 'other',                    label: 'Other',            icon: 'ellipsis-horizontal'   },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>
            Loading order details…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const orderItems    = Array.isArray(order.items)    ? order.items    : [];
  const orderTimeline = Array.isArray(order.timeline) ? order.timeline : [];
  const subtotal      = orderItems.reduce((s, i) => s + (i?.price || 0) * (i?.quantity || 0), 0);
  const dot           = statusDot(order.status);

  const personName = userType === 'vendor'
    ? `${order.customer?.firstName || 'Unknown'} ${order.customer?.lastName || 'Customer'}`
    : order.seller?.vendorProfile?.businessName || `${order.seller?.firstName || 'Unknown'} ${order.seller?.lastName || 'Seller'}`;
  const personEmail = userType === 'vendor' ? order.customer?.email  : order.seller?.email;
  const personPhone = userType === 'vendor' ? order.customer?.phone  : order.seller?.phone;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: BRAND.surface,
          paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: BRAND.border,
          flexDirection: 'row', alignItems: 'center',
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
          <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.4 }}>
            Order Details
          </Text>
          <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
            #{order.orderNumber || 'N/A'}
          </Text>
        </View>

        {/* Live status pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${dot}18`, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot, marginRight: 5 }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: dot, textTransform: 'capitalize' }}>
            {order.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── ORDER STATUS + TIMELINE ──────────────────────────────────── */}
        <Card>
          <CardHeader icon="pulse-outline" iconColor={dot} iconBg={`${dot}18`} title="Order Timeline" />

          {orderTimeline.length > 0 ? (
            <View>
              {orderTimeline.map((event, index) => {
                const d = statusDot(event.status);
                const isLast = index === orderTimeline.length - 1;
                return (
                  <View key={index} style={{ flexDirection: 'row' }}>
                    {/* Dot + line */}
                    <View style={{ alignItems: 'center', marginRight: 14, width: 16 }}>
                      <View
                        style={{
                          width: 14, height: 14, borderRadius: 7,
                          backgroundColor: d,
                          ...Platform.select({
                            ios: { shadowColor: d, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
                            android: { elevation: 2 },
                          }),
                        }}
                      />
                      {!isLast && (
                        <View style={{ width: 2, flex: 1, marginTop: 4, backgroundColor: `${d}30`, minHeight: 20 }} />
                      )}
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 2, textTransform: 'capitalize' }}>
                        {event.status.replace(/_/g, ' ')}
                      </Text>
                      <Text style={{ fontSize: 11, color: BRAND.textMuted, fontWeight: '500' }}>
                        {formatDate(event.timestamp)}
                      </Text>
                      {event.note && (
                        <View style={{ backgroundColor: BRAND.surfaceAlt, borderRadius: 9, padding: 9, marginTop: 6, borderWidth: 1, borderColor: BRAND.border }}>
                          <Text style={{ fontSize: 12, color: BRAND.textSecondary, lineHeight: 17 }}>{event.note}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: BRAND.textMuted, fontStyle: 'italic' }}>No timeline events yet.</Text>
          )}
        </Card>

        {/* ── ORDER ITEMS ──────────────────────────────────────────────── */}
        {orderItems.length > 0 && (
          <Card>
            <CardHeader icon="bag-outline" iconColor={BRAND.primary} iconBg={BRAND.primarySoft} title="Order Items" />

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
                    style={{ width: 80, height: 80, borderRadius: 13 }}
                    resizeMode="cover"
                  />
                  {/* Qty badge */}
                  <View
                    style={{
                      position: 'absolute', top: -5, right: -5,
                      width: 22, height: 22, borderRadius: 7,
                      backgroundColor: BRAND.primary,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: BRAND.surface,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{item?.quantity || 0}</Text>
                  </View>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 4 }} numberOfLines={2}>
                    {item?.product?.name || 'Product'}
                  </Text>
                  {item?.selectedVariant && (
                    <View style={{ backgroundColor: BRAND.surfaceAlt, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 5, borderWidth: 1, borderColor: BRAND.border }}>
                      <Text style={{ fontSize: 11, color: BRAND.textSecondary, fontWeight: '500' }}>
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
          </Card>
        )}

        {/* ── PERSON INFO — vendor only (seller details hidden from customers) ── */}
        {userType === 'vendor' && (
          <Card>
            <CardHeader
              icon="person-outline"
              iconColor={BRAND.primary}
              iconBg={BRAND.primarySoft}
              title="Customer Information"
            />
            <View style={{ backgroundColor: BRAND.surfaceAlt, borderRadius: 13, padding: 14, borderWidth: 1, borderColor: BRAND.border }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 10 }}>
                {personName}
              </Text>
              <InfoRow icon="mail-outline" label="Email" value={personEmail || 'N/A'} />
              {personPhone && <InfoRow icon="call-outline" label="Phone" value={personPhone} />}
            </View>
          </Card>
        )}

        {/* ── DELIVERY INFO ────────────────────────────────────────────── */}
        <Card>
          <CardHeader icon="location-outline" iconColor={BRAND.blue} iconBg={BRAND.blueSoft} title="Delivery Information" />

          {/* Delivery type chip */}
          <View
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: BRAND.surfaceAlt,
              borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10,
              marginBottom: 10, borderWidth: 1, borderColor: BRAND.border,
            }}
          >
            <Ionicons
              name={order.deliveryType === 'home_delivery' ? 'home-outline' : 'storefront-outline'}
              size={14} color={BRAND.blue} style={{ marginRight: 8 }}
            />
            <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginRight: 8 }}>
              Type
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, textTransform: 'capitalize' }}>
              {order.deliveryType?.replace('_', ' ') || 'N/A'}
            </Text>
          </View>

          {/* Address block — only for home delivery */}
          {order.deliveryAddress && order.deliveryType === 'home_delivery' && (
            <View style={{ backgroundColor: BRAND.surfaceAlt, borderRadius: 13, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BRAND.border }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
                Delivery Address
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 6 }}>
                {order.deliveryAddress.fullName}
              </Text>
              <InfoRow icon="location-outline"  label="Address" value={order.deliveryAddress.address} />
              <InfoRow icon="business-outline"  label="City"    value={`${order.deliveryAddress.city}, ${order.deliveryAddress.state}`} />
              <InfoRow icon="call-outline"      label="Phone"   value={order.deliveryAddress.phone} />
              {order.deliveryAddress.additionalInfo && (
                <View style={{ backgroundColor: BRAND.goldSoft, borderRadius: 8, padding: 8, marginTop: 6 }}>
                  <Text style={{ fontSize: 11, color: '#92400E', fontStyle: 'italic' }}>
                    {order.deliveryAddress.additionalInfo}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Tracking */}
          {order.trackingNumber && (
            <View
              style={{
                backgroundColor: BRAND.purpleSoft,
                borderRadius: 13, padding: 14,
                borderWidth: 1, borderColor: `${BRAND.purple}33`,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${BRAND.purple}22`, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                  <Ionicons name="cube-outline" size={14} color={BRAND.purple} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND.purple, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  Tracking Number
                </Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#5B21B6', letterSpacing: -0.3, marginBottom: 3 }}>
                {order.trackingNumber}
              </Text>
              {order.courierService && (
                <Text style={{ fontSize: 12, color: BRAND.purple, fontWeight: '500' }}>{order.courierService}</Text>
              )}
            </View>
          )}
        </Card>

        {/* ── PAYMENT SUMMARY ──────────────────────────────────────────── */}
        <Card>
          <CardHeader icon="wallet-outline" iconColor={BRAND.green} iconBg={BRAND.greenSoft} title="Payment Summary" />

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: BRAND.textSecondary, fontWeight: '500' }}>
                Subtotal ({orderItems.length} items)
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>{formatPrice(subtotal)}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
              <Text style={{ fontSize: 13, color: BRAND.textSecondary, fontWeight: '500' }}>Delivery fee</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>
                {order.deliveryType === 'pickup' || (order.deliveryFee === 0)
                  ? 'Free'
                  : order.deliveryFee
                  ? formatPrice(order.deliveryFee)
                  : 'Included'}
              </Text>
            </View>
            {order.discount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
                <Text style={{ fontSize: 13, color: BRAND.green, fontWeight: '500' }}>Discount</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.green }}>-{formatPrice(order.discount)}</Text>
              </View>
            )}

            {/* Total row */}
            <View
              style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: BRAND.primarySoft,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                borderWidth: 1, borderColor: BRAND.primaryMuted,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: BRAND.textPrimary }}>Total Amount</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.5 }}>
                {formatPrice(order.totalAmount || 0)}
              </Text>
            </View>

            {/* Payment status */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BRAND.surfaceAlt, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: BRAND.border }}>
              <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '600' }}>Payment status</Text>
              <View style={{ backgroundColor: BRAND.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: BRAND.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: BRAND.textPrimary, textTransform: 'capitalize' }}>
                  {order.paymentStatus || 'pending'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* ── NOTES ────────────────────────────────────────────────────── */}
        {(order.customerNotes || order.sellerNotes) && (
          <Card>
            <CardHeader icon="document-text-outline" iconColor={BRAND.gold} iconBg={BRAND.goldSoft} title="Notes" />

            {order.customerNotes && (
              <View style={{ backgroundColor: BRAND.blueSoft, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND.blue, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
                  Customer Notes
                </Text>
                <Text style={{ fontSize: 13, color: '#1E40AF', lineHeight: 19 }}>{order.customerNotes}</Text>
              </View>
            )}
            {order.sellerNotes && (
              <View style={{ backgroundColor: BRAND.purpleSoft, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: `${BRAND.purple}33` }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND.purple, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>
                  Seller Notes
                </Text>
                <Text style={{ fontSize: 13, color: '#5B21B6', lineHeight: 19 }}>{order.sellerNotes}</Text>
              </View>
            )}
          </Card>
        )}

        {/* ── ACTIVE DISPUTE ───────────────────────────────────────────── */}
        {(order.hasDispute || order.dispute) && (
          <View
            style={{
              backgroundColor: BRAND.orangeSoft,
              borderRadius: 20, padding: 16, marginBottom: 14,
              borderWidth: 1.5, borderColor: '#FED7AA',
              ...Platform.select({
                ios: { shadowColor: BRAND.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
                android: { elevation: 4 },
              }),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: BRAND.orange, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="alert-circle" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#9A3412' }}>Dispute Active</Text>
                <Text style={{ fontSize: 11, color: '#C2410C', fontWeight: '500', marginTop: 1 }}>Action may be required</Text>
              </View>
            </View>

            <View style={{ backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 11, padding: 12, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', marginBottom: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#9A3412', width: 60 }}>Status</Text>
                <Text style={{ fontSize: 12, color: '#9A3412', textTransform: 'capitalize', flex: 1 }}>{order.dispute.status}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#9A3412', width: 60 }}>Reason</Text>
                <Text style={{ fontSize: 12, color: '#9A3412', flex: 1, textTransform: 'capitalize' }}>
                  {order.dispute.reason.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleFetchDisputeStatus} activeOpacity={0.85} style={{ borderRadius: 13, overflow: 'hidden' }}>
              <LinearGradient
                colors={[BRAND.orange, '#EA580C']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <Ionicons name="eye-outline" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>View Dispute Details</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── RAISE DISPUTE CTA ────────────────────────────────────────── */}
        {!order.hasDispute && !order.dispute && (order.status === 'delivered' || order.status === 'completed') && !showDisputeForm && (
          <TouchableOpacity
            onPress={() => setShowDisputeForm(true)}
            activeOpacity={0.85}
            style={{
              marginBottom: 14,
              borderRadius: 16, overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                paddingVertical: 15,
                backgroundColor: BRAND.redSoft,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: '#FECACA',
                gap: 8,
              }}
            >
              <Ionicons name="alert-circle-outline" size={18} color={BRAND.red} />
              <Text style={{ color: BRAND.red, fontSize: 14, fontWeight: '700' }}>Report Issue / Create Dispute</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── DISPUTE FORM ─────────────────────────────────────────────── */}
        {showDisputeForm && (
          <Card>
            <CardHeader icon="warning-outline" iconColor={BRAND.red} iconBg={BRAND.redSoft} title="Create Dispute" />

            {/* Category picker */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Issue Type *
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4, marginBottom: 14 }}
            >
              {DISPUTE_CATEGORIES.map((cat) => {
                const isActive = disputeReason === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setDisputeReason(cat.key)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 13, paddingVertical: 9,
                      borderRadius: 13,
                      backgroundColor: isActive ? BRAND.red : BRAND.surfaceAlt,
                      borderWidth: 1.5,
                      borderColor: isActive ? BRAND.red : BRAND.border,
                    }}
                  >
                    <Ionicons name={cat.icon} size={13} color={isActive ? '#fff' : BRAND.textMuted} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#fff' : BRAND.textSecondary }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Description */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
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
                backgroundColor: BRAND.surfaceAlt,
                borderWidth: 1.5,
                borderColor: BRAND.border,
                borderRadius: 13,
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 12,
                fontSize: 14,
                color: BRAND.textPrimary,
                textAlignVertical: 'top',
                minHeight: 130,
                marginBottom: 6,
              }}
              placeholder="Provide a detailed explanation (minimum 20 characters)…"
              placeholderTextColor={BRAND.textMuted}
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              multiline
              numberOfLines={6}
              maxLength={2000}
            />

            {disputeDescription.length > 0 && disputeDescription.length < 20 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="alert-circle" size={12} color={BRAND.orange} />
                <Text style={{ fontSize: 11, color: BRAND.orange, marginLeft: 5, fontWeight: '500' }}>
                  {20 - disputeDescription.length} more characters needed
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => { setShowDisputeForm(false); setDisputeDescription(''); }}
                activeOpacity={0.8}
                style={{
                  flex: 1, paddingVertical: 13, borderRadius: 13,
                  borderWidth: 1.5, borderColor: BRAND.borderStrong,
                  backgroundColor: BRAND.surfaceAlt,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textSecondary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateDispute}
                disabled={creatingDispute || disputeDescription.trim().length < 20}
                activeOpacity={0.85}
                style={{
                  flex: 1, borderRadius: 13, overflow: 'hidden',
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
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderDetailScreen;