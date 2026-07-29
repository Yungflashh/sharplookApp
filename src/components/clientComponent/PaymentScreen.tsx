import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import socketService from '@/services/socket.service';

const { height: H } = Dimensions.get('window');

const PINK      = '#E8166D';
const GREEN     = '#10b981';
const TEXT      = '#111827';
const MUTED     = '#6B7280';
const BG        = '#FAFAFA';

const LOG = (...args: any[]) => console.log('[PaymentScreen]', ...args);

type Nav   = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type Route = RouteProp<RootStackParamList, 'Payment'>;

const PaymentScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const { bookingId, amount, authorizationUrl: initialAuthUrl, reference: initialReference } = route.params;

  // Log params once on mount only
  useEffect(() => {
    LOG('=== MOUNTED ===');
    LOG('bookingId:', bookingId);
    LOG('amount:', amount);
    LOG('reference:', initialReference);
    LOG('authUrl:', initialAuthUrl ? initialAuthUrl.substring(0, 60) + '...' : 'NONE');
    return () => LOG('=== UNMOUNTED ===');
  }, []);

  const [paymentUrl]          = useState(initialAuthUrl || '');
  const [reference, setReference] = useState(initialReference || '');
  const [loading, setLoading] = useState(!initialAuthUrl);
  const [verifying, setVerifying] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [socketConnected, setSocketConnected]   = useState(false);
  const [showVerifyingScreen, setShowVerifyingScreen] = useState(false);
  const [showDoneButton, setShowDoneButton]           = useState(false);
  const [countdown, setCountdown]               = useState(3);
  const [confirmedBookingId, setConfirmedBookingId] = useState(bookingId || '');
  const [autoVerify, setAutoVerify] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const referenceRef      = useRef(initialReference || '');
  const bookingIdRef      = useRef(bookingId || '');
  const confirmedRef      = useRef(false);

  useEffect(() => { referenceRef.current = reference; }, [reference]);
  useEffect(() => { confirmedRef.current = paymentConfirmed; }, [paymentConfirmed]);

  // ── Countdown + auto-navigate after confirmed ────────────────────────────
  useEffect(() => {
    if (!paymentConfirmed) return;
    const id = confirmedBookingId || bookingIdRef.current;
    LOG('Payment confirmed! bookingId to navigate:', id);

    if (!id) {
      LOG('WARNING: no bookingId to navigate to — waiting for socket event to provide one');
      return;
    }

    setCountdown(3);
    const interval = setInterval(() => setCountdown(c => c - 1), 1000);
    const nav = setTimeout(() => {
      clearInterval(interval);
      LOG('Auto-navigating to BookingDetail:', id);
      navigation.replace('BookingDetail', { bookingId: id });
    }, 3000);

    return () => { clearInterval(interval); clearTimeout(nav); };
  }, [paymentConfirmed, confirmedBookingId]);

  // ── Auto-verify when deep link fires ─────────────────────────────────────
  useEffect(() => {
    if (!autoVerify) return;
    LOG('Auto-verify triggered from deep link');
    setAutoVerify(false);
    verifyPayment();
  }, [autoVerify]);

  // ── Show "I've completed payment" button after 5s ────────────────────────
  // Lets the user trigger the verifying screen the moment they finish paying.
  useEffect(() => {
    if (!paymentUrl || paymentConfirmed) return;
    const t = setTimeout(() => {
      if (!confirmedRef.current) {
        LOG('5s elapsed — showing done button');
        setShowDoneButton(true);
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [paymentUrl]);

  // ── Auto-transition to verifying screen after 25s ────────────────────────
  // Fallback: if user hasn't tapped "done", switch automatically.
  useEffect(() => {
    if (!paymentUrl || paymentConfirmed) return;
    const t = setTimeout(() => {
      if (!confirmedRef.current) {
        LOG('25s elapsed — auto-switching to verifying screen');
        setShowVerifyingScreen(true);
      }
    }, 25000);
    return () => clearTimeout(t);
  }, [paymentUrl]);

  // ── Background polling: check every 5s once verifying screen is shown ─────
  // Paystack webhook can't reach local dev servers, so we poll as fallback.
  useEffect(() => {
    if (!showVerifyingScreen || paymentConfirmed) return;
    const ref = referenceRef.current || initialReference;
    if (!ref) return;

    LOG('⏱ Starting payment poll (5s interval)');

    const poll = async () => {
      if (confirmedRef.current) return;
      try {
        const res = await bookingAPI.verifyPaystackPayment(ref);
        if (res.success) {
          const booking = res.data?.booking;
          LOG('Poll result — paymentStatus:', booking?.paymentStatus);
          if (booking?.paymentStatus === 'escrowed') {
            LOG('✅ Poll detected confirmed payment — bookingId:', booking._id);
            if (booking._id) {
              setConfirmedBookingId(booking._id);
              bookingIdRef.current = booking._id;
            }
            setPaymentConfirmed(true);
          }
        }
      } catch (_) {
        // payment not yet complete — ignore silently
      }
    };

    const interval = setInterval(poll, 5000);
    return () => { LOG('⏱ Stopping payment poll'); clearInterval(interval); };
  }, [showVerifyingScreen, paymentConfirmed]);

  // ── Fallback: no authUrl → check booking status ──────────────────────────
  useEffect(() => {
    if (!initialAuthUrl) {
      LOG('No authorizationUrl — checking booking status directly');
      checkBookingPaymentStatus();
    }
  }, []);

  // ── Socket setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let detach: (() => void) | undefined;

    const handlePaid = (data: any) => {
      LOG('>>> handlePaid fired. data:', JSON.stringify(data));
      if (!mounted || confirmedRef.current) {
        LOG('Ignored — mounted:', mounted, 'already confirmed:', confirmedRef.current);
        return;
      }
      const ref = referenceRef.current;
      const bid = bookingIdRef.current;
      LOG('Matching — our ref:', ref, '| data.reference:', data.reference);
      LOG('Matching — our bookingId:', bid, '| data.bookingId:', data.bookingId);

      const matches = (ref && data.reference === ref) || (bid && data.bookingId === bid);
      LOG('Match result:', matches);

      if (!matches) return;

      LOG('✅ MATCH — confirming payment, bookingId:', data.bookingId);
      if (data.bookingId) {
        setConfirmedBookingId(data.bookingId);
        bookingIdRef.current = data.bookingId;
      }
      setPaymentConfirmed(true);
      setVerifying(false);
    };

    const handleFailed = (data: any) => {
      LOG('>>> handleFailed fired. data:', JSON.stringify(data));
      if (!mounted) return;
      const ref = referenceRef.current;
      const bid = bookingIdRef.current;
      if ((ref && data.reference === ref) || (bid && data.bookingId === bid)) {
        setVerifying(false);
        toast.error('Payment Failed', data.reason || 'Your payment could not be completed. Please try again.');
        navigation.goBack();
      }
    };

    const attach = () => {
      if (!mounted) return;
      const socket = socketService.getSocket();

      LOG('attach() called — socket exists:', !!socket, '| connected:', socket?.connected);
      LOG('socket id:', socket?.id || 'N/A');

      if (!socket) {
        LOG('WARNING: socket is null after connect()!');
        return;
      }

      setSocketConnected(socket.connected);

      // Listen for ALL events so we can see what's actually arriving
      socket.onAny((eventName: string, ...args: any[]) => {
        LOG('📡 RAW socket event:', eventName, JSON.stringify(args));
      });

      socket.on('payment:success',        handlePaid);
      socket.on('booking:created:paid',   handlePaid);
      socket.on('payment:failed',         handleFailed);
      socket.on('booking:payment:failed', handleFailed);
      socket.on('connect',    () => { LOG('Socket connected'); if (mounted) setSocketConnected(true); });
      socket.on('disconnect', (reason: string) => { LOG('Socket disconnected:', reason); if (mounted) setSocketConnected(false); });

      LOG('✅ All listeners attached on socket', socket.id);

      detach = () => {
        LOG('Detaching socket listeners');
        socket.offAny();
        socket.off('payment:success',        handlePaid);
        socket.off('booking:created:paid',   handlePaid);
        socket.off('payment:failed',         handleFailed);
        socket.off('booking:payment:failed', handleFailed);
        socket.off('connect');
        socket.off('disconnect');
      };
    };

    const existing = socketService.getSocket();
    LOG('On mount — existing socket:', !!existing, '| connected:', existing?.connected);

    if (existing) {
      attach();
    } else {
      LOG('No socket — calling connect()...');
      socketService.connect().then(() => {
        LOG('connect() resolved');
        attach();
      });
    }

    return () => {
      LOG('Cleanup — unmounting PaymentScreen');
      mounted = false;
      detach?.();
    };
  }, []);

  // ── Check booking payment status (no authUrl path) ───────────────────────
  const checkBookingPaymentStatus = async () => {
    if (!bookingId) { LOG('checkBookingPaymentStatus: no bookingId'); return; }
    try {
      setLoading(true);
      LOG('Fetching booking status for:', bookingId);
      const res = await bookingAPI.getBookingById(bookingId);
      if (res.success) {
        const booking = res.data.booking || res.data;
        LOG('Booking paymentStatus:', booking.paymentStatus);
        if (booking.paymentStatus === 'escrowed') {
          setConfirmedBookingId(booking._id || bookingId);
          setPaymentConfirmed(true);
        } else {
          toast.warning('Payment Required', 'Please go back and create the booking again.');
          navigation.goBack();
        }
      }
    } catch (err) {
      LOG('checkBookingPaymentStatus error:', err);
      toast.error('Error', 'Could not load booking information.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ── Manual verification ──────────────────────────────────────────────────
  const verifyPayment = async () => {
    if (verifying || paymentConfirmed) return;
    const ref = referenceRef.current || initialReference;
    LOG('Manual verify — ref:', ref);

    if (!ref) {
      toast.error('Error', 'No payment reference available.');
      return;
    }
    try {
      setVerifying(true);
      const res = await bookingAPI.verifyPaystackPayment(ref);
      LOG('Verify response:', JSON.stringify(res));

      if (res.success) {
        const booking = res.data?.booking;
        LOG('Booking status from verify:', booking?.paymentStatus);

        if (booking?.paymentStatus === 'escrowed' || res.data?.paymentStatus === 'escrowed') {
          if (booking?._id) {
            setConfirmedBookingId(booking._id);
            bookingIdRef.current = booking._id;
            LOG('confirmedBookingId set from verify:', booking._id);
          }
          setPaymentConfirmed(true);
        } else if (booking?.paymentStatus === 'pending') {
          toast.info('Still Processing', 'Payment is being processed. Wait a moment and try again.');
        } else {
          toast.info('Not Confirmed', `Status: ${booking?.paymentStatus || 'unknown'}. Try again.`);
        }
      } else {
        toast.error('Error', res.message || 'Could not verify. Please try again.');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      LOG('Verify error:', apiError);
      toast.error('Verification Error', apiError.message || 'Contact support if you were charged.');
    } finally {
      setVerifying(false);
    }
  };

  // ── Extract ref from URL query string ───────────────────────────────────
  const extractRef = (url: string): string | null => {
    const qs = url.split('?')[1] || '';
    const p  = new URLSearchParams(qs);
    return p.get('reference') || p.get('trxref') || null;
  };

  // ── Intercept deep-link scheme BEFORE WebView tries to load it ───────────
  // Paystack redirects to `sharplook://booking-payment-callback?reference=xxx`
  // after payment. We catch it here and auto-verify instead of loading the URL.
  const handleShouldStartLoad = (req: { url: string }) => {
    const { url } = req;
    LOG('WebView load request:', url.substring(0, 120));

    if (url.startsWith('lookreal://') || url.startsWith('sharplook://') || url.startsWith('sharpLook://')) {
      LOG('✅ Deep link intercepted:', url);
      const ref = extractRef(url);
      LOG('Reference from deep link:', ref);
      if (ref) {
        setReference(ref);
        referenceRef.current = ref;
      }
      // Auto-trigger verify immediately
      setAutoVerify(true);
      return false; // Block WebView from trying to load this scheme
    }

    return true; // Allow all normal web URLs
  };

  // ── Detect Paystack success/callback via URL change ──────────────────────
  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    if (!url) return;
    LOG('WebView nav state URL:', url.substring(0, 120));

    const isCallback =
      url.startsWith('lookreal://') ||
      url.startsWith('sharplook://') ||
      url.startsWith('sharpLook://') ||
      url.includes('trxref=') ||
      url.includes('reference=') ||
      url.includes('/callback') ||
      url.includes('/verify');

    if (isCallback) {
      const ref = extractRef(url);
      LOG('Callback/redirect detected — ref:', ref);
      if (ref) {
        setReference(ref);
        referenceRef.current = ref;
      }
      setShowVerifyingScreen(true);
    }
  };

  const handleCancel = () => {
    setConfirmModal({
      visible: true,
      title: 'Cancel Payment',
      message: 'Are you sure? Your booking will not be confirmed until payment is complete.',
      onConfirm: () => navigation.goBack(),
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={styles.loadingText}>Loading payment...</Text>
      </View>
    );
  }

  // ── Payment confirmed ────────────────────────────────────────────────────
  if (paymentConfirmed) {
    return (
      <View style={[styles.successBg, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Circle glow */}
        <View style={styles.successGlow} />

        <View style={styles.successContent}>
          {/* Checkmark */}
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={52} color="#fff" />
          </View>

          <Text style={styles.successTitle}>Payment Confirmed!</Text>
          <Text style={styles.successAmount}>₦{amount?.toLocaleString()}</Text>
          <Text style={styles.successSub}>Your booking has been confirmed and the vendor notified.</Text>

          {/* Escrow badge */}
          <View style={styles.escrowBadge}>
            <Ionicons name="shield-checkmark" size={16} color={GREEN} />
            <Text style={styles.escrowText}>Payment held securely in escrow</Text>
          </View>

          {/* Countdown */}
          <View style={styles.countdownWrap}>
            <ActivityIndicator size="small" color={PINK} style={{ marginRight: 8 }} />
            <Text style={styles.countdownText}>
              Redirecting to booking in {countdown}s...
            </Text>
          </View>

          {/* Manual fallback */}
          <TouchableOpacity
            style={styles.viewBookingBtn}
            onPress={() => {
              const id = confirmedBookingId || bookingIdRef.current;
              if (id) navigation.replace('BookingDetail', { bookingId: id });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.viewBookingText}>View Booking Now</Text>
            <Ionicons name="arrow-forward" size={16} color={PINK} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Verifying screen ─────────────────────────────────────────────────────
  if (showVerifyingScreen && !paymentConfirmed) {
    return (
      <View style={[styles.verifyingBg, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        {/* Shield icon cluster */}
        <View style={styles.shieldWrap}>
          {/* Sparkle decorators */}
          <Ionicons name="sparkles"  size={18} color={PINK} style={{ position: 'absolute', top: 4,  left: 12 }} />
          <Ionicons name="sparkles"  size={12} color={PINK} style={{ position: 'absolute', top: 0,  right: 18 }} />
          <Ionicons name="heart"     size={12} color={PINK} style={{ position: 'absolute', bottom: 8, left: 22 }} />
          <Ionicons name="heart"     size={10} color={PINK} style={{ position: 'absolute', bottom: 6, right: 22 }} />

          {/* Concentric circles */}
          <View style={styles.shieldOuter}>
            <View style={styles.shieldInner}>
              <Ionicons name="shield-checkmark" size={52} color={PINK} />
            </View>
          </View>
        </View>

        <Text style={styles.verifyingTitle}>Verifying Payment...</Text>
        <Text style={styles.verifyingSub}>
          Please don't close the app{'\n'}we are verifying your payment
        </Text>

        {/* Estimated time card */}
        <View style={styles.etaCard}>
          <View style={styles.etaRow}>
            <Ionicons name="time-outline" size={22} color={PINK} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.etaLabel}>Estimated Verification Time</Text>
              <Text style={styles.etaTime}>30 - 60 seconds</Text>
            </View>
          </View>
        </View>

        {/* What happens next card */}
        <View style={styles.nextCard}>
          <View style={styles.nextHeader}>
            <Ionicons name="lock-closed" size={13} color={PINK} />
            <Text style={styles.nextTitle}> Whats happens Next?</Text>
          </View>
          <Text style={styles.nextBody}>
            We are securely verifying your payment. You will be notified once your booking is confirmed.
          </Text>
        </View>

        {/* Subtle cancel link */}
        <TouchableOpacity onPress={handleCancel} style={styles.verifyingCancel} activeOpacity={0.7}>
          <Text style={styles.verifyingCancelText}>Cancel</Text>
        </TouchableOpacity>

        <ConfirmationModal
          visible={confirmModal.visible}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
          onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
        />
      </View>
    );
  }

  // ── Main screen ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={TEXT} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="lock-closed" size={14} color={GREEN} style={{ marginRight: 5 }} />
            <Text style={styles.headerTitle}>Secure Payment</Text>
          </View>
          {/* Socket status dot */}
          <View style={styles.socketDot}>
            <View style={[styles.dot, { backgroundColor: socketConnected ? GREEN : '#f59e0b' }]} />
            <Text style={styles.dotLabel}>{socketConnected ? 'Live' : 'Connecting'}</Text>
          </View>
        </View>

        {/* Amount card */}
        <View style={styles.amountCard}>
          <View style={styles.amountDecor} />
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amountValue}>₦{amount?.toLocaleString()}</Text>
          <View style={styles.amountFooter}>
            <Ionicons name="shield-checkmark" size={13} color={PINK} />
            <Text style={styles.amountFooterText}>Funds held in escrow until service is completed</Text>
          </View>
        </View>
      </View>

      {/* ── WebView ──────────────────────────────────────────────────── */}
      {paymentUrl ? (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: paymentUrl }}
            onError={() => toast.error('Connection Error', 'Failed to load payment page. Please check your connection.')}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.center, StyleSheet.absoluteFillObject, { backgroundColor: '#fff' }]}>
                <ActivityIndicator size="large" color={PINK} />
                <Text style={styles.loadingText}>Loading Paystack...</Text>
              </View>
            )}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
          />

          {/* ── "Done paying" button — slides up after 5s ──────────────── */}
          {showDoneButton && (
            <View style={[styles.doneBar, { paddingBottom: insets.bottom + 8 }]}>
              <TouchableOpacity
                onPress={() => setShowVerifyingScreen(true)}
                style={styles.doneBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.doneBtnText}>I've Completed Payment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#d1d5db" />
          <Text style={styles.noUrlText}>Payment URL not available</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 12 }]}>
        <Ionicons name="lock-closed" size={12} color={GREEN} />
        <Text style={styles.footerText}>  256-bit SSL  ·  Secured by </Text>
        <Text style={[styles.footerText, { fontWeight: '700' }]}>Paystack</Text>
      </View>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />
    </View>
  );
};

export default PaymentScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    marginBottom: 14,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  socketDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotLabel: { fontSize: 11, color: MUTED, fontWeight: '500' },

  // Amount card
  amountCard: {
    backgroundColor: '#FFF5F9',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FFD6E8',
    overflow: 'hidden',
  },
  amountDecor: {
    position: 'absolute', right: -24, top: -24,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(232,22,109,0.07)',
  },
  amountLabel: { fontSize: 12, color: MUTED, fontWeight: '600', marginBottom: 4 },
  amountValue: { fontSize: 34, fontWeight: '800', color: PINK, letterSpacing: -1 },
  amountFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5 },
  amountFooterText: { fontSize: 11, color: MUTED, flex: 1 },

  // "Done paying" bottom bar
  doneBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  doneBtn: {
    backgroundColor: PINK,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Verifying payment screen
  verifyingBg: {
    flex: 1, backgroundColor: '#FFF0F6',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  shieldWrap: {
    width: 200, height: 200,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  shieldOuter: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(232,22,109,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  shieldInner: {
    width: 114, height: 114, borderRadius: 57,
    backgroundColor: 'rgba(232,22,109,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  verifyingTitle: {
    fontSize: 22, fontWeight: '700', color: TEXT,
    marginBottom: 10, letterSpacing: -0.3,
  },
  verifyingSub: {
    fontSize: 14, color: MUTED, textAlign: 'center',
    lineHeight: 22, marginBottom: 28,
  },
  etaCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#FFE4EF',
    marginBottom: 16,
  },
  etaRow: { flexDirection: 'row', alignItems: 'center' },
  etaLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 3 },
  etaTime: { fontSize: 15, fontWeight: '700', color: PINK },
  nextCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#FFE4EF',
  },
  nextHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  nextTitle: { fontSize: 14, fontWeight: '700', color: PINK },
  nextBody: { fontSize: 13, color: MUTED, lineHeight: 20 },
  verifyingCancel: { marginTop: 24 },
  verifyingCancelText: { fontSize: 13, color: MUTED, textDecorationLine: 'underline' },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  footerText: { fontSize: 12, color: MUTED },

  // Loading / no URL
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { fontSize: 14, color: MUTED, marginTop: 12 },
  noUrlText: { fontSize: 16, fontWeight: '600', color: MUTED, marginTop: 16 },
  goBackBtn: { marginTop: 16, backgroundColor: PINK, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  goBackText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Success screen
  successBg: {
    flex: 1, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successGlow: {
    position: 'absolute', top: H * 0.15,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#F0FDF4',
  },
  successContent: { alignItems: 'center', width: '100%' },
  checkCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    elevation: 8,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 6, letterSpacing: -0.5 },
  successAmount: { fontSize: 36, fontWeight: '800', color: PINK, letterSpacing: -1, marginBottom: 12 },
  successSub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  escrowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
    marginBottom: 28,
  },
  escrowText: { fontSize: 13, fontWeight: '600', color: '#166534' },
  countdownWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 24,
  },
  countdownText: { fontSize: 14, color: MUTED, fontWeight: '500' },
  viewBookingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: PINK,
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
  },
  viewBookingText: { fontSize: 14, fontWeight: '700', color: PINK },
});
