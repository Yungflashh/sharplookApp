import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { disputeAPI, handleAPIError } from '@/api/api';
type DisputesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
interface Dispute {
  _id: string;
  booking: {
    _id: string;
    service: {
      name: string;
    };
    scheduledDate: string;
    totalAmount: number;
  };
  raisedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  against: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  reason: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  resolutionDetails?: string;
}
type FilterTab = 'all' | 'open' | 'in_review' | 'resolved' | 'closed';
const DisputesScreen: React.FC = () => {
  const navigation = useNavigation<DisputesNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [filteredDisputes, setFilteredDisputes] = useState<Dispute[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const fetchDisputes = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const response = await disputeAPI.getMyDisputes({
        page: pageNum,
        limit: 20
      });
      console.log('Disputes response:', response);
      if (response.success) {
        const newDisputes = Array.isArray(response.data) ? response.data : response.data.disputes || [];
        if (append) {
          setDisputes(prev => [...prev, ...newDisputes]);
        } else {
          setDisputes(newDisputes);
        }
        const hasNext = response.meta?.pagination?.hasNextPage ?? newDisputes.length === 20;
        setHasMore(hasNext);
        setPage(pageNum);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Disputes fetch error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDisputes();
  }, []);
  useFocusEffect(useCallback(() => {
    fetchDisputes(1, false);
  }, []));
  useEffect(() => {
    let filtered = disputes;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(dispute => dispute.status.toLowerCase() === activeFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(dispute => dispute.reason?.toLowerCase().includes(searchQuery.toLowerCase()) || dispute.category?.toLowerCase().includes(searchQuery.toLowerCase()) || dispute.booking?.service?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredDisputes(filtered);
  }, [disputes, activeFilter, searchQuery]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDisputes(1, false).finally(() => setRefreshing(false));
  }, []);
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchDisputes(page + 1, true);
    }
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
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'alert-circle';
      case 'in_review':
        return 'eye';
      case 'resolved':
        return 'checkmark-circle';
      case 'closed':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };
  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  const getDisputeCounts = () => {
    return {
      total: disputes.length,
      open: disputes.filter(d => d.status === 'open').length,
      in_review: disputes.filter(d => d.status === 'in_review').length,
      resolved: disputes.filter(d => d.status === 'resolved').length,
      closed: disputes.filter(d => d.status === 'closed').length
    };
  };
  const counts = getDisputeCounts();
  const filters: {
    key: FilterTab;
    label: string;
    count: number;
  }[] = [{
    key: 'all',
    label: 'All',
    count: counts.total
  }, {
    key: 'open',
    label: 'Open',
    count: counts.open
  }, {
    key: 'in_review',
    label: 'In Review',
    count: counts.in_review
  }, {
    key: 'resolved',
    label: 'Resolved',
    count: counts.resolved
  }, {
    key: 'closed',
    label: 'Closed',
    count: counts.closed
  }];
  const renderDisputeCard = (dispute: Dispute) => <TouchableOpacity key={dispute._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm" style={{
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  }} onPress={() => navigation.navigate('DisputeDetail', {
    disputeId: dispute._id
  })} activeOpacity={0.7}>
      {}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 mb-1">
            {dispute.booking?.service?.name || 'Booking Dispute'}
          </Text>
          <Text className="text-sm text-gray-600">{dispute.category}</Text>
        </View>

        <View className={`px-3 py-1 rounded-full border ${getStatusColor(dispute.status)}`}>
          <View className="flex-row items-center gap-1">
            <Ionicons name={getStatusIcon(dispute.status) as any} size={14} color={dispute.status === 'resolved' ? '#15803d' : dispute.status === 'open' ? '#ca8a04' : '#2563eb'} />
            <Text className="text-xs font-bold">
              {formatStatus(dispute.status)}
            </Text>
          </View>
        </View>
      </View>

      {}
      <View className="bg-gray-50 rounded-lg p-3 mb-3">
        <Text className="text-sm text-gray-700" numberOfLines={2}>
          {dispute.reason}
        </Text>
      </View>

      {}
      <View className="gap-2 mb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-2">
              Created {formatDate(dispute.createdAt)}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="flag-outline" size={16} color="#6b7280" />
            <Text className={`text-sm font-semibold ml-1 ${getPriorityColor(dispute.priority)}`}>
              {formatStatus(dispute.priority)}
            </Text>
          </View>
        </View>

        {dispute.booking?.totalAmount && <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-2">
              Booking Amount: {formatPrice(dispute.booking.totalAmount)}
            </Text>
          </View>}

        {dispute.resolvedAt && <View className="flex-row items-center">
            <Ionicons name="checkmark-circle-outline" size={16} color="#15803d" />
            <Text className="text-sm text-green-700 ml-2">
              Resolved {formatDate(dispute.resolvedAt)}
            </Text>
          </View>}
      </View>

      {}
      <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
        <Text className="text-xs text-gray-400">ID: {dispute._id.slice(-8)}</Text>

        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-pink-600 font-semibold">View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#eb278d" />
        </View>
      </View>
    </TouchableOpacity>;
  const renderEmptyState = () => <View className="flex-1 items-center justify-center py-20">
      <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Ionicons name="shield-checkmark-outline" size={48} color="#d1d5db" />
      </View>
      <Text className="text-lg font-bold text-gray-900 mb-2">No Disputes</Text>
      <Text className="text-gray-600 text-center px-8">
        {activeFilter !== 'all' ? `You don't have any ${formatStatus(activeFilter).toLowerCase()} disputes` : "You haven't raised any disputes yet"}
      </Text>
    </View>;
  if (loading && page === 1) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-400 text-sm mt-4">Loading disputes...</Text>
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Disputes</Text>

          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {}
        <View className="bg-blue-50 rounded-xl p-3 mb-4 flex-row items-start">
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <Text className="text-sm text-blue-700 ml-2 flex-1">
            Disputes help resolve issues with bookings. Our team reviews each case
            carefully.
          </Text>
        </View>

        {}
        <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 mb-4">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput className="flex-1 ml-2 text-base text-gray-900" placeholder="Search disputes..." placeholderTextColor="#9ca3af" value={searchQuery} onChangeText={setSearchQuery} />
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
          {filteredDisputes.length > 0 ? <>
              {filteredDisputes.map(dispute => renderDisputeCard(dispute))}

              {loading && page > 1 && <View className="py-4">
                  <ActivityIndicator size="small" color="#eb278d" />
                </View>}

              {!hasMore && filteredDisputes.length > 10 && <Text className="text-center text-gray-400 text-sm py-4">
                  No more disputes
                </Text>}
            </> : renderEmptyState()}
        </View>
      </ScrollView>
    </SafeAreaView>;
};
export default DisputesScreen;