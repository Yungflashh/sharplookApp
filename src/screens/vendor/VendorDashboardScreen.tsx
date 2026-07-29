import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StatusBar,
  Dimensions, RefreshControl, Platform, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation.types';
import VendorSidebar from '@/components/VendorSidebar';
import { analyticsAPI, notificationAPI, messageAPI, handleAPIError } from '@/api/api';
import { getStoredUser, updateStoredUser } from '@/utils/authHelper';
import socketService from '@/services/socket.service';
import WalletFundingModal from '@/components/WalletFundingModal';
import WithdrawalModal from '@/components/WIthdrawalModal';
import KycGateModal from '@/components/KycGateModal';

const { width: SW } = Dimensions.get('window');
const PINK = '#E91E63';
const BG = '#FFF0F5';
const WHITE = '#FFFFFF';

const shadow = (elevation = 4) =>
  Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
    android: { elevation },
  });

type Nav = StackNavigationProp<RootStackParamList, 'Main'>;
type Period = 'today' | 'week' | 'month';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning 👋';
  if (h < 18) return 'Good afternoon 👋';
  return 'Good evening 👋';
};

const fmt = (n: number) => `₦${n.toLocaleString()}`;

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending:    { label: 'Pending',     bg: '#FEF3C7', color: '#D97706' },
  accepted:   { label: 'Upcoming',    bg: '#D1FAE5', color: '#059669' },
  in_progress:{ label: 'In progress', bg: '#E0F2FE', color: '#0284C7' },
  inProgress: { label: 'In progress', bg: '#E0F2FE', color: '#0284C7' },
  completed:  { label: 'Completed',   bg: '#F3F4F6', color: '#6B7280' },
  cancelled:  { label: 'Cancelled',   bg: '#FEE2E2', color: '#DC2626' },
  rejected:   { label: 'Rejected',    bg: '#FEE2E2', color: '#DC2626' },
};

interface DashboardData {
  wallet: { balance: number; escrow: number; totalEarned: number };
  stats: { totalBookings: number; totalOrders: number; averageRating: number };
  isActive: boolean;
  businessName: string;
  todaySchedule: Array<{
    _id: string; clientName: string; clientAvatar: string | null;
    serviceName: string; scheduledDate: string; scheduledTime: string;
    status: string; totalAmount: number;
  }>;
  analytics: {
    period: Period;
    earnings: { value: number; change: number };
    bookings: { value: number; change: number };
    orders: { value: number; change: number };
    chart: Array<{ label: string; value: number }>;
  };
  vendorProfile?: { kycStatus?: string };
  email?: string;
  avatar?: string;
}

// ── Avatar placeholder ─────────────────────────────────────────────────────
const AvatarPlaceholder: React.FC<{ name: string; size: number }> = ({ name, size }) => {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: PINK + '30', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: PINK }}>{initials}</Text>
    </View>
  );
};

