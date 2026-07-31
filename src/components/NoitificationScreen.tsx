import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
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

const PRIMARY = '#eb278d';
const PRIMARY_SOFT = '#FCE4EC';

type CategoryFilter = 'all' | 'bookings' | 'message';

const getNotificationCategory = (type: string): 'bookings' | 'message' | 'other' => {
  const t = (type || '').toUpperCase().replace(/-/g, '_');
  if (t.includes('BOOKING') || t.includes('REMINDER')) return 'bookings';
  if (t.includes('MESSAGE')) return 'message';
  return 'other';
};

const getNotificationIcon = (type: string) => {
  const normalizedType = (type || '').toUpperCase().replace(/-/g, '_');
  switch (normalizedType) {
    case 'BOOKING_CREATED':
    case 'BOOKING_CONFIRMED':
    case 'BOOKING_STARTED':
    case 'BOOKING_COMPLETED':
      return 'calendar';
    case 'BOOKING_CANCELLED':
      return 'close-circle';
    case 'BOOKING_REMINDER':
    case 'REMINDER':
      return 'time-outline';
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

// Renders "...**Name**..." segments in bold, matching plain text otherwise.
const renderMessageText = (message: string) => {
  const parts = message.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={i} style={{ fontWeight: '700', color: '#374151' }}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      <Text key={i}>{part}</Text>
    )
  );
};

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ userRole = 'client' }) => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    loadNotifications(true);
  }, []);

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
        limit: 50,
      });

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

      if (isRefresh) {
        setNotifications(newNotifications);
        setPage(2);
      } else {
        setNotifications((prev) => [...prev, ...newNotifications]);
        setPage((prev) => prev + 1);
      }

      const pagination = response.data?.meta?.pagination || response.meta?.pagination;
      if (pagination) {
        setHasMore(pagination.hasNextPage || pagination.currentPage < pagination.totalPages);
      } else {
        setHasMore(newNotifications.length === 50);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Error loading notifications:', apiError.message);
      toast.error('Error', apiError.message);
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
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      if (notification.relatedBooking) {
        const bookingId =
          typeof notification.relatedBooking === 'string'
            ? notification.relatedBooking
            : notification.relatedBooking._id || notification.relatedBooking.id;
        navigation.navigate('BookingDetail' as never, { bookingId } as never);
      } else if (notification.relatedPayment) {
        navigation.navigate('Transactions' as never);
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
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Success', 'All notifications marked as read');
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message);
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Notification',
      message: 'Are you sure you want to delete this notification?',
      onConfirm: async () => {
        try {
          await notificationAPI.deleteNotification(notificationId);
          const deletedNotification = notifications.find((n) => n._id === notificationId);
          setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
          if (deletedNotification && !deletedNotification.isRead) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        } catch (error) {
          const apiError = handleAPIError(error);
          toast.error('Error', apiError.message);
        }
      },
    });
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 172800) return 'Yesterday';
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      return format(date, 'MMM d');
    } catch {
      return 'Recently';
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'all' ? true : getNotificationCategory(n.type) === filter
  );

  const TABS: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'message', label: 'Message' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PRIMARY_SOFT }} edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={PRIMARY} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Notifications</Text>
          </View>
          <TouchableOpacity onPress={handleMarkAllAsRead} activeOpacity={0.7}>
            <Text className="text-sm font-semibold" style={{ color: PRIMARY }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View className="flex-row" style={{ gap: 8 }}>
          {TABS.map((tab) => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.8}
                className="flex-1 py-2 rounded-full items-center justify-center"
                style={{
                  backgroundColor: active ? PRIMARY : '#fff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: active ? '#fff' : '#374151' }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />
        }
      >
        {loading && notifications.length === 0 ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={PRIMARY} />
            <Text className="text-gray-500 mt-2">Loading notifications...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 rounded-full bg-white items-center justify-center mb-4">
              <Ionicons name="notifications-outline" size={40} color="#d1a3bb" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 mb-2">No notifications</Text>
            <Text className="text-gray-500 text-center px-8">
              {filter === 'all' ? "You'll see notifications here when you get them" : `No ${filter} notifications yet`}
            </Text>
          </View>
        ) : (
          <View className="pt-1">
            {filteredNotifications.map((notification) => (
              <TouchableOpacity
                key={notification._id}
                onPress={() => handleNotificationPress(notification)}
                onLongPress={() => handleDeleteNotification(notification._id)}
                className="mb-3 rounded-2xl bg-white p-4"
                activeOpacity={0.75}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <View className="flex-row">
                  <View
                    className="w-11 h-11 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: PRIMARY_SOFT }}
                  >
                    <Ionicons name={getNotificationIcon(notification.type) as any} size={20} color={PRIMARY} />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-sm font-bold text-gray-900 flex-1 pr-2" numberOfLines={1}>
                        {notification.title}
                      </Text>
                      {!notification.isRead && (
                        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIMARY }} />
                      )}
                    </View>
                    <Text className="text-sm text-gray-500 mb-1.5" numberOfLines={2}>
                      {renderMessageText(notification.message)}
                    </Text>
                    <Text className="text-xs text-gray-400">{formatTimeAgo(notification.createdAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {filter === 'all' && hasMore && !loading && notifications.length > 0 && (
              <TouchableOpacity onPress={() => loadNotifications()} className="py-4 items-center">
                <Text className="text-sm font-semibold" style={{ color: PRIMARY }}>
                  Load more
                </Text>
              </TouchableOpacity>
            )}

            {loading && notifications.length > 0 && (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={PRIMARY} />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, visible: false }));
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

export default NotificationsScreen;
