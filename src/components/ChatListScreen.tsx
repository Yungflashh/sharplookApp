import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { messageAPI, handleAPIError } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';
import { isToday, isYesterday, format } from 'date-fns';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const PINK_M = '#FCDCE9';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG     = '#F8F9FA';
const WHITE  = '#FFFFFF';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    isOnline?: boolean;
    lastSeen?: string;
  }>;
  lastMessage?: {
    _id?: string;
    text: string;
    sender: { _id: string; firstName: string; lastName?: string };
    messageType?: string;
    createdAt?: string;
    sentAt: string;
  };
  unreadCount: { [userId: string]: number };
  updatedAt: string;
}

const formatTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isToday(d))     return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (isYesterday(d)) return 'Yesterday';
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff < 7)       return format(d, 'EEE');
    return format(d, 'MMM d');
  } catch { return ''; }
};

const getInitials = (first: string, last?: string) =>
  `${first.charAt(0)}${last ? last.charAt(0) : ''}`.toUpperCase();

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [conversations,   setConversations]   = useState<Conversation[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [currentUserId,   setCurrentUserId]   = useState<string | null>(null);
  const [totalUnread,     setTotalUnread]      = useState(0);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchFocused,   setSearchFocused]   = useState(false);

  useEffect(() => { loadCurrentUser(); }, []);
  useEffect(() => { if (currentUserId) loadConversations(); }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      if (currentUserId) loadConversations();
      const interval = setInterval(() => { if (currentUserId) loadConversations(true); }, 30000);
      return () => clearInterval(interval);
    }, [currentUserId])
  );

  const loadCurrentUser = async () => {
    try {
      const u = await getStoredUser();
      if (u) setCurrentUserId(u._id);
    } catch {}
  };

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await messageAPI.getConversations({ page: 1, limit: 50 });
      if (res.success) {
        const convos: Conversation[] = res.data.conversations || res.data || [];
        setConversations(convos);
        const unread = convos.reduce((s, c) => s + (c.unreadCount?.[currentUserId || ''] || 0), 0);
        setTotalUnread(unread);
      }
    } catch (error) {
      handleAPIError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getOtherParticipant = (c: Conversation) =>
    c.participants.find(p => p._id.toString() !== currentUserId);

  const getPreview = (c: Conversation): string => {
    if (!c.lastMessage) return 'Start a conversation';
    const mine = c.lastMessage.sender._id === currentUserId;
    const pre  = mine ? 'You: ' : '';
    if (c.lastMessage.text) return `${pre}${c.lastMessage.text}`;
    const t = c.lastMessage.messageType;
    if (t === 'image') return `${pre}📷 Photo`;
    if (t === 'audio') return `${pre}🎤 Voice message`;
    if (t === 'video') return `${pre}🎬 Video`;
    if (t === 'file')  return `${pre}📎 File`;
    return `${pre}Sent a message`;
  };

  const handlePress = (c: Conversation) => {
    const other = getOtherParticipant(c);
    if (!other) return;
    navigation.navigate('ChatDetail', {
      otherUserId:    other._id,
      otherUserName:  `${other.firstName} ${other.lastName}`,
      otherUserAvatar: other.avatar,
    });
  };

  const filtered = searchQuery.trim()
    ? conversations.filter(c => {
        const other = getOtherParticipant(c);
        if (!other) return false;
        return `${other.firstName} ${other.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  const renderItem = ({ item: c }: { item: Conversation }) => {
    const other = getOtherParticipant(c);
    if (!other) return null;
    const unread    = c.unreadCount?.[currentUserId || ''] || 0;
    const hasUnread = unread > 0;
    const timeStr   = c.lastMessage ? formatTime(c.lastMessage.sentAt || c.lastMessage.createdAt || c.updatedAt) : '';

    return (
      <TouchableOpacity
        onPress={() => handlePress(c)}
        style={s.card}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={[s.avatar, hasUnread && s.avatarUnread]}>
            {other.avatar ? (
              <Image source={{ uri: other.avatar }} style={s.avatarImg} resizeMode="cover" />
            ) : (
              <Text style={s.avatarInitials}>{getInitials(other.firstName, other.lastName)}</Text>
            )}
          </View>
          {other.isOnline && <View style={s.onlineDot} />}
        </View>

        {/* Content */}
        <View style={s.cardBody}>
          <View style={s.cardRow}>
            <Text style={[s.name, hasUnread && s.nameBold]} numberOfLines={1}>{other.firstName} {other.lastName}</Text>
            <Text style={[s.time, hasUnread && s.timePink]}>{timeStr}</Text>
          </View>
          <View style={s.cardRow}>
            <Text style={[s.preview, hasUnread && s.previewBold]} numberOfLines={1}>{getPreview(c)}</Text>
            {hasUnread && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
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
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Messages</Text>
          {totalUnread > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <View style={s.headerSpacer} />
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <View style={[s.searchBar, searchFocused && s.searchBarFocused]}>
          <Ionicons name="search-outline" size={18} color={searchFocused ? PINK : TEXT3} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations…"
            placeholderTextColor={TEXT3}
            style={s.searchInput}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={TEXT3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PINK} />
          <Text style={s.loadingText}>Loading chats…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 24, flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadConversations(); }}
              tintColor={PINK}
              colors={[PINK]}
            />
          }
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={42} color={TEXT3} />
              </View>
              <Text style={s.emptyTitle}>
                {searchQuery ? 'No results found' : 'No messages yet'}
              </Text>
              <Text style={s.emptySub}>
                {searchQuery
                  ? 'Try a different name'
                  : 'Start a conversation by visiting a vendor profile'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT1 },
  headerBadge: {
    backgroundColor: PINK, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
    minWidth: 20, alignItems: 'center',
  },
  headerBadgeText: { fontSize: 11, fontWeight: '700', color: WHITE },
  headerSpacer: { width: 38 },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: BG, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: BORDER,
  },
  searchBarFocused: { borderColor: PINK, backgroundColor: PINK_S },
  searchInput: { flex: 1, fontSize: 14, color: TEXT1, paddingVertical: 0 },

  // List
  listContent: { paddingTop: 8, paddingHorizontal: 16 },
  separator: { height: 8 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: WHITE, borderRadius: 18,
    padding: 14,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    }),
  },

  // Avatar
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: PINK_S,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarUnread: { borderColor: PINK },
  avatarImg: { width: 52, height: 52 },
  avatarInitials: { fontSize: 18, fontWeight: '700', color: PINK },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2, borderColor: WHITE,
  },

  // Card body
  cardBody: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '500', color: TEXT1, flex: 1, marginRight: 8 },
  nameBold: { fontWeight: '700' },
  time: { fontSize: 12, color: TEXT3, fontWeight: '500', flexShrink: 0 },
  timePink: { color: PINK, fontWeight: '700' },
  preview: { fontSize: 13, color: TEXT2, flex: 1, marginRight: 8 },
  previewBold: { fontWeight: '600', color: TEXT1 },
  badge: {
    backgroundColor: PINK, borderRadius: 12,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6, flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: WHITE },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: TEXT2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    }),
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT1 },
  emptySub: { fontSize: 13, color: TEXT3, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});

export default ChatListScreen;
