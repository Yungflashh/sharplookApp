import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, disputeAPI, handleAPIError } from '@/api/api';

type OrderDetailRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;
type OrderDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>;

interface Order {
  _id: string;
  orderNumber: string;
  items: Array<{
    product: {
      _id: string;
      name: string;
      images: string[];
    };
    quantity: number;
    price: number;
    selectedVariant?: {
      name: string;
      option: string;
    };
  }>;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  seller: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    vendorProfile?: {
      businessName: string;
    };
  };
  totalAmount: number;
  status: string;
  paymentStatus: string;
  deliveryType: 'home_delivery' | 'pickup';
  deliveryAddress?: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    additionalInfo?: string;
  };
  trackingNumber?: string;
  courierService?: string;
  customerNotes?: string;
  sellerNotes?: string;
  customerConfirmedDelivery: boolean;
  sellerConfirmedDelivery: boolean;
  canCancel: boolean;
  dispute?: {
    _id: string;
    status: string;
    reason: string;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  createdAt: string;
}

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<OrderDetailNavigationProp>();
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId, userType } = route.params;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeCategory, setDisputeCategory] = useState('product_issue');
  const [creatingDispute, setCreatingDispute] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrderById(orderId);

      if (response.success) {
        setOrder(response.data.order);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!order) return;

    if (!disputeReason.trim() || !disputeDescription.trim()) {
      Alert.alert('Required', 'Please provide reason and description for the dispute');
      return;
    }

    try {
      setCreatingDispute(true);

      const disputeData = {
        bookingId: order._id,
        reason: disputeReason.trim(),
        description: disputeDescription.trim(),
        category: disputeCategory,
      };

      const response = await disputeAPI.createDispute(disputeData);

      if (response.success) {
        Alert.alert(
          'Dispute Created',
          'Your dispute has been submitted. Our team will review it shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowDisputeForm(false);
                fetchOrder();
              },
            },
          ]
        );
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to create dispute');
    } finally {
      setCreatingDispute(false);
    }
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#fbbf24';
      case 'processing':
        return '#3b82f6';
      case 'shipped':
        return '#a855f7';
      case 'delivered':
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4">Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">Order Details</Text>
          <Text className="text-sm text-gray-500">#{order.orderNumber}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          {}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-900 text-lg font-bold">Order Status</Text>
              <View
                className="px-4 py-2 rounded-xl"
                style={{ backgroundColor: `${getStatusColor(order.status)}20` }}
              >
                <Text
                  className="text-sm font-bold capitalize"
                  style={{ color: getStatusColor(order.status) }}
                >
                  {order.status}
                </Text>
              </View>
            </View>

            {}
            <View style={{ gap: 12 }}>
              {order.timeline.map((event, index) => (
                <View key={index} className="flex-row">
                  <View className="items-center mr-3">
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getStatusColor(event.status) }}
                    />
                    {index < order.timeline.length - 1 && (
                      <View className="w-0.5 h-full bg-gray-200 mt-1" />
                    )}
                  </View>
                  <View className="flex-1 pb-4">
                    <Text className="text-gray-900 text-sm font-semibold capitalize">
                      {event.status.replace('_', ' ')}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      {formatDate(event.timestamp)}
                    </Text>
                    {event.note && (
                      <Text className="text-gray-600 text-xs mt-1">{event.note}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <Text className="text-gray-900 text-lg font-bold mb-4">Order Items</Text>
            {order.items.map((item, index) => (
              <View
                key={index}
                className={`flex-row items-center ${
                  index < order.items.length - 1 ? 'mb-4 pb-4 border-b border-gray-100' : ''
                }`}
              >
                <Image
                  source={{ uri: item.product.images[0] }}
                  className="w-20 h-20 rounded-xl"
                  resizeMode="cover"
                />
                <View className="flex-1 ml-3">
                  <Text className="text-gray-900 text-sm font-bold mb-1">
                    {item.product.name}
                  </Text>
                  {item.selectedVariant && (
                    <Text className="text-gray-500 text-xs mb-2">
                      {item.selectedVariant.name}: {item.selectedVariant.option}
                    </Text>
                  )}
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-600 text-xs">Qty: {item.quantity}</Text>
                    <Text className="text-pink-600 text-base font-bold">
                      {formatPrice(item.price * item.quantity)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <Text className="text-gray-900 text-lg font-bold mb-4">
              {userType === 'vendor' ? 'Customer' : 'Seller'} Information
            </Text>

            {userType === 'vendor' ? (
              <View>
                <Text className="text-gray-900 text-base font-semibold mb-1">
                  {order.customer.firstName} {order.customer.lastName}
                </Text>
                <Text className="text-gray-600 text-sm mb-1">{order.customer.email}</Text>
                {order.customer.phone && (
                  <Text className="text-gray-600 text-sm">{order.customer.phone}</Text>
                )}
              </View>
            ) : (
              <View>
                <Text className="text-gray-900 text-base font-semibold mb-1">
                  {order.seller.vendorProfile?.businessName ||
                    `${order.seller.firstName} ${order.seller.lastName}`}
                </Text>
                <Text className="text-gray-600 text-sm mb-1">{order.seller.email}</Text>
                {order.seller.phone && (
                  <Text className="text-gray-600 text-sm">{order.seller.phone}</Text>
                )}
              </View>
            )}
          </View>

          {}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <Text className="text-gray-900 text-lg font-bold mb-4">Delivery Information</Text>

            <View className="mb-3">
              <Text className="text-gray-500 text-xs mb-1">Delivery Type</Text>
              <Text className="text-gray-900 text-sm font-semibold capitalize">
                {order.deliveryType.replace('_', ' ')}
              </Text>
            </View>

            {order.deliveryAddress && (
              <View className="mb-3">
                <Text className="text-gray-500 text-xs mb-1">Delivery Address</Text>
                <Text className="text-gray-900 text-sm font-semibold">
                  {order.deliveryAddress.fullName}
                </Text>
                <Text className="text-gray-600 text-sm">{order.deliveryAddress.address}</Text>
                <Text className="text-gray-600 text-sm">
                  {order.deliveryAddress.city}, {order.deliveryAddress.state}
                </Text>
                <Text className="text-gray-600 text-sm">{order.deliveryAddress.phone}</Text>
                {order.deliveryAddress.additionalInfo && (
                  <Text className="text-gray-500 text-xs mt-1">
                    {order.deliveryAddress.additionalInfo}
                  </Text>
                )}
              </View>
            )}

            {order.trackingNumber && (
              <View className="bg-purple-50 p-3 rounded-xl">
                <Text className="text-purple-900 text-xs font-semibold mb-1">
                  Tracking Number
                </Text>
                <Text className="text-purple-700 text-base font-bold">
                  {order.trackingNumber}
                </Text>
                {order.courierService && (
                  <Text className="text-purple-600 text-xs mt-1">{order.courierService}</Text>
                )}
              </View>
            )}
          </View>

          {}
          <View className="bg-white rounded-2xl p-5 mb-4">
            <Text className="text-gray-900 text-lg font-bold mb-4">Payment Summary</Text>

            <View style={{ gap: 12 }}>
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">Subtotal</Text>
                <Text className="text-gray-900 text-sm font-semibold">
                  {formatPrice(
                    order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
                  )}
                </Text>
              </View>

              <View className="flex-row justify-between pb-3 border-b border-gray-200">
                <Text className="text-gray-600 text-sm">Delivery Fee</Text>
                <Text className="text-gray-900 text-sm font-semibold">
                  {order.deliveryType === 'pickup' ? 'Free' : 'Included'}
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-gray-900 text-lg font-bold">Total</Text>
                <Text className="text-pink-600 text-2xl font-bold">
                  {formatPrice(order.totalAmount)}
                </Text>
              </View>

              <View className="bg-gray-50 p-3 rounded-xl">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 text-sm">Payment Status</Text>
                  <Text className="text-gray-900 text-sm font-bold capitalize">
                    {order.paymentStatus}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {}
          {(order.customerNotes || order.sellerNotes) && (
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-gray-900 text-lg font-bold mb-4">Notes</Text>

              {order.customerNotes && (
                <View className="mb-3">
                  <Text className="text-gray-500 text-xs mb-1">Customer Notes:</Text>
                  <Text className="text-gray-700 text-sm">{order.customerNotes}</Text>
                </View>
              )}

              {order.sellerNotes && (
                <View>
                  <Text className="text-gray-500 text-xs mb-1">Seller Notes:</Text>
                  <Text className="text-gray-700 text-sm">{order.sellerNotes}</Text>
                </View>
              )}
            </View>
          )}

          {}
          {order.dispute && (
            <View className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 mb-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="alert-circle" size={24} color="#f97316" />
                <Text className="text-orange-900 text-lg font-bold ml-2">Dispute Active</Text>
              </View>
              <Text className="text-orange-800 text-sm mb-2">
                <Text className="font-bold">Status:</Text> {order.dispute.status}
              </Text>
              <Text className="text-orange-800 text-sm">
                <Text className="font-bold">Reason:</Text> {order.dispute.reason}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('DisputeDetail', { disputeId: order.dispute!._id })}
                className="mt-3 bg-orange-500 py-3 rounded-xl"
              >
                <Text className="text-white text-center font-bold">View Dispute Details</Text>
              </TouchableOpacity>
            </View>
          )}

          {}
          {!order.dispute &&
            (order.status === 'delivered' || order.status === 'completed') &&
            !showDisputeForm && (
              <TouchableOpacity
                onPress={() => setShowDisputeForm(true)}
                className="bg-red-500 py-4 rounded-2xl mb-4"
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="alert-circle" size={20} color="#fff" />
                  <Text className="text-white text-base font-bold ml-2">Report Issue / Create Dispute</Text>
                </View>
              </TouchableOpacity>
            )}

          {}
          {showDisputeForm && (
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-gray-900 text-lg font-bold mb-4">Create Dispute</Text>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2">Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    { key: 'product_issue', label: 'Product Issue' },
                    { key: 'not_received', label: 'Not Received' },
                    { key: 'damaged', label: 'Damaged' },
                    { key: 'wrong_item', label: 'Wrong Item' },
                    { key: 'other', label: 'Other' },
                  ].map((category) => (
                    <TouchableOpacity
                      key={category.key}
                      onPress={() => setDisputeCategory(category.key)}
                      className={`px-4 py-2 rounded-xl mr-2 ${
                        disputeCategory === category.key ? 'bg-red-500' : 'bg-gray-100'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          disputeCategory === category.key ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2">Reason *</Text>
                <TextInput
                  className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                  placeholder="Brief reason for dispute"
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2">Description *</Text>
                <TextInput
                  className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                  placeholder="Detailed explanation of the issue..."
                  value={disputeDescription}
                  onChangeText={setDisputeDescription}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <View className="flex-row" style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDisputeForm(false);
                    setDisputeReason('');
                    setDisputeDescription('');
                  }}
                  className="flex-1 border-2 border-gray-300 py-3 rounded-xl"
                >
                  <Text className="text-gray-700 text-center font-bold">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCreateDispute}
                  disabled={creatingDispute}
                  className="flex-1 bg-red-500 py-3 rounded-xl"
                >
                  {creatingDispute ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-center font-bold">Submit Dispute</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderDetailScreen;