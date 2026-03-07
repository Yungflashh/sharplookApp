import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StatusBar,
  Animated, Dimensions, RefreshControl, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation.types';
import VendorSidebar from '@/components/VendorSidebar';
import {
  vendorAPI, walletAPI, bookingAPI, servicesAPI, handleAPIError,
  userAPI, notificationAPI, messageAPI, analyticsAPI,
} from '@/api/api';
import socketService from '@/services/socket.service';
import WalletFundingModal from '@/components/WalletFundingModal';
import WithdrawalModal from '@/components/WIthdrawalModal';
import { toast } from '@/components/ui/Toast';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  blue: '#3B82F6', blueSoft: '#DBEAFE',
  green: '#10B981', greenSoft: '#D1FAE5',
  gold: '#F59E0B', goldSoft: '#FEF3C7',
  orange: '#F97316', orangeSoft: '#FFEDD5',
  purple: '#8B5CF6', purpleSoft: '#EDE9FE',
  red: '#EF4444', redSoft: '#FEE2E2',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 52) / 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shadow = (color = '#000', opacity = 0.07, radius = 8, y = 2) =>
  Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: radius },
    android: { elevation: Math.round(radius / 2) },
  });

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning 👋';
  if (h < 18) return 'Good afternoon 👋';
  return 'Good evening 👋';
};

