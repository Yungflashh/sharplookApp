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

type VendorProductOrdersNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'VendorProductOrders'
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
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
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
  customerNotes?: string;
  sellerConfirmedDelivery: boolean;
  customerConfirmedDelivery: boolean;
  createdAt: string;
}

type FilterStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed';

const VendorProductOrdersScreen: React.FC = () => {
  const navigation = useNavigation<VendorProductOrdersNavigationProp>();

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
      const response = await orderAPI.getMySellerOrders({
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
          `${order.customer.firstName} ${order.customer.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  }, [orders, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string, note?: string) => {
    try {
      setActionLoading(orderId);
      await orderAPI.updateOrderStatus(orderId, newStatus, note);
      Alert.alert('Success', 'Order status updated successfully');
      fetchOrders();
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to update order status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddTracking = (orderId: string) => {
    Alert.prompt(
      'Add Tracking Number',
      'Enter tracking number and courier service (separated by comma)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (value) => {
            const parts = value?.split(',') || [];
            const trackingNumber = parts[0]?.trim();
            const courierService = parts[1]?.trim() || 'Local Courier';

            if (!trackingNumber) {
              Alert.alert('Invalid', 'Please enter tracking number');
              return;
            }

            try {
              setActionLoading(orderId);
              await orderAPI.addTrackingInfo(orderId, trackingNumber, courierService);
              Alert.alert('Success', 'Tracking information added');
              fetchOrders();
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message || 'Failed to add tracking');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const handleConfirmDelivery = (orderId: string) => {
    Alert.alert(
      'Confirm Delivery',
      'Have you delivered this order to the customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setActionLoading(orderId);
              await orderAPI.confirmDelivery(orderId, 'seller');
              Alert.alert('Success', 'Delivery confirmed');
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

    if (order.status === 'pending') {
      return (
        <TouchableOpacity
          onPress={() => handleUpdateStatus(order._id, 'processing')}
          disabled={isLoading}
          className="bg-blue-500 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-sm">Accept & Process</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (order.status === 'processing' && order.deliveryType === 'home_delivery') {
      return (
        <View style={{ gap: 8 }}>
          {!order.trackingNumber && (
            <TouchableOpacity
              onPress={() => handleAddTracking(order._id)}
              disabled={isLoading}
              className="bg-purple-500 py-3 rounded-xl"
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-center font-bold text-sm">Add Tracking</Text>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={() => handleUpdateStatus(order._id, 'shipped')}
            disabled={isLoading}
            className="bg-green-500 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-center font-bold text-sm">Mark as Shipped</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (order.status === 'processing' && order.deliveryType === 'pickup') {
      return (
        <TouchableOpacity
          onPress={() => handleUpdateStatus(order._id, 'delivered')}
          disabled={isLoading}
          className="bg-green-500 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-sm">Mark as Ready for Pickup</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (order.status === 'shipped') {
      return (
        <TouchableOpacity
          onPress={() => handleUpdateStatus(order._id, 'delivered')}
          disabled={isLoading}
          className="bg-green-500 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-sm">Mark as Delivered</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (order.status === 'delivered' && !order.sellerConfirmedDelivery) {
      return (
        <TouchableOpacity
          onPress={() => handleConfirmDelivery(order._id)}
          disabled={isLoading}
          className="bg-green-500 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold text-sm">Confirm Delivery</Text>
          )}
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderOrderCard = (order: Order) => (
    <TouchableOpacity
      key={order._id}
      onPress={() => navigation.navigate('OrderDetail', { orderId: order._id, userType: 'vendor' })}
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
      {}
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-bold text-gray-900 mb-1">Order #{order.orderNumber}</Text>
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-pink-100 items-center justify-center mr-2">
              <Ionicons name="person" size={16} color="#eb278d" />
            </View>
            <Text className="text-sm text-gray-600 font-medium">
              {order.customer.firstName} {order.customer.lastName}
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

      {}
      <View className="bg-gray-50 rounded-2xl p-4 mb-4">
        {order.items.map((item, index) => (
          <View
            key={index}
            className={`flex-row items-center ${index < order.items.length - 1 ? 'mb-3 pb-3 border-b border-gray-200' : ''}`}
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

      {}
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
            <Text className="text-xs text-gray-500 mb-0.5">Delivery Type</Text>
            <Text className="text-sm font-semibold text-gray-900 capitalize">
              {order.deliveryType.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {order.deliveryAddress && (
          <View className="flex-row items-start">
            <View className="w-9 h-9 rounded-xl bg-purple-100 items-center justify-center mr-3">
              <Ionicons name="location" size={18} color="#a855f7" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-0.5">Delivery Address</Text>
              <Text className="text-sm font-semibold text-gray-900">
                {order.deliveryAddress.address}, {order.deliveryAddress.city}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">
                {order.deliveryAddress.phone}
              </Text>
            </View>
          </View>
        )}

        {order.trackingNumber && (
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-xl bg-orange-100 items-center justify-center mr-3">
              <Ionicons name="locate" size={18} color="#f97316" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-0.5">Tracking</Text>
              <Text className="text-sm font-bold text-gray-900">{order.trackingNumber}</Text>
              {order.courierService && (
                <Text className="text-xs text-gray-500">{order.courierService}</Text>
              )}
            </View>
          </View>
        )}

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
                : 'bg-yellow-100'
            }`}
          >
            <Text
              className={`text-xs font-bold capitalize ${
                order.paymentStatus === 'escrowed'
                  ? 'text-blue-700'
                  : order.paymentStatus === 'released'
                  ? 'text-green-700'
                  : 'text-yellow-700'
              }`}
            >
              {order.paymentStatus}
            </Text>
          </View>
        </View>

        {order.customerNotes && (
          <View className="pt-3 border-t border-gray-200">
            <Text className="text-xs text-gray-500 mb-1">Customer Notes:</Text>
            <Text className="text-sm text-gray-700">{order.customerNotes}</Text>
          </View>
        )}
      </View>

      {}
      {order.status === 'delivered' && (
        <View className="bg-blue-50 rounded-2xl p-3 mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name={order.sellerConfirmedDelivery ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={order.sellerConfirmedDelivery ? '#10b981' : '#9ca3af'}
              />
              <Text className="text-sm text-gray-700 ml-2">You confirmed</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name={order.customerConfirmedDelivery ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={order.customerConfirmedDelivery ? '#10b981' : '#9ca3af'}
              />
              <Text className="text-sm text-gray-700 ml-2">Customer confirmed</Text>
            </View>
          </View>
        </View>
      )}

      {}
      {getActionButtons(order)}

      {}
      <TouchableOpacity
        onPress={() => navigation.navigate('OrderDetail', { orderId: order._id, userType: 'vendor' })}
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
      <Text className="text-gray-600 text-center text-sm">
        {activeFilter !== 'all'
          ? `You don't have any ${activeFilter} orders`
          : "You don't have any product orders yet. They'll appear here when customers buy your products."}
      </Text>
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
    };
  };

  const counts = getOrderCounts();

  const filters: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'pending', label: 'Pending', count: counts.pending },
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
      {}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pb-4"
      >
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-white text-2xl font-bold mb-1">Product Orders</Text>
              <Text className="text-white/80 text-sm">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </Text>
            </View>
          </View>

          {}
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

          {}
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

      {}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" />
        }
      >
        <View className="px-5 py-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map(renderOrderCard)
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VendorProductOrdersScreen;