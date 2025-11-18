import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, Dimensions, Animated, Platform, RefreshControl, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import ClientSidebar from '@/components/clientComponent/ClientSidebar';
import FilterModal from '@/components/FilterModal';
import VendorCard from '@/components/clientComponent/VendorCard';
import { userAPI, vendorAPI, categoriesAPI, servicesAPI, notificationAPI, handleAPIError } from '@/api/api';
import { parseVendors, extractVendorsFromResponse, FormattedVendor, filterVendorsByQuery, sortVendors } from '@/utils/vendorUtils';
const {
  width: SCREEN_WIDTH
} = Dimensions.get('window');
interface Category {
  id: string;
  name: string;
  icon: string;
  label: string;
}
interface UserProfile {
  user?: {
    firstName?: string;
    lastName?: string;
  };
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}
type ClientDashboardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
const ClientDashboardScreen: React.FC = () => {
  const navigation = useNavigation<ClientDashboardScreenNavigationProp>();
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topVendors, setTopVendors] = useState<FormattedVendor[]>([]);
  const [allVendors, setAllVendors] = useState<FormattedVendor[]>([]);
  const [favoriteVendors, setFavoriteVendors] = useState<Set<string>>(new Set());
  const [recommendedServices, setRecommendedServices] = useState<any[]>([]);
  const [cartItemsCount, setCartItemsCount] = useState<number>(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [filters, setFilters] = useState({
    searchName: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    minDuration: '',
    maxDuration: '',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const categoryIconMap: {
    [key: string]: string;
  } = {
    'beauty': 'sparkles',
    'spa': 'flower',
    'skincare': 'water',
    'makeup': 'brush',
    'hair': 'cut',
    'nails': 'hand-left',
    'massage': 'fitness',
    'facial': 'happy',
    'others': 'ellipsis-horizontal'
  };
  const fetchUnreadNotificationCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      console.log('Unread count response:', response);
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
  const fetchUserProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response.success) {
        setUserProfile(response.data);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Profile fetch error:', apiError);
    }
  };
  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getActiveCategories();
      console.log('Categories response:', response);
      if (response.success) {
        let categoriesData = response.data;
        if (categoriesData && !Array.isArray(categoriesData)) {
          categoriesData = categoriesData.categories || categoriesData.data || [];
        }
        if (!Array.isArray(categoriesData)) {
          console.log('Categories data is not an array:', categoriesData);
          setFallbackCategories();
          return;
        }
        if (categoriesData.length > 0) {
          const formattedCategories: Category[] = categoriesData.map((cat: any) => ({
            id: cat._id || cat.id,
            name: cat.name.toLowerCase(),
            icon: categoryIconMap[cat.name.toLowerCase()] || 'ellipsis-horizontal',
            label: cat.name
          }));
          setCategories(formattedCategories);
        } else {
          setFallbackCategories();
        }
      } else {
        console.log('Categories fetch unsuccessful:', response);
        setFallbackCategories();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Categories fetch error:', apiError);
      setFallbackCategories();
    }
  };
  const setFallbackCategories = () => {
    setCategories([{
      id: '1',
      name: 'beauty',
      icon: 'sparkles',
      label: 'Corporate & Event Beauty'
    }, {
      id: '2',
      name: 'spa',
      icon: 'flower',
      label: 'Body Care & Spa'
    }, {
      id: '3',
      name: 'skincare',
      icon: 'water',
      label: 'Skincare'
    }, {
      id: '4',
      name: 'makeup',
      icon: 'brush',
      label: 'Makeup Services'
    }, {
      id: '5',
      name: 'others',
      icon: 'ellipsis-horizontal',
      label: 'Other Services'
    }]);
  };
  const fetchTopVendors = async () => {
    try {
      const response = await vendorAPI.getTopVendors();
      console.log('Top vendors response:', response);
      if (response.success) {
        const rawVendors = extractVendorsFromResponse(response);
        const formattedVendors = parseVendors(rawVendors);
        const sortedVendors = sortVendors(formattedVendors, 'rating', 'desc');
        setTopVendors(sortedVendors);
      } else {
        console.log('Top vendors fetch unsuccessful:', response);
        setTopVendors([]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Top vendors fetch error:', apiError);
      setTopVendors([]);
    }
  };
  const fetchAllVendors = async (params?: any) => {
    try {
      const response = await vendorAPI.getAllVendors(params);
      console.log('All vendors response:', response);
      if (response.success) {
        const rawVendors = extractVendorsFromResponse(response);
        const formattedVendors = parseVendors(rawVendors);
        setAllVendors(formattedVendors);
      } else {
        console.log('All vendors fetch unsuccessful:', response);
        setAllVendors([]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('All vendors fetch error:', apiError);
      setAllVendors([]);
    }
  };
  const searchServices = async (query: string) => {
    try {
      if (!query.trim()) {
        setRecommendedServices([]);
        return;
      }
      const response = await servicesAPI.searchServices({
        query: query.trim()
      });
      console.log('Search services response:', response);
      if (response.success) {
        let servicesData = response.data;
        if (servicesData && !Array.isArray(servicesData)) {
          servicesData = servicesData.services || servicesData.data || [];
        }
        if (!Array.isArray(servicesData)) {
          console.log('Services data is not an array:', servicesData);
          setRecommendedServices([]);
          return;
        }
        setRecommendedServices(servicesData);
      } else {
        console.log('Search services unsuccessful:', response);
        setRecommendedServices([]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Service search error:', apiError);
      setRecommendedServices([]);
    }
  };
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUserProfile(), fetchCategories(), fetchTopVendors(), fetchAllVendors(), fetchUnreadNotificationCount()]);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDashboardData();
  }, []);
  useFocusEffect(useCallback(() => {
    fetchUnreadNotificationCount();
    const interval = setInterval(fetchUnreadNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []));
  useEffect(() => {
    Animated.parallel([Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }), Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true
    })]).start();
  }, []);
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        searchServices(searchQuery);
      } else {
        setRecommendedServices([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      fetchAllVendors({
        category: category.name
      });
    } else {
      fetchAllVendors();
    }
  };
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => {
      setRefreshing(false);
    });
  }, []);
  const handleApplyFilters = async (newFilters: any) => {
    setFilters(newFilters);
    const params: any = {};
    if (newFilters.category) {
      params.category = newFilters.category;
    }
    if (newFilters.minPrice || newFilters.maxPrice) {}
    await fetchAllVendors(params);
  };
  const handleResetFilters = () => {
    setFilters({
      searchName: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      minDuration: '',
      maxDuration: '',
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setSelectedCategory('');
    fetchAllVendors();
  };
  const handleVendorPress = async (vendorId: string) => {
    try {
      navigation.navigate('VendorDetail', {
        vendorId
      });
      console.log('Navigate to vendor:', vendorId);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };
  const handleFavoriteToggle = (vendorId: string) => {
    setFavoriteVendors(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(vendorId)) {
        newFavorites.delete(vendorId);
      } else {
        newFavorites.add(vendorId);
      }
      return newFavorites;
    });
    console.log('Toggle favorite for vendor:', vendorId);
  };
  const renderStars = (rating: number) => {
    return <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= rating ? 'star' : 'star-outline'} size={14} color={star <= rating ? '#fbbf24' : '#d1d5db'} />)}
      <Text className="text-xs text-gray-500 ml-1.5">{rating.toFixed(1)}</Text>
    </View>;
  };
  const getUserDisplayName = (): string => {
    if (userProfile?.user?.firstName) {
      return userProfile.user.firstName;
    }
    if (userProfile?.firstName) {
      return userProfile.firstName;
    }
    return 'User';
  };
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
    {}
    <View className="bg-white px-5 pt-4 pb-3">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900">
            Hello {getUserDisplayName()}
          </Text>
          <Text className="text-sm text-gray-500 mt-0.5">Welcome to Sharplook</Text>
        </View>

        <View className="flex-row items-center gap-3">
          {}
          <TouchableOpacity className="relative w-11 h-11 items-center justify-center" activeOpacity={0.7} onPress={() => navigation.navigate('Notifications' as never)}>
            <Ionicons name="notifications-outline" size={24} color="#eb278d" />
            {unreadNotificationCount > 0 && <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-pink-500 rounded-full items-center justify-center px-1" style={{
              shadowColor: '#eb278d',
              shadowOffset: {
                width: 0,
                height: 2
              },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 4
            }}>
              <Text className="text-white text-[10px] font-bold">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </Text>
            </View>}
          </TouchableOpacity>

          {}
          <TouchableOpacity className="relative w-11 h-11 items-center justify-center" activeOpacity={0.7} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#eb278d" />
            <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full" />
          </TouchableOpacity>

          {}
          <TouchableOpacity className="relative w-11 h-11 items-center justify-center" activeOpacity={0.7} onPress={() => navigation.navigate('Cart')}>
            <Ionicons name="cart-outline" size={26} color="#eb278d" />
            {cartItemsCount > 0 && <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-pink-500 rounded-full items-center justify-center px-1" style={{
              shadowColor: '#eb278d',
              shadowOffset: {
                width: 0,
                height: 2
              },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 4
            }}>
              <Text className="text-white text-[10px] font-bold">
                {cartItemsCount > 99 ? '99+' : cartItemsCount}
              </Text>
            </View>}
          </TouchableOpacity>

          {}
          <TouchableOpacity className="w-11 h-11 items-center justify-center" activeOpacity={0.7} onPress={() => setSidebarVisible(true)}>
            <Ionicons name="menu" size={28} color="#eb278d" />
          </TouchableOpacity>
        </View>
      </View>

      {}
      <View className="flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-3">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput className="flex-1 ml-2 text-sm text-gray-900" placeholder="Search Shop or Vendor" placeholderTextColor="#9ca3af" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>}
        </View>

        <TouchableOpacity className="w-12 h-12 rounded-2xl bg-pink-500 items-center justify-center" activeOpacity={0.7} onPress={() => setFilterModalVisible(true)} style={{
          shadowColor: '#eb278d',
          shadowOffset: {
            width: 0,
            height: 4
          },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6
        }}>
          <Ionicons name="options-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>

    {}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
      paddingBottom: 100
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" colors={['#eb278d']} />}>
      {}
      <Animated.View className="px-5 py-6" style={{
        opacity: fadeAnim,
        transform: [{
          translateY: slideAnim
        }]
      }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
          gap: 12
        }}>
          {categories.map((category, index) => <TouchableOpacity key={category.id} className="items-center" style={{
            width: 70
          }} activeOpacity={0.7} onPress={() => handleCategorySelect(category.id)}>
            <View className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${selectedCategory === category.id ? 'bg-pink-100' : 'bg-white'}`} style={{
              borderWidth: 2,
              borderColor: selectedCategory === category.id ? '#eb278d' : '#eb278c5d',
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2
              },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2
            }}>
              <Ionicons name={category.icon as any} size={24} color={selectedCategory === category.id ? '#eb278d' : '#9ca3af'} />
            </View>
            <Text className="text-[10px] text-gray-700 text-center font-medium leading-3" numberOfLines={3} style={{
              width: 70
            }}>
              {category.label}
            </Text>
          </TouchableOpacity>)}
        </ScrollView>
      </Animated.View>

      {}
      <View className="py-6">
        <View className="flex-row items-center justify-between px-5 mb-4">
          <View>
            <Text className="text-xl font-bold text-gray-900">Top Vendors</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Highly rated professionals</Text>
          </View>
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.7} onPress={() => navigation.navigate('AllVendors')}>
            <Text className="text-sm text-pink-600 font-semibold mr-1">See All</Text>
            <Ionicons name="chevron-forward" size={16} color="#eb278d" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
          paddingHorizontal: 20,
          paddingRight: 20
        }}>
          {topVendors.length > 0 ? topVendors.map((vendor, index) => <Animated.View key={vendor.id} className="mr-4" style={{
            opacity: fadeAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, index * 5]
              })
            }]
          }}>
            <VendorCard vendor={{
              id: vendor.id,
              businessName: vendor.businessName,
              image: vendor.image,
              service: vendor.service,
              rating: vendor.rating,
              reviews: vendor.reviews,
              isVerified: vendor.isVerified,
              vendorType: vendor.vendorType
            }} width={SCREEN_WIDTH * 0.45} onPress={() => handleVendorPress(vendor.id)} onFavoritePress={() => handleFavoriteToggle(vendor.id)} isFavorite={favoriteVendors.has(vendor.id)} />
          </Animated.View>) : <View className="items-center justify-center py-8 px-5">
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 text-sm mt-2">No vendors available</Text>
          </View>}
        </ScrollView>
      </View>

      {}
      {(searchQuery.trim() || recommendedServices.length > 0) && <View className="px-5 py-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">
          {searchQuery.trim() ? 'Search Results' : 'Recommended Services'}
        </Text>

        {recommendedServices.length > 0 ? <View className="space-y-3">
          {recommendedServices.map((service, index) => <TouchableOpacity key={service._id || index} className="bg-white rounded-2xl p-4 flex-row items-center" activeOpacity={0.7} style={{
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2
            },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3
          }}>
            <View className="w-16 h-16 rounded-xl bg-pink-100 items-center justify-center mr-3">
              <Ionicons name="sparkles" size={28} color="#eb278d" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 mb-1">
                {service.name}
              </Text>
              <Text className="text-xs text-gray-500 mb-2" numberOfLines={1}>
                {service.description}
              </Text>
              <Text className="text-sm font-bold text-pink-600">
                ₦{service.basePrice?.toLocaleString()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>)}
        </View> : searchQuery.trim() ? <View className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]">
          <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Ionicons name="search-outline" size={48} color="#d1d5db" />
          </View>
          <Text className="text-gray-400 text-sm font-medium">No results found</Text>
          <Text className="text-gray-300 text-xs mt-1">Try different keywords</Text>
        </View> : <View className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]">
          <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Ionicons name="cube-outline" size={48} color="#d1d5db" />
          </View>
          <Text className="text-gray-400 text-sm font-medium">
            No recommended services
          </Text>
          <Text className="text-gray-300 text-xs mt-1">Check back later for updates</Text>
        </View>}
      </View>}
    </ScrollView>

    {}
    <ClientSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} userName={getUserDisplayName()} userEmail={userProfile?.user?.email || userProfile?.email || 'user@example.com'} />

    {}
    <FilterModal visible={filterModalVisible} onClose={() => setFilterModalVisible(false)} filters={filters} categories={categories.map(c => ({
      _id: c.id,
      name: c.name
    }))} onApply={handleApplyFilters} onReset={handleResetFilters} />
  </SafeAreaView>;
};
export default ClientDashboardScreen;