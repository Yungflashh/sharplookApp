import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Conversation {
  id: string;
  vendorName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  avatar: string;
}

type NavigationProp = NativeStackNavigationProp<any>;

const ChatScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const conversations: Conversation[] = [
    {
      id: '1',
      vendorName: 'AdeChioma Signature',
      lastMessage: 'Your appointment is confirmed for tomorrow at 2 PM',
      timestamp: '2m ago',
      unreadCount: 2,
      isOnline: true,
      avatar: '',
    },
    {
      id: '2',
      vendorName: 'Rin_Adex Beauty',
      lastMessage: 'Thank you for your booking! See you soon 😊',
      timestamp: '1h ago',
      unreadCount: 0,
      isOnline: true,
      avatar: '',
    },
    {
      id: '3',
      vendorName: 'Tossyglams Spa',
      lastMessage: 'We have a special discount this weekend',
      timestamp: '3h ago',
      unreadCount: 1,
      isOnline: false,
      avatar: '',
    },
    {
      id: '4',
      vendorName: 'Glam Studio',
      lastMessage: 'Your photos are ready for pickup',
      timestamp: 'Yesterday',
      unreadCount: 0,
      isOnline: false,
      avatar: '',
    },
    {
      id: '5',
      vendorName: 'Beauty Haven',
      lastMessage: 'Would you like to reschedule?',
      timestamp: '2 days ago',
      unreadCount: 0,
      isOnline: false,
      avatar: '',
    },
  ];

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.vendorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || (activeTab === 'unread' && conv.unreadCount > 0);
    return matchesSearch && matchesTab;
  });

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pb-4"
      >
        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center mr-3"
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white">Messages</Text>
              <Text className="text-xs text-white/90 mt-0.5">
                {totalUnread} unread {totalUnread === 1 ? 'message' : 'messages'}
              </Text>
            </View>
          </View>
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-5 mt-2">
          <View className="flex-row items-center bg-white/20 rounded-2xl px-4 py-3">
            <Ionicons name="search" size={20} color="#fff" />
            <TextInput
              className="flex-1 ml-2 text-sm text-white"
              placeholder="Search conversations..."
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row px-5 mt-4 gap-2">
          <TouchableOpacity
            onPress={() => setActiveTab('all')}
            className={`flex-1 py-2.5 rounded-xl ${
              activeTab === 'all' ? 'bg-white' : 'bg-white/20'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-center font-semibold text-sm ${
                activeTab === 'all' ? 'text-pink-600' : 'text-white'
              }`}
            >
              All Messages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('unread')}
            className={`flex-1 py-2.5 rounded-xl ${
              activeTab === 'unread' ? 'bg-white' : 'bg-white/20'
            }`}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-center">
              <Text
                className={`text-center font-semibold text-sm ${
                  activeTab === 'unread' ? 'text-pink-600' : 'text-white'
                }`}
              >
                Unread
              </Text>
              {totalUnread > 0 && (
                <View className="ml-2 bg-pink-500 px-2 py-0.5 rounded-full min-w-[20px] items-center">
                  <Text className="text-white text-[10px] font-bold">{totalUnread}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Conversations List */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {filteredConversations.length > 0 ? (
          <View className="py-2">
            {filteredConversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                className="bg-white mx-4 mb-2 rounded-2xl overflow-hidden"
                style={{
                  ...Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                    },
                    android: {
                      elevation: 2,
                    },
                  }),
                }}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('ChatDetail', {
                    vendorId: conversation.id,
                    vendorName: conversation.vendorName,
                  })
                }
              >
                <View className="flex-row items-center p-4">
                  {/* Avatar */}
                  <View className="relative mr-3">
                    <View className="w-14 h-14 rounded-full bg-pink-50 items-center justify-center">
                      <Ionicons name="person" size={28} color="#eb278d" />
                    </View>
                    {conversation.isOnline && (
                      <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </View>

                  {/* Message Info */}
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-base font-bold text-gray-900 flex-1 pr-2">
                        {conversation.vendorName}
                      </Text>
                      <Text className="text-xs text-gray-500">{conversation.timestamp}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-sm flex-1 pr-2 ${
                          conversation.unreadCount > 0
                            ? 'text-gray-900 font-semibold'
                            : 'text-gray-500'
                        }`}
                        numberOfLines={1}
                      >
                        {conversation.lastMessage}
                      </Text>
                      {conversation.unreadCount > 0 && (
                        <View className="bg-pink-500 rounded-full min-w-[24px] h-6 items-center justify-center px-2">
                          <Text className="text-white text-xs font-bold">
                            {conversation.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          // Empty State
          <View className="flex-1 items-center justify-center px-5 py-20">
            <View className="w-32 h-32 rounded-full bg-pink-50 items-center justify-center mb-6">
              <Ionicons name="chatbubbles-outline" size={64} color="#eb278d" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">No conversations</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              {searchQuery
                ? 'No results found for your search'
                : 'Start chatting with vendors to see your conversations here'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View
        className="px-5 py-3 bg-white border-t border-gray-200"
        style={{
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
            },
            android: {
              elevation: 4,
            },
          }),
        }}
      >
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-pink-50 py-3 rounded-xl"
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={18} color="#eb278d" />
            <Text className="text-pink-600 font-semibold text-sm ml-2">Search Vendors</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-pink-500 py-3 rounded-xl"
            activeOpacity={0.8}
            style={{
              shadowColor: '#eb278d',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white font-semibold text-sm ml-2">New Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;