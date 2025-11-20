import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { messageAPI, handleAPIError } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';

type ChatListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

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
    _id: string;
    text: string;
    sender: {
      _id: string;
      firstName: string;
    };
    messageType: string;
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
}

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListNavigationProp>();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

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

      const response = await messageAPI.getConversations({
        page: 1,
        limit: 50,
      });

      if (response.success) {
        const convos = response.data.conversations || response.data || [];
        setConversations(convos);

        
        const unreadTotal = convos.reduce(
          (sum: number, conv: Conversation) => sum + (conv.unreadCount || 0),
          0
        );
        setTotalUnreadCount(unreadTotal);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Load conversations error:', apiError);
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

    if (conversation.lastMessage.messageType === 'text') {
      return `${prefix}${conversation.lastMessage.text}`;
    }

    const typeMap: { [key: string]: string } = {
      image: '📷 Photo',
      video: '🎥 Video',
      audio: '🎤 Voice message',
      file: '📄 File',
    };

    return `${prefix}${typeMap[conversation.lastMessage.messageType] || 'Message'}`;
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

    navigation.navigate('ChatDetail', {
      otherUserId: otherUser._id,
      otherUserName: `${otherUser.firstName} ${otherUser.lastName}`,
      otherUserAvatar: otherUser.avatar,
    });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherUser = getOtherParticipant(item);
    if (!otherUser) return null;

    const hasUnread = (item.unreadCount || 0) > 0;

    return (
      <TouchableOpacity
        onPress={() => handleConversationPress(item)}
        className="bg-white px-5 py-4 border-b border-gray-100"
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          {}
          <View className="relative mr-3">
            <View
              className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center overflow-hidden"
              style={{
                borderWidth: hasUnread ? 2 : 0,
                borderColor: hasUnread ? '#eb278d' : 'transparent',
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
            {otherUser.isOnline && (
              <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            )}
          </View>

          {}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className={`text-base ${
                  hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                }`}
                numberOfLines={1}
              >
                {otherUser.firstName} {otherUser.lastName}
              </Text>

              {item.lastMessage && (
                <Text
                  className={`text-xs ${
                    hasUnread ? 'text-pink-600 font-bold' : 'text-gray-500'
                  }`}
                >
                  {formatTime(item.lastMessage.createdAt)}
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
                <View className="ml-2 min-w-[22px] h-[22px] bg-pink-500 rounded-full items-center justify-center px-1.5">
                  <Text className="text-white text-xs font-bold">
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4">Loading chats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="px-5 py-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-white">Messages</Text>
            {totalUnreadCount > 0 && (
              <Text className="text-sm text-white/80 mt-0.5">
                {totalUnreadCount} unread {totalUnreadCount === 1 ? 'message' : 'messages'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {}
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#eb278d"
            colors={['#eb278d']}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20 px-8">
            <View
              className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
            </View>
            <Text className="text-gray-900 font-bold text-lg mb-2">No messages yet</Text>
            <Text className="text-gray-500 text-center text-sm leading-5">
              Start a conversation by messaging a vendor from their profile
            </Text>
          </View>
        }
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: '#fff',
        }}
      />
    </SafeAreaView>
  );
};

export default ChatListScreen;