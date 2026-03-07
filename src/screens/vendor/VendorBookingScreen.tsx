import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, TextInput, Platform, Modal,
  KeyboardAvoidingView, Keyboard, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/Toast';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079', primaryDark: '#B5315F', primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5', primaryMuted: '#FCDCE9',
  blue: '#3B82F6', blueSoft: '#DBEAFE',
  green: '#10B981', greenSoft: '#D1FAE5',
  gold: '#F59E0B', goldSoft: '#FEF3C7',
  purple: '#8B5CF6', purpleSoft: '#EDE9FE',
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
type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type FilterTab = 'all' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

interface VendorBooking {
  _id: string; bookingNumber?: string;
  bookingType: 'standard' | 'offer_based';
  service?: { _id: string; name: string; images?: string[] };
  offer?: string;
  client: { _id: string; firstName: string; lastName: string; phone?: string };
  scheduledDate: string; scheduledTime?: string;
  totalAmount: number; servicePrice: number;
  status: string; paymentStatus: string; createdAt: string;
  location?: { address: string; city: string; state: string };
  vendorNotes?: string; clientNotes?: string;
}

interface VendorStats {
  totalBookings: number; pendingBookings: number; activeBookings: number;
  completedBookings: number; totalEarnings: number; pendingPayments: number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }> = {
  pending:     { bg: BRAND.goldSoft,   text: '#92400E', border: '#FDE68A', icon: 'time-outline',               iconColor: BRAND.gold   },
  accepted:    { bg: BRAND.blueSoft,   text: '#1E40AF', border: '#BFDBFE', icon: 'checkmark-circle-outline',   iconColor: BRAND.blue   },
  in_progress: { bg: BRAND.purpleSoft, text: '#5B21B6', border: '#DDD6FE', icon: 'hourglass-outline',          iconColor: BRAND.purple },
  completed:   { bg: BRAND.greenSoft,  text: '#065F46', border: '#A7F3D0', icon: 'checkmark-done-circle-outline', iconColor: BRAND.green },
  cancelled:   { bg: BRAND.redSoft,    text: '#991B1B', border: '#FECACA', icon: 'close-circle-outline',        iconColor: BRAND.red    },
};
const getStatusCfg = (s: string) => STATUS_CONFIG[s.toLowerCase()] ?? { bg: BRAND.surfaceAlt, text: BRAND.textSecondary, border: BRAND.border, icon: 'help-circle-outline' as any, iconColor: BRAND.textMuted };

const formatStatus = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const formatDate   = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatPrice  = (n: number) => `₦${n.toLocaleString()}`;

const PAYMENT_CFG: Record<string, { bg: string; text: string; border: string }> = {
  escrowed: { bg: BRAND.blueSoft,   text: '#1E40AF', border: BRAND.blue   },
  released: { bg: BRAND.greenSoft,  text: '#065F46', border: BRAND.green  },
  pending:  { bg: BRAND.goldSoft,   text: '#92400E', border: BRAND.gold   },
};
const getPaymentCfg = (s: string) => PAYMENT_CFG[s.toLowerCase()] ?? { bg: BRAND.surfaceAlt, text: BRAND.textSecondary, border: BRAND.border };

