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
import { orderAPI, handleAPIError } from '@/api/api';

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


type DisputeReason = 
  | 'product_not_received'
  | 'product_damaged'
  | 'wrong_product'
  | 'product_not_as_described'
  | 'quality_issue'
  | 'delivery_issue'
  | 'payment_issue'
  | 'other';

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<OrderDetailNavigationProp>();
  const route = useRoute<OrderDetailRouteProp>();
  const { orderId, userType } = route.params;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('product_not_as_described');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [creatingDispute, setCreatingDispute] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrderById(orderId);

      
      console.log('=== Order Detail Response Debug ===');
      console.log('response.success:', response.success);
      console.log('response.data type:', typeof response.data);
      console.log('response.data keys:', Object.keys(response.data || {}));
      
      if (response.data?.data) {
        console.log('response.data.data exists');
        console.log('response.data.data keys:', Object.keys(response.data.data || {}));
        
        if (response.data.data.order) {
          console.log('response.data.data.order exists!');
          console.log('Order keys:', Object.keys(response.data.data.order || {}));
        }
      }

      if (response.success) {
        
        let orderData = null;
        
        
        if (response.data?.data?.order) {
          orderData = response.data.data.order;
          console.log('✅ Found order at: response.data.data.order');
        } else if (response.data?.order) {
          orderData = response.data.order;
          console.log('✅ Found order at: response.data.order');
        } else if (response.data?.data && !response.data.data.order) {
          orderData = response.data.data;
          console.log('✅ Found order at: response.data.data (direct)');
        }
        
        if (orderData) {
          
          const safeOrder = {
            ...orderData,
            items: Array.isArray(orderData.items) ? orderData.items : [],
            timeline: Array.isArray(orderData.timeline) 
              ? orderData.timeline 
              : Array.isArray(orderData.statusHistory)
              ? orderData.statusHistory.map((h: any) => ({
                  status: h.status,
                  timestamp: h.updatedAt || h.timestamp,
                  note: h.note
                }))
              : [],
            customer: orderData.customer || {
              _id: '',
              firstName: 'Unknown',
              lastName: 'Customer',
              email: '',
            },
            seller: orderData.seller || {
              _id: '',
              firstName: 'Unknown',
              lastName: 'Seller',
              email: '',
            },
          };
          
          console.log(`✅ Loaded order ${safeOrder.orderNumber} with ${safeOrder.items.length} items and ${safeOrder.timeline.length} timeline events`);
          setOrder(safeOrder);
        } else {
          console.error('❌ Order data not found in any expected location');
          throw new Error('Order data not found in response');
        }
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Fetch order error:', apiError);
      Alert.alert('Error', apiError.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!order) return;

    
    const trimmedDescription = disputeDescription.trim();
    
    if (!trimmedDescription) {
      Alert.alert('Required', 'Please provide a description for the dispute');
      return;
    }

    if (trimmedDescription.length < 20) {
      Alert.alert('Too Short', 'Please provide a more detailed description (at least 20 characters)');
      return;
    }

    if (trimmedDescription.length > 2000) {
      Alert.alert('Too Long', 'Description cannot exceed 2000 characters');
      return;
    }

    try {
      setCreatingDispute(true);

      const disputeData = {
        order: order._id,         
        reason: disputeReason,    
        description: trimmedDescription,
      };

      console.log('Creating dispute with data:', disputeData);

      const response = await orderAPI.createDispute(disputeData);

      if (response.success) {
        Alert.alert(
          'Dispute Created',
          'Your dispute has been submitted. Our team will review it shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowDisputeForm(false);
                setDisputeDescription('');
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

 const handleFetchDisputeStatus = async ()=>{
  if (order?.dispute){
    const response = await orderAPI.getDisputeById(order.dispute)
    const disputeorderId = response.data.dispute._id
    console.log(response.data.dispute._id);
    
    
    navigation.navigate("DisputeOrderDetail", { 
      disputeorderId,
      userType: 'customer' 
    })
  }
}
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
      case 'confirmed':
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
          <Text className="text-gray-500 text-sm mt-4 font-medium">Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return null;
  }

  
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const orderTimeline = Array.isArray(order.timeline) ? order.timeline : [];

  
  const disputeCategories = [
    { key: 'product_not_as_described' as DisputeReason, label: 'Not As Described', icon: 'document-text' },
    { key: 'product_not_received' as DisputeReason, label: 'Not Received', icon: 'close-circle' },
    { key: 'product_damaged' as DisputeReason, label: 'Damaged', icon: 'alert-circle' },
    { key: 'wrong_product' as DisputeReason, label: 'Wrong Product', icon: 'swap-horizontal' },
    { key: 'quality_issue' as DisputeReason, label: 'Quality Issue', icon: 'thumbs-down' },
    { key: 'delivery_issue' as DisputeReason, label: 'Delivery Issue', icon: 'car' },
    { key: 'payment_issue' as DisputeReason, label: 'Payment Issue', icon: 'card' },
    { key: 'other' as DisputeReason, label: 'Other', icon: 'ellipsis-horizontal' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
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
              <Text className="text-lg font-bold text-white">Order Details</Text>
              <Text className="text-sm text-white/90">#{order.orderNumber || 'N/A'}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {}
          <View className="bg-white rounded-3xl p-5 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-gray-900 text-lg font-bold">Order Status</Text>
              <View
                className="px-4 py-2 rounded-full"
                style={{ backgroundColor: `${getStatusColor(order.status)}15` }}
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
            {orderTimeline.length > 0 && (
              <View style={{ gap: 16 }}>
                {orderTimeline.map((event, index) => (
                  <View key={index} className="flex-row">
                    <View className="items-center mr-4">
                      <View
                        className="w-4 h-4 rounded-full"
                        style={{ 
                          backgroundColor: getStatusColor(event.status),
                          shadowColor: getStatusColor(event.status),
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.4,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      />
                      {index < orderTimeline.length - 1 && (
                        <View 
                          className="w-0.5 flex-1 mt-2"
                          style={{ backgroundColor: `${getStatusColor(event.status)}30` }}
                        />
                      )}
                    </View>
                    <View className="flex-1 pb-2">
                      <Text className="text-gray-900 text-sm font-bold capitalize mb-1">
                        {event.status.replace('_', ' ')}
                      </Text>
                      <Text className="text-gray-500 text-xs">
                        {formatDate(event.timestamp)}
                      </Text>
                      {event.note && (
                        <Text className="text-gray-600 text-xs mt-2 bg-gray-50 p-2 rounded-lg">
                          {event.note}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {}
          {orderItems.length > 0 && (
            <View className="bg-white rounded-3xl p-5 mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text className="text-gray-900 text-lg font-bold mb-4">Order Items</Text>
              {orderItems.map((item, index) => (
                <View
                  key={index}
                  className={`${
                    index < orderItems.length - 1 ? 'mb-4 pb-4 border-b border-gray-100' : ''
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className="relative">
                      <Image
                        source={{ 
                          uri: item?.product?.images?.[0] || 'https://via.placeholder.com/150' 
                        }}
                        className="w-24 h-24 rounded-2xl"
                        resizeMode="cover"
                      />
                      <View className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-pink-500 items-center justify-center"
                        style={{
                          shadowColor: '#eb278d',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.4,
                          shadowRadius: 4,
                          elevation: 4,
                        }}
                      >
                        <Text className="text-white text-xs font-bold">{item?.quantity || 0}</Text>
                      </View>
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className="text-gray-900 text-base font-bold mb-2">
                        {item?.product?.name || 'Product'}
                      </Text>
                      {item?.selectedVariant && (
                        <View className="bg-gray-100 px-3 py-1.5 rounded-full self-start mb-2">
                          <Text className="text-gray-600 text-xs font-medium">
                            {item.selectedVariant.name}: {item.selectedVariant.option}
                          </Text>
                        </View>
                      )}
                      <Text className="text-pink-600 text-lg font-bold">
                        {formatPrice((item?.price || 0) * (item?.quantity || 0))}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {}
          <View className="bg-white rounded-3xl p-5 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                <Ionicons name="person" size={20} color="#eb278d" />
              </View>
              <Text className="text-gray-900 text-lg font-bold">
                {userType === 'vendor' ? 'Customer' : 'Seller'} Information
              </Text>
            </View>

            {userType === 'vendor' ? (
              <View className="bg-gray-50 rounded-2xl p-4">
                <Text className="text-gray-900 text-base font-bold mb-2">
                  {order.customer?.firstName || 'Unknown'} {order.customer?.lastName || 'Customer'}
                </Text>
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="mail" size={14} color="#6b7280" />
                  <Text className="text-gray-600 text-sm ml-2">{order.customer?.email || 'N/A'}</Text>
                </View>
                {order.customer?.phone && (
                  <View className="flex-row items-center">
                    <Ionicons name="call" size={14} color="#6b7280" />
                    <Text className="text-gray-600 text-sm ml-2">{order.customer.phone}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="bg-gray-50 rounded-2xl p-4">
                <Text className="text-gray-900 text-base font-bold mb-2">
                  {order.seller?.vendorProfile?.businessName ||
                    `${order.seller?.firstName || 'Unknown'} ${order.seller?.lastName || 'Seller'}`}
                </Text>
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="mail" size={14} color="#6b7280" />
                  <Text className="text-gray-600 text-sm ml-2">{order.seller?.email || 'N/A'}</Text>
                </View>
                {order.seller?.phone && (
                  <View className="flex-row items-center">
                    <Ionicons name="call" size={14} color="#6b7280" />
                    <Text className="text-gray-600 text-sm ml-2">{order.seller.phone}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {}
          <View className="bg-white rounded-3xl p-5 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="location" size={20} color="#3b82f6" />
              </View>
              <Text className="text-gray-900 text-lg font-bold">Delivery Information</Text>
            </View>

            <View className="bg-gray-50 rounded-2xl p-4 mb-3">
              <Text className="text-gray-500 text-xs font-semibold mb-1">Delivery Type</Text>
              <Text className="text-gray-900 text-base font-bold capitalize">
                {order.deliveryType?.replace('_', ' ') || 'N/A'}
              </Text>
            </View>

            {order.deliveryAddress && (
              <View className="bg-gray-50 rounded-2xl p-4 mb-3">
                <Text className="text-gray-500 text-xs font-semibold mb-2">Delivery Address</Text>
                <Text className="text-gray-900 text-base font-bold mb-2">
                  {order.deliveryAddress.fullName}
                </Text>
                <Text className="text-gray-700 text-sm mb-1">{order.deliveryAddress.address}</Text>
                <Text className="text-gray-700 text-sm mb-1">
                  {order.deliveryAddress.city}, {order.deliveryAddress.state}
                </Text>
                <View className="flex-row items-center mt-2">
                  <Ionicons name="call" size={14} color="#6b7280" />
                  <Text className="text-gray-600 text-sm ml-2">{order.deliveryAddress.phone}</Text>
                </View>
                {order.deliveryAddress.additionalInfo && (
                  <Text className="text-gray-500 text-xs mt-2 italic">
                    {order.deliveryAddress.additionalInfo}
                  </Text>
                )}
              </View>
            )}

            {order.trackingNumber && (
              <LinearGradient
                colors={['#a855f7', '#c084fc']}
                className="p-4 rounded-2xl"
              >
                <View className="flex-row items-center mb-2">
                  <Ionicons name="cube" size={18} color="#fff" />
                  <Text className="text-white text-xs font-bold ml-2">TRACKING NUMBER</Text>
                </View>
                <Text className="text-white text-xl font-bold mb-1">
                  {order.trackingNumber}
                </Text>
                {order.courierService && (
                  <Text className="text-white/90 text-sm">{order.courierService}</Text>
                )}
              </LinearGradient>
            )}
          </View>

          {}
          <View className="bg-white rounded-3xl p-5 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                <Ionicons name="wallet" size={20} color="#10b981" />
              </View>
              <Text className="text-gray-900 text-lg font-bold">Payment Summary</Text>
            </View>

            <View style={{ gap: 14 }}>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600 text-sm">Subtotal</Text>
                <Text className="text-gray-900 text-base font-bold">
                  {formatPrice(
                    orderItems.reduce((sum, item) => sum + (item?.price || 0) * (item?.quantity || 0), 0)
                  )}
                </Text>
              </View>

              <View className="flex-row justify-between items-center pb-4 border-b border-gray-200">
                <Text className="text-gray-600 text-sm">Delivery Fee</Text>
                <Text className="text-gray-900 text-base font-bold">
                  {order.deliveryType === 'pickup' ? 'Free' : 'Included'}
                </Text>
              </View>

              <View className="flex-row justify-between items-center bg-pink-50 -mx-5 -mb-5 px-5 py-4 rounded-b-3xl">
                <Text className="text-gray-900 text-lg font-bold">Total Amount</Text>
                <Text className="text-pink-600 text-2xl font-bold">
                  {formatPrice(order.totalAmount || 0)}
                </Text>
              </View>

              <View className="bg-gray-100 p-3 rounded-2xl -mb-5 -mx-5 mx-5 mt-4">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600 text-sm font-medium">Payment Status</Text>
                  <View className="bg-white px-3 py-1.5 rounded-full">
                    <Text className="text-gray-900 text-sm font-bold capitalize">
                      {order.paymentStatus || 'pending'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {}
          {(order.customerNotes || order.sellerNotes) && (
            <View className="bg-white rounded-3xl p-5 mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-full bg-yellow-100 items-center justify-center mr-3">
                  <Ionicons name="document-text" size={20} color="#f59e0b" />
                </View>
                <Text className="text-gray-900 text-lg font-bold">Notes</Text>
              </View>

              {order.customerNotes && (
                <View className="bg-blue-50 p-4 rounded-2xl mb-3">
                  <Text className="text-blue-900 text-xs font-bold mb-2">Customer Notes</Text>
                  <Text className="text-blue-800 text-sm leading-5">{order.customerNotes}</Text>
                </View>
              )}

              {order.sellerNotes && (
                <View className="bg-purple-50 p-4 rounded-2xl">
                  <Text className="text-purple-900 text-xs font-bold mb-2">Seller Notes</Text>
                  <Text className="text-purple-800 text-sm leading-5">{order.sellerNotes}</Text>
                </View>
              )}
            </View>
          )}

          {}
          {order.dispute && (
            <View className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-3xl p-5 mb-4"
              style={{
                shadowColor: '#f97316',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-full bg-orange-500 items-center justify-center mr-3">
                  <Ionicons name="alert-circle" size={26} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-orange-900 text-lg font-bold">Dispute Active</Text>
                  <Text className="text-orange-700 text-xs">Action required</Text>
                </View>
              </View>
              
              <View className="bg-white/60 rounded-2xl p-3 mb-3">
                <Text className="text-orange-900 text-sm mb-2">
                  <Text className="font-bold">Status: </Text>
                  <Text className="capitalize">{order.dispute.status}</Text>
                </Text>
                <Text className="text-orange-900 text-sm">
                  <Text className="font-bold">Reason: </Text>
                  {order.dispute.reason}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleFetchDisputeStatus()
                }
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#f97316', '#ea580c']}
                  className="py-4 rounded-2xl"
                  style={{
                    shadowColor: '#f97316',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Text className="text-white text-center font-bold text-base">View Dispute Details</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {}
          {!order.dispute &&
            (order.status === 'delivered' || order.status === 'completed') &&
            !showDisputeForm && (
              <TouchableOpacity
                onPress={() => setShowDisputeForm(true)}
                activeOpacity={0.8}
                className="mb-4"
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  className="py-5 rounded-2xl"
                  style={{
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="alert-circle" size={22} color="#fff" />
                    <Text className="text-white text-base font-bold ml-2">Report Issue / Create Dispute</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

          {}
          {showDisputeForm && (
            <View className="bg-white rounded-3xl p-5 mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center mb-5">
                <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
                  <Ionicons name="warning" size={20} color="#ef4444" />
                </View>
                <Text className="text-gray-900 text-lg font-bold">Create Dispute</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-bold mb-3">Select Issue Type *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                  {disputeCategories.map((category) => (
                    <TouchableOpacity
                      key={category.key}
                      onPress={() => setDisputeReason(category.key)}
                      activeOpacity={0.7}
                      className="mr-2"
                    >
                      <LinearGradient
                        colors={
                          disputeReason === category.key
                            ? ['#ef4444', '#dc2626']
                            : ['#f3f4f6', '#e5e7eb']
                        }
                        className="px-4 py-3 rounded-2xl flex-row items-center"
                      >
                        <Ionicons 
                          name={category.icon as any} 
                          size={16} 
                          color={disputeReason === category.key ? '#fff' : '#6b7280'} 
                        />
                        <Text
                          className={`text-sm font-bold ml-2 ${
                            disputeReason === category.key ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {category.label}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View className="mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-700 text-sm font-bold">Description *</Text>
                  <Text className={`text-xs ${
                    disputeDescription.length > 2000 
                      ? 'text-red-500 font-bold' 
                      : disputeDescription.length > 1800 
                      ? 'text-orange-500' 
                      : 'text-gray-400'
                  }`}>
                    {disputeDescription.length}/2000
                  </Text>
                </View>
                <TextInput
                  className="bg-gray-50 px-4 py-4 rounded-2xl text-gray-900 border border-gray-200"
                  placeholder="Provide detailed explanation (minimum 20 characters)..."
                  placeholderTextColor="#9ca3af"
                  value={disputeDescription}
                  onChangeText={setDisputeDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={2000}
                  style={{ minHeight: 140 }}
                />
                {disputeDescription.length > 0 && disputeDescription.length < 20 && (
                  <Text className="text-orange-500 text-xs mt-2">
                    Please provide at least {20 - disputeDescription.length} more characters
                  </Text>
                )}
              </View>

              <View className="flex-row" style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDisputeForm(false);
                    setDisputeDescription('');
                  }}
                  className="flex-1 border-2 border-gray-300 py-4 rounded-2xl"
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-700 text-center font-bold text-base">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCreateDispute}
                  disabled={creatingDispute || disputeDescription.trim().length < 20}
                  className="flex-1"
                  activeOpacity={0.8}
                  style={{ 
                    opacity: (creatingDispute || disputeDescription.trim().length < 20) ? 0.5 : 1 
                  }}
                >
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    className="py-4 rounded-2xl"
                    style={{
                      shadowColor: '#ef4444',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                  >
                    {creatingDispute ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white text-center font-bold text-base">Submit Dispute</Text>
                    )}
                  </LinearGradient>
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