import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, vendorAPI, handleAPIError } from '@/api/api';
type VendorBookingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
interface VendorBooking {
  _id: string;
  bookingNumber?: string;
  service: {
    _id: string;
    name: string;
    images?: string[];
  };
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  scheduledDate: string;
  scheduledTime?: string;
  totalAmount: number;
  servicePrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  location?: {
    address: string;
    city: string;
    state: string;
  };
  vendorNotes?: string;
  clientNotes?: string;
}
interface VendorStats {
  totalBookings: number;
  pendingBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalEarnings: number;
  pendingPayments: number;
}
type FilterTab = 'all' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
const VendorBookingsScreen: React.FC = () => {
  const navigation = useNavigation<VendorBookingsNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<VendorBooking[]>([]);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fetchBookings = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const response = await bookingAPI.getMyBookings({
        role: 'vendor',
        page: pageNum,
        limit: 20
      });
      console.log('Vendor bookings response:', response);
      if (response.success) {
        const newBookings = Array.isArray(response.data) ? response.data : response.data.bookings || [];
        if (append) {
          setBookings(prev => [...prev, ...newBookings]);
        } else {
          setBookings(newBookings);
        }
        const hasNext = response.meta?.pagination?.hasNextPage ?? newBookings.length === 20;
        setHasMore(hasNext);
        setPage(pageNum);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Vendor bookings fetch error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };
  const fetchStats = async () => {
    try {
      const response = await bookingAPI.getBookingStats('vendor');
      console.log('Vendor stats:', response);
      if (response.success) {
        setStats(response.data.stats || response.data);
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };
  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, []);
  useFocusEffect(useCallback(() => {
    fetchBookings(1, false);
    fetchStats();
  }, []));
  useEffect(() => {
    let filtered = bookings;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status.toLowerCase() === activeFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(booking => booking.service?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || `${booking.client?.firstName || ''} ${booking.client?.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) || booking.bookingNumber?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredBookings(filtered);
  }, [bookings, activeFilter, searchQuery]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchBookings(1, false), fetchStats()]).finally(() => setRefreshing(false));
  }, []);
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchBookings(page + 1, true);
    }
  };
  const handleAcceptBooking = (bookingId: string) => {
    Alert.alert('Accept Booking', 'Do you want to accept this booking request?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Accept',
      onPress: async () => {
        try {
          setActionLoading(bookingId);
          const response = await bookingAPI.acceptBooking(bookingId);
          if (response.success) {
            Alert.alert('Success', 'Booking accepted successfully');
            fetchBookings(1, false);
          }
        } catch (error) {
          const apiError = handleAPIError(error);
          Alert.alert('Error', apiError.message || 'Failed to accept booking');
        } finally {
          setActionLoading(null);
        }
      }
    }]);
  };
  const handleRejectBooking = (bookingId: string) => {
    Alert.prompt('Reject Booking', 'Please provide a reason for rejection:', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Reject',
      style: 'destructive',
      onPress: async reason => {
        if (!reason || reason.trim().length === 0) {
          Alert.alert('Error', 'Please provide a reason');
          return;
        }
        try {
          setActionLoading(bookingId);
          const response = await bookingAPI.rejectBooking(bookingId, reason);
          if (response.success) {
            Alert.alert('Success', 'Booking rejected');
            fetchBookings(1, false);
          }
        } catch (error) {
          const apiError = handleAPIError(error);
          Alert.alert('Error', apiError.message || 'Failed to reject booking');
        } finally {
          setActionLoading(null);
        }
      }
    }], 'plain-text');
  };
  const handleStartService = (bookingId: string) => {
    Alert.alert('Start Service', 'Mark this booking as in progress?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Start',
      onPress: async () => {
        try {
          setActionLoading(bookingId);
          const response = await bookingAPI.startBooking(bookingId);
          if (response.success) {
            Alert.alert('Success', 'Service started');
            fetchBookings(1, false);
          }
        } catch (error) {
          const apiError = handleAPIError(error);
          Alert.alert('Error', apiError.message || 'Failed to start service');
        } finally {
          setActionLoading(null);
        }
      }
    }]);
  };
  const handleCompleteService = (bookingId: string) => {
    Alert.alert('Complete Service', 'Mark this service as completed?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Complete',
      onPress: async () => {
        try {
          setActionLoading(bookingId);
          const response = await bookingAPI.markComplete(bookingId);
          if (response.success) {
            Alert.alert('Success', 'Service marked as complete');
            fetchBookings(1, false);
          }
        } catch (error) {
          const apiError = handleAPIError(error);
          Alert.alert('Error', apiError.message || 'Failed to complete service');
        } finally {
          setActionLoading(null);
        }
      }
    }]);
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  const getActionButtons = (booking: VendorBooking) => {
    const isLoading = actionLoading === booking._id;
    if (booking.status === 'pending') {
      return <View className="flex-row gap-2">
          <TouchableOpacity onPress={() => handleRejectBooking(booking._id)} disabled={isLoading} className="flex-1 bg-red-500 py-2 rounded-lg" activeOpacity={0.7}>
            {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-center font-semibold text-sm">
                Reject
              </Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleAcceptBooking(booking._id)} disabled={isLoading} className="flex-1 bg-green-500 py-2 rounded-lg" activeOpacity={0.7}>
            {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-center font-semibold text-sm">
                Accept
              </Text>}
          </TouchableOpacity>
        </View>;
    }
    if (booking.status === 'accepted') {
      return <TouchableOpacity onPress={() => handleStartService(booking._id)} disabled={isLoading} className="bg-purple-500 py-2 rounded-lg" activeOpacity={0.7}>
          {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-center font-semibold text-sm">
              Start Service
            </Text>}
        </TouchableOpacity>;
    }
    if (booking.status === 'in_progress') {
      return <TouchableOpacity onPress={() => handleCompleteService(booking._id)} disabled={isLoading} className="bg-green-500 py-2 rounded-lg" activeOpacity={0.7}>
          {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-center font-semibold text-sm">
              Mark Complete
            </Text>}
        </TouchableOpacity>;
    }
    return null;
  };
  const getBookingCounts = () => {
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      accepted: bookings.filter(b => b.status === 'accepted').length,
      in_progress: bookings.filter(b => b.status === 'in_progress').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };
  };
  const counts = getBookingCounts();
  const filters: {
    key: FilterTab;
    label: string;
    count: number;
  }[] = [{
    key: 'all',
    label: 'All',
    count: counts.total
  }, {
    key: 'pending',
    label: 'Pending',
    count: counts.pending
  }, {
    key: 'accepted',
    label: 'Accepted',
    count: counts.accepted
  }, {
    key: 'in_progress',
    label: 'In Progress',
    count: counts.in_progress
  }, {
    key: 'completed',
    label: 'Completed',
    count: counts.completed
  }];
  const renderBookingCard = (booking: VendorBooking) => <View key={booking._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm" style={{
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  }}>
      {}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 mb-1">
            {booking.service.name}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="person-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-1">
              {booking.client.firstName} {booking.client.lastName}
            </Text>
          </View>
        </View>

        <View className={`px-3 py-1 rounded-full border ${getStatusColor(booking.status)}`}>
          <View className="flex-row items-center gap-1">
            <Ionicons name={getStatusIcon(booking.status) as any} size={14} color={booking.status === 'completed' ? '#15803d' : booking.status === 'cancelled' ? '#dc2626' : booking.status === 'pending' ? '#ca8a04' : '#2563eb'} />
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

        {booking.location && <View className="flex-row items-center">
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-2" numberOfLines={1}>
              {booking.location.address}
            </Text>
          </View>}

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-2">
              {formatPrice(booking.totalAmount)}
            </Text>
          </View>

          <View className={`px-2 py-1 rounded ${booking.paymentStatus === 'escrowed' ? 'bg-blue-100' : booking.paymentStatus === 'released' ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <Text className={`text-xs font-semibold ${booking.paymentStatus === 'escrowed' ? 'text-blue-700' : booking.paymentStatus === 'released' ? 'text-green-700' : 'text-yellow-700'}`}>
              {formatStatus(booking.paymentStatus)}
            </Text>
          </View>
        </View>

        {booking.bookingNumber && <View className="flex-row items-center">
            <Ionicons name="receipt-outline" size={16} color="#6b7280" />
            <Text className="text-xs text-gray-500 ml-2">{booking.bookingNumber}</Text>
          </View>}
      </View>

      {}
      {getActionButtons(booking)}

      {}
      <TouchableOpacity onPress={() => navigation.navigate('BookingDetail', {
      bookingId: booking._id
    })} className="mt-3 pt-3 border-t border-gray-100">
        <View className="flex-row items-center justify-center">
          <Text className="text-sm text-pink-600 font-semibold">View Full Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#eb278d" />
        </View>
      </TouchableOpacity>
    </View>;
  const renderEmptyState = () => <View className="flex-1 items-center justify-center py-20">
      <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
      </View>
      <Text className="text-lg font-bold text-gray-900 mb-2">No Bookings</Text>
      <Text className="text-gray-600 text-center px-8">
        {activeFilter !== 'all' ? `You don't have any ${formatStatus(activeFilter).toLowerCase()} bookings` : "You don't have any bookings yet"}
      </Text>
    </View>;
  if (loading && page === 1) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-400 text-sm mt-4">Loading bookings...</Text>
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900 mb-4">My Bookings</Text>

        {}
        {stats && <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-4">
              <Text className="text-white/80 text-xs font-semibold mb-1">
                Total Earnings
              </Text>
              <Text className="text-white text-xl font-bold">
                {formatPrice(stats.totalEarnings || 0)}
              </Text>
            </View>

            <View className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4">
              <Text className="text-white/80 text-xs font-semibold mb-1">
                Active Jobs
              </Text>
              <Text className="text-white text-xl font-bold">
                {stats.activeBookings || 0}
              </Text>
            </View>
          </View>}

        {}
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput className="flex-1 ml-2 text-base text-gray-900" placeholder="Search bookings..." placeholderTextColor="#9ca3af" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>}
        </View>

        {}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {filters.map(filter => <TouchableOpacity key={filter.key} onPress={() => setActiveFilter(filter.key)} className={`px-4 py-2 rounded-full ${activeFilter === filter.key ? 'bg-pink-600' : 'bg-gray-100'}`} activeOpacity={0.7}>
              <Text className={`font-semibold ${activeFilter === filter.key ? 'text-white' : 'text-gray-700'}`}>
                {filter.label} {filter.count > 0 && `(${filter.count})`}
              </Text>
            </TouchableOpacity>)}
        </ScrollView>
      </View>

      {}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" colors={['#eb278d']} />} onScroll={({
      nativeEvent
    }) => {
      const {
        layoutMeasurement,
        contentOffset,
        contentSize
      } = nativeEvent;
      const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
      if (isCloseToBottom) {
        loadMore();
      }
    }} scrollEventThrottle={400}>
        <View className="px-5 py-4">
          {filteredBookings.length > 0 ? <>
              {filteredBookings.map(booking => renderBookingCard(booking))}

              {loading && page > 1 && <View className="py-4">
                  <ActivityIndicator size="small" color="#eb278d" />
                </View>}

              {!hasMore && filteredBookings.length > 10 && <Text className="text-center text-gray-400 text-sm py-4">
                  No more bookings
                </Text>}
            </> : renderEmptyState()}
        </View>
      </ScrollView>
    </SafeAreaView>;
};
export default VendorBookingsScreen;