// ─── Rejection Modal ──────────────────────────────────────────────────────────
const RejectionModal = React.memo<{
  visible: boolean; rejectionReason: string;
  onChangeReason: (t: string) => void; onCancel: () => void; onSubmit: () => void;
}>(({ visible, rejectionReason, onChangeReason, onCancel, onSubmit }) => {
  const n = rejectionReason.length;
  const valid = n >= 10 && n <= 500;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity activeOpacity={1} onPress={onCancel}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}
            style={[{ width: '100%', backgroundColor: BRAND.surface, borderRadius: 24, padding: 24 }, shadow('#000', 0.2, 24, 10)]}
          >
            {/* Title */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND.redSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="close-circle" size={22} color={BRAND.red} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.3 }}>Reject Booking</Text>
            </View>

            <Text style={{ fontSize: 13, color: BRAND.textSecondary, marginBottom: 12, lineHeight: 19 }}>
              Please provide a reason for rejection (10–500 characters):
            </Text>

            <TextInput
              style={{
                backgroundColor: BRAND.surfaceAlt, borderRadius: 14,
                padding: 14, fontSize: 14, color: BRAND.textPrimary,
                minHeight: 110, textAlignVertical: 'top',
                borderWidth: 1.5, borderColor: BRAND.border, marginBottom: 8,
              }}
              placeholder="Enter rejection reason…"
              placeholderTextColor={BRAND.textMuted}
              value={rejectionReason}
              onChangeText={onChangeReason}
              multiline numberOfLines={4}
              autoFocus maxLength={520}
            />

            {/* Char counter */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: n < 10 ? BRAND.red : n > 500 ? BRAND.red : BRAND.green }}>
                {n < 10 ? `${10 - n} more characters needed` : n > 500 ? `${n - 500} over limit` : '✓ Valid length'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: n > 500 ? BRAND.red : BRAND.textMuted }}>{n}/500</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={onCancel} activeOpacity={0.8}
                style={{ flex: 1, backgroundColor: BRAND.surfaceAlt, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: BRAND.borderStrong }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textSecondary }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onSubmit} disabled={!valid} activeOpacity={0.85}
                style={{ flex: 1, borderRadius: 14, overflow: 'hidden', opacity: valid ? 1 : 0.45 }}
              >
                <LinearGradient colors={[BRAND.red, '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Reject</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const VendorBookingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [bookings, setBookings]         = useState<VendorBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<VendorBooking[]>([]);
  const [stats, setStats]               = useState<VendorStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason]       = useState('');
  const [confirmModal, setConfirmModal]             = useState({ visible: false, title: '', message: '', confirmLabel: 'Confirm', onConfirm: () => {} });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const calcStats = useCallback((data: VendorBooking[]) => {
    const completed = data.filter((b) => b.status.toLowerCase() === 'completed');
    setStats({
      totalBookings: data.length,
      pendingBookings: data.filter((b) => b.status.toLowerCase() === 'pending').length,
      activeBookings: data.filter((b) => b.status.toLowerCase() === 'in_progress').length,
      completedBookings: completed.length,
      totalEarnings: completed.reduce((s, b) => s + (b.totalAmount || 0), 0),
      pendingPayments: data.filter((b) => b.paymentStatus === 'pending').length,
    });
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchBookings = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await bookingAPI.getMyBookings({ role: 'vendor', page: pageNum, limit: 20 });
      if (res.success) {
        const newB = Array.isArray(res.data) ? res.data : res.data.bookings || [];
        const updated = append ? [...bookings, ...newB] : newB;
        setBookings(updated);
        calcStats(updated);
        setHasMore(res.meta?.pagination?.hasNextPage ?? newB.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message || 'Failed to load bookings');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, []);
  useFocusEffect(useCallback(() => { fetchBookings(1, false); }, []));

  // ── Filter ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let f = bookings;
    if (activeFilter !== 'all') f = f.filter((b) => b.status.toLowerCase() === activeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter((b) =>
        b.service?.name?.toLowerCase().includes(q) ||
        `${b.client?.firstName || ''} ${b.client?.lastName || ''}`.toLowerCase().includes(q) ||
        b.bookingNumber?.toLowerCase().includes(q)
      );
    }
    setFilteredBookings(f);
  }, [bookings, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(1, false).finally(() => setRefreshing(false));
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel = 'Confirm') => {
    setConfirmModal({ visible: true, title, message, confirmLabel, onConfirm });
  };

  const handleAccept = (id: string) => showConfirm('Accept Booking', 'Accept this booking request?', async () => {
    setConfirmModal((p) => ({ ...p, visible: false }));
    try { setActionLoading(id); const r = await bookingAPI.acceptBooking(id); if (r.success) { toast.success('Success', 'Booking accepted'); fetchBookings(1); } }
    catch (e) { toast.error('Error', handleAPIError(e).message); }
    finally { setActionLoading(null); }
  }, 'Accept');

  const handleStartService = (id: string) => showConfirm('Start Service', 'Mark this booking as in progress?', async () => {
    setConfirmModal((p) => ({ ...p, visible: false }));
    try { setActionLoading(id); const r = await bookingAPI.startBooking(id); if (r.success) { toast.success('Success', 'Service started'); fetchBookings(1); } }
    catch (e) { toast.error('Error', handleAPIError(e).message); }
    finally { setActionLoading(null); }
  }, 'Start');

  const handleComplete = (id: string) => showConfirm('Complete Service', 'Mark this service as completed?', async () => {
    setConfirmModal((p) => ({ ...p, visible: false }));
    try { setActionLoading(id); const r = await bookingAPI.markComplete(id); if (r.success) { toast.success('Success', 'Service completed'); fetchBookings(1); } }
    catch (e) { toast.error('Error', handleAPIError(e).message); }
    finally { setActionLoading(null); }
  }, 'Complete');

  const handleReject = (id: string) => { setRejectingBookingId(id); setRejectionReason(''); setRejectModalVisible(true); };

  const submitRejection = async () => {
    const t = rejectionReason.trim();
    if (t.length < 10) { toast.warning('Too Short', `Need at least 10 characters (${10 - t.length} more).`); return; }
    if (t.length > 500) { toast.warning('Too Long', `Must not exceed 500 characters.`); return; }
    try {
      setActionLoading(rejectingBookingId!); setRejectModalVisible(false);
      const r = await bookingAPI.rejectBooking(rejectingBookingId!, t);
      if (r.success) { toast.success('Success', 'Booking rejected'); fetchBookings(1); }
    } catch (error) {
      const e = handleAPIError(error);
      toast.error('Error', e.message || 'Failed to reject booking');
      setRejectModalVisible(true);
    } finally { setActionLoading(null); }
  };

  const handleCloseModal = useCallback(() => { Keyboard.dismiss(); setRejectModalVisible(false); setRejectionReason(''); }, []);
  const handleChangeReason = useCallback((t: string) => setRejectionReason(t), []);

  // ── Action buttons ────────────────────────────────────────────────────────
  const getActionButtons = (booking: VendorBooking) => {
    const isLoading = actionLoading === booking._id;

    const GradBtn = ({ colors, onPress, icon, label, color }: { colors: [string,string]; onPress: () => void; icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) => (
      <TouchableOpacity onPress={onPress} disabled={isLoading} activeOpacity={0.85} style={{ flex: 1, borderRadius: 13, overflow: 'hidden' }}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            ...shadow(color, 0.3, 8, 4) }}>
          {isLoading ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name={icon} size={16} color="#fff" /><Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{label}</Text></>}
        </LinearGradient>
      </TouchableOpacity>
    );

    if (booking.status === 'pending') return (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <GradBtn colors={[BRAND.red, '#DC2626']} onPress={() => handleReject(booking._id)} icon="close-circle-outline" label="Reject" color={BRAND.red} />
        <GradBtn colors={[BRAND.green, '#059669']} onPress={() => handleAccept(booking._id)} icon="checkmark-circle-outline" label="Accept" color={BRAND.green} />
      </View>
    );
    if (booking.status === 'accepted') return (
      <GradBtn colors={[BRAND.purple, '#7C3AED']} onPress={() => handleStartService(booking._id)} icon="play-circle-outline" label="Start Service" color={BRAND.purple} />
    );
    if (booking.status === 'in_progress') return (
      <GradBtn colors={[BRAND.green, '#059669']} onPress={() => handleComplete(booking._id)} icon="checkmark-done-circle-outline" label="Mark Complete" color={BRAND.green} />
    );
    return null;
  };

  // ── Filter counts ─────────────────────────────────────────────────────────
  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    accepted: bookings.filter((b) => b.status === 'accepted').length,
    in_progress: bookings.filter((b) => b.status === 'in_progress').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };
  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' }, { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Done' },
  ];

  // ── Booking card ──────────────────────────────────────────────────────────
  const renderBookingCard = (booking: VendorBooking) => {
    const cfg = getStatusCfg(booking.status);
    const payCfg = getPaymentCfg(booking.paymentStatus);
    const title = booking.bookingType === 'offer_based' ? 'Custom Offer Booking' : (booking.service?.name || 'Service Booking');
    const clientName = `${booking.client.firstName} ${booking.client.lastName}`;
    const hasActions = ['pending','accepted','in_progress'].includes(booking.status);

    return (
      <TouchableOpacity key={booking._id} onPress={() => navigation.navigate('BookingDetail', { bookingId: booking._id })} activeOpacity={0.93}>
        <View style={[{
          backgroundColor: BRAND.surface, borderRadius: 20, padding: 16,
          marginBottom: 14, borderWidth: 1, borderColor: BRAND.border,
          borderTopWidth: 3, borderTopColor: cfg.iconColor,
        }, shadow()]}>

          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.2, marginBottom: 4 }} numberOfLines={1}>{title}</Text>
              {booking.bookingType === 'offer_based' && (
                <View style={{ backgroundColor: BRAND.purpleSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, color: BRAND.purple, fontWeight: '700' }}>Offer Based</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={13} color={BRAND.primary} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND.textSecondary }}>{clientName}</Text>
              </View>
            </View>

            {/* Status badge */}
            <View style={{ backgroundColor: cfg.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: cfg.border, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={cfg.icon} size={12} color={cfg.iconColor} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: cfg.text }}>{formatStatus(booking.status)}</Text>
            </View>
          </View>

          {/* Details block */}
          <View style={{ backgroundColor: BRAND.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: hasActions ? 12 : 8, gap: 10, borderWidth: 1, borderColor: BRAND.border }}>
            {/* Date */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND.blueSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Ionicons name="calendar-outline" size={16} color={BRAND.blue} />
              </View>
              <View>
                <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 1 }}>Date & Time</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>
                  {formatDate(booking.scheduledDate)}{booking.scheduledTime ? ` · ${booking.scheduledTime}` : ''}
                </Text>
              </View>
            </View>

            {/* Location */}
            {booking.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name="location-outline" size={16} color={BRAND.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 1 }}>Location</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }} numberOfLines={1}>{booking.location.address}</Text>
                </View>
              </View>
            )}

            {/* Amount + payment status */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: BRAND.purpleSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name="cash-outline" size={16} color={BRAND.purple} />
                </View>
                <View>
                  <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 1 }}>Amount</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.3 }}>{formatPrice(booking.totalAmount)}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: payCfg.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: payCfg.border }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: payCfg.text }}>{formatStatus(booking.paymentStatus)}</Text>
              </View>
            </View>

            {/* Booking number */}
            {booking.bookingNumber && (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: BRAND.border }}>
                <Ionicons name="receipt-outline" size={12} color={BRAND.textMuted} style={{ marginRight: 5 }} />
                <Text style={{ fontSize: 11, color: BRAND.textMuted, fontWeight: '600' }}>{booking.bookingNumber}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {getActionButtons(booking)}

          {/* Details link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('BookingDetail', { bookingId: booking._id })}
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
  if (loading && page === 1) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>Loading bookings…</Text>
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
          <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.4 }}>My Bookings</Text>
          <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
            {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate('VendorMyResponses')} activeOpacity={0.8}
            style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: BRAND.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.border }}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color={BRAND.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AvailableOffers')} activeOpacity={0.8}
            style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: BRAND.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.border }}>
            <Ionicons name="pricetag-outline" size={18} color={BRAND.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}
        onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
            if (!loading && hasMore) fetchBookings(page + 1, true);
          }
        }}
        scrollEventThrottle={400}
      >
        {/* ── STICKY SEARCH + FILTERS ────────────────────────────────────── */}
        <View style={{ backgroundColor: BRAND.surface, borderBottomWidth: 1, borderBottomColor: BRAND.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
          {/* Search */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: BRAND.border, marginBottom: 10 }}>
            <Ionicons name="search" size={16} color={BRAND.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, fontSize: 14, color: BRAND.textPrimary, paddingVertical: 0 }}
              placeholder="Search bookings…"
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

          {/* Filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {filters.map((f) => {
              const active = activeFilter === f.key;
              const cnt = counts[f.key];
              return (
                <TouchableOpacity key={f.key} onPress={() => setActiveFilter(f.key)} activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: active ? BRAND.primary : BRAND.surfaceAlt,
                    borderWidth: 1.5, borderColor: active ? BRAND.primary : BRAND.border,
                    ...( active ? shadow(BRAND.primary, 0.25, 8, 3) : {}),
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

        {/* ── STATS STRIP ───────────────────────────────────────────────── */}
        {stats && (
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
            <LinearGradient
              colors={[BRAND.primary, BRAND.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 20, padding: 16, flexDirection: 'row', gap: 0, ...shadow(BRAND.primary, 0.25, 12, 5) }}
            >
              {[
                { label: 'Total Earnings', value: formatPrice(stats.totalEarnings), icon: 'cash-outline' as const },
                { label: 'Active Jobs',    value: stats.activeBookings.toString(),  icon: 'hourglass-outline' as const },
                { label: 'Pending',        value: stats.pendingBookings.toString(), icon: 'time-outline' as const },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: 'rgba(255,255,255,0.2)' }}>
                  <Ionicons name={s.icon} size={16} color="rgba(255,255,255,0.7)" style={{ marginBottom: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>{s.value}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '500', marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </LinearGradient>
          </View>
        )}

        {/* ── QUICK LINKS ───────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Browse Offers', sub: 'Find new opportunities', icon: 'pricetag-outline' as const, bg: BRAND.primarySoft, color: BRAND.primary, onPress: () => navigation.navigate('AvailableOffers') },
            { label: 'My Responses', sub: 'Track your proposals',    icon: 'chatbox-ellipses-outline' as const, bg: BRAND.blueSoft,    color: BRAND.blue,    onPress: () => navigation.navigate('VendorMyResponses') },
          ].map((q, i) => (
            <TouchableOpacity key={i} onPress={q.onPress} activeOpacity={0.85} style={{ flex: 1 }}>
              <View style={[{ backgroundColor: BRAND.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BRAND.border }, shadow()]}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: q.bg, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Ionicons name={q.icon} size={17} color={q.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 1 }}>{q.label}</Text>
                  <Text style={{ fontSize: 10, color: BRAND.textMuted }}>{q.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={BRAND.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── BOOKING LIST ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}>
          {filteredBookings.length > 0 ? (
            <>
              {filteredBookings.map(renderBookingCard)}
              {loading && page > 1 && (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={BRAND.primary} />
                </View>
              )}
              {!hasMore && filteredBookings.length > 10 && (
                <Text style={{ textAlign: 'center', color: BRAND.textMuted, fontSize: 12, paddingVertical: 16 }}>All bookings loaded</Text>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="calendar-outline" size={38} color={BRAND.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 6, letterSpacing: -0.3 }}>No Bookings</Text>
              <Text style={{ fontSize: 13, color: BRAND.textMuted, textAlign: 'center', lineHeight: 20 }}>
                {activeFilter !== 'all'
                  ? `No ${formatStatus(activeFilter).toLowerCase()} bookings yet`
                  : "Bookings from clients will appear here"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmLabel}
        confirmColor={BRAND.primary}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((p) => ({ ...p, visible: false }))}
      />

      <RejectionModal
        visible={rejectModalVisible}
        rejectionReason={rejectionReason}
        onChangeReason={handleChangeReason}
        onCancel={handleCloseModal}
        onSubmit={submitRejection}
      />
    </SafeAreaView>
  );
};

export default VendorBookingsScreen;