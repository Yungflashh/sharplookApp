import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';
import CancelBookingModal from '@/components/ui/CancelBookingModal';

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
      rating?: number;
      completedBookings?: number;
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
  location?: { address: string; city: string; state: string };
  servicePrice: number;
  distanceCharge: number;
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
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Card: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const CardTitle: React.FC<{ title: string; style?: any }> = ({ title, style }) => (
  <Text style={[styles.cardTitle, style]}>{title}</Text>
);

const InfoRow: React.FC<{
  iconName: string;
  iconBg: string;
  iconColor: string;
  label: string;
  alignStart?: boolean;
}> = ({ iconName, iconBg, iconColor, label, alignStart }) => (
  <View style={[styles.infoRow, alignStart && { alignItems: 'flex-start' }]}>
    <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={iconName as any} size={18} color={iconColor} />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const BookingDetailScreen: React.FC = () => {
  const navigation = useNavigation<BookingDetailNavigationProp>();
  const route = useRoute<BookingDetailRouteProp>();
  const { bookingId } = route.params;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
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

  useEffect(() => { fetchBookingDetails(); }, [bookingId]);

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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':      return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
      case 'accepted':     return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'in_progress':  return { bg: '#FAF5FF', text: '#6D28D9', border: '#DDD6FE' };
      case 'completed':    return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
      case 'cancelled':    return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' };
      default:             return { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB' };
    }
  };

  const getPaymentInfo = (ps: string) => {
    switch (ps) {
      case 'pending':            return { bg: '#FFF7ED', text: '#C2410C', label: 'Payment Pending',    icon: 'time-outline' };
      case 'escrowed':           return { bg: '#EFF6FF', text: '#1D4ED8', label: 'Payment Secured',    icon: 'shield-checkmark-outline' };
      case 'released':           return { bg: '#F0FDF4', text: '#15803D', label: 'Payment Released',   icon: 'checkmark-circle-outline' };
      case 'refunded':           return { bg: '#EEF2FF', text: '#4338CA', label: 'Fully Refunded',     icon: 'refresh-circle-outline' };
      case 'partially_refunded': return { bg: '#FFF7ED', text: '#C2410C', label: 'Partially Refunded', icon: 'alert-circle-outline' };
      default:                   return { bg: '#F9FAFB', text: '#374151', label: ps,                   icon: 'help-circle-outline' };
    }
  };

  const formatStatus = (s: string) =>
    s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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
    navigation.navigate('CreateDispute', { bookingId: booking._id });
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

  // ── Banners ──────────────────────────────────────────────────────────────────

  const renderPaymentPendingBanner = () => {
    if (!booking || booking.paymentStatus !== 'pending') return null;
    const timeRemaining = getTimeUntilExpiry();
    const expired = timeRemaining === 'Expired';

    return (
      <View style={[styles.banner, { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' }]}>
        <View style={styles.bannerRow}>
          <View style={[styles.bannerIconWrap, { backgroundColor: '#FFEDD5' }]}>
            <Ionicons name="time" size={20} color="#EA580C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: '#9A3412' }]}>Payment Pending</Text>
            <Text style={[styles.bannerBody, { color: '#C2410C' }]}>
              Complete your payment on Paystack to confirm this booking.
            </Text>
          </View>
        </View>
        {timeRemaining && (
          <View style={[styles.timerRow, { backgroundColor: expired ? '#FEE2E2' : '#FFEDD5' }]}>
            <Ionicons name={expired ? 'close-circle' : 'hourglass'} size={14} color={expired ? '#DC2626' : '#92400E'} />
            <Text style={[styles.timerText, { color: expired ? '#DC2626' : '#92400E' }]}>
              {expired ? 'Payment window expired. Booking will be cancelled.' : `Expires in: ${timeRemaining}`}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderRefundInfo = () => {
    if (!booking) return null;
    if (booking.paymentStatus === 'refunded') {
      return (
        <View style={[styles.banner, { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }]}>
          <View style={styles.bannerRow}>
            <View style={[styles.bannerIconWrap, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="refresh-circle" size={20} color="#4338CA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: '#312E81' }]}>Full Refund Processed</Text>
              <Text style={[styles.bannerBody, { color: '#4338CA' }]}>
                {formatPrice(booking.totalAmount)} has been returned to your wallet.
              </Text>
            </View>
          </View>
        </View>
      );
    }
    if (booking.paymentStatus === 'partially_refunded' && booking.cancellationPenalty) {
      const refund = booking.totalAmount - booking.cancellationPenalty;
      return (
        <View style={[styles.banner, { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' }]}>
          <View style={styles.bannerRow}>
            <View style={[styles.bannerIconWrap, { backgroundColor: '#FFEDD5' }]}>
              <Ionicons name="alert-circle" size={20} color="#EA580C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: '#9A3412' }]}>Partial Refund</Text>
            </View>
          </View>
          <View style={styles.refundRows}>
            <View style={styles.refundRow}>
              <Text style={styles.refundLabel}>Original amount</Text>
              <Text style={styles.refundValue}>{formatPrice(booking.totalAmount)}</Text>
            </View>
            <View style={styles.refundRow}>
              <Text style={[styles.refundLabel, { color: '#DC2626' }]}>Penalty (20%)</Text>
              <Text style={[styles.refundValue, { color: '#DC2626' }]}>-{formatPrice(booking.cancellationPenalty)}</Text>
            </View>
            <View style={[styles.refundRow, styles.refundRowTotal]}>
              <Text style={[styles.refundLabel, { color: '#15803D', fontWeight: '700' }]}>Refunded to wallet</Text>
              <Text style={[styles.refundValue, { color: '#15803D', fontWeight: '700' }]}>{formatPrice(refund)}</Text>
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  const renderActionButtons = () => {
    if (!booking) return null;
    const status = booking.status.toLowerCase();
    const serviceInfo = getServiceInfo();

    if (booking.paymentStatus === 'pending') {
      return (
        <View style={styles.lockedActions}>
          <Ionicons name="lock-closed-outline" size={16} color="#8E8E93" />
          <Text style={styles.lockedActionsText}>Complete payment to unlock booking actions</Text>
        </View>
      );
    }

    return (
      <View style={{ gap: 10 }}>
        {/* Mark Complete */}
        {['accepted', 'in_progress'].includes(status) && !isVendor && (
          <TouchableOpacity
            onPress={handleMarkComplete}
            disabled={actionLoading || booking.clientMarkedComplete}
            style={[styles.actionBtn, booking.clientMarkedComplete ? styles.actionBtnDisabled : styles.actionBtnGreen]}
            activeOpacity={0.8}
          >
            {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : (
              <View style={styles.actionBtnInner}>
                <Ionicons name={booking.clientMarkedComplete ? 'checkmark-circle' : 'checkmark-circle-outline'} size={19} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {booking.clientMarkedComplete ? 'Marked Complete' : 'Mark as Complete'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Leave Review */}
        {status === 'completed' && !booking.hasReview && !isVendor && (
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateReview', {
              bookingId: booking._id,
              vendorName: booking.vendor?.vendorProfile?.businessName || `${booking.vendor?.firstName} ${booking.vendor?.lastName}`,
              serviceName: serviceInfo?.name || 'Service',
            })}
            style={[styles.actionBtn, styles.actionBtnYellow]}
            activeOpacity={0.8}
          >
            <View style={styles.actionBtnInner}>
              <Ionicons name="star-outline" size={19} color="#fff" />
              <Text style={styles.actionBtnText}>Leave a Review</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Review Submitted */}
        {status === 'completed' && booking.hasReview && !isVendor && (
          <View style={[styles.actionBtn, styles.actionBtnGreen]}>
            <View style={styles.actionBtnInner}>
              <Ionicons name="checkmark-circle" size={19} color="#fff" />
              <Text style={styles.actionBtnText}>Review Submitted</Text>
            </View>
          </View>
        )}

        {/* Cancel */}
        {['pending', 'accepted'].includes(status) && booking.paymentStatus === 'escrowed' && (
          <TouchableOpacity
            onPress={() => setShowCancelModal(true)}
            disabled={actionLoading}
            style={[styles.actionBtn, styles.actionBtnOutlineRed]}
            activeOpacity={0.8}
          >
            {actionLoading ? <ActivityIndicator size="small" color="#E8166D" /> : (
              <View style={styles.actionBtnInner}>
                <Ionicons name="close-circle-outline" size={19} color="#DC2626" />
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel Booking</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Dispute */}
        {['accepted', 'in_progress', 'completed'].includes(status) && (
          booking.hasDispute ? (
            <TouchableOpacity onPress={handleViewDispute} style={[styles.actionBtn, styles.actionBtnOrange]} activeOpacity={0.8}>
              <View style={styles.actionBtnInner}>
                <Ionicons name="alert-circle-outline" size={19} color="#fff" />
                <Text style={styles.actionBtnText}>View Active Dispute</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleCreateDispute} style={[styles.actionBtn, styles.actionBtnOutlineOrange]} activeOpacity={0.8}>
              <View style={styles.actionBtnInner}>
                <Ionicons name="flag-outline" size={19} color="#EA580C" />
                <Text style={[styles.actionBtnText, { color: '#EA580C' }]}>Report an Issue</Text>
              </View>
            </TouchableOpacity>
          )
        )}
      </View>
    );
  };

  // ── Loading / Empty ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#E8166D" />
        <Text style={styles.loadingText}>Loading booking…</Text>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <Ionicons name="document-text-outline" size={56} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Booking not found</Text>
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusStyle(booking.status);
  const paymentInfo = getPaymentInfo(booking.paymentStatus);
  const otherParty = getOtherParty();
  const serviceInfo = getServiceInfo();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#E8166D', '#FF5FA0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.headerMeta}>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusPillText, { color: statusStyle.text }]}>{formatStatus(booking.status)}</Text>
          </View>
          {booking.bookingNumber && (
            <View style={styles.bookingNumberPill}>
              <Text style={styles.bookingNumberText}>#{booking.bookingNumber}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {renderPaymentPendingBanner()}
        {renderRefundInfo()}

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

        {/* Service Card */}
        <Card>
          {serviceInfo?.images && serviceInfo.images.length > 0 && (
            <Image source={{ uri: serviceInfo.images[0] }} style={styles.serviceImage} resizeMode="cover" />
          )}
          <View style={styles.serviceBody}>
            <Text style={styles.serviceName}>{serviceInfo?.name || 'Unknown Service'}</Text>
            {serviceInfo?.description && (
              <Text style={styles.serviceDesc}>{serviceInfo.description}</Text>
            )}
            <View style={styles.serviceMetaRow}>
              <View style={styles.serviceMetaItem}>
                <View style={[styles.metaIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="time-outline" size={15} color="#3B82F6" />
                </View>
                <Text style={styles.metaText}>{booking.duration} mins</Text>
              </View>
              <View style={styles.serviceMetaItem}>
                <View style={[styles.metaIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="cash-outline" size={15} color="#22C55E" />
                </View>
                <Text style={styles.metaText}>{formatPrice(booking.servicePrice)}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Other Party Card */}
        {otherParty && (
          <Card>
            <CardTitle title={`${otherParty.label} Information`} />
            <View style={styles.partyRow}>
              <View style={styles.avatarWrap}>
                {otherParty.data?.avatar ? (
                  <Image source={{ uri: otherParty.data.avatar }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={['#E8166D', '#FF5FA0']} style={styles.avatarFallback}>
                    <Ionicons name="person" size={26} color="#fff" />
                  </LinearGradient>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.partyName}>
                  {otherParty.type === 'vendor'
                    ? otherParty.data?.vendorProfile?.businessName || `${otherParty.data?.firstName} ${otherParty.data?.lastName}`
                    : `${otherParty.data?.firstName} ${otherParty.data?.lastName}`}
                </Text>
                {otherParty.type === 'vendor' && otherParty.data?.vendorProfile && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color="#FBBF24" />
                    <Text style={styles.ratingText}>
                      {otherParty.data.vendorProfile.rating?.toFixed(1) || 'New'} · {otherParty.data.vendorProfile.completedBookings || 0} jobs
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={handleMessage} style={styles.messageBtn} activeOpacity={0.8}>
              <Ionicons name="chatbubble-outline" size={17} color="#fff" />
              <Text style={styles.messageBtnText}>Send Message</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Schedule Card */}
        <Card>
          <CardTitle title="Schedule" />
          <View style={{ gap: 14 }}>
            <InfoRow iconName="calendar-outline" iconBg="#FAF5FF" iconColor="#A855F7" label={formatDate(booking.scheduledDate)} />
            {booking.scheduledTime && (
              <InfoRow iconName="time-outline" iconBg="#EFF6FF" iconColor="#3B82F6" label={booking.scheduledTime} />
            )}
            {booking.location && (
              <InfoRow
                iconName="location-outline"
                iconBg="#F0FDF4"
                iconColor="#22C55E"
                label={`${booking.location.address}, ${booking.location.city}, ${booking.location.state}`}
                alignStart
              />
            )}
          </View>
        </Card>

        {/* Price Card */}
        <Card>
          <CardTitle title="Price Breakdown" />
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

            {/* Payment Status Pill */}
            <View style={[styles.paymentStatusRow, { backgroundColor: paymentInfo.bg }]}>
              <View style={styles.paymentStatusLeft}>
                <Ionicons name={paymentInfo.icon as any} size={16} color={paymentInfo.text} />
                <Text style={[styles.paymentStatusLabel, { color: paymentInfo.text }]}>{paymentInfo.label}</Text>
              </View>
              {booking.paymentReference && (
                <Text style={[styles.paymentRef, { color: paymentInfo.text }]}>
                  Ref: {booking.paymentReference.slice(-8)}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Notes Card */}
        {(booking.clientNotes || booking.vendorNotes || booking.cancellationReason) && (
          <Card>
            <CardTitle title="Notes" />
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
                    <Ionicons name="briefcase-outline" size={17} color="#E8166D" />
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
          </Card>
        )}

        {/* Action Buttons */}
        {renderActionButtons()}

      </ScrollView>

      <CancelBookingModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelBooking}
        loading={actionLoading}
      />
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  centeredScreen: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  emptyTitle: { marginTop: 14, fontSize: 18, fontWeight: '700', color: '#1C1C1E' },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.4 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5,
  },
  statusPillText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  bookingNumberPill: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  bookingNumberText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Scroll
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3, marginBottom: 16, paddingHorizontal: 18, paddingTop: 18 },

  // Banner
  banner: {
    borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 10,
  },
  bannerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bannerIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  bannerBody: { fontSize: 13, lineHeight: 18 },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  timerText: { fontSize: 12, fontWeight: '700' },
  refundRows: { gap: 6, marginTop: 4 },
  refundRow: { flexDirection: 'row', justifyContent: 'space-between' },
  refundRowTotal: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#FED7AA', marginTop: 4 },
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

  // Service
  serviceImage: { width: '100%', height: 180 },
  serviceBody: { padding: 18 },
  serviceName: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.4, marginBottom: 6 },
  serviceDesc: { fontSize: 14, color: '#6C6C70', lineHeight: 20, marginBottom: 14 },
  serviceMetaRow: { flexDirection: 'row', gap: 16 },
  serviceMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metaText: { fontSize: 14, fontWeight: '600', color: '#3A3A3C' },

  // Party
  partyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 14 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  avatar: { width: 56, height: 56 },
  avatarFallback: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  partyName: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 13, color: '#6C6C70' },
  messageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3B82F6', marginHorizontal: 18, marginBottom: 18, paddingVertical: 13, borderRadius: 14,
  },
  messageBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Info Row
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 12 },
  infoIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#3A3A3C', lineHeight: 20 },

  // Price
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18 },
  priceLabel: { fontSize: 14, color: '#6C6C70', fontWeight: '500' },
  priceValue: { fontSize: 14, color: '#1C1C1E', fontWeight: '600' },
  priceDivider: { height: 1, backgroundColor: '#F2F2F7', marginHorizontal: 18 },
  priceTotalLabel: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  priceTotalValue: { fontSize: 20, fontWeight: '800', color: '#E8166D', letterSpacing: -0.5 },
  paymentStatusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 18, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12,
  },
  paymentStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentStatusLabel: { fontSize: 13, fontWeight: '700' },
  paymentRef: { fontSize: 11, fontWeight: '600', opacity: 0.7 },

  // Notes
  noteBlock: { borderRadius: 12, padding: 14, marginHorizontal: 18 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  noteHeaderText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  noteBody: { fontSize: 14, color: '#3A3A3C', lineHeight: 20 },

  // Action buttons
  lockedActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: '#E5E5EA',
  },
  lockedActionsText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  actionBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  actionBtnGreen: { backgroundColor: '#16A34A' },
  actionBtnDisabled: { backgroundColor: '#D1D5DB' },
  actionBtnYellow: { backgroundColor: '#D97706' },
  actionBtnOrange: { backgroundColor: '#EA580C' },
  actionBtnOutlineRed: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FCA5A5' },
  actionBtnOutlineOrange: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FDBA74' },
});

export default BookingDetailScreen;