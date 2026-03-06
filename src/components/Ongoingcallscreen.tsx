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
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import callService from '@/services/call.service';
import webrtcService from '@/services/webrtc.service';
import { webrtcHtml } from '@/services/webrtc-html';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primarySoft: '#FEF0F5',
  surface: '#FFFFFF',
  red: '#EF4444',
  green: '#10B981',
};

type Nav    = NativeStackNavigationProp<RootStackParamList, 'OngoingCall'>;
type RouteP = RouteProp<RootStackParamList, 'OngoingCall'>;

const { width, height } = Dimensions.get('window');

// ─── Control Button ───────────────────────────────────────────────────────────
const ControlButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  isActive?: boolean;
  isDanger?: boolean;
  isLarge?: boolean;
}> = ({ icon, label, onPress, isActive = false, isDanger = false, isLarge = false }) => {
  const size = isLarge ? 64 : 56;
  const iconSize = isLarge ? 30 : 22;

  return (
    <View style={{ alignItems: 'center' }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          width: size, height: size, borderRadius: size / 2,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: isDanger
            ? BRAND.red
            : isActive
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,255,255,0.18)',
          borderWidth: isDanger || isActive ? 0 : 1,
          borderColor: 'rgba(255,255,255,0.25)',
          ...Platform.select({
            ios: {
              shadowColor: isDanger ? BRAND.red : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDanger ? 0.4 : 0.2,
              shadowRadius: 8,
            },
            android: { elevation: isDanger ? 8 : 4 },
          }),
        }}
      >
        <Ionicons
          name={icon}
          size={iconSize}
          color={isDanger ? '#fff' : isActive ? '#1a1a2e' : '#fff'}
        />
      </TouchableOpacity>
      {label && (
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 8, fontWeight: '600', letterSpacing: 0.3 }}>
          {label}
        </Text>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const OngoingCallScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const insets = useSafeAreaInsets();
  const { callId, callType, isOutgoing, otherUser, offer } = route.params;

  const [currentCallId, setCurrentCallId]   = useState<string | undefined>(callId);
  const [callStatus, setCallStatus]         = useState(isOutgoing ? 'Calling…' : 'Connecting…');
  const [callDuration, setCallDuration]     = useState(0);
  const [isMuted, setIsMuted]               = useState(false);
  const [isVideoOff, setIsVideoOff]         = useState(false);
  const [isSpeakerOn, setIsSpeakerOn]       = useState(callType === 'video');
  const [isConnected, setIsConnected]       = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [webViewLoaded, setWebViewLoaded]   = useState(false);

  const durationInterval    = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim           = useRef(new Animated.Value(1)).current;
  const rippleAnim          = useRef(new Animated.Value(0)).current;
  const hasInitiatedCall    = useRef(false);
  const hasProcessedOffer   = useRef(false);
  const hasProcessedAnswer  = useRef(false);
  const processedIce        = useRef(new Set<string>());

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Configure audio session for calls (critical for iOS audio routing)
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    }).catch((err) => console.warn('Audio mode error:', err));

    initializeCall();

    const handleCallInitiated = (data: any) => {
      if (data.call?._id) {
        setCurrentCallId(data.call._id);
        if (isOutgoing && webViewLoaded && !hasInitiatedCall.current) {
          hasInitiatedCall.current = true;
          setTimeout(() => webrtcService.createOffer(), 500);
        }
      }
    };

    const handleCallAccepted  = () => setCallStatus('Connecting…');
    const handleCallRejected  = () => { setCallStatus('Call declined'); setTimeout(() => { cleanup(); navigation.goBack(); }, 2000); };
    const handleCallEnded     = () => { setCallStatus('Call ended'); cleanup(); setTimeout(() => navigation.goBack(), 1000); };
    const handleCallCancelled = () => { setCallStatus('Call cancelled'); cleanup(); setTimeout(() => navigation.goBack(), 1000); };

    const handleSignalOffer = (data: any) => {
      if (!isOutgoing && data.offer && webViewLoaded && !hasProcessedOffer.current) {
        hasProcessedOffer.current = true;
        setTimeout(() => webrtcService.createAnswer(data.offer), 500);
      }
    };

    const handleSignalAnswer = (data: any) => {
      if (isOutgoing && data.answer && !hasProcessedAnswer.current) {
        hasProcessedAnswer.current = true;
        webrtcService.handleAnswer(data.answer);
      }
    };

    const handleSignalIce = (data: any) => {
      if (data.candidate) {
        const key = JSON.stringify(data.candidate);
        if (!processedIce.current.has(key)) {
          processedIce.current.add(key);
          webrtcService.addIceCandidate(data.candidate);
        }
      }
    };

    callService.on('call:initiated',    handleCallInitiated);
    callService.on('call:accepted',     handleCallAccepted);
    callService.on('call:rejected',     handleCallRejected);
    callService.on('call:ended',        handleCallEnded);
    callService.on('call:cancelled',    handleCallCancelled);
    callService.on('call:signal:offer', handleSignalOffer);
    callService.on('call:signal:answer',handleSignalAnswer);
    callService.on('call:signal:ice',   handleSignalIce);

    webrtcService.setOnMessageCallback((event) => {
      switch (event.type) {
        case 'offer':         callService.sendOffer(event.data);       break;
        case 'answer':        callService.sendAnswer(event.data);      break;
        case 'iceCandidate':  callService.sendIceCandidate(event.data);break;
        case 'remoteStream':
          console.log('Remote stream received:', event.data);
          setHasRemoteStream(true); setCallStatus('Connected');
          setIsConnected(true); startCallDuration(); break;
        case 'connectionState':
          console.log('WebRTC connection state:', event.data?.state);
          if (event.data?.state === 'connected') {
            setCallStatus('Connected');
            setIsConnected(true);
            startCallDuration();
          } else if (event.data?.state === 'failed') {
            setCallStatus('Connection failed');
            setTimeout(() => { cleanup(); navigation.goBack(); }, 2000);
          }
          break;
        case 'localStream':
          console.log('Local stream ready:', event.data);
          break;
        case 'muteStatus':    setIsMuted(event.data.muted);            break;
        case 'videoStatus':   setIsVideoOff(!event.data.enabled);      break;
        case 'error':
          console.error('WebRTC error:', event.data?.message);
          break;
      }
    });

    startPulseAnimation();

    return () => {
      callService.removeListener('call:initiated',     handleCallInitiated);
      callService.removeListener('call:accepted',      handleCallAccepted);
      callService.removeListener('call:rejected',      handleCallRejected);
      callService.removeListener('call:ended',         handleCallEnded);
      callService.removeListener('call:cancelled',     handleCallCancelled);
      callService.removeListener('call:signal:offer',  handleSignalOffer);
      callService.removeListener('call:signal:answer', handleSignalAnswer);
      callService.removeListener('call:signal:ice',    handleSignalIce);
    };
  }, [callType, isOutgoing, navigation, otherUser._id, webViewLoaded]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 1400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 1400, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(rippleAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
          Animated.timing(rippleAnim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ]),
      ])
    ).start();
  };

  const initializeCall = async () => {
    try {
      // Request Android runtime permissions for microphone/camera before WebView uses them
      if (Platform.OS === 'android') {
        const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
        if (callType === 'video') {
          permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
        }
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        if (!audioGranted) {
          console.warn('Microphone permission not granted');
          setCallStatus('Microphone permission denied');
          return;
        }
      }
    }
    catch (err) {
      console.error('Permission/init error:', err);
      setCallStatus('Failed to connect');
      setTimeout(() => endCall(), 2000);
    }
  };

  const onWebViewLoad = () => {
    setWebViewLoaded(true);
    webrtcService.initialize(callType === 'video');
    if (isOutgoing && currentCallId && !hasInitiatedCall.current) {
      hasInitiatedCall.current = true;
      setTimeout(() => webrtcService.createOffer(), 500);
    } else if (!isOutgoing && offer && !hasProcessedOffer.current) {
      hasProcessedOffer.current = true;
      setTimeout(() => webrtcService.createAnswer(offer), 1000);
    }
  };

  const startCallDuration = () => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    callService.endCall();
    cleanup();
    navigation.goBack();
  };

  const cleanup = () => {
    webrtcService.close();
    if (durationInterval.current) { clearInterval(durationInterval.current); durationInterval.current = null; }
    // Reset audio mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  };

  const toggleMute    = () => webrtcService.toggleMute();
  const toggleVideo   = () => { if (callType === 'video') webrtcService.toggleVideo(); };
  const switchCamera  = () => { if (callType === 'video') webrtcService.switchCamera(); };
  const toggleSpeaker = () => {
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: !newState,
    }).catch((err) => console.warn('Speaker toggle error:', err));
  };

  const displayName = `${otherUser.firstName} ${otherUser.lastName}`.trim();
  const showOverlay = callType === 'voice' || (callType === 'video' && !isConnected);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a14' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── WEBRTC WEBVIEW ───────────────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={(ref) => { if (ref) webrtcService.setWebViewRef(ref); }}
          source={{ html: webrtcHtml, baseUrl: 'https://localhost' }}
          onMessage={(e) => webrtcService.handleWebViewMessage(e)}
          onLoadEnd={onWebViewLoad}
          style={callType === 'video' ? styles.webViewVideo : styles.webViewHidden}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          androidLayerType="hardware"
          mediaCapturePermissionGrantType="grant"
          allowsProtectedMedia={true}
          onPermissionRequest={(event: any) => {
            if (event?.grant) {
              event.grant(event.resources || []);
            }
          }}
          onError={(e) => console.warn('WebView error:', e.nativeEvent)}
        />
      </View>

      {/* ── VOICE / PRE-CONNECT OVERLAY ──────────────────────────────────── */}
      {showOverlay && (
        <View style={StyleSheet.absoluteFill}>
          {/* Blurred background */}
          {otherUser.avatar ? (
            <Image
              source={{ uri: otherUser.avatar }}
              style={{ ...StyleSheet.absoluteFillObject, opacity: 0.35 }}
              resizeMode="cover"
              blurRadius={Platform.OS === 'ios' ? 40 : 12}
            />
          ) : (
            <LinearGradient
              colors={['#1a0a14', '#0a0a14', '#0d0d1a']}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.97)']}
            style={StyleSheet.absoluteFillObject}
          />

          <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>

            {/* ── Top: name + status ─────────────────────────────────────── */}
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10 }}>
                {isOutgoing ? 'Outgoing Call' : 'Incoming Call'} · {callType === 'video' ? 'Video' : 'Voice'}
              </Text>
              <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 }}>
                {displayName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isConnected && (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND.green, marginRight: 6 }} />
                )}
                <Text style={{ color: isConnected ? BRAND.green : 'rgba(255,255,255,0.65)', fontSize: 15, fontWeight: '600' }}>
                  {isConnected ? formatDuration(callDuration) : callStatus}
                </Text>
              </View>
            </View>

            {/* ── Centre: avatar with pulse rings ────────────────────────── */}
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              {/* Outer ripple */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 260, height: 260, borderRadius: 130,
                  borderWidth: 1.5, borderColor: `${BRAND.primary}44`,
                  transform: [{ scale: pulseAnim }],
                  opacity: rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                }}
              />
              {/* Inner ring */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 200, height: 200, borderRadius: 100,
                  borderWidth: 1, borderColor: `${BRAND.primary}66`,
                  transform: [{ scale: pulseAnim }],
                }}
              />

              {/* Avatar */}
              <View
                style={{
                  width: 148, height: 148, borderRadius: 74,
                  overflow: 'hidden',
                  borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
                  backgroundColor: '#1a1a2e',
                  ...Platform.select({
                    ios: { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
                    android: { elevation: 12 },
                  }),
                }}
              >
                {otherUser.avatar ? (
                  <Image source={{ uri: otherUser.avatar }} style={{ width: 148, height: 148 }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e1e30' }}>
                    <Text style={{ fontSize: 54, fontWeight: '800', color: 'rgba(255,255,255,0.8)' }}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Controls ───────────────────────────────────────────────── */}
            <View style={{ paddingBottom: Math.max(insets.bottom, 24) + 8, paddingHorizontal: 24 }}>
              {/* Control tray */}
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 28,
                  paddingVertical: 22,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  ...Platform.select({
                    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
                    android: { elevation: 8 },
                  }),
                }}
              >
                <ControlButton
                  icon={isMuted ? 'mic-off' : 'mic'}
                  label={isMuted ? 'Unmute' : 'Mute'}
                  onPress={toggleMute}
                  isActive={isMuted}
                />

                {callType === 'video' ? (
                  <ControlButton
                    icon={isVideoOff ? 'videocam-off' : 'videocam'}
                    label="Video"
                    onPress={toggleVideo}
                    isActive={!isVideoOff}
                  />
                ) : (
                  <ControlButton
                    icon={isSpeakerOn ? 'volume-high' : 'volume-low'}
                    label="Speaker"
                    onPress={toggleSpeaker}
                    isActive={isSpeakerOn}
                  />
                )}

                {/* End call — larger, centered */}
                <ControlButton
                  icon="call"
                  label="End"
                  onPress={endCall}
                  isDanger
                  isLarge
                />
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* ── VIDEO CONNECTED OVERLAY ──────────────────────────────────────── */}
      {callType === 'video' && isConnected && (
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}>
          {/* Top gradient: name + switch camera */}
          <LinearGradient
            colors={['rgba(0,0,0,0.72)', 'transparent']}
            style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40, pointerEvents: 'box-none' } as any}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'auto' } as any}>
              <View>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 }}>{displayName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND.green, marginRight: 5 }} />
                  <Text style={{ color: BRAND.green, fontSize: 12, fontWeight: '600' }}>{formatDuration(callDuration)}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={switchCamera}
                activeOpacity={0.8}
                style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Bottom gradient: controls */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              paddingBottom: Math.max(insets.bottom, 24) + 12,
              paddingHorizontal: 32, paddingTop: 48,
              pointerEvents: 'box-none',
            } as any}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', pointerEvents: 'auto' } as any}>
              <ControlButton
                icon={isMuted ? 'mic-off' : 'mic'}
                label={isMuted ? 'Unmute' : 'Mute'}
                onPress={toggleMute}
                isActive={isMuted}
              />
              <ControlButton
                icon="call"
                label="End"
                onPress={endCall}
                isDanger
                isLarge
              />
              <ControlButton
                icon={isVideoOff ? 'videocam-off' : 'videocam'}
                label="Video"
                onPress={toggleVideo}
                isActive={!isVideoOff}
              />
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  webViewVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  webViewHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default OngoingCallScreen;