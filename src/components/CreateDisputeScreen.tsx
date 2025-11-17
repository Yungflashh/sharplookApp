import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { disputeAPI, handleAPIError } from '@/api/api';
type CreateDisputeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateDispute'>;
type CreateDisputeRouteProp = RouteProp<RootStackParamList, 'CreateDispute'>;
const DISPUTE_CATEGORIES = [{
  value: 'service_quality',
  label: 'Service Quality Issues',
  icon: 'star-outline'
}, {
  value: 'no_show',
  label: 'Vendor No-Show',
  icon: 'close-circle-outline'
}, {
  value: 'pricing',
  label: 'Pricing Dispute',
  icon: 'cash-outline'
}, {
  value: 'damage',
  label: 'Property Damage',
  icon: 'warning-outline'
}, {
  value: 'incomplete',
  label: 'Incomplete Service',
  icon: 'alert-circle-outline'
}, {
  value: 'safety',
  label: 'Safety Concerns',
  icon: 'shield-outline'
}, {
  value: 'communication',
  label: 'Poor Communication',
  icon: 'chatbubble-outline'
}, {
  value: 'other',
  label: 'Other',
  icon: 'help-circle-outline'
}];
const DISPUTE_REASONS = {
  service_quality: ['Poor workmanship', 'Not as described', 'Unprofessional behavior', 'Rushed service'],
  no_show: ['Vendor did not show up', 'Vendor arrived too late', 'Vendor left early', 'No notification given'],
  pricing: ['Hidden charges', 'Price different from agreed', 'Unauthorized extra charges', 'Refund not processed'],
  damage: ['Property was damaged', 'Items were lost', 'Stains or marks left', 'Equipment damage'],
  incomplete: ['Service not fully completed', 'Missing agreed components', 'Partial service only', 'Left work unfinished'],
  safety: ['Unsafe practices', 'Health hazard', 'Inappropriate behavior', 'Threatening conduct'],
  communication: ['No response to messages', 'Rude communication', 'Wrong information given', 'Ignored instructions'],
  other: ['Other reason (please describe)']
};
const CreateDisputeScreen: React.FC = () => {
  const navigation = useNavigation<CreateDisputeNavigationProp>();
  const route = useRoute<CreateDisputeRouteProp>();
  const {
    bookingId
  } = route.params;
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const handleSubmitDispute = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a dispute category');
      return;
    }
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }
    if (!description || description.trim().length < 20) {
      Alert.alert('Error', 'Please provide a detailed description (minimum 20 characters)');
      return;
    }
    try {
      setLoading(true);
      const disputeData = {
        bookingId,
        category: selectedCategory,
        reason: selectedReason,
        description: description.trim()
      };
      const response = await disputeAPI.createDispute(disputeData);
      if (response.success) {
        Alert.alert('Dispute Created', 'Your dispute has been submitted. Our team will review it shortly.', [{
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          }
        }]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };
  return <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">Create Dispute</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-6">
          {}
          <View className="bg-amber-50 rounded-xl p-4 mb-6 flex-row items-start">
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <View className="flex-1 ml-3">
              <Text className="text-sm font-semibold text-amber-800 mb-1">
                Important Notice
              </Text>
              <Text className="text-xs text-amber-700">
                Please provide accurate information. False disputes may result in
                account suspension. All disputes are reviewed by our team.
              </Text>
            </View>
          </View>

          {}
          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Select Category <Text className="text-red-500">*</Text>
            </Text>

            <View className="gap-3">
              {DISPUTE_CATEGORIES.map(category => <TouchableOpacity key={category.value} onPress={() => {
              setSelectedCategory(category.value);
              setSelectedReason('');
            }} className={`flex-row items-center p-4 rounded-xl border ${selectedCategory === category.value ? 'bg-pink-50 border-pink-500' : 'bg-white border-gray-200'}`} activeOpacity={0.7}>
                  <View className={`w-10 h-10 rounded-full items-center justify-center ${selectedCategory === category.value ? 'bg-pink-100' : 'bg-gray-100'}`}>
                    <Ionicons name={category.icon as any} size={20} color={selectedCategory === category.value ? '#ec4899' : '#6b7280'} />
                  </View>

                  <Text className={`flex-1 ml-3 font-semibold ${selectedCategory === category.value ? 'text-pink-700' : 'text-gray-700'}`}>
                    {category.label}
                  </Text>

                  {selectedCategory === category.value && <Ionicons name="checkmark-circle" size={24} color="#ec4899" />}
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          {selectedCategory && <View className="mb-6">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Select Reason <Text className="text-red-500">*</Text>
              </Text>

              <View className="gap-2">
                {DISPUTE_REASONS[selectedCategory as keyof typeof DISPUTE_REASONS]?.map(reason => <TouchableOpacity key={reason} onPress={() => setSelectedReason(reason)} className={`flex-row items-center p-3 rounded-lg border ${selectedReason === reason ? 'bg-pink-50 border-pink-500' : 'bg-white border-gray-200'}`} activeOpacity={0.7}>
                      <View className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${selectedReason === reason ? 'border-pink-500' : 'border-gray-300'}`}>
                        {selectedReason === reason && <View className="w-3 h-3 rounded-full bg-pink-500" />}
                      </View>

                      <Text className={`flex-1 ${selectedReason === reason ? 'text-pink-700 font-semibold' : 'text-gray-700'}`}>
                        {reason}
                      </Text>
                    </TouchableOpacity>)}
              </View>
            </View>}

          {}
          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Detailed Description <Text className="text-red-500">*</Text>
            </Text>
            <Text className="text-sm text-gray-600 mb-2">
              Provide a clear and detailed explanation of the issue. Include dates,
              times, and any relevant details.
            </Text>

            <TextInput className="bg-white border border-gray-200 rounded-xl p-4 text-gray-900" placeholder="Describe the issue in detail (minimum 20 characters)..." placeholderTextColor="#9ca3af" value={description} onChangeText={setDescription} multiline numberOfLines={8} textAlignVertical="top" style={{
            minHeight: 150
          }} />

            <Text className="text-xs text-gray-500 mt-2">
              {description.length} characters
            </Text>
          </View>

          {}
          <View className="bg-blue-50 rounded-xl p-4 mb-6">
            <View className="flex-row items-start mb-2">
              <Ionicons name="bulb" size={20} color="#2563eb" />
              <Text className="text-sm font-semibold text-blue-900 ml-2">
                Tips for a Better Resolution
              </Text>
            </View>
            <View className="ml-7 gap-2">
              <Text className="text-xs text-blue-700">
                • Be specific about what went wrong
              </Text>
              <Text className="text-xs text-blue-700">
                • Include dates and times if relevant
              </Text>
              <Text className="text-xs text-blue-700">
                • Provide any supporting evidence
              </Text>
              <Text className="text-xs text-blue-700">
                • Be honest and fair in your description
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {}
      <View className="bg-white px-5 py-4 border-t border-gray-100">
        <TouchableOpacity onPress={handleSubmitDispute} disabled={loading || !selectedCategory || !selectedReason || !description} className={`py-4 rounded-xl ${loading || !selectedCategory || !selectedReason || !description ? 'bg-gray-300' : 'bg-pink-600'}`} activeOpacity={0.7}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-center font-bold text-base">
              Submit Dispute
            </Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>;
};
export default CreateDisputeScreen;