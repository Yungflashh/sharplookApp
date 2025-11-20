import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import callService from '@/services/call.service';
import Sound from 'react-native-sound';

type IncomingCallNavigationProp = NativeStackNavigationProp<RootStackParamList, 'IncomingCall'>;
type IncomingCallRouteProp = RouteProp<RootStackParamList, 'IncomingCall'>;

const IncomingCallScreen: React.FC = () => {
  const navigation = useNavigation<IncomingCallNavigationProp>();
  const route = useRoute<IncomingCallRouteProp>();

  const { call, caller, callType } = route.params;

  const [pulseAnim] = useState(new Animated.Value(1));
  const [ringtone, setRingtone] = useState<Sound | null>(null);

  useEffect(() => {
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Vibrate phone
    Vibration.vibrate([0, 1000, 500, 1000], true);

    // Play ringtone (optional - you need to add ringtone file)
    // const sound = new Sound('ringtone.mp3', Sound.MAIN_BUNDLE, (error) => {
    //   if (!error) {
    //     sound.setNumberOfLoops(-1);
    //     sound.play();
    //     setRingtone(sound);
    //   }
    // });

    // Listen for call cancelled
    const handleCallCancelled = () => {
      console.log('📞 Call was cancelled by caller');
      navigation.goBack();
    };

    callService.on('call:cancelled', handleCallCancelled);

    // Cleanup
    return () => {
      Vibration.cancel();
      
      // Stop ringtone
      if (ringtone) {
        ringtone.stop();
        ringtone.release();
      }

      callService.removeListener('call:cancelled', handleCallCancelled);
    };
  }, []);

  const handleAccept = async () => {
    console.log('✅ Accepting call:', call._id);

    try {
      // Stop vibration and ringtone
      Vibration.cancel();
      if (ringtone) {
        ringtone.stop();
      }

      // Accept call
      await callService.acceptCall(call._id, callType);

      // Navigate to ongoing call screen
      navigation.replace('OngoingCall', {
        callId: call._id,
        callType: callType,
        isOutgoing: false,
        otherUser: caller,
      });
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      navigation.goBack();
    }
  };

  const handleReject = () => {
    console.log('❌ Rejecting call:', call._id);

    // Stop vibration and ringtone
    Vibration.cancel();
    if (ringtone) {
      ringtone.stop();
    }

    // Reject call
    callService.rejectCall(call._id);

    // Go back
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#1f2937', '#111827']}
        className="flex-1"
      >
        {/* Header */}
        <View className="items-center pt-12">
          <Text className="text-white/60 text-base mb-2">
            {callType === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
          <Text className="text-white text-2xl font-bold mb-1">
            {caller.firstName} {caller.lastName}
          </Text>
          <Text className="text-white/80 text-base">
            Incoming call...
          </Text>
        </View>

        {/* Caller Avatar */}
        <View className="flex-1 items-center justify-center">
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
            }}
          >
            <View className="relative">
              {/* Outer rings */}
              <View
                className="absolute inset-0 rounded-full bg-pink-500/20"
                style={{
                  width: 220,
                  height: 220,
                  transform: [{ scale: 1.2 }],
                }}
              />
              <View
                className="absolute inset-0 rounded-full bg-pink-500/10"
                style={{
                  width: 220,
                  height: 220,
                  transform: [{ scale: 1.4 }],
                }}
              />

              {/* Avatar */}
              <View className="w-52 h-52 rounded-full overflow-hidden bg-gray-700 items-center justify-center border-4 border-pink-500">
                {caller.avatar ? (
                  <Image
                    source={{ uri: caller.avatar }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={100} color="#9ca3af" />
                )}
              </View>

              {/* Call type icon */}
              <View className="absolute bottom-0 right-0 w-16 h-16 rounded-full bg-pink-500 items-center justify-center border-4 border-gray-900">
                <Ionicons
                  name={callType === 'video' ? 'videocam' : 'call'}
                  size={28}
                  color="#fff"
                />
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Action Buttons */}
        <View className="px-8 pb-12">
          <View className="flex-row justify-around items-center">
            {/* Reject Button */}
            <TouchableOpacity
              onPress={handleReject}
              activeOpacity={0.8}
              className="items-center"
            >
              <View className="w-20 h-20 rounded-full bg-red-500 items-center justify-center mb-3">
                <Ionicons name="close" size={40} color="#fff" />
              </View>
              <Text className="text-white text-base font-medium">Decline</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              onPress={handleAccept}
              activeOpacity={0.8}
              className="items-center"
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                className="w-20 h-20 rounded-full items-center justify-center mb-3"
              >
                <Ionicons
                  name={callType === 'video' ? 'videocam' : 'call'}
                  size={40}
                  color="#fff"
                />
              </LinearGradient>
              <Text className="text-white text-base font-medium">Accept</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View className="flex-row justify-center mt-8" style={{ gap: 32 }}>
            <TouchableOpacity
              onPress={() => {
                // TODO: Send message instead
              }}
              className="items-center"
            >
              <View className="w-14 h-14 rounded-full bg-white/10 items-center justify-center">
                <Ionicons name="chatbubble" size={24} color="#fff" />
              </View>
              <Text className="text-white/60 text-xs mt-2">Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                // TODO: Remind me later
              }}
              className="items-center"
            >
              <View className="w-14 h-14 rounded-full bg-white/10 items-center justify-center">
                <Ionicons name="time" size={24} color="#fff" />
              </View>
              <Text className="text-white/60 text-xs mt-2">Remind</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default IncomingCallScreen;