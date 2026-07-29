import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, Image, Modal, Animated, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import socketService from '@/services/socket.service';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BG      = '#FCE4EC';
const WHITE   = '#FFFFFF';
const PRIMARY = '#E04079';
const TEXT    = '#1A1A2E';
const GRAY    = '#6B7280';
const MUTED   = '#9CA3AF';
const BORDER  = '#F0F0F0';

// ─── Types ────────────────────────────────────────────────────────────────────
type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type FilterTab = 'all' | 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

interface Booking {
  _id: string;
  bookingNumber?: string;
  service?: { _id: string; name: string; images?: string[]; duration?: number };
  offer?: string | { _id: string; title?: string; images?: string[] };
  vendor: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    vendorProfile?: { businessName: string; serviceCategory?: string };
  };
  scheduledDate: string;
  scheduledTime?: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentExpiresAt?: string;
  createdAt: string;
  location?: { address?: string; city?: string; state?: string };
  serviceType?: 'home_service' | 'in_shop';
  vendorStartConfirmed?: boolean;
  clientStartConfirmed?: boolean;
  sessionStartedAt?: string;
  clientMarkedComplete?: boolean;
  hasReview?: boolean;
  hasDispute?: boolean;
  disputeId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const format12Hour = (time?: string): string => {
  if (!time) return '';
  if (/AM|PM/i.test(time)) return time;
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  let h = parseInt(m[1]);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m[2]} ${period}`;
};

const formatShortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const formatPrice = (p: number) => `₦${p.toLocaleString()}`;


const getMinutesUntil = (iso?: string): number | null => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  return Math.ceil(diff / 60000);
};

const parseTarget = (date: string, time?: string): Date => {
  const d = new Date(date);
  if (time) {
    const m = time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (m) {
      let h = parseInt(m[1]);
      const p = m[3]?.toUpperCase();
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
      d.setHours(h, parseInt(m[2]), 0, 0);
    }
  }
  return d;
};

const computeCountdown = (date: string, time?: string) => {
  const diff = parseTarget(date, time).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hrs:  Math.floor((diff % 86400000) / 3600000),
    min:  Math.floor((diff % 3600000) / 60000),
  };
};

// ─── Section labels per status ────────────────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
  pending:     'Waiting for vendor to accept',
  accepted:    'Upcoming appointment',
  in_progress: 'Session in progress',
  completed:   'Completed bookings',
  cancelled:   'Cancelled bookings',
  disputed:    'Disputed bookings',
};

// ─── Waiting Banner ────────────────────────────────────────────────────────────
const WaitingBanner: React.FC = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A',
      paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#22C55E',
        alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="checkmark" size={14} color={WHITE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E' }}>You've confirmed</Text>
        <Text style={{ fontSize: 11, color: '#B45309' }}>Waiting for vendor to start the session</Text>
      </View>
      <Animated.View style={{ opacity: pulse }}>
        <Ionicons name="cut-outline" size={18} color="#F59E0B" />
      </Animated.View>
    </View>
  );
};

// ─── Start Session Modal ───────────────────────────────────────────────────────
const StartSessionModal = React.memo<{
  visible: boolean; vendorName: string;
  loading: boolean; onConfirm: () => void; onCancel: () => void;
}>(({ visible, vendorName, loading, onConfirm, onCancel }) => {
  const insets = useSafeAreaInsets();
  return (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
    <TouchableOpacity activeOpacity={1} onPress={onCancel}
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
      <TouchableOpacity activeOpacity={1} onPress={() => {}}>
        <View style={{ backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingHorizontal: 24, paddingTop: 28, paddingBottom: Math.max(insets.bottom, 24) + 16 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
            alignSelf: 'center', marginBottom: 24 }} />
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 68, height: 68, borderRadius: 34,
              backgroundColor: '#F0FFF4', borderWidth: 1.5, borderColor: '#86EFAC',
              alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play" size={28} color="#22C55E" />
            </View>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 10 }}>
            Start session?
          </Text>
          <Text style={{ fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 21, marginBottom: 20 }}>
            {'Confirm you\'re present and ready to begin with '}
            <Text style={{ fontWeight: '700', color: TEXT }}>{vendorName}</Text>.
          </Text>
          <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A',
            borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start',
            gap: 10, marginBottom: 24 }}>
            <Ionicons name="information-circle-outline" size={17} color="#F59E0B" style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 19, flex: 1 }}>
              The session only starts once your vendor also confirms on their end.
            </Text>
          </View>
          <TouchableOpacity onPress={onConfirm} disabled={loading} activeOpacity={0.85}
            style={{ backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            {loading
              ? <ActivityIndicator color={WHITE} />
              : <>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: WHITE }}>Yes, start session</Text>
                  <Ionicons name="chevron-forward" size={17} color={WHITE} />
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} activeOpacity={0.8}
            style={{ borderRadius: 14, borderWidth: 1.5, borderColor: '#22C55E',
              paddingVertical: 15, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#22C55E' }}>Not yet</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
  );
});

// ─── Mark Done Modal ──────────────────────────────────────────────────────────
const MarkDoneModal = React.memo<{
  visible: boolean; loading: boolean; onConfirm: () => void; onCancel: () => void;
}>(({ visible, loading, onConfirm, onCancel }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity activeOpacity={1} onPress={onCancel}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{ backgroundColor: WHITE, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingTop: 28,
            paddingBottom: Math.max(insets.bottom, 24) + 16 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
              alignSelf: 'center', marginBottom: 24 }} />
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7}
              style={{ position: 'absolute', top: 20, right: 20, padding: 4 }}>
              <Ionicons name="close" size={22} color={GRAY} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: PRIMARY,
                alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="checkmark-done" size={36} color={WHITE} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 8 }}>
                Mark as Done?
              </Text>
              <Text style={{ fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 21 }}>
                Confirm the service has been completed to release payment to the vendor.
              </Text>
            </View>
            <TouchableOpacity onPress={onConfirm} disabled={loading} activeOpacity={0.85}
              style={{ backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 16,
                alignItems: 'center', marginBottom: 10 }}>
              {loading
                ? <ActivityIndicator color={WHITE} />
                : <Text style={{ fontSize: 15, fontWeight: '700', color: WHITE }}>Yes, Done!</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.8}
              style={{ borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0',
                paddingVertical: 15, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: GRAY }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [bookings, setBookings]           = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter]   = useState<FilterTab>('all');
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [startModal, setStartModal]       = useState<{ visible: boolean; bookingId: string; vendorName: string }>({
    visible: false, bookingId: '', vendorName: '',
  });
  const [markDoneModal, setMarkDoneModal] = useState<{ visible: boolean; bookingId: string }>({
    visible: false, bookingId: '',
  });
  const [nextBooking, setNextBooking]     = useState<Booking | null>(null);
  const [countdown, setCountdown]         = useState({ days: 0, hrs: 0, min: 0 });
  const timerRef = useRef<any>(null);
  const cdTimerRef = useRef<any>(null);
  const [, forceUpdate] = useState(0);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getServiceName = (b: Booking) => {
    if (b.service?.name) return b.service.name;
    if (b.offer && typeof b.offer === 'object' && b.offer.title) return b.offer.title;
    return 'Custom Service Offer';
  };

  const getVendorName = (b: Booking) =>
    b.vendor?.vendorProfile?.businessName ||
    `${b.vendor?.firstName || ''} ${b.vendor?.lastName || ''}`.trim() || 'Vendor';

  const getCardImage = (b: Booking): string | undefined => {
    if (b.service?.images?.length) return b.service.images[0];
    if (b.offer && typeof b.offer === 'object' && b.offer.images?.length) return b.offer.images[0];
    return b.vendor?.avatar;
  };

  const getDuration = (b: Booking) =>
    b.service?.duration ? ` · ${b.service.duration >= 60
      ? `${b.service.duration / 60} hrs`
      : `${b.service.duration} min`}` : '';

  const getLocationLabel = (b: Booking) => {
    if (b.serviceType === 'home_service') {
      return `Home Service${b.location?.city ? ` · ${b.location.city}` : ''}`;
    }
    if (b.serviceType === 'in_shop') return 'In-salon';
    if (b.location?.city) return b.location.city;
    return null;
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchBookings = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await bookingAPI.getMyBookings({ role: 'client', page: pageNum, limit: 20 });
      if (res.success) {
        const newB: Booking[] = Array.isArray(res.data) ? res.data : (res.data.bookings || []);
        setBookings(prev => {
          if (!append) return newB;
          const ids = new Set(prev.map(b => b._id));
          return [...prev, ...newB.filter(b => !ids.has(b._id))];
        });
        setHasMore(res.meta?.pagination?.hasNextPage ?? newB.length === 20);
        setPage(pageNum);
      }
    } catch (err) {
      toast.error('Error', handleAPIError(err).message || 'Failed to load bookings');
    } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => {
    fetchBookings(1, false);

    // Session went live (both confirmed)
    socketService.onSessionStarted(({ bookingId }) => {
      toast.success('Session Started!', 'Both parties confirmed — service is now in progress');
      fetchBookings(1, false);
    });
    socketService.onBookingStatusUpdated(({ status }) => {
      if (status === 'in_progress') fetchBookings(1, false);
    });

    const socket = socketService.getSocket();

    // Vendor confirmed start — client needs to do the same
    const handleStartWaiting = (data: any) => {
      toast.info('Vendor is Ready!', data.message || 'Your vendor confirmed. Tap Start Session to begin.');
      fetchBookings(1, false);
    };
    socket?.on('booking:start:waiting', handleStartWaiting);

    // Vendor marked done — client needs to also confirm
    const handleCompletionWaiting = (data: any) => {
      if (data.completedBy === 'vendor') {
        toast.info('Vendor Marked Done!', data.message || 'Please confirm the service is complete.');
        fetchBookings(1, false);
      }
    };
    socket?.on('booking:completion:waiting', handleCompletionWaiting);

    // Both confirmed — booking fully complete
    const handleCompleted = (data: any) => {
      toast.success('Booking Complete!', data.message || 'Your service has been completed successfully.');
      fetchBookings(1, false);
    };
    socket?.on('booking:completed', handleCompleted);

    return () => {
      socketService.removeListener('booking:session:started');
      socketService.removeListener('booking:updated');
      socketService.removeListener('booking:status:updated');
      socketService.removeListener('session:started');
      socket?.off('booking:start:waiting', handleStartWaiting);
      socket?.off('booking:completion:waiting', handleCompletionWaiting);
      socket?.off('booking:completed', handleCompleted);
    };
  }, []));

  // ── Live timer tick ────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Next booking countdown ─────────────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    const next = bookings
      .filter(b => b.status.toLowerCase() === 'accepted')
      .filter(b => new Date(b.scheduledDate) > now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0] ?? null;
    setNextBooking(next);
    if (cdTimerRef.current) clearInterval(cdTimerRef.current);
    if (next) {
      const tick = () => setCountdown(computeCountdown(next.scheduledDate, next.scheduledTime) ?? { days: 0, hrs: 0, min: 0 });
      tick();
      cdTimerRef.current = setInterval(tick, 60000);
    }
    return () => { if (cdTimerRef.current) clearInterval(cdTimerRef.current); };
  }, [bookings]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const getFiltered = () => {
    if (activeFilter === 'all') return bookings;
    if (activeFilter === 'upcoming') return bookings.filter(b => b.status.toLowerCase() === 'accepted');
    if (activeFilter === 'disputed') return bookings.filter(b => b.hasDispute);
    return bookings.filter(b => b.status.toLowerCase() === activeFilter);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(1, false).finally(() => setRefreshing(false));
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleStartSession = (b: Booking) =>
    setStartModal({ visible: true, bookingId: b._id, vendorName: getVendorName(b) });

  const confirmStartSession = async () => {
    const id = startModal.bookingId;
    try {
      setActionLoading(id);
      const r = await bookingAPI.startBooking(id);
      if (r.success) {
        setStartModal({ visible: false, bookingId: '', vendorName: '' });
        toast.success(
          r.data?.waiting ? 'Confirmed!' : 'Session started!',
          r.data?.waiting ? 'Waiting for vendor to confirm' : 'Service is now in progress',
        );
        fetchBookings(1);
      }
    } catch (e) {
      toast.error('Error', handleAPIError(e).message || 'Failed to start session');
    } finally { setActionLoading(null); }
  };

  const handleMarkComplete = (id: string) => {
    setMarkDoneModal({ visible: true, bookingId: id });
  };

  const confirmMarkDone = async () => {
    const id = markDoneModal.bookingId;
    try {
      setActionLoading(id);
      const r = await bookingAPI.markComplete(id);
      if (r.success) {
        setMarkDoneModal({ visible: false, bookingId: '' });
        toast.success('Done!', 'Marked as complete');
        fetchBookings(1);
      }
    } catch (e) {
      toast.error('Error', handleAPIError(e).message || 'Failed to mark complete');
    } finally { setActionLoading(null); }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const getCount = (f: FilterTab) => {
    if (f === 'all') return bookings.length;
    if (f === 'upcoming') return bookings.filter(b => b.status === 'accepted').length;
    if (f === 'disputed') return bookings.filter(b => b.hasDispute).length;
    return bookings.filter(b => b.status.toLowerCase() === f).length;
  };

  // ── Card renderer ──────────────────────────────────────────────────────────
  const renderCard = (b: Booking) => {
    const status    = b.status.toLowerCase();
    const isBusy    = actionLoading === b._id;
    const cardImage = getCardImage(b);
    const vendor    = getVendorName(b);
    const service   = getServiceName(b);
    const duration  = getDuration(b);
    const location  = getLocationLabel(b);
    const cd        = status === 'accepted' ? computeCountdown(b.scheduledDate, b.scheduledTime) : null;
    const minsLeft  = status === 'pending' ? getMinutesUntil(b.paymentExpiresAt) : null;

    // Status badge
    const BADGE: Record<string, { bg: string; text: string; label: string }> = {
      pending:     { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
      accepted:    { bg: '#DCFCE7', text: '#166534', label: 'Upcoming' },
      in_progress: { bg: '#EDE9FE', text: '#5B21B6', label: 'In Progress' },
      completed:   { bg: '#DCFCE7', text: '#166534', label: 'Completed' },
      cancelled:   { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
      disputed:    { bg: '#FED7AA', text: '#9A3412', label: 'Disputed' },
    };
    const badge = b.hasDispute
      ? BADGE.disputed
      : (BADGE[status] || { bg: '#F3F4F6', text: GRAY, label: status });

    return (
      <TouchableOpacity key={b._id} activeOpacity={0.92}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: b._id })}
        style={{ backgroundColor: WHITE, borderRadius: 18, marginBottom: 14,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>

        {/* ── Top: image + name + badge ── */}
        <View style={{ flexDirection: 'row', gap: 12, padding: 14, paddingBottom: 10 }}>
          {/* Service image */}
          <View style={{ width: 80, height: 80, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F3F4F6' }}>
            {cardImage
              ? <Image source={{ uri: cardImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <LinearGradient colors={[PRIMARY, '#FF6BA8']}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="sparkles" size={28} color={WHITE} />
                </LinearGradient>
            }
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            {/* Name + checkmark + badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT, flex: 1 }} numberOfLines={1}>
                {vendor}
              </Text>
              <Ionicons name="checkmark-circle" size={15} color={PRIMARY} style={{ marginRight: 6 }} />
              <View style={{ backgroundColor: badge.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: badge.text }}>{badge.label}</Text>
              </View>
            </View>

            {/* Service · duration */}
            <Text style={{ fontSize: 13, color: GRAY, fontWeight: '500', marginBottom: 6 }} numberOfLines={1}>
              {service}{duration}
            </Text>
          </View>
        </View>

        {/* ── Detail rows ── */}
        <View style={{ paddingHorizontal: 14, gap: 6, marginBottom: 10 }}>
          {location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="location-outline" size={14} color={PRIMARY} />
              <Text style={{ fontSize: 13, color: GRAY, fontWeight: '500' }}>{location}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="calendar-outline" size={14} color={PRIMARY} />
            <Text style={{ fontSize: 13, color: GRAY, fontWeight: '500' }}>
              {formatShortDate(b.scheduledDate)}{b.scheduledTime ? ` · ${format12Hour(b.scheduledTime)}` : ''}
            </Text>
          </View>

          {/* Timer rows based on status */}
          {status === 'pending' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Ionicons name="hourglass-outline" size={13} color="#D97706" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>
                {minsLeft != null
                  ? `Vendor has ${minsLeft} min to accept`
                  : 'Awaiting vendor acceptance'}
              </Text>
            </View>
          )}

          {status === 'accepted' && cd && (cd.days > 0 || cd.hrs > 0 || cd.min > 0) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Ionicons name="time-outline" size={13} color={PRIMARY} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: PRIMARY }}>
                Starts in {cd.days > 0 ? `${cd.days}d ` : ''}{cd.hrs > 0 ? `${cd.hrs}h ` : ''}{cd.min}m
              </Text>
            </View>
          )}

          {/* In-progress: escrow notice */}
          {status === 'in_progress' && (
            <View style={{ backgroundColor: '#FDE8EF', borderRadius: 10, padding: 12,
              flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 2 }}>
              <Ionicons name="shield-checkmark-outline" size={15} color={PRIMARY} style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 12, color: PRIMARY, lineHeight: 18, flex: 1, fontWeight: '500' }}>
                Your pay of {formatPrice(b.totalAmount)} is secured in escrow until both parties confirm completion.
              </Text>
            </View>
          )}

        </View>

        {/* ── Waiting banner ── */}
        <View style={{ paddingHorizontal: 14 }}>
          {status === 'accepted' && b.clientStartConfirmed && <WaitingBanner />}
        </View>

        {/* ── Bottom: price + actions ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 14, paddingBottom: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: TEXT, flex: 1 }}>
            {formatPrice(b.totalAmount)}
          </Text>

          {/* Dispute takes full priority */}
          {b.hasDispute && (
            <TouchableOpacity
              onPress={() => b.disputeId
                ? navigation.navigate('DisputeDetail', { disputeId: b.disputeId })
                : navigation.navigate('BookingDetail', { bookingId: b._id })
              }
              activeOpacity={0.85}
              style={{ backgroundColor: '#EA580C', borderRadius: 22,
                paddingHorizontal: 16, paddingVertical: 10,
                flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="alert-circle-outline" size={15} color={WHITE} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>View Dispute</Text>
            </TouchableOpacity>
          )}

          {/* Pending → Cancel (opens detail where they can cancel) */}
          {!b.hasDispute && status === 'pending' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('BookingDetail', { bookingId: b._id })}
              activeOpacity={0.8}
              style={{ borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 22,
                paddingHorizontal: 18, paddingVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>Cancel</Text>
            </TouchableOpacity>
          )}

          {/* Accepted (not started) → Start Session */}
          {!b.hasDispute && status === 'accepted' && !b.clientStartConfirmed && (
            <TouchableOpacity
              onPress={() => handleStartSession(b)}
              disabled={isBusy}
              activeOpacity={0.85}
              style={{ backgroundColor: '#22C55E', borderRadius: 22,
                paddingHorizontal: 18, paddingVertical: 10,
                flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {isBusy
                ? <ActivityIndicator size="small" color={WHITE} />
                : <>
                    <Ionicons name="play-circle-outline" size={15} color={WHITE} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>Start</Text>
                  </>
              }
            </TouchableOpacity>
          )}

          {/* In progress → Dispute + Mark as Done */}
          {!b.hasDispute && status === 'in_progress' && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('BookingDetail', { bookingId: b._id })}
                activeOpacity={0.8}
                style={{ borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 22,
                  paddingHorizontal: 18, paddingVertical: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>Dispute</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => !b.clientMarkedComplete && handleMarkComplete(b._id)}
                disabled={isBusy || b.clientMarkedComplete}
                activeOpacity={0.85}
                style={{ backgroundColor: b.clientMarkedComplete ? '#9CA3AF' : PRIMARY,
                  borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
                  flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {isBusy
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <>
                      <Ionicons name={b.clientMarkedComplete ? 'checkmark-circle' : 'checkmark-circle-outline'} size={15} color={WHITE} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>
                        {b.clientMarkedComplete ? 'Marked Done' : 'Mark as Done'}
                      </Text>
                    </>
                }
              </TouchableOpacity>
            </>
          )}

          {/* Completed → Leave Review */}
          {!b.hasDispute && status === 'completed' && (
            <>
              {!b.hasReview && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('CreateReview', {
                    bookingId: b._id,
                    vendorName: getVendorName(b),
                    serviceName: getServiceName(b),
                  })}
                  activeOpacity={0.85}
                  style={{ backgroundColor: PRIMARY, borderRadius: 22,
                    paddingHorizontal: 16, paddingVertical: 10,
                    flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="create-outline" size={15} color={WHITE} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>Review</Text>
                </TouchableOpacity>
              )}
              {b.hasReview && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
                  backgroundColor: '#F0FDF4', borderRadius: 22,
                  paddingHorizontal: 14, paddingVertical: 10,
                  borderWidth: 1.5, borderColor: '#86EFAC' }}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#16A34A' }}>Reviewed</Text>
                </View>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Group by status ────────────────────────────────────────────────────────
  const renderGrouped = (list: Booking[]) => {
    const order = ['pending', 'in_progress', 'accepted', 'disputed', 'completed', 'cancelled'];
    const groups: Record<string, Booking[]> = {};
    list.forEach(b => {
      const s = b.status.toLowerCase();
      if (!groups[s]) groups[s] = [];
      groups[s].push(b);
    });
    // Sort each group by scheduledDate ascending (nearest appointment first)
    Object.keys(groups).forEach(s => {
      groups[s].sort((a, b) =>
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );
    });

    const DOT_COLOR: Record<string, string> = {
      pending: '#F59E0B', accepted: '#22C55E',
      in_progress: '#8B5CF6', completed: '#10B981', cancelled: '#EF4444', disputed: '#EA580C',
    };

    return order
      .filter(s => groups[s]?.length)
      .map(s => (
        <View key={s}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT_COLOR[s] || GRAY }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: GRAY }}>
              {SECTION_LABELS[s] || s}
            </Text>
          </View>
          {groups[s].map(b => renderCard(b))}
        </View>
      ));
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && page === 1) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={{ color: MUTED, fontSize: 14, marginTop: 12, fontWeight: '500' }}>
            Loading bookings…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const filtered = getFiltered();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: TEXT, letterSpacing: -0.6 }}>My Bookings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AllVendors')} activeOpacity={0.85}
            style={{ backgroundColor: PRIMARY, borderRadius: 22,
              paddingHorizontal: 16, paddingVertical: 9,
              flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="add" size={16} color={WHITE} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>Book</Text>
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {([
            { key: 'all',         label: 'All' },
            { key: 'pending',     label: 'Pending' },
            { key: 'upcoming',    label: 'Upcoming' },
            { key: 'in_progress', label: 'In-progress' },
            { key: 'disputed',    label: 'Disputed' },
            { key: 'completed',   label: 'Completed' },
            { key: 'cancelled',   label: 'Cancelled' },
          ] as { key: FilterTab; label: string }[]).map(f => {
            const isActive = activeFilter === f.key;
            const count = getCount(f.key);
            return (
              <TouchableOpacity key={f.key} onPress={() => setActiveFilter(f.key)} activeOpacity={0.75}
                style={{ paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22,
                  backgroundColor: isActive ? PRIMARY : WHITE,
                  borderWidth: isActive ? 0 : 1.5, borderColor: '#E0E0E0',
                  shadowColor: isActive ? PRIMARY : '#000',
                  shadowOffset: { width: 0, height: isActive ? 3 : 1 },
                  shadowOpacity: isActive ? 0.25 : 0.04, shadowRadius: isActive ? 6 : 3,
                  elevation: isActive ? 4 : 1,
                }}>
                <Text style={{ fontSize: 13, fontWeight: '700',
                  color: isActive ? WHITE : GRAY }}>
                  {f.label}{count > 0 && !isActive ? ` (${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          tintColor={PRIMARY} colors={[PRIMARY]} />}
        onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20 && !loading && hasMore)
            fetchBookings(page + 1, true);
        }}
        scrollEventThrottle={400}
      >
        {/* ── Next appointment countdown banner ── */}
        {nextBooking && (
          <TouchableOpacity
            onPress={() => navigation.navigate('BookingDetail', { bookingId: nextBooking._id })}
            activeOpacity={0.9}
            style={{ marginBottom: 18, borderRadius: 20, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={['#6D0B3C', '#C01070']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', fontWeight: '500',
                  marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Next Appointment In
                </Text>
                <Text style={{ fontSize: 17, color: WHITE, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 }}>
                  {getVendorName(nextBooking)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                    {formatShortDate(nextBooking.scheduledDate)}
                    {nextBooking.scheduledTime ? ` · ${format12Hour(nextBooking.scheduledTime)}` : ''}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[
                  { val: countdown.days, label: 'days' },
                  { val: countdown.hrs,  label: 'hrs' },
                  { val: countdown.min,  label: 'min' },
                ].map((item, i) => (
                  <View key={i} style={{ backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 10,
                    paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center', minWidth: 44 }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: WHITE, letterSpacing: -0.5 }}>
                      {String(item.val).padStart(2, '0')}
                    </Text>
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 1 }}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {filtered.length > 0
          ? renderGrouped(filtered)
          : (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <View style={{ width: 88, height: 88, borderRadius: 24, overflow: 'hidden', marginBottom: 18 }}>
                <LinearGradient colors={[PRIMARY, '#FF6BA8']}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="calendar-outline" size={40} color={WHITE} />
                </LinearGradient>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 8 }}>
                {activeFilter !== 'all' ? 'No bookings here' : 'No bookings yet'}
              </Text>
              <Text style={{ fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 21,
                paddingHorizontal: 36, marginBottom: 24 }}>
                {activeFilter !== 'all'
                  ? 'Nothing in this category right now.'
                  : 'Explore vendors and book your first service!'}
              </Text>
              <TouchableOpacity
                onPress={() => activeFilter !== 'all' ? setActiveFilter('all') : navigation.navigate('AllVendors')}
                activeOpacity={0.85}
                style={{ backgroundColor: PRIMARY, borderRadius: 22, paddingHorizontal: 28, paddingVertical: 13 }}>
                <Text style={{ color: WHITE, fontSize: 15, fontWeight: '700' }}>
                  {activeFilter !== 'all' ? 'View All' : 'Explore Services'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }

        {loading && page > 1 && (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={PRIMARY} />
          </View>
        )}
      </ScrollView>

      <StartSessionModal
        visible={startModal.visible}
        vendorName={startModal.vendorName}
        loading={actionLoading === startModal.bookingId}
        onConfirm={confirmStartSession}
        onCancel={() => setStartModal({ visible: false, bookingId: '', vendorName: '' })}
      />
      <MarkDoneModal
        visible={markDoneModal.visible}
        loading={actionLoading === markDoneModal.bookingId}
        onConfirm={confirmMarkDone}
        onCancel={() => setMarkDoneModal({ visible: false, bookingId: '' })}
      />
    </SafeAreaView>
  );
};

export default BookingsScreen;
