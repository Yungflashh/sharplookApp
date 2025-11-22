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
  ScrollView,
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
import callService from '@/services/call.service';

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
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [otherUserActivity, setOtherUserActivity] = useState<UserActivity>('offline');

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldScrollToEnd = useRef(true);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    console.log('🔌 Setting up socket for conversation:', conversationId);

    socketService.joinConversation(conversationId);

    socketService.onJoinedConversation((data) => {
      console.log('✅ Joined conversation room:', data.conversationId);
    });

    socketService.onMessageReceived((data) => {
      console.log('📨 NEW MESSAGE RECEIVED:', data);
      
      const newMessage = data.message;
      
      setMessages((prev) => {
        const exists = prev.some(m => m._id === newMessage._id);
        if (exists) {
          console.log('ℹ️ Message already exists, skipping');
          return prev;
        }
        
        console.log('✅ Adding new message to list in real-time');
        return [...prev, newMessage];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      if (newMessage.sender._id !== currentUserId) {
        socketService.markMessageAsDelivered(newMessage._id);
        console.log('✓ Marked as delivered (user online, received message)');
      }
    });

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

    socketService.onTypingStart((data) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        console.log('⌨️ Other user started typing');
        setIsOtherUserTyping(true);
        setOtherUserActivity('typing');
        
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

    socketService.onMessageReaction((data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      );
    });

    socketService.onMessageDeleted((data) => {
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== data.messageId)
      );
    });

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

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Chat screen focused - ensuring socket connected');
      
      if (!socketService.isSocketConnected()) {
        console.log('🔌 Reconnecting socket...');
        socketService.connect();
      }

      if (conversationId) {
        socketService.joinConversation(conversationId);
        
        console.log('👁️ Marking received messages as read');
        
        messages.forEach((message) => {
          if (
            message.sender._id !== currentUserId && 
            message.status !== 'read'
          ) {
            console.log('  📖 Marking message as read:', message._id);
            socketService.markMessageAsRead(message._id);
          }
        });
        
        socketService.markConversationAsRead(conversationId);
        console.log('✅ Conversation marked as read');
      }

      return () => {
        console.log('👋 Chat screen unfocused');
      };
    }, [conversationId, messages, currentUserId])
  );

  useEffect(() => {
    loadCurrentUser();
    requestPermissions();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      initializeConversation();
    }
  }, [currentUserId]);

  // Scroll to bottom ONLY after initial messages load
  const hasScrolledOnLoad = useRef(false);
  
  useEffect(() => {
    if (messages.length > 0 && !loading && !hasScrolledOnLoad.current) {
      // Multiple scroll attempts to ensure it works on first load only
      const scrollToBottom = () => {
        flatListRef.current?.scrollToEnd({ animated: false });
      };

      // Immediate scroll
      scrollToBottom();

      // Delayed scrolls for reliability
      const timer1 = setTimeout(scrollToBottom, 100);
      const timer2 = setTimeout(scrollToBottom, 300);
      const timer3 = setTimeout(scrollToBottom, 500);
      
      // Mark that we've scrolled once
      hasScrolledOnLoad.current = true;
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [messages.length, loading]);

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

  const handleCall = (type: 'voice' | 'video') => {
    if (!otherUserId) return;

    navigation.navigate('OngoingCall', {
      callId: undefined,
      callType: type,
      isOutgoing: true,
      otherUser: {
        _id: otherUserId,
        firstName: otherUser?.firstName || otherUserName?.split(' ')[0] || 'User',
        lastName: otherUser?.lastName || otherUserName?.split(' ')[1] || '',
        avatar: otherUser?.avatar || otherUserAvatar
      }
    });
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

    if (conversationId) {
      socketService.stopTyping(conversationId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      setSending(true);

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

        console.log('✅ Emitting uploading:stop');
        socketService.emit('uploading:stop', conversationId);
      }

      const response = await messageAPI.sendMessage(messageData);

      if (response.success) {
        console.log('✅ Message sent successfully');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Send message error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to send message');
      
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

  const scrollToMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg._id === messageId);
    
    if (messageIndex !== -1) {
      try {
        flatListRef.current?.scrollToIndex({
          index: messageIndex,
          animated: true,
          viewPosition: 0.5, // Center the message on screen
        });
        
        // Highlight the message briefly
        setHighlightedMessageId(messageId);
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 2000); // Remove highlight after 2 seconds
      } catch (error) {
        // Fallback: If scrollToIndex fails, scroll to offset
        console.log('ScrollToIndex failed, trying alternative method');
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    } else {
      // Message not found in current list (might be older, not loaded yet)
      Alert.alert(
        'Message Not Found',
        'The original message might have been deleted or is not loaded yet.'
      );
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender._id === currentUserId;
    const isHighlighted = item._id === highlightedMessageId;

    return (
      <SwipeableMessage
        message={item}
        isMyMessage={isMyMessage}
        isHighlighted={isHighlighted}
        onReply={() => setReplyingTo(item)}
        onScrollToReply={scrollToMessage}
        otherUser={otherUser}
        formatMessageTime={formatMessageTime}
      />
    );
  };

  const renderMediaPreview = () => {
    if (!selectedMedia) return null;

    return (
      <View className="bg-white border-t border-gray-100" style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 4,
      }}>
        <View className="px-4 py-3">
          <View className="bg-gray-50 rounded-2xl p-3 flex-row items-center">
            {selectedMedia.uri && (
              <Image
                source={{ uri: selectedMedia.uri }}
                className="w-14 h-14 rounded-xl mr-3"
                resizeMode="cover"
              />
            )}
            <View className="flex-1">
              <Text className="text-gray-900 font-semibold text-sm" numberOfLines={1}>
                {selectedMedia.name || 'Selected media'}
              </Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                Ready to send
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedMedia(null)}
              className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center ml-2"
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderReplyPreview = () => {
    if (!replyingTo) return null;

    const isReplyingToMe = replyingTo.sender._id === currentUserId;

    return (
      <View className="bg-white border-t border-gray-100" style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 4,
      }}>
        <View className="px-4 py-3">
          <View className="bg-pink-50 rounded-2xl overflow-hidden">
            <View className="flex-row items-center p-3">
              {/* Left accent bar */}
              <View className="w-1 h-full absolute left-0 bg-pink-500" />
              
              {/* Avatar */}
              <View className="ml-3 w-10 h-10 rounded-full bg-white items-center justify-center overflow-hidden mr-3"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                {isReplyingToMe ? (
                  <Ionicons name="person" size={18} color="#eb278d" />
                ) : replyingTo.sender.avatar ? (
                  <Image
                    source={{ uri: replyingTo.sender.avatar }}
                    className="w-10 h-10"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={18} color="#eb278d" />
                )}
              </View>

              {/* Content */}
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="arrow-undo" size={12} color="#eb278d" />
                  <Text className="text-pink-600 font-bold text-xs ml-1">
                    Replying to {isReplyingToMe ? 'yourself' : replyingTo.sender.firstName}
                  </Text>
                </View>
                <Text className="text-gray-700 text-sm font-medium" numberOfLines={2}>
                  {replyingTo.text || '📎 Attachment'}
                </Text>
              </View>

              {/* Close button */}
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                className="w-7 h-7 rounded-full bg-white items-center justify-center ml-3"
                activeOpacity={0.7}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <Ionicons name="close" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderUserStatus = () => {
    switch (otherUserActivity) {
      case 'typing':
        return (
          <View className="flex-row items-center mt-1">
            <View className="flex-row items-center mr-1.5">
              <View className="w-1.5 h-1.5 rounded-full bg-white/90 mr-0.5" />
              <View className="w-1.5 h-1.5 rounded-full bg-white/70 mr-0.5" />
              <View className="w-1.5 h-1.5 rounded-full bg-white/50" />
            </View>
            <Text className="text-white/95 text-xs font-medium">typing...</Text>
          </View>
        );

      case 'recording':
        return (
          <View className="flex-row items-center mt-1">
            <View className="w-2 h-2 rounded-full bg-red-400 mr-1.5" />
            <Ionicons name="mic" size={11} color="rgba(255,255,255,0.95)" />
            <Text className="text-white/95 text-xs font-medium ml-1">recording...</Text>
          </View>
        );

      case 'uploading':
        return (
          <View className="flex-row items-center mt-1">
            <ActivityIndicator size="small" color="rgba(255,255,255,0.95)" />
            <Text className="text-white/95 text-xs font-medium ml-1.5">sending...</Text>
          </View>
        );

      case 'online':
        return (
          <View className="flex-row items-center mt-1">
            <View className="w-2 h-2 rounded-full bg-green-400 mr-1.5" />
            <Text className="text-white/90 text-xs font-medium">Active now</Text>
          </View>
        );

      case 'offline':
      default:
        return (
          <Text className="text-white/75 text-xs mt-1">Tap to view info</Text>
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4 font-medium">Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <LinearGradient
          colors={['#eb278d', '#f472b6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            shadowColor: '#eb278d',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
        <View className="px-4 py-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-row items-center flex-1"
              activeOpacity={0.7}
            >
              <View className="relative mr-3">
                <View className="w-11 h-11 rounded-full bg-white/30 items-center justify-center overflow-hidden"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 3,
                  }}
                >
                  {(otherUser?.avatar || otherUserAvatar) ? (
                    <Image
                      source={{ uri: otherUser?.avatar || otherUserAvatar }}
                      className="w-11 h-11"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={22} color="#fff" />
                  )}
                </View>
                
                {isOtherUserOnline && (
                  <View className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
                )}
              </View>

              <View className="flex-1">
                <Text className="text-white font-bold text-lg">
                  {otherUser?.firstName && otherUser?.lastName
                    ? `${otherUser.firstName} ${otherUser.lastName}`
                    : otherUserName || 'User'}
                </Text>
                
                {renderUserStatus()}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleCall('video')}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center ml-2"
              activeOpacity={0.7}
            >
              <Ionicons name="videocam" size={22} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleCall('voice')}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center ml-2"
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ 
            paddingVertical: 12,
            paddingHorizontal: 4,
            flexGrow: 1,
          }}
          inverted={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          extraData={`${isOtherUserTyping}-${highlightedMessageId}`}
          onScrollToIndexFailed={(info) => {
            // Handle scroll failure gracefully
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ 
                index: info.index, 
                animated: true,
                viewPosition: 0.5 
              });
            });
          }}
          ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <View className="w-24 h-24 rounded-full bg-pink-100 items-center justify-center mb-4">
              <Ionicons name="chatbubbles" size={48} color="#eb278d" />
            </View>
            <Text className="text-gray-900 font-bold text-xl mb-2">
              Start the conversation
            </Text>
            <Text className="text-gray-500 text-center px-12 text-sm">
              Send a message to begin chatting with {otherUser?.firstName || 'this user'}
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

        {/* Recording UI */}
        {isRecording && (
        <View className="bg-gradient-to-r from-red-50 to-pink-50 border-t border-red-100">
          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-full bg-red-500 items-center justify-center mr-3">
                  <Ionicons name="mic" size={24} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-red-600 font-bold text-base">Recording...</Text>
                  <Text className="text-red-400 text-xs mt-0.5">Release to send</Text>
                </View>
              </View>

              <View className="flex-row" style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={cancelRecording}
                  className="px-5 py-2.5 rounded-full bg-white border border-gray-200"
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-700 font-bold text-sm">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={stopRecording}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#eb278d', '#f472b6']}
                    className="px-6 py-2.5 rounded-full"
                  >
                    <Text className="text-white font-bold text-sm">Send</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
        )}

        {/* Input Area */}
        <View
        className="bg-white border-t border-gray-100"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <View className="px-4 py-3">
          <View className="flex-row items-end">
            <TouchableOpacity
              onPress={() => setShowAttachmentMenu(true)}
              className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center mr-2"
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={26} color="#6b7280" />
            </TouchableOpacity>

            <View className="flex-1 bg-gray-100 rounded-3xl overflow-hidden">
              <TextInput
                value={inputText}
                onChangeText={handleTextChange}
                placeholder="Message..."
                placeholderTextColor="#9ca3af"
                className="px-5 py-3 text-gray-900 text-base"
                multiline
                maxLength={1000}
                style={{ maxHeight: 100 }}
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
                  className="ml-2"
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#eb278d', '#f472b6']}
                    className="w-11 h-11 rounded-full items-center justify-center"
                    style={{
                      shadowColor: '#eb278d',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 6,
                    }}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={18} color="#fff" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={startRecording}
                  className="ml-2"
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#eb278d', '#f472b6']}
                    className="w-11 h-11 rounded-full items-center justify-center"
                    style={{
                      shadowColor: '#eb278d',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.4,
                      shadowRadius: 6,
                      elevation: 6,
                    }}
                  >
                    <Ionicons name="mic" size={22} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Attachment Menu Modal */}
        <AttachmentMenuModal
        visible={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onPickImage={handlePickImage}
        onTakePhoto={handleTakePhoto}
        onPickVideo={handlePickVideo}
        onPickDocument={handlePickDocument}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Swipeable Message Component
const SwipeableMessage: React.FC<{
  message: Message;
  isMyMessage: boolean;
  isHighlighted: boolean;
  onReply: () => void;
  onScrollToReply: (messageId: string) => void;
  otherUser: any;
  formatMessageTime: (date: string) => string;
}> = ({ message, isMyMessage, isHighlighted, onReply, onScrollToReply, otherUser, formatMessageTime }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isMyMessage) {
          if (gestureState.dx < 0 && gestureState.dx > -80) {
            translateX.setValue(gestureState.dx);
          }
        } else {
          if (gestureState.dx > 0 && gestureState.dx < 80) {
            translateX.setValue(gestureState.dx);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = 40;
        
        if (Math.abs(gestureState.dx) > threshold) {
          onReply();
        }
        
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{ transform: [{ translateX }] }}
      className={`mb-3 px-3 ${isMyMessage ? 'items-end' : 'items-start'}`}
    >
      <View className="flex-row items-end max-w-[85%]">
        {!isMyMessage && (
          <View 
            className="w-8 h-8 rounded-full bg-pink-400 items-center justify-center mr-2 overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
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
          className={`rounded-3xl overflow-hidden ${
            isMyMessage ? 'rounded-br-md' : 'rounded-bl-md'
          } ${isHighlighted ? 'bg-yellow-100' : ''}`}
          style={
            isMyMessage
              ? {
                  shadowColor: '#eb278d',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 3,
                  ...(isHighlighted && {
                    shadowColor: '#fbbf24',
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 8,
                  })
                }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                  elevation: 2,
                  ...(isHighlighted && {
                    shadowColor: '#fbbf24',
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 8,
                  })
                }
          }
        >
          {isMyMessage ? (
            <LinearGradient
              colors={['#eb278d', '#f472b6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="px-4 py-2.5"
            >
              {message.replyTo && (
                <TouchableOpacity 
                  onPress={() => onScrollToReply(message.replyTo!._id)}
                  activeOpacity={0.7}
                  className="mb-2 pb-2 border-b border-white/20"
                >
                  <Text className="text-white/80 text-xs font-medium mb-0.5">
                    ↩ {message.replyTo.sender.firstName}
                  </Text>
                  <Text className="text-white/70 text-xs italic" numberOfLines={1}>
                    {message.replyTo.text}
                  </Text>
                </TouchableOpacity>
              )}

              {message.attachments && message.attachments.length > 0 && (
                <View className="mb-2">
                  {message.attachments[0].type === 'image' && (
                    <Image
                      source={{ uri: message.attachments[0].url }}
                      className="w-52 h-52 rounded-2xl"
                      resizeMode="cover"
                    />
                  )}
                  {message.attachments[0].type === 'audio' && (
                    <View className="flex-row items-center py-2 px-2">
                      <Ionicons name="play-circle" size={36} color="#fff" />
                      <View className="ml-2 flex-1">
                        <Text className="text-white font-medium">Voice message</Text>
                        <Text className="text-white/70 text-xs">Tap to play</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {message.text && (
                <Text className="text-white text-base leading-5">
                  {message.text}
                </Text>
              )}

              <View className="flex-row items-center justify-end mt-1.5">
                <Text className="text-white/80 text-xs">
                  {formatMessageTime(message.createdAt)}
                </Text>

                <View className="ml-1">
                  {(message.status === 'sent' || !message.status) && (
                    <Ionicons name="checkmark" size={14} color="rgba(255, 255, 255, 0.8)" />
                  )}
                  {message.status === 'delivered' && (
                    <Ionicons name="checkmark-done" size={14} color="rgba(255, 255, 255, 0.8)" />
                  )}
                  {message.status === 'read' && (
                    <Ionicons name="checkmark-done" size={14} color="#60a5fa" />
                  )}
                </View>
              </View>
            </LinearGradient>
          ) : (
            <View className="bg-white px-4 py-2.5">
              {message.replyTo && (
                <TouchableOpacity 
                  onPress={() => onScrollToReply(message.replyTo!._id)}
                  activeOpacity={0.7}
                  className="mb-2 pb-2 border-b border-gray-200"
                >
                  <Text className="text-pink-600 text-xs font-medium mb-0.5">
                    ↩ {message.replyTo.sender.firstName}
                  </Text>
                  <Text className="text-gray-500 text-xs italic" numberOfLines={1}>
                    {message.replyTo.text}
                  </Text>
                </TouchableOpacity>
              )}

              {message.attachments && message.attachments.length > 0 && (
                <View className="mb-2">
                  {message.attachments[0].type === 'image' && (
                    <Image
                      source={{ uri: message.attachments[0].url }}
                      className="w-52 h-52 rounded-2xl"
                      resizeMode="cover"
                    />
                  )}
                  {message.attachments[0].type === 'audio' && (
                    <View className="flex-row items-center py-2 px-2">
                      <Ionicons name="play-circle" size={36} color="#eb278d" />
                      <View className="ml-2 flex-1">
                        <Text className="text-gray-900 font-medium">Voice message</Text>
                        <Text className="text-gray-500 text-xs">Tap to play</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {message.text && (
                <Text className="text-gray-900 text-base leading-5">
                  {message.text}
                </Text>
              )}

              <Text className="text-gray-500 text-xs mt-1.5">
                {formatMessageTime(message.createdAt)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// Attachment Menu Modal
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
        className="flex-1 bg-black/60 justify-end"
      >
        <TouchableOpacity 
          activeOpacity={1} 
          className="bg-white rounded-t-3xl"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <View className="p-6">
            <View className="w-12 h-1.5 bg-gray-300 rounded-full self-center mb-6" />

            <Text className="text-2xl font-bold text-gray-900 mb-6">
              Share content
            </Text>

            <View className="flex-row flex-wrap gap-4 mb-4">
              <TouchableOpacity
                onPress={() => {
                  onPickImage();
                  onClose();
                }}
                className="items-center flex-1 min-w-[70px]"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#ec4899', '#f472b6']}
                  className="w-16 h-16 rounded-2xl items-center justify-center mb-2"
                  style={{
                    shadowColor: '#ec4899',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="images" size={28} color="#fff" />
                </LinearGradient>
                <Text className="text-gray-700 text-sm font-semibold">Photos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onTakePhoto();
                  onClose();
                }}
                className="items-center flex-1 min-w-[70px]"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#3b82f6', '#60a5fa']}
                  className="w-16 h-16 rounded-2xl items-center justify-center mb-2"
                  style={{
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="camera" size={28} color="#fff" />
                </LinearGradient>
                <Text className="text-gray-700 text-sm font-semibold">Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onPickVideo();
                  onClose();
                }}
                className="items-center flex-1 min-w-[70px]"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#f97316', '#fb923c']}
                  className="w-16 h-16 rounded-2xl items-center justify-center mb-2"
                  style={{
                    shadowColor: '#f97316',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="videocam" size={28} color="#fff" />
                </LinearGradient>
                <Text className="text-gray-700 text-sm font-semibold">Video</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onPickDocument();
                  onClose();
                }}
                className="items-center flex-1 min-w-[70px]"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#10b981', '#34d399']}
                  className="w-16 h-16 rounded-2xl items-center justify-center mb-2"
                  style={{
                    shadowColor: '#10b981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="document-text" size={28} color="#fff" />
                </LinearGradient>
                <Text className="text-gray-700 text-sm font-semibold">Files</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="mt-4 bg-gray-100 py-4 rounded-2xl"
              activeOpacity={0.7}
            >
              <Text className="text-center text-gray-700 font-bold text-base">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default ChatDetailScreen;