// ── Notification badge ─────────────────────────────────────────────────────
const Badge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <View style={{
      position: 'absolute', top: -4, right: -4,
      minWidth: 18, height: 18, borderRadius: 9,
      backgroundColor: '#FF6B00',
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    }}>
      <Text style={{ color: WHITE, fontSize: 10, fontWeight: '800' }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

// ── Main screen ────────────────────────────────────────────────────────────
const VendorDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [data, setData]                 = useState<DashboardData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [period, setPeriod]             = useState<Period>('week');
  const [periodLoading, setPeriodLoading] = useState(false);
  const [showBalance, setShowBalance]   = useState(false);
  const [sidebarVisible, setSidebarVisible]             = useState(false);
  const [fundingVisible, setFundingVisible]             = useState(false);
  const [withdrawalVisible, setWithdrawalVisible]       = useState(false);
  const [kycVisible, setKycVisible]                     = useState(false);
  const [unreadNotif, setUnreadNotif]   = useState(0);
  const [unreadMsg, setUnreadMsg]       = useState(0);

  // ── Counts ──────────────────────────────────────────────────────────────
  const fetchCounts = async () => {
    try {
      const [nr, mr] = await Promise.all([
        notificationAPI.getUnreadCount(),
        messageAPI.getUnreadCount(),
      ]);
      setUnreadNotif(nr.data?.count ?? nr.data?.data?.count ?? 0);
      setUnreadMsg(mr.data?.unreadCount ?? mr.unreadCount ?? 0);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    fetchCounts();
    if (!socketService.isSocketConnected()) socketService.connect();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []));

  useEffect(() => {
    socketService.connect();
    socketService.onNewMessage(() => setUnreadMsg(p => p + 1));

    // KYC real-time gate: lift or notify without logout
    const unsubKyc = socketService.onKycStatusChanged(async ({ kycStatus, rejectionReason, message }) => {
      try {
        const stored = await getStoredUser();
        if (stored) {
          if (!stored.vendorProfile) stored.vendorProfile = {} as any;
          stored.vendorProfile.kycStatus = kycStatus;
          if (rejectionReason) stored.vendorProfile.kycRejectionReason = rejectionReason;
          await updateStoredUser(stored);
        }
        // Refresh dashboard data so KYC gate state updates
        setData(prev => prev ? {
          ...prev,
          vendorProfile: { ...prev.vendorProfile, kycStatus },
        } : prev);
        setKycVisible(false);

        if (kycStatus === 'approved') {
          const { toast } = require('@/components/ui/Toast');
          toast.success('Verified!', 'Your account is now verified. You can accept bookings.');
        } else if (kycStatus === 'rejected') {
          const { toast } = require('@/components/ui/Toast');
          toast.error('Verification Rejected', rejectionReason || message);
        }
      } catch {}
    });

    return () => {
      socketService.removeListener('message:new');
      unsubKyc();
    };
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────
  const fetchDashboard = async (p: Period, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else if (p !== period) setPeriodLoading(true);
      else setLoading(true);

      const res = await analyticsAPI.getDashboard(p);
      console.log('📊 Dashboard res:', JSON.stringify(res?.data ?? res, null, 2));
      if (res.success) setData(res.data);
    } catch (err) {
      console.warn('Dashboard fetch error:', handleAPIError(err).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPeriodLoading(false);
    }
  };

  useEffect(() => { fetchDashboard('week'); }, []);

  const changePeriod = (p: Period) => {
    setPeriod(p);
    fetchDashboard(p);
  };

  const onRefresh = useCallback(() => fetchDashboard(period, true), [period]);

  // ── Chart config ─────────────────────────────────────────────────────────
  const chartConfig = {
    backgroundGradientFrom: WHITE,
    backgroundGradientTo: WHITE,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(233, 30, 99, ${opacity})`,
    labelColor: () => '#9CA3AF',
    propsForDots: { r: '3', strokeWidth: '2', stroke: PINK },
    fillShadowGradient: PINK,
    fillShadowGradientOpacity: 0.12,
    propsForBackgroundLines: { stroke: 'transparent' },
    propsForLabels: { fontSize: 9 },
  };

  const CHART_H_PAD = 24; // horizontal padding inside the card around the chart
  const chartWidth  = SW - 32 - CHART_H_PAD * 2; // card is SW-32, minus inner padding

  const chartData = data?.analytics?.chart ?? [];
  const chartValues = chartData.map(c => c.value || 0);
  const hasChartData = chartValues.some(v => v > 0);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <ActivityIndicator size="large" color={PINK} />
      </SafeAreaView>
    );
  }

  const wallet = data?.wallet ?? { balance: 0, escrow: 0, totalEarned: 0 };
  const stats = data?.stats ?? { totalBookings: 0, totalOrders: 0, averageRating: 0 };
  const analytics = data?.analytics;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: WHITE, paddingHorizontal: 20,
        paddingTop: 12, paddingBottom: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.75}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="menu" size={22} color="#1a1a1a" />
        </TouchableOpacity>

        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.3 }}>Dashboard</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.75}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="notifications" size={22} color="#1a1a1a" />
            <Badge count={unreadNotif} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatList')}
            activeOpacity={0.75}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chatbubble-ellipses" size={21} color="#1a1a1a" />
            <Badge count={unreadMsg} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: BG }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />
        }
      >
        {/* ── GREETING ────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, backgroundColor: WHITE, marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: '#9CA3AF', fontWeight: '500', marginBottom: 4 }}>
                {getGreeting()}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.5 }} numberOfLines={1}>
                {data?.businessName || 'Vendor'}
              </Text>
            </View>
            {data?.isActive && (
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5,
                borderRadius: 20, marginTop: 2,
              }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#059669', marginRight: 5 }} />
                <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700' }}>Active</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── LOOKREAL PAY CARD ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <LinearGradient
            colors={['#6D0B3C', '#C01070']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ borderRadius: 20, padding: 20, overflow: 'hidden', ...shadow(8) }}
          >
            {/* Watermark */}
            <Text style={{
              position: 'absolute', right: -8, top: 12,
              fontSize: 80, fontWeight: '900', color: 'rgba(255,255,255,0.06)',
              letterSpacing: -4,
            }}>LR</Text>

            {/* Card header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: PINK, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: WHITE, fontWeight: '900', fontSize: 16 }}>R</Text>
                </View>
                <Text style={{ color: WHITE, fontSize: 14, fontWeight: '700' }}>LookReal Pay</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Transactions')}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4,
                }}
              >
                <Text style={{ color: WHITE, fontSize: 12, fontWeight: '600' }}>History</Text>
                <Ionicons name="chevron-forward" size={12} color={WHITE} />
              </TouchableOpacity>
            </View>

            {/* Balance */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Available Balance</Text>
              <TouchableOpacity onPress={() => setShowBalance(p => !p)} activeOpacity={0.8}>
                <Ionicons
                  name={showBalance ? 'eye-outline' : 'eye-off-outline'}
                  size={16} color="rgba(255,255,255,0.75)"
                />
              </TouchableOpacity>
            </View>

            <Text style={{ color: WHITE, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginBottom: 14 }}>
              {showBalance ? fmt(wallet.balance) : '₦ ••••••'}
            </Text>

            {/* Escrow & Earned row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 3 }}>In Escrow</Text>
                <Text style={{ color: WHITE, fontWeight: '700', fontSize: 15 }}>
                  {showBalance ? fmt(wallet.escrow) : '₦ ••••'}
                </Text>
              </View>
              <View style={{ width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 3 }}>Total Earned</Text>
                <Text style={{ color: WHITE, fontWeight: '700', fontSize: 15 }}>
                  {showBalance ? fmt(wallet.totalEarned) : '₦ ••••'}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setFundingVisible(true)}
                activeOpacity={0.8}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
                  borderRadius: 30, paddingVertical: 12, gap: 6,
                }}
              >
                <Ionicons name="add" size={16} color={WHITE} />
                <Text style={{ color: WHITE, fontSize: 13, fontWeight: '700' }}>Funds Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (data?.vendorProfile?.kycStatus !== 'approved') { setKycVisible(true); return; }
                  setWithdrawalVisible(true);
                }}
                activeOpacity={0.8}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: WHITE, borderRadius: 30, paddingVertical: 12, gap: 6,
                  ...shadow(4),
                }}
              >
                <Ionicons name="arrow-up" size={16} color={PINK} />
                <Text style={{ color: PINK, fontSize: 13, fontWeight: '700' }}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* ── STATS ROW ───────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 16 }}>
          {[
            { icon: 'calendar-clear', iconBg: '#E0F2FE', iconColor: '#0284C7', value: stats.totalBookings, label: 'Bookings' },
            { icon: 'receipt', iconBg: '#D1FAE5', iconColor: '#059669', value: stats.totalOrders, label: 'Total Orders' },
            { icon: 'star', iconBg: '#FEF9C3', iconColor: '#CA8A04', value: stats.averageRating.toFixed(1), label: 'Ratings' },
          ].map((s, i) => (
            <View key={i} style={[{
              flex: 1, backgroundColor: WHITE, borderRadius: 16,
              padding: 14, alignItems: 'center',
            }, shadow(2)]}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: s.iconBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
              }}>
                <Ionicons name={s.icon as any} size={20} color={s.iconColor} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 }}>
                {s.value}
              </Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── QUICK ACTIONS ───────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 14, letterSpacing: -0.3 }}>
            Quick Action
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { icon: 'calendar-number-outline', label: 'Bookings', bg: '#E0F2FE', color: '#0284C7', onPress: () => navigation.navigate('Bookings' as any) },
              { icon: 'briefcase-outline', label: 'Add Service', bg: BG, color: PINK, onPress: () => navigation.navigate('Services' as any) },
              { icon: 'bag-handle-outline', label: 'Products', bg: '#EDE9FE', color: '#7C3AED', onPress: () => navigation.navigate('MyProducts') },
              { icon: 'analytics-outline', label: 'Analytics', bg: '#D1FAE5', color: '#059669', onPress: () => navigation.navigate('Analytics') },
            ].map((a, i) => (
              <TouchableOpacity
                key={i}
                onPress={a.onPress}
                activeOpacity={0.8}
                style={[{
                  flex: 1, backgroundColor: WHITE, borderRadius: 16,
                  paddingVertical: 14, alignItems: 'center', gap: 8,
                }, shadow(2)]}
              >
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={a.icon as any} size={19} color={a.color} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#374151', textAlign: 'center' }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── TODAY SCHEDULE ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.3 }}>
              Today Schedule
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bookings' as any)} activeOpacity={0.75}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: PINK }}>See All</Text>
            </TouchableOpacity>
          </View>

          {(data?.todaySchedule ?? []).length === 0 ? (
            <View style={[{
              backgroundColor: WHITE, borderRadius: 16, padding: 24,
              alignItems: 'center',
            }, shadow(2)]}>
              <Ionicons name="calendar-outline" size={36} color="#D1D5DB" />
              <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '500', marginTop: 10 }}>
                No bookings today
              </Text>
            </View>
          ) : (
            <View style={[{ backgroundColor: WHITE, borderRadius: 16, overflow: 'hidden' }, shadow(2)]}>
              {data!.todaySchedule.map((item, idx) => {
                const badge = statusConfig[item.status] ?? statusConfig.pending;
                const isLast = idx === data!.todaySchedule.length - 1;
                const timeStr = item.scheduledTime
                  ? (() => {
                      const [h, m] = item.scheduledTime.split(':').map(Number);
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      const hr = h % 12 || 12;
                      return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
                    })()
                  : '';

                return (
                  <View key={item._id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 14,
                    borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#F9FAFB',
                  }}>
                    {/* Avatar */}
                    {item.clientAvatar ? (
                      <Image
                        source={{ uri: item.clientAvatar }}
                        style={{ width: 46, height: 46, borderRadius: 23, marginRight: 12 }}
                      />
                    ) : (
                      <View style={{ marginRight: 12 }}>
                        <AvatarPlaceholder name={item.clientName} size={46} />
                      </View>
                    )}

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 }}>
                        {item.clientName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>{item.serviceName}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                        Today{timeStr ? ` · ${timeStr}` : ''}
                      </Text>
                    </View>

                    {/* Right: badge + price */}
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <View style={{ backgroundColor: badge.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: badge.color }}>{badge.label}</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a1a1a' }}>
                        {fmt(item.totalAmount)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── ANALYTICS ───────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          {/* Header + period tabs */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1a1a1a', letterSpacing: -0.3 }}>Analytics</Text>
            <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 30, padding: 3 }}>
              {(['today', 'week', 'month'] as Period[]).map(p => {
                const active = period === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => changePeriod(p)}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 28,
                      backgroundColor: active ? PINK : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? WHITE : '#6B7280' }}>
                      {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* overflow:hidden removed — it clips SVG labels on Android */}
          <View style={[{ backgroundColor: WHITE, borderRadius: 16 }, shadow(2)]}>
            {/* Metrics row */}
            {periodLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={PINK} />
              </View>
            ) : analytics ? (
              <>
                <View style={{ flexDirection: 'row', paddingTop: 16, paddingBottom: 12 }}>
                  {[
                    { label: 'Earnings', value: fmt(analytics.earnings.value), change: analytics.earnings.change },
                    { label: 'Bookings', value: analytics.bookings.value.toString(), change: analytics.bookings.change },
                    { label: 'Orders', value: analytics.orders.value.toString(), change: analytics.orders.change },
                  ].map((m, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
                      {i > 0 && (
                        <View style={{ position: 'absolute', left: 0, top: '10%', height: '80%', width: 1, backgroundColor: '#F3F4F6' }} />
                      )}
                      <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 4 }}>{m.label}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 3 }} numberOfLines={1} adjustsFontSizeToFit>
                        {m.value}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: m.change >= 0 ? '#059669' : '#DC2626' }}>
                        {m.change >= 0 ? '+' : ''}{m.change}%
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Line chart */}
                <View style={{ paddingHorizontal: CHART_H_PAD, paddingBottom: 12 }}>
                  <LineChart
                    data={{
                      labels: chartData.map(c => c.label),
                      datasets: [{ data: hasChartData ? chartValues : chartValues.map(() => 0), strokeWidth: 2 }],
                    }}
                    width={chartWidth}
                    height={190}
                    chartConfig={chartConfig}
                    bezier
                    withInnerLines={false}
                    withOuterLines={false}
                    fromZero
                    segments={4}
                    paddingRight={20}
                    xLabelsOffset={4}
                    formatYLabel={(val) => {
                      const n = parseInt(val, 10);
                      if (isNaN(n) || n === 0) return '0';
                      return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
                    }}
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* ── MODALS & SIDEBAR ──────────────────────────────────────────────── */}
      <VendorSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userName={data?.businessName || 'Vendor'}
        userEmail={data?.email || ''}
        userAvatar={data?.avatar}
      />
      <WalletFundingModal
        visible={fundingVisible}
        onClose={() => setFundingVisible(false)}
        onSuccess={() => fetchDashboard(period)}
        currentBalance={wallet.balance}
      />
      <WithdrawalModal
        visible={withdrawalVisible}
        onClose={() => setWithdrawalVisible(false)}
        onSuccess={() => fetchDashboard(period)}
        currentBalance={wallet.balance}
      />
      <KycGateModal
        visible={kycVisible}
        action="withdrawal"
        kycStatus={data?.vendorProfile?.kycStatus as any}
        onClose={() => setKycVisible(false)}
        onGoToKyc={() => { setKycVisible(false); navigation.navigate('VendorStoreSettings'); }}
      />
    </SafeAreaView>
  );
};

export default VendorDashboardScreen;
