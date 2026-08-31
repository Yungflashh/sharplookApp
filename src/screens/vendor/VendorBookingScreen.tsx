import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Image,
  StyleSheet, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const BG       = '#FFF5F9';
const CARD     = '#FFFFFF';
const PRIMARY  = '#E04079';
const PRI_DARK = '#B5315F';
const TEXT1    = '#1A1A2E';
const TEXT2    = '#6B7280';
const TEXT3    = '#9CA3AF';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type FilterKey = 'all' | 'pending' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

interface VendorBooking {
  _id: string;
  bookingNumber?: string;
  bookingType?: 'standard' | 'offer_based';
  service?: { _id: string; name: string };
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  scheduledDate: string;
  scheduledTime?: string;
  totalAmount: number;
  vendorAmount?: number;
  promoApplied?: boolean;
  promoBonusAmount?: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:     { label: 'Pending',     bg: '#FEF3C7', color: '#92400E' },
  accepted:    { label: 'Upcoming',    bg: '#D1FAE5', color: '#065F46' },
  in_progress: { label: 'In-Progress', bg: '#EDE9FE', color: '#5B21B6' },
  completed:   { label: 'Completed',   bg: '#DBEAFE', color: '#1E40AF' },
  cancelled:   { label: 'Cancelled',   bg: '#FEE2E2', color: '#991B1B' },
  disputed:    { label: 'Disputed',    bg: '#FFEDD5', color: '#9A3412' },
};

const TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',         label: 'All'         },
  { key: 'pending',     label: 'Pending'      },
  { key: 'upcoming',    label: 'Upcoming'     },
  { key: 'in_progress', label: 'In-progress'  },
  { key: 'completed',   label: 'Completed'    },
  { key: 'cancelled',   label: 'Cancelled'    },
];

const parseDateTime = (dateStr: string, timeStr?: string): Date => {
  const d = new Date(dateStr);
  if (timeStr) {
    const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const p = m[3]?.toUpperCase();
      if (p === 'PM' && h !== 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
      d.setHours(h, min, 0, 0);
    }
  }
  return d;
};

const getCountdown = (target: Date) => {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hrs:  Math.floor((diff % 86400000) / 3600000),
    min:  Math.floor((diff % 3600000) / 60000),
  };
};

const toAMPM = (time: string): string => {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const formatCardDate = (dateStr: string, time?: string): string => {
  const date = new Date(dateStr);
  const todayStart = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const tomStart   = new Date(todayStart.getTime() + 86400000);
  const bookDay    = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  let label = '';
  if (bookDay.getTime() === todayStart.getTime())    label = 'Today';
  else if (bookDay.getTime() === tomStart.getTime()) label = 'Tomorrow';
  else label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return time ? `${label} · ${toAMPM(time)}` : label;
};

const AvatarCircle: React.FC<{ uri?: string; name: string; size?: number }> = ({ uri, name, size = 48 }) => {
  const initial = (name || 'C').charAt(0).toUpperCase();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <LinearGradient
      colors={[PRIMARY, PRI_DARK]}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '800' }}>{initial}</Text>
    </LinearGradient>
  );
};

const CountBox: React.FC<{ val: number; unit: string }> = ({ val, unit }) => (
  <View style={ss.countBox}>
    <Text style={ss.countVal}>{String(val).padStart(2, '0')}</Text>
    <Text style={ss.countUnit}>{unit}</Text>
  </View>
);

const VendorBookingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings]     = useState<VendorBooking[]>([]);
  const [activeTab, setActiveTab]   = useState<FilterKey>('all');
  const [, setTick]                 = useState(0); // drives 30s countdown refresh

  const fetchBookings = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await bookingAPI.getMyBookings({ role: 'vendor', page: 1, limit: 50 });
      if (res.success) {
        const data: VendorBooking[] = Array.isArray(res.data) ? res.data : res.data.bookings || [];
        setBookings(data);
      }
    } catch (e) {
      toast.error('Error', handleAPIError(e).message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchBookings(); }, [fetchBookings]));

  // Force re-render every 30s so countdown numbers stay current
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Derive next booking and countdown directly from bookings state
  const now = new Date();
  const nextCandidate = bookings
    .filter((b) => b.status === 'accepted')
    .map((b) => ({ b, target: parseDateTime(b.scheduledDate, b.scheduledTime) }))
    .filter(({ target }) => target > now)
    .sort((a, c) => a.target.getTime() - c.target.getTime())[0] ?? null;
  const nextBooking = nextCandidate?.b ?? null;
  const countdown   = nextCandidate ? getCountdown(nextCandidate.target) : null;

  const filtered = bookings.filter((b) => {
    if (activeTab === 'all')      return true;
    if (activeTab === 'upcoming') return b.status === 'accepted';
    return b.status === activeTab;
  });

  const getClientName = (b: VendorBooking) =>
    `${b.client?.firstName ?? ''} ${b.client?.lastName ?? ''}`.trim() || 'Client';

  // Pending count for badge
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  if (loading) {
    return (
      <View style={[ss.flex, { backgroundColor: BG, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={[ss.flex, { backgroundColor: BG, paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={ss.header}>
        <View>
          <Text style={ss.headerTitle}>Bookings</Text>
          {pendingCount > 0 && (
            <Text style={ss.headerSub}>{pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'}</Text>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ss.tabsRow}
        style={{ flexGrow: 0 }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[ss.tab, isActive && ss.tabActive]}
              activeOpacity={0.8}
            >
              <Text style={[ss.tabTxt, isActive && ss.tabTxtActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Scrollable list */}
      <ScrollView
        style={ss.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 90 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchBookings(true); }}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* Countdown banner */}
        {nextBooking && countdown && (
          <TouchableOpacity
            style={ss.banner}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: nextBooking._id })}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={ss.bannerLabel}>Next Appointment In</Text>
              <Text style={ss.bannerName} numberOfLines={1}>{getClientName(nextBooking)}</Text>
            </View>
            <View style={ss.countRow}>
              <CountBox val={countdown.days} unit="days" />
              <CountBox val={countdown.hrs}  unit="Hrs"  />
              <CountBox val={countdown.min}  unit="min"  />
            </View>
          </TouchableOpacity>
        )}

        {/* Cards */}
        {filtered.length === 0 ? (
          <View style={ss.empty}>
            <LinearGradient colors={[PRIMARY, PRI_DARK]} style={ss.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={38} color="#fff" />
            </LinearGradient>
            <Text style={ss.emptyTitle}>
              {activeTab === 'all' ? 'No Bookings Yet' : `No ${TABS.find((t) => t.key === activeTab)?.label ?? ''} Bookings`}
            </Text>
            <Text style={ss.emptyText}>
              {activeTab === 'all'
                ? "You haven't received any bookings yet."
                : `No ${activeTab.replace('_', ' ')} bookings at the moment.`}
            </Text>
          </View>
        ) : (
          filtered.map((booking) => {
            const cfg = STATUS_MAP[booking.status.toLowerCase()] ?? { label: booking.status, bg: '#F3F4F6', color: '#374151' };
            const clientName  = getClientName(booking);
            const serviceName = booking.service?.name || 'Service';

            return (
              <TouchableOpacity
                key={booking._id}
                style={ss.card}
                onPress={() => navigation.navigate('BookingDetail', { bookingId: booking._id })}
                activeOpacity={0.85}
              >
                <AvatarCircle uri={booking.client?.avatar} name={clientName} />
                <View style={ss.cardMid}>
                  <Text style={ss.cardName} numberOfLines={1}>{clientName}</Text>
                  <Text style={ss.cardService} numberOfLines={1}>{serviceName}</Text>
                  <Text style={ss.cardDate}>{formatCardDate(booking.scheduledDate, booking.scheduledTime)}</Text>
                </View>
                <View style={ss.cardRight}>
                  <View style={[ss.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[ss.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={ss.cardPrice}>₦{(booking.vendorAmount ?? booking.totalAmount).toLocaleString()}</Text>
                  {booking.promoApplied && (
                    <View style={ss.promoTag}>
                      <Ionicons name="gift" size={10} color="#B5315F" />
                      <Text style={ss.promoTagTxt}>Promo · +₦{(booking.promoBonusAmount ?? 0).toLocaleString()} bonus</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const ss = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT1,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
    marginTop: 2,
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E0E8',
  },
  tabActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  tabTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT2,
  },
  tabTxtActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  banner: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: PRIMARY,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  bannerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginBottom: 5,
  },
  bannerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  countRow: {
    flexDirection: 'row',
    gap: 5,
  },
  countBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
    minWidth: 44,
  },
  countVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  countUnit: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'lowercase',
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardMid: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT1,
    marginBottom: 2,
  },
  cardService: {
    fontSize: 12,
    color: TEXT2,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: TEXT3,
    fontWeight: '500',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeTxt: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT1,
  },
  promoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  promoTagTxt: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B5315F',
  },

  empty: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT1,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 13,
    color: TEXT2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
});

export default VendorBookingsScreen;
