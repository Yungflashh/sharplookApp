import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
interface Message {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  isRead: boolean;
}
type ChatDetailRouteProp = RouteProp<{
  ChatDetail: {
    vendorId: string;
    vendorName: string;
  };
}, 'ChatDetail'>;
type NavigationProp = NativeStackNavigationProp<any>;
const ChatDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChatDetailRouteProp>();
  const {
    vendorId,
    vendorName
  } = route.params || {
    vendorId: '1',
    vendorName: 'AdeChioma Signature'
  };
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    text: 'Hi! I would like to book an appointment',
    timestamp: '10:30 AM',
    isSent: true,
    isRead: true
  }, {
    id: '2',
    text: 'Hello! Thank you for reaching out. What service are you interested in?',
    timestamp: '10:32 AM',
    isSent: false,
    isRead: false
  }, {
    id: '3',
    text: 'I need a full hair treatment and styling',
    timestamp: '10:33 AM',
    isSent: true,
    isRead: true
  }, {
    id: '4',
    text: 'Great! We have availability this weekend. Would Saturday at 2 PM work for you?',
    timestamp: '10:35 AM',
    isSent: false,
    isRead: false
  }, {
    id: '5',
    text: 'Yes, Saturday at 2 PM is perfect!',
    timestamp: '10:36 AM',
    isSent: true,
    isRead: true
  }, {
    id: '6',
    text: 'Your appointment is confirmed for tomorrow at 2 PM. Looking forward to seeing you! 😊',
    timestamp: '10:38 AM',
    isSent: false,
    isRead: false
  }]);
  const scrollViewRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({
      animated: true
    });
  };
  const handleSend = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        }),
        isSent: true,
        isRead: false
      };
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity className="w-10 h-10 items-center justify-center mr-3" onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#eb278d" />
            </TouchableOpacity>

            {}
            <View className="flex-row items-center flex-1">
              <View className="relative mr-3">
                <View className="w-11 h-11 rounded-full bg-pink-50 items-center justify-center">
                  <Ionicons name="person" size={24} color="#eb278d" />
                </View>
                <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">{vendorName}</Text>
                <Text className="text-xs text-green-600">Active now</Text>
              </View>
            </View>
          </View>

          {}
          <View className="flex-row items-center gap-2">
            <TouchableOpacity className="w-10 h-10 items-center justify-center">
              <Ionicons name="call-outline" size={22} color="#eb278d" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 items-center justify-center">
              <Ionicons name="ellipsis-vertical" size={22} color="#eb278d" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1" keyboardVerticalOffset={0}>
        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} className="flex-1 px-4 py-4" contentContainerStyle={{
        paddingBottom: 20
      }}>
          {}
          <View className="items-center mb-4">
            <View className="bg-gray-200 px-4 py-1.5 rounded-full">
              <Text className="text-xs text-gray-600 font-medium">Today</Text>
            </View>
          </View>

          {}
          {messages.map(msg => <View key={msg.id} className={`mb-3 flex-row ${msg.isSent ? 'justify-end' : 'justify-start'}`}>
              {!msg.isSent && <View className="w-8 h-8 rounded-full bg-pink-50 items-center justify-center mr-2">
                  <Ionicons name="person" size={16} color="#eb278d" />
                </View>}

              <View className={`max-w-[75%] ${msg.isSent ? 'items-end' : 'items-start'}`}>
                <View className={`px-4 py-3 rounded-2xl ${msg.isSent ? 'bg-pink-500 rounded-br-sm' : 'bg-white rounded-bl-sm border border-gray-200'}`} style={{
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 1
                  },
                  shadowOpacity: 0.05,
                  shadowRadius: 2
                },
                android: {
                  elevation: 1
                }
              })
            }}>
                  <Text className={`text-sm ${msg.isSent ? 'text-white' : 'text-gray-900'}`} style={{
                lineHeight: 20
              }}>
                    {msg.text}
                  </Text>
                </View>

                {}
                <View className="flex-row items-center mt-1 px-1">
                  <Text className="text-[10px] text-gray-500">{msg.timestamp}</Text>
                  {msg.isSent && <Ionicons name={msg.isRead ? 'checkmark-done' : 'checkmark'} size={14} color={msg.isRead ? '#10b981' : '#9ca3af'} style={{
                marginLeft: 4
              }} />}
                </View>
              </View>

              {msg.isSent && <View className="w-8" />}
            </View>)}
        </ScrollView>

        {}
        <View className="px-4 py-2 bg-white border-t border-gray-200">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
          gap: 8
        }}>
            <TouchableOpacity className="flex-row items-center bg-pink-50 px-4 py-2 rounded-full" activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={16} color="#eb278d" />
              <Text className="text-pink-600 font-semibold text-xs ml-1.5">Book Now</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center bg-pink-50 px-4 py-2 rounded-full" activeOpacity={0.7}>
              <Ionicons name="time-outline" size={16} color="#eb278d" />
              <Text className="text-pink-600 font-semibold text-xs ml-1.5">
                View Availability
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center bg-pink-50 px-4 py-2 rounded-full" activeOpacity={0.7}>
              <Ionicons name="pricetag-outline" size={16} color="#eb278d" />
              <Text className="text-pink-600 font-semibold text-xs ml-1.5">View Services</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {}
        <View className="px-4 py-3 bg-white border-t border-gray-200" style={{
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: -2
            },
            shadowOpacity: 0.05,
            shadowRadius: 8
          },
          android: {
            elevation: 4
          }
        })
      }}>
          <View className="flex-row items-center gap-2">
            {}
            <TouchableOpacity className="w-10 h-10 items-center justify-center">
              <Ionicons name="add-circle" size={28} color="#eb278d" />
            </TouchableOpacity>

            {}
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-4 py-2">
              <TextInput className="flex-1 text-sm text-gray-900" placeholder="Type a message..." placeholderTextColor="#9ca3af" value={message} onChangeText={setMessage} multiline maxLength={500} />
              <TouchableOpacity className="ml-2">
                <Ionicons name="happy-outline" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {}
            {message.trim().length > 0 ? <TouchableOpacity onPress={handleSend} className="w-10 h-10 rounded-full bg-pink-500 items-center justify-center" activeOpacity={0.8} style={{
            shadowColor: '#eb278d',
            shadowOffset: {
              width: 0,
              height: 2
            },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3
          }}>
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity> : <TouchableOpacity className="w-10 h-10 items-center justify-center">
                <Ionicons name="mic" size={24} color="#eb278d" />
              </TouchableOpacity>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>;
};
export default ChatDetailScreen;