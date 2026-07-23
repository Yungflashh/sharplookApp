import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';
import CancelBookingModal from '@/components/ui/CancelBookingModal';
import socketService from '@/services/socket.service';

type BookingDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookingDetail'>;
type BookingDetailRouteProp = RouteProp<RootStackParamList, 'BookingDetail'>;

interface VendorPartyInfo {
  type: 'vendor';
  data: BookingDetail['vendor'];
  label: 'Vendor';
}
interface ClientPartyInfo {
  type: 'client';
  data: BookingDetail['client'];
  label: 'Client';
}
type OtherPartyResult = VendorPartyInfo | ClientPartyInfo | null;

interface BookingDetail {
  _id: string;
  bookingNumber?: string;
  bookingType?: 'service_based' | 'offer_based';
  service?: {
    _id: string;
    name: string;
    description?: string;
    images?: string[];
    basePrice: number;
  };
  offer?: string | {
    _id: string;
    title?: string;
    description?: string;
    images?: string[];
    price?: number;
  };
  vendor: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    avatar?: string;
    vendorProfile?: {
      businessName: string;
      serviceCategory?: string;
      rating?: number;
      completedBookings?: number;
      city?: string;
      state?: string;
    };
  };
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    avatar?: string;
  };
  scheduledDate: string;
  scheduledTime?: string;
  duration: number;
  serviceType?: 'home' | 'shop';
  location?: { address: string; city: string; state: string };
  servicePrice: number;
  distanceCharge: number;
  distanceKm?: number;
  totalAmount: number;
  status: string;
  paymentStatus: 'pending' | 'escrowed' | 'released' | 'refunded' | 'partially_refunded';
  paymentReference?: string;
  paymentExpiresAt?: string;
  cancellationPenalty?: number;
  clientNotes?: string;
  vendorNotes?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  hasDispute: boolean;
  disputeId?: string;
  hasReview: boolean;
  reviewId?: string;
  clientMarkedComplete: boolean;
  vendorMarkedComplete: boolean;
  vendorStartConfirmed?: boolean;
  clientStartConfirmed?: boolean;
  sessionStartedAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = 270;
const AVATAR_SIZE = 84;
const BG = '#FCE4EC';
const PRIMARY = '#E04079';
const TEXT_DARK = '#1A1A2E';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const format12Hour = (time?: string): string => {
  if (!time) return '';
  if (/AM|PM/i.test(time)) return time;
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${suffix}`;
};

const formatLongDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

const formatPrice = (price: number) => `₦${price.toLocaleString()}`;

const formatStatus = (s: string) =>
  s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = format12Hour(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
  return `${date} · ${time}`;
};


// ─── Sub-components ───────────────────────────────────────────────────────────

const DetailRow: React.FC<{ icon: string; value: string; alignStart?: boolean }> = ({ icon, value, alignStart }) => (
  <View style={[styles.detailRow, alignStart && { alignItems: 'flex-start' }]}>
    <View style={styles.detailIconWrap}>
      <Ionicons name={icon as any} size={17} color={PRIMARY} />
    </View>
    <Text style={[styles.detailValue, alignStart && { lineHeight: 20 }]}>{value}</Text>
  </View>
);

const SessionStep: React.FC<{ label: string; done: boolean; pulse?: boolean }> = ({ label, done, pulse }) => (
  <View style={styles.sessionStep}>
    <View style={[styles.sessionStepDot, done ? styles.sessionStepDone : pulse ? styles.sessionStepPulse : styles.sessionStepIdle]}>
      {done
        ? <Ionicons name="checkmark" size={11} color="#fff" />
        : <View style={[styles.sessionStepInner, { backgroundColor: pulse ? '#E04079' : '#C7C7CC' }]} />
      }
    </View>
    <Text style={[styles.sessionStepLabel, done && { color: '#16A34A', fontWeight: '700' }, pulse && !done && { color: PRIMARY, fontWeight: '700' }]}>
      {label}
    </Text>
  </View>
);

const SessionTimer: React.FC<{ startedAt: string }> = ({ startedAt }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    <Text style={styles.sessionElapsed}>
      {h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`}
    </Text>
  );
};

