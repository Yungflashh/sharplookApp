import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
interface FAQItem {
  question: string;
  answer: string;
  category: string;
}
const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  const faqs: FAQItem[] = [{
    category: 'Bookings',
    question: 'How do I book a service?',
    answer: 'To book a service, browse vendors, select a service, choose your preferred date and time, and confirm your booking. You will receive a confirmation notification.'
  }, {
    category: 'Bookings',
    question: 'Can I cancel or reschedule a booking?',
    answer: 'Yes, you can cancel or reschedule a booking from the Order History screen. Note that cancellation policies may apply depending on the timing.'
  }, {
    category: 'Payments',
    question: 'What payment methods are accepted?',
    answer: 'We accept card payments, bank transfers, and wallet payments. All transactions are secured and encrypted.'
  }, {
    category: 'Payments',
    question: 'How do refunds work?',
    answer: 'Refunds are processed within 5-7 business days after approval. The amount will be credited back to your original payment method or wallet.'
  }, {
    category: 'Account',
    question: 'How do I update my profile information?',
    answer: 'Go to Profile > Personal Information to update your name, phone number, and other details.'
  }, {
    category: 'Account',
    question: 'How do I reset my password?',
    answer: 'Use the "Forgot Password" option on the login screen, or change it from Privacy & Security settings if you\'re logged in.'
  }, {
    category: 'Vendors',
    question: 'How do I become a vendor?',
    answer: 'You can register as a vendor during sign-up or upgrade your account from the profile settings. Complete the verification process to start offering services.'
  }, {
    category: 'Vendors',
    question: 'How are vendors verified?',
    answer: 'Vendors go through a verification process that includes document verification, business information review, and quality checks.'
  }];
  const toggleExpand = (index: number) => {
    setExpandedItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };
  const filteredFAQs = faqs.filter(faq => faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) || faq.category.toLowerCase().includes(searchQuery.toLowerCase()));
  const categories = Array.from(new Set(faqs.map(faq => faq.category)));
  const quickActions = [{
    icon: 'chatbubbles',
    title: 'Live Chat',
    subtitle: 'Chat with support',
    color: '#3b82f6'
  }, {
    icon: 'mail',
    title: 'Email Us',
    subtitle: 'support@sharplook.com',
    color: '#10b981'
  }, {
    icon: 'call',
    title: 'Call Us',
    subtitle: '+234 800 000 0000',
    color: '#f59e0b'
  }];
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Help Center
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{
      paddingBottom: 20
    }}>
        {}
        <View className="px-5 pt-5 pb-3">
          <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-sm">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput className="flex-1 ml-3 text-base text-gray-900" placeholder="Search for help..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        </View>

        {}
        <View className="px-5 pb-5">
          <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
            Contact Support
          </Text>
          <View className="flex-row justify-between">
            {quickActions.map((action, index) => <TouchableOpacity key={index} className="flex-1 bg-white rounded-xl p-4 mx-1 shadow-sm items-center" activeOpacity={0.7}>
                <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{
              backgroundColor: `${action.color}20`
            }}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text className="text-sm font-semibold text-gray-900 text-center">
                  {action.title}
                </Text>
                <Text className="text-xs text-gray-500 text-center mt-1">
                  {action.subtitle}
                </Text>
              </TouchableOpacity>)}
          </View>
        </View>

        {}
        {categories.map(category => <View key={category} className="px-5 pb-5">
            <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              {category}
            </Text>
            <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {filteredFAQs.filter(faq => faq.category === category).map((faq, index) => {
            const globalIndex = faqs.indexOf(faq);
            const isExpanded = expandedItems.includes(globalIndex);
            return <TouchableOpacity key={globalIndex} className={`p-4 ${index !== filteredFAQs.filter(f => f.category === category).length - 1 ? 'border-b border-gray-100' : ''}`} onPress={() => toggleExpand(globalIndex)} activeOpacity={0.7}>
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="flex-1 text-[15px] font-semibold text-gray-800 pr-3">
                          {faq.question}
                        </Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#9ca3af" />
                      </View>
                      {isExpanded && <Text className="text-sm text-gray-600 leading-5 mt-2">
                          {faq.answer}
                        </Text>}
                    </TouchableOpacity>;
          })}
            </View>
          </View>)}

        {filteredFAQs.length === 0 && <View className="items-center justify-center py-10">
            <Ionicons name="search" size={48} color="#d1d5db" />
            <Text className="text-gray-500 mt-3">No results found</Text>
          </View>}
      </ScrollView>
    </SafeAreaView>;
};
export default HelpCenterScreen;