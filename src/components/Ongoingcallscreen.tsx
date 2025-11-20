// import React, { useEffect, useState, useRef } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Image,
//   Animated,
//   Dimensions,
//   StyleSheet,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
// import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import { RootStackParamList } from '@/types/navigation.types';
// import { RTCView } from 'react-native-webrtc';
// import callService from '@/services/call.service';
// import webrtcService from '@/services/webrtc.service';

// type OngoingCallNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OngoingCall'>;
// type OngoingCallRouteProp = RouteProp<RootStackParamList, 'OngoingCall'>;

// const { width, height } = Dimensions.get('window');

// const OngoingCallScreen: React.FC = () => {
//   const navigation = useNavigation<OngoingCallNavigationProp>();
//   const route = useRoute<OngoingCallRouteProp>();

//   const { callId, callType, isOutgoing, otherUser } = route.params;

//   const [callStatus, setCallStatus] = useState<string>(
//     isOutgoing ? 'Calling...' : 'Connecting...'
//   );
//   const [callDuration, setCallDuration] = useState(0);
//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoOff, setIsVideoOff] = useState(false);
//   const [isSpeakerOn, setIsSpeakerOn] = useState(callType === 'video');
//   const [localStream, setLocalStream] = useState<any>(null);
//   const [remoteStream, setRemoteStream] = useState<any>(null);
//   const [isConnected, setIsConnected] = useState(false);

//   const durationInterval = useRef<NodeJS.Timeout | null>(null);
//   const pulseAnim = useRef(new Animated.Value(1)).current;

//   useEffect(() => {
//     initializeCall();

//     // Listen for call events
//     const handleCallAccepted = () => {
//       console.log('✅ Call accepted');
//       setCallStatus('Connected');
//       setIsConnected(true);
//       startCallDuration();
//     };

//     const handleCallRejected = () => {
//       console.log('❌ Call rejected');
//       setCallStatus('Call declined');
//       setTimeout(() => endCall(), 2000);
//     };

//     const handleCallEnded = () => {
//       console.log('📞 Call ended');
//       endCall();
//     };

//     callService.on('call:accepted', handleCallAccepted);
//     callService.on('call:rejected', handleCallRejected);
//     callService.on('call:ended', handleCallEnded);

//     // Pulse animation for calling state
//     if (isOutgoing && !isConnected) {
//       Animated.loop(
//         Animated.sequence([
//           Animated.timing(pulseAnim, {
//             toValue: 1.1,
//             duration: 1000,
//             useNativeDriver: true,
//           }),
//           Animated.timing(pulseAnim, {
//             toValue: 1,
//             duration: 1000,
//             useNativeDriver: true,
//           }),
//         ])
//       ).start();
//     }

//     return () => {
//       cleanup();
//       callService.removeListener('call:accepted', handleCallAccepted);
//       callService.removeListener('call:rejected', handleCallRejected);
//       callService.removeListener('call:ended', handleCallEnded);
//     };
//   }, []);

//   const initializeCall = async () => {
//     try {
//       console.log('🎬 Initializing call');

//       // Get local stream
//       const stream = await webrtcService.getLocalStream(callType === 'video');
//       setLocalStream(stream);

//       // Initialize peer connection
//       await webrtcService.initializePeerConnection(
//         (candidate) => {
//           // Send ICE candidate via socket
//           console.log('🧊 Sending ICE candidate');
//           // callService.sendIceCandidate(callId, candidate);
//         },
//         (stream) => {
//           // Received remote stream
//           console.log('📹 Remote stream received');
//           setRemoteStream(stream);
//         }
//       );

//       // Add local stream to peer connection
//       webrtcService.addLocalStreamToPeer();

//       if (isOutgoing) {
//         // Create and send offer
//         const offer = await webrtcService.createOffer();
//         // callService.sendOffer(callId, offer);
//       }

//       console.log('✅ Call initialized');
//     } catch (error) {
//       console.error('❌ Error initializing call:', error);
//       setCallStatus('Failed to connect');
//       setTimeout(() => endCall(), 2000);
//     }
//   };

