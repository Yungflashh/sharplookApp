import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Vibration,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import callService from '@/services/call.service';
import { Audio } from 'expo-av';

type IncomingCallNavigationProp = NativeStackNavigationProp<RootStackParamList, 'IncomingCall'>;
type IncomingCallRouteProp = RouteProp<RootStackParamList, 'IncomingCall'>;

const IncomingCallScreen: React.FC = () => {
  const navigation = useNavigation<IncomingCallNavigationProp>();
  const route = useRoute<IncomingCallRouteProp>();

  const { call, caller, callType, offer } = route.params;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const [ringtone, setRingtone] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    console.log('📲 IncomingCallScreen MOUNTED');
    console.log('   - Call ID:', call._id);
    console.log('   - Call type:', callType);
    console.log('   - Caller:', caller.firstName, caller.lastName);
    console.log('   - Caller ID:', caller._id);
    console.log('   - Has offer:', !!offer);
    
    startPulseAnimation();

    console.log('   - Starting vibration...');
    Vibration.vibrate([0, 1000, 500, 1000], true);

    const playRingtone = async () => {
      try {
        console.log('   - Playing ringtone...');
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/ringtone.mp3'), 
          { shouldPlay: true, isLooping: true }
        );
        setRingtone(sound);
        console.log('   ✅ Ringtone started');
      } catch (error) {
        console.log('   ❌ Error playing ringtone:', error);
      }
    };
    
    playRingtone();

    const handleCallCancelled = () => {
      console.log('📞 Call was cancelled by caller');
      cleanupAndGoBack();
    };

    callService.on('call:cancelled', handleCallCancelled);

    return () => {
      console.log('📲 IncomingCallScreen UNMOUNTING');
      cleanup();
      callService.removeListener('call:cancelled', handleCallCancelled);
    };
  }, []);

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

  const cleanup = async () => {
    Vibration.cancel();
    if (ringtone) {
      try {
        await ringtone.stopAsync();
        await ringtone.unloadAsync();
      } catch (error) {
        console.log('Error stopping ringtone:', error);
      }
    }
  };

  const cleanupAndGoBack = async () => {
    console.log('🧹 Cleaning up and going back');
    await cleanup();
    navigation.goBack();
  };

  const handleAccept = async () => {
    console.log('🟢 ACCEPT BUTTON PRESSED');
    console.log('   - Call ID:', call._id);
    console.log('   - Call type:', callType);
    console.log('   - Caller:', caller.firstName, caller.lastName);
    console.log('   - Passing offer:', !!offer);
    
    try {
      console.log('   - Running cleanup (stop ringtone)...');
      await cleanup();
      
      console.log('   - Calling callService.acceptCall()...');
      await callService.acceptCall(call._id, callType);
      console.log('   ✅ callService.acceptCall() completed');

      console.log('   - Navigating to OngoingCall screen...');
      navigation.replace('OngoingCall', {
        callId: call._id,
        callType: callType,
        isOutgoing: false,
        offer: offer,  // Pass the SDP offer!
        otherUser: caller,
      });
      console.log('   ✅ Navigation complete');
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      cleanupAndGoBack();
    }
  };

  const handleReject = async () => {
    console.log('🔴 REJECT BUTTON PRESSED');
    console.log('   - Call ID:', call._id);
    
    await cleanup();
    callService.rejectCall(call._id);
    navigation.goBack();
    console.log('   ✅ Call rejected and navigated back');
  };

  return (
    <View className="flex-1 bg-gray-900">
      <StatusBar barStyle="light-content" />
      
      {/* Background Image with Overlay */}
      <View className="absolute inset-0">
        {caller.avatar ? (
          <Image
            source={{ uri: caller.avatar }}
            className="w-full h-full opacity-60"
            resizeMode="cover"
          />
        ) : null}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
          className="absolute inset-0"
        />
      </View>

      {/* Content */}
      <SafeAreaView className="flex-1 justify-between py-8">
        {/* Caller Info */}
        <View className="items-center px-6 mt-12">
          <View className="mb-6">
            <Animated.View 
              style={{
                transform: [{ scale: pulseAnim }]
              }}
            >
              <View className="w-32 h-32 rounded-full overflow-hidden bg-gray-700">
                {caller.avatar ? (
                  <Image
                    source={{ uri: caller.avatar }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-blue-600">
                    <Text className="text-white text-5xl font-bold">
                      {caller.firstName?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Ripple Effect */}
            <Animated.View 
              style={{
                position: 'absolute',
                width: 160,
                height: 160,
                borderRadius: 80,
                borderWidth: 2,
                borderColor: 'rgba(59, 130, 246, 0.3)',
                top: -16,
                left: -16,
                opacity: rippleAnim,
                transform: [{
                  scale: rippleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3]
                  })
                }]
              }}
            />
          </View>

          <Text className="text-white text-3xl font-bold mb-2">
            {caller.firstName} {caller.lastName}
          </Text>
          <Text className="text-gray-400 text-lg">
            Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="px-12">
          <View className="flex-row justify-around items-center">
            {/* Reject Button */}
            <TouchableOpacity
              onPress={handleReject}
              activeOpacity={0.8}
              className="items-center"
            >
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
                className="w-20 h-20 rounded-full items-center justify-center shadow-lg"
              >
                <Ionicons name="call" size={34} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
              </LinearGradient>
              <Text className="text-white text-sm mt-3 font-medium">Decline</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              onPress={handleAccept}
              activeOpacity={0.8}
              className="items-center"
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                className="w-20 h-20 rounded-full items-center justify-center shadow-lg"
              >
                <Ionicons name="call" size={34} color="white" />
              </LinearGradient>
              <Text className="text-white text-sm mt-3 font-medium">Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default IncomingCallScreen;