const BlinkDot: React.FC = () => {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.15, duration: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,    duration: 550, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.sessionLiveDot, { opacity }]} />;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const BookingDetailScreen: React.FC = () => {
  const navigation = useNavigation<BookingDetailNavigationProp>();
  const route = useRoute<BookingDetailRouteProp>();
  const { bookingId } = route.params;
  const { top, bottom } = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => { loadCurrentUser(); }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await getStoredUser();
      if (userData) {
        setCurrentUserId(userData._id);
        setIsVendor(userData.isVendor || false);
      }
    } catch (error) { console.error('Error loading user:', error); }
  };

  const fetchBookingDetails = async () => {
    if (!bookingId?.trim()) {
      toast.error('Error', 'Invalid booking reference');
      navigation.goBack();
      return;
    }
    try {
      setLoading(true);
      const response = await bookingAPI.getBookingById(bookingId);
      if (response.success) {
        setBooking(response.data.booking || response.data);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Failed to load booking details');
      navigation.goBack();
    } finally { setLoading(false); }
  };

  useFocusEffect(
    useCallback(() => { fetchBookingDetails(); }, [bookingId])
  );

  // Real-time booking updates via socket
  useEffect(() => {
    const attach = (s: any) => {
      const onStartWaiting = (data: any) => {
        if (data.bookingId !== bookingId) return;
        toast.info('Session Update', data.message || 'Session confirmation updated');
        fetchBookingDetails();
      };
      const onCompletionWaiting = (data: any) => {
        if (data.bookingId !== bookingId) return;
        toast.info('Almost done!', data.message || 'Completion status updated');
        fetchBookingDetails();
      };
      s.on('booking:start:waiting', onStartWaiting);
      s.on('booking:completion:waiting', onCompletionWaiting);
      return () => {
        s.off('booking:start:waiting', onStartWaiting);
        s.off('booking:completion:waiting', onCompletionWaiting);
      };
    };

    let cleanup: (() => void) | undefined;
    const existing = socketService.getSocket();
    if (existing) {
      cleanup = attach(existing);
    } else {
      socketService.connect().then(() => {
        const s = socketService.getSocket();
        if (s) cleanup = attach(s);
      });
    }
    return () => { if (cleanup) cleanup(); };
  }, [bookingId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (booking?.paymentStatus === 'pending' && booking?.paymentExpiresAt) {
      interval = setInterval(() => { fetchBookingDetails(); }, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [booking?.paymentStatus, booking?.paymentExpiresAt]);

  const getServiceInfo = () => {
    if (!booking) return null;
    if (booking.service) return { name: booking.service.name, description: booking.service.description, images: booking.service.images };
    if (booking.offer && typeof booking.offer === 'object') return { name: booking.offer.title || 'Custom Offer', description: booking.offer.description, images: booking.offer.images };
    return { name: 'Custom Service Offer', description: 'Service details from accepted offer', images: undefined };
  };

  const getOtherParty = (): OtherPartyResult => {
    if (!booking || !currentUserId) return null;
    if (booking.client._id === currentUserId) return { type: 'vendor', data: booking.vendor, label: 'Vendor' };
    if (booking.vendor._id === currentUserId) return { type: 'client', data: booking.client, label: 'Client' };
    return { type: 'vendor', data: booking.vendor, label: 'Vendor' };
  };

  const getTimeUntilExpiry = () => {
    if (!booking?.paymentExpiresAt) return null;
    const diff = new Date(booking.paymentExpiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreateDispute = () => {
    if (!booking) return;
    if (!['accepted', 'in_progress', 'completed'].includes(booking.status.toLowerCase())) {
      toast.warning('Cannot Create Dispute', 'Disputes can only be created for active bookings.');
      return;
    }
    if (booking.status.toLowerCase() === 'completed' && booking.paymentStatus === 'released') {
      toast.warning('Cannot Create Dispute', 'This booking is fully settled — payment has already been released.');
      return;
    }
    if (booking.hasDispute) {
      setConfirmModal({
        visible: true,
        title: 'Dispute Already Exists',
        message: 'A dispute already exists for this booking. Would you like to view it?',
        onConfirm: () => {
          booking.disputeId
            ? navigation.navigate('DisputeDetail', { disputeId: booking.disputeId })
            : navigation.navigate('Disputes');
        },
      });
      return;
    }
    navigation.navigate('CreateDispute', { bookingId: booking._id, role: isVendor ? 'vendor' : 'client' });
  };

  const handleViewDispute = () => {
    booking?.disputeId
      ? navigation.navigate('DisputeDetail', { disputeId: booking.disputeId })
      : navigation.navigate('Disputes');
  };

  const handleMessage = () => {
    const op = getOtherParty();
    if (!booking || !op) { toast.error('Error', 'Unable to start conversation'); return; }
    navigation.navigate('ChatDetail', {
      otherUserId: op.data._id,
      otherUserName: op.type === 'vendor'
        ? op.data?.vendorProfile?.businessName || `${op.data?.firstName} ${op.data?.lastName}`
        : `${op.data?.firstName} ${op.data?.lastName}`,
      otherUserAvatar: op.data?.avatar,
    });
  };

  const handleCancelBooking = async (reason: string) => {
    if (!booking) return;
    const appointmentDate = new Date(booking.scheduledDate);
    if (booking.scheduledTime) {
      const [h, m] = booking.scheduledTime.split(':').map(Number);
      appointmentDate.setHours(h, m, 0, 0);
    }
    const mins = Math.floor((appointmentDate.getTime() - Date.now()) / 60000);
    if (mins < 59 && mins > 0 && !isVendor) {
      const penalty = booking.totalAmount * 0.2;
      setConfirmModal({
        visible: true,
        title: 'Cancellation Penalty',
        message: `Appointment is in ${mins} minutes.\n\nA 20% penalty applies:\n• Penalty: ${formatPrice(penalty)}\n• Refund: ${formatPrice(booking.totalAmount * 0.8)}\n\nProceed?`,
        onConfirm: () => processCancellation(reason),
      });
    } else {
      processCancellation(reason);
    }
  };

  const processCancellation = async (reason: string) => {
    try {
      setActionLoading(true);
      const response = await bookingAPI.cancelBooking(bookingId, reason);
      if (response.success) {
        const msg = response.data.penaltyApplied
          ? `Cancelled with 20% penalty (${formatPrice(response.data.penaltyAmount || 0)}). Refund: ${formatPrice(response.data.refundAmount || 0)}`
          : 'Booking cancelled. Full refund processed.';
        toast.success('Booking Cancelled', msg);
        setShowCancelModal(false);
        fetchBookingDetails();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Failed to cancel booking');
    } finally { setActionLoading(false); }
  };

  const handleAcceptBooking = () => {
    setConfirmModal({
      visible: true,
      title: 'Accept Booking',
      message: 'Accept this booking request? The client will be notified.',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const r = await bookingAPI.acceptBooking(bookingId);
          if (r.success) { toast.success('Accepted', 'Booking accepted successfully'); fetchBookingDetails(); }
        } catch (e) { toast.error('Error', handleAPIError(e).message); }
        finally { setActionLoading(false); }
      },
    });
  };

  const handleRejectBooking = async () => {
    const t = rejectReason.trim();
    if (t.length < 10) { toast.warning('Too Short', 'Reason must be at least 10 characters'); return; }
    try {
      setActionLoading(true);
      setShowRejectModal(false);
      const r = await bookingAPI.rejectBooking(bookingId, t);
      if (r.success) { toast.success('Rejected', 'Booking has been rejected'); fetchBookingDetails(); }
    } catch (e) { toast.error('Error', handleAPIError(e).message); }
    finally { setActionLoading(false); setRejectReason(''); }
  };

  const handleStartSession = async () => {
    try {
      setActionLoading(true);
      const r = await bookingAPI.startBooking(bookingId);
      if (r.success) {
        if (r.data?.waiting) {
          const other = r.data.waitingFor === 'client' ? 'client' : 'vendor';
          toast.info('Confirmed!', `Waiting for the ${other} to also confirm start.`);
        } else {
          toast.success('Session Live!', 'Both parties confirmed. Session has started!');
        }
        fetchBookingDetails();
      }
    } catch (e) { toast.error('Error', handleAPIError(e).message); }
    finally { setActionLoading(false); }
  };

  const handleMarkComplete = () => {
    setConfirmModal({
      visible: true,
      title: 'Mark as Complete',
      message: 'Confirm the service has been completed satisfactorily?',
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const response = await bookingAPI.markComplete(bookingId);
          if (response.success) { toast.success('Success', 'Marked as complete'); fetchBookingDetails(); }
        } catch (error) {
          const apiError = handleAPIError(error);
          toast.error('Error', apiError.message || 'Failed to mark complete');
        } finally { setActionLoading(false); }
      },
    });
  };

  // ── Status Banner ─────────────────────────────────────────────────────────────

  const renderStatusBanner = () => {
    if (!booking) return null;
    const status = booking.status.toLowerCase();
    const ps = booking.paymentStatus;

    if (status === 'cancelled') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <View style={[styles.statusBannerIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={22} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusBannerTitle, { color: '#991B1B' }]}>Booking Cancelled</Text>
            {booking.cancellationReason && (
              <Text style={[styles.statusBannerSub, { color: '#B91C1C' }]}>{booking.cancellationReason}</Text>
            )}
          </View>
        </View>
      );
    }

    if (ps === 'pending') {
      const timeRemaining = getTimeUntilExpiry();
      const expired = timeRemaining === 'Expired';
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
          <View style={[styles.statusBannerIcon, { backgroundColor: '#FFEDD5' }]}>
            <Ionicons name="time" size={22} color="#EA580C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusBannerTitle, { color: '#9A3412' }]}>Payment Pending</Text>
            <Text style={[styles.statusBannerSub, { color: '#C2410C' }]}>
              Complete your payment on Paystack to confirm this booking.
            </Text>
          </View>
          {timeRemaining && (
            <View style={[styles.expiryPill, { backgroundColor: expired ? '#FEE2E2' : '#FFEDD5' }]}>
              <Ionicons name={expired ? 'close-circle' : 'hourglass'} size={12} color={expired ? '#DC2626' : '#92400E'} />
              <Text style={[styles.expiryText, { color: expired ? '#DC2626' : '#92400E' }]}>
                {expired ? 'Expired' : timeRemaining}
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (status === 'in_progress') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#FAF5FF', borderColor: '#DDD6FE' }]}>
          <View style={[styles.statusBannerIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="play-circle" size={22} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusBannerTitle, { color: '#4C1D95' }]}>Session In Progress</Text>
            <Text style={[styles.statusBannerSub, { color: '#6D28D9' }]}>Your service session is currently active.</Text>
          </View>
        </View>
      );
    }

    if (status === 'completed') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <View style={[styles.statusBannerIcon, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusBannerTitle, { color: '#14532D' }]}>Service Completed</Text>
            {booking.paymentReference && (
              <Text style={[styles.statusBannerSub, { color: '#15803D' }]}>
                Ref: {booking.paymentReference.slice(-8).toUpperCase()}
              </Text>
            )}
          </View>
        </View>
      );
    }

    // accepted + escrowed → Booking Confirmed
    if (['accepted', 'pending'].includes(status) && (ps === 'escrowed' || ps === 'released')) {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <View style={[styles.statusBannerIcon, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusBannerTitle, { color: '#14532D' }]}>Booking Confirmed</Text>
            <Text style={[styles.statusBannerSub, { color: '#15803D' }]}>
              Payment received
              {booking.paymentReference ? ` · Ref: ${booking.paymentReference.slice(-6).toUpperCase()}` : ''}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  // ── Refund Info ───────────────────────────────────────────────────────────────

  const renderRefundInfo = () => {
    if (!booking) return null;
    if (booking.paymentStatus === 'refunded') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
          <View style={[styles.statusBannerIcon, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="refresh-circle" size={22} color="#4338CA" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusBannerTitle, { color: '#312E81' }]}>Full Refund Processed</Text>
            <Text style={[styles.statusBannerSub, { color: '#4338CA' }]}>
              {formatPrice(booking.totalAmount)} returned to your wallet.
            </Text>
          </View>
        </View>
      );
    }
    if (booking.paymentStatus === 'partially_refunded' && booking.cancellationPenalty) {
      const refund = booking.totalAmount - booking.cancellationPenalty;
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.statusBannerIcon, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="alert-circle" size={22} color="#EA580C" />
            </View>
            <Text style={[styles.statusBannerTitle, { color: '#9A3412' }]}>Partial Refund</Text>
          </View>
          <View style={{ gap: 6, marginTop: 12 }}>
            <View style={styles.refundRow}>
              <Text style={styles.refundLabel}>Original amount</Text>
              <Text style={styles.refundValue}>{formatPrice(booking.totalAmount)}</Text>
            </View>
            <View style={styles.refundRow}>
              <Text style={[styles.refundLabel, { color: '#DC2626' }]}>Penalty (20%)</Text>
              <Text style={[styles.refundValue, { color: '#DC2626' }]}>-{formatPrice(booking.cancellationPenalty)}</Text>
            </View>
            <View style={[styles.refundRow, { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#FED7AA', marginTop: 4 }]}>
              <Text style={[styles.refundLabel, { color: '#15803D', fontWeight: '700' }]}>Refunded</Text>
              <Text style={[styles.refundValue, { color: '#15803D', fontWeight: '700' }]}>{formatPrice(refund)}</Text>
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  // ── Session Progress ──────────────────────────────────────────────────────────

  const renderSessionProgress = () => {
    if (!booking) return null;
    const status = booking.status.toLowerCase();
    if (!['accepted', 'in_progress'].includes(status)) return null;

    const vendorReady = booking.vendorStartConfirmed ?? false;
    const clientReady = booking.clientStartConfirmed ?? false;
    const isActive = status === 'in_progress';

    let waitMsg = '';
    if (!isActive) {
      if (!vendorReady && !clientReady) waitMsg = 'Both parties need to confirm to start the session.';
      else if (vendorReady && !clientReady) waitMsg = 'Waiting for client to confirm the session start…';
      else if (clientReady && !vendorReady) waitMsg = 'Waiting for vendor to confirm the session start…';
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session Progress</Text>

        {/* Step tracker */}
        <View style={styles.sessionStepsRow}>
          <SessionStep label="Vendor Ready" done={vendorReady} pulse={!vendorReady && !isActive} />
          <View style={[styles.sessionConnector, { backgroundColor: vendorReady ? '#16A34A' : '#E5E7EB' }]} />
          <SessionStep label="Client Ready" done={clientReady} pulse={vendorReady && !clientReady && !isActive} />
          <View style={[styles.sessionConnector, { backgroundColor: isActive ? '#16A34A' : '#E5E7EB' }]} />
          <SessionStep label="Live" done={isActive} pulse={isActive} />
        </View>

        {/* Live timer */}
        {isActive && booking.sessionStartedAt && (
          <View style={styles.sessionTimerRow}>
            <View style={styles.sessionTimerIcon}>
              <Ionicons name="timer-outline" size={16} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTimerLabel}>Session running</Text>
              <SessionTimer startedAt={booking.sessionStartedAt} />
            </View>
            <View style={styles.sessionLivePill}>
              <BlinkDot />
              <Text style={styles.sessionLiveText}>LIVE</Text>
            </View>
          </View>
        )}

        {/* Completion status */}
        {isActive && (booking.clientMarkedComplete || booking.vendorMarkedComplete) && (
          <View style={styles.sessionCompleteRow}>
            <View style={[styles.sessionCompleteItem, booking.vendorMarkedComplete && styles.sessionCompleteItemDone]}>
              <Ionicons name={booking.vendorMarkedComplete ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={booking.vendorMarkedComplete ? '#16A34A' : '#C7C7CC'} />
              <Text style={[styles.sessionCompleteLabel, booking.vendorMarkedComplete && { color: '#16A34A' }]}>Vendor done</Text>
            </View>
            <View style={[styles.sessionCompleteItem, booking.clientMarkedComplete && styles.sessionCompleteItemDone]}>
              <Ionicons name={booking.clientMarkedComplete ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={booking.clientMarkedComplete ? '#16A34A' : '#C7C7CC'} />
              <Text style={[styles.sessionCompleteLabel, booking.clientMarkedComplete && { color: '#16A34A' }]}>Client done</Text>
            </View>
          </View>
        )}

        {/* Confirm start button — shown inline when status is accepted */}
        {!isActive && (() => {
          const myConfirmed    = isVendor ? vendorReady : clientReady;
          const otherConfirmed = isVendor ? clientReady : vendorReady;
          const otherLabel     = isVendor ? 'client' : 'vendor';

          if (!myConfirmed) {
            return (
              <TouchableOpacity
                onPress={handleStartSession}
                disabled={actionLoading}
                style={styles.sessionStartBtn}
                activeOpacity={0.85}
              >
                {actionLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="play-circle-outline" size={17} color="#fff" />
                      <Text style={styles.sessionStartBtnTxt}>
                        {otherConfirmed ? `${otherLabel === 'client' ? 'Client' : 'Vendor'} confirmed — tap to go live!` : 'Confirm Session Start'}
                      </Text>
                    </>
                }
              </TouchableOpacity>
            );
          }

          return (
            <View style={styles.sessionWaitRow}>
              <ActivityIndicator size="small" color="#7C3AED" style={{ marginRight: 4 }} />
              <Text style={[styles.sessionWaitText, { color: '#7C3AED' }]}>
                Waiting for {otherLabel} to confirm start…
              </Text>
            </View>
          );
        })()}

        {/* Waiting message (only shown when neither has confirmed yet) */}
        {!!waitMsg && !vendorReady && !clientReady && (
          <View style={[styles.sessionWaitRow, { marginTop: 8 }]}>
            <Ionicons name="information-circle-outline" size={14} color="#C2410C" />
            <Text style={styles.sessionWaitText}>{waitMsg}</Text>
          </View>
        )}
      </View>
    );
  };

  // ── Service Timeline ──────────────────────────────────────────────────────────

  const renderServiceTimeline = () => {
    if (!booking) return null;
    const status = booking.status.toLowerCase();
    const serviceInfo = getServiceInfo();
    const otherParty = getOtherParty();
    const vendorName = otherParty?.type === 'vendor'
      ? (otherParty.data.vendorProfile?.businessName || `${otherParty.data.firstName} ${otherParty.data.lastName}`)
      : `${booking.vendor.firstName} ${booking.vendor.lastName}`;
    const clientName = `${booking.client.firstName} ${booking.client.lastName}`;

    type TStep = {
      key: string; label: string; subs: string[];
      ts?: string; done: boolean; active?: boolean;
      icon: string; color: string;
    };

    const steps: TStep[] = [];

    // 1. Booking Created
    steps.push({
      key: 'created',
      label: 'Booking Requested',
      subs: [
        `${clientName} booked ${serviceInfo?.name || 'a service'} with ${vendorName}`,
        `₦${booking.totalAmount.toLocaleString()} secured in escrow`,
      ],
      ts: booking.createdAt, done: true,
      icon: 'document-text-outline', color: PRIMARY,
    });

    // 2. Acceptance / Cancellation
    if (status === 'cancelled') {
      steps.push({
        key: 'cancelled',
        label: 'Booking Cancelled',
        subs: booking.cancellationReason
          ? [`Reason: ${booking.cancellationReason}`]
          : ['The booking was cancelled'],
        ts: booking.cancelledAt, done: true,
        icon: 'close-circle-outline', color: '#DC2626',
      });
    } else if (['accepted', 'in_progress', 'completed'].includes(status)) {
      const apptDate = new Date(booking.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const apptTime = booking.scheduledTime ? ` at ${format12Hour(booking.scheduledTime)}` : '';
      steps.push({
        key: 'accepted',
        label: 'Vendor Accepted',
        subs: [
          `${vendorName} confirmed your appointment`,
          `Scheduled for ${apptDate}${apptTime}`,
        ],
        ts: booking.acceptedAt, done: true,
        icon: 'checkmark-circle-outline', color: '#16A34A',
      });
    } else {
      steps.push({
        key: 'pending',
        label: 'Awaiting Vendor Response',
        subs: [`${vendorName} hasn't responded yet`],
        done: false, active: true,
        icon: 'hourglass-outline', color: '#F59E0B',
      });
    }

    // 3. Session Started
    if (['in_progress', 'completed'].includes(status)) {
      const startTime = booking.sessionStartedAt
        ? format12Hour((() => { const d = new Date(booking.sessionStartedAt!); return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`; })())
        : null;
      steps.push({
        key: 'started',
        label: 'Session Started',
        subs: [
          'Both vendor and client confirmed presence',
          startTime ? `Started at ${startTime}` : 'Timer is running',
        ],
        ts: booking.sessionStartedAt, done: true,
        active: status === 'in_progress',
        icon: 'play-circle-outline', color: '#7C3AED',
      });
    }

    // 4. Completion
    if (status === 'completed' || status === 'in_progress') {
      const completionSubs: string[] = [];
      if (booking.completedAt && booking.sessionStartedAt) {
        const mins = Math.round(
          (new Date(booking.completedAt).getTime() - new Date(booking.sessionStartedAt).getTime()) / 60000
        );
        const duration = mins >= 60
          ? `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
          : `${mins} min`;
        completionSubs.push(`Session lasted ${duration}`);
      } else if (booking.duration > 0) {
        const est = booking.duration >= 60
          ? `${Math.floor(booking.duration / 60)}h${booking.duration % 60 > 0 ? ` ${booking.duration % 60}m` : ''}`
          : `${booking.duration} min`;
        completionSubs.push(`Estimated duration: ${est}`);
      }
      if (status === 'completed') {
        completionSubs.push(`₦${booking.totalAmount.toLocaleString()} released to ${vendorName}`);
      } else {
        completionSubs.push('Waiting for both parties to mark as done');
      }
      steps.push({
        key: 'completed',
        label: status === 'completed' ? 'Service Completed' : 'Awaiting Completion',
        subs: completionSubs,
        ts: booking.completedAt,
        done: status === 'completed',
        active: status === 'in_progress',
        icon: 'checkmark-done-circle-outline', color: '#16A34A',
      });
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Service Timeline</Text>
        {steps.map((step, i) => (
          <View key={step.key} style={{ flexDirection: 'row' }}>
            <View style={{ alignItems: 'center', width: 36 }}>
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: step.done ? step.color : step.active ? `${step.color}18` : '#F2F2F7',
                borderWidth: step.done ? 0 : 2,
                borderColor: step.active ? step.color : '#E5E7EB',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name={step.icon as any} size={14}
                  color={step.done ? '#fff' : step.active ? step.color : '#C7C7CC'} />
              </View>
              {i < steps.length - 1 && (
                <View style={{
                  width: 2, flex: 1, minHeight: 20,
                  backgroundColor: step.done ? `${step.color}40` : '#E5E7EB',
                  marginVertical: 3,
                }} />
              )}
            </View>

            <View style={{ flex: 1, paddingLeft: 14, paddingBottom: i < steps.length - 1 ? 22 : 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '700',
                color: step.done ? TEXT_DARK : step.active ? step.color : '#A1A1AA' }}>
                {step.label}
              </Text>
              {step.subs.map((s, si) => (
                <Text key={si} style={{ fontSize: 12, color: '#8E8E93', marginTop: si === 0 ? 3 : 2, lineHeight: 17 }}>
                  {s}
                </Text>
              ))}
              {step.ts ? (
                <Text style={{ fontSize: 11, color: step.color, fontWeight: '600', marginTop: 5 }}>
                  {formatDateTime(step.ts)}
                </Text>
              ) : step.active && !step.ts ? (
                <Text style={{ fontSize: 11, color: step.color, fontWeight: '500', marginTop: 5 }}>
                  Ongoing…
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ── Action Bar (sticky footer) ────────────────────────────────────────────────

  const renderActionBar = () => {
    if (!booking) return null;
    const status = booking.status.toLowerCase();
    const serviceInfo = getServiceInfo();

    // ── Vendor: Accept / Reject pending booking ──
    if (status === 'pending' && isVendor) {
      return (
        <View style={[styles.actionBar, { paddingBottom: bottom + 16, gap: 10 }]}>
          <Text style={styles.abHint}>
            Review this booking request and accept or decline.
          </Text>
          <View style={styles.abRow}>
            <TouchableOpacity
              onPress={() => { setRejectReason(''); setShowRejectModal(true); }}
              disabled={actionLoading}
              style={[styles.abSecondary, styles.abSecondaryRed, { flex: 1 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text style={[styles.abSecondaryText, { color: '#DC2626' }]}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAcceptBooking}
              disabled={actionLoading}
              style={[styles.abPrimary, { flex: 1, backgroundColor: PRIMARY }]}
              activeOpacity={0.85}
            >
              {actionLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.abPrimaryText}>Accept</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── Accepted: Reschedule (client only) + Cancel ──
    if (status === 'accepted') {
      return (
        <View style={[styles.actionBar, { paddingBottom: bottom + 16, gap: 10 }]}>
          {!isVendor && (
            <View style={styles.abRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Reschedule', {
                  bookingId: booking._id,
                  scheduledDate: booking.scheduledDate,
                  scheduledTime: booking.scheduledTime,
                  vendorName: booking.vendor?.vendorProfile?.businessName || `${booking.vendor?.firstName} ${booking.vendor?.lastName}`,
                  serviceName: serviceInfo?.name || 'Service',
                  serviceImage: serviceInfo?.images?.[0] || booking.vendor?.avatar,
                  serviceType: booking.serviceType,
                  location: booking.location,
                })}
                style={[styles.abSecondary, styles.abSecondaryBlue, { flex: 1 }]}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                <Text style={[styles.abSecondaryText, { color: '#2563EB' }]}>Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCancelModal(true)}
                style={[styles.abSecondary, styles.abSecondaryRed, { flex: 1 }]}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                <Text style={[styles.abSecondaryText, { color: '#DC2626' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {isVendor && (
            <TouchableOpacity onPress={() => setShowCancelModal(true)} style={styles.abTertiary} activeOpacity={0.7}>
              <Ionicons name="close-circle-outline" size={14} color="#9CA3AF" />
              <Text style={[styles.abTertiaryText, { color: '#9CA3AF' }]}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // ── Payment pending ──
    if (booking.paymentStatus === 'pending') {
      return (
        <View style={[styles.actionBar, { paddingBottom: bottom + 16 }]}>
          <View style={styles.abLocked}>
            <View style={styles.abLockedIcon}>
              <Ionicons name="lock-closed" size={20} color="#8E8E93" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.abLockedTitle}>Payment Pending</Text>
              <Text style={styles.abLockedSub}>Complete payment to unlock all actions</Text>
            </View>
          </View>
        </View>
      );
    }

    // ── In-progress: Mark Complete + Report Issue side by side ──
    if (status === 'in_progress' && !booking.hasDispute) {
      const done  = isVendor ? booking.vendorMarkedComplete : booking.clientMarkedComplete;
      const label = isVendor
        ? (done ? 'Marked as Done'     : 'Mark as Done')
        : (done ? 'Marked Complete'    : 'Mark Complete');
      return (
        <View style={[styles.actionBar, { paddingBottom: bottom + 16 }]}>
          <View style={styles.abRow}>
            <TouchableOpacity
              onPress={handleCreateDispute}
              style={[styles.abCompact, styles.abCompactOrange]}
              activeOpacity={0.8}
            >
              <Ionicons name="flag-outline" size={15} color="#EA580C" />
              <Text style={[styles.abCompactTxt, { color: '#EA580C' }]}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleMarkComplete}
              disabled={actionLoading || done}
              style={[styles.abCompact, { flex: 2 }, done ? styles.abCompactGreenDone : styles.abCompactGreen]}
              activeOpacity={0.85}
            >
              {actionLoading
                ? <ActivityIndicator size="small" color={done ? '#16A34A' : '#fff'} />
                : <>
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={16}
                      color={done ? '#16A34A' : '#fff'}
                    />
                    <Text style={[styles.abCompactTxt, { color: done ? '#16A34A' : '#fff' }]}>{label}</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── Disputed ──
    if (booking.hasDispute) {
      return (
        <View style={[styles.actionBar, { paddingBottom: bottom + 16 }]}>
          <TouchableOpacity onPress={handleViewDispute} style={styles.abPrimaryOrange} activeOpacity={0.85}>
            <Ionicons name="alert-circle" size={22} color="#fff" />
            <Text style={styles.abPrimaryText}>View Dispute</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Build action slots ──
    let primary: React.ReactNode = null;
    let showReschedule = false;
    let showCancel = false;
    let showReport = false;

    // Primary: Write Review (client, completed, no review yet)
    if (status === 'completed' && !booking.hasReview && !isVendor) {
      primary = (
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateReview', {
            bookingId: booking._id,
            vendorName: booking.vendor?.vendorProfile?.businessName || `${booking.vendor?.firstName} ${booking.vendor?.lastName}`,
            serviceName: serviceInfo?.name || 'Service',
            vendorImage: serviceInfo?.images?.[0] || booking.vendor?.avatar,
            vendorRole: booking.vendor?.vendorProfile?.serviceCategory,
            completedAt: booking.completedAt,
          })}
          style={[styles.abPrimary, { backgroundColor: PRIMARY }]}
          activeOpacity={0.85}
        >
          <Ionicons name="star-outline" size={22} color="#fff" />
          <Text style={styles.abPrimaryText}>Write a Review</Text>
        </TouchableOpacity>
      );
    }

    // Review already submitted badge
    if (status === 'completed' && booking.hasReview && !isVendor) {
      primary = (
        <View style={styles.abReviewDone}>
          <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          <Text style={styles.abReviewDoneText}>Review Submitted</Text>
        </View>
      );
    }

    // Reschedule + Cancel only when session has NOT started
    showReschedule = ['pending', 'accepted'].includes(status) && booking.paymentStatus === 'escrowed' && !isVendor;
    showCancel = ['pending', 'accepted'].includes(status) && booking.paymentStatus === 'escrowed';
    showReport = false; // completed means both parties done + payment settled, no new disputes

    const hasSecondaryRow = showReschedule || showCancel;

    if (!primary && !hasSecondaryRow && !showReport) return null;

    return (
      <View style={[styles.actionBar, { paddingBottom: bottom + 16 }]}>
        {/* Primary */}
        {primary}

        {/* Secondary row: Reschedule + Cancel */}
        {hasSecondaryRow && (
          <View style={styles.abSecondaryRow}>
            {showReschedule && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Reschedule', {
                  bookingId: booking._id,
                  scheduledDate: booking.scheduledDate,
                  scheduledTime: booking.scheduledTime,
                  vendorName: booking.vendor?.vendorProfile?.businessName || `${booking.vendor?.firstName} ${booking.vendor?.lastName}`,
                  serviceName: serviceInfo?.name || 'Service',
                  serviceImage: serviceInfo?.images?.[0] || booking.vendor?.avatar,
                  serviceType: booking.serviceType,
                  location: booking.location,
                })}
                style={[styles.abSecondary, styles.abSecondaryBlue]}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                <Text style={[styles.abSecondaryText, { color: '#2563EB' }]}>Reschedule</Text>
              </TouchableOpacity>
            )}
            {showCancel && (
              <TouchableOpacity
                onPress={() => setShowCancelModal(true)}
                disabled={actionLoading}
                style={[styles.abSecondary, styles.abSecondaryRed]}
                activeOpacity={0.8}
              >
                {actionLoading
                  ? <ActivityIndicator size="small" color="#DC2626" />
                  : <>
                      <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                      <Text style={[styles.abSecondaryText, { color: '#DC2626' }]}>Cancel</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tertiary: Report issue — text link style */}
        {showReport && (
          <TouchableOpacity onPress={handleCreateDispute} style={styles.abTertiary} activeOpacity={0.7}>
            <Ionicons name="flag-outline" size={15} color="#EA580C" />
            <Text style={styles.abTertiaryText}>Report an Issue</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Loading / Empty ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centeredScreen, { paddingTop: top }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading booking…</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.centeredScreen, { paddingTop: top }]}>
        <Ionicons name="document-text-outline" size={56} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Booking not found</Text>
      </View>
    );
  }

  const serviceInfo = getServiceInfo();
  const otherParty = getOtherParty();
  const heroImage = serviceInfo?.images?.[0] || booking.vendor?.avatar;

  const displayAvatar = otherParty?.data?.avatar;
  const displayName = otherParty
    ? otherParty.type === 'vendor'
      ? otherParty.data.vendorProfile?.businessName || `${otherParty.data.firstName} ${otherParty.data.lastName}`
      : `${otherParty.data.firstName} ${otherParty.data.lastName}`
    : `${booking.vendor.firstName} ${booking.vendor.lastName}`;
  const displayRole = otherParty?.type === 'vendor'
    ? (otherParty.data.vendorProfile?.serviceCategory || 'Beauty Professional')
    : 'Client';
  const displayCity = otherParty?.type === 'vendor'
    ? (otherParty.data.vendorProfile?.city || booking.location?.city)
    : booking.location?.city;
  const isVerified = otherParty?.type === 'vendor';

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom + 180 }}>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {heroImage ? (
            <>
              {/* Blurred bg fill */}
              <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover"
                blurRadius={18} />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)' }]} />
              {/* Centered sharp image */}
              <Image source={{ uri: heroImage }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain" />
            </>
          ) : (
            <LinearGradient colors={['#E04079', '#FF6BA8']} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0.5)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Status pill (top-right) */}
          <View style={[styles.heroPill, { top: top + 16, right: 20 }]}>
            <Text style={styles.heroPillText}>{formatStatus(booking.status)}</Text>
          </View>

          {/* Back button */}
          <View style={[styles.heroButtons, { top: top + 12 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroBtn} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Vendor Profile ────────────────────────────────────────────────── */}
        <View style={styles.profileSection}>
          {/* Avatar overlapping hero — tappable for vendors */}
          <TouchableOpacity
            activeOpacity={otherParty?.type === 'vendor' ? 0.8 : 1}
            onPress={() => {
              if (otherParty?.type === 'vendor') {
                navigation.navigate('VendorDetail', { vendorId: otherParty.data._id });
              }
            }}
            style={styles.avatarWrap}
          >
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#E04079', '#FF6BA8']} style={styles.avatar}>
                <Ionicons name="person" size={32} color="#fff" />
              </LinearGradient>
            )}
            {otherParty?.type === 'vendor' && (
              <View style={styles.avatarViewBadge}>
                <Ionicons name="eye-outline" size={11} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Name + Verified (only for vendors) */}
          <View style={styles.profileNameRow}>
            <Text style={styles.profileName}>{displayName}</Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={18} color={PRIMARY} style={{ marginLeft: 6, marginTop: 1 }} />
            )}
          </View>

          {/* Role + City */}
          <View style={styles.profileSubRow}>
            <Ionicons name={isVerified ? 'cut-outline' : 'person-outline'} size={13} color="#8E8E93" />
            <Text style={styles.profileSub}>
              {displayRole}{displayCity ? ` · ${displayCity}` : ''}
            </Text>
          </View>

          {/* Message Button */}
          {otherParty && (
            <TouchableOpacity onPress={handleMessage} style={styles.messageBtn} activeOpacity={0.8}>
              <LinearGradient colors={['#E04079', '#FF6BA8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.messageBtnGrad}>
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.messageBtnText}>Send Message</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Status / Confirmation Banner */}
          {renderStatusBanner()}

          {/* Refund Info */}
          {renderRefundInfo()}

          {/* Session Progress Card */}
          {renderSessionProgress()}

          {/* Service Timeline */}
          {renderServiceTimeline()}

          {/* Dispute Alert */}
          {booking.hasDispute && (
            <TouchableOpacity onPress={handleViewDispute} style={styles.disputeAlert} activeOpacity={0.75}>
              <View style={styles.disputeAlertIcon}>
                <Ionicons name="alert-circle" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.disputeAlertTitle}>Active Dispute</Text>
                <Text style={styles.disputeAlertBody}>Tap to view dispute details</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#EA580C" />
            </TouchableOpacity>
          )}

          {/* ── Appointment Details Card ─────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Appointment Details</Text>
            <View style={{ gap: 14 }}>
              <DetailRow
                icon="calendar-outline"
                value={formatLongDate(booking.scheduledDate)}
              />
              {booking.location && booking.distanceKm !== undefined && (
                <DetailRow
                  icon="navigate-outline"
                  value={booking.distanceKm < 1 ? 'Less than 1 km away' : `${booking.distanceKm.toFixed(1)} km away`}
                />
              )}
              {booking.distanceCharge > 0 && (
                <DetailRow
                  icon="car-outline"
                  value={`Distance charge: ${formatPrice(booking.distanceCharge)}`}
                />
              )}
              {booking.scheduledTime && (
                <DetailRow
                  icon="time-outline"
                  value={format12Hour(booking.scheduledTime)}
                />
              )}
              {booking.duration > 0 && (
                <DetailRow
                  icon="hourglass-outline"
                  value={`${booking.duration} minutes`}
                />
              )}
            </View>
          </View>

          {/* ── Price Breakdown Card ──────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Price Breakdown</Text>
            <View style={{ gap: 10 }}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service fee</Text>
                <Text style={styles.priceValue}>{formatPrice(booking.servicePrice)}</Text>
              </View>
              {booking.distanceCharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Distance charge</Text>
                  <Text style={styles.priceValue}>{formatPrice(booking.distanceCharge)}</Text>
                </View>
              )}
              {!!booking.cancellationPenalty && booking.cancellationPenalty > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: '#DC2626' }]}>Cancellation penalty</Text>
                  <Text style={[styles.priceValue, { color: '#DC2626' }]}>-{formatPrice(booking.cancellationPenalty)}</Text>
                </View>
              )}
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceTotalLabel}>Total</Text>
                <Text style={styles.priceTotalValue}>{formatPrice(booking.totalAmount)}</Text>
              </View>
              {/* Payment ref pill */}
              {booking.paymentReference && (
                <View style={styles.paymentRefRow}>
                  <Ionicons name="receipt-outline" size={14} color="#6C6C70" />
                  <Text style={styles.paymentRefText}>Ref: {booking.paymentReference.slice(-10).toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Notes Card ───────────────────────────────────────────────── */}
          {(booking.clientNotes || booking.vendorNotes || booking.cancellationReason) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Notes</Text>
              <View style={{ gap: 10 }}>
                {booking.clientNotes && (
                  <View style={[styles.noteBlock, { backgroundColor: '#EFF6FF' }]}>
                    <View style={styles.noteHeader}>
                      <Ionicons name="person-circle-outline" size={17} color="#3B82F6" />
                      <Text style={[styles.noteHeaderText, { color: '#1D4ED8' }]}>Client Note</Text>
                    </View>
                    <Text style={styles.noteBody}>{booking.clientNotes}</Text>
                  </View>
                )}
                {booking.vendorNotes && (
                  <View style={[styles.noteBlock, { backgroundColor: '#FFF0F6' }]}>
                    <View style={styles.noteHeader}>
                      <Ionicons name="briefcase-outline" size={17} color={PRIMARY} />
                      <Text style={[styles.noteHeaderText, { color: '#BE185D' }]}>Vendor Note</Text>
                    </View>
                    <Text style={styles.noteBody}>{booking.vendorNotes}</Text>
                  </View>
                )}
                {booking.cancellationReason && (
                  <View style={[styles.noteBlock, { backgroundColor: '#FEF2F2' }]}>
                    <View style={styles.noteHeader}>
                      <Ionicons name="close-circle-outline" size={17} color="#DC2626" />
                      <Text style={[styles.noteHeaderText, { color: '#B91C1C' }]}>Cancellation Reason</Text>
                    </View>
                    <Text style={styles.noteBody}>{booking.cancellationReason}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* ── Sticky Action Bar ─────────────────────────────────────────────── */}
      {renderActionBar()}

      <CancelBookingModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelBooking}
        loading={actionLoading}
        booking={booking ? {
          vendorName: booking.vendor?.vendorProfile?.businessName || `${booking.vendor?.firstName} ${booking.vendor?.lastName}`,
          vendorAvatar: booking.vendor?.avatar,
          serviceName: serviceInfo?.name || 'Service',
          duration: booking.duration,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          serviceType: booking.location ? 'home_service' : 'in_shop',
          location: booking.location,
          totalAmount: booking.totalAmount,
          serviceImage: serviceInfo?.images?.[0],
        } : undefined}
      />
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />

      {/* Reject Booking Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide" onRequestClose={() => setShowRejectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={styles.rejectOverlay} activeOpacity={1} onPress={() => setShowRejectModal(false)} />
          <View style={styles.rejectSheet}>
            <View style={styles.rejectHandle} />
            <Text style={styles.rejectTitle}>Decline Booking</Text>
            <Text style={styles.rejectSub}>Please tell the client why you're declining this request.</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="Enter reason (min 10 characters)…"
              placeholderTextColor="#9CA3AF"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
              autoFocus
            />
            <Text style={styles.rejectCount}>{rejectReason.trim().length}/500</Text>
            <TouchableOpacity
              onPress={handleRejectBooking}
              disabled={actionLoading || rejectReason.trim().length < 10}
              style={[styles.rejectBtn, (actionLoading || rejectReason.trim().length < 10) && { opacity: 0.45 }]}
              activeOpacity={0.85}
            >
              {actionLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.rejectBtnTxt}>Decline Booking</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  centeredScreen: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: TEXT_DARK },

  // Hero
  hero: { height: HERO_H, width: SCREEN_W, backgroundColor: '#111', overflow: 'hidden' },
  heroButtons: {
    position: 'absolute', left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  heroBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroPill: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  heroPillText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },

  // Profile
  profileSection: {
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  avatarWrap: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4, borderColor: '#fff',
    overflow: 'hidden',
    marginTop: -(AVATAR_SIZE / 2),
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  avatar: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarViewBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: PRIMARY, borderWidth: 1.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  profileName: { fontSize: 20, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.5 },
  profileSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  profileSub: { fontSize: 13, color: '#6C6C70', fontWeight: '500' },
  messageBtn: { marginTop: 18, width: '100%', borderRadius: 14, overflow: 'hidden' },
  messageBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
  },
  messageBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Content
  content: { paddingHorizontal: 16, gap: 12 },

  // Status Banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, padding: 14,
  },
  statusBannerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusBannerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  statusBannerSub: { fontSize: 12, lineHeight: 17 },
  expiryPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  expiryText: { fontSize: 11, fontWeight: '700' },

  // Refund
  refundRow: { flexDirection: 'row', justifyContent: 'space-between' },
  refundLabel: { fontSize: 13, color: '#6C6C70' },
  refundValue: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },

  // Dispute Alert
  disputeAlert: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#FED7AA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  disputeAlertIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  disputeAlertTitle: { fontSize: 14, fontWeight: '700', color: '#9A3412' },
  disputeAlertBody: { fontSize: 12, color: '#C2410C', marginTop: 2 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, letterSpacing: -0.3, marginBottom: 18 },

  // Detail Row
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#FCE4EC', alignItems: 'center', justifyContent: 'center',
  },
  detailValue: { flex: 1, fontSize: 14, fontWeight: '500', color: '#3A3A3C' },

  // Price
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: '#6C6C70', fontWeight: '500' },
  priceValue: { fontSize: 14, color: '#1C1C1E', fontWeight: '600' },
  priceDivider: { height: 1, backgroundColor: '#F2F2F7' },
  priceTotalLabel: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  priceTotalValue: { fontSize: 20, fontWeight: '800', color: PRIMARY, letterSpacing: -0.5 },
  paymentRefRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  paymentRefText: { fontSize: 12, color: '#6C6C70', fontWeight: '500' },

  // Notes
  noteBlock: { borderRadius: 12, padding: 14 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  noteHeaderText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  noteBody: { fontSize: 14, color: '#3A3A3C', lineHeight: 20 },

  // ── Sticky Action Bar ──
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 14,
    gap: 10,
  },
  // Primary buttons
  abPrimary: {
    height: 44, borderRadius: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  abPrimaryGreen: { backgroundColor: '#16A34A' },
  abPrimaryDoneGreen: { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#86EFAC' },
  abPrimaryOrange: {
    height: 44, borderRadius: 13, backgroundColor: '#EA580C',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  abPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  // Secondary row
  abSecondaryRow: { flexDirection: 'row', gap: 10 },
  abSecondary: {
    flex: 1, height: 42, borderRadius: 12, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  abSecondaryBlue: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  abSecondaryRed: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  abSecondaryText: { fontSize: 13, fontWeight: '600' },
  // Compact side-by-side (in_progress)
  abCompact: {
    flex: 1, height: 42, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  abCompactOrange: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74' },
  abCompactGreen: { backgroundColor: '#16A34A' },
  abCompactGreenDone: { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#86EFAC' },
  abCompactTxt: { fontSize: 13, fontWeight: '700' },
  // Tertiary (report issue)
  abTertiary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 4,
  },
  abTertiaryText: { fontSize: 13, fontWeight: '600', color: '#EA580C' },
  // Locked state
  abLocked: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  abLockedIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  abLockedTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  abLockedSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  // Review submitted badge
  abReviewDone: {
    height: 52, borderRadius: 16,
    backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#86EFAC',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  abReviewDoneText: { fontSize: 15, fontWeight: '700', color: '#16A34A' },

  // Session Progress
  sessionStepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sessionStep: { alignItems: 'center', gap: 6, flex: 1 },
  sessionStepDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionStepDone: { backgroundColor: '#16A34A' },
  sessionStepPulse: { backgroundColor: '#FCE4EC', borderWidth: 2, borderColor: PRIMARY },
  sessionStepIdle: { backgroundColor: '#F2F2F7', borderWidth: 2, borderColor: '#E5E7EB' },
  sessionStepInner: { width: 8, height: 8, borderRadius: 4 },
  sessionStepLabel: { fontSize: 11, fontWeight: '600', color: '#8E8E93', textAlign: 'center' },
  sessionConnector: { height: 2, flex: 0.6, marginBottom: 18 },
  sessionTimerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    marginBottom: 12,
  },
  sessionTimerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  sessionTimerLabel: { fontSize: 11, color: '#16A34A', fontWeight: '600', marginBottom: 2 },
  sessionElapsed: { fontSize: 22, fontWeight: '800', color: '#14532D', letterSpacing: -0.5 },
  sessionLivePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#DCFCE7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  sessionLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  sessionLiveText: { fontSize: 10, fontWeight: '800', color: '#15803D', letterSpacing: 1 },
  sessionCompleteRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sessionCompleteItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F2F2F7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  sessionCompleteItemDone: { backgroundColor: '#F0FDF4' },
  sessionCompleteLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  sessionWaitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12 },
  sessionWaitText: { flex: 1, fontSize: 12, color: '#C2410C', fontWeight: '500', lineHeight: 17 },
  sessionStartBtn: {
    height: 42, borderRadius: 12, backgroundColor: '#7C3AED',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, marginTop: 14,
  },
  sessionStartBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // New action bar helpers
  abSessionBtn: {
    height: 44, borderRadius: 13, backgroundColor: '#7C3AED',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  abSessionBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  abHint: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  abRow: { flexDirection: 'row', gap: 10 },
  abWaiting: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F3FF', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#DDD6FE',
  },
  abWaitingTitle: { fontSize: 14, fontWeight: '700', color: '#4C1D95' },
  abWaitingSub: { fontSize: 12, color: '#7C3AED', marginTop: 2 },

  // Reject modal
  rejectOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  rejectSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  rejectHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 20,
  },
  rejectTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 6 },
  rejectSub: { fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 18 },
  rejectInput: {
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14,
    fontSize: 14, color: TEXT_DARK, minHeight: 110,
    borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 6,
  },
  rejectCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 16 },
  rejectBtn: {
    backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  rejectBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default BookingDetailScreen;
