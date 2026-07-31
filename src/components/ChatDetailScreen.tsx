import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Animated,
  PanResponder,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { toast } from '@/components/ui/Toast';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  blue: '#3B82F6',
  blueSoft: '#DBEAFE',
  green: '#10B981',
  greenSoft: '#D1FAE5',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  // Chat-specific
  myBubble: '#E04079',
  myBubbleDark: '#B5315F',
  theirBubble: '#FFFFFF',
  chatBg: '#F3F4F6',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Nav    = NativeStackNavigationProp<RootStackParamList, 'ChatDetail'>;
type RouteP = RouteProp<RootStackParamList, 'ChatDetail'>;
type UserActivity = 'typing' | 'recording' | 'uploading' | 'online' | 'offline';

interface Message {
  _id: string;
  sender: { _id: string; firstName: string; lastName: string; avatar?: string };
  receiver: { _id: string; firstName: string; lastName: string; avatar?: string };
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'call';
  text?: string;
  attachments?: Array<{ url: string; type: string; name?: string }>;
  callInfo?: { type: 'voice' | 'video'; status: 'missed' | 'completed' | 'rejected' | 'cancelled'; duration?: number };
  status: 'sending' | 'failed' | 'sent' | 'delivered' | 'read';
  readAt?: string;
  deliveredAt?: string;
  createdAt: string;
  replyTo?: { _id: string; text: string; sender: { firstName: string; lastName: string } };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const ChatDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { otherUserId, otherUserName, otherUserAvatar } = route.params;
  const insets = useSafeAreaInsets();

  const [messages, setMessages]                   = useState<Message[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [inputText, setInputText]                 = useState('');
  const [conversationId, setConversationId]       = useState<string | null>(null);
  const [currentUserId, setCurrentUserId]         = useState<string | null>(null);
  const [page, setPage]                           = useState(1);
  const [hasMore, setHasMore]                     = useState(true);
  const [loadingMore, setLoadingMore]             = useState(false);
  const [otherUser, setOtherUser]                 = useState<any>(null);
  const [replyingTo, setReplyingTo]               = useState<Message | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [recording, setRecording]                 = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording]             = useState(false);
  const [selectedMedia, setSelectedMedia]         = useState<any>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [otherUserActivity, setOtherUserActivity] = useState<UserActivity>('offline');
  const [inputHeight, setInputHeight]             = useState(44);
  const [showChatMenu, setShowChatMenu]           = useState(false);
  const [showChatSearch, setShowChatSearch]       = useState(false);
  const [chatSearchQuery, setChatSearchQuery]     = useState('');

  // Audio
  const [playingAudioId, setPlayingAudioId]       = useState<string | null>(null);
  const [audioProgress, setAudioProgress]         = useState<Record<string, number>>({});
  const [audioDurations, setAudioDurations]       = useState<Record<string, number>>({});
  const soundRef = useRef<Audio.Sound | null>(null);

  const flatListRef      = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasScrolledOnLoad = useRef(false);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    socketService.joinConversation(conversationId);

