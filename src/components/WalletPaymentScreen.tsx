import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import api, { walletAPI, orderAPI, handleAPIError } from '@/api/api';
import socketService from '@/services/socket.service';
import { toast } from '@/components/ui/Toast';

const PINK = '#E91E63';
const BG = '#FFF5F8';
const { width: SW } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList, 'WalletPayment'>;
type RouteP = RouteProp<RootStackParamList, 'WalletPayment'>;

const WalletPaymentScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const insets = useSafeAreaInsets();

  const { amount, reference, authorizationUrl, paymentType = 'wallet_funding' } = route.params;

  const [verifying, setVerifying] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showManualButton, setShowManualButton] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const isFunding    = paymentType === 'wallet_funding';
  const isOrderPay   = paymentType === 'order_payment';

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!paymentConfirmed) setShowManualButton(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [paymentConfirmed]);

  useEffect(() => {
    let mounted = true;

    const handlePaymentSuccess = (data: any) => {
      if (!mounted) return;
      if (data.reference === reference) setPaymentConfirmed(true);
    };

    const handlePaymentFailed = (data: any) => {
      if (!mounted) return;
      if (data.reference === reference) {
        toast.error('Payment Failed', data.reason || 'Your payment could not be completed. Please try again.');
        navigation.goBack();
      }
    };

    const handleOrderSuccess = (data: any) => {
      if (!mounted) return;
      if (data.reference === reference) {
        if (data.orderId) setConfirmedOrderId(data.orderId);
        setPaymentConfirmed(true);
      }
    };

    const attach = (socket: any) => {
      if (!mounted || !socket) return;
      setSocketConnected(socket.connected);
      if (isOrderPay) {
        socket.on('order:payment:success', handleOrderSuccess);
        socket.on('order:payment:failed', handlePaymentFailed);
      } else {
        socket.on('wallet:funded', handlePaymentSuccess);
        socket.on('wallet:funding:failed', handlePaymentFailed);
      }
      socket.on('connect', () => { if (mounted) setSocketConnected(true); });
      socket.on('disconnect', () => { if (mounted) setSocketConnected(false); });
    };

    const existing = socketService.getSocket();
    if (existing) {
      attach(existing);
    } else {
      socketService.connect().then(() => {
        attach(socketService.getSocket());
      });
    }

    return () => {
      mounted = false;
      const s = socketService.getSocket();
      if (s) {
        if (isOrderPay) {
          s.off('order:payment:success', handleOrderSuccess);
          s.off('order:payment:failed', handlePaymentFailed);
        } else {
          s.off('wallet:funded', handlePaymentSuccess);
          s.off('wallet:funding:failed', handlePaymentFailed);
        }
        s.off('connect');
        s.off('disconnect');
      }
    };
  }, [reference, navigation, isOrderPay]);

  const verifyPayment = async () => {
    if (verifying || paymentConfirmed) return;
    try {
      setVerifying(true);
      if (paymentType === 'tier_upgrade') {
        const response = await api.get(`/subscriptions/verify-tier/${reference}`);
        if (response.data.success) {
          setPaymentConfirmed(true);
        } else {
          toast.error('Error', response.data.message || 'Could not verify upgrade.');
        }
      } else if (isOrderPay) {
        const res = await orderAPI.verifyOrderByReference(reference);
        const data = res?.data;
        if (data?.orderId) {
          setConfirmedOrderId(data.orderId);
          setPaymentConfirmed(true);
        } else {
          toast.info('Payment Pending', 'Still processing — please wait a moment and try again.');
        }
      } else {
        const response = await walletAPI.verifyWalletFunding(reference);
        if (response.success) {
          const { status } = response.data.payment;
          if (status === 'completed' || status === 'success') {
            setPaymentConfirmed(true);
            toast.success('Wallet Funded!', `₦${amount.toLocaleString()} added to your wallet`);
          } else if (status === 'failed') {
            toast.error('Payment Failed', 'Your payment could not be processed.');
          } else {
            toast.info('Payment Pending', 'Still processing — please wait a moment and try again.');
          }
        } else {
          toast.error('Error', 'Could not verify payment.');
        }
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Leave Payment?',
      'Your payment may still go through if you already completed it.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleWebViewError = () => {
    toast.error('Connection Error', 'Failed to load payment page. Check your internet connection.');
    navigation.goBack();
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (paymentConfirmed) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}>
          <LinearGradient colors={['#FCE4EC', '#fff']} style={s.successRing}>
            <View style={s.successCircle}>
              <Ionicons name="checkmark" size={52} color={PINK} />
            </View>
          </LinearGradient>

          <Text style={s.successTitle}>
            {isOrderPay ? 'Order Placed!' : isFunding ? 'Wallet Funded!' : 'Plan Upgraded!'}
          </Text>
          <Text style={s.successSub}>
            {isOrderPay
              ? 'Your order has been received and is being processed.'
              : isFunding
              ? `₦${amount.toLocaleString()} has been added to your LookReal wallet`
              : 'Your subscription plan has been upgraded successfully.'}
          </Text>

          {(isFunding || isOrderPay) && (
            <View style={s.successBadge}>
              <Ionicons name={isOrderPay ? 'bag-check-outline' : 'trending-up'} size={16} color="#059669" />
              <Text style={s.successBadgeTxt}>
                {isOrderPay ? `₦${amount.toLocaleString()} paid` : `+₦${amount.toLocaleString()}`}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => {
              if (isOrderPay) {
                navigation.dispatch(
                  CommonActions.reset({
                    index: confirmedOrderId ? 1 : 0,
                    routes: confirmedOrderId
                      ? [{ name: 'Main' }, { name: 'OrderDetail', params: { orderId: confirmedOrderId, userType: 'customer' } }]
                      : [{ name: 'Main' }],
                  })
                );
              } else if (isFunding) {
                navigation.goBack();
              } else {
                navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] }));
              }
            }}
            activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden', width: SW - 80, marginTop: 36 }}
          >
            <LinearGradient
              colors={['#E91E63', '#C2185B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.successBtn}
            >
              <Text style={s.successBtnTxt}>{isOrderPay ? 'View Order' : isFunding ? 'Continue' : 'Continue'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main payment screen ────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header — insets.top applied directly so no SafeAreaView needed */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleCancel} activeOpacity={0.8} style={s.closeBtn}>
          <Ionicons name="close" size={20} color="#1A1A1A" />
        </TouchableOpacity>

        <View style={s.headerMid}>
          <Text style={s.headerTitle}>
            {isOrderPay ? 'Complete Payment' : isFunding ? 'Fund Wallet' : 'Upgrade Plan'}
          </Text>
          <View style={s.liveRow}>
            <View style={[s.liveDot, { backgroundColor: socketConnected ? '#10B981' : '#F59E0B' }]} />
            <Text style={s.liveTxt}>{socketConnected ? 'Live updates on' : 'Connecting…'}</Text>
          </View>
        </View>

        <View style={s.amountBadge}>
          <Text style={s.amountBadgeTxt}>₦{amount.toLocaleString()}</Text>
        </View>
      </View>

      {/* WebView */}
      {authorizationUrl ? (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: authorizationUrl }}
            onError={handleWebViewError}
            startInLoadingState
            renderLoading={() => (
              <View style={s.loadingBox}>
                <View style={s.loadingSpinner}>
                  <ActivityIndicator size="large" color={PINK} />
                </View>
                <Text style={s.loadingTitle}>Connecting to Paystack</Text>
                <Text style={s.loadingTxt}>Setting up your secure payment page…</Text>
              </View>
            )}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
          />

          {showManualButton && (
            <View style={[s.verifyBar, { paddingBottom: insets.bottom + 10 }]}>
              <TouchableOpacity
                onPress={verifyPayment}
                disabled={verifying}
                activeOpacity={0.85}
                style={{ borderRadius: 14, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={verifying ? ['#D1D5DB', '#9CA3AF'] : ['#E91E63', '#C2185B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.verifyBtn}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      <Text style={s.verifyBtnTxt}>I've Completed Payment</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={s.verifyHint}>Tap if payment isn't auto-confirmed within a few seconds</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={s.noUrlBox}>
          <View style={s.noUrlIcon}>
            <Ionicons name="alert-circle-outline" size={40} color="#9CA3AF" />
          </View>
          <Text style={s.noUrlTitle}>Payment link unavailable</Text>
          <Text style={s.noUrlSub}>We couldn't load the payment page. Please go back and try again.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={s.noUrlBtn}>
            <Text style={s.noUrlBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Security footer */}
      <View style={[s.secFooter, { paddingBottom: insets.bottom + 6 }]}>
        <Ionicons name="lock-closed" size={13} color="#10B981" />
        <Text style={s.secTxt}>
          Secured by <Text style={{ fontWeight: '700', color: '#374151' }}>Paystack</Text>
        </Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
    backgroundColor: '#fff',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMid: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveTxt: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  amountBadge: {
    backgroundColor: '#FCE4EC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F9A8D4',
  },
  amountBadgeTxt: { fontSize: 14, fontWeight: '800', color: PINK },

  // Loading state
  loadingBox: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingSpinner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loadingTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  loadingTxt: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  // Verify bar
  verifyBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  verifyBtn: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
  },
  verifyBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  verifyHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },

  // No URL
  noUrlBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noUrlIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noUrlTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 8 },
  noUrlSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  noUrlBtn: {
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F9A8D4',
  },
  noUrlBtnTxt: { fontSize: 14, fontWeight: '700', color: PINK },

  // Security footer
  secFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  secTxt: { fontSize: 12, color: '#6B7280' },

  // Success
  successRing: {
    width: 152,
    height: 152,
    borderRadius: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  successCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: PINK,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successBadgeTxt: { fontSize: 18, fontWeight: '800', color: '#059669' },
  successBtn: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  successBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default WalletPaymentScreen;
