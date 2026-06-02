import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  gold: '#F59E0B',
  goldSoft: '#FEF3C7',
  blue: '#3B82F6',
  blueSoft: '#DBEAFE',
  green: '#10B981',
  greenSoft: '#D1FAE5',
  purple: '#8B5CF6',
  purpleSoft: '#EDE9FE',
  orange: '#F97316',
  orangeSoft: '#FFEDD5',
  red: '#EF4444',
  redSoft: '#FEE2E2',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type FilterTab = 'all' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

interface Booking {
  _id: string;
  bookingNumber?: string;
  bookingType?: 'standard' | 'offer_based';
  service?: { _id: string; name: string; images?: string[] };
  offer?: string | { _id: string; title?: string; images?: string[] };
  vendor: {
    _id: string;
    firstName: string;
    lastName: string;
    vendorProfile?: { businessName: string };
  };
  scheduledDate: string;
  scheduledTime?: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; dot: string }
> = {
  pending: {
    bg: '#FEF3C7',
    text: '#92400E',
    icon: 'time-outline',
    iconColor: '#D97706',
    dot: '#F59E0B',
  },
  accepted: {
    bg: '#DBEAFE',
    text: '#1E40AF',
    icon: 'checkmark-circle-outline',
    iconColor: '#2563EB',
    dot: '#3B82F6',
  },
  in_progress: {
    bg: '#EDE9FE',
    text: '#5B21B6',
    icon: 'hourglass-outline',
    iconColor: '#7C3AED',
    dot: '#8B5CF6',
  },
  completed: {
    bg: '#D1FAE5',
    text: '#065F46',
    icon: 'checkmark-done-circle-outline',
    iconColor: '#059669',
    dot: '#10B981',
  },
  cancelled: {
    bg: '#FEE2E2',
    text: '#991B1B',
    icon: 'close-circle-outline',
    iconColor: '#DC2626',
    dot: '#EF4444',
  },
};

const getStatusConfig = (status: string) =>
  STATUS_CONFIG[status.toLowerCase()] || {
    bg: BRAND.border,
    text: BRAND.textSecondary,
    icon: 'help-circle-outline' as const,
    iconColor: BRAND.textMuted,
    dot: BRAND.textMuted,
  };

const formatStatus = (s: string) =>
  s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// ─── Sub-components ───────────────────────────────────────────────────────────



