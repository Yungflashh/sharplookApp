import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation.types';
import VendorSidebar from '@/components/VendorSidebar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Type definitions
interface QuickAction {
  id: string;
  title: string;
  icon: string;
  iconFamily: 'ionicons' | 'material' | 'feather';
  color: string;
  bgColor: string;
  onPress: () => void;
}

interface Stat {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
}

type VendorDashboardScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

const VendorDashboardScreen: React.FC = () => {
  const navigation = useNavigation<VendorDashboardScreenNavigationProp>();
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const balanceOpacity = useRef(new Animated.Value(0)).current;

  const balance = 25000;
  const pendingBalance = 5000;
  const totalEarnings = 150000;

  // Mock data for stats
  const stats: Stat[] = [
    { label: 'Total Orders', value: '124', change: '+12%', isPositive: true },
    { label: 'Active Products', value: '18', change: '+3', isPositive: true },
    { label: 'Avg. Rating', value: '4.8', change: '+0.2', isPositive: true },
    { label: 'Response Rate', value: '98%', change: '-1%', isPositive: false },
  ];

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Add Product',
      icon: 'add-circle-outline',
      iconFamily: 'ionicons',
      color: '#eb278d',
      bgColor: '#fce7f3',
      onPress: () => console.log('Add Product'),
    },
    {
      id: '2',
      title: 'Orders',
      icon: 'package',
      iconFamily: 'feather',
      color: '#3b82f6',
      bgColor: '#dbeafe',
      onPress: () => console.log('Orders'),
    },
    {
      id: '3',
      title: 'Analytics',
      icon: 'chart-line',
      iconFamily: 'material',
      color: '#10b981',
      bgColor: '#d1fae5',
      onPress: () => console.log('Analytics'),
    },
    {
      id: '4',
      title: 'Promotions',
      icon: 'tag-outline',
      iconFamily: 'material',
      color: '#f59e0b',
      bgColor: '#fed7aa',
      onPress: () => console.log('Promotions'),
    },
  ];

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Balance animation when toggled
    Animated.timing(balanceOpacity, {
      toValue: showBalance ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showBalance]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const formatBalance = (amount: number): string => {
    return `₦${amount.toLocaleString()}`;
  };

  const renderIcon = (iconFamily: string, iconName: string, size: number, color: string): JSX.Element => {
    switch (iconFamily) {
      case 'material':
        return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
      case 'feather':
        return <Feather name={iconName as any} size={size} color={color} />;
      default:
        return <Ionicons name={iconName as any} size={size} color={color} />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Enhanced Header */}
      <View className="bg-white shadow-sm">
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity 
            className="w-10 h-10 items-center justify-center"
            activeOpacity={0.7}
            onPress={() => setSidebarVisible(true)}
          >
            <Ionicons name="menu" size={28} color="#eb278d" />
          </TouchableOpacity>
          
          <Text className="text-lg font-bold text-gray-800">Dashboard</Text>
          
          <View className="flex-row items-center gap-3">
            <TouchableOpacity 
              className="relative w-10 h-10 items-center justify-center"
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Message')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#eb278d" />
              <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="relative w-10 h-10 items-center justify-center"
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Notification')}
            >
              <Ionicons name="notifications-outline" size={26} color="#eb278d" />
              <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#eb278d"
            colors={['#eb278d']}
          />
        }
      >
        {/* Welcome Section with Profile */}
        <Animated.View 
          className="bg-white px-5 py-6"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-gray-600 text-sm mb-1">Good morning! 👋</Text>
              <Text className="text-2xl font-bold text-gray-900">
                John's Store
              </Text>
              <View className="flex-row items-center mt-2">
                <View className="flex-row items-center bg-green-100 px-2 py-1 rounded-full">
                  <View className="w-2 h-2 bg-green-500 rounded-full mr-1.5" />
                  <Text className="text-green-700 text-xs font-semibold">Active</Text>
                </View>
                <Text className="text-gray-500 text-xs ml-3">Since Jan 2024</Text>
              </View>
            </View>
            
            {/* Enhanced Profile Avatar */}
            <TouchableOpacity activeOpacity={0.7}>
              <LinearGradient
                colors={['#eb278d', '#f472b6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-16 h-16 rounded-full p-0.5"
              >
                <View className="w-full h-full rounded-full bg-white items-center justify-center">
                  <Ionicons name="person" size={32} color="#eb278d" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Enhanced Balance Card */}
        <View className="px-5 py-4">
          <Animated.View
            style={{ 
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            }}
          >
            <LinearGradient
              colors={['#eb278d', '#f472b6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-3xl p-6 overflow-hidden"
              style={{
                shadowColor: '#eb278d',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              {/* Pattern Overlay */}
              <View className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 bg-white" 
                style={{ transform: [{ translateX: 20 }, { translateY: -60 }] }} 
              />
              
              {/* Balance Header */}
              <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center gap-2">
                  <Text className="text-white/90 text-sm font-medium">
                    Total Balance
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setShowBalance(!showBalance)}
                    className="w-8 h-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={showBalance ? "eye-outline" : "eye-off-outline"} 
                      size={16} 
                      color="#fff" 
                    />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  className="flex-row items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full"
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-xs font-semibold">
                    History
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Balance Display */}
              <View className="mb-8">
                {showBalance ? (
                  <Animated.View style={{ opacity: balanceOpacity }}>
                    <Text className="text-white text-4xl font-bold tracking-tight mb-2">
                      {formatBalance(balance)}
                    </Text>
                    <View className="flex-row items-center gap-4">
                      <View>
                        <Text className="text-white/70 text-xs">Pending</Text>
                        <Text className="text-white font-semibold">
                          {formatBalance(pendingBalance)}
                        </Text>
                      </View>
                      <View className="w-px h-8 bg-white/30" />
                      <View>
                        <Text className="text-white/70 text-xs">Total Earned</Text>
                        <Text className="text-white font-semibold">
                          {formatBalance(totalEarnings)}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                ) : (
                  <View>
                    <Text className="text-white text-4xl font-bold tracking-widest mb-2">
                      ••••••
                    </Text>
                    <Text className="text-white/70 text-sm">Tap eye to view balance</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-4">
                <TouchableOpacity 
                  className="flex-1 bg-white/20 rounded-2xl py-3 items-center flex-row justify-center gap-2"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-full bg-white/30 items-center justify-center">
                    <Ionicons name="add" size={20} color="#fff" />
                  </View>
                  <Text className="text-white text-sm font-semibold">Fund Wallet</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  className="flex-1 bg-white rounded-2xl py-3 items-center flex-row justify-center gap-2"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center">
                    <Ionicons name="arrow-up" size={20} color="#eb278d" />
                  </View>
                  <Text className="text-gray-800 text-sm font-semibold">Withdraw</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Quick Actions */}
        <View className="px-5 py-4">
          <Text className="text-lg font-bold text-gray-900 mb-4">Quick Actions</Text>
          <View className="flex-row flex-wrap gap-4">
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                activeOpacity={0.7}
                onPress={action.onPress}
                className="flex-1"
                style={{ minWidth: (SCREEN_WIDTH - 60) / 2 }}
              >
                <Animated.View
                  className="bg-white rounded-2xl p-4 items-center"
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, index * 10],
                        }),
                      },
                    ],
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View 
                    className="w-12 h-12 rounded-xl items-center justify-center mb-3"
                    style={{ backgroundColor: action.bgColor }}
                  >
                    {renderIcon(action.iconFamily, action.icon, 24, action.color)}
                  </View>
                  <Text className="text-gray-800 text-sm font-semibold">{action.title}</Text>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Statistics Section */}
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Performance</Text>
            <View className="flex-row bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  onPress={() => setSelectedPeriod(period)}
                  className={`px-4 py-1.5 rounded-md ${
                    selectedPeriod === period ? 'bg-white' : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-xs font-semibold capitalize ${
                      selectedPeriod === period ? 'text-pink-600' : 'text-gray-500'
                    }`}
                  >
                    {period === 'day' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            {stats.map((stat, index) => (
              <View
                key={index}
                className="bg-white rounded-2xl p-4"
                style={{
                  width: (SCREEN_WIDTH - 52) / 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-500 text-xs">{stat.label}</Text>
                  <View
                    className={`flex-row items-center px-2 py-0.5 rounded-full ${
                      stat.isPositive ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    <Ionicons
                      name={stat.isPositive ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={stat.isPositive ? '#10b981' : '#ef4444'}
                    />
                    <Text
                      className={`text-xs ml-1 font-semibold ${
                        stat.isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stat.change}
                    </Text>
                  </View>
                </View>
                <Text className="text-2xl font-bold text-gray-900">{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Recent Activity</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-pink-600 text-sm font-semibold">View all</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl overflow-hidden">
            {/* Sample activity items */}
            {[
              {
                icon: 'cart',
                title: 'New Order #1234',
                subtitle: '2 items • ₦12,500',
                time: '2 min ago',
                color: '#3b82f6',
              },
              {
                icon: 'star',
                title: 'New Review',
                subtitle: '5 stars from John D.',
                time: '1 hour ago',
                color: '#f59e0b',
              },
              {
                icon: 'cube',
                title: 'Product Added',
                subtitle: 'Summer Collection Dress',
                time: '3 hours ago',
                color: '#10b981',
              },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                className="flex-row items-center p-4 border-b border-gray-100"
                activeOpacity={0.7}
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-sm">{item.title}</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">{item.subtitle}</Text>
                </View>
                <Text className="text-gray-400 text-xs">{item.time}</Text>
              </TouchableOpacity>
            ))}
            
            {/* View More */}
            <TouchableOpacity
              className="flex-row items-center justify-center p-3 bg-gray-50"
              activeOpacity={0.7}
            >
              <Text className="text-pink-600 text-sm font-semibold mr-1">Load More</Text>
              <Ionicons name="chevron-down" size={16} color="#eb278d" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Products & Inventory Alert */}
        <View className="px-5 py-4 mb-4">
          <Text className="text-lg font-bold text-gray-900 mb-4">Inventory Status</Text>
          
          <View className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-200">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-xl bg-orange-100 items-center justify-center mr-3">
                <Ionicons name="alert-circle" size={24} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold text-sm">Low Stock Alert</Text>
                <Text className="text-gray-600 text-xs mt-0.5">3 products running low</Text>
              </View>
              <TouchableOpacity
                className="bg-orange-500 px-4 py-2 rounded-full"
                activeOpacity={0.7}
              >
                <Text className="text-white text-xs font-semibold">View</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Add Product CTA */}
          <TouchableOpacity
            className="mt-4"
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#fce7f3', '#fdf2f8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-2xl p-4 border border-pink-200"
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="add-circle" size={24} color="#eb278d" />
                <Text className="text-pink-600 font-semibold ml-2">Add Your First Product</Text>
              </View>
              <Text className="text-gray-500 text-xs text-center mt-2">
                Start selling today by adding your products
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sidebar Component */}
      <VendorSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userName="John's Store"
        userEmail="vendor@example.com"
      />
    </SafeAreaView>
  );
};

export default VendorDashboardScreen;