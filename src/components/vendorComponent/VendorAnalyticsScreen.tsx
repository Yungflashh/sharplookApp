import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { analyticsAPI, handleAPIError } from '@/api/api';

type AnalyticsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface QuickStats {
  walletBalance: number;
  totalBookings: number;
  totalOrders: number;
  totalProducts: number;
  totalServices: number;
  totalReviews: number;
  averageRating: number;
}

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalBookings: number;
    totalProducts: number;
    totalServices: number;
    averageRating: number;
    totalReviews: number;
    completedBookings: number;
    completedOrders: number;
    pendingOrders: number;
    pendingBookings: number;
    activeProducts: number;
    activeServices: number;
  };
  revenue: {
    total: number;
    fromBookings: number;
    fromOrders: number;
    pending: number;
    inEscrow: number;
    released: number;
    byPeriod: Array<{
      date: string;
      revenue: number;
      bookings: number;
      orders: number;
    }>;
  };
  bookings: {
    total: number;
    completed: number;
    pending: number;
    accepted: number;
    inProgress: number;
    cancelled: number;
    completionRate: number;
    cancellationRate: number;
    byStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    topServices: Array<{
      service: any;
      bookings: number;
      revenue: number;
    }>;
  };
  orders: {
    total: number;
    completed: number;
    pending: number;
    averageOrderValue: number;
    topProducts: Array<{
      product: any;
      orders: number;
      revenue: number;
      quantity: number;
    }>;
  };
  reviews: {
    total: number;
    averageRating: number;
    distribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
    positivePercentage: number;
    negativePercentage: number;
  };
  customers: {
    total: number;
    returning: number;
    new: number;
    returningRate: number;
  };
  performance: {
    responseTime: number;
    acceptanceRate: number;
    completionRate: number;
    cancellationRate: number;
    onTimeDeliveryRate: number;
    customerSatisfactionScore: number;
  };
}

type TimePeriod = '7days' | '30days' | '90days' | 'all';

const VendorAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<AnalyticsNavigationProp>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30days');
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'performance'>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const getDateRange = (period: TimePeriod) => {
    const endDate = new Date().toISOString();
    let startDate: string;

    switch (period) {
      case '7days':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '90days':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'all':
        startDate = new Date(2020, 0, 1).toISOString();
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    return { startDate, endDate };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      
      const statsResponse = await analyticsAPI.getVendorQuickStats();
      console.log('Quick stats response:', statsResponse);
      
      if (statsResponse.success) {
        setQuickStats(statsResponse.data);
      }

      
      const { startDate, endDate } = getDateRange(selectedPeriod);
      const analyticsResponse = await analyticsAPI.getVendorAnalytics({
        startDate,
        endDate,
      });
      
      console.log('Analytics response:', analyticsResponse);

      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Analytics error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const renderPeriodSelector = () => (
    <View className="flex-row px-5 py-3 gap-2">
      {[
        { label: '7D', value: '7days' as TimePeriod },
        { label: '30D', value: '30days' as TimePeriod },
        { label: '90D', value: '90days' as TimePeriod },
        { label: 'All', value: 'all' as TimePeriod },
      ].map((period) => (
        <TouchableOpacity
          key={period.value}
          onPress={() => setSelectedPeriod(period.value)}
          className={`flex-1 py-2 rounded-xl ${
            selectedPeriod === period.value ? 'bg-pink-600' : 'bg-white'
          }`}
          style={{
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
              },
              android: { elevation: 2 },
            }),
          }}
          activeOpacity={0.7}
        >
          <Text
            className={`text-center font-bold text-sm ${
              selectedPeriod === period.value ? 'text-white' : 'text-gray-700'
            }`}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabSelector = () => (
    <View className="flex-row px-5 py-3 gap-3">
      {[
        { label: 'Overview', value: 'overview' as const, icon: 'analytics' },
        { label: 'Revenue', value: 'revenue' as const, icon: 'cash' },
        { label: 'Performance', value: 'performance' as const, icon: 'trending-up' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.value}
          onPress={() => setActiveTab(tab.value)}
          className={`flex-1 py-3 rounded-2xl flex-row items-center justify-center ${
            activeTab === tab.value ? 'bg-pink-600' : 'bg-white'
          }`}
          style={{
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
              },
              android: { elevation: 3 },
            }),
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab.icon as any}
            size={18}
            color={activeTab === tab.value ? '#fff' : '#6b7280'}
          />
          <Text
            className={`ml-2 font-bold text-sm ${
              activeTab === tab.value ? 'text-white' : 'text-gray-700'
            }`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuickStatsCards = () => {
    if (!quickStats) return null;

    const stats = [
      {
        icon: 'wallet',
        label: 'Wallet Balance',
        value: formatPrice(quickStats.walletBalance),
        color: '#10b981',
        bgColor: '#d1fae5',
      },
      {
        icon: 'calendar',
        label: 'Total Bookings',
        value: quickStats.totalBookings.toString(),
        color: '#3b82f6',
        bgColor: '#dbeafe',
      },
      {
        icon: 'cart',
        label: 'Total Orders',
        value: quickStats.totalOrders.toString(),
        color: '#8b5cf6',
        bgColor: '#ede9fe',
      },
      {
        icon: 'star',
        label: 'Average Rating',
        value: quickStats.averageRating.toFixed(1),
        color: '#f59e0b',
        bgColor: '#fef3c7',
      },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-5"
        contentContainerStyle={{ gap: 12 }}
      >
        {stats.map((stat, index) => (
          <View
            key={index}
            className="bg-white rounded-2xl p-4 w-36"
            style={{
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                },
                android: { elevation: 3 },
              }),
            }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mb-3"
              style={{ backgroundColor: stat.bgColor }}
            >
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text className="text-xs text-gray-600 mb-1">{stat.label}</Text>
            <Text className="text-xl font-bold text-gray-900">{stat.value}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderOverviewTab = () => {
    if (!analytics) return null;

    return (
      <View className="px-5" style={{ gap: 16 }}>
        {}
        <View
          className="bg-white rounded-3xl p-5"
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
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Revenue Breakdown</Text>
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-green-700 font-bold text-xs">
                {formatPrice(analytics.revenue.total)}
              </Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <View className="flex-row items-center justify-between p-3 bg-blue-50 rounded-xl">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="calendar" size={20} color="#3b82f6" />
                </View>
                <Text className="font-medium text-gray-700">From Bookings</Text>
              </View>
              <Text className="font-bold text-gray-900">
                {formatPrice(analytics.revenue.fromBookings)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between p-3 bg-purple-50 rounded-xl">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="cart" size={20} color="#8b5cf6" />
                </View>
                <Text className="font-medium text-gray-700">From Orders</Text>
              </View>
              <Text className="font-bold text-gray-900">
                {formatPrice(analytics.revenue.fromOrders)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between p-3 bg-yellow-50 rounded-xl">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="hourglass" size={20} color="#f59e0b" />
                </View>
                <Text className="font-medium text-gray-700">In Escrow</Text>
              </View>
              <Text className="font-bold text-gray-900">
                {formatPrice(analytics.revenue.inEscrow)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between p-3 bg-green-50 rounded-xl">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                </View>
                <Text className="font-medium text-gray-700">Released</Text>
              </View>
              <Text className="font-bold text-gray-900">
                {formatPrice(analytics.revenue.released)}
              </Text>
            </View>
          </View>
        </View>

        {}
        <View className="flex-row gap-3">
          <View
            className="flex-1 bg-white rounded-3xl p-5"
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
            <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="calendar" size={24} color="#3b82f6" />
            </View>
            <Text className="text-xs text-gray-600 mb-1">Bookings</Text>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              {analytics.bookings.total}
            </Text>
            <View className="flex-row items-center">
              <View className="flex-1 bg-green-100 rounded px-2 py-1 mr-1">
                <Text className="text-xs font-bold text-green-700 text-center">
                  {analytics.bookings.completed}
                </Text>
              </View>
              <View className="flex-1 bg-yellow-100 rounded px-2 py-1">
                <Text className="text-xs font-bold text-yellow-700 text-center">
                  {analytics.bookings.pending}
                </Text>
              </View>
            </View>
          </View>

          <View
            className="flex-1 bg-white rounded-3xl p-5"
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
            <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="cart" size={24} color="#8b5cf6" />
            </View>
            <Text className="text-xs text-gray-600 mb-1">Orders</Text>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              {analytics.orders.total}
            </Text>
            <View className="flex-row items-center">
              <View className="flex-1 bg-green-100 rounded px-2 py-1 mr-1">
                <Text className="text-xs font-bold text-green-700 text-center">
                  {analytics.orders.completed}
                </Text>
              </View>
              <View className="flex-1 bg-yellow-100 rounded px-2 py-1">
                <Text className="text-xs font-bold text-yellow-700 text-center">
                  {analytics.orders.pending}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {}
        <View className="flex-row gap-3">
          <View
            className="flex-1 bg-white rounded-3xl p-5"
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
            <View className="w-12 h-12 bg-pink-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="pricetag" size={24} color="#ec4899" />
            </View>
            <Text className="text-xs text-gray-600 mb-1">Products</Text>
            <Text className="text-2xl font-bold text-gray-900">
              {analytics.overview.totalProducts}
            </Text>
            <Text className="text-xs text-green-600 font-medium mt-1">
              {analytics.overview.activeProducts} active
            </Text>
          </View>

          <View
            className="flex-1 bg-white rounded-3xl p-5"
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
            <View className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="briefcase" size={24} color="#6366f1" />
            </View>
            <Text className="text-xs text-gray-600 mb-1">Services</Text>
            <Text className="text-2xl font-bold text-gray-900">
              {analytics.overview.totalServices}
            </Text>
            <Text className="text-xs text-green-600 font-medium mt-1">
              {analytics.overview.activeServices} active
            </Text>
          </View>
        </View>

        {}
        <View
          className="bg-white rounded-3xl p-5"
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
          <Text className="text-lg font-bold text-gray-900 mb-4">Customer Reviews</Text>

          <View className="flex-row items-center mb-4">
            <View className="mr-4">
              <Text className="text-4xl font-bold text-gray-900">
                {analytics.reviews.averageRating.toFixed(1)}
              </Text>
              <View className="flex-row mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(analytics.reviews.averageRating) ? 'star' : 'star-outline'}
                    size={16}
                    color="#f59e0b"
                  />
                ))}
              </View>
            </View>

            <View className="flex-1">
              <Text className="text-sm text-gray-600 mb-2">
                {analytics.reviews.total} total reviews
              </Text>
              <View className="flex-row items-center">
                <View className="flex-1 bg-green-100 rounded-full h-2 mr-2">
                  <View
                    className="bg-green-500 rounded-full h-2"
                    style={{ width: `${analytics.reviews.positivePercentage}%` }}
                  />
                </View>
                <Text className="text-xs font-bold text-green-600">
                  {analytics.reviews.positivePercentage.toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <View key={rating} className="flex-row items-center">
                <Text className="text-xs font-medium text-gray-600 w-8">{rating}★</Text>
                <View className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                  <View
                    className="bg-yellow-500 rounded-full h-2"
                    style={{
                      width: `${
                        analytics.reviews.total > 0
                          ? (analytics.reviews.distribution[rating as keyof typeof analytics.reviews.distribution] /
                              analytics.reviews.total) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </View>
                <Text className="text-xs font-bold text-gray-700 w-8">
                  {analytics.reviews.distribution[rating as keyof typeof analytics.reviews.distribution]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {}
        <View
          className="bg-white rounded-3xl p-5"
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
          <Text className="text-lg font-bold text-gray-900 mb-4">Customer Insights</Text>

          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1 bg-blue-50 rounded-2xl p-4">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mb-2">
                <Ionicons name="people" size={20} color="#3b82f6" />
              </View>
              <Text className="text-xs text-gray-600 mb-1">Total</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {analytics.customers.total}
              </Text>
            </View>

            <View className="flex-1 bg-green-50 rounded-2xl p-4">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mb-2">
                <Ionicons name="repeat" size={20} color="#10b981" />
              </View>
              <Text className="text-xs text-gray-600 mb-1">Returning</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {analytics.customers.returning}
              </Text>
              <Text className="text-xs text-green-600 font-medium mt-1">
                {analytics.customers.returningRate.toFixed(0)}%
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-2xl p-4">
              <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mb-2">
                <Ionicons name="person-add" size={20} color="#8b5cf6" />
              </View>
              <Text className="text-xs text-gray-600 mb-1">New</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {analytics.customers.new}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderRevenueTab = () => {
    if (!analytics) return null;

    
    const revenueData = analytics.revenue.byPeriod?.slice(-7) || [];
    const maxRevenue = Math.max(...revenueData.map(item => item.revenue || 0), 1);

    return (
      <View className="px-5" style={{ gap: 16 }}>
        {}
        {revenueData.length > 0 && (
          <View
            className="bg-white rounded-3xl p-5"
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
            <Text className="text-lg font-bold text-gray-900 mb-4">Revenue Trend (Last 7 Days)</Text>

            <View style={{ gap: 12 }}>
              {revenueData.map((item, index) => {
                const date = new Date(item.date);
                const percentage = (item.revenue / maxRevenue) * 100;
                
                return (
                  <View key={index}>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs font-medium text-gray-600">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text className="text-sm font-bold text-gray-900">
                        {formatPrice(item.revenue)}
                      </Text>
                    </View>
                    <View className="bg-gray-200 rounded-full h-8 overflow-hidden mb-1">
                      <LinearGradient
                        colors={['#ec4899', '#f472b6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          borderRadius: 9999,
                        }}
                      />
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-gray-500">
                        📅 {item.bookings} bookings
                      </Text>
                      <Text className="text-xs text-gray-500">
                        🛒 {item.orders} orders
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {}
            <View className="mt-4 bg-pink-50 rounded-2xl p-4">
              <Text className="text-sm text-gray-600 mb-1">Total Revenue (Period)</Text>
              <Text className="text-3xl font-bold text-pink-600">
                {formatPrice(analytics.revenue.total)}
              </Text>
            </View>
          </View>
        )}

        {}
        <View
          className="bg-white rounded-3xl p-5"
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
          <Text className="text-lg font-bold text-gray-900 mb-4">Revenue Sources</Text>

          <View style={{ gap: 12 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <View className="w-4 h-4 bg-blue-500 rounded mr-2" />
                  <Text className="text-sm font-medium text-gray-700">Bookings</Text>
                </View>
                <View className="bg-gray-200 rounded-full h-3">
                  <View
                    className="bg-blue-500 rounded-full h-3"
                    style={{
                      width: `${
                        analytics.revenue.total > 0
                          ? (analytics.revenue.fromBookings / analytics.revenue.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </View>
              </View>
              <Text className="ml-4 font-bold text-gray-900">
                {formatPrice(analytics.revenue.fromBookings)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <View className="flex-row items-center mb-2">
                  <View className="w-4 h-4 bg-purple-500 rounded mr-2" />
                  <Text className="text-sm font-medium text-gray-700">Orders</Text>
                </View>
                <View className="bg-gray-200 rounded-full h-3">
                  <View
                    className="bg-purple-500 rounded-full h-3"
                    style={{
                      width: `${
                        analytics.revenue.total > 0
                          ? (analytics.revenue.fromOrders / analytics.revenue.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </View>
              </View>
              <Text className="ml-4 font-bold text-gray-900">
                {formatPrice(analytics.revenue.fromOrders)}
              </Text>
            </View>
          </View>
        </View>

        {}
        {analytics.bookings.topServices && analytics.bookings.topServices.length > 0 && (
          <View
            className="bg-white rounded-3xl p-5"
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
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">Top Services</Text>
              <View className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="text-blue-700 font-bold text-xs">
                  {analytics.bookings.topServices.length} Services
                </Text>
              </View>
            </View>

            {analytics.bookings.topServices.slice(0, 5).map((item, index) => (
              <View
                key={index}
                className="flex-row items-center justify-between py-3 border-b border-gray-100"
              >
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-2">
                      <Text className="text-blue-600 font-bold text-xs">{index + 1}</Text>
                    </View>
                    <Text className="font-bold text-gray-900 flex-1" numberOfLines={1}>
                      {item.service?.name || 'Unknown Service'}
                    </Text>
                  </View>
                  <View className="flex-row items-center ml-8">
                    <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                    <Text className="text-xs text-gray-600 ml-1">
                      {item.bookings} bookings
                    </Text>
                  </View>
                </View>
                <Text className="font-bold text-pink-600 ml-3">
                  {formatPrice(item.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {}
        {analytics.orders.topProducts && analytics.orders.topProducts.length > 0 && (
          <View
            className="bg-white rounded-3xl p-5"
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
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">Top Products</Text>
              <View className="bg-purple-100 px-3 py-1 rounded-full">
                <Text className="text-purple-700 font-bold text-xs">
                  {analytics.orders.topProducts.length} Products
                </Text>
              </View>
            </View>

            {analytics.orders.topProducts.slice(0, 5).map((item, index) => (
              <View
                key={index}
                className="flex-row items-center justify-between py-3 border-b border-gray-100"
              >
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <View className="w-6 h-6 bg-purple-100 rounded-full items-center justify-center mr-2">
                      <Text className="text-purple-600 font-bold text-xs">{index + 1}</Text>
                    </View>
                    <Text className="font-bold text-gray-900 flex-1" numberOfLines={1}>
                      {item.product?.name || 'Unknown Product'}
                    </Text>
                  </View>
                  <View className="flex-row items-center ml-8">
                    <Ionicons name="cart-outline" size={12} color="#6b7280" />
                    <Text className="text-xs text-gray-600 ml-1">
                      {item.orders} orders • {item.quantity} units
                    </Text>
                  </View>
                </View>
                <Text className="font-bold text-purple-600 ml-3">
                  {formatPrice(item.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {}
        {analytics.orders.averageOrderValue > 0 && (
          <View
            className="bg-white rounded-3xl p-5"
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
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mr-4">
                <Ionicons name="trending-up" size={32} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-600 mb-1">Average Order Value</Text>
                <Text className="text-3xl font-bold text-gray-900">
                  {formatPrice(analytics.orders.averageOrderValue)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderPerformanceTab = () => {
    if (!analytics) return null;

    const performanceMetrics = [
      {
        icon: 'time',
        label: 'Avg Response Time',
        value: `${analytics.performance.responseTime.toFixed(1)}h`,
        color: '#3b82f6',
        bgColor: '#dbeafe',
        percentage: Math.min((24 / (analytics.performance.responseTime || 1)) * 100, 100),
      },
      {
        icon: 'checkmark-circle',
        label: 'Acceptance Rate',
        value: `${analytics.performance.acceptanceRate.toFixed(0)}%`,
        color: '#10b981',
        bgColor: '#d1fae5',
        percentage: analytics.performance.acceptanceRate,
      },
      {
        icon: 'flag',
        label: 'Completion Rate',
        value: `${analytics.performance.completionRate.toFixed(0)}%`,
        color: '#8b5cf6',
        bgColor: '#ede9fe',
        percentage: analytics.performance.completionRate,
      },
      {
        icon: 'close-circle',
        label: 'Cancellation Rate',
        value: `${analytics.performance.cancellationRate.toFixed(0)}%`,
        color: '#ef4444',
        bgColor: '#fee2e2',
        percentage: 100 - analytics.performance.cancellationRate,
      },
      {
        icon: 'rocket',
        label: 'On-Time Delivery',
        value: `${analytics.performance.onTimeDeliveryRate.toFixed(0)}%`,
        color: '#f59e0b',
        bgColor: '#fef3c7',
        percentage: analytics.performance.onTimeDeliveryRate,
      },
      {
        icon: 'happy',
        label: 'Customer Satisfaction',
        value: `${analytics.performance.customerSatisfactionScore.toFixed(0)}%`,
        color: '#ec4899',
        bgColor: '#fce7f3',
        percentage: analytics.performance.customerSatisfactionScore,
      },
    ];

    return (
      <View className="px-5" style={{ gap: 16 }}>
        {performanceMetrics.map((metric, index) => (
          <View
            key={index}
            className="bg-white rounded-3xl p-5"
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
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: metric.bgColor }}
                >
                  <Ionicons name={metric.icon as any} size={24} color={metric.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-600 mb-1">{metric.label}</Text>
                  <Text className="text-2xl font-bold text-gray-900">{metric.value}</Text>
                </View>
              </View>
            </View>

            <View className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <View
                className="h-3 rounded-full"
                style={{
                  width: `${metric.percentage}%`,
                  backgroundColor: metric.color,
                }}
              />
            </View>
          </View>
        ))}

        {}
        {analytics.bookings.byStatus && analytics.bookings.byStatus.length > 0 && (
          <View
            className="bg-white rounded-3xl p-5"
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
            <Text className="text-lg font-bold text-gray-900 mb-4">Booking Status</Text>

            {analytics.bookings.byStatus.map((status, index) => (
              <View key={index} className="mb-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-medium text-gray-700 capitalize">
                    {status.status.replace('_', ' ')}
                  </Text>
                  <Text className="text-sm font-bold text-gray-900">
                    {status.count} ({status.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="h-2 rounded-full bg-pink-600"
                    style={{ width: `${status.percentage}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading && !analytics) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="mt-4 text-sm font-medium text-gray-500">Loading analytics...</Text>
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
      >
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <Text className="text-lg font-bold text-white">Analytics</Text>

            <TouchableOpacity
              onPress={handleRefresh}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
              activeOpacity={0.7}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="refresh" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {}
        <View className="py-4">
          {renderQuickStatsCards()}
        </View>

        {}
        {renderPeriodSelector()}

        {}
        {renderTabSelector()}

        {}
        <View className="py-4 pb-8">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'revenue' && renderRevenueTab()}
          {activeTab === 'performance' && renderPerformanceTab()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VendorAnalyticsScreen;