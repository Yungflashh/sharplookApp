import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { messageAPI, handleAPIError } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';

type ChatListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChatList'>;

const PRIMARY = '#eb278d';
const PRIMARY_SOFT = '#FCE4EC';

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    isOnline?: boolean;
    isVerified?: boolean;
    lastSeen?: string;
  }>;
  lastMessage?: {
    _id?: string;
    text: string;
    sender: {
      _id: string;
      firstName: string;
      lastName?: string;
    };
    messageType?: string;
    createdAt?: string;
    sentAt: string;
  };
  unreadCount: { [userId: string]: number };
  updatedAt: string;
}

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListNavigationProp>();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadConversations();
    }
  }, [currentUserId]);

  
  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        loadConversations();
      }

      
      const interval = setInterval(() => {
        if (currentUserId) {
          loadConversations(true); 
        }
      }, 30000);

      return () => clearInterval(interval);
    }, [currentUserId])
  );

  const loadCurrentUser = async () => {
    try {
      const userData = await getStoredUser();
      if (userData) {
        console.log('Current user loaded:', userData._id);
        setCurrentUserId(userData._id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadConversations = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      console.log('\n🔄 Fetching conversations...');
      const response = await messageAPI.getConversations({
        page: 1,
        limit: 50,
      });

      
      console.log('\n=== FULL API RESPONSE ===');
      console.log(JSON.stringify(response, null, 2));
      console.log('=========================\n');

      if (response.success) {
        const convos = response.data.conversations || response.data || [];
        
        
        console.log('=== CONVERSATIONS ARRAY ===');
        console.log('Total conversations:', convos.length);
        console.log(JSON.stringify(convos, null, 2));
        console.log('===========================\n');

        
        convos.forEach((conv: Conversation, index: number) => {
          console.log(`\n--- Conversation ${index + 1} ---`);
          console.log('ID:', conv._id);
          console.log('Participants:', JSON.stringify(conv.participants, null, 2));
          console.log('Last Message:', JSON.stringify(conv.lastMessage, null, 2));
          console.log('Unread Count:', conv.unreadCount);
          console.log('Updated At:', conv.updatedAt);
          console.log('------------------------\n');
        });

        setConversations(convos);

        
        const unreadTotal = convos.reduce(
          (sum: number, conv: Conversation) => {
            const userUnreadCount = conv.unreadCount?.[currentUserId || ''] || 0;
            return sum + userUnreadCount;
          },
          0
        );
        console.log('📊 Total unread count for current user:', unreadTotal);
        setTotalUnreadCount(unreadTotal);
      } else {
        console.warn('⚠️ API response was not successful');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('❌ Load conversations error:', apiError);
      console.error('Full error object:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations();
  }, []);

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(
      (p) => p._id.toString() !== currentUserId
    );
  };

  const formatMessagePreview = (conversation: Conversation) => {
    if (!conversation.lastMessage) {
      return 'Start a conversation';
    }

    const isMyMessage = conversation.lastMessage.sender._id === currentUserId;
    const prefix = isMyMessage ? 'You: ' : '';
    const msg = conversation.lastMessage;

    if (msg.text) {
      return `${prefix}${msg.text}`;
    }

    switch (msg.messageType) {
      case 'image':
        return `${prefix}Sent a photo`;
      case 'audio':
        return `${prefix}Sent a voice message`;
      case 'video':
        return `${prefix}Sent a video`;
      case 'file':
        return `${prefix}Sent a file`;
      default:
        return `${prefix}Sent a message`;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleConversationPress = (conversation: Conversation) => {
    const otherUser = getOtherParticipant(conversation);
    if (!otherUser) return;

    console.log('Navigating to chat with:', otherUser.firstName, otherUser.lastName);

    navigation.navigate('ChatDetail', {
      otherUserId: otherUser._id,
      otherUserName: `${otherUser.firstName} ${otherUser.lastName}`,
      otherUserAvatar: otherUser.avatar,
    });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherUser = getOtherParticipant(item);
    if (!otherUser) return null;

    
    const userUnreadCount = item.unreadCount?.[currentUserId || ''] || 0;
    const hasUnread = userUnreadCount > 0;

    return (
      <TouchableOpacity
        onPress={() => handleConversationPress(item)}
        className="bg-white mx-5 mb-3 rounded-2xl p-3"
        activeOpacity={0.7}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center">
          {}
          <View className="relative mr-3">
            <View
              className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center overflow-hidden"
              style={{
                borderWidth: hasUnread ? 2 : 0,
                borderColor: hasUnread ? PRIMARY : 'transparent',
              }}
            >
              {otherUser.avatar ? (
                <Image
                  source={{ uri: otherUser.avatar }}
                  className="w-14 h-14"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={28} color="#9ca3af" />
              )}
            </View>

            {}
            <View
              className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white"
              style={{ backgroundColor: otherUser.isOnline ? '#22c55e' : '#d1d5db' }}
            />
          </View>

          {}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center flex-1 mr-2">
                <Text
                  className={`text-base ${
                    hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                  }`}
                  numberOfLines={1}
                >
                  {otherUser.firstName} {otherUser.lastName}
                </Text>
                {otherUser.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color={PRIMARY} style={{ marginLeft: 4 }} />
                )}
              </View>

              {item.lastMessage && (
                <Text
                  className={`text-xs ${
                    hasUnread ? 'font-bold' : 'text-gray-500'
                  }`}
                  style={hasUnread ? { color: PRIMARY } : undefined}
                >
                  {formatTime(item.lastMessage.sentAt)}
                </Text>
              )}
            </View>

            <View className="flex-row items-center justify-between">
              <Text
                className={`flex-1 text-sm ${
                  hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}
                numberOfLines={1}
              >
                {formatMessagePreview(item)}
              </Text>

              {}
              {hasUnread && (
                <View
                  className="ml-2 min-w-[22px] h-[22px] rounded-full items-center justify-center px-1.5"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <Text className="text-white text-xs font-bold">
                    {userUnreadCount > 99 ? '99+' : userUnreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredConversations = conversations.filter((conv) => {
    const otherUser = getOtherParticipant(conv);
    if (!otherUser) return false;

    if (filter === 'unread') {
      const unread = conv.unreadCount?.[currentUserId || ''] || 0;
      if (unread === 0) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = `${otherUser.firstName} ${otherUser.lastName}`.toLowerCase();
      const preview = formatMessagePreview(conv).toLowerCase();
      if (!name.includes(q) && !preview.includes(q)) return false;
    }

    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PRIMARY_SOFT }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text className="text-gray-500 text-sm mt-4">Loading chats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PRIMARY_SOFT }} edges={['top']}>
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Messages</Text>
        </View>

        {}
        <View
          className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-3"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-sm text-gray-900"
            placeholder="Search Message"
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
        <View className="flex-row" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
            className="px-5 py-2 rounded-full"
            style={{
              backgroundColor: filter === 'all' ? PRIMARY : '#fff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: filter === 'all' ? '#fff' : '#374151' }}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('unread')}
            activeOpacity={0.8}
            className="flex-row items-center px-5 py-2 rounded-full"
            style={{
              gap: 6,
              backgroundColor: filter === 'unread' ? PRIMARY : '#fff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: filter === 'unread' ? '#fff' : '#374151' }}
            >
              Unread
            </Text>
            {totalUnreadCount > 0 && (
              <View
                className="min-w-[18px] h-[18px] rounded-full items-center justify-center px-1"
                style={{ backgroundColor: filter === 'unread' ? 'rgba(255,255,255,0.3)' : PRIMARY }}
              >
                <Text className="text-white text-[10px] font-bold">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20 px-8">
            <View
              className="w-24 h-24 rounded-full bg-white items-center justify-center mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Ionicons name="chatbubbles-outline" size={48} color="#d1a3bb" />
            </View>
            <Text className="text-gray-900 font-bold text-lg mb-2">
              {searchQuery.trim() ? 'No matches found' : filter === 'unread' ? "You're all caught up!" : 'No messages yet'}
            </Text>
            <Text className="text-gray-500 text-center text-sm leading-5">
              {searchQuery.trim()
                ? 'Try a different name or keyword'
                : filter === 'unread'
                ? 'No unread conversations right now'
                : 'Start a conversation by messaging a vendor from their profile'}
            </Text>
          </View>
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 4,
          paddingBottom: 20,
        }}
      />
    </SafeAreaView>
  );
};

export default ChatListScreen;