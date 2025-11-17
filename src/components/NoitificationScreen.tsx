import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { notificationAPI, handleAPIError } from '@/api/api';
import { format } from 'date-fns';
interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  relatedBooking?: any;
  relatedPayment?: string;
  data?: any;
}
interface NotificationsScreenProps {
  userRole?: 'client' | 'vendor';
}
const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  userRole = 'client'
}) => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    loadNotifications(true);
  }, [filter]);
  const loadNotifications = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setPage(1);
    } else {
      setLoading(true);
    }
    try {
      const response = await notificationAPI.getNotifications({
        page: isRefresh ? 1 : page,
        limit: 20,
        filter: filter === 'unread' ? 'unread' : undefined
      });
      console.log('Full notifications response:', JSON.stringify(response, null, 2));
      let newNotifications: Notification[] = [];
      let totalUnread = 0;
      if (response.data) {
        if (Array.isArray(response.data)) {
          newNotifications = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          newNotifications = response.data.data;
        }
        if (response.meta?.unreadCount !== undefined) {
          totalUnread = response.meta.unreadCount;
        } else if (response.data.meta?.unreadCount !== undefined) {
          totalUnread = response.data.meta.unreadCount;
        }
        setUnreadCount(totalUnread);
      }
      console.log('Parsed notifications:', newNotifications.length);
      if (isRefresh) {
        setNotifications(newNotifications);
        setPage(2);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
        setPage(prev => prev + 1);
      }
      const pagination = response.data?.meta?.pagination || response.meta?.pagination;
      if (pagination) {
        setHasMore(pagination.hasNextPage || pagination.currentPage < pagination.totalPages);
      } else {
        setHasMore(newNotifications.length === 20);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Error loading notifications:', apiError.message);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const handleRefresh = () => {
    loadNotifications(true);
  };
  const handleNotificationPress = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await notificationAPI.markAsRead(notification._id);
        setNotifications(prev => prev.map(n => n._id === notification._id ? {
          ...n,
          isRead: true
        } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      if (notification.relatedBooking) {
        const bookingId = typeof notification.relatedBooking === 'string' ? notification.relatedBooking : notification.relatedBooking._id || notification.relatedBooking.id;
        navigation.navigate('BookingDetail' as never, {
          bookingId
        } as never);
      } else if (notification.relatedPayment) {
        navigation.navigate('Wallet' as never);
      } else if (notification.actionUrl) {
        console.log('Navigate to:', notification.actionUrl);
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };
  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({
        ...n,
        isRead: true
      })));
      setUnreadCount(0);
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    }
  };
  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert('Delete Notification', 'Are you sure you want to delete this notification?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        try {
          await notificationAPI.deleteNotification(notificationId);
          const deletedNotification = notifications.find(n => n._id === notificationId);
          setNotifications(prev => prev.filter(n => n._id !== notificationId));
          if (deletedNotification && !deletedNotification.isRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        } catch (error) {
          const apiError = handleAPIError(error);
          Alert.alert('Error', apiError.message);
        }
      }
    }]);
  };
  const getNotificationIcon = (type: string) => {
    const normalizedType = type.toUpperCase().replace(/-/g, '_');
    switch (normalizedType) {
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_STARTED':
      case 'BOOKING_COMPLETED':
        return 'calendar';
      case 'BOOKING_CANCELLED':
        return 'close-circle';
      case 'PAYMENT_SUCCESSFUL':
      case 'PAYMENT_RECEIVED':
        return 'checkmark-circle';
      case 'PAYMENT_FAILED':
      case 'PAYMENT_REFUNDED':
        return 'card';
      case 'NEW_MESSAGE':
        return 'chatbubble-ellipses';
      case 'NEW_REVIEW':
        return 'star';
      case 'DISPUTE_CREATED':
      case 'DISPUTE_UPDATED':
        return 'warning';
      case 'PROMOTIONAL':
        return 'pricetag';
      default:
        return 'notifications';
    }
  };
  const getNotificationColor = (type: string) => {
    const normalizedType = type.toUpperCase().replace(/-/g, '_');
    switch (normalizedType) {
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_COMPLETED':
      case 'PAYMENT_SUCCESSFUL':
      case 'PAYMENT_RECEIVED':
        return '#10b981';
      case 'BOOKING_CANCELLED':
      case 'PAYMENT_FAILED':
        return '#ef4444';
      case 'BOOKING_CREATED':
      case 'BOOKING_STARTED':
        return '#3b82f6';
      case 'NEW_MESSAGE':
        return '#8b5cf6';
      case 'DISPUTE_CREATED':
      case 'DISPUTE_UPDATED':
        return '#f59e0b';
      case 'PROMOTIONAL':
        return '#ec4899';
      default:
        return '#6b7280';
    }
  };
  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Recently';
    }
  };
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View className="flex-1 ml-3">
            <Text className="text-lg font-semibold text-gray-900">Notifications</Text>
            {unreadCount > 0 && <Text className="text-xs text-gray-500">{unreadCount} unread</Text>}
          </View>
          {unreadCount > 0 && <TouchableOpacity onPress={handleMarkAllAsRead} className="px-3 py-1.5">
              <Text className="text-sm font-medium text-pink-500">Mark all read</Text>
            </TouchableOpacity>}
        </View>

        {}
        <View className="flex-row mt-4 bg-gray-100 rounded-lg p-1">
          <TouchableOpacity onPress={() => setFilter('all')} className={`flex-1 py-2 rounded-md ${filter === 'all' ? 'bg-white' : 'bg-transparent'}`}>
            <Text className={`text-center text-sm font-medium ${filter === 'all' ? 'text-gray-900' : 'text-gray-500'}`}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('unread')} className={`flex-1 py-2 rounded-md ${filter === 'unread' ? 'bg-white' : 'bg-transparent'}`}>
            <Text className={`text-center text-sm font-medium ${filter === 'unread' ? 'text-gray-900' : 'text-gray-500'}`}>
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#eb278d" colors={['#eb278d']} />}>
        {loading && notifications.length === 0 ? <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#eb278d" />
            <Text className="text-gray-500 mt-2">Loading notifications...</Text>
          </View> : notifications.length === 0 ? <View className="flex-1 items-center justify-center py-20">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Ionicons name="notifications-outline" size={40} color="#9ca3af" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">No notifications</Text>
            <Text className="text-gray-500 text-center px-8">
              {filter === 'unread' ? "You're all caught up!" : "You'll see notifications here when you get them"}
            </Text>
          </View> : <View className="px-5 py-3">
            {notifications.map(notification => <TouchableOpacity key={notification._id} onPress={() => handleNotificationPress(notification)} className={`mb-3 rounded-2xl overflow-hidden ${notification.isRead ? 'bg-white' : 'bg-pink-50'}`} activeOpacity={0.7} style={{
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1
          },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2
        }}>
                <View className="flex-row p-4">
                  {}
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{
              backgroundColor: `${getNotificationColor(notification.type)}15`
            }}>
                    <Ionicons name={getNotificationIcon(notification.type) as any} size={24} color={getNotificationColor(notification.type)} />
                  </View>

                  {}
                  <View className="flex-1">
                    <View className="flex-row items-start justify-between mb-1">
                      <Text className="text-sm font-semibold text-gray-900 flex-1 pr-2">
                        {notification.title}
                      </Text>
                      {!notification.isRead && <View className="w-2 h-2 rounded-full bg-pink-500 mt-1" />}
                    </View>
                    <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs text-gray-400">
                        {formatTimeAgo(notification.createdAt)}
                      </Text>
                      <TouchableOpacity onPress={e => {
                  e.stopPropagation();
                  handleDeleteNotification(notification._id);
                }} className="p-1">
                        <Ionicons name="trash-outline" size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>)}

            {}
            {hasMore && !loading && notifications.length > 0 && <TouchableOpacity onPress={() => loadNotifications()} className="py-4 items-center">
                <Text className="text-sm font-medium text-pink-500">Load more</Text>
              </TouchableOpacity>}

            {loading && notifications.length > 0 && <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#eb278d" />
              </View>}
          </View>}
      </ScrollView>
    </SafeAreaView>;
};
export default NotificationsScreen;