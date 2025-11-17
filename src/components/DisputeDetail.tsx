import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { disputeAPI, handleAPIError } from '@/api/api';
type DisputeDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DisputeDetail'>;
type DisputeDetailRouteProp = RouteProp<RootStackParamList, 'DisputeDetail'>;
interface DisputeDetail {
  _id: string;
  booking: {
    _id: string;
    bookingNumber?: string;
    service: {
      name: string;
    };
    scheduledDate: string;
    totalAmount: number;
    status: string;
  };
  raisedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  against: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  reason: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  evidence: Array<{
    type: string;
    content: string;
    uploadedAt: string;
    uploadedBy: {
      _id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  messages: Array<{
    _id?: string;
    sender: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    message: string;
    attachments?: string[];
    sentAt: string;
  }>;
  createdAt: string;
  reviewedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolution?: string;
  resolutionDetails?: string;
  refundAmount?: number;
  vendorPaymentAmount?: number;
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
}
const DisputeDetailScreen: React.FC = () => {
  const navigation = useNavigation<DisputeDetailNavigationProp>();
  const route = useRoute<DisputeDetailRouteProp>();
  const {
    disputeId
  } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const fetchDisputeDetails = async () => {
    try {
      setLoading(true);
      const response = await disputeAPI.getDisputeById(disputeId);
      console.log('Dispute detail:', response);
      if (response.success) {
        const disputeData = response.data.dispute || response.data;
        setDispute(disputeData);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Dispute detail error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to load dispute details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDisputeDetails();
  }, [disputeId]);
  useFocusEffect(useCallback(() => {
    fetchDisputeDetails();
  }, []));
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDisputeDetails().finally(() => setRefreshing(false));
  }, []);
  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    try {
      setSendingMessage(true);
      const response = await disputeAPI.addMessage(disputeId, newMessage.trim());
      if (response.success) {
        setNewMessage('');
        fetchDisputeDetails();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };
  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  const getResolutionText = (resolution?: string) => {
    switch (resolution) {
      case 'refund_client':
        return '✓ Full refund issued to client';
      case 'pay_vendor':
        return '✓ Full payment released to vendor';
      case 'partial_refund':
        return '⚖️ Partial refund issued';
      case 'no_action':
        return '— No action required';
      default:
        return '';
    }
  };
  const handleViewBooking = () => {
    if (dispute?.booking?._id) {
      navigation.navigate('BookingDetail', {
        bookingId: dispute.booking._id
      });
    }
  };
  if (loading) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-400 text-sm mt-4">Loading dispute...</Text>
        </View>
      </SafeAreaView>;
  }
  if (!dispute) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-900 text-lg font-bold">Dispute not found</Text>
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-gray-900">Dispute Details</Text>

          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" colors={['#eb278d']} />}>
          <View className="px-5 py-6">
            {}
            <View className="flex-row items-center justify-between mb-6">
              <View className={`px-4 py-2 rounded-full border ${getStatusColor(dispute.status)}`}>
                <Text className="font-bold">{formatStatus(dispute.status)}</Text>
              </View>

              <View className={`px-3 py-1 rounded-lg ${getPriorityColor(dispute.priority)}`}>
                <Text className="text-xs font-bold">
                  {formatStatus(dispute.priority)} Priority
                </Text>
              </View>
            </View>

            {}
            {dispute.status === 'resolved' && dispute.resolution && <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <View className="flex-row items-start">
                  <Ionicons name="checkmark-circle" size={24} color="#15803d" />
                  <View className="flex-1 ml-3">
                    <Text className="text-green-900 font-bold mb-1">
                      Dispute Resolved
                    </Text>
                    <Text className="text-green-700 text-sm mb-2">
                      {getResolutionText(dispute.resolution)}
                    </Text>
                    {dispute.resolutionDetails && <Text className="text-green-700 text-sm">
                        {dispute.resolutionDetails}
                      </Text>}
                    {dispute.resolvedAt && <Text className="text-green-600 text-xs mt-2">
                        Resolved on {formatDate(dispute.resolvedAt)}
                      </Text>}
                  </View>
                </View>

                {}
                {dispute.resolution === 'partial_refund' && (dispute.refundAmount || dispute.vendorPaymentAmount) && <View className="mt-3 pt-3 border-t border-green-200">
                      <Text className="text-green-900 font-semibold text-sm mb-2">
                        Payment Distribution:
                      </Text>
                      {dispute.refundAmount && dispute.refundAmount > 0 && <Text className="text-green-700 text-sm">
                          • Client Refund: {formatPrice(dispute.refundAmount)}
                        </Text>}
                      {dispute.vendorPaymentAmount && dispute.vendorPaymentAmount > 0 && <Text className="text-green-700 text-sm">
                          • Vendor Payment: {formatPrice(dispute.vendorPaymentAmount)}
                        </Text>}
                    </View>}
              </View>}

            {}
            <TouchableOpacity onPress={handleViewBooking} className="bg-white rounded-2xl p-4 mb-4" activeOpacity={0.7}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-gray-900">
                  Related Booking
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </View>

              <Text className="text-gray-900 font-semibold mb-2">
                {dispute.booking.service.name}
              </Text>

              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-600 ml-1">
                    {formatDate(dispute.booking.scheduledDate)}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Ionicons name="cash-outline" size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-600 ml-1">
                    {formatPrice(dispute.booking.totalAmount)}
                  </Text>
                </View>
              </View>

              {dispute.booking.bookingNumber && <Text className="text-xs text-gray-500 mt-2">
                  #{dispute.booking.bookingNumber}
                </Text>}
            </TouchableOpacity>

            {}
            <View className="bg-white rounded-2xl p-4 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Dispute Information
              </Text>

              <View className="gap-3">
                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    Category
                  </Text>
                  <Text className="text-gray-900">{formatStatus(dispute.category)}</Text>
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    Reason
                  </Text>
                  <Text className="text-gray-900">{dispute.reason}</Text>
                </View>

                <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </Text>
                  <Text className="text-gray-700">{dispute.description}</Text>
                </View>

                <View className="flex-row justify-between pt-2 border-t border-gray-100">
                  <Text className="text-sm text-gray-600">Created</Text>
                  <Text className="text-sm text-gray-900 font-semibold">
                    {formatDate(dispute.createdAt)}
                  </Text>
                </View>

                {dispute.assignedTo && <View className="flex-row justify-between">
                    <Text className="text-sm text-gray-600">Assigned To</Text>
                    <Text className="text-sm text-gray-900 font-semibold">
                      {dispute.assignedTo.firstName} {dispute.assignedTo.lastName}
                    </Text>
                  </View>}
              </View>
            </View>

            {}
            <View className="bg-white rounded-2xl p-4 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Parties Involved
              </Text>

              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs text-gray-500 mb-1">Raised By</Text>
                    <Text className="text-gray-900 font-semibold">
                      {dispute.raisedBy.firstName} {dispute.raisedBy.lastName}
                    </Text>
                  </View>
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center">
                    <Ionicons name="person" size={20} color="#ec4899" />
                  </View>
                </View>

                <View className="border-t border-gray-100" />

                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs text-gray-500 mb-1">Against</Text>
                    <Text className="text-gray-900 font-semibold">
                      {dispute.against.firstName} {dispute.against.lastName}
                    </Text>
                  </View>
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                    <Ionicons name="person-outline" size={20} color="#6b7280" />
                  </View>
                </View>
              </View>
            </View>

            {}
            {dispute.evidence && dispute.evidence.length > 0 && <View className="bg-white rounded-2xl p-4 mb-4">
                <Text className="text-base font-bold text-gray-900 mb-3">
                  Evidence ({dispute.evidence.length})
                </Text>

                <View className="gap-3">
                  {dispute.evidence.map((item, index) => <View key={index} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-row items-center">
                          <Ionicons name={item.type === 'image' ? 'image-outline' : item.type === 'document' ? 'document-outline' : 'text-outline'} size={20} color="#6b7280" />
                          <Text className="text-sm font-semibold text-gray-700 ml-2">
                            {formatStatus(item.type)}
                          </Text>
                        </View>
                        <Text className="text-xs text-gray-500">
                          {formatDateTime(item.uploadedAt)}
                        </Text>
                      </View>

                      <Text className="text-gray-700 text-sm mb-2">{item.content}</Text>

                      <Text className="text-xs text-gray-500">
                        By {item.uploadedBy.firstName} {item.uploadedBy.lastName}
                      </Text>
                    </View>)}
                </View>
              </View>}

            {}
            <View className="bg-white rounded-2xl p-4 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Messages ({dispute.messages?.length || 0})
              </Text>

              {dispute.messages && dispute.messages.length > 0 ? <View className="gap-3">
                  {dispute.messages.map((msg, index) => <View key={index} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-row items-center flex-1">
                          <View className="w-8 h-8 rounded-full bg-pink-100 items-center justify-center mr-2">
                            <Text className="text-xs font-bold text-pink-600">
                              {msg.sender.firstName.charAt(0)}
                              {msg.sender.lastName.charAt(0)}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-gray-900">
                              {msg.sender.firstName} {msg.sender.lastName}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {formatDateTime(msg.sentAt)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text className="text-gray-700">{msg.message}</Text>

                      {msg.attachments && msg.attachments.length > 0 && <View className="flex-row items-center mt-2">
                          <Ionicons name="attach" size={14} color="#6b7280" />
                          <Text className="text-xs text-gray-600 ml-1">
                            {msg.attachments.length} attachment(s)
                          </Text>
                        </View>}
                    </View>)}
                </View> : <Text className="text-gray-500 text-sm text-center py-4">
                  No messages yet
                </Text>}
            </View>

            {}
            <View className="bg-white rounded-2xl p-4 mb-20">
              <Text className="text-base font-bold text-gray-900 mb-3">Timeline</Text>

              <View className="gap-4">
                <View className="flex-row items-start">
                  <View className="w-8 h-8 rounded-full bg-yellow-100 items-center justify-center mr-3">
                    <Ionicons name="add-circle" size={16} color="#ca8a04" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold">
                      Dispute Created
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {formatDate(dispute.createdAt)}
                    </Text>
                  </View>
                </View>

                {dispute.reviewedAt && <View className="flex-row items-start">
                    <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                      <Ionicons name="eye" size={16} color="#2563eb" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold">Under Review</Text>
                      <Text className="text-xs text-gray-500">
                        {formatDate(dispute.reviewedAt)}
                      </Text>
                    </View>
                  </View>}

                {dispute.resolvedAt && <View className="flex-row items-start">
                    <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3">
                      <Ionicons name="checkmark-circle" size={16} color="#15803d" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold">Resolved</Text>
                      <Text className="text-xs text-gray-500">
                        {formatDate(dispute.resolvedAt)}
                      </Text>
                    </View>
                  </View>}

                {dispute.closedAt && <View className="flex-row items-start">
                    <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
                      <Ionicons name="close-circle" size={16} color="#6b7280" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold">Closed</Text>
                      <Text className="text-xs text-gray-500">
                        {formatDate(dispute.closedAt)}
                      </Text>
                    </View>
                  </View>}
              </View>
            </View>
          </View>
        </ScrollView>

        {}
        {['open', 'in_review'].includes(dispute.status.toLowerCase()) && <View className="bg-white border-t border-gray-200 px-5 py-3">
            <View className="flex-row items-center gap-2">
              <TextInput className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-gray-900" placeholder="Type your message..." placeholderTextColor="#9ca3af" value={newMessage} onChangeText={setNewMessage} multiline maxLength={500} />

              <TouchableOpacity onPress={handleSendMessage} disabled={sendingMessage || !newMessage.trim()} className={`w-12 h-12 rounded-xl items-center justify-center ${sendingMessage || !newMessage.trim() ? 'bg-gray-300' : 'bg-pink-600'}`} activeOpacity={0.7}>
                {sendingMessage ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>}
      </KeyboardAvoidingView>
    </SafeAreaView>;
};
export default DisputeDetailScreen;