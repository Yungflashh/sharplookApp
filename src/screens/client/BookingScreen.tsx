import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';

type BookingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface Booking {
  _id: string;
  bookingNumber?: string;
  bookingType?: 'standard' | 'offer_based';
  service?: {
    _id: string;
    name: string;
    images?: string[];
  };
  offer?: string | {
    _id: string;
    title?: string;
    images?: string[];
  };
  vendor: {
    _id: string;
    firstName: string;
    lastName: string;
    vendorProfile?: {
      businessName: string;
    };
  };
  scheduledDate: string;
  scheduledTime?: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

type FilterTab = 'all' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<BookingsScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const getServiceName = (booking: Booking): string => {
    if (booking.service?.name) {
      return booking.service.name;
    }
    
    if (booking.offer && typeof booking.offer === 'object' && booking.offer.title) {
      return booking.offer.title;
    }
    
    return 'Custom Service Offer';
  };

  const fetchBookings = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);

      const response = await bookingAPI.getMyBookings({
        role: 'client',
        page: pageNum,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      console.log('Bookings response:', response);

      if (response.success) {
        const newBookings = Array.isArray(response.data)
          ? response.data
          : response.data.bookings || [];

        if (append) {
          setBookings((prev) => [...prev, ...newBookings]);
        } else {
          setBookings(newBookings);
        }

        const hasNext = response.meta?.pagination?.hasNextPage ?? newBookings.length === 20;
        setHasMore(hasNext);
        setPage(pageNum);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Bookings fetch error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings(1, false);
    }, [])
  );

