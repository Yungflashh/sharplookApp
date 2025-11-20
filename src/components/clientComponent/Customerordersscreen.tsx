import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { orderAPI, handleAPIError } from '@/api/api';

type CustomerOrdersNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CustomerOrders'
>;

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
  seller: {
    _id: string;
    firstName: string;
    lastName: string;
    vendorProfile?: {
      businessName: string;
    };
  };
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed' | 'escrowed' | 'released';
  deliveryType: 'home_delivery' | 'pickup';
  deliveryAddress?: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
  };
  trackingNumber?: string;
  courierService?: string;
  customerConfirmedDelivery: boolean;
  sellerConfirmedDelivery: boolean;
  canCancel: boolean;
  createdAt: string;
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

const CustomerOrdersScreen: React.FC = () => {
  const navigation = useNavigation<CustomerOrdersNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getMyOrders({
        page: 1,
        limit: 100,
      });

      if (response.success) {
        const orderList = response.data.orders || [];
        setOrders(orderList);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Fetch orders error:', apiError);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  React.useEffect(() => {
    let filtered = orders;

    if (activeFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === activeFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.items.some((item) =>
            item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    setFilteredOrders(filtered);
  }, [orders, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  const handleCancelOrder = (orderId: string) => {
    Alert.prompt(
      'Cancel Order',
      'Please provide a reason for cancellation:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason || reason.trim().length === 0) {
              Alert.alert('Required', 'Please provide a cancellation reason');
              return;
            }

            try {
              setActionLoading(orderId);
              await orderAPI.cancelOrder(orderId, reason);
              Alert.alert('Success', 'Order cancelled successfully. Refund will be processed.');
              fetchOrders();
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message || 'Failed to cancel order');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleConfirmDelivery = (orderId: string) => {
    Alert.alert(
      'Confirm Delivery',
      'Have you received this order in good condition?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: async () => {
            try {
              setActionLoading(orderId);
              await orderAPI.confirmDelivery(orderId, 'customer');
              Alert.alert(
                'Confirmed',
                'Delivery confirmed. Payment will be released to the seller.'
              );
              fetchOrders();
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message || 'Failed to confirm delivery');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
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
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time';
      case 'processing':
        return 'hourglass';
      case 'shipped':
        return 'airplane';
      case 'delivered':
        return 'checkmark-done';
      case 'completed':
        return 'checkmark-done-circle';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getActionButtons = (order: Order) => {
    const isLoading = actionLoading === order._id;

    if (order.status === 'delivered' && !order.customerConfirmedDelivery) {
      return (
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => handleConfirmDelivery(order._id)}
            disabled={isLoading}
            className="bg-green-500 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-center font-bold text-sm">Confirm Received</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('OrderDetail', { orderId: order._id, userType: 'customer' })
            }
            className="border-2 border-pink-500 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-pink-600 text-center font-bold text-sm">Report Issue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (order.canCancel) {
      return (
        <TouchableOpacity
          onPress={() => handleCancelOrder(order._id)}
          disabled={isLoading}
          className="border-2 border-red-500 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text className="text-red-600 text-center font-bold text-sm">Cancel Order</Text>
          )}
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderOrderCard = (order: Order) => (
    <TouchableOpacity
      key={order._id}
      onPress={() => navigation.navigate('OrderDetail', { orderId: order._id, userType: 'customer' })}
      activeOpacity={0.95}
      className="bg-white rounded-3xl p-5 mb-4"
      style={{
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          },
          android: { elevation: 4 },
        }),
      }}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-bold text-gray-900 mb-1">Order #{order.orderNumber}</Text>
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-pink-100 items-center justify-center mr-2">
              <Ionicons name="storefront" size={16} color="#eb278d" />
            </View>
            <Text className="text-sm text-gray-600 font-medium">
              {order.seller.vendorProfile?.businessName ||
                `${order.seller.firstName} ${order.seller.lastName}`}
            </Text>
          </View>
        </View>

        <View className={`px-3 py-1.5 rounded-full border-2 ${getStatusColor(order.status)}`}>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Ionicons
              name={getStatusIcon(order.status) as any}
              size={14}
              color={
                order.status === 'completed' || order.status === 'delivered'
                  ? '#15803d'
                  : order.status === 'cancelled'
                  ? '#dc2626'
                  : order.status === 'pending'
                  ? '#ca8a04'
                  : '#2563eb'
              }
            />
            <Text className="text-xs font-bold capitalize">{order.status}</Text>
          </View>
        </View>
      </View>

      {/* Items */}
      <View className="bg-gray-50 rounded-2xl p-4 mb-4">
        {order.items.map((item, index) => (
          <View
            key={index}
            className={`flex-row items-center ${
              index < order.items.length - 1 ? 'mb-3 pb-3 border-b border-gray-200' : ''
            }`}
          >
            <Image
              source={{ uri: item.product.images[0] }}
              className="w-16 h-16 rounded-xl"
              resizeMode="cover"
            />
            <View className="flex-1 ml-3">
              <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                {item.product.name}
              </Text>
              {item.selectedVariant && (
                <Text className="text-xs text-gray-500 mt-1">
                  {item.selectedVariant.name}: {item.selectedVariant.option}
                </Text>
              )}
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-xs text-gray-500">Qty: {item.quantity}</Text>
                <Text className="text-sm font-bold text-pink-600">
                  {formatPrice(item.price * item.quantity)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Tracking Info */}
      {order.trackingNumber && (
        <View className="bg-purple-50 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center">
            <Ionicons name="locate" size={20} color="#a855f7" />
            <View className="flex-1 ml-3">
              <Text className="text-purple-900 text-xs font-semibold mb-1">Tracking Number</Text>
              <Text className="text-purple-700 text-sm font-bold">{order.trackingNumber}</Text>
              {order.courierService && (
                <Text className="text-purple-600 text-xs mt-1">{order.courierService}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Details */}
      <View className="bg-gray-50 rounded-2xl p-4 mb-4" style={{ gap: 12 }}>
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center mr-3">
            <Ionicons name="calendar" size={18} color="#3b82f6" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-0.5">Order Date</Text>
            <Text className="text-sm font-semibold text-gray-900">{formatDate(order.createdAt)}</Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-xl bg-green-100 items-center justify-center mr-3">
            <Ionicons
              name={order.deliveryType === 'home_delivery' ? 'home' : 'storefront'}
              size={18}
              color="#10b981"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-0.5">Delivery</Text>
            <Text className="text-sm font-semibold text-gray-900 capitalize">
              {order.deliveryType.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-9 h-9 rounded-xl bg-pink-100 items-center justify-center mr-3">
              <Ionicons name="cash" size={18} color="#eb278d" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-0.5">Total Amount</Text>
              <Text className="text-lg font-bold text-pink-600">
                {formatPrice(order.totalAmount)}
              </Text>
            </View>
          </View>

          <View
            className={`px-3 py-1.5 rounded-xl ${
              order.paymentStatus === 'escrowed'
                ? 'bg-blue-100'
                : order.paymentStatus === 'released'
                ? 'bg-green-100'
                : order.paymentStatus === 'refunded'
                ? 'bg-orange-100'
                : 'bg-yellow-100'
            }`}
          >
            <Text
              className={`text-xs font-bold capitalize ${
                order.paymentStatus === 'escrowed'
                  ? 'text-blue-700'
                  : order.paymentStatus === 'released'
                  ? 'text-green-700'
                  : order.paymentStatus === 'refunded'
                  ? 'text-orange-700'
                  : 'text-yellow-700'
              }`}
            >
              {order.paymentStatus}
            </Text>
          </View>
        </View>
      </View>

      {/* Delivery Confirmation Status */}
      {order.status === 'delivered' && (
        <View className="bg-blue-50 rounded-2xl p-3 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name={order.customerConfirmedDelivery ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={order.customerConfirmedDelivery ? '#10b981' : '#9ca3af'}
              />
              <Text className="text-sm text-gray-700 ml-2">You confirmed</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name={order.sellerConfirmedDelivery ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={order.sellerConfirmedDelivery ? '#10b981' : '#9ca3af'}
              />
              <Text className="text-sm text-gray-700 ml-2">Seller confirmed</Text>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {getActionButtons(order)}

      {/* View Details Link */}
      <TouchableOpacity
        onPress={() => navigation.navigate('OrderDetail', { orderId: order._id, userType: 'customer' })}
        className="mt-3 pt-4 border-t border-gray-100"
      >
        <View className="flex-row items-center justify-center">
          <Text className="text-sm text-pink-600 font-bold mr-1">View Full Details</Text>
          <Ionicons name="chevron-forward" size={18} color="#eb278d" />
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20 px-8">
      <LinearGradient
        colors={['#fce7f3', '#fdf2f8']}
        className="w-32 h-32 rounded-full items-center justify-center mb-6"
      >
        <Ionicons name="receipt-outline" size={64} color="#eb278d" />
      </LinearGradient>
      <Text className="text-xl font-bold text-gray-900 mb-2 text-center">No Orders Yet</Text>
      <Text className="text-gray-600 text-center text-sm mb-6">
        {activeFilter !== 'all'
          ? `You don't have any ${activeFilter} orders`
          : "You haven't placed any orders yet. Start shopping to see your orders here."}
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Marketplace')}
        className="bg-pink-500 px-8 py-4 rounded-2xl"
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text className="text-white text-base font-bold">Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  const getOrderCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      processing: orders.filter((o) => o.status === 'processing').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };
  };

  const counts = getOrderCounts();

  const filters: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'processing', label: 'Processing', count: counts.processing },
    { key: 'shipped', label: 'Shipped', count: counts.shipped },
    { key: 'delivered', label: 'Delivered', count: counts.delivered },
    { key: 'completed', label: 'Completed', count: counts.completed },
  ];

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4">Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pb-4"
      >
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-white text-2xl font-bold mb-1">My Orders</Text>
              <Text className="text-white/80 text-sm">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-white/20 rounded-2xl px-4 py-3 mb-4">
            <Ionicons name="search" size={20} color="#fff" />
            <TextInput
              className="flex-1 ml-2 text-base text-white"
              placeholder="Search orders..."
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                className={`px-5 py-2.5 rounded-full ${
                  activeFilter === filter.key ? 'bg-white' : 'bg-white/20'
                }`}
              >
                <Text
                  className={`font-bold text-sm ${
                    activeFilter === filter.key ? 'text-pink-600' : 'text-white'
                  }`}
                >
                  {filter.label}
                  {filter.count > 0 && ` (${filter.count})`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Orders List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" />
        }
      >
        <View className="px-5 py-4">
          {filteredOrders.length > 0 ? filteredOrders.map(renderOrderCard) : renderEmptyState()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CustomerOrdersScreen;