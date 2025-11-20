import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Animated, Dimensions, RefreshControl, Platform, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation.types';
import VendorSidebar from '@/components/VendorSidebar';
import { vendorAPI, walletAPI, bookingAPI, servicesAPI, handleAPIError, userAPI, notificationAPI, messageAPI, analyticsAPI } from '@/api/api';
import socketService from '@/services/socket.service';

const {
  width: SCREEN_WIDTH
} = Dimensions.get('window');

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

interface VendorProfile {
  businessName: string;
  businessDescription?: string;
  rating?: number;
  totalReviews?: number;
  isActive?: boolean;
  createdAt?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  walletBalance?: number;
}

interface WalletData {
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
}

interface RecentActivity {
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  color: string;
}

type VendorDashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const VendorDashboardScreen: React.FC = () => {
  const navigation = useNavigation<VendorDashboardScreenNavigationProp>();
  const [showBalance, setShowBalance] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [walletData, setWalletData] = useState<WalletData>({
    balance: 0,
    pendingBalance: 0,
    totalEarnings: 0
  });
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [servicesData, setServicesData] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [stats, setStats] = useState<Stat[]>([{
    label: 'Total Orders',
    value: '0',
    change: '+0%',
    isPositive: true
  }, {
    label: 'Active Products',
    value: '0',
    change: '+0',
    isPositive: true
  }, {
    label: 'Avg. Rating',
    value: '0.0',
    change: '+0.0',
    isPositive: true
  }, {
    label: 'Response Rate',
    value: '0%',
    change: '0%',
    isPositive: true
  }]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Socket.IO setup
  useEffect(() => {
    console.log('🔌 Connecting to Socket.IO...');
    socketService.connect();

    // Listen for new messages
    socketService.onNewMessage((data) => {
      console.log('📩 New message received via socket:', data);
      
      // Increment unread message count
      setUnreadMessagesCount((prev) => prev + 1);
    });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socketService.removeListener('message:new');
    };
  }, []);

  const fetchUnreadNotificationCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      console.log('Unread notification count response:', response);
      
      if (response.data?.count !== undefined) {
        setUnreadNotificationCount(response.data.count);
      } else if (response.data?.data?.count !== undefined) {
        setUnreadNotificationCount(response.data.data.count);
      } else if (response.count !== undefined) {
        setUnreadNotificationCount(response.count);
      }
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    }
  };

  const fetchUnreadMessagesCount = async () => {
    try {
      const response = await messageAPI.getUnreadCount();
      console.log('Unread messages count response:', response);

      if (response.data?.unreadCount !== undefined) {
        setUnreadMessagesCount(response.data.unreadCount);
        console.log('✅ Set unread messages to:', response.data.unreadCount);
      } else if (response.unreadCount !== undefined) {
        setUnreadMessagesCount(response.unreadCount);
        console.log('✅ Set unread messages to:', response.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile first
      const profileResponse = await userAPI.getProfile();
      console.log(profileResponse.data);
      if (profileResponse.success) {
        const userData = profileResponse.data.user || profileResponse.data;
        setVendorProfile(userData);
        
        // Use wallet balance from profile
        if (userData.walletBalance !== undefined) {
          setWalletData({
            balance: userData.walletBalance || 0,
            pendingBalance: 0, // Not available in profile
            totalEarnings: userData.walletBalance || 0, // Use current balance as total
          });
        }
      }

      // Fetch bookings stats
      const bookingsResponse = await vendorAPI.getStats();
      if (bookingsResponse.success) {
        const statsData = bookingsResponse.data?.stats || bookingsResponse.data || {};
        console.log('Stats data:', statsData);
        
        // Update stats from the stats endpoint
        if (statsData.total !== undefined) {
          setStats(prevStats => {
            const newStats = [...prevStats];
            
            // Total bookings
            newStats[0] = {
              label: 'Total Bookings',
              value: statsData.total?.toString() || '0',
              change: `${statsData.pending || 0} pending`,
              isPositive: true
            };
            
            // Completed bookings
            newStats[3] = {
              label: 'Completed',
              value: statsData.completed?.toString() || '0',
              change: `${Math.round((statsData.completed / (statsData.total || 1)) * 100)}%`,
              isPositive: true
            };
            
            return newStats;
          });
        }
        
        // Store empty array for bookingsData since we're using stats
        setBookingsData([]);
        setRecentActivities([]);
      }

      // Fetch services
      const servicesResponse = await servicesAPI.getMyServices();
      if (servicesResponse.success) {
        // Services are nested in response.data.services
        const servicesArray = servicesResponse.data?.services || servicesResponse.data || [];
        console.log('Services array:', servicesArray);
        setServicesData(Array.isArray(servicesArray) ? servicesArray : []);
        updateServicesStats(Array.isArray(servicesArray) ? servicesArray : []);
      }

      // Fetch analytics data
      try {
        const analyticsResponse = await analyticsAPI.getVendorAnalytics({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        });
        
        if (analyticsResponse.success) {
          setAnalyticsData(analyticsResponse.data);
          updateStatsFromAnalytics(analyticsResponse.data);
        }
      } catch (analyticsError) {
        console.log('Analytics fetch error (non-critical):', analyticsError);
      }

      // Fetch notification and message counts
      await fetchUnreadNotificationCount();
      await fetchUnreadMessagesCount();
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Dashboard fetch error:', apiError);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatsFromBookings = (bookings: any[]) => {
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    setStats(prevStats => [{
      label: 'Total Orders',
      value: bookings.length.toString(),
      change: `+${pendingBookings.length}%`,
      isPositive: pendingBookings.length > 0
    }, prevStats[1], prevStats[2], {
      label: 'Completed',
      value: completedBookings.length.toString(),
      change: `${Math.round(completedBookings.length / (bookings.length || 1) * 100)}%`,
      isPositive: true
    }]);
  };

  const updateServicesStats = (services: any[]) => {
    const activeServices = services.filter(s => s.isActive !== false);
    setStats(prevStats => [prevStats[0], {
      label: 'Active Services',
      value: activeServices.length.toString(),
      change: `+${services.length - activeServices.length}`,
      isPositive: activeServices.length > 0
    }, prevStats[2], prevStats[3]]);
  };

  const updateStatsFromAnalytics = (analytics: any) => {
    if (!analytics) return;

    setStats(prevStats => {
      const newStats = [...prevStats];
      
      // Update rating if available
      if (analytics.reviews?.averageRating) {
        newStats[2] = {
          label: 'Avg. Rating',
          value: analytics.reviews.averageRating.toFixed(1),
          change: `${analytics.reviews.total} reviews`,
          isPositive: analytics.reviews.averageRating >= 4.0,
        };
      }

      // Update response rate from performance
      if (analytics.performance?.acceptanceRate !== undefined) {
        newStats[3] = {
          label: 'Acceptance Rate',
          value: `${analytics.performance.acceptanceRate.toFixed(0)}%`,
          change: analytics.performance.completionRate ? `${analytics.performance.completionRate.toFixed(0)}% completion` : '0%',
          isPositive: analytics.performance.acceptanceRate >= 80,
        };
      }

      return newStats;
    });
  };

  const generateRecentActivities = (bookings: any[]) => {
    const activities: RecentActivity[] = bookings.slice(0, 3).map((booking, index) => {
      const timeAgo = getTimeAgo(booking.createdAt || new Date());
      return {
        icon: booking.status === 'completed' ? 'checkmark-circle' : booking.status === 'pending' ? 'time' : 'cart',
        title: `Booking #${booking._id?.slice(-4) || index}`,
        subtitle: `${booking.serviceName || 'Service'} • ₦${booking.totalAmount?.toLocaleString() || '0'}`,
        time: timeAgo,
        color: booking.status === 'completed' ? '#10b981' : booking.status === 'pending' ? '#f59e0b' : '#3b82f6'
      };
    });
    setRecentActivities(activities);
  };

  const getTimeAgo = (date: Date | string): string => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  useEffect(() => {
    if (vendorProfile?.rating) {
      setStats(prevStats => {
        const newStats = [...prevStats];
        newStats[2] = {
          label: 'Avg. Rating',
          value: vendorProfile.rating?.toFixed(1) || '0.0',
          change: '+0.2',
          isPositive: true
        };
        return newStats;
      });
    }
  }, [vendorProfile]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh counts when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Dashboard focused - refreshing counts');
      
      fetchUnreadNotificationCount();
      fetchUnreadMessagesCount();

      // Reconnect socket if disconnected
      if (!socketService.isSocketConnected()) {
        console.log('🔌 Reconnecting socket...');
        socketService.connect();
      }

      // Set up polling interval for counts
      const interval = setInterval(() => {
        fetchUnreadNotificationCount();
        fetchUnreadMessagesCount();
      }, 30000); // Poll every 30 seconds

      return () => {
        console.log('🛑 Dashboard unfocused - clearing interval');
        clearInterval(interval);
      };
    }, [])
  );

  useEffect(() => {
    Animated.parallel([Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }), Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true
    }), Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    })]).start();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => {
      setRefreshing(false);
    });
  }, []);

  const formatBalance = (amount: number): string => {
    return `₦${amount.toLocaleString()}`;
  };

  const quickActions: QuickAction[] = [{
    id: '1',
    title: 'Add Service',
    icon: 'add-circle-outline',
    iconFamily: 'ionicons',
    color: '#eb278d',
    bgColor: '#fce7f3',
    onPress: () => {
      navigation.navigate("Services")
    }
  }, {
    id: '2',
    title: 'Bookings',
    icon: 'package',
    iconFamily: 'feather',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    onPress: () => {
      navigation.navigate("Bookings")
    }
  },];

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

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! 👋';
    if (hour < 18) return 'Good afternoon! 👋';
    return 'Good evening! 👋';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 p-0 m-0">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Enhanced Header with Notification and Message Badges */}
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
            {/* Chat Icon with Badge */}
            <TouchableOpacity 
              className="relative w-10 h-10 items-center justify-center" 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('ChatList')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#eb278d" />
              {unreadMessagesCount > 0 ? (
                <View
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-pink-500 rounded-full items-center justify-center px-1"
                  style={{
                    shadowColor: '#eb278d',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    elevation: 4,
                  }}
                >
                  <Text className="text-white text-[10px] font-bold">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </Text>
                </View>
              ) : (
                <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </TouchableOpacity>
            
            {/* Notifications Icon with Badge */}
            <TouchableOpacity 
              className="relative w-10 h-10 items-center justify-center" 
              activeOpacity={0.7} 
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={26} color="#eb278d" />
              {unreadNotificationCount > 0 && (
                <View
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-pink-500 rounded-full items-center justify-center px-1"
                  style={{
                    shadowColor: '#eb278d',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    elevation: 4,
                  }}
                >
                  <Text className="text-white text-[10px] font-bold">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        className='flex-1 h-full' 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{
          paddingBottom: 150
        }} 
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#eb278d" 
            colors={['#eb278d']} 
          />
        }
      >
        {/* Welcome Section */}
        <Animated.View 
          className="bg-white px-5 py-6" 
          style={{
            opacity: fadeAnim,
            transform: [{
              translateY: slideAnim
            }]
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-gray-600 text-sm mb-1">{getGreeting()}</Text>
              <Text className="text-2xl font-bold text-gray-900">
                {vendorProfile?.businessName || vendorProfile?.firstName || "User"}
              </Text>
              <View className="flex-row items-center mt-2">
                <View className="flex-row items-center bg-green-100 px-2 py-1 rounded-full">
                  <View className="w-2 h-2 bg-green-500 rounded-full mr-1.5" />
                  <Text className="text-green-700 text-xs font-semibold">
                    {vendorProfile?.isActive !== false ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                {vendorProfile?.createdAt && (
                  <Text className="text-gray-500 text-xs ml-3">
                    Since {new Date(vendorProfile.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Wallet Card */}
        <View className="px-5 py-4">
          <LinearGradient 
            colors={['#eb278d', '#f472b6']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={{
              padding: 20,
              borderRadius: 24,
              overflow: 'hidden',
              shadowColor: '#eb278d',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 12
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
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
                  <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                className="flex-row items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full" 
                activeOpacity={0.7} 
                onPress={() => {
                  Alert.alert(
                    'Transaction History',
                    'Transaction history will be available soon.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text className="text-white text-xs font-semibold">
                  History
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              {showBalance ? (
                <View>
                  <Text className="text-white text-4xl font-bold tracking-tight mb-2">
                    {formatBalance(walletData.balance)}
                  </Text>
                  <View className="flex-row items-center gap-4">
                    <View>
                      <Text className="text-white/70 text-xs">Pending</Text>
                      <Text className="text-white font-semibold">
                        {formatBalance(walletData.pendingBalance)}
                      </Text>
                    </View>
                    <View className="w-px h-8 bg-white/30" />
                    <View>
                      <Text className="text-white/70 text-xs">Total Earned</Text>
                      <Text className="text-white font-semibold">
                        {formatBalance(walletData.totalEarnings)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View>
                  <Text className="text-white text-4xl font-bold tracking-widest mb-2">
                    ••••••
                  </Text>
                  <Text className="text-white/70 text-sm">Tap eye to view balance</Text>
                </View>
              )}
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity 
                className="flex-1 bg-white/20 rounded-2xl py-3 items-center flex-row justify-center gap-2" 
                activeOpacity={0.7} 
                onPress={() => {
                  console.log('Fund Wallet');
                }}
              >
                <View className="w-10 h-10 rounded-full bg-white/30 items-center justify-center">
                  <Ionicons name="add" size={20} color="#fff" />
                </View>
                <Text className="text-white text-sm font-semibold">Fund Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="flex-1 bg-white rounded-2xl py-3 items-center flex-row justify-center gap-2" 
                activeOpacity={0.7} 
                onPress={() => {
                  console.log('Withdraw');
                }}
              >
                <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center">
                  <Ionicons name="arrow-up" size={20} color="#eb278d" />
                </View>
                <Text className="text-gray-800 text-sm font-semibold">Withdraw</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
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
                style={{
                  minWidth: (SCREEN_WIDTH - 60) / 2
                }}
              >
                <Animated.View 
                  className="bg-white rounded-2xl p-4 items-center" 
                  style={{
                    opacity: fadeAnim,
                    transform: [{
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 50],
                        outputRange: [0, index * 10]
                      })
                    }],
                    shadowColor: '#000',
                    shadowOffset: {
                      width: 0,
                      height: 2
                    },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 3
                  }}
                >
                  <View 
                    className="w-12 h-12 rounded-xl items-center justify-center mb-3" 
                    style={{
                      backgroundColor: action.bgColor
                    }}
                  >
                    {renderIcon(action.iconFamily, action.icon, 24, action.color)}
                  </View>
                  <Text className="text-gray-800 text-sm font-semibold">{action.title}</Text>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Performance Stats */}
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Performance</Text>
            <View className="flex-row bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as const).map(period => (
                <TouchableOpacity 
                  key={period} 
                  onPress={() => setSelectedPeriod(period)} 
                  className={`px-4 py-1.5 rounded-md ${selectedPeriod === period ? 'bg-white' : ''}`} 
                  activeOpacity={0.7}
                >
                  <Text className={`text-xs font-semibold capitalize ${selectedPeriod === period ? 'text-pink-600' : 'text-gray-500'}`}>
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
                  shadowOffset: {
                    width: 0,
                    height: 2
                  },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-500 text-xs">{stat.label}</Text>
                  <View className={`flex-row items-center px-2 py-0.5 rounded-full ${stat.isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Ionicons 
                      name={stat.isPositive ? 'trending-up' : 'trending-down'} 
                      size={12} 
                      color={stat.isPositive ? '#10b981' : '#ef4444'} 
                    />
                    <Text className={`text-xs ml-1 font-semibold ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
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
        {/* <View className="px-5 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Recent Activity</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text className="text-pink-600 text-sm font-semibold">View all</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl overflow-hidden">
            {recentActivities.length > 0 ? (
              recentActivities.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  className="flex-row items-center p-4 border-b border-gray-100" 
                  activeOpacity={0.7}
                >
                  <View 
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3" 
                    style={{
                      backgroundColor: `${item.color}20`
                    }}
                  >
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-sm">{item.title}</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">{item.subtitle}</Text>
                  </View>
                  <Text className="text-gray-400 text-xs">{item.time}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View className="p-8 items-center">
                <Ionicons name="time-outline" size={48} color="#d1d5db" />
                <Text className="text-gray-400 text-sm mt-2">No recent activity</Text>
              </View>
            )}
            
            {recentActivities.length > 0 && (
              <TouchableOpacity 
                className="flex-row items-center justify-center p-3 bg-gray-50" 
                activeOpacity={0.7}
              >
                <Text className="text-pink-600 text-sm font-semibold mr-1">Load More</Text>
                <Ionicons name="chevron-down" size={16} color="#eb278d" />
              </TouchableOpacity>
            )}
          </View>
        </View> */}

        {/* Performance Dashboard */}
        <View className="px-5 py-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Performance Dashboard</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Analytics')}
              className="flex-row items-center"
              activeOpacity={0.7}
            >
              <Text className="text-pink-600 text-sm font-semibold mr-1">View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#eb278d" />
            </TouchableOpacity>
           
          </View>

          {analyticsData && analyticsData.performance ? (
            <View style={{ gap: 12 }}>
              {/* Acceptance Rate */}
              <View className="bg-white rounded-2xl p-4 border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500">Acceptance Rate</Text>
                      <Text className="text-2xl font-bold text-gray-900">
                        {analyticsData.performance.acceptanceRate.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${
                    analyticsData.performance.acceptanceRate >= 80 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <Text className={`text-xs font-bold ${
                      analyticsData.performance.acceptanceRate >= 80 ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {analyticsData.performance.acceptanceRate >= 80 ? 'Excellent' : 'Good'}
                    </Text>
                  </View>
                </View>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="bg-green-500 rounded-full h-2"
                    style={{ width: `${analyticsData.performance.acceptanceRate}%` }}
                  />
                </View>
              </View>

              {/* Completion Rate */}
              <View className="bg-white rounded-2xl p-4 border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="flag" size={20} color="#8b5cf6" />
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500">Completion Rate</Text>
                      <Text className="text-2xl font-bold text-gray-900">
                        {analyticsData.performance.completionRate.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${
                    analyticsData.performance.completionRate >= 90 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <Text className={`text-xs font-bold ${
                      analyticsData.performance.completionRate >= 90 ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {analyticsData.performance.completionRate >= 90 ? 'Excellent' : 'Good'}
                    </Text>
                  </View>
                </View>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="bg-purple-500 rounded-full h-2"
                    style={{ width: `${analyticsData.performance.completionRate}%` }}
                  />
                </View>
              </View>

              {/* Response Time */}
              <View className="bg-white rounded-2xl p-4 border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="time" size={20} color="#3b82f6" />
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500">Avg Response Time</Text>
                      <Text className="text-2xl font-bold text-gray-900">
                        {analyticsData.performance.responseTime.toFixed(1)}h
                      </Text>
                    </View>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${
                    analyticsData.performance.responseTime <= 2 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <Text className={`text-xs font-bold ${
                      analyticsData.performance.responseTime <= 2 ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {analyticsData.performance.responseTime <= 2 ? 'Fast' : 'Moderate'}
                    </Text>
                  </View>
                </View>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="bg-blue-500 rounded-full h-2"
                    style={{ 
                      width: `${Math.min((24 / (analyticsData.performance.responseTime || 1)) * 100, 100)}%` 
                    }}
                  />
                </View>
              </View>

              {/* Customer Satisfaction */}
              <View className="bg-white rounded-2xl p-4 border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-pink-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="happy" size={20} color="#ec4899" />
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500">Customer Satisfaction</Text>
                      <Text className="text-2xl font-bold text-gray-900">
                        {analyticsData.performance.customerSatisfactionScore.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${
                    analyticsData.performance.customerSatisfactionScore >= 85 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <Text className={`text-xs font-bold ${
                      analyticsData.performance.customerSatisfactionScore >= 85 ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {analyticsData.performance.customerSatisfactionScore >= 85 ? 'Excellent' : 'Good'}
                    </Text>
                  </View>
                </View>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="bg-pink-500 rounded-full h-2"
                    style={{ width: `${analyticsData.performance.customerSatisfactionScore}%` }}
                  />
                </View>
              </View>

              {/* On-Time Delivery */}
              <View className="bg-white rounded-2xl p-4 border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="rocket" size={20} color="#f59e0b" />
                    </View>
                    <View>
                      <Text className="text-xs text-gray-500">On-Time Delivery</Text>
                      <Text className="text-2xl font-bold text-gray-900">
                        {analyticsData.performance.onTimeDeliveryRate.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${
                    analyticsData.performance.onTimeDeliveryRate >= 90 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <Text className={`text-xs font-bold ${
                      analyticsData.performance.onTimeDeliveryRate >= 90 ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {analyticsData.performance.onTimeDeliveryRate >= 90 ? 'Excellent' : 'Good'}
                    </Text>
                  </View>
                </View>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="bg-orange-500 rounded-full h-2"
                    style={{ width: `${analyticsData.performance.onTimeDeliveryRate}%` }}
                  />
                </View>
              </View>
            </View>
          ) : (
            /* Service Status - Fallback when analytics not available */
            servicesData.length === 0 ? (
              <TouchableOpacity className="mt-4" activeOpacity={0.7}>
                <LinearGradient 
                  colors={['#fce7f3', '#fdf2f8']} 
                  start={{
                    x: 0,
                    y: 0
                  }} 
                  end={{
                    x: 1,
                    y: 0
                  }} 
                  className="rounded-2xl p-4 border border-pink-200"
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="add-circle" size={24} color="#eb278d" />
                    <Text className="text-pink-600 font-semibold ml-2">Add Your First Service</Text>
                  </View>
                  <Text className="text-gray-500 text-xs text-center mt-2">
                    Start earning today by adding your services
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-xl bg-green-100 items-center justify-center mr-3">
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-sm">Active Services</Text>
                    <Text className="text-gray-600 text-xs mt-0.5">
                      {servicesData.length} service{servicesData.length > 1 ? 's' : ''} available
                    </Text>
                  </View>
                  <TouchableOpacity 
                    className="bg-green-500 px-4 py-2 rounded-full" 
                    activeOpacity={0.7}
                  >
                    <Text className="text-white text-xs font-semibold">Manage</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}
        </View>
      </ScrollView>

      <VendorSidebar 
        visible={sidebarVisible} 
        onClose={() => setSidebarVisible(false)} 
        userName={vendorProfile?.businessName || vendorProfile?.firstName || 'Vendor'} 
        userEmail={vendorProfile?.email || 'vendor@example.com'} 
      />
    </SafeAreaView>
  );
};

export default VendorDashboardScreen;