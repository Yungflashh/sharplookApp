import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { notificationAPI, handleAPIError } from '@/api/api';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const PINK_M = '#FCDCE9';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const WHITE  = '#FFFFFF';

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

type Filter = 'all' | 'bookings' | 'message';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'bookings', label: 'Bookings' },
  { key: 'message',  label: 'Message'  },
];

const BOOKING_TYPES = ['BOOKING_CREATED','BOOKING_CONFIRMED','BOOKING_STARTED','BOOKING_COMPLETED','BOOKING_CANCELLED'];

interface NotifConfig { icon: string; color: string; bg: string }

const getConfig = (type: string): NotifConfig => {
  const t = type.toUpperCase().replace(/-/g, '_');
  if (t === 'BOOKING_CONFIRMED' || t === 'BOOKING_COMPLETED')
    return { icon: 'calendar',               color: PINK,      bg: PINK_S    };
  if (t === 'BOOKING_CREATED' || t === 'BOOKING_STARTED')
    return { icon: 'calendar-outline',        color: '#3B82F6', bg: '#EFF6FF' };
  if (t === 'BOOKING_CANCELLED')
    return { icon: 'calendar-clear-outline',  color: '#EF4444', bg: '#FEF2F2' };
  if (t === 'NEW_MESSAGE')
    return { icon: 'chatbubble-ellipses',     color: '#7C3AED', bg: '#F5F3FF' };
  if (t === 'PAYMENT_SUCCESSFUL' || t === 'PAYMENT_RECEIVED')
    return { icon: 'wallet',                  color: '#059669', bg: '#ECFDF5' };
  if (t === 'PAYMENT_FAILED')
    return { icon: 'alert-circle',            color: '#EF4444', bg: '#FEF2F2' };
  if (t === 'PAYMENT_REFUNDED')
    return { icon: 'refresh-circle',          color: '#3B82F6', bg: '#EFF6FF' };
  if (t === 'NEW_REVIEW')
    return { icon: 'star',                    color: '#D97706', bg: '#FFFBEB' };
  if (t === 'DISPUTE_CREATED' || t === 'DISPUTE_UPDATED')
    return { icon: 'shield',                  color: '#D97706', bg: '#FFFBEB' };
  if (t === 'PROMOTIONAL')
    return { icon: 'pricetag',               color: '#059669', bg: '#ECFDF5' };
  if (t === 'REMINDER')
    return { icon: 'alarm',                   color: '#EA580C', bg: '#FFF7ED' };
  return   { icon: 'notifications',           color: PINK,      bg: PINK_S    };
};

const formatTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60)    return 'Just now';
    if (secs < 3600)  return `${Math.floor(secs / 60)} min ago`;
    if (isToday(date))     return `${Math.floor(secs / 3600)}h ago`;
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  } catch {
    return 'Recently';
  }
};