    socketService.onMessageReceived((data) => {
      const newMessage = data.message;
      setMessages((prev) => {
        // Skip if we already have this exact message
        if (prev.some((m) => m._id === newMessage._id)) return prev;
        // If this is our own message echoed back, replace any temp/optimistic version
        if (newMessage.sender._id === currentUserId) {
          const hasTemp = prev.some((m) => m._id.startsWith('temp_'));
          if (hasTemp) {
            // Replace the oldest temp message with the real one (match by prefix alone)
            let replaced = false;
            return prev.map((m) => {
              if (!replaced && m._id.startsWith('temp_')) {
                replaced = true;
                return { ...newMessage };
              }
              return m;
            });
          }
        }
        return [...prev, newMessage];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      if (newMessage.sender._id !== currentUserId)
        socketService.markMessageAsDelivered(newMessage._id);
    });

    socketService.onMessageStatus((data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, status: data.status, readAt: data.readAt || msg.readAt, deliveredAt: data.deliveredAt || msg.deliveredAt }
            : msg
        )
      );
    });

    socketService.onTypingStart((data) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
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
        setIsOtherUserTyping(false);
        setOtherUserActivity(isOtherUserOnline ? 'online' : 'offline');
      }
    });

    ['recording:start', 'recording:stop', 'uploading:start', 'uploading:stop'].forEach((evt) => {
      socketService.on(evt, (data: any) => {
        if (data.conversationId === conversationId && data.userId !== currentUserId) {
          if (evt === 'recording:start') setOtherUserActivity('recording');
          else if (evt === 'uploading:start') setOtherUserActivity('uploading');
          else setOtherUserActivity(isOtherUserOnline ? 'online' : 'offline');
        }
      });
    });

    socketService.onConversationRead((data) => {
      if (data.conversationId === conversationId && data.readBy !== currentUserId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender._id === currentUserId ? { ...msg, status: 'read' as const } : msg
          )
        );
      }
    });

    return () => {
      socketService.leaveConversation(conversationId);
      ['message:received','message:status','typing:start','typing:stop','recording:start',
       'recording:stop','uploading:start','uploading:stop','message:reaction',
       'message:deleted','conversation:read','joined:conversation'].forEach((e) =>
        socketService.removeListener(e)
      );
    };
  }, [conversationId, currentUserId, isOtherUserOnline]);

  useEffect(() => {
    if (!otherUserId) return;
    socketService.requestUserStatus([otherUserId]);
    socketService.onUserStatusResponse((statuses) => {
      const s = statuses.find((s) => s.userId === otherUserId);
      if (s) { setIsOtherUserOnline(s.isOnline); setOtherUserActivity(s.isOnline ? 'online' : 'offline'); }
    });
    socketService.onUserStatus((data) => {
      if (data.userId === otherUserId) {
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
      if (!socketService.isSocketConnected()) socketService.connect();
      if (conversationId) {
        socketService.joinConversation(conversationId);
        messages.forEach((msg) => {
          if (msg.sender._id !== currentUserId && msg.status !== 'read')
            socketService.markMessageAsRead(msg._id);
        });
        socketService.markConversationAsRead(conversationId);
      }
    }, [conversationId, messages, currentUserId])
  );

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { loadCurrentUser(); requestPermissions(); }, []);

  // Navigation reuses this screen instance when switching between chats (all
  // call sites use `navigate`, not `push`), so reset per-conversation state
  // whenever the target user changes — otherwise the previous chat's messages
  // and scroll position stick around until the new ones happen to load over them.
  useEffect(() => {
    hasScrolledOnLoad.current = false;
    setMessages([]);
    setConversationId(null);
    setPage(1);
    setHasMore(true);
  }, [otherUserId]);

  useEffect(() => { if (currentUserId) initializeConversation(); }, [currentUserId, otherUserId]);

  useEffect(() => {
    if (messages.length > 0 && !loading && !hasScrolledOnLoad.current) {
      flatListRef.current?.scrollToEnd({ animated: false });
      const t1 = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 150);
      const t2 = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 400);
      hasScrolledOnLoad.current = true;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [messages.length, loading]);

  // iOS keyboard handling — scroll to bottom when keyboard shows
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), Platform.OS === 'ios' ? 50 : 100)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => () => { soundRef.current?.unloadAsync(); }, []);

  const requestPermissions = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await ImagePicker.requestCameraPermissionsAsync();
    await Audio.requestPermissionsAsync();
  };

  const loadCurrentUser = async () => {
    try {
      const user = await getStoredUser();
      if (user) setCurrentUserId(user._id);
    } catch (e) { console.error('Error loading user:', e); }
  };

  const initializeConversation = async () => {
    if (!otherUserId || !currentUserId) return;
    try {
      setLoading(true);
      const res = await messageAPI.getOrCreateConversation(otherUserId);
      if (res.success) {
        const conv = res.data.conversation || res.data;
        setConversationId(conv._id);
        const other = conv.participants.find((p: any) => p._id.toString() !== currentUserId);
        if (other) { setOtherUser(other); setIsOtherUserOnline(other.isOnline || false); setOtherUserActivity(other.isOnline ? 'online' : 'offline'); }
        await loadMessages(conv._id);
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message || 'Failed to load conversation');
    } finally { setLoading(false); }
  };

  const loadMessages = async (convId: string, pageNum = 1) => {
    try {
      pageNum === 1 ? setLoading(true) : setLoadingMore(true);
      const res = await messageAPI.getMessages(convId, { page: pageNum, limit: 50 });
      if (res.success) {
        const newMsgs = res.data.messages || res.data;
        pageNum === 1
          ? setMessages(newMsgs)
          : setMessages((prev) => [...newMsgs, ...prev]);
        setHasMore(newMsgs.length === 50);
        setPage(pageNum);
        if (pageNum === 1) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
        socketService.markConversationAsRead(convId);
      }
    } catch (e) { console.error('Load messages error:', e); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  // ── Call handler ──────────────────────────────────────────────────────────
  const handleCall = async (type: 'voice' | 'video') => {
    if (!otherUserId) return;
    try {
      console.log('📞 [ChatDetail] Calling otherUserId:', otherUserId, 'currentUserId:', currentUserId, 'conversationId:', conversationId);
      await callService.initiateCall(otherUserId, type, undefined, conversationId || undefined);
      navigation.navigate('OngoingCall', {
        callId: undefined,
        callType: type,
        isOutgoing: true,
        otherUser: {
          _id: otherUserId,
          firstName: otherUser?.firstName || otherUserName?.split(' ')[0] || 'User',
          lastName:  otherUser?.lastName  || otherUserName?.split(' ')[1] || '',
          avatar:    otherUser?.avatar    || otherUserAvatar,
        },
      });
    } catch (error) {
      toast.error('Error', 'Failed to initiate call. Please try again.');
    }
  };

  // ── Header menu actions ───────────────────────────────────────────────────
  const handleViewProfile = () => {
    setShowChatMenu(false);
    navigation.navigate('VendorDetail', { vendorId: otherUserId });
  };

  const handleOpenChatSearch = () => {
    setShowChatMenu(false);
    setChatSearchQuery('');
    setShowChatSearch(true);
  };

  const handleBlockUser = () => {
    setShowChatMenu(false);
    toast.info('Coming Soon', 'Blocking users isn’t available yet.');
  };

  const handleReportUser = () => {
    setShowChatMenu(false);
    toast.info('Coming Soon', 'Reporting users isn’t available yet.');
  };

  const chatSearchResults = chatSearchQuery.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(chatSearchQuery.trim().toLowerCase()))
    : [];

  const handleJumpToSearchResult = (messageId: string) => {
    setShowChatSearch(false);
    setTimeout(() => scrollToMessage(messageId), 300);
  };

  // ── Typing ────────────────────────────────────────────────────────────────
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!conversationId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (text.length > 0) {
      socketService.startTyping(conversationId);
      typingTimeoutRef.current = setTimeout(() => socketService.stopTyping(conversationId), 3000);
    } else {
      socketService.stopTyping(conversationId);
    }
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const getMessageType = (rawType?: string): 'text' | 'image' | 'video' | 'audio' | 'file' => {
    if (!rawType) return 'text';
    const t = rawType.toLowerCase();
    if (t === 'image' || t.startsWith('image/')) return 'image';
    if (t === 'video' || t.startsWith('video/')) return 'video';
    if (t === 'audio' || t.startsWith('audio/')) return 'audio';
    if (t === 'file' || t === 'document') return 'file';
    return 'file';
  };

  const getMimeType = (rawType?: string, ext?: string): string => {
    if (rawType && rawType.includes('/')) return rawType; // already a MIME type
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
      mp4: 'video/mp4', mov: 'video/quicktime',
      m4a: 'audio/x-m4a', mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac',
    };
    if (ext) {
      const mapped = mimeMap[ext.toLowerCase()];
      if (mapped) return mapped;
    }
    if (rawType === 'image') return 'image/jpeg';
    if (rawType === 'video') return 'video/mp4';
    if (rawType === 'audio') return 'audio/x-m4a';
    return 'application/octet-stream';
  };

  const handleSendMessage = async (mediaUri?: string, mediaType?: string, fileObject?: any) => {
    if ((!inputText.trim() && !mediaUri) || !conversationId || !currentUserId) return;
    const messageText = inputText.trim();
    setInputText('');
    setInputHeight(44);
    Keyboard.dismiss();
    if (conversationId) socketService.stopTyping(conversationId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const msgType = getMessageType(mediaType);
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const replySnapshot = replyingTo ? { _id: replyingTo._id, text: replyingTo.text || '', sender: { firstName: replyingTo.sender.firstName, lastName: replyingTo.sender.lastName } } : undefined;
    if (replyingTo) setReplyingTo(null);

    // Build optimistic message and show it immediately
    const optimisticMsg: Message = {
      _id: tempId,
      sender: { _id: currentUserId, firstName: '', lastName: '', avatar: undefined },
      receiver: { _id: otherUserId, firstName: '', lastName: '' },
      messageType: msgType,
      text: messageText || undefined,
      attachments: mediaUri ? [{ url: mediaUri, type: msgType, name: 'Sending…' }] : undefined,
      replyTo: replySnapshot,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setSelectedMedia(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    // Send to backend in background
    try {
      if (mediaUri) socketService.emit('uploading:start', conversationId);

      let messageData: any = { receiverId: otherUserId, messageType: msgType };
      if (messageText) messageData.text = messageText;
      if (replySnapshot) messageData.replyTo = replySnapshot._id;

      if (mediaUri) {
        const ext = mediaUri.split('.').pop()?.split('?')[0] || '';
        const mime = getMimeType(mediaType, ext);
        const uploadFile = fileObject || {
          uri: mediaUri,
          type: mime,
          name: `${msgType}_${Date.now()}.${ext || (msgType === 'image' ? 'jpg' : msgType === 'video' ? 'mp4' : 'm4a')}`,
        };
        console.log('📤 Uploading attachment:', { uri: uploadFile.uri?.substring(0, 50), type: uploadFile.type, name: uploadFile.name });
        const uploadRes = await messageAPI.uploadAttachment(uploadFile);
        if (uploadRes.success) {
          messageData.attachments = [{ url: uploadRes.data.url, type: msgType, name: uploadRes.data.name, size: uploadRes.data.size }];
        }
        socketService.emit('uploading:stop', conversationId);
      }

      const res = await messageAPI.sendMessage(messageData);
      // Replace temp message with the real one from the server
      const realMsg = res.data?.message || res.data;
      if (realMsg?._id) {
        setMessages((prev) => prev.map((m) => m._id === tempId ? { ...realMsg, status: realMsg.status || 'sent' } : m));
      } else {
        // Server responded OK but no message returned — just mark as sent
        setMessages((prev) => prev.map((m) => m._id === tempId ? { ...m, status: 'sent' as const } : m));
      }
    } catch (error) {
      console.error('❌ Send message error:', error);
      // Mark the optimistic message as failed so user can retry
      setMessages((prev) => prev.map((m) => m._id === tempId ? { ...m, status: 'failed' as const } : m));
      if (mediaUri && conversationId) socketService.emit('uploading:stop', conversationId);
    }
  };

  const handleRetryMessage = (failedMsg: Message) => {
    // Remove the failed message and re-send
    setMessages((prev) => prev.filter((m) => m._id !== failedMsg._id));
    if (failedMsg.text) setInputText(failedMsg.text);
    if (failedMsg.attachments?.[0]) {
      handleSendMessage(failedMsg.attachments[0].url, failedMsg.attachments[0].type);
    } else {
      // Re-send directly without going through input
      handleSendMessage();
    }
  };

  // ── Media pickers ─────────────────────────────────────────────────────────
  // On iOS, we must close the attachment modal BEFORE launching a picker,
  // otherwise iOS blocks the picker from presenting over the modal.
  const launchPickerAfterModalClose = (pickerFn: () => Promise<void>) => {
    setShowAttachmentMenu(false);
    // Wait for modal dismiss animation to complete on iOS
    setTimeout(pickerFn, Platform.OS === 'ios' ? 600 : 100);
  };

  const handlePickImage = () => launchPickerAfterModalClose(async () => {
    try {
      console.log('📸 handlePickImage: launching picker');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      console.log('📸 Picker result:', result.canceled ? 'canceled' : 'selected');
      if (!result.canceled && result.assets[0]) setSelectedMedia(result.assets[0]);
    } catch (error) {
      console.error('📸 handlePickImage ERROR:', error);
      toast.error('Error', 'Failed to open photo library');
    }
  });

  const handleTakePhoto = () => launchPickerAfterModalClose(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled && result.assets[0]) setSelectedMedia(result.assets[0]);
    } catch (error) {
      console.error('📷 handleTakePhoto ERROR:', error);
      toast.error('Error', 'Failed to open camera');
    }
  });

  const handlePickVideo = () => launchPickerAfterModalClose(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 });
      if (!result.canceled && result.assets[0]) setSelectedMedia(result.assets[0]);
    } catch (error) {
      console.error('🎬 handlePickVideo ERROR:', error);
      toast.error('Error', 'Failed to open video library');
    }
  });
  const handlePickDocument = () => launchPickerAfterModalClose(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) setSelectedMedia(result.assets[0]);
    } catch (error) {
      console.error('📄 handlePickDocument ERROR:', error);
      toast.error('Error', 'Failed to open document picker');
    }
  });

  // ── Recording ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      if (conversationId) socketService.emit('recording:start', conversationId);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording); setIsRecording(true);
    } catch (e) { if (conversationId) socketService.emit('recording:stop', conversationId); }
  };
  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (conversationId) socketService.emit('recording:stop', conversationId);
      if (uri) await handleSendMessage(uri, 'audio', { uri, name: `audio_${Date.now()}.m4a`, type: 'audio/x-m4a' });
      setRecording(null);
    } catch (e) { console.error('Stop recording error:', e); }
  };
  const cancelRecording = async () => {
    if (recording) {
      try { await recording.stopAndUnloadAsync(); } catch {}
      setRecording(null); setIsRecording(false);
      if (conversationId) socketService.emit('recording:stop', conversationId);
    }
  };

  // ── Audio playback ────────────────────────────────────────────────────────
  const onPlaybackStatusUpdate = (messageId: string) => (status: any) => {
    if (!status.isLoaded) return;
    if (status.durationMillis) {
      setAudioProgress((p) => ({ ...p, [messageId]: status.positionMillis / status.durationMillis }));
      setAudioDurations((p) => ({ ...p, [messageId]: status.durationMillis / 1000 }));
    }
    if (status.didJustFinish) { setPlayingAudioId(null); setAudioProgress((p) => ({ ...p, [messageId]: 0 })); }
  };

  const playAudio = async (audioUrl: string, messageId: string) => {
    try {
      if (playingAudioId === messageId) { await soundRef.current?.pauseAsync(); setPlayingAudioId(null); return; }
      if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: true });
      const { sound, status } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true }, onPlaybackStatusUpdate(messageId));
      soundRef.current = sound;
      setPlayingAudioId(messageId);
      if ((status as any).isLoaded && (status as any).durationMillis)
        setAudioDurations((p) => ({ ...p, [messageId]: (status as any).durationMillis / 1000 }));
    } catch { toast.error('Error', 'Failed to play audio message'); setPlayingAudioId(null); }
  };

  // ── Scroll to reply ───────────────────────────────────────────────────────
  const scrollToMessage = (messageId: string) => {
    const idx = messages.findIndex((m) => m._id === messageId);
    if (idx === -1) { toast.info('Not Found', 'The original message may have been deleted.'); return; }
    try {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    } catch { flatListRef.current?.scrollToEnd({ animated: true }); }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && conversationId) loadMessages(conversationId, page + 1);
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isSameDay = (a: string, b: string) => {
    const d1 = new Date(a);
    const d2 = new Date(b);
    return d1.toDateString() === d2.toDateString();
  };

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  // ── Status indicator ──────────────────────────────────────────────────────
  const renderUserStatus = () => {
    switch (otherUserActivity) {
      case 'typing':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: BRAND.primary, marginRight: 2, opacity: 1 - i * 0.2 }} />
            ))}
            <Text style={{ color: BRAND.primary, fontSize: 11, fontWeight: '500', marginLeft: 2 }}>typing…</Text>
          </View>
        );
      case 'recording':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 5 }} />
            <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '500' }}>recording…</Text>
          </View>
        );
      case 'uploading':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <ActivityIndicator size="small" color={BRAND.primary} style={{ marginRight: 5, transform: [{ scale: 0.7 }] }} />
            <Text style={{ color: BRAND.primary, fontSize: 11, fontWeight: '500' }}>sending…</Text>
          </View>
        );
      case 'online':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 5 }} />
            <Text style={{ color: BRAND.textSecondary, fontSize: 11, fontWeight: '500' }}>online</Text>
          </View>
        );
      default:
        return <Text style={{ color: BRAND.textMuted, fontSize: 11, marginTop: 2 }}>Offline</Text>;
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surface }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>Loading messages…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = otherUser?.firstName && otherUser?.lastName
    ? `${otherUser.firstName} ${otherUser.lastName}`
    : otherUserName || 'User';
  const avatarUri = otherUser?.avatar || otherUserAvatar;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.chatBg }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.primarySoft} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: BRAND.primarySoft,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Back */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.75}
              style={{
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: BRAND.surface,
                alignItems: 'center', justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <Ionicons name="chevron-back" size={20} color={BRAND.primary} />
            </TouchableOpacity>

            {/* Avatar + name */}
            <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.85}>
              <View style={{ position: 'relative', marginRight: 10 }}>
                <View
                  style={{
                    width: 42, height: 42, borderRadius: 21,
                    backgroundColor: BRAND.primaryMuted,
                    alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={{ width: 42, height: 42 }} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: BRAND.primary }}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View
                  style={{
                    position: 'absolute', bottom: 1, right: 1,
                    width: 11, height: 11, borderRadius: 6,
                    backgroundColor: isOtherUserOnline ? '#22c55e' : '#d1d5db',
                    borderWidth: 2, borderColor: BRAND.primarySoft,
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: BRAND.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 }} numberOfLines={1}>
                  {displayName}
                </Text>
                {renderUserStatus()}
              </View>
            </TouchableOpacity>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleCall('voice')}
                activeOpacity={0.75}
                style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: BRAND.primary,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="call" size={17} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowChatMenu(true)}
                activeOpacity={0.75}
                style={{
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: BRAND.primary,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="ellipsis-vertical" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── MESSAGES ───────────────────────────────────────────────────── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item, index }) => {
            const showDateSeparator = index === 0 || !isSameDay(item.createdAt, messages[index - 1].createdAt);
            return (
              <>
                {showDateSeparator && (
                  <View style={{ alignItems: 'center', marginVertical: 10 }}>
                    <View style={{ backgroundColor: BRAND.primaryMuted, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND.primaryDark }}>
                        {formatDateSeparator(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                )}
                <SwipeableMessage
                  message={item}
                  isMyMessage={item.sender._id === currentUserId}
                  isHighlighted={item._id === highlightedMessageId}
                  onReply={() => setReplyingTo(item)}
                  onScrollToReply={scrollToMessage}
                  otherUser={otherUser}
                  formatMessageTime={formatMessageTime}
                  playingAudioId={playingAudioId}
                  audioProgress={audioProgress}
                  audioDurations={audioDurations}
                  onPlayAudio={playAudio}
                />
              </>
            );
          }}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 8, paddingBottom: 8, flexGrow: 1 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.15}
          showsVerticalScrollIndicator={false}
          extraData={`${isOtherUserTyping}-${highlightedMessageId}`}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 }), 500);
          }}
          ListHeaderComponent={loadingMore ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={BRAND.primary} />
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="chatbubbles-outline" size={38} color={BRAND.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 6, letterSpacing: -0.3 }}>
                No messages yet
              </Text>
              <Text style={{ fontSize: 13, color: BRAND.textMuted, textAlign: 'center', lineHeight: 19 }}>
                Say hello to {otherUser?.firstName || 'this user'}!
              </Text>
            </View>
          }
        />

        {/* ── TYPING INDICATOR ───────────────────────────────────────────── */}
        {isOtherUserTyping && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="person" size={13} color={BRAND.primary} />
              </View>
              <View style={{ backgroundColor: BRAND.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: BRAND.border }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: BRAND.textMuted }} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── REPLY PREVIEW ──────────────────────────────────────────────── */}
        {replyingTo && (
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderTopWidth: 1, borderTopColor: BRAND.border,
              paddingHorizontal: 14, paddingVertical: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: BRAND.primarySoft,
                borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9,
                borderLeftWidth: 3, borderLeftColor: BRAND.primary,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND.primary, marginBottom: 2 }}>
                  Replying to {replyingTo.sender._id === currentUserId ? 'yourself' : replyingTo.sender.firstName}
                </Text>
                <Text style={{ fontSize: 12, color: BRAND.textSecondary }} numberOfLines={1}>
                  {replyingTo.text || '📎 Attachment'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color={BRAND.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── MEDIA PREVIEW ──────────────────────────────────────────────── */}
        {selectedMedia && (
          <View style={{ backgroundColor: BRAND.surface, borderTopWidth: 1, borderTopColor: BRAND.border, paddingHorizontal: 14, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surfaceAlt, borderRadius: 13, padding: 10, borderWidth: 1, borderColor: BRAND.border }}>
              {selectedMedia.uri && (
                <Image source={{ uri: selectedMedia.uri }} style={{ width: 48, height: 48, borderRadius: 10, marginRight: 10 }} resizeMode="cover" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND.textPrimary }} numberOfLines={1}>
                  {selectedMedia.name || 'Selected media'}
                </Text>
                <Text style={{ fontSize: 11, color: BRAND.green, marginTop: 2, fontWeight: '500' }}>Ready to send</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedMedia(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={14} color={BRAND.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── RECORDING UI ───────────────────────────────────────────────── */}
        {isRecording && (
          <View style={{ backgroundColor: BRAND.surface, borderTopWidth: 1, borderTopColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="mic" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#DC2626' }}>Recording…</Text>
                <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 1 }}>Tap Send to finish</Text>
              </View>
              <TouchableOpacity
                onPress={cancelRecording}
                activeOpacity={0.8}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BRAND.borderStrong, backgroundColor: BRAND.surfaceAlt, marginRight: 8 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={stopRecording} activeOpacity={0.85} style={{ borderRadius: 20, overflow: 'hidden' }}>
                <LinearGradient
                  colors={[BRAND.primary, BRAND.primaryDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingHorizontal: 18, paddingVertical: 8 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Send</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── INPUT BAR ──────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: BRAND.surface,
            borderTopWidth: 1,
            borderTopColor: BRAND.border,
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 10,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 8 },
              android: { elevation: 8 },
            }),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Pill: attach + input + mic */}
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: BRAND.surfaceAlt,
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: BRAND.border,
                paddingLeft: 10,
                paddingRight: 10,
                minHeight: 46,
              }}
            >
              <TouchableOpacity onPress={() => setShowAttachmentMenu(true)} activeOpacity={0.7} style={{ marginRight: 6 }}>
                <Ionicons name="add-circle-outline" size={24} color={BRAND.textMuted} />
              </TouchableOpacity>

              <TextInput
                value={inputText}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                placeholderTextColor={BRAND.textMuted}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: BRAND.textPrimary,
                  maxHeight: 110,
                  paddingVertical: Platform.OS === 'ios' ? 10 : 6,
                  textAlignVertical: 'center',
                }}
                multiline
                maxLength={1000}
                returnKeyType="default"
                blurOnSubmit={false}
                onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), Platform.OS === 'ios' ? 300 : 400)}
              />

              {!(inputText.trim() || selectedMedia) && (
                <TouchableOpacity onPress={startRecording} activeOpacity={0.7} style={{ marginLeft: 6 }}>
                  <Ionicons name="mic-outline" size={21} color={BRAND.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Camera shortcut */}
            <TouchableOpacity
              onPress={handleTakePhoto}
              activeOpacity={0.85}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: BRAND.primaryLight,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="camera" size={19} color="#fff" />
            </TouchableOpacity>

            {/* Send */}
            <TouchableOpacity
              onPress={() => {
                if (selectedMedia) handleSendMessage(selectedMedia.uri, selectedMedia.mimeType || selectedMedia.type || 'image');
                else handleSendMessage();
              }}
              activeOpacity={0.85}
              style={{ borderRadius: 22, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={[BRAND.primary, BRAND.primaryDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  alignItems: 'center', justifyContent: 'center',
                  ...Platform.select({
                    ios: { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
                    android: { elevation: 4 },
                  }),
                }}
              >
                <Ionicons name="send" size={17} color="#fff" style={{ marginLeft: 2 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── ATTACHMENT MODAL ─────────────────────────────────────────────── */}
      <AttachmentMenuModal
        visible={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onPickImage={handlePickImage}
        onTakePhoto={handleTakePhoto}
        onPickVideo={handlePickVideo}
        onPickDocument={handlePickDocument}
      />

      {/* ── HEADER DROPDOWN MENU ─────────────────────────────────────────── */}
      <Modal visible={showChatMenu} transparent animationType="fade" onRequestClose={() => setShowChatMenu(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }}
          activeOpacity={1}
          onPress={() => setShowChatMenu(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: insets.top + 58,
              right: 12,
              width: 190,
              backgroundColor: BRAND.surface,
              borderRadius: 16,
              paddingVertical: 6,
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
                android: { elevation: 8 },
              }),
            }}
          >
            {[
              { key: 'profile', label: 'View Profile', icon: 'person-outline', onPress: handleViewProfile },
              { key: 'search', label: 'Search', icon: 'search-outline', onPress: handleOpenChatSearch },
              { key: 'block', label: 'Block', icon: 'ban-outline', onPress: handleBlockUser },
              { key: 'report', label: 'Report', icon: 'flag-outline', onPress: handleReportUser, danger: true },
            ].map((item, idx) => (
              <TouchableOpacity
                key={item.key}
                onPress={item.onPress}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 12,
                  borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: BRAND.border,
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={17}
                  color={item.danger ? '#EF4444' : BRAND.textPrimary}
                  style={{ marginRight: 10 }}
                />
                <Text style={{ fontSize: 14, fontWeight: '600', color: item.danger ? '#EF4444' : BRAND.textPrimary }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── IN-CHAT SEARCH MODAL ─────────────────────────────────────────── */}
      <Modal visible={showChatSearch} transparent animationType="slide" onRequestClose={() => setShowChatSearch(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              paddingTop: 14, paddingHorizontal: 16,
              paddingBottom: insets.bottom + 16,
              maxHeight: '75%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: BRAND.textPrimary }}>Search in chat</Text>
              <TouchableOpacity onPress={() => setShowChatSearch(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={BRAND.textMuted} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: BRAND.surfaceAlt, borderRadius: 12,
                paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
              }}
            >
              <Ionicons name="search" size={18} color={BRAND.textMuted} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: BRAND.textPrimary }}
                placeholder="Search messages"
                placeholderTextColor={BRAND.textMuted}
                value={chatSearchQuery}
                onChangeText={setChatSearchQuery}
                autoFocus
              />
              {chatSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setChatSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={BRAND.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={chatSearchResults}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                chatSearchQuery.trim() ? (
                  <Text style={{ textAlign: 'center', color: BRAND.textMuted, fontSize: 13, paddingVertical: 24 }}>
                    No messages found
                  </Text>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleJumpToSearchResult(item._id)}
                  activeOpacity={0.7}
                  style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: BRAND.border }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.primary, marginBottom: 2 }}>
                    {item.sender._id === currentUserId ? 'You' : displayName} · {formatMessageTime(item.createdAt)}
                  </Text>
                  <Text style={{ fontSize: 14, color: BRAND.textPrimary }} numberOfLines={2}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Swipeable Message ────────────────────────────────────────────────────────
const SwipeableMessage: React.FC<{
  message: Message;
  isMyMessage: boolean;
  isHighlighted: boolean;
  onReply: () => void;
  onScrollToReply: (id: string) => void;
  otherUser: any;
  formatMessageTime: (d: string) => string;
  playingAudioId: string | null;
  audioProgress: Record<string, number>;
  audioDurations: Record<string, number>;
  onPlayAudio: (url: string, id: string) => void;
}> = ({ message, isMyMessage, isHighlighted, onReply, onScrollToReply, otherUser, formatMessageTime, playingAudioId, audioProgress, audioDurations, onPlayAudio }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => {
        if (isMyMessage && g.dx < 0 && g.dx > -90) translateX.setValue(g.dx * 0.55);
        if (!isMyMessage && g.dx > 0 && g.dx < 90) translateX.setValue(g.dx * 0.55);
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 55 || Math.abs(g.vx) > 0.5) onReply();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }).start();
      },
    })
  ).current;

  const isPlaying = playingAudioId === message._id;
  const progress  = audioProgress[message._id] || 0;
  const duration  = audioDurations[message._id] || 0;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Call message rendering
  if (message.messageType === 'call') {
    const callStatus = message.callInfo?.status || (message.text?.toLowerCase().includes('missed') ? 'missed' : message.text?.toLowerCase().includes('rejected') ? 'rejected' : 'completed');
    const callType = message.callInfo?.type || (message.text?.toLowerCase().includes('video') ? 'video' : 'voice');
    const duration = message.callInfo?.duration;

    const callConfig: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      missed:    { icon: 'call-outline',       color: '#EF4444', bg: '#FEF2F2', label: 'Missed call' },
      rejected:  { icon: 'call-outline',       color: '#F59E0B', bg: '#FFFBEB', label: 'Declined call' },
      cancelled: { icon: 'call-outline',       color: '#9CA3AF', bg: '#F9FAFB', label: 'Cancelled call' },
      completed: { icon: 'checkmark-circle',   color: '#10B981', bg: '#ECFDF5', label: 'Call ended' },
    };

    const cfg = callConfig[callStatus] || callConfig.completed;

    const formatCallDuration = (secs?: number) => {
      if (!secs) return '';
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    return (
      <View style={{ alignItems: 'center', marginVertical: 10, paddingHorizontal: 20 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: cfg.bg,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            gap: 8,
            borderWidth: 1,
            borderColor: cfg.color + '20',
          }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: cfg.color + '15', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={(callType === 'video' ? 'videocam-outline' : cfg.icon) as any} size={16} color={cfg.color} />
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: cfg.color }}>
              {isMyMessage ? (callStatus === 'missed' ? 'No answer' : cfg.label) : cfg.label}
            </Text>
            <Text style={{ fontSize: 10, color: BRAND.textMuted, marginTop: 1 }}>
              {callType === 'video' ? 'Video' : 'Voice'} · {formatMessageTime(message.createdAt)}
              {duration ? ` · ${formatCallDuration(duration)}` : ''}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{ transform: [{ translateX }], width: '100%', marginBottom: 6, paddingHorizontal: 6 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: isMyMessage ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>

        {/* Their avatar */}
        {!isMyMessage && (
          <View
            style={{
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: BRAND.primarySoft,
              alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', marginRight: 6, marginBottom: 2,
              borderWidth: 1, borderColor: BRAND.primaryMuted,
            }}
          >
            {otherUser?.avatar
              ? <Image source={{ uri: otherUser.avatar }} style={{ width: 30, height: 30 }} resizeMode="cover" />
              : <Text style={{ fontSize: 12, fontWeight: '700', color: BRAND.primary }}>{(otherUser?.firstName || '?').charAt(0)}</Text>
            }
          </View>
        )}

        {/* Bubble */}
        <View
          style={{
            maxWidth: '78%',
            borderRadius: 20,
            borderBottomRightRadius: isMyMessage ? 5 : 20,
            borderBottomLeftRadius: isMyMessage ? 20 : 5,
            overflow: 'hidden',
            backgroundColor: isHighlighted ? '#FEF3C7' : undefined,
            ...Platform.select({
              ios: {
                shadowColor: isMyMessage ? BRAND.primary : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isMyMessage ? 0.2 : 0.07,
                shadowRadius: 6,
              },
              android: { elevation: isMyMessage ? 3 : 2 },
            }),
          }}
        >
          {isMyMessage ? (
            <LinearGradient
              colors={[BRAND.primary, BRAND.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 14, paddingVertical: 10 }}
            >
              {/* Reply reference */}
              {message.replyTo && (
                <TouchableOpacity onPress={() => onScrollToReply(message.replyTo!._id)} activeOpacity={0.7}
                  style={{ marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginBottom: 2 }}>
                    ↩ {message.replyTo.sender.firstName}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontStyle: 'italic' }} numberOfLines={1}>
                    {message.replyTo.text}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Image attachment */}
              {message.attachments?.[0]?.type === 'image' && (
                <Image source={{ uri: message.attachments[0].url }} style={{ width: 210, height: 210, borderRadius: 14, marginBottom: 4 }} resizeMode="cover" />
              )}

              {/* Audio attachment */}
              {message.attachments?.[0]?.type === 'audio' && (
                <TouchableOpacity onPress={() => onPlayAudio(message.attachments![0].url, message._id)} activeOpacity={0.8}
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 11, minWidth: 200, marginBottom: 4 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Voice message</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                          {duration > 0 ? formatDuration(duration * (1 - progress)) : '0:00'}
                        </Text>
                      </View>
                      <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2 }}>
                        <View style={{ height: 3, width: `${progress * 100}%`, backgroundColor: '#fff', borderRadius: 2 }} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {message.text && (
                <Text style={{ color: '#fff', fontSize: 15, lineHeight: 21 }}>{message.text}</Text>
              )}

              {/* Time + status */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 5, gap: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '500' }}>
                  {formatMessageTime(message.createdAt)}
                </Text>
                {message.status === 'failed' ? (
                  <TouchableOpacity onPress={() => handleRetryMessage(message)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  </TouchableOpacity>
                ) : message.status === 'sending' ? (
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.5)" />
                ) : (
                  <Ionicons
                    name={message.status === 'read' ? 'checkmark-done' : message.status === 'delivered' ? 'checkmark-done' : 'checkmark'}
                    size={13}
                    color={message.status === 'read' ? '#93C5FD' : 'rgba(255,255,255,0.75)'}
                  />
                )}
              </View>
            </LinearGradient>
          ) : (
            <View style={{ backgroundColor: BRAND.surface, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: BRAND.border }}>
              {message.replyTo && (
                <TouchableOpacity onPress={() => onScrollToReply(message.replyTo!._id)} activeOpacity={0.7}
                  style={{ marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BRAND.border, borderLeftWidth: 3, borderLeftColor: BRAND.primary, paddingLeft: 8 }}
                >
                  <Text style={{ color: BRAND.primary, fontSize: 11, fontWeight: '600', marginBottom: 2 }}>
                    ↩ {message.replyTo.sender.firstName}
                  </Text>
                  <Text style={{ color: BRAND.textMuted, fontSize: 11, fontStyle: 'italic' }} numberOfLines={1}>
                    {message.replyTo.text}
                  </Text>
                </TouchableOpacity>
              )}

              {message.attachments?.[0]?.type === 'image' && (
                <Image source={{ uri: message.attachments[0].url }} style={{ width: 210, height: 210, borderRadius: 14, marginBottom: 4 }} resizeMode="cover" />
              )}

              {message.attachments?.[0]?.type === 'audio' && (
                <TouchableOpacity onPress={() => onPlayAudio(message.attachments![0].url, message._id)} activeOpacity={0.8}
                  style={{ backgroundColor: BRAND.primarySoft, borderRadius: 14, padding: 11, minWidth: 200, marginBottom: 4 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color={BRAND.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: BRAND.textPrimary, fontSize: 12, fontWeight: '600' }}>Voice message</Text>
                        <Text style={{ color: BRAND.textMuted, fontSize: 11 }}>
                          {duration > 0 ? formatDuration(duration * (1 - progress)) : '0:00'}
                        </Text>
                      </View>
                      <View style={{ height: 3, backgroundColor: BRAND.primaryMuted, borderRadius: 2 }}>
                        <View style={{ height: 3, width: `${progress * 100}%`, backgroundColor: BRAND.primary, borderRadius: 2 }} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {message.text && (
                <Text style={{ color: BRAND.textPrimary, fontSize: 15, lineHeight: 21 }}>{message.text}</Text>
              )}

              <Text style={{ color: BRAND.textMuted, fontSize: 10, marginTop: 5, fontWeight: '500', textAlign: 'right' }}>
                {formatMessageTime(message.createdAt)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Attachment Modal ─────────────────────────────────────────────────────────
const ATTACH_OPTIONS = [
  { label: 'Photos',   icon: 'images'        as const, colors: ['#E04079', '#B5315F'] as [string, string] },
  { label: 'Camera',   icon: 'camera'        as const, colors: ['#3B82F6', '#2563EB'] as [string, string] },
  { label: 'Video',    icon: 'videocam'      as const, colors: ['#F97316', '#EA580C'] as [string, string] },
  { label: 'Files',    icon: 'document-text' as const, colors: ['#10B981', '#059669'] as [string, string] },
];

const AttachmentMenuModal: React.FC<{
  visible: boolean; onClose: () => void;
  onPickImage: () => void; onTakePhoto: () => void;
  onPickVideo: () => void; onPickDocument: () => void;
}> = ({ visible, onClose, onPickImage, onTakePhoto, onPickVideo, onPickDocument }) => {
  const handlers = [onPickImage, onTakePhoto, onPickVideo, onPickDocument];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: BRAND.surface,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 16 },
              android: { elevation: 16 },
            }),
          }}
        >
          {/* Drag handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: BRAND.borderStrong, alignSelf: 'center', marginBottom: 20 }} />

          <Text style={{ fontSize: 18, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 20, letterSpacing: -0.3 }}>
            Share content
          </Text>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {ATTACH_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={opt.label}
                onPress={() => handlers[i]()}
                activeOpacity={0.8}
                style={{ flex: 1, alignItems: 'center' }}
              >
                <LinearGradient
                  colors={opt.colors}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{
                    width: 60, height: 60, borderRadius: 18,
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 7,
                    ...Platform.select({
                      ios: { shadowColor: opt.colors[0], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
                      android: { elevation: 4 },
                    }),
                  }}
                >
                  <Ionicons name={opt.icon} size={26} color="#fff" />
                </LinearGradient>
                <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.textSecondary }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={onClose} activeOpacity={0.8}
            style={{ backgroundColor: BRAND.surfaceAlt, borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: BRAND.border }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: BRAND.textSecondary }}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default ChatDetailScreen;