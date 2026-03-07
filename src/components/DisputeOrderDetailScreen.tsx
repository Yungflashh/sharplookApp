import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

type DisputeDetailRouteProp = RouteProp<RootStackParamList, 'DisputeOrderDetail'>;
type DisputeDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DisputeOrderDetail'>;

interface DisputeData {
  _id: string;
  disputeNumber: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  reason: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  isEscalated: boolean;
  customerResponded: boolean;
  sellerResponded: boolean;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
  };
  seller: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    avatar?: string;
    vendorProfile?: {
      businessName: string;
    };
  };
  order: {
    _id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    items: Array<{
      product: {
        _id: string;
        name: string;
        images: string[];
      };
      quantity: number;
      price: number;
    }>;
    deliveryType: string;
    createdAt: string;
  };
}

const DisputeOrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<DisputeDetailNavigationProp>();
  const route = useRoute<DisputeDetailRouteProp>();
  const { disputeorderId, userType } = route.params;

  const [loading, setLoading] = useState(true);
  const [dispute, setDispute] = useState<DisputeData | null>(null);

  useEffect(() => {
    fetchDisputeDetails();
  }, [disputeorderId]);

  const fetchDisputeDetails = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getDisputeById(disputeorderId);

      console.log('=== Dispute Detail Response Debug ===');
      console.log('response.data:', response.data);

      if (response.success || response.data) {
        const disputeData = response.data?.dispute || response.data;
        setDispute(disputeData);
        console.log('✅ Loaded dispute:', disputeData.disputeNumber);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Fetch dispute error:', apiError);
      toast.error('Error', apiError.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return '#f59e0b';
      case 'in_progress':
        return '#3b82f6';
      case 'resolved':
        return '#10b981';
      case 'closed':
        return '#6b7280';
      case 'escalated':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getReasonLabel = (reason: string) => {
    return reason
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4 font-medium">
            Loading dispute details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dispute) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View className="px-5 py-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">Dispute Details</Text>
              <Text className="text-sm text-white/90">#{dispute.disputeNumber}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Status Card */}
          <View
            className="bg-white rounded-3xl p-5 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-900 text-lg font-bold">Dispute Status</Text>
              <View
                className="px-4 py-2 rounded-full"
                style={{ backgroundColor: `${getStatusColor(dispute.status)}15` }}
              >
                <Text
                  className="text-sm font-bold capitalize"
                  style={{ color: getStatusColor(dispute.status) }}
                >
                  {dispute.status.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-3">
              <View className="flex-1 bg-gray-50 rounded-2xl p-3 mr-2">
                <Text className="text-gray-500 text-xs font-semibold mb-1">Priority</Text>
                <View className="flex-row items-center">
                  <View
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: getPriorityColor(dispute.priority) }}
                  />
                  <Text
                    className="text-sm font-bold capitalize"
                    style={{ color: getPriorityColor(dispute.priority) }}
                  >
                    {dispute.priority}
                  </Text>
                </View>
              </View>

              <View className="flex-1 bg-gray-50 rounded-2xl p-3 ml-2">
                <Text className="text-gray-500 text-xs font-semibold mb-1">Created</Text>
                <Text className="text-gray-900 text-xs font-bold">
                  {new Date(dispute.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {dispute.isEscalated && (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-3 flex-row items-center">
                <Ionicons name="arrow-up-circle" size={20} color="#ef4444" />
                <Text className="text-red-700 text-sm font-bold ml-2">
                  Escalated to Admin Review
                </Text>
              </View>
            )}
          </View>

          {/* Issue Details */}
          <View
            className="bg-white rounded-3xl p-5 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                <Ionicons name="document-text" size={20} color="#f97316" />
              </View>
              <Text className="text-gray-900 text-lg font-bold">Issue Details</Text>
            </View>

            <View className="bg-orange-50 rounded-2xl p-4 mb-3">
              <Text className="text-orange-900 text-xs font-bold mb-1">REASON</Text>
              <Text className="text-orange-800 text-base font-bold">
                {getReasonLabel(dispute.reason)}
              </Text>
            </View>

            <View className="bg-gray-50 rounded-2xl p-4">
              <Text className="text-gray-500 text-xs font-bold mb-2">DESCRIPTION</Text>
              <Text className="text-gray-900 text-sm leading-6">{dispute.description}</Text>
            </View>
          </View>

          {/* Linked Order */}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('OrderDetail', {
                orderId: dispute.order._id,
                userType,
              })
            }
            activeOpacity={0.7}
            className="mb-4"
          >
            <View
              className="bg-white rounded-3xl p-5"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Ionicons name="receipt" size={20} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 text-lg font-bold">Linked Order</Text>
                    <Text className="text-gray-500 text-xs">#{dispute.order.orderNumber}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>

              <View className="flex-row items-center justify-between bg-gray-50 rounded-2xl p-3">
                <View>
                  <Text className="text-gray-500 text-xs font-semibold mb-1">Total Amount</Text>
                  <Text className="text-gray-900 text-lg font-bold">
                    {formatPrice(dispute.order.totalAmount)}
                  </Text>
                </View>
                <View
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: `${getStatusColor(dispute.order.status)}15`,
                  }}
                >
                  <Text
                    className="text-xs font-bold capitalize"
                    style={{ color: getStatusColor(dispute.order.status) }}
                  >
                    {dispute.order.status}
                  </Text>
                </View>
              </View>

              {dispute.order.items && dispute.order.items.length > 0 && (
                <View className="mt-3">
                  <Text className="text-gray-500 text-xs font-semibold mb-2">
                    {dispute.order.items.length} Item(s)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {dispute.order.items.map((item, index) => (
                      <View key={index} className="mr-3">
                        <Image
                          source={{
                            uri:
                              item.product?.images?.[0] ||
                              'https://via.placeholder.com/150',
                          }}
                          className="w-16 h-16 rounded-xl"
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Parties Involved */}
          <View
            className="bg-white rounded-3xl p-5 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                <Ionicons name="people" size={20} color="#a855f7" />
              </View>
              <Text className="text-gray-900 text-lg font-bold">Parties Involved</Text>
            </View>

            {/* Customer */}
            <View className="bg-blue-50 rounded-2xl p-4 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-blue-900 text-xs font-bold">CUSTOMER</Text>
                {dispute.customerResponded && (
                  <View className="bg-green-500 px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">Responded</Text>
                  </View>
                )}
              </View>
              <Text className="text-blue-900 text-base font-bold mb-1">
                {dispute.customer.fullName}
              </Text>
              <Text className="text-blue-700 text-xs">{dispute.customer.email}</Text>
              {dispute.customer.phone && (
                <Text className="text-blue-700 text-xs">{dispute.customer.phone}</Text>
              )}
            </View>

            {/* Seller */}
            <View className="bg-purple-50 rounded-2xl p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-purple-900 text-xs font-bold">SELLER</Text>
                {dispute.sellerResponded && (
                  <View className="bg-green-500 px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">Responded</Text>
                  </View>
                )}
              </View>
              <Text className="text-purple-900 text-base font-bold mb-1">
                {dispute.seller.vendorProfile?.businessName || dispute.seller.fullName}
              </Text>
              <Text className="text-purple-700 text-xs">{dispute.seller.email}</Text>
              {dispute.seller.phone && (
                <Text className="text-purple-700 text-xs">{dispute.seller.phone}</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DisputeOrderDetailScreen;