/** Info row inside booking card */
const InfoChip: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}> = ({ icon, label, value, iconColor, iconBg }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: iconBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
    }}
  >
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: `${iconColor}22`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
      }}
    >
      <Ionicons name={icon} size={14} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 10,
          color: iconColor,
          fontWeight: '700',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary }}>{value}</Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);

  const searchBorderAnim = new Animated.Value(0);

  const handleSearchFocus = (focused: boolean) => {
    setSearchFocused(focused);
    Animated.timing(searchBorderAnim, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const getServiceName = (booking: Booking): string => {
    if (booking.service?.name) return booking.service.name;
    if (booking.offer && typeof booking.offer === 'object' && booking.offer.title)
      return booking.offer.title;
    return 'Custom Service Offer';
  };

  const fetchBookings = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const response = await bookingAPI.getMyBookings({
        role: 'client',
        page: pageNum,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (response.success) {
        const newBookings = Array.isArray(response.data)
          ? response.data
          : response.data.bookings || [];
        setBookings((prev) => {
          if (!append) return newBookings;
          const existingIds = new Set(prev.map((b) => b._id));
          const unique = newBookings.filter((b: Booking) => !existingIds.has(b._id));
          return [...prev, ...unique];
        });
        setHasMore(response.meta?.pagination?.hasNextPage ?? newBookings.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);
  useFocusEffect(useCallback(() => { fetchBookings(1, false); }, []));

  useEffect(() => {
    let filtered = bookings;
    if (activeFilter !== 'all') {
      filtered = filtered.filter((b) =>
        activeFilter === 'accepted'
          ? ['accepted', 'in_progress'].includes(b.status.toLowerCase())
          : b.status.toLowerCase() === activeFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((b) => {
        const sn = getServiceName(b).toLowerCase();
        const vn = (
          b.vendor?.vendorProfile?.businessName ||
          `${b.vendor?.firstName || ''} ${b.vendor?.lastName || ''}`.trim()
        ).toLowerCase();
        return sn.includes(q) || vn.includes(q) || (b.bookingNumber?.toLowerCase() || '').includes(q);
      });
    }
    setFilteredBookings(filtered);
  }, [bookings, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(1, false).finally(() => setRefreshing(false));
  }, []);

  const loadMore = () => { if (!loading && hasMore) fetchBookings(page + 1, true); };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatPrice = (p: number) => `₦${p.toLocaleString()}`;

  const getStats = () => ({
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    active: bookings.filter((b) => ['accepted', 'in_progress'].includes(b.status)).length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  });

  const stats = getStats();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading && page === 1) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>
            Loading bookings…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: BRAND.surface,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: BRAND.border,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 3 },
          }),
        }}
      >
        {/* Row 1: title + actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 }}>
            My Bookings
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* My Offers */}
            <TouchableOpacity
              onPress={() => navigation.navigate('MyOffers')}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: BRAND.primarySoft,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: BRAND.primaryMuted,
              }}
            >
              <Ionicons name="pricetag-outline" size={15} color={BRAND.primary} />
              <Text style={{ marginLeft: 5, color: BRAND.primary, fontWeight: '700', fontSize: 13 }}>
                Offers
              </Text>
            </TouchableOpacity>

            {/* Create Offer */}
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateOffer')}
              activeOpacity={0.8}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: BRAND.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: BRAND.primaryMuted,
              }}
            >
              <Ionicons name="add" size={22} color={BRAND.primary} />
            </TouchableOpacity>

            {/* Explore */}
            <TouchableOpacity
              onPress={() => navigation.navigate('AllVendors')}
              activeOpacity={0.8}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={[BRAND.primary, BRAND.primaryDark]}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="search-outline" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: search */}
        <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: BRAND.surfaceAlt,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 11 : 9,
            marginBottom: 14,
            borderWidth: 1.5,
            borderColor: searchFocused ? BRAND.primary : BRAND.border,
          }}
        >
          <Ionicons name="search-outline" size={18} color={searchFocused ? BRAND.primary : BRAND.textMuted} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 9,
              fontSize: 14,
              color: BRAND.textPrimary,
              paddingVertical: 0,
            }}
            placeholder="Search by service, vendor or ID…"
            placeholderTextColor={BRAND.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => handleSearchFocus(true)}
            onBlur={() => handleSearchFocus(false)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={BRAND.textMuted} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Row 3: filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(
            [
              { key: 'all', label: 'All', count: stats.total },
              { key: 'pending', label: 'Pending', count: stats.pending },
              { key: 'accepted', label: 'Active', count: stats.active },
              { key: 'completed', label: 'Completed', count: stats.completed },
              { key: 'cancelled', label: 'Cancelled', count: stats.cancelled },
            ] as { key: FilterTab; label: string; count: number }[]
          ).map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.75}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isActive ? BRAND.primary : BRAND.surfaceAlt,
                  borderWidth: 1,
                  borderColor: isActive ? BRAND.primary : BRAND.borderStrong,
                  ...Platform.select({
                    ios: isActive
                      ? { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 }
                      : {},
                    android: isActive ? { elevation: 3 } : {},
                  }),
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: isActive ? '#fff' : BRAND.textSecondary,
                  }}
                >
                  {f.label}{f.count > 0 ? ` (${f.count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>



      {/* ── LIST ─────────────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) loadMore();
        }}
        scrollEventThrottle={400}
      >
        {filteredBookings.length > 0 ? (
          <>
            {filteredBookings.map((booking, index) => {
              const serviceName = getServiceName(booking);
              const sc = getStatusConfig(booking.status);
              const vendorName =
                booking.vendor?.vendorProfile?.businessName ||
                `${booking.vendor?.firstName || ''} ${booking.vendor?.lastName || ''}`.trim() ||
                'Vendor';

              return (
                <TouchableOpacity
                  key={`${booking._id}-${index}`}
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: booking._id })}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: BRAND.surface,
                    borderRadius: 20,
                    marginBottom: 14,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: BRAND.border,
                    ...Platform.select({
                      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
                      android: { elevation: 3 },
                    }),
                  }}
                >
                  {/* Colored top accent bar */}
                  <View style={{ height: 3, backgroundColor: sc.dot }} />

                  <View style={{ padding: 16 }}>
                    {/* Card header */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                      {/* Service icon placeholder */}
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: BRAND.primarySoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                          borderWidth: 1,
                          borderColor: BRAND.primaryMuted,
                        }}
                      >
                        <Ionicons name="sparkles-outline" size={20} color={BRAND.primary} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: BRAND.textPrimary,
                            marginBottom: 3,
                            letterSpacing: -0.2,
                          }}
                          numberOfLines={2}
                        >
                          {serviceName}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: BRAND.primary,
                              marginRight: 5,
                            }}
                          />
                          <Text
                            style={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: '500' }}
                            numberOfLines={1}
                          >
                            {vendorName}
                          </Text>
                        </View>
                      </View>

                      {/* Status badge */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: sc.bg,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 10,
                          marginLeft: 8,
                        }}
                      >
                        <Ionicons name={sc.icon} size={12} color={sc.iconColor} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: sc.text,
                            marginLeft: 4,
                          }}
                        >
                          {formatStatus(booking.status)}
                        </Text>
                      </View>
                    </View>

                    {/* Info chips */}
                    <View style={{ gap: 8, marginBottom: 12 }}>
                      <InfoChip
                        icon="calendar-outline"
                        label="Scheduled"
                        value={`${formatDate(booking.scheduledDate)}${booking.scheduledTime ? ` · ${booking.scheduledTime}` : ''}`}
                        iconColor={BRAND.blue}
                        iconBg={BRAND.blueSoft}
                      />

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <InfoChip
                            icon="cash-outline"
                            label="Amount"
                            value={formatPrice(booking.totalAmount)}
                            iconColor={BRAND.primary}
                            iconBg={BRAND.primarySoft}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor:
                                booking.paymentStatus === 'paid'
                                  ? BRAND.greenSoft
                                  : booking.paymentStatus === 'pending'
                                  ? BRAND.goldSoft
                                  : BRAND.border,
                              borderRadius: 12,
                              paddingHorizontal: 12,
                              paddingVertical: 9,
                              flex: 1,
                            }}
                          >
                            <View
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 9,
                                backgroundColor:
                                  booking.paymentStatus === 'paid'
                                    ? `${BRAND.green}22`
                                    : booking.paymentStatus === 'pending'
                                    ? `${BRAND.gold}22`
                                    : `${BRAND.textMuted}22`,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10,
                              }}
                            >
                              <Ionicons
                                name={booking.paymentStatus === 'paid' ? 'shield-checkmark-outline' : 'card-outline'}
                                size={14}
                                color={
                                  booking.paymentStatus === 'paid'
                                    ? BRAND.green
                                    : booking.paymentStatus === 'pending'
                                    ? BRAND.gold
                                    : BRAND.textMuted
                                }
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '700',
                                  letterSpacing: 0.6,
                                  textTransform: 'uppercase',
                                  marginBottom: 2,
                                  color:
                                    booking.paymentStatus === 'paid'
                                      ? BRAND.green
                                      : booking.paymentStatus === 'pending'
                                      ? '#92400E'
                                      : BRAND.textMuted,
                                }}
                              >
                                Payment
                              </Text>
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: '700',
                                  color: BRAND.textPrimary,
                                }}
                              >
                                {formatStatus(booking.paymentStatus)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {booking.bookingNumber && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: BRAND.surfaceAlt,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderWidth: 1,
                            borderColor: BRAND.border,
                          }}
                        >
                          <Ionicons name="receipt-outline" size={13} color={BRAND.textMuted} />
                          <Text
                            style={{ fontSize: 12, color: BRAND.textMuted, marginLeft: 6, fontWeight: '500' }}
                          >
                            ID:
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: BRAND.textSecondary,
                              fontWeight: '700',
                              marginLeft: 4,
                              letterSpacing: 0.3,
                            }}
                          >
                            {booking.bookingNumber}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Footer */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: BRAND.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="time-outline" size={13} color={BRAND.textMuted} />
                        <Text
                          style={{ fontSize: 11, color: BRAND.textMuted, marginLeft: 4, fontWeight: '500' }}
                        >
                          Booked {formatDate(booking.createdAt)}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: BRAND.primarySoft,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 20,
                        }}
                      >
                        <Text
                          style={{ fontSize: 12, color: BRAND.primary, fontWeight: '700', marginRight: 3 }}
                        >
                          Details
                        </Text>
                        <Ionicons name="arrow-forward" size={12} color={BRAND.primary} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {loading && page > 1 && (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={BRAND.primary} />
              </View>
            )}

            {!hasMore && filteredBookings.length > 10 && (
              <View
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: BRAND.border,
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={BRAND.textMuted} />
                <Text
                  style={{ color: BRAND.textMuted, fontSize: 13, marginTop: 6, fontWeight: '500' }}
                >
                  You're all caught up
                </Text>
              </View>
            )}
          </>
        ) : (
          /* ── EMPTY STATE ─────────────────────────────────────────────── */
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 30,
                overflow: 'hidden',
                marginBottom: 20,
                ...Platform.select({
                  ios: { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
                  android: { elevation: 6 },
                }),
              }}
            >
              <LinearGradient
                colors={[BRAND.primary, BRAND.primaryDark]}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="calendar-outline" size={46} color="#fff" />
              </LinearGradient>
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: BRAND.textPrimary,
                marginBottom: 8,
                letterSpacing: -0.4,
              }}
            >
              {activeFilter !== 'all'
                ? `No ${formatStatus(activeFilter)} Bookings`
                : 'No Bookings Yet'}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: BRAND.textSecondary,
                textAlign: 'center',
                lineHeight: 21,
                paddingHorizontal: 32,
                marginBottom: 28,
              }}
            >
              {activeFilter !== 'all'
                ? `You don't have any ${activeFilter.replace('_', ' ')} bookings right now.`
                : "You haven't made any bookings yet. Start exploring services!"}
            </Text>

            {activeFilter === 'all' ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('AllVendors')}
                activeOpacity={0.85}
                style={{ borderRadius: 16, overflow: 'hidden' }}
              >
                <LinearGradient
                  colors={[BRAND.primary, BRAND.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 24,
                    paddingVertical: 14,
                    gap: 8,
                  }}
                >
                  <Ionicons name="search-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                    Explore Services
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setActiveFilter('all')}
                activeOpacity={0.8}
                style={{
                  backgroundColor: BRAND.primarySoft,
                  paddingHorizontal: 20,
                  paddingVertical: 11,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: BRAND.primaryMuted,
                }}
              >
                <Text style={{ color: BRAND.primary, fontWeight: '700', fontSize: 14 }}>
                  View All Bookings
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default BookingsScreen;