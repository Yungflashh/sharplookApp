import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, Platform, Modal, KeyboardAvoidingView,
  Keyboard, StatusBar, Image, TextInput, Animated, StyleSheet,
} from 'react-native';
import socketService from '@/services/socket.service';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';
import ConfirmationModal from '@/components/ConfirmationModal';
import KycGateModal from '@/components/KycGateModal';
import { toast } from '@/components/ui/Toast';

// ─── Tokens ────────────────────────────────────────────────────────────────
const BG        = '#FCE4EC';
const WHITE     = '#FFFFFF';
const PRIMARY   = '#E04079';
const TEXT      = '#1A1A2E';
const GRAY      = '#6B7280';
const MUTED     = '#9CA3AF';
const RED       = '#EF4444';
const RED_BG    = '#FEE2E2';
const BORDER    = '#E5E7EB';

// ─── Types ──────────────────────────────────────────────────────────────────
type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type FilterTab = 'all' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

interface VendorBooking {
  _id: string;
  bookingNumber?: string;
  bookingType: 'standard' | 'offer_based';
  service?: {
    _id: string;
    name: string;
    images?: string[];
    duration?: number;
  };
  serviceType?: 'home_service' | 'in_shop';
  offer?: string;
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    profileImage?: string;
    avatar?: string;
  };
  vendor?: {
    _id: string;
    firstName: string;
    lastName: string;
    vendorProfile?: { businessName: string };
  };
  scheduledDate: string;
  scheduledTime?: string;
  totalAmount: number;
  servicePrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  location?: { address: string; city: string; state: string };
  vendorNotes?: string;
  clientNotes?: string;
  vendorStartConfirmed?: boolean;
  clientStartConfirmed?: boolean;
  vendorMarkedComplete?: boolean;
  sessionStartedAt?: string;
  hasDispute?: boolean;
  disputeId?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const format12Hour = (time?: string): string => {
  if (!time) return '';
  if (/AM|PM/i.test(time)) return time;          // already 12-hr
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  let h = parseInt(m[1]);
  const min = m[2];
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${period}`;
};

const formatDuration = (minutes?: number): string => {
  if (!minutes) return '';
  if (minutes >= 60) {
    const h = minutes / 60;
    return ` · ${h % 1 === 0 ? h : h.toFixed(1)} hrs`;
  }
  return ` · ${minutes} min`;
};

const formatCardDate = (scheduledDate: string): string => {
  const d = new Date(scheduledDate);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const parseTarget = (scheduledDate: string, scheduledTime?: string): Date => {
  const d = new Date(scheduledDate);
  if (scheduledTime) {
    const m = scheduledTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (m) {
      let h = parseInt(m[1]);
      const min = parseInt(m[2]);
      const p = m[3]?.toUpperCase();
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
      d.setHours(h, min, 0, 0);
    }
  }
  return d;
};

const computeCountdown = (scheduledDate: string, scheduledTime?: string) => {
  const diff = parseTarget(scheduledDate, scheduledTime).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hrs: 0, min: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hrs:  Math.floor((diff % 86400000) / 3600000),
    min:  Math.floor((diff % 3600000) / 60000),
  };
};

// ─── Status configs ──────────────────────────────────────────────────────────
const STATUS_STRIP: Record<string, {
  bg: string; border: string; textColor: string;
  icon: keyof typeof Ionicons.glyphMap; label: string;
}> = {
  pending:     { bg: '#FFFBEB', border: '#FDE68A', textColor: '#92400E', icon: 'time-outline',               label: 'Pending · Awaiting your response' },
  accepted:    { bg: '#F0FDF4', border: '#BBF7D0', textColor: '#166534', icon: 'checkmark-circle',           label: 'Confirmed · Session starts soon' },
  in_progress: { bg: '#FAF5FF', border: '#DDD6FE', textColor: '#5B21B6', icon: 'hourglass-outline',          label: 'In Progress · Service ongoing' },
  completed:   { bg: '#F0FDF4', border: '#BBF7D0', textColor: '#166534', icon: 'checkmark-done-circle',      label: 'Completed · Service done' },
  cancelled:   { bg: '#FFF1F2', border: '#FECDD3', textColor: '#991B1B', icon: 'close-circle',               label: 'Cancelled' },
  disputed:    { bg: '#FFF7ED', border: '#FED7AA', textColor: '#C2410C', icon: 'alert-circle',               label: 'Disputed · Under review' },
};
const getStrip = (s: string) => STATUS_STRIP[s.toLowerCase()] ?? {
  bg: '#F9FAFB', border: BORDER, textColor: GRAY, icon: 'help-circle-outline' as any, label: s,
};

const BADGE_CFG: Record<string, { bg: string; text: string }> = {
  pending:     { bg: '#FEF3C7', text: '#92400E' },
  accepted:    { bg: '#D1FAE5', text: '#065F46' },
  in_progress: { bg: '#EDE9FE', text: '#5B21B6' },
  completed:   { bg: '#D1FAE5', text: '#065F46' },
  cancelled:   { bg: '#FEE2E2', text: '#991B1B' },
  disputed:    { bg: '#FED7AA', text: '#9A3412' },
};
const getBadge = (s: string) => BADGE_CFG[s.toLowerCase()] ?? { bg: '#F3F4F6', text: GRAY };

const BADGE_LABEL: Record<string, string> = {
  pending: 'Pending', accepted: 'Upcoming',
  in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', disputed: 'Disputed',
};
const getBadgeLabel = (s: string) => BADGE_LABEL[s.toLowerCase()] ?? s;

// ─── Rejection Modal ─────────────────────────────────────────────────────────
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
            style={{ width: '100%', backgroundColor: WHITE, borderRadius: 24, padding: 24,
              shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24,
              shadowOffset: { width: 0, height: 10 }, elevation: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: RED_BG, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="close-circle" size={22} color={RED} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Reject Booking</Text>
            </View>
            <Text style={{ fontSize: 13, color: GRAY, marginBottom: 12, lineHeight: 19 }}>
              Please provide a reason for rejection (10–500 characters):
            </Text>
            <TextInput
              style={{ backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, fontSize: 14, color: TEXT, minHeight: 110, textAlignVertical: 'top', borderWidth: 1.5, borderColor: BORDER, marginBottom: 8 }}
              placeholder="Enter rejection reason…"
              placeholderTextColor={MUTED}
              value={rejectionReason} onChangeText={onChangeReason}
              multiline numberOfLines={4} autoFocus maxLength={520}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: n < 10 ? RED : n > 500 ? RED : '#10B981' }}>
                {n < 10 ? `${10 - n} more chars needed` : n > 500 ? `${n - 500} over limit` : '✓ Valid'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: n > 500 ? RED : MUTED }}>{n}/500</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={onCancel} activeOpacity={0.8}
                style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: GRAY }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSubmit} disabled={!valid} activeOpacity={0.85}
                style={{ flex: 1, borderRadius: 14, overflow: 'hidden', opacity: valid ? 1 : 0.45 }}>
                <LinearGradient colors={[RED, '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: WHITE, fontSize: 14, fontWeight: '700' }}>Reject</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ─── Waiting Banner ───────────────────────────────────────────────────────────
const WaitingBanner: React.FC = () => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{
      marginTop: 14, backgroundColor: WHITE,
      borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: BORDER,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    }}>
      {/* Step indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
        {/* Vendor step — done */}
        <View style={{ alignItems: 'center', width: 52 }}>
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: '#22C55E',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="checkmark" size={18} color={WHITE} />
          </View>
          <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '700', marginTop: 5, textAlign: 'center' }}>
            You
          </Text>
        </View>

        {/* Connector line */}
        <View style={{ flex: 1, marginTop: 17 }}>
          <View style={{ height: 2, backgroundColor: '#E5E7EB', borderRadius: 1 }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: -4, alignItems: 'center' }}>
            <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 9, color: MUTED, fontWeight: '600', letterSpacing: 0.3 }}>WAITING</Text>
            </View>
          </View>
        </View>

        {/* Client step — pending */}
        <View style={{ alignItems: 'center', width: 52 }}>
          <Animated.View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: '#FEF3C7',
            borderWidth: 2, borderColor: '#F59E0B',
            alignItems: 'center', justifyContent: 'center',
            opacity: pulse,
          }}>
            <Ionicons name="person-outline" size={16} color="#F59E0B" />
          </Animated.View>
          <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '700', marginTop: 5, textAlign: 'center' }}>
            Client
          </Text>
        </View>
      </View>

      {/* Label */}
      <Text style={{ fontSize: 12, color: GRAY, textAlign: 'center', lineHeight: 17 }}>
        Your confirmation is received.{'\n'}
        <Text style={{ fontWeight: '700', color: TEXT }}>Waiting for client to tap "Start Session"</Text>
      </Text>
    </View>
  );
};

// ─── Start Session Modal ─────────────────────────────────────────────────────
const StartSessionModal = React.memo<{
  visible: boolean;
  clientName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>(({ visible, clientName, loading, onConfirm, onCancel }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
    <TouchableOpacity
      activeOpacity={1}
      onPress={onCancel}
      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
    >
      <TouchableOpacity activeOpacity={1} onPress={() => {}}>
        <View style={{
          backgroundColor: WHITE,
          borderTopLeftRadius: 30, borderTopRightRadius: 30,
          paddingHorizontal: 28, paddingTop: 32, paddingBottom: 42,
        }}>
          {/* Play icon */}
          <View style={{ alignItems: 'center', marginBottom: 22 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: '#F0FFF4',
              borderWidth: 1.5, borderColor: '#86EFAC',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="play" size={30} color="#22C55E" />
            </View>
          </View>

          {/* Title */}
          <Text style={{ fontSize: 22, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 12 }}>
            Start session?
          </Text>

          {/* Body */}
          <Text style={{ fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 22, marginBottom: 22 }}>
            {'Confirm that your client '}
            <Text style={{ fontWeight: '800', color: TEXT }}>{clientName}</Text>
            {' is present and you\'re both ready to begin the session.'}
          </Text>

          {/* Warning box */}
          <View style={{
            backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FCD34D',
            borderRadius: 14, padding: 14,
            flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 28,
          }}>
            <Ionicons name="information-circle-outline" size={18} color="#F59E0B" style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 13, color: '#92400E', lineHeight: 20, flex: 1 }}>
              {'The session only begins officially once your client also taps "Start Session" on their end.'}
            </Text>
          </View>

          {/* Yes, start session */}
          <TouchableOpacity onPress={onConfirm} disabled={loading} activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading
                ? <ActivityIndicator color={WHITE} />
                : <>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: WHITE }}>Yes, start session</Text>
                    <Ionicons name="chevron-forward" size={18} color={WHITE} />
                  </>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Not yet */}
          <TouchableOpacity onPress={onCancel} activeOpacity={0.8}
            style={{
              borderRadius: 16, borderWidth: 1.5, borderColor: '#22C55E',
              paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#22C55E' }}>Not yet</Text>
            <Ionicons name="chevron-forward" size={18} color="#22C55E" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
));

// ─── Compute session end time ─────────────────────────────────────────────────
const computeEndTime = (startedAt: string, durationMins?: number): string => {
  if (!durationMins || !startedAt) return '';
  const end = new Date(new Date(startedAt).getTime() + durationMins * 60000);
  return format12Hour(`${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`);
};

// ─── Mark Done Modal ──────────────────────────────────────────────────────────
const MarkDoneModal = React.memo<{
  visible: boolean; loading: boolean; onConfirm: () => void; onCancel: () => void;
}>(({ visible, loading, onConfirm, onCancel }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
      <View style={{ width: '100%', backgroundColor: WHITE, borderRadius: 24, padding: 28, alignItems: 'center' }}>
        {/* X close */}
        <TouchableOpacity onPress={onCancel} activeOpacity={0.7}
          style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16,
            backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FDE8EF',
          alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 8 }}>
          <Ionicons name="checkmark-done" size={34} color={PRIMARY} />
        </View>

        <Text style={{ fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 10, textAlign: 'center' }}>
          Mark as Done?
        </Text>
        <Text style={{ fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>
          Confirm that this service has been completed. Payment will be released once both parties mark as done.
        </Text>

        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <TouchableOpacity onPress={onCancel} activeOpacity={0.8}
            style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
              paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: GRAY }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} disabled={loading} activeOpacity={0.85}
            style={{ flex: 1, borderRadius: 14, backgroundColor: PRIMARY,
              paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}>
            {loading
              ? <ActivityIndicator color={WHITE} />
              : <Text style={{ fontSize: 15, fontWeight: '700', color: WHITE }}>Yes, Done!</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));

// ─── Main Screen ─────────────────────────────────────────────────────────────
const VendorBookingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [bookings, setBookings]           = useState<VendorBooking[]>([]);
  const [filteredBookings, setFiltered]   = useState<VendorBooking[]>([]);
  const [activeFilter, setActiveFilter]   = useState<FilterTab>('all');
  const [page, setPage]                   = useState(1);
  const [hasMore, setHasMore]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingBookingId, setRejectingId]        = useState<string | null>(null);
  const [rejectionReason, setRejectionReason]       = useState('');
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', confirmLabel: 'Confirm', onConfirm: () => {} });
  const [currentUser, setCurrentUser]   = useState<any>(null);
  const [kycModalVisible, setKycModal]  = useState(false);
  const [startSessionModal, setStartSessionModal] = useState<{ visible: boolean; bookingId: string; clientName: string }>({ visible: false, bookingId: '', clientName: '' });
  const [markDoneModal, setMarkDoneModal] = useState<{ visible: boolean; bookingId: string }>({ visible: false, bookingId: '' });
  const [nextBooking, setNextBooking]   = useState<VendorBooking | null>(null);
  const [countdown, setCountdown]       = useState({ days: 0, hrs: 0, min: 0 });
  const timerRef = useRef<any>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchBookings = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await bookingAPI.getMyBookings({ role: 'vendor', page: pageNum, limit: 20 });
      if (res.success) {
        const newB = Array.isArray(res.data) ? res.data : (res.data.bookings || []);
        const updated = append ? [...bookings, ...newB] : newB;
        setBookings(updated);
        setHasMore(res.meta?.pagination?.hasNextPage ?? newB.length === 20);
        setPage(pageNum);
      }
    } catch (err) {
      toast.error('Error', handleAPIError(err).message || 'Failed to load bookings');
    } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => {
    fetchBookings(1, false);
    getStoredUser().then(u => setCurrentUser(u));

    // Session went live (both confirmed)
    socketService.onSessionStarted(({ bookingId }) => {
      toast.success('Session Started!', 'Both parties confirmed — service is now in progress');
      fetchBookings(1, false);
    });
    socketService.onBookingStatusUpdated(({ status }) => {
      if (status === 'in_progress') fetchBookings(1, false);
    });

    const socket = socketService.getSocket();

    // Client confirmed start — vendor needs to do the same
    const handleStartWaiting = (data: any) => {
      toast.info('Client is Ready!', data.message || 'Your client confirmed. Tap Start Session to begin.');
      fetchBookings(1, false);
    };
    socket?.on('booking:start:waiting', handleStartWaiting);

    // Client marked done — vendor needs to also confirm
    const handleCompletionWaiting = (data: any) => {
      if (data.completedBy === 'client') {
        toast.info('Client Marked Done!', data.message || 'Tap "Mark as Done" to receive your payment.');
        fetchBookings(1, false);
      }
    };
    socket?.on('booking:completion:waiting', handleCompletionWaiting);

    // Both confirmed — payment released to vendor
    const handleCompleted = (data: any) => {
      toast.success(
        '💰 Payment Received!',
        data.message || `₦${data.amount?.toLocaleString()} has been added to your wallet!`,
      );
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

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    const next = bookings
      .filter(b => ['pending', 'accepted'].includes(b.status.toLowerCase()))
      .filter(b => new Date(b.scheduledDate) > now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0] ?? null;
    setNextBooking(next);
    if (timerRef.current) clearInterval(timerRef.current);
    if (next) {
      const tick = () => setCountdown(computeCountdown(next.scheduledDate, next.scheduledTime));
      tick();
      timerRef.current = setInterval(tick, 60000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [bookings]);

  // ── Filter ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeFilter === 'all') { setFiltered(bookings); return; }
    if (activeFilter === 'disputed') { setFiltered(bookings.filter(b => b.hasDispute)); return; }
    setFiltered(bookings.filter(b => b.status.toLowerCase() === activeFilter));
  }, [bookings, activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(1, false).finally(() => setRefreshing(false));
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────
  const showConfirm = (title: string, message: string, onConfirm: () => void, label = 'Confirm') =>
    setConfirmModal({ visible: true, title, message, confirmLabel: label, onConfirm });

  const handleAccept = (id: string) => {
    if (currentUser?.vendorProfile?.kycStatus !== 'approved') { setKycModal(true); return; }
    showConfirm('Accept Booking', 'Accept this booking request?', async () => {
      setConfirmModal(p => ({ ...p, visible: false }));
      try {
        setActionLoading(id);
        const r = await bookingAPI.acceptBooking(id);
        if (r.success) { toast.success('Success', 'Booking accepted'); fetchBookings(1); }
      } catch (e) { toast.error('Error', handleAPIError(e).message); }
      finally { setActionLoading(null); }
    }, 'Accept');
  };

  const handleStartSession = (booking: VendorBooking) => {
    const clientName = `${booking.client?.firstName || ''} ${booking.client?.lastName || ''}`.trim() || 'Client';
    setStartSessionModal({ visible: true, bookingId: booking._id, clientName });
  };

  const confirmStartSession = async () => {
    const id = startSessionModal.bookingId;
    try {
      setActionLoading(id);
      const r = await bookingAPI.startBooking(id);
      if (r.success) {
        setStartSessionModal({ visible: false, bookingId: '', clientName: '' });
        if (r.data?.waiting) {
          toast.success('Confirmed!', 'Waiting for client to also confirm start');
        } else {
          toast.success('Session started!', 'The service is now in progress');
        }
        fetchBookings(1);
      }
    } catch (e) { toast.error('Error', handleAPIError(e).message); }
    finally { setActionLoading(null); }
  };

  const handleComplete = (id: string) =>
    setMarkDoneModal({ visible: true, bookingId: id });

  const confirmMarkDone = async () => {
    const id = markDoneModal.bookingId;
    try {
      setActionLoading(id);
      const r = await bookingAPI.markComplete(id);
      if (r.success) {
        setMarkDoneModal({ visible: false, bookingId: '' });
        toast.success('Done!', 'Service marked as completed');
        fetchBookings(1);
      }
    } catch (e) { toast.error('Error', handleAPIError(e).message); }
    finally { setActionLoading(null); }
  };

  const handleReject = (id: string) => { setRejectingId(id); setRejectionReason(''); setRejectModalVisible(true); };

  const submitRejection = async () => {
    const t = rejectionReason.trim();
    if (t.length < 10) { toast.warning('Too Short', 'Need at least 10 characters.'); return; }
    if (t.length > 500) { toast.warning('Too Long', 'Must not exceed 500 characters.'); return; }
    try {
      setActionLoading(rejectingBookingId!);
      setRejectModalVisible(false);
      const r = await bookingAPI.rejectBooking(rejectingBookingId!, t);
      if (r.success) { toast.success('Rejected', 'Booking rejected'); fetchBookings(1); }
    } catch (err) {
      toast.error('Error', handleAPIError(err).message || 'Failed to reject');
      setRejectModalVisible(true);
    } finally { setActionLoading(null); }
  };

  const handleCloseModal   = useCallback(() => { Keyboard.dismiss(); setRejectModalVisible(false); setRejectionReason(''); }, []);
  const handleChangeReason = useCallback((t: string) => setRejectionReason(t), []);

  // ── Filter config ────────────────────────────────────────────────────────
  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all',         label: 'All' },
    { key: 'pending',     label: 'Pending' },
    { key: 'accepted',    label: 'Upcoming' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed',   label: 'Completed' },
    { key: 'cancelled',   label: 'Cancelled' },
    { key: 'disputed',    label: 'Disputed' },
  ];

  // ── Booking card ─────────────────────────────────────────────────────────
  const renderCard = (booking: VendorBooking) => {
    const strip  = getStrip(booking.status);
    const badge  = getBadge(booking.status);
    const badgeLbl = getBadgeLabel(booking.status);
    const isLoading = actionLoading === booking._id;

    const clientName = `${booking.client?.firstName || ''} ${booking.client?.lastName || ''}`.trim() || 'Client';
    const photo = booking.service?.images?.[0] || (booking.client as any)?.profileImage || (booking.client as any)?.avatar;
    const serviceName = booking.bookingType === 'offer_based'
      ? 'Custom Offer'
      : (booking.service?.name || 'Service Booking');
    const duration = formatDuration(booking.service?.duration);
    const dateStr = formatCardDate(booking.scheduledDate);
    const timeStr = format12Hour(booking.scheduledTime);
    const hasLocation = !!booking.location;
    const locationLine = hasLocation
      ? `Home Service · ${booking.location!.city || booking.location!.state || ''}`
      : 'In-Shop Service';

    // Action buttons config per status
    const renderActions = () => {
      const ActionBtn = ({ label, icon, onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) => (
        <TouchableOpacity onPress={onPress} disabled={isLoading} activeOpacity={0.85}
          style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
          <LinearGradient colors={[PRIMARY, '#C01070']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {isLoading
              ? <ActivityIndicator size="small" color={WHITE} />
              : <>
                  {icon && <Ionicons name={icon} size={15} color={WHITE} />}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>{label}</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      );

      // Dispute takes full priority — only show View Dispute
      if (booking.hasDispute) return (
        <TouchableOpacity
          onPress={() => booking.disputeId
            ? navigation.navigate('DisputeDetail', { disputeId: booking.disputeId })
            : navigation.navigate('BookingDetail', { bookingId: booking._id })
          }
          activeOpacity={0.85}
          style={{ marginTop: 12, borderRadius: 12, backgroundColor: '#EA580C',
            paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Ionicons name="alert-circle-outline" size={15} color={WHITE} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>View Dispute</Text>
        </TouchableOpacity>
      );

      if (booking.status === 'pending') return (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <TouchableOpacity onPress={() => handleReject(booking._id)} disabled={isLoading} activeOpacity={0.8}
            style={{ flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: RED, paddingVertical: 11, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: RED }}>Reject</Text>
          </TouchableOpacity>
          <ActionBtn label="Accept" icon="checkmark-circle-outline" onPress={() => handleAccept(booking._id)} />
        </View>
      );

      if (booking.status === 'accepted') {
        if (booking.vendorStartConfirmed) return <WaitingBanner />;
        return (
          <View style={{ marginTop: 14 }}>
            <ActionBtn label="Start Session" icon="play-circle-outline" onPress={() => handleStartSession(booking)} />
          </View>
        );
      }

      if (booking.status === 'in_progress') {
        const startedStr = booking.sessionStartedAt ? format12Hour(
          (() => { const d = new Date(booking.sessionStartedAt!); return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`; })()
        ) : '';
        const endStr = computeEndTime(booking.sessionStartedAt || '', booking.service?.duration);
        return (
          <View style={{ gap: 10, marginTop: 4 }}>
            {startedStr ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Ionicons name="time-outline" size={14} color={PRIMARY} />
                <Text style={{ fontSize: 13, color: GRAY, fontWeight: '500' }}>
                  Started {startedStr}{endStr ? ` · ends ${endStr}` : ''}
                </Text>
              </View>
            ) : null}
            <View style={{ backgroundColor: '#FDE8EF', borderRadius: 10, borderWidth: 1, borderColor: '#FBBDD0',
              flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Ionicons name="shield-checkmark-outline" size={16} color={PRIMARY} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 12, color: '#7D1A3A', lineHeight: 18, fontWeight: '500' }}>
                Client's pay of <Text style={{ fontWeight: '800' }}>₦{booking.totalAmount.toLocaleString()}</Text> is secured in escrow until the session is completed.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateDispute', { bookingId: booking._id, role: 'vendor' })}
                activeOpacity={0.8}
                style={{ flex: 1, borderRadius: 22, borderWidth: 1.5, borderColor: PRIMARY, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>Dispute</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => !booking.vendorMarkedComplete && handleComplete(booking._id)}
                disabled={isLoading || !!booking.vendorMarkedComplete}
                activeOpacity={0.85}
                style={{ flex: 2, borderRadius: 22,
                  backgroundColor: booking.vendorMarkedComplete ? '#9CA3AF' : PRIMARY,
                  paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'row', gap: 5 }}>
                {isLoading
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <>
                      <Ionicons
                        name={booking.vendorMarkedComplete ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={15} color={WHITE}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: WHITE }}>
                        {booking.vendorMarkedComplete ? 'Marked Done' : 'Mark as Done'}
                      </Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      return null;
    };

    return (
      <TouchableOpacity
        key={booking._id}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: booking._id })}
        activeOpacity={0.95}
        style={{ marginBottom: 14 }}
      >
        <View style={{
          backgroundColor: WHITE, borderRadius: 18,
          overflow: 'hidden',
          elevation: 3,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07, shadowRadius: 10,
        }}>
          {/* Status strip */}
          <View style={{ backgroundColor: strip.bg, borderBottomWidth: 1, borderBottomColor: strip.border, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Ionicons name={strip.icon} size={15} color={strip.textColor} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: strip.textColor }}>{strip.label}</Text>
          </View>

          {/* Card body */}
          <View style={{ padding: 14 }}>
            {/* Top row: photo + name/service + badge */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
              {/* Photo */}
              {photo ? (
                <Image source={{ uri: photo }} style={{ width: 64, height: 70, borderRadius: 10, marginRight: 12 }} />
              ) : (
                <View style={{ width: 64, height: 70, borderRadius: 10, backgroundColor: '#FDE8EF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: PRIMARY }}>
                    {(booking.client?.firstName?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
              )}

              {/* Name + service + badge */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  {/* Name + verified check */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT, flexShrink: 1 }} numberOfLines={1}>{clientName}</Text>
                    <Ionicons name="checkmark-circle" size={15} color={PRIMARY} style={{ marginLeft: 4 }} />
                  </View>
                  {/* Status badge */}
                  <View style={{ backgroundColor: badge.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: badge.text }}>{badgeLbl}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, color: GRAY }} numberOfLines={1}>{serviceName}{duration}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 10 }} />

            {/* Location row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
              <Ionicons name="location-outline" size={14} color={PRIMARY} style={{ marginRight: 7 }} />
              <Text style={{ fontSize: 13, color: GRAY }}>{locationLine}</Text>
            </View>

            {/* Date + time row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="calendar-outline" size={14} color={PRIMARY} style={{ marginRight: 7 }} />
              <Text style={{ fontSize: 13, color: GRAY }}>{dateStr}</Text>
              {timeStr ? (
                <>
                  <Text style={{ fontSize: 13, color: GRAY }}> · </Text>
                  <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: '600' }}>{timeStr}</Text>
                </>
              ) : null}
            </View>

            {/* Price */}
            <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT, letterSpacing: -0.5 }}>
              ₦{booking.totalAmount.toLocaleString()}
            </Text>

            {/* Action buttons */}
            {renderActions()}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && page === 1) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={{ color: MUTED, fontSize: 14, marginTop: 12, fontWeight: '500' }}>Loading bookings…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
        onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
            if (!loading && hasMore) fetchBookings(page + 1, true);
          }
        }}
        scrollEventThrottle={400}
      >
        {/* ── STICKY FILTER PILLS ─────────────────────────────────────────── */}
        <View style={{ backgroundColor: BG, paddingTop: 12, paddingBottom: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {filters.map(f => {
              const active = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24,
                    backgroundColor: active ? PRIMARY : WHITE,
                    borderWidth: 1.5, borderColor: active ? PRIMARY : BORDER,
                    elevation: active ? 4 : 1,
                    shadowColor: active ? PRIMARY : '#000',
                    shadowOffset: { width: 0, height: active ? 3 : 1 },
                    shadowOpacity: active ? 0.25 : 0.05,
                    shadowRadius: active ? 6 : 2,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? WHITE : GRAY }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {/* ── COUNTDOWN BANNER ─────────────────────────────────────────── */}
          {nextBooking && (
            <TouchableOpacity
              onPress={() => navigation.navigate('BookingDetail', { bookingId: nextBooking._id })}
              activeOpacity={0.9}
              style={{ marginBottom: 20, borderRadius: 20, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#6D0B3C', '#C01070']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}
              >
                {/* Left: label + name + date-time */}
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', fontWeight: '500', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Next Appointment In
                  </Text>
                  <Text style={{ fontSize: 17, color: WHITE, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 }}>
                    {`${nextBooking.client?.firstName || ''} ${nextBooking.client?.lastName || ''}`.trim()}
                  </Text>
                  {/* Appointment date + time */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
                      {formatCardDate(nextBooking.scheduledDate)}
                      {nextBooking.scheduledTime ? ` · ${format12Hour(nextBooking.scheduledTime)}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Right: countdown boxes */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { val: countdown.days, label: 'days' },
                    { val: countdown.hrs,  label: 'Hrs' },
                    { val: countdown.min,  label: 'min' },
                  ].map((item, i) => (
                    <View key={i} style={{
                      backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 10,
                      paddingHorizontal: 9, paddingVertical: 6,
                      alignItems: 'center', minWidth: 44,
                    }}>
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

          {/* ── BOOKING LIST ─────────────────────────────────────────────── */}
          {filteredBookings.length > 0 ? (
            <>
              {filteredBookings.map(b => renderCard(b))}
              {loading && page > 1 && (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                </View>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 24, backgroundColor: WHITE,
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                elevation: 3, shadowColor: PRIMARY, shadowOpacity: 0.12,
                shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
              }}>
                <Ionicons name="calendar-outline" size={38} color={PRIMARY} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 6 }}>No Bookings</Text>
              <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 }}>
                {activeFilter !== 'all'
                  ? `No ${filters.find(f => f.key === activeFilter)?.label.toLowerCase()} bookings yet`
                  : 'Bookings from clients will appear here'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <StartSessionModal
        visible={startSessionModal.visible}
        clientName={startSessionModal.clientName}
        loading={actionLoading === startSessionModal.bookingId}
        onConfirm={confirmStartSession}
        onCancel={() => setStartSessionModal({ visible: false, bookingId: '', clientName: '' })}
      />

      <MarkDoneModal
        visible={markDoneModal.visible}
        loading={actionLoading === markDoneModal.bookingId}
        onConfirm={confirmMarkDone}
        onCancel={() => setMarkDoneModal({ visible: false, bookingId: '' })}
      />

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmLabel}
        confirmColor={PRIMARY}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />

      <RejectionModal
        visible={rejectModalVisible}
        rejectionReason={rejectionReason}
        onChangeReason={handleChangeReason}
        onCancel={handleCloseModal}
        onSubmit={submitRejection}
      />

      <KycGateModal
        visible={kycModalVisible}
        action="booking"
        kycStatus={currentUser?.vendorProfile?.kycStatus}
        onClose={() => setKycModal(false)}
        onGoToKyc={() => { setKycModal(false); navigation.navigate('VendorStoreSettings'); }}
      />
    </SafeAreaView>
  );
};

export default VendorBookingsScreen;
