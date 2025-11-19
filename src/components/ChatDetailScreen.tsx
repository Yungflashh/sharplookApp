import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { messageAPI, handleAPIError } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import socketService from '@/services/socket.service';

type ChatDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChatDetail'>;
type ChatDetailRouteProp = RouteProp<RootStackParamList, 'ChatDetail'>;

interface Message {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  receiver: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
  text?: string;
  attachments?: Array<{
    url: string;
    type: string;
    name?: string;
  }>;
  status: 'sent' | 'delivered' | 'read';
  readAt?: string;
  deliveredAt?: string;
  createdAt: string;
  replyTo?: {
    _id: string;
    text: string;
    sender: {
      firstName: string;
      lastName: string;
    };
  };
}

type UserActivity = 'typing' | 'recording' | 'uploading' | 'online' | 'offline';

const ChatDetailScreen: React.FC = () => {
  const navigation = useNavigation<ChatDetailNavigationProp>();
  const route = useRoute<ChatDetailRouteProp>();
  const { otherUserId, otherUserName, otherUserAvatar } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  
  // Enhanced features
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  
  // Socket features - Enhanced
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [otherUserActivity, setOtherUserActivity] = useState<UserActivity>('offline');

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== SOCKET.IO SETUP ====================

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    console.log('🔌 Setting up socket for conversation:', conversationId);

    // Join conversation room
    socketService.joinConversation(conversationId);

    // Listen for joined confirmation
    socketService.onJoinedConversation((data) => {
      console.log('✅ Joined conversation room:', data.conversationId);
    });

    // Listen for new messages - REAL-TIME MESSAGE UPDATES
    socketService.onMessageReceived((data) => {
      console.log('📨 NEW MESSAGE RECEIVED:', data);
      
      const newMessage = data.message;
      
      // Add message immediately to UI
      setMessages((prev) => {
        const exists = prev.some(m => m._id === newMessage._id);
        if (exists) {
          console.log('ℹ️ Message already exists, skipping');
          return prev;
        }
        
        console.log('✅ Adding new message to list in real-time');
        return [...prev, newMessage];
      });

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // ✅ CORRECT: Only mark as DELIVERED when receiving message
      // Message is delivered to device, but NOT yet read by user
      if (newMessage.sender._id !== currentUserId) {
        socketService.markMessageAsDelivered(newMessage._id);
        console.log('✓ Marked as delivered (user online, received message)');
        
        // Note: We do NOT mark as read here automatically
        // Read status will be set when user actively views this chat
      }
    });

    // Listen for message status updates (read receipts)
    socketService.onMessageStatus((data) => {
      console.log('📊 Message status update:', data);
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? {
                ...msg,
                status: data.status,
                readAt: data.readAt || msg.readAt,
                deliveredAt: data.deliveredAt || msg.deliveredAt,
              }
            : msg
        )
      );
    });

    // Listen for typing indicators
    socketService.onTypingStart((data) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        console.log('⌨️ Other user started typing');
        setIsOtherUserTyping(true);
        setOtherUserActivity('typing');
        
        // Auto-clear after 5 seconds
        setTimeout(() => {
          setIsOtherUserTyping(false);
          setOtherUserActivity(isOtherUserOnline ? 'online' : 'offline');
        }, 5000);
      }
    });

    socketService.onTypingStop((data) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        console.log('🛑 Other user stopped typing');
        setIsOtherUserTyping(false);
        setOtherUserActivity(isOtherUserOnline ? 'online' : 'offline');
      }
    });

    // Listen for recording indicators (NEW)
    socketService.on('recording:start', (data: any) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        console.log('🎤 Other user started recording');
        setOtherUserActivity('recording');
      }
    });

    socketService.on('recording:stop', (data: any) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        console.log('🛑 Other user stopped recording');
        setOtherUserActivity(isOtherUserOnline ? 'online' : 'offline');
      }
    });

    // Listen for uploading indicators (NEW)
    socketService.on('uploading:start', (data: any) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        console.log('📤 Other user started uploading');
        setOtherUserActivity('uploading');
      }
    });

    socketService.on('uploading:stop', (data: any) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        console.log('✅ Other user finished uploading');
        setOtherUserActivity(isOtherUserOnline ? 'online' : 'offline');
      }
    });

    // Listen for message reactions
    socketService.onMessageReaction((data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    });

    // Listen for message deletions
    socketService.onMessageDeleted((data) => {
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== data.messageId)
      );
    });

    // Listen for conversation read updates
    socketService.onConversationRead((data) => {
      if (data.conversationId === conversationId && data.readBy !== currentUserId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender._id === currentUserId
              ? { ...msg, status: 'read' as const }
              : msg
          )
        );
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('🚪 Leaving conversation and cleaning up');
      socketService.leaveConversation(conversationId);
      socketService.removeListener('message:received');
      socketService.removeListener('message:status');
      socketService.removeListener('typing:start');
      socketService.removeListener('typing:stop');
      socketService.removeListener('recording:start');
      socketService.removeListener('recording:stop');
      socketService.removeListener('uploading:start');
      socketService.removeListener('uploading:stop');
      socketService.removeListener('message:reaction');
      socketService.removeListener('message:deleted');
      socketService.removeListener('conversation:read');
      socketService.removeListener('joined:conversation');
    };
  }, [conversationId, currentUserId, isOtherUserOnline]);

  // Listen for user online/offline status
  useEffect(() => {
    if (!otherUserId) return;

    socketService.requestUserStatus([otherUserId]);

    socketService.onUserStatusResponse((statuses) => {
      const userStatus = statuses.find(s => s.userId === otherUserId);
      if (userStatus) {
        setIsOtherUserOnline(userStatus.isOnline);
        setOtherUserActivity(userStatus.isOnline ? 'online' : 'offline');
      }
    });

    socketService.onUserStatus((data) => {
      if (data.userId === otherUserId) {
        console.log('🟢 User status:', data.isOnline ? 'online' : 'offline');
        setIsOtherUserOnline(data.isOnline);
        setOtherUserActivity(data.isOnline ? 'online' : 'offline');
      }
    });

    return () => {
      socketService.removeListener('user:status');
      socketService.removeListener('user:status:response');
    };
  }, [otherUserId]);

  // ==================== RECONNECT SOCKET ON FOCUS ====================
  
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Chat screen focused - ensuring socket connected');
      
      // Reconnect socket if needed
      if (!socketService.isSocketConnected()) {
        console.log('🔌 Reconnecting socket...');
        socketService.connect();
      }

      // Rejoin conversation room if needed
      if (conversationId) {
        socketService.joinConversation(conversationId);
        
        // ✅ CORRECT: Mark incoming messages as READ when I view the chat
        // This tells the OTHER person that I read THEIR messages
        console.log('👁️ Marking received messages as read');
        
        // Mark all unread messages from OTHER user as read
        messages.forEach((message) => {
          if (
            message.sender._id !== currentUserId && // Message from other user
            message.status !== 'read'
          ) {
            console.log('  📖 Marking message as read:', message._id);
            socketService.markMessageAsRead(message._id);
          }
        });
        
        // Mark conversation as read
        socketService.markConversationAsRead(conversationId);
        console.log('✅ Conversation marked as read');
      }

      return () => {
        console.log('👋 Chat screen unfocused');
      };
    }, [conversationId, messages, currentUserId])
  );

  // ==================== LIFECYCLE ====================

  useEffect(() => {
    loadCurrentUser();
    requestPermissions();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      initializeConversation();
    }
  }, [currentUserId]);

  const requestPermissions = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await ImagePicker.requestCameraPermissionsAsync();
    await Audio.requestPermissionsAsync();
  };

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

  const initializeConversation = async () => {
    try {
      setLoading(true);

      const convResponse = await messageAPI.getOrCreateConversation(otherUserId);
      
      if (convResponse.success) {
        const conversation = convResponse.data.conversation || convResponse.data;
        setConversationId(conversation._id);

        const other = conversation.participants.find(
          (p: any) => p._id.toString() !== currentUserId
        );
        if (other) {
          setOtherUser(other);
          setIsOtherUserOnline(other.isOnline || false);
          setOtherUserActivity(other.isOnline ? 'online' : 'offline');
        }

        await loadMessages(conversation._id);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Initialize conversation error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string, pageNum: number = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await messageAPI.getMessages(convId, {
        page: pageNum,
        limit: 50,
      });

      if (response.success) {
        const newMessages = response.data.messages || response.data;

        if (pageNum === 1) {
          setMessages(newMessages);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        } else {
          setMessages((prev) => [...newMessages, ...prev]);
        }

        setHasMore(newMessages.length === 50);
        setPage(pageNum);

        if (conversationId) {
          socketService.markConversationAsRead(convId);
        }
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Load messages error:', apiError);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!conversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (text.length > 0) {
      socketService.startTyping(conversationId);

      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(conversationId);
      }, 3000);
    } else {
      socketService.stopTyping(conversationId);
    }
  };

  const handleSendMessage = async (mediaUri?: string, mediaType?: string) => {
    if ((!inputText.trim() && !mediaUri) || !conversationId || !currentUserId) return;

    const messageText = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    // Stop typing indicator
    if (conversationId) {
      socketService.stopTyping(conversationId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      setSending(true);

      // Emit uploading indicator if sending media
      if (mediaUri) {
        console.log('📤 Emitting uploading:start');
        socketService.emit('uploading:start', conversationId);
      }

      let messageData: any = {
        receiverId: otherUserId,
        messageType: mediaType || 'text',
      };

      if (messageText) {
        messageData.text = messageText;
      }

      if (replyingTo) {
        messageData.replyTo = replyingTo._id;
        setReplyingTo(null);
      }

      if (mediaUri) {
        const uploadResponse = await messageAPI.uploadAttachment({
          uri: mediaUri,
          type: mediaType,
        });

        if (uploadResponse.success) {
          messageData.attachments = [{
            url: uploadResponse.data.url,
            type: mediaType,
            name: uploadResponse.data.name,
            size: uploadResponse.data.size,
          }];
        }

        // Stop uploading indicator
        console.log('✅ Emitting uploading:stop');
        socketService.emit('uploading:stop', conversationId);
      }

      const response = await messageAPI.sendMessage(messageData);

      if (response.success) {
        console.log('✅ Message sent successfully');
        
        // Message will be received via socket 'message:received' event
        // So we don't need to add it manually here anymore
        // The socket will handle real-time updates for both sender and receiver
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Send message error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to send message');
      
      // Stop uploading indicator on error
      if (mediaUri && conversationId) {
        socketService.emit('uploading:stop', conversationId);
      }
    } finally {
      setSending(false);
      setSelectedMedia(null);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0]);
        setShowAttachmentMenu(false);
      }
    } catch (error) {
      console.error('Pick image error:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0]);
        setShowAttachmentMenu(false);
      }
    } catch (error) {
      console.error('Take photo error:', error);
    }
  };

  const handlePickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0]);
        setShowAttachmentMenu(false);
      }
    } catch (error) {
      console.error('Pick video error:', error);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setSelectedMedia(result);
        setShowAttachmentMenu(false);
      }
    } catch (error) {
      console.error('Pick document error:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Emit recording indicator
      if (conversationId) {
        console.log('🎤 Emitting recording:start');
        socketService.emit('recording:start', conversationId);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Start recording error:', error);
      
      // Stop recording indicator on error
      if (conversationId) {
        socketService.emit('recording:stop', conversationId);
      }
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Stop recording indicator
      if (conversationId) {
        console.log('🛑 Emitting recording:stop');
        socketService.emit('recording:stop', conversationId);
      }
      
      if (uri) {
        await handleSendMessage(uri, 'audio');
      }
      
      setRecording(null);
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  };

  const cancelRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        setRecording(null);
        setIsRecording(false);
        
        // Stop recording indicator
        if (conversationId) {
          socketService.emit('recording:stop', conversationId);
        }
      } catch (error) {
        console.error('Cancel recording error:', error);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && conversationId) {
      loadMessages(conversationId, page + 1);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender._id === currentUserId;

    return (
      <SwipeableMessage
        message={item}
        isMyMessage={isMyMessage}
        onReply={() => setReplyingTo(item)}
        otherUser={otherUser}
        formatMessageTime={formatMessageTime}
      />
    );
  };

  const renderMediaPreview = () => {
    if (!selectedMedia) return null;

    return (
      <View className="px-4 py-3 bg-gray-100 border-t border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {selectedMedia.uri && (
              <Image
                source={{ uri: selectedMedia.uri }}
                className="w-16 h-16 rounded-lg mr-3"
                resizeMode="cover"
              />
            )}
            <View className="flex-1">
              <Text className="text-gray-900 font-medium" numberOfLines={1}>
                {selectedMedia.name || 'Selected media'}
              </Text>
              <Text className="text-gray-500 text-xs">
                Tap send to share
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setSelectedMedia(null)}
            className="w-8 h-8 rounded-full bg-red-500 items-center justify-center ml-2"
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderReplyPreview = () => {
    if (!replyingTo) return null;

    return (
      <View className="px-4 py-2 bg-gray-100 border-t border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 border-l-4 border-pink-500 pl-3">
            <Text className="text-pink-600 font-bold text-xs mb-1">
              Replying to {replyingTo.sender.firstName}
            </Text>
            <Text className="text-gray-600 text-sm" numberOfLines={1}>
              {replyingTo.text}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setReplyingTo(null)}
            className="w-6 h-6 rounded-full bg-gray-300 items-center justify-center ml-2"
          >
            <Ionicons name="close" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Enhanced status renderer with all activities
  const renderUserStatus = () => {
    switch (otherUserActivity) {
      case 'typing':
        return (
          <View className="flex-row items-center mt-0.5">
            <View className="flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-pink-400 mr-1" />
              <View className="w-1.5 h-1.5 rounded-full bg-pink-400 mr-1" style={{ opacity: 0.7 }} />
              <View className="w-1.5 h-1.5 rounded-full bg-pink-400 mr-2" style={{ opacity: 0.5 }} />
            </View>
            <Text className="text-white/90 text-xs font-medium">typing...</Text>
          </View>
        );

      case 'recording':
        return (
          <View className="flex-row items-center mt-0.5">
            <View className="w-2 h-2 rounded-full bg-red-400 mr-1.5 animate-pulse" />
            <Ionicons name="mic" size={12} color="rgba(255,255,255,0.9)" />
            <Text className="text-white/90 text-xs font-medium ml-1">recording voice note...</Text>
          </View>
        );

      case 'uploading':
        return (
          <View className="flex-row items-center mt-0.5">
            <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
            <Text className="text-white/90 text-xs font-medium ml-1.5">sending media...</Text>
          </View>
        );

      case 'online':
        return (
          <View className="flex-row items-center mt-0.5">
            <View className="w-2 h-2 rounded-full bg-green-400 mr-1.5" />
            <Text className="text-white/80 text-xs">Online</Text>
          </View>
        );

      case 'offline':
      default:
        return (
          <View className="flex-row items-center mt-0.5">
            <View className="w-2 h-2 rounded-full bg-gray-400 mr-1.5" />
            <Text className="text-white/70 text-xs">Offline</Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4">Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Enhanced Header with All Status Indicators */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="px-5 py-4 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View className="w-10 h-10 rounded-full bg-white/30 items-center justify-center mr-3 overflow-hidden">
              {(otherUser?.avatar || otherUserAvatar) ? (
                <Image
                  source={{ uri: otherUser?.avatar || otherUserAvatar }}
                  className="w-10 h-10"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={20} color="#fff" />
              )}
              
              {/* Online indicator dot on avatar */}
              {isOtherUserOnline && (
                <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-white font-bold text-base">
                {otherUser?.firstName && otherUser?.lastName
                  ? `${otherUser.firstName} ${otherUser.lastName}`
                  : otherUserName || 'User'}
              </Text>
              
              {/* Dynamic Status: Recording > Uploading > Typing > Online > Offline */}
              {renderUserStatus()}
            </View>
          </View>

          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingVertical: 16 }}
        inverted={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        extraData={isOtherUserTyping}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Ionicons name="chatbubbles" size={40} color="#d1d5db" />
            </View>
            <Text className="text-gray-900 font-bold text-lg mb-2">
              No messages yet
            </Text>
            <Text className="text-gray-500 text-center px-12">
              Start the conversation by sending a message
            </Text>
          </View>
        }
        ListHeaderComponent={
          loadingMore ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#eb278d" />
            </View>
          ) : null
        }
      />

      {/* Reply Preview */}
      {renderReplyPreview()}

      {/* Media Preview */}
      {renderMediaPreview()}

      {/* Voice Recording Indicator */}
      {isRecording && (
        <View className="px-4 py-3 bg-red-50 border-t border-red-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
              <Text className="text-red-600 font-medium">Recording...</Text>
            </View>

            <View className="flex-row" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={cancelRecording}
                className="px-4 py-2 rounded-full bg-gray-200"
              >
                <Text className="text-gray-700 font-bold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={stopRecording}
                className="px-4 py-2 rounded-full bg-pink-500"
              >
                <Text className="text-white font-bold">Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View
          className="px-4 py-3 bg-white border-t border-gray-200"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => setShowAttachmentMenu(true)}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#6b7280" />
            </TouchableOpacity>

            <View className="flex-1 bg-gray-100 rounded-full px-4 py-3 flex-row items-center">
              <TextInput
                value={inputText}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                className="flex-1 text-gray-900 text-base"
                multiline
                maxLength={1000}
                returnKeyType="send"
                onSubmitEditing={() => handleSendMessage()}
                blurOnSubmit={false}
              />
            </View>

            {inputText.trim() || selectedMedia ? (
              <TouchableOpacity
                onPress={() => {
                  if (selectedMedia) {
                    handleSendMessage(selectedMedia.uri, selectedMedia.type || 'image');
                  } else {
                    handleSendMessage();
                  }
                }}
                disabled={sending}
                className="ml-3"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#eb278d', '#f472b6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{
                    shadowColor: '#eb278d',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={startRecording}
                className="ml-3"
                activeOpacity={0.7}
              >
                <View className="w-12 h-12 rounded-full bg-pink-500 items-center justify-center">
                  <Ionicons name="mic" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Menu Modal */}
      <AttachmentMenuModal
        visible={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onPickImage={handlePickImage}
        onTakePhoto={handleTakePhoto}
        onPickVideo={handlePickVideo}
        onPickDocument={handlePickDocument}
      />
    </SafeAreaView>
  );
};

// Swipeable Message Component (unchanged)
const SwipeableMessage: React.FC<{
  message: Message;
  isMyMessage: boolean;
  onReply: () => void;
  otherUser: any;
  formatMessageTime: (date: string) => string;
}> = ({ message, isMyMessage, onReply, otherUser, formatMessageTime }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isMyMessage) {
          if (gestureState.dx < 0 && gestureState.dx > -100) {
            translateX.setValue(gestureState.dx);
          }
        } else {
          if (gestureState.dx > 0 && gestureState.dx < 100) {
            translateX.setValue(gestureState.dx);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 50;
        
        if (Math.abs(gestureState.dx) > threshold) {
          onReply();
        }
        
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{ transform: [{ translateX }] }}
      className={`mb-4 px-4 ${isMyMessage ? 'items-end' : 'items-start'}`}
    >
      <View className="flex-row items-end max-w-[80%]">
        {!isMyMessage && (
          <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center mr-2 overflow-hidden">
            {otherUser?.avatar ? (
              <Image
                source={{ uri: otherUser.avatar }}
                className="w-8 h-8"
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={16} color="#fff" />
            )}
          </View>
        )}

        <View
          className={`rounded-2xl px-4 py-3 ${
            isMyMessage ? 'bg-pink-500' : 'bg-gray-100'
          }`}
        >
          {message.replyTo && (
            <View className="mb-2 pb-2 border-b border-white/20">
              <Text
                className={`text-xs ${
                  isMyMessage ? 'text-white/70' : 'text-gray-500'
                }`}
              >
                Replying to {message.replyTo.sender.firstName}
              </Text>
              <Text
                className={`text-xs italic ${
                  isMyMessage ? 'text-white/70' : 'text-gray-500'
                }`}
                numberOfLines={1}
              >
                {message.replyTo.text}
              </Text>
            </View>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <View className="mb-2">
              {message.attachments[0].type === 'image' && (
                <Image
                  source={{ uri: message.attachments[0].url }}
                  className="w-48 h-48 rounded-lg"
                  resizeMode="cover"
                />
              )}
              {message.attachments[0].type === 'audio' && (
                <View className="flex-row items-center py-2">
                  <Ionicons name="play-circle" size={32} color={isMyMessage ? '#fff' : '#eb278d'} />
                  <Text className={`ml-2 ${isMyMessage ? 'text-white' : 'text-gray-900'}`}>
                    Voice message
                  </Text>
                </View>
              )}
            </View>
          )}

          {message.text && (
            <Text
              className={`text-base ${
                isMyMessage ? 'text-white' : 'text-gray-900'
              }`}
            >
              {message.text}
            </Text>
          )}

          <View className="flex-row items-center justify-end mt-1">
            <Text
              className={`text-xs ${
                isMyMessage ? 'text-white/70' : 'text-gray-500'
              }`}
            >
              {formatMessageTime(message.createdAt)}
            </Text>

            {isMyMessage && (
              <View className="ml-1">
                {(message.status === 'sent' || !message.status) && (
                  // Single checkmark - Message sent (gray)
                  // Show for 'sent' status or if status is undefined (default)
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="rgba(255, 255, 255, 0.7)"
                  />
                )}
                {message.status === 'delivered' && (
                  // Double checkmark - Message delivered (gray)
                  <Ionicons
                    name="checkmark-done"
                    size={14}
                    color="rgba(255, 255, 255, 0.7)"
                  />
                )}
                {message.status === 'read' && (
                  // Double checkmark - Message read (blue)
                  <Ionicons
                    name="checkmark-done"
                    size={14}
                    color="#60a5fa"
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// Attachment Menu Modal (unchanged)
const AttachmentMenuModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onTakePhoto: () => void;
  onPickVideo: () => void;
  onPickDocument: () => void;
}> = ({ visible, onClose, onPickImage, onTakePhoto, onPickVideo, onPickDocument }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 bg-black/50 justify-end"
      >
        <TouchableOpacity activeOpacity={1} className="bg-white rounded-t-3xl p-6">
          <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

          <Text className="text-xl font-bold text-gray-900 mb-6">
            Share
          </Text>

          <View className="flex-row flex-wrap gap-4">
            <TouchableOpacity
              onPress={() => {
                onPickImage();
                onClose();
              }}
              className="items-center flex-1 min-w-[80px]"
            >
              <View className="w-16 h-16 rounded-full bg-pink-100 items-center justify-center mb-2">
                <Ionicons name="images" size={32} color="#eb278d" />
              </View>
              <Text className="text-gray-700 text-sm font-medium">Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onTakePhoto();
                onClose();
              }}
              className="items-center flex-1 min-w-[80px]"
            >
              <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-2">
                <Ionicons name="camera" size={32} color="#3b82f6" />
              </View>
              <Text className="text-gray-700 text-sm font-medium">Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onPickVideo();
                onClose();
              }}
              className="items-center flex-1 min-w-[80px]"
            >
              <View className="w-16 h-16 rounded-full bg-purple-100 items-center justify-center mb-2">
                <Ionicons name="videocam" size={32} color="#a855f7" />
              </View>
              <Text className="text-gray-700 text-sm font-medium">Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onPickDocument();
                onClose();
              }}
              className="items-center flex-1 min-w-[80px]"
            >
              <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-2">
                <Ionicons name="document" size={32} color="#10b981" />
              </View>
              <Text className="text-gray-700 text-sm font-medium">Document</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="mt-6 bg-gray-100 py-4 rounded-2xl"
          >
            <Text className="text-center text-gray-700 font-bold text-base">
              Cancel
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default ChatDetailScreen;