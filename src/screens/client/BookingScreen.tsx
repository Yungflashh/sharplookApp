import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      filtered = filtered.filter((booking) => booking.status.toLowerCase() === activeFilter);
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'time';
      case 'accepted':
        return 'checkmark-circle';
      case 'in_progress':
        return 'hourglass';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
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

    return (
      <TouchableOpacity
        key={booking._id}
        className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: booking._id })}
        activeOpacity={0.7}
      >
        {}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 mb-1">{serviceName}</Text>
            <Text className="text-sm text-gray-600">
              {booking.vendor?.vendorProfile?.businessName ||
                `${booking.vendor?.firstName || ''} ${booking.vendor?.lastName || ''}`.trim() ||
                'Vendor'}
            </Text>
          </View>

          <View
            className={`px-3 py-1 rounded-full border ${getStatusColor(booking.status)}`}
          >
            <View className="flex-row items-center gap-1">
              <Ionicons
                name={getStatusIcon(booking.status) as any}
                size={14}
                color={
                  booking.status === 'completed'
                    ? '#15803d'
                    : booking.status === 'cancelled'
                    ? '#dc2626'
                    : booking.status === 'pending'
                    ? '#ca8a04'
                    : '#2563eb'
                }
              />
              <Text className="text-xs font-bold">{formatStatus(booking.status)}</Text>
            </View>
          </View>
        </View>

        {}
        <View className="gap-2 mb-3">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-2">
              {formatDate(booking.scheduledDate)}
              {booking.scheduledTime && ` • ${booking.scheduledTime}`}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-2">
              {formatPrice(booking.totalAmount)}
              {' • '}
              <Text className="font-semibold">{formatStatus(booking.paymentStatus)}</Text>
            </Text>
          </View>

          {booking.bookingNumber && (
            <View className="flex-row items-center">
              <Ionicons name="receipt-outline" size={16} color="#6b7280" />
              <Text className="text-xs text-gray-500 ml-2">{booking.bookingNumber}</Text>
            </View>
          )}
        </View>

        {}
        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
          <Text className="text-xs text-gray-400">Booked {formatDate(booking.createdAt)}</Text>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => navigation.navigate('BookingDetail', { bookingId: booking._id })}
              className="flex-row items-center gap-1"
            >
              <Text className="text-sm text-pink-600 font-semibold">View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#eb278d" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
      </View>
      <Text className="text-lg font-bold text-gray-900 mb-2">No Bookings Yet</Text>
      <Text className="text-gray-600 text-center mb-6 px-8">
        {activeFilter !== 'all'
          ? `You don't have any ${activeFilter} bookings`
          : "You haven't made any bookings yet. Start by exploring services!"}
      </Text>
      {activeFilter === 'all' && (
        <TouchableOpacity
          className="bg-pink-600 px-6 py-3 rounded-xl"
          onPress={() => navigation.navigate('AllVendors')}
        >
          <Text className="text-white font-semibold">Explore Services</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && page === 1) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-400 text-sm mt-4">Loading bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">My Bookings</Text>

          <View className="flex-row gap-2">
            {}
            <TouchableOpacity
              onPress={() => navigation.navigate('MyOffers')}
              className="flex-row items-center px-3 py-2 rounded-xl bg-purple-100"
            >
              <Ionicons name="pricetag" size={18} color="#9333ea" />
              <Text className="ml-1 text-purple-700 font-semibold text-sm">My Offers</Text>
            </TouchableOpacity>

            {}
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateOffer')}
              className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center"
            >
              <Ionicons name="add" size={24} color="#9333ea" />
            </TouchableOpacity>

            {}
            <TouchableOpacity
              onPress={() => navigation.navigate('AllVendors')}
              className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center"
            >
              <Ionicons name="search" size={20} color="#eb278d" />
            </TouchableOpacity>
          </View>
        </View>

        {}
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-4">
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

        {}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              className={`px-4 py-2 rounded-full ${
                activeFilter === filter.key ? 'bg-pink-600' : 'bg-gray-100'
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`font-semibold ${
                  activeFilter === filter.key ? 'text-white' : 'text-gray-700'
                }`}
              >
                {filter.label} {filter.count > 0 && `(${filter.count})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {}
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
        <View className="px-5 py-4">
          {filteredBookings.length > 0 ? (
            <>
              {filteredBookings.map((booking) => renderBookingCard(booking))}

              {loading && page > 1 && (
                <View className="py-4">
                  <ActivityIndicator size="small" color="#eb278d" />
                </View>
              )}

              {!hasMore && filteredBookings.length > 10 && (
                <Text className="text-center text-gray-400 text-sm py-4">No more bookings</Text>
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