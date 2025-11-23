import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { WebView } from 'react-native-webview';
import callService from '@/services/call.service';
import webrtcService from '@/services/webrtc.service';
import { webrtcHtml } from '@/services/webrtc-html';

type OngoingCallNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OngoingCall'>;
type OngoingCallRouteProp = RouteProp<RootStackParamList, 'OngoingCall'>;

const { width, height } = Dimensions.get('window');

const OngoingCallScreen: React.FC = () => {
  const navigation = useNavigation<OngoingCallNavigationProp>();
  const route = useRoute<OngoingCallRouteProp>();

  const { callId, callType, isOutgoing, otherUser, offer } = route.params;
  const [currentCallId, setCurrentCallId] = useState<string | undefined>(callId);

  console.log('🔵 Received params in OngoingCallScreen:', {
    callId,
    callType,
    isOutgoing,
    hasOffer: !!offer,
  });

  const [callStatus, setCallStatus] = useState<string>(
    isOutgoing ? 'Calling...' : 'Connecting...'
  );
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(callType === 'video');
  const [isConnected, setIsConnected] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [webViewLoaded, setWebViewLoaded] = useState(false);

  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const hasInitiatedCall = useRef(false);
  
  // ✅ Add refs to prevent duplicate processing
  const hasProcessedOffer = useRef(false);
  const hasProcessedAnswer = useRef(false);
  const processedIceCandidates = useRef(new Set<string>());

  useEffect(() => {
    console.log('🔵 OngoingCallScreen mounted');
    
    initializeCall();

    const handleCallInitiated = (data: any) => {
      console.log('📞 Call initiated event received:', data);
      if (data.call && data.call._id) {
        console.log('✅ Setting currentCallId to:', data.call._id);
        setCurrentCallId(data.call._id);
        
        // ✅ Create offer only once when we have both callId and webView loaded
        if (isOutgoing && webViewLoaded && !hasInitiatedCall.current) {
          console.log('✅ Call ID received and WebView is ready! Creating WebRTC offer now...');
          hasInitiatedCall.current = true;
          setTimeout(() => {
            console.log('📤 Creating WebRTC offer');
            webrtcService.createOffer();
          }, 500);
        }
      }
    };

    const handleCallAccepted = () => {
      console.log('✅ Call accepted event received');
      setCallStatus('Call accepted, connecting...');
    };

    const handleCallRejected = () => {
      console.log('❌ Call rejected');
      setCallStatus('Call declined');
      setTimeout(() => {
        cleanup();
        navigation.goBack();
      }, 2000);
    };

    const handleCallEnded = () => {
      console.log('📞 Call ended by other party');
      setCallStatus('Call ended');
      cleanup();
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    };

    const handleCallCancelled = () => {
      console.log('📞 Call cancelled');
      setCallStatus('Call cancelled');
      cleanup();
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    };

    // ✅ Handle incoming offer via socket - prevent duplicates
    const handleSignalOffer = (data: any) => {
      console.log('📞 Received signal offer in OngoingCallScreen:', data);
      if (!isOutgoing && data.offer && webViewLoaded && !hasProcessedOffer.current) {
        console.log('✅ Processing incoming offer (creating answer)');
        hasProcessedOffer.current = true;
        setTimeout(() => {
          webrtcService.createAnswer(data.offer);
        }, 500);
      } else if (hasProcessedOffer.current) {
        console.log('⏭️ Offer already processed, skipping');
      }
    };

    // ✅ Handle incoming answer via socket - prevent duplicates
    const handleSignalAnswer = (data: any) => {
      console.log('📞 Received signal answer in OngoingCallScreen:', data);
      if (isOutgoing && data.answer && !hasProcessedAnswer.current) {
        console.log('✅ Processing incoming answer');
        hasProcessedAnswer.current = true;
        webrtcService.handleAnswer(data.answer);
      } else if (hasProcessedAnswer.current) {
        console.log('⏭️ Answer already processed, skipping');
      }
    };

    // ✅ Handle incoming ICE candidates via socket - prevent duplicates
    const handleSignalIce = (data: any) => {
      console.log('📞 Received signal ICE in OngoingCallScreen:', data);
      if (data.candidate) {
        const candidateKey = JSON.stringify(data.candidate);
        if (!processedIceCandidates.current.has(candidateKey)) {
          console.log('✅ Processing ICE candidate');
          processedIceCandidates.current.add(candidateKey);
          webrtcService.addIceCandidate(data.candidate);
        } else {
          console.log('⏭️ ICE candidate already processed, skipping');
        }
      }
    };

    callService.on('call:initiated', handleCallInitiated);
    callService.on('call:accepted', handleCallAccepted);
    callService.on('call:rejected', handleCallRejected);
    callService.on('call:ended', handleCallEnded);
    callService.on('call:cancelled', handleCallCancelled);
    callService.on('call:signal:offer', handleSignalOffer);
    callService.on('call:signal:answer', handleSignalAnswer);
    callService.on('call:signal:ice', handleSignalIce);

    // Setup WebRTC Service callbacks
    webrtcService.setOnMessageCallback((event) => {
      console.log('🌐 WebRTC event received:', event.type);
      
      switch (event.type) {
        case 'offer':
          console.log('📤 Received offer from WebRTC, sending via socket');
          callService.sendOffer(event.data);
          break;
        case 'answer':
          console.log('📤 Received answer from WebRTC, sending via socket');
          callService.sendAnswer(event.data);
          break;
        case 'iceCandidate':
          console.log('📤 Received ICE candidate, sending via socket');
          callService.sendIceCandidate(event.data);
          break;
        case 'remoteStream':
          console.log('✅ Remote stream received! Connection established');
          setHasRemoteStream(true);
          setCallStatus('Connected');
          setIsConnected(true);
          startCallDuration();
          break;
        case 'localStream':
          console.log('✅ Local stream initialized');
          break;
        case 'muteStatus':
          console.log('🔇 Mute status changed:', event.data.muted);
          setIsMuted(event.data.muted);
          break;
        case 'videoStatus':
          console.log('📹 Video status changed:', !event.data.enabled);
          setIsVideoOff(!event.data.enabled);
          break;
        case 'error':
          console.error('❌ WebRTC Error:', event.data.message);
          break;
      }
    });

    startPulseAnimation();

    return () => {
      console.log('🧹 OngoingCallScreen unmounting, removing listeners');
      callService.removeListener('call:initiated', handleCallInitiated);
      callService.removeListener('call:accepted', handleCallAccepted);
      callService.removeListener('call:rejected', handleCallRejected);
      callService.removeListener('call:ended', handleCallEnded);
      callService.removeListener('call:cancelled', handleCallCancelled);
      callService.removeListener('call:signal:offer', handleSignalOffer);
      callService.removeListener('call:signal:answer', handleSignalAnswer);
      callService.removeListener('call:signal:ice', handleSignalIce);
    };
  }, [callType, isOutgoing, navigation, otherUser._id, webViewLoaded]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rippleAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ])
    ).start();
  };

  const initializeCall = async () => {
    try {
      console.log('🎬 Initializing call - isOutgoing:', isOutgoing, 'callType:', callType);
    } catch (error) {
      console.error('❌ Error initializing call:', error);
      setCallStatus('Failed to connect');
      setTimeout(() => endCall(), 2000);
    }
  };

  const onWebViewLoad = () => {
    console.log('📱 WebView loaded, initializing WebRTC');
    console.log('   - Call type:', callType);
    console.log('   - Is outgoing:', isOutgoing);
    console.log('   - Has callId:', !!callId);
    console.log('   - Has offer:', !!offer);
    console.log('   - Current callId:', currentCallId);
    
    setWebViewLoaded(true);
    webrtcService.initialize(callType === 'video');
    
    if (isOutgoing) {
      console.log('📞 Outgoing call - checking if we can create offer');
      // Check if we already have callId (in case event came before webview loaded)
      if (currentCallId && !hasInitiatedCall.current) {
        console.log('✅ WebView loaded and we already have call ID! Creating offer...');
        hasInitiatedCall.current = true;
        setTimeout(() => {
          console.log('📤 Creating WebRTC offer');
          webrtcService.createOffer();
        }, 500);
      } else {
        console.log('⏳ Waiting for call:initiated event to get call ID...');
      }
    } else {
      console.log('📞 Incoming call - checking for offer...');
      if (offer && !hasProcessedOffer.current) {
        console.log('✅ Offer received in params! Processing offer and creating answer...');
        hasProcessedOffer.current = true;
        setTimeout(() => {
          webrtcService.createAnswer(offer);
        }, 1000);
      } else {
        console.log('⚠️  No offer in params - waiting for offer via socket');
      }
    }
  };

  const startCallDuration = () => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    webrtcService.toggleMute();
  };

  const toggleVideo = () => {
    if (callType === 'video') {
      webrtcService.toggleVideo();
    }
  };

  const switchCamera = () => {
    if (callType === 'video') {
      webrtcService.switchCamera();
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const endCall = () => {
    console.log('📞 Ending call (user initiated)');
    console.log('   - Current callId:', currentCallId || callId);
    console.log('   - Call duration:', callDuration, 'seconds');
    
    if (durationInterval.current) {
      console.log('   - Clearing duration interval');
      clearInterval(durationInterval.current);
    }
    
    console.log('   - Calling callService.endCall()');
    callService.endCall();
    
    console.log('   - Running cleanup');
    cleanup();
    
    console.log('   - Navigating back');
    navigation.goBack();
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up call resources');
    console.log('   - Closing WebRTC connection');
    webrtcService.close();
    
    if (durationInterval.current) {
      console.log('   - Clearing duration interval in cleanup');
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    console.log('✅ Cleanup complete');
  };

  const ControlButton = ({ 
    icon, 
    label, 
    onPress, 
    isActive, 
    isDanger = false,
    size = 28 
  }: { 
    icon: string, 
    label?: string, 
    onPress: () => void, 
    isActive?: boolean, 
    isDanger?: boolean,
    size?: number
  }) => (
    <View className="items-center mx-4">
      <TouchableOpacity
        onPress={onPress}
        className={`w-16 h-16 rounded-full items-center justify-center shadow-lg ${
          isDanger 
            ? 'bg-red-500' 
            : isActive 
              ? 'bg-white' 
              : 'bg-white/20 backdrop-blur-md'
        }`}
        style={{
          shadowColor: isDanger ? '#ef4444' : '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5
        }}
      >
        <Ionicons 
          name={icon as any} 
          size={size} 
          color={isDanger ? '#fff' : isActive ? '#000' : '#fff'} 
        />
      </TouchableOpacity>
      {label && (
        <Text className="text-white/80 text-xs mt-2 font-medium tracking-wide">
          {label}
        </Text>
      )}
    </View>
  );

 return (
  <View className="flex-1 bg-gray-900">
    <StatusBar barStyle="light-content" />
    
    {/* WebView for WebRTC - Always visible for video calls when connected */}
    <View style={{ flex: 1 }}>
      <WebView
        ref={(ref) => {
          if (ref) webrtcService.setWebViewRef(ref);
        }}
        source={{ html: webrtcHtml, baseUrl: 'https://sharplook.com' }}
        onMessage={(event) => webrtcService.handleWebViewMessage(event)}
        onLoadEnd={onWebViewLoad}
        style={callType === 'video' ? styles.webViewVideo : styles.webViewHidden}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        androidLayerType="hardware"
        onPermissionRequest={(request: any) => {
          request.grant(request.resources);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error:', nativeEvent);
        }}
      />
    </View>

    {/* Voice Call UI or Video Call Before Connection */}
    {(callType === 'voice' || (callType === 'video' && !isConnected)) && (
      <View className="absolute inset-0">
        {/* Background Image with Overlay */}
        <View className="absolute inset-0">
          {otherUser.avatar ? (
            <Image
              source={{ uri: otherUser.avatar }}
              className="w-full h-full opacity-60"
              resizeMode="cover"
              blurRadius={Platform.OS === 'ios' ? 30 : 10}
            />
          ) : (
            <View className="w-full h-full bg-gray-900" />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
            className="absolute inset-0"
          />
        </View>

        <SafeAreaView className="flex-1 justify-between">
          {/* Header Info */}
          <View className="items-center mt-12">
            <Text className="text-white/60 text-sm font-medium tracking-widest uppercase mb-2">
              {isOutgoing ? 'Outgoing Call' : 'Incoming Call'}
            </Text>
            <Text className="text-white text-3xl font-bold tracking-tight">
              {otherUser.firstName} {otherUser.lastName}
            </Text>
            <Text className="text-white/80 text-lg mt-2 font-medium">
              {isConnected ? formatDuration(callDuration) : callStatus}
            </Text>
          </View>

          {/* Center Avatar Animation */}
          <View className="items-center justify-center -mt-20">
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
                opacity: rippleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
              }}
              className="absolute w-80 h-80 rounded-full bg-white/5"
            />
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
              }}
              className="absolute w-64 h-64 rounded-full bg-white/10"
            />
            
            <View className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-gray-800">
              {otherUser.avatar ? (
                <Image
                  source={{ uri: otherUser.avatar }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center bg-gray-700">
                  <Ionicons name="person" size={80} color="#9ca3af" />
                </View>
              )}
            </View>
          </View>

          {/* Bottom Controls */}
          <View className="mb-12">
            <View className="flex-row justify-center items-center bg-white/10 mx-6 py-6 rounded-3xl backdrop-blur-xl border border-white/5">
              <ControlButton
                icon={isMuted ? "mic-off" : "mic"}
                label={isMuted ? "Unmute" : "Mute"}
                onPress={toggleMute}
                isActive={isMuted}
              />

              {callType === 'video' ? (
                <ControlButton
                  icon={isVideoOff ? "videocam-off" : "videocam"}
                  label="Video"
                  onPress={toggleVideo}
                  isActive={!isVideoOff}
                />
              ) : (
                <ControlButton
                  icon={isSpeakerOn ? "volume-high" : "volume-low"}
                  label="Speaker"
                  onPress={toggleSpeaker}
                  isActive={isSpeakerOn}
                />
              )}

              <ControlButton
                icon="call"
                label="End"
                onPress={endCall}
                isDanger={true}
                size={32}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    )}

    {/* Video Call Overlay Controls (When Connected) */}
    {callType === 'video' && isConnected && (
      <SafeAreaView className="absolute inset-0 justify-between" style={{ pointerEvents: 'box-none' }}>
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          className="p-6"
          style={{ pointerEvents: 'box-none' }}
        >
          <View className="flex-row items-center justify-between" style={{ pointerEvents: 'auto' }}>
            <View>
              <Text className="text-white text-lg font-bold shadow-sm">
                {otherUser.firstName} {otherUser.lastName}
              </Text>
              <Text className="text-white/80 text-sm shadow-sm">
                {formatDuration(callDuration)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={switchCamera}
              className="w-12 h-12 rounded-full bg-white/20 items-center justify-center backdrop-blur-md"
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          className="p-8 pb-12"
          style={{ pointerEvents: 'box-none' }}
        >
          <View className="flex-row justify-center items-center space-x-8" style={{ pointerEvents: 'auto' }}>
            <ControlButton
              icon={isMuted ? "mic-off" : "mic"}
              onPress={toggleMute}
              isActive={isMuted}
            />
            <ControlButton
              icon="call"
              onPress={endCall}
              isDanger={true}
              size={32}
            />
            <ControlButton
              icon={isVideoOff ? "videocam-off" : "videocam"}
              onPress={toggleVideo}
              isActive={!isVideoOff}
            />
          </View>
        </LinearGradient>
      </SafeAreaView>
    )}
  </View>
);
};

const styles = StyleSheet.create({
  webViewVideo: {
    flex: 1,
    backgroundColor: 'black',
  },
  webViewHidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
});

export default OngoingCallScreen;