useEffect(() => {
  let filtered = bookings;

  if (activeFilter !== 'all') {
    // Handle 'accepted' filter to include both accepted and in_progress
    if (activeFilter === 'accepted') {
      filtered = filtered.filter(
        (booking) => 
          booking.status.toLowerCase() === 'accepted' || 
          booking.status.toLowerCase() === 'in_progress'
      );
    } else {
      filtered = filtered.filter((booking) => booking.status.toLowerCase() === activeFilter);
    }
  }

  if (searchQuery) {
    filtered = filtered.filter((booking) => {
      const serviceName = getServiceName(booking).toLowerCase();
      const vendorName = (
        booking.vendor?.vendorProfile?.businessName ||
        `${booking.vendor?.firstName || ''} ${booking.vendor?.lastName || ''}`.trim()
      ).toLowerCase();
      const bookingNum = booking.bookingNumber?.toLowerCase() || '';

      return (
        serviceName.includes(searchQuery.toLowerCase()) ||
        vendorName.includes(searchQuery.toLowerCase()) ||
        bookingNum.includes(searchQuery.toLowerCase())
      );
    });
  }

  setFilteredBookings(filtered);
}, [bookings, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(1, false).finally(() => setRefreshing(false));
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchBookings(page + 1, true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: 'time' as const,
          iconColor: '#ca8a04',
        };
      case 'accepted':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: 'checkmark-circle' as const,
          iconColor: '#2563eb',
        };
      case 'in_progress':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          icon: 'hourglass' as const,
          iconColor: '#9333ea',
        };
      case 'completed':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: 'checkmark-done-circle' as const,
          iconColor: '#15803d',
        };
      case 'cancelled':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          icon: 'close-circle' as const,
          iconColor: '#dc2626',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: 'help-circle' as const,
          iconColor: '#6b7280',
        };
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStats = () => {
    const stats = {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      active: bookings.filter(
        (b) => b.status === 'accepted' || b.status === 'in_progress'
      ).length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    };
    return stats;
  };

  const stats = getStats();

  const filters: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'accepted', label: 'Active', count: stats.active },
    { key: 'completed', label: 'Completed', count: stats.completed },
    { key: 'cancelled', label: 'Cancelled', count: stats.cancelled },
  ];

  const renderBookingCard = (booking: Booking) => {
    const serviceName = getServiceName(booking);
    const statusConfig = getStatusConfig(booking.status);

    return (
      <TouchableOpacity
        key={booking._id}
        className="bg-white rounded-3xl p-5 mb-4"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        }}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: booking._id })}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-900 mb-1.5" numberOfLines={2}>
              {serviceName}
            </Text>
            <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-pink-500 mr-2" />
              <Text className="text-sm text-gray-600 font-medium">
                {booking.vendor?.vendorProfile?.businessName ||
                  `${booking.vendor?.firstName || ''} ${booking.vendor?.lastName || ''}`.trim() ||
                  'Vendor'}
              </Text>
            </View>
          </View>

          <View className={`px-3 py-1.5 rounded-full ${statusConfig.bg} flex-row items-center`}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.iconColor} />
            <Text className={`text-xs font-bold ml-1 ${statusConfig.text}`}>
              {formatStatus(booking.status)}
            </Text>
          </View>
        </View>

        {/* Info Cards */}
        <View className="gap-3 mb-4">
          {/* Date & Time */}
          <View className="bg-blue-50 rounded-2xl p-3 flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
              <Ionicons name="calendar" size={16} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-blue-600 font-semibold mb-0.5">DATE & TIME</Text>
              <Text className="text-sm font-bold text-blue-900">
                {formatDate(booking.scheduledDate)}
                {booking.scheduledTime && ` • ${booking.scheduledTime}`}
              </Text>
            </View>
          </View>

          {/* Amount & Payment */}
          <View className="bg-pink-50 rounded-2xl p-3 flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-pink-100 items-center justify-center mr-3">
              <Ionicons name="cash" size={16} color="#eb278d" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-pink-600 font-semibold mb-0.5">AMOUNT</Text>
              <View className="flex-row items-center">
                <Text className="text-sm font-bold text-pink-900">
                  {formatPrice(booking.totalAmount)}
                </Text>
                <View
                  className={`ml-2 px-2 py-0.5 rounded-full ${
                    booking.paymentStatus === 'paid'
                      ? 'bg-green-100'
                      : booking.paymentStatus === 'pending'
                      ? 'bg-orange-100'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      booking.paymentStatus === 'paid'
                        ? 'text-green-700'
                        : booking.paymentStatus === 'pending'
                        ? 'text-orange-700'
                        : 'text-gray-700'
                    }`}
                  >
                    {formatStatus(booking.paymentStatus)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Booking Number */}
          {booking.bookingNumber && (
            <View className="bg-gray-50 rounded-2xl p-3 flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
                <Ionicons name="receipt" size={16} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 font-semibold mb-0.5">BOOKING ID</Text>
                <Text className="text-sm font-bold text-gray-700">{booking.bookingNumber}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between pt-4 border-t border-gray-100">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#9ca3af" />
            <Text className="text-xs text-gray-500 ml-1">
              Booked {formatDate(booking.createdAt)}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Text className="text-sm text-pink-600 font-bold mr-1">View Details</Text>
            <Ionicons name="arrow-forward" size={16} color="#eb278d" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <View
        className="w-32 h-32 rounded-full items-center justify-center mb-6"
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={['#eb278d', '#f472b6']}
          className="w-32 h-32 rounded-full items-center justify-center"
        >
          <Ionicons name="calendar" size={56} color="#fff" />
        </LinearGradient>
      </View>

      <Text className="text-xl font-bold text-gray-900 mb-2">
        {activeFilter !== 'all' ? `No ${formatStatus(activeFilter)} Bookings` : 'No Bookings Yet'}
      </Text>
      <Text className="text-gray-600 text-center mb-8 px-8 leading-6">
        {activeFilter !== 'all'
          ? `You don't have any ${activeFilter} bookings`
          : "You haven't made any bookings yet. Start by exploring services!"}
      </Text>
      {activeFilter === 'all' && (
        <TouchableOpacity onPress={() => navigation.navigate('AllVendors')} activeOpacity={0.8}>
          <LinearGradient
            colors={['#eb278d', '#f472b6']}
            className="px-8 py-4 rounded-2xl"
            style={{
              shadowColor: '#eb278d',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <View className="flex-row items-center">
              <Ionicons name="search" size={22} color="#fff" />
              <Text className="text-white text-base font-bold ml-2">Explore Services</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && page === 1) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4 font-medium">Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100">
        <View className="px-5 pt-4 pb-3">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-gray-900">My Bookings</Text>

            <View className="flex-row gap-2">
              {/* My Offers Button */}
              <TouchableOpacity
                onPress={() => navigation.navigate('MyOffers')}
                className="flex-row items-center px-3 py-2 rounded-xl bg-pink-50 border border-pink-200"
                activeOpacity={0.7}
              >
                <Ionicons name="pricetag" size={18} color="#eb278d" />
                <Text className="ml-1.5 text-pink-700 font-bold text-sm">My Offers</Text>
              </TouchableOpacity>

              {/* Create Offer Button */}
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateOffer')}
                className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={24} color="#eb278d" />
              </TouchableOpacity>

              {/* Search Button */}
              <TouchableOpacity
                onPress={() => navigation.navigate('AllVendors')}
                className="w-10 h-10 rounded-full items-center justify-center"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#eb278d', '#f472b6']}
                  className="w-10 h-10 rounded-full items-center justify-center"
                >
                  <Ionicons name="search" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 mb-4">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-900"
              placeholder="Search bookings..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                activeOpacity={0.7}
              >
                {activeFilter === filter.key ? (
                  <LinearGradient
                    colors={['#eb278d', '#f472b6']}
                    className="px-4 py-2.5 rounded-full"
                  >
                    <Text className="font-bold text-white text-sm">
                      {filter.label} {filter.count > 0 && `(${filter.count})`}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View className="px-4 py-2.5 rounded-full bg-gray-100">
                    <Text className="font-bold text-gray-700 text-sm">
                      {filter.label} {filter.count > 0 && `(${filter.count})`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Bookings List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#eb278d"
            colors={['#eb278d']}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

          if (isCloseToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        <View className="px-5 py-6">
          {filteredBookings.length > 0 ? (
            <>
              {filteredBookings.map((booking) => renderBookingCard(booking))}

              {loading && page > 1 && (
                <View className="py-4">
                  <ActivityIndicator size="small" color="#eb278d" />
                </View>
              )}

              {!hasMore && filteredBookings.length > 10 && (
                <View className="bg-white rounded-2xl p-4 items-center">
                  <Text className="text-center text-gray-500 text-sm">
                    You've reached the end
                  </Text>
                </View>
              )}
            </>
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BookingsScreen;