//   const startCallDuration = () => {
//     durationInterval.current = setInterval(() => {
//       setCallDuration((prev) => prev + 1);
//     }, 1000);
//   };

//   const formatDuration = (seconds: number): string => {
//     const hrs = Math.floor(seconds / 3600);
//     const mins = Math.floor((seconds % 3600) / 60);
//     const secs = seconds % 60;

//     if (hrs > 0) {
//       return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//     }
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const toggleMute = () => {
//     const muted = webrtcService.toggleMute();
//     setIsMuted(muted);
//   };

//   const toggleVideo = () => {
//     if (callType === 'video') {
//       const videoOff = webrtcService.toggleVideo();
//       setIsVideoOff(videoOff);
//     }
//   };

//   const switchCamera = () => {
//     if (callType === 'video') {
//       webrtcService.switchCamera();
//     }
//   };

//   const toggleSpeaker = () => {
//     // TODO: Implement speaker toggle using InCallManager
//     setIsSpeakerOn(!isSpeakerOn);
//   };

//   const endCall = () => {
//     console.log('📞 Ending call');

//     // Stop duration timer
//     if (durationInterval.current) {
//       clearInterval(durationInterval.current);
//     }

//     // End call via service
//     callService.endCall(callId);

//     // Cleanup
//     cleanup();

//     // Navigate back
//     navigation.goBack();
//   };

//   const cleanup = () => {
//     // Close WebRTC connection
//     webrtcService.close();

//     // Stop duration timer
//     if (durationInterval.current) {
//       clearInterval(durationInterval.current);
//     }
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-gray-900" edges={['top', 'bottom']}>
//       <View className="flex-1">
//         {/* Video Call View */}
//         {callType === 'video' && remoteStream && (
//           <View className="flex-1">
//             {/* Remote Video (Full Screen) */}
//             <RTCView
//               streamURL={remoteStream.toURL()}
//               style={styles.remoteVideo}
//               objectFit="cover"
//             />

//             {/* Local Video (Picture-in-Picture) */}
//             {localStream && !isVideoOff && (
//               <View style={styles.localVideoContainer}>
//                 <RTCView
//                   streamURL={localStream.toURL()}
//                   style={styles.localVideo}
//                   objectFit="cover"
//                   mirror={true}
//                 />
//               </View>
//             )}
//           </View>
//         )}

//         {/* Voice Call View */}
//         {callType === 'voice' || !remoteStream || (callType === 'video' && !isConnected) && (
//           <LinearGradient
//             colors={['#1f2937', '#111827']}
//             className="flex-1"
//           >
//             <View className="flex-1 items-center justify-center">
//               <Animated.View
//                 style={{
//                   transform: [{ scale: pulseAnim }],
//                 }}
//               >
//                 <View className="relative">
//                   {/* Outer rings */}
//                   {!isConnected && (
//                     <>
//                       <View
//                         className="absolute inset-0 rounded-full bg-pink-500/20"
//                         style={{
//                           width: 200,
//                           height: 200,
//                           transform: [{ scale: 1.2 }],
//                         }}
//                       />
//                       <View
//                         className="absolute inset-0 rounded-full bg-pink-500/10"
//                         style={{
//                           width: 200,
//                           height: 200,
//                           transform: [{ scale: 1.4 }],
//                         }}
//                       />
//                     </>
//                   )}

//                   {/* Avatar */}
//                   <View className="w-48 h-48 rounded-full overflow-hidden bg-gray-700 items-center justify-center border-4 border-pink-500">
//                     {otherUser.avatar ? (
//                       <Image
//                         source={{ uri: otherUser.avatar }}
//                         className="w-full h-full"
//                         resizeMode="cover"
//                       />
//                     ) : (
//                       <Ionicons name="person" size={80} color="#9ca3af" />
//                     )}
//                   </View>
//                 </View>
//               </Animated.View>

//               <Text className="text-white text-2xl font-bold mt-8">
//                 {otherUser.firstName} {otherUser.lastName}
//               </Text>
//               <Text className="text-white/60 text-base mt-2">
//                 {isConnected ? formatDuration(callDuration) : callStatus}
//               </Text>
//             </View>
//           </LinearGradient>
//         )}

//         {/* Top Bar (for video calls) */}
//         {callType === 'video' && isConnected && (
//           <View className="absolute top-0 left-0 right-0 pt-12 px-6">
//             <LinearGradient
//               colors={['rgba(0,0,0,0.8)', 'transparent']}
//               className="pb-6"
//             >
//               <View className="flex-row items-center justify-between">
//                 <View>
//                   <Text className="text-white text-lg font-bold">
//                     {otherUser.firstName} {otherUser.lastName}
//                   </Text>
//                   <Text className="text-white/80 text-sm">
//                     {formatDuration(callDuration)}
//                   </Text>
//                 </View>

//                 <TouchableOpacity
//                   onPress={switchCamera}
//                   className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
//                 >
//                   <Ionicons name="camera-reverse" size={24} color="#fff" />
//                 </TouchableOpacity>
//               </View>
//             </LinearGradient>
//           </View>
//         )}

//         {/* Bottom Controls */}
//         <View className="absolute bottom-0 left-0 right-0 pb-8 px-6">
//           <LinearGradient
//             colors={['transparent', 'rgba(0,0,0,0.8)']}
//             className="pt-12"
//           >
//             <View className="flex-row justify-around items-center">
//               {/* Mute Button */}
//               <TouchableOpacity
//                 onPress={toggleMute}
//                 className="items-center"
//               >
//                 <View
//                   className={`w-16 h-16 rounded-full items-center justify-center ${
//                     isMuted ? 'bg-red-500' : 'bg-white/20'
//                   }`}
//                 >
//                   <Ionicons
//                     name={isMuted ? 'mic-off' : 'mic'}
//                     size={28}
//                     color="#fff"
//                   />
//                 </View>
//                 <Text className="text-white text-xs mt-2">
//                   {isMuted ? 'Unmute' : 'Mute'}
//                 </Text>
//               </TouchableOpacity>

//               {/* End Call Button */}
//               <TouchableOpacity
//                 onPress={endCall}
//                 className="items-center"
//               >
//                 <View className="w-20 h-20 rounded-full bg-red-500 items-center justify-center">
//                   <Ionicons name="call" size={32} color="#fff" />
//                 </View>
//                 <Text className="text-white text-xs mt-2">End</Text>
//               </TouchableOpacity>

//               {/* Video/Speaker Toggle Button */}
//               {callType === 'video' ? (
//                 <TouchableOpacity
//                   onPress={toggleVideo}
//                   className="items-center"
//                 >
//                   <View
//                     className={`w-16 h-16 rounded-full items-center justify-center ${
//                       isVideoOff ? 'bg-red-500' : 'bg-white/20'
//                     }`}
//                   >
//                     <Ionicons
//                       name={isVideoOff ? 'videocam-off' : 'videocam'}
//                       size={28}
//                       color="#fff"
//                     />
//                   </View>
//                   <Text className="text-white text-xs mt-2">
//                     {isVideoOff ? 'Video Off' : 'Video'}
//                   </Text>
//                 </TouchableOpacity>
//               ) : (
//                 <TouchableOpacity
//                   onPress={toggleSpeaker}
//                   className="items-center"
//                 >
//                   <View
//                     className={`w-16 h-16 rounded-full items-center justify-center ${
//                       isSpeakerOn ? 'bg-pink-500' : 'bg-white/20'
//                     }`}
//                   >
//                     <Ionicons
//                       name={isSpeakerOn ? 'volume-high' : 'volume-low'}
//                       size={28}
//                       color="#fff"
//                     />
//                   </View>
//                   <Text className="text-white text-xs mt-2">
//                     Speaker
//                   </Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </LinearGradient>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   remoteVideo: {
//     width: width,
//     height: height,
//   },
//   localVideoContainer: {
//     position: 'absolute',
//     top: 60,
//     right: 20,
//     width: 120,
//     height: 160,
//     borderRadius: 12,
//     overflow: 'hidden',
//     borderWidth: 2,
//     borderColor: '#fff',
//   },
//   localVideo: {
//     width: '100%',
//     height: '100%',
//   },
// });

// export default OngoingCallScreen;