const getTimeAgo = (date: Date | string) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000), hr = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${d}d ago`;
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Nav = StackNavigationProp<RootStackParamList, 'Main'>;

interface Stat { label: string; value: string; change: string; isPositive: boolean }
interface VendorProfile {
  businessName: string; businessDescription?: string; rating?: number;
  totalReviews?: number; isActive?: boolean; createdAt?: string;
  firstName?: string; lastName?: string; email?: string;
  walletBalance?: number; avatar?: string;
}
interface WalletData { balance: number; pendingBalance: number; totalEarnings: number }
interface RecentActivity { icon: string; title: string; subtitle: string; time: string; color: string }

// ─── Perf Card ────────────────────────────────────────────────────────────────
const PerfCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string; iconColor: string;
  label: string; value: string;
  badgeText: string; badgeGood: boolean;
  barColor: string; barWidth: number;
}> = ({ icon, iconBg, iconColor, label, value, badgeText, badgeGood, barColor, barWidth }) => (
  <View style={[{ backgroundColor: BRAND.surface, borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: BRAND.border }, shadow()]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name={icon} size={19} color={iconColor} />
        </View>
        <View>
          <Text style={{ fontSize: 11, color: BRAND.textMuted, fontWeight: '500', marginBottom: 2 }}>{label}</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.4 }}>{value}</Text>
        </View>
      </View>
      <View style={{ backgroundColor: badgeGood ? BRAND.greenSoft : BRAND.goldSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: badgeGood ? '#065F46' : '#92400E' }}>{badgeText}</Text>
      </View>
    </View>
    <View style={{ height: 4, backgroundColor: BRAND.border, borderRadius: 2 }}>
      <View style={{ height: 4, width: `${Math.min(barWidth, 100)}%`, backgroundColor: barColor, borderRadius: 2 }} />
    </View>
  </View>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;
  return (
    <View style={{
      position: 'absolute', top: -2, right: -2,
      minWidth: 17, height: 17, borderRadius: 9,
      backgroundColor: BRAND.primary,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 3,
      ...shadow(BRAND.primary, 0.35, 4, 2),
    }}>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const VendorDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [showBalance, setShowBalance]               = useState(false);
  const [refreshing, setRefreshing]                 = useState(false);
  const [selectedPeriod, setSelectedPeriod]         = useState<'day' | 'week' | 'month'>('week');
  const [sidebarVisible, setSidebarVisible]         = useState(false);
  const [loading, setLoading]                       = useState(true);
  const [vendorProfile, setVendorProfile]           = useState<VendorProfile | null>(null);
  const [fundingModalVisible, setFundingModalVisible]   = useState(false);
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const [walletData, setWalletData]                 = useState<WalletData>({ balance: 0, pendingBalance: 0, totalEarnings: 0 });
  const [servicesData, setServicesData]             = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount]         = useState(0);
  const [analyticsData, setAnalyticsData]           = useState<any>(null);
  const [stats, setStats]                           = useState<Stat[]>([
    { label: 'Total Orders',    value: '0',   change: '+0%', isPositive: true },
    { label: 'Active Services', value: '0',   change: '+0',  isPositive: true },
    { label: 'Avg. Rating',     value: '0.0', change: '+0.0',isPositive: true },
    { label: 'Response Rate',   value: '0%',  change: '0%',  isPositive: true },
  ]);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  // ── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    socketService.connect();
    socketService.onNewMessage(() => setUnreadMessagesCount((p) => p + 1));
    return () => socketService.removeListener('message:new');
  }, []);

  useFocusEffect(useCallback(() => {
    fetchUnreadNotificationCount();
    fetchUnreadMessagesCount();
    if (!socketService.isSocketConnected()) socketService.connect();
    const interval = setInterval(() => {
      fetchUnreadNotificationCount();
      fetchUnreadMessagesCount();
    }, 30000);
    return () => clearInterval(interval);
  }, []));

  // ── Animations ───────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => { fetchDashboardData(); }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchUnreadNotificationCount = async () => {
    try {
      const r = await notificationAPI.getUnreadCount();
      const c = r.data?.count ?? r.data?.data?.count ?? r.count ?? 0;
      setUnreadNotificationCount(c);
    } catch {}
  };

  const fetchUnreadMessagesCount = async () => {
    try {
      const r = await messageAPI.getUnreadCount();
      const c = r.data?.unreadCount ?? r.unreadCount ?? 0;
      setUnreadMessagesCount(c);
    } catch {}
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const profileRes = await userAPI.getProfile();
      if (profileRes.success) {
        const u = profileRes.data.user || profileRes.data;
        setVendorProfile(u);
        if (u.walletBalance !== undefined)
          setWalletData({ balance: u.walletBalance, pendingBalance: 0, totalEarnings: u.walletBalance });
      }

      const bookingsRes = await vendorAPI.getStats();
      if (bookingsRes.success) {
        const s = bookingsRes.data?.stats || bookingsRes.data || {};
        if (s.total !== undefined) {
          setStats((p) => {
            const n = [...p];
            n[0] = { label: 'Total Bookings', value: s.total?.toString() || '0', change: `${s.pending || 0} pending`, isPositive: true };
            n[3] = { label: 'Completed', value: s.completed?.toString() || '0', change: `${Math.round((s.completed / (s.total || 1)) * 100)}%`, isPositive: true };
            return n;
          });
        }
      }

      const servicesRes = await servicesAPI.getMyServices();
      if (servicesRes.success) {
        const arr = servicesRes.data?.services || servicesRes.data || [];
        const list = Array.isArray(arr) ? arr : [];
        setServicesData(list);
        const active = list.filter((s: any) => s.isActive !== false).length;
        setStats((p) => { const n = [...p]; n[1] = { label: 'Active Services', value: active.toString(), change: `${list.length} total`, isPositive: active > 0 }; return n; });
      }

      try {
        const analyticsRes = await analyticsAPI.getVendorAnalytics({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        });
        if (analyticsRes.success) {
          setAnalyticsData(analyticsRes.data);
          const a = analyticsRes.data;
          setStats((p) => {
            const n = [...p];
            if (a.reviews?.averageRating)
              n[2] = { label: 'Avg. Rating', value: a.reviews.averageRating.toFixed(1), change: `${a.reviews.total} reviews`, isPositive: a.reviews.averageRating >= 4 };
            if (a.performance?.acceptanceRate !== undefined)
              n[3] = { label: 'Acceptance Rate', value: `${a.performance.acceptanceRate.toFixed(0)}%`, change: a.performance.completionRate ? `${a.performance.completionRate.toFixed(0)}% done` : '0%', isPositive: a.performance.acceptanceRate >= 80 };
            return n;
          });
        }
      } catch {}

      await fetchUnreadNotificationCount();
      await fetchUnreadMessagesCount();
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally { setLoading(false); }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  }, []);

  const formatBalance = (n: number) => `₦${n.toLocaleString()}`;

  const displayName = vendorProfile?.businessName || vendorProfile?.firstName || 'User';
  const p = analyticsData?.performance;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={[{
        backgroundColor: BRAND.surface,
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: BRAND.border,
      }, shadow('#000', 0.05, 8, 2)]}>

        {/* Menu */}
        <TouchableOpacity
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.75}
          style={{
            width: 40, height: 40, borderRadius: 13,
            backgroundColor: BRAND.primarySoft,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="menu" size={22} color={BRAND.primary} />
        </TouchableOpacity>

        <Text style={{ fontSize: 17, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.3 }}>
          Dashboard
        </Text>

        {/* Icon row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatList')}
            activeOpacity={0.75}
            style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: BRAND.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.border }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={BRAND.primary} />
            <Badge count={unreadMessagesCount} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.75}
            style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: BRAND.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.border }}
          >
            <Ionicons name="notifications-outline" size={20} color={BRAND.primary} />
            <Badge count={unreadNotificationCount} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}
      >
        {/* ── GREETING ─────────────────────────────────────────────────────── */}
        <Animated.View style={{
          backgroundColor: BRAND.surface,
          paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18,
          borderBottomWidth: 1, borderBottomColor: BRAND.border,
          opacity: fadeAnim, transform: [{ translateY: slideAnim }],
        }}>
          <Text style={{ fontSize: 13, color: BRAND.textMuted, fontWeight: '500', marginBottom: 4 }}>{getGreeting()}</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5, marginBottom: 10 }}>
            {displayName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.greenSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND.green, marginRight: 5 }} />
              <Text style={{ color: '#065F46', fontSize: 11, fontWeight: '700' }}>
                {vendorProfile?.isActive !== false ? 'Active' : 'Inactive'}
              </Text>
            </View>
            {vendorProfile?.createdAt && (
              <Text style={{ color: BRAND.textMuted, fontSize: 12, fontWeight: '500' }}>
                Since {new Date(vendorProfile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* ── WALLET CARD ───────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4 }}>
          <LinearGradient
            colors={[BRAND.primary, BRAND.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24, padding: 22, overflow: 'hidden',
              ...shadow(BRAND.primary, 0.3, 18, 8),
            }}
          >
            {/* Top row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Total Balance</Text>
                <TouchableOpacity
                  onPress={() => setShowBalance(!showBalance)}
                  activeOpacity={0.8}
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={showBalance ? 'eye-outline' : 'eye-off-outline'} size={15} color="#fff" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Transactions')}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>History</Text>
                <Ionicons name="chevron-forward" size={13} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Balance display */}
            <View style={{ marginBottom: 22 }}>
              {showBalance ? (
                <>
                  <Text style={{ color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 10 }}>
                    {formatBalance(walletData.balance)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View>
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginBottom: 2 }}>Pending</Text>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{formatBalance(walletData.pendingBalance)}</Text>
                    </View>
                    <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' }} />
                    <View>
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginBottom: 2 }}>Total Earned</Text>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{formatBalance(walletData.totalEarnings)}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: 4, marginBottom: 6 }}>••••••</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Tap eye icon to reveal</Text>
                </>
              )}
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setFundingModalVisible(true)}
                activeOpacity={0.8}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, paddingVertical: 14, gap: 8,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                }}
              >
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="add" size={18} color="#fff" />
                </View>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Fund Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setWithdrawalModalVisible(true)}
                activeOpacity={0.8}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: BRAND.surface, borderRadius: 18, paddingVertical: 14, gap: 8,
                  ...shadow(BRAND.primaryDark, 0.2, 8, 4),
                }}
              >
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="arrow-up" size={18} color={BRAND.primary} />
                </View>
                <Text style={{ color: BRAND.textPrimary, fontSize: 13, fontWeight: '700' }}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* ── QUICK ACTIONS ─────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 14, letterSpacing: -0.3 }}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { title: 'Add Service', icon: 'add-circle-outline' as const, iconColor: BRAND.primary, bg: BRAND.primarySoft, onPress: () => navigation.navigate('Services') },
              { title: 'Bookings',    icon: 'calendar-outline'   as const, iconColor: BRAND.blue,    bg: BRAND.blueSoft,    onPress: () => navigation.navigate('Bookings')  },
            ].map((action, i) => (
              <TouchableOpacity
                key={i}
                onPress={action.onPress}
                activeOpacity={0.8}
                style={{ flex: 1 }}
              >
                <Animated.View style={[{
                  backgroundColor: BRAND.surface,
                  borderRadius: 18, paddingVertical: 18,
                  alignItems: 'center',
                  borderWidth: 1, borderColor: BRAND.border,
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }, shadow()]}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: action.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Ionicons name={action.icon} size={22} color={action.iconColor} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>{action.title}</Text>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── STATS GRID ────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          {/* Period selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.3 }}>Performance</Text>
            <View style={{ flexDirection: 'row', backgroundColor: BRAND.border, borderRadius: 12, padding: 3 }}>
              {(['day', 'week', 'month'] as const).map((period) => {
                const active = selectedPeriod === period;
                return (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setSelectedPeriod(period)}
                    activeOpacity={0.75}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9,
                      backgroundColor: active ? BRAND.surface : 'transparent',
                      ...( active ? shadow() : {}),
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? BRAND.primary : BRAND.textMuted }}>
                      {period === 'day' ? 'Today' : period === 'week' ? 'Week' : 'Month'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 2-column stat cards */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {stats.map((stat, i) => (
              <View key={i} style={[{
                width: CARD_W,
                backgroundColor: BRAND.surface,
                borderRadius: 18, padding: 16,
                borderWidth: 1, borderColor: BRAND.border,
              }, shadow()]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, color: BRAND.textMuted, fontWeight: '500' }}>{stat.label}</Text>
                  <View style={{ backgroundColor: stat.isPositive ? BRAND.greenSoft : BRAND.redSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Ionicons name={stat.isPositive ? 'trending-up' : 'trending-down'} size={10} color={stat.isPositive ? BRAND.green : BRAND.red} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: stat.isPositive ? '#065F46' : '#991B1B' }}>{stat.change}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 }}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── PERFORMANCE DASHBOARD ─────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.3 }}>Analytics</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Analytics')} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.primary }}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={BRAND.primary} />
            </TouchableOpacity>
          </View>

          {p ? (
            <>
              <PerfCard
                icon="checkmark-circle-outline" iconBg={BRAND.greenSoft} iconColor={BRAND.green}
                label="Acceptance Rate" value={`${p.acceptanceRate.toFixed(0)}%`}
                badgeText={p.acceptanceRate >= 80 ? 'Excellent' : 'Good'} badgeGood={p.acceptanceRate >= 80}
                barColor={BRAND.green} barWidth={p.acceptanceRate}
              />
              <PerfCard
                icon="flag-outline" iconBg={BRAND.purpleSoft} iconColor={BRAND.purple}
                label="Completion Rate" value={`${p.completionRate.toFixed(0)}%`}
                badgeText={p.completionRate >= 90 ? 'Excellent' : 'Good'} badgeGood={p.completionRate >= 90}
                barColor={BRAND.purple} barWidth={p.completionRate}
              />
              <PerfCard
                icon="time-outline" iconBg={BRAND.blueSoft} iconColor={BRAND.blue}
                label="Avg Response Time" value={`${p.responseTime.toFixed(1)}h`}
                badgeText={p.responseTime <= 2 ? 'Fast' : 'Moderate'} badgeGood={p.responseTime <= 2}
                barColor={BRAND.blue} barWidth={Math.min((24 / (p.responseTime || 1)) * 100, 100)}
              />
              <PerfCard
                icon="happy-outline" iconBg={BRAND.primarySoft} iconColor={BRAND.primary}
                label="Customer Satisfaction" value={`${p.customerSatisfactionScore.toFixed(0)}%`}
                badgeText={p.customerSatisfactionScore >= 85 ? 'Excellent' : 'Good'} badgeGood={p.customerSatisfactionScore >= 85}
                barColor={BRAND.primary} barWidth={p.customerSatisfactionScore}
              />
              <PerfCard
                icon="rocket-outline" iconBg={BRAND.goldSoft} iconColor={BRAND.gold}
                label="On-Time Delivery" value={`${p.onTimeDeliveryRate.toFixed(0)}%`}
                badgeText={p.onTimeDeliveryRate >= 90 ? 'Excellent' : 'Good'} badgeGood={p.onTimeDeliveryRate >= 90}
                barColor={BRAND.gold} barWidth={p.onTimeDeliveryRate}
              />
            </>
          ) : servicesData.length === 0 ? (
            <TouchableOpacity onPress={() => navigation.navigate('Services')} activeOpacity={0.8}>
              <LinearGradient
                colors={[BRAND.primarySoft, '#FDF2F8']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ borderRadius: 18, padding: 18, borderWidth: 1, borderColor: BRAND.primaryMuted }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
                  <Ionicons name="add-circle" size={22} color={BRAND.primary} />
                  <Text style={{ color: BRAND.primary, fontWeight: '700', fontSize: 14 }}>Add Your First Service</Text>
                </View>
                <Text style={{ color: BRAND.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                  Start earning today by adding your services
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[{
              backgroundColor: BRAND.surface,
              borderRadius: 18, padding: 16,
              flexDirection: 'row', alignItems: 'center',
              borderWidth: 1, borderColor: BRAND.border,
            }, shadow()]}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: BRAND.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Ionicons name="checkmark-circle" size={22} color={BRAND.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 2 }}>Active Services</Text>
                <Text style={{ fontSize: 12, color: BRAND.textMuted }}>{servicesData.length} service{servicesData.length > 1 ? 's' : ''} available</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Services')}
                activeOpacity={0.8}
                style={{ backgroundColor: BRAND.greenSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}
              >
                <Text style={{ color: '#065F46', fontSize: 12, fontWeight: '700' }}>Manage</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── MODALS & SIDEBAR ─────────────────────────────────────────────────── */}
      <VendorSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userName={displayName}
        userEmail={vendorProfile?.email || 'vendor@example.com'}
        userAvatar={vendorProfile?.avatar}
      />
      <WalletFundingModal
        visible={fundingModalVisible}
        onClose={() => setFundingModalVisible(false)}
        onSuccess={fetchDashboardData}
        currentBalance={walletData.balance}
      />
      <WithdrawalModal
        visible={withdrawalModalVisible}
        onClose={() => setWithdrawalModalVisible(false)}
        onSuccess={fetchDashboardData}
        currentBalance={walletData.balance}
      />
    </SafeAreaView>
  );
};

export default VendorDashboardScreen;