const NotificationsScreen: React.FC<{ userRole?: 'client' | 'vendor' }> = ({ userRole = 'client' }) => {
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const [filter,     setFilter]     = useState<Filter>('all');
  const [unreadCount,setUnreadCount]= useState(0);
  const [confirmModal, setConfirmModal] = useState({
    visible: false, title: '', message: '', onConfirm: () => {},
  });

  useEffect(() => { loadNotifications(true); }, [filter]);

  const loadNotifications = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await notificationAPI.getNotifications({
        page: isRefresh ? 1 : page,
        limit: 20,
      });

      let fetched: Notification[] = [];
      if (Array.isArray(response.data)) fetched = response.data;
      else if (response.data?.data && Array.isArray(response.data.data)) fetched = response.data.data;

      const uc = response.meta?.unreadCount ?? response.data?.meta?.unreadCount ?? 0;
      setUnreadCount(uc);

      if (isRefresh) {
        setNotifications(fetched);
        setPage(2);
      } else {
        setNotifications(prev => [...prev, ...fetched]);
        setPage(prev => prev + 1);
      }

      const pag = response.data?.meta?.pagination || response.meta?.pagination;
      setHasMore(pag ? pag.hasNextPage || pag.currentPage < pag.totalPages : fetched.length === 20);
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handlePress = async (n: Notification) => {
    try {
      if (!n.isRead) {
        await notificationAPI.markAsRead(n._id);
        setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      if (n.relatedBooking) {
        const id = typeof n.relatedBooking === 'string' ? n.relatedBooking : n.relatedBooking._id || n.relatedBooking.id;
        navigation.navigate('BookingDetail' as never, { bookingId: id } as never);
      } else if (n.relatedPayment) {
        navigation.navigate('Wallet' as never);
      }
    } catch {}
  };

  const handleMarkAll = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Done', 'All notifications marked as read');
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      visible: true,
      title: 'Delete Notification',
      message: 'Remove this notification?',
      onConfirm: async () => {
        try {
          await notificationAPI.deleteNotification(id);
          const n = notifications.find(x => x._id === id);
          setNotifications(prev => prev.filter(x => x._id !== id));
          if (n && !n.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
          toast.error('Error', handleAPIError(error).message);
        }
      },
    });
  };

  const filtered = notifications.filter(n => {
    if (filter === 'all')      return true;
    if (filter === 'bookings') return BOOKING_TYPES.includes(n.type.toUpperCase().replace(/-/g, '_'));
    if (filter === 'message')  return n.type.toUpperCase().replace(/-/g, '_') === 'NEW_MESSAGE';
    return true;
  });

  const renderItem = ({ item: n }: { item: Notification }) => {
    const cfg = getConfig(n.type);
    return (
      <TouchableOpacity
        onPress={() => handlePress(n)}
        onLongPress={() => handleDelete(n._id)}
        activeOpacity={0.75}
        style={[s.card, !n.isRead && s.cardUnread]}
      >
        {/* Icon */}
        <View style={[s.iconCircle, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
        </View>

        {/* Content */}
        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Text style={s.cardTitle}>{n.title}</Text>
            {!n.isRead && <View style={s.unreadDot} />}
          </View>
          <Text style={s.cardMsg}>{n.message}</Text>
          <Text style={s.cardTime}>{formatTime(n.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={PINK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAll} activeOpacity={0.7}>
            <Text style={s.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.headerSpacer} />
        )}
      </View>

      {/* ── Filter chips ── */}
      <View style={s.filterWrap}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[s.chip, active && s.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      {loading && notifications.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PINK} />
          <Text style={s.loadingText}>Loading notifications…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={[
            s.listContent,
            { paddingBottom: insets.bottom + 32 },
            filtered.length === 0 && s.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor={PINK}
              colors={[PINK]}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={40} color={TEXT3} />
              </View>
              <Text style={s.emptyTitle}>No notifications</Text>
              <Text style={s.emptySub}>
                {filter !== 'all' ? 'No notifications in this category' : "You're all caught up!"}
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore && !loadingMore && filtered.length > 0 ? (
              <TouchableOpacity onPress={() => loadNotifications()} style={s.loadMore} activeOpacity={0.7}>
                <Text style={s.loadMoreText}>Load more</Text>
              </TouchableOpacity>
            ) : loadingMore ? (
              <ActivityIndicator size="small" color={PINK} style={{ paddingVertical: 16 }} />
            ) : null
          }
        />
      )}

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PINK_S },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT1 },
  headerSpacer: { width: 80 },
  markAll: { fontSize: 13, fontWeight: '600', color: PINK },

  // Filters
  filterWrap: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  chip: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1.5, borderColor: BORDER,
  },
  chipActive: { backgroundColor: PINK, borderColor: PINK },
  chipText: { fontSize: 13, fontWeight: '600', color: TEXT2 },
  chipTextActive: { color: WHITE },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  listEmpty: { flex: 1 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: WHITE, borderRadius: 18,
    padding: 16,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    }),
  },
  cardUnread: { backgroundColor: '#FFF8FB' },
  iconCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: TEXT1, flex: 1, marginRight: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', flexShrink: 0 },
  cardMsg: { fontSize: 13, color: TEXT2, lineHeight: 19, marginBottom: 6 },
  cardTime: { fontSize: 12, color: TEXT3, fontWeight: '500' },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: TEXT2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    }),
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT1 },
  emptySub: { fontSize: 13, color: TEXT3, textAlign: 'center', paddingHorizontal: 40 },

  loadMore: { alignItems: 'center', paddingVertical: 16 },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: PINK },
});

export default NotificationsScreen;
