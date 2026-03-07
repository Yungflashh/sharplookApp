import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, Dimensions, Animated, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import ClientSidebar from '@/components/clientComponent/ClientSidebar';
import FilterModal from '@/components/FilterModal';
import VendorCard from '@/components/clientComponent/VendorCard';
import { userAPI, vendorAPI, categoriesAPI, servicesAPI, notificationAPI, messageAPI, productAPI, cartAPI, handleAPIError } from '@/api/api';
import { parseVendors, extractVendorsFromResponse, FormattedVendor, filterVendorsByQuery, sortVendors } from '@/utils/vendorUtils';
import socketService from '@/services/socket.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    email?: string;
    avatar?: string;
  };
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string
}

interface Product {
  _id: string;
  id: string;
  name: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  finalPrice: number;
  category: {
    _id: string;
    name: string;
  };
  seller: {
    _id: string;
    fullName: string;
    vendorProfile?: {
      businessName: string;
    };
  };
  stock: number;
  rating?: number;
  totalRatings?: number;
  isSponsored?: boolean;
  sponsoredUntil?: string;
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
  const [filteredVendors, setFilteredVendors] = useState<FormattedVendor[]>([]);
  const [sponsoredProducts, setSponsoredProducts] = useState<Product[]>([]);
  const [favoriteVendors, setFavoriteVendors] = useState<Set<string>>(new Set());
  const [recommendedServices, setRecommendedServices] = useState<any[]>([]);
  const [cartItemsCount, setCartItemsCount] = useState<number>(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [hasActiveFilters, setHasActiveFilters] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState({
    searchName: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    minDuration: '',
    maxDuration: '',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const categoryIconMap: { [key: string]: string } = {
    beauty: 'sparkles',
    spa: 'flower',
    skincare: 'water',
    makeup: 'brush',
    hair: 'cut',
    nails: 'hand-left',
    massage: 'fitness',
    facial: 'happy',
    others: 'ellipsis-horizontal',
  };

  useEffect(() => {
    console.log('🔌 Connecting to Socket.IO...');
    socketService.connect();

    socketService.onNewMessage((data) => {
      console.log('📩 New message received via socket:', data);
      setUnreadMessagesCount((prev) => prev + 1);
    });

    return () => {
      console.log('🧹 Cleaning up socket listeners');
      socketService.removeListener('message:new');
    };
  }, []);

  const fetchCartCount = async () => {
    try {
      const response = await cartAPI.getCart();
      console.log('Cart response:', response);

      if (response.success) {
        const cartData = response.data?.cart || response.data;
        const items = cartData?.items || [];
        
        const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        setCartItemsCount(totalItems);
        console.log('✅ Cart items count:', totalItems);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCartItemsCount(0);
    }
  };

  const fetchSponsoredProducts = async () => {
    try {
      const response = await productAPI.getSponsoredProducts(10);
      console.log('Sponsored products response:', response);

      if (response.success) {
        const productsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.products || []);
        
        setSponsoredProducts(productsData);
        console.log('✅ Loaded sponsored products:', productsData.length);
      } else {
        console.log('Sponsored products fetch unsuccessful:', response);
        setSponsoredProducts([]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Sponsored products fetch error:', apiError);
      setSponsoredProducts([]);
    }
  };

  const fetchUnreadNotificationCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      
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

  const fetchUserProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      if (response.success) {
        setUserProfile(response.data);
        console.log("This is userprof", userProfile);
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
            label: cat.name,
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
    setCategories([
      {
        id: '1',
        name: 'beauty',
        icon: 'sparkles',
        label: 'Corporate & Event Beauty',
      },
      {
        id: '2',
        name: 'spa',
        icon: 'flower',
        label: 'Body Care & Spa',
      },
      {
        id: '3',
        name: 'skincare',
        icon: 'water',
        label: 'Skincare',
      },
      {
        id: '4',
        name: 'makeup',
        icon: 'brush',
        label: 'Makeup Services',
      },
      {
        id: '5',
        name: 'others',
        icon: 'ellipsis-horizontal',
        label: 'Other Services',
      },
    ]);
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
      console.log('🔍 Fetching vendors with params:', params);
      const response = await vendorAPI.getAllVendors(params);
      console.log('All vendors response:', response);
      
      if (response.success) {
        const rawVendors = extractVendorsFromResponse(response);
        const formattedVendors = parseVendors(rawVendors);
        
        console.log('✅ Formatted vendors count:', formattedVendors.length);
        
        setAllVendors(formattedVendors);
        setFilteredVendors(formattedVendors);
        
        const isFiltered = params && Object.keys(params).length > 0;
        setHasActiveFilters(isFiltered);
      } else {
        console.log('All vendors fetch unsuccessful:', response);
        setAllVendors([]);
        setFilteredVendors([]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('All vendors fetch error:', apiError);
      setAllVendors([]);
      setFilteredVendors([]);
    }
  };

  const searchServices = async (query: string) => {
    try {
      if (!query.trim()) {
        setRecommendedServices([]);
        setSearchLoading(false);
        return;
      }
      
      setSearchLoading(true);
      
      // Try to use the search endpoint, if it fails, fall back to getAllServices with search param
      try {
        const response = await servicesAPI.searchServices({
          query: query.trim(),
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
            setSearchLoading(false);
            return;
          }
          
          console.log('✅ Found services:', servicesData.length);
          setRecommendedServices(servicesData);
        } else {
          console.log('Search services unsuccessful:', response);
          setRecommendedServices([]);
        }
      } catch (searchError: any) {
        console.log('Search endpoint failed, trying alternative approach:', searchError);
        
        // Fallback: Use getAllServices or getMyServices with search parameter
        try {
          const response = await servicesAPI.getAllServices({
            search: query.trim(),
            limit: 20,
          });
          
          console.log('Fallback search response:', response);
          
          if (response.success) {
            let servicesData = response.data;
            
            if (servicesData && !Array.isArray(servicesData)) {
              servicesData = servicesData.services || servicesData.data || [];
            }
            
            if (Array.isArray(servicesData)) {
              console.log('✅ Found services via fallback:', servicesData.length);
              setRecommendedServices(servicesData);
            } else {
              setRecommendedServices([]);
            }
          } else {
            setRecommendedServices([]);
          }
        } catch (fallbackError) {
          console.error('Fallback search also failed:', fallbackError);
          setRecommendedServices([]);
        }
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Service search error:', apiError);
      setRecommendedServices([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const searchVendors = async (query: string) => {
    try {
      if (!query.trim()) {
        setRecommendedServices([]);
        setSearchLoading(false);
        return;
      }
      
      setSearchLoading(true);
      
      const response = await servicesAPI.searchServices({
        query: query.trim(),
      });
      
      console.log('Search vendors response:', response);
      
      if (response.success) {
        let vendorsData = response.data;
        
        // Handle different response structures
        if (vendorsData && !Array.isArray(vendorsData)) {
          vendorsData = vendorsData.vendors || vendorsData.data || [];
        }
        
        if (!Array.isArray(vendorsData)) {
          console.log('Vendors data is not an array:', vendorsData);
          setRecommendedServices([]);
          setSearchLoading(false);
          return;
        }
        
        console.log('✅ Found vendors:', vendorsData.length);
        setRecommendedServices(vendorsData);
      } else {
        console.log('Search vendors unsuccessful:', response);
        setRecommendedServices([]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Vendor search error:', apiError);
      setRecommendedServices([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchCategories(),
        fetchTopVendors(),
        fetchSponsoredProducts(),
        fetchCartCount(),
        fetchUnreadNotificationCount(),
        fetchUnreadMessagesCount(),
      ]);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Dashboard focused - refreshing counts');
      
      fetchCartCount();
      fetchUnreadNotificationCount();
      fetchUnreadMessagesCount();

      if (!socketService.isSocketConnected()) {
        console.log('🔌 Reconnecting socket...');
        socketService.connect();
      }

      const interval = setInterval(() => {
        fetchCartCount();
        fetchUnreadNotificationCount();
        fetchUnreadMessagesCount();
      }, 30000);

      return () => {
        console.log('🛑 Dashboard unfocused - clearing interval');
        clearInterval(interval);
      };
    }, [])
  );

  useEffect(() => {
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
    ]).start();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        searchVendors(searchQuery);
      } else {
        setRecommendedServices([]);
        setSearchLoading(false);
      }
    }, 500);
    
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleCategorySelect = async (categoryId: string) => {
    console.log('📂 Category selected:', categoryId);
    
    if (selectedCategory === categoryId) {
      setSelectedCategory('');
      setFilteredVendors([]);
      setHasActiveFilters(false);
    } else {
      setSelectedCategory(categoryId);
      const category = categories.find((c) => c.id === categoryId);
      
      if (category) {
        console.log('🔎 Filtering by category ID:', category.id);
        await fetchAllVendors({ category: category.id });
      }
    }
  };

  const handleApplyFilters = async (newFilters: any) => {
    console.log('🎯 Applying filters:', newFilters);
    setFilters(newFilters);
    
    const params: any = {};
    
    if (newFilters.category && newFilters.category !== '') {
      const categoryToFind = categories.find(c => 
        c.id === newFilters.category || 
        c.name.toLowerCase() === newFilters.category.toLowerCase()
      );
      
      if (categoryToFind) {
        params.category = categoryToFind.id;
        setSelectedCategory(categoryToFind.id);
      }
    }
    
    if (newFilters.searchName && newFilters.searchName.trim()) {
      params.search = newFilters.searchName.trim();
    }
    
    if (newFilters.minPrice) {
      params.minPrice = newFilters.minPrice;
    }
    
    if (newFilters.maxPrice) {
      params.maxPrice = newFilters.maxPrice;
    }
    
    if (newFilters.sortBy) {
      params.sortBy = newFilters.sortBy;
      params.sortOrder = newFilters.sortOrder || 'asc';
    }
    
    console.log('📤 Fetching vendors with params:', params);
    await fetchAllVendors(params);
    setFilterModalVisible(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => {
      setRefreshing(false);
    });
  }, []);

  const handleResetFilters = () => {
    console.log('🔄 Resetting filters');
    
    setFilters({
      searchName: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      minDuration: '',
      maxDuration: '',
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
    });
    setSelectedCategory('');
    setFilteredVendors([]);
    setHasActiveFilters(false);
  };

  const handleVendorPress = async (vendorId: string) => {
    try {
      navigation.navigate('VendorDetail', { vendorId });
      console.log('Navigate to vendor:', vendorId);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleFavoriteToggle = (vendorId: string) => {
    setFavoriteVendors((prev) => {
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

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const calculateDiscount = (price: number, comparePrice?: number): number => {
    if (!comparePrice || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">
              Hello {getUserDisplayName()}
            </Text>
            <Text className="text-sm text-gray-500 mt-0.5">Welcome to LookReal</Text>
          </View>

          <View className="flex-row items-center gap-3">
            {/* Notifications */}
            <TouchableOpacity
              className="relative w-11 h-11 items-center justify-center"
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Notifications' as never)}
            >
              <Ionicons name="notifications-outline" size={24} color="#eb278d" />
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

            {/* Messages */}
          <TouchableOpacity 
  className="relative w-10 h-10 items-center justify-center" 
  activeOpacity={0.7} 
  onPress={() => navigation.navigate('ChatList')}
>
  <Ionicons name="chatbubble-ellipses-outline" size={24} color="#eb278d" />
  {unreadMessagesCount > 0 && (
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
  )}
</TouchableOpacity>

            {/* Menu */}
            <TouchableOpacity
              className="w-11 h-11 items-center justify-center"
              activeOpacity={0.7}
              onPress={() => setSidebarVisible(true)}
            >
              <Ionicons name="menu" size={28} color="#eb278d" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-3">
            <Ionicons name="search" size={20} color="#374151" />
            <TextInput
              className="flex-1 ml-2 text-sm text-gray-900"
              placeholder="Search services or vendors"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            className="w-12 h-12 rounded-2xl bg-pink-500 items-center justify-center relative"
            activeOpacity={0.7}
            onPress={() => setFilterModalVisible(true)}
            style={{
              shadowColor: '#eb278d',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Ionicons name="options-outline" size={22} color="#fff" />
            {hasActiveFilters && (
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
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
        {/* Search Results */}
        {searchQuery.trim().length > 0 && (
          <View className="px-5 py-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">
                Search Results
              </Text>
              {searchQuery.trim() && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  className="flex-row items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-sm text-pink-600 font-semibold mr-1">Clear</Text>
                  <Ionicons name="close-circle" size={16} color="#eb278d" />
                </TouchableOpacity>
              )}
            </View>

            {searchLoading ? (
              <View className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]">
                <ActivityIndicator size="large" color="#eb278d" />
                <Text className="text-gray-500 text-sm font-medium mt-4">Searching...</Text>
              </View>
            ) : recommendedServices.length > 0 ? (
              <View style={{ gap: 16 }}>
                {recommendedServices.map((vendor, index) => (
                  <TouchableOpacity
                    key={vendor._id || index}
                    className="bg-white rounded-2xl p-4"
                    activeOpacity={0.7}
                    onPress={() => {
                      if (vendor._id) {
                        navigation.navigate('VendorDetail', { vendorId: vendor._id });
                      }
                    }}
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                  >
                    {/* Vendor Header */}
                    <View className="flex-row items-center mb-3">
                      <View className="w-14 h-14 rounded-full bg-pink-100 items-center justify-center mr-3 overflow-hidden">
                        {vendor.avatar ? (
                          <Image
                            source={{ uri: vendor.avatar }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="person" size={24} color="#eb278d" />
                        )}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="text-base font-bold text-gray-900 mr-2">
                            {vendor.businessName}
                          </Text>
                          {vendor.isVerified && (
                            <View className="w-4 h-4 rounded-full bg-blue-500 items-center justify-center">
                              <Ionicons name="checkmark" size={10} color="#fff" />
                            </View>
                          )}
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="star" size={12} color="#fbbf24" />
                          <Text className="text-xs text-gray-600 ml-1">
                            {vendor.rating?.toFixed(1) || '0.0'}
                          </Text>
                          <Text className="text-xs text-gray-400 ml-1">
                            ({vendor.totalReviews || 0} reviews)
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </View>

                    {/* Services */}
                    {vendor.services && vendor.services.length > 0 && (
                      <View className="border-t border-gray-100 pt-3">
                        <Text className="text-xs text-gray-500 font-semibold mb-2">
                          Services ({vendor.services.length})
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 8 }}
                        >
                          {vendor.services.slice(0, 3).map((service: any, idx: number) => (
                            <View
                              key={service._id || idx}
                              className="bg-gray-50 rounded-lg p-2 min-w-[120px]"
                            >
                              <Text className="text-xs font-semibold text-gray-900 mb-1" numberOfLines={1}>
                                {service.name}
                              </Text>
                              <Text className="text-xs font-bold text-pink-600">
                                ₦{service.basePrice?.toLocaleString() || '0'}
                              </Text>
                            </View>
                          ))}
                          {vendor.services.length > 3 && (
                            <View className="bg-pink-50 rounded-lg p-2 min-w-[80px] items-center justify-center">
                              <Text className="text-xs font-bold text-pink-600">
                                +{vendor.services.length - 3} more
                              </Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]">
                <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
                  <Ionicons name="search-outline" size={48} color="#d1d5db" />
                </View>
                <Text className="text-gray-900 text-base font-semibold mb-2">No results found</Text>
                <Text className="text-gray-400 text-sm text-center">
                  Try searching with different keywords
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Categories - Only show when not searching */}
        {!searchQuery.trim() && (
          <Animated.View
            className="px-5 py-6"
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={category.id}
                  className="items-center"
                  style={{ width: 70 }}
                  activeOpacity={0.7}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  <View
                    className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${
                      selectedCategory === category.id ? 'bg-pink-100' : 'bg-white'
                    }`}
                    style={{
                      borderWidth: 2,
                      borderColor: selectedCategory === category.id ? '#eb278d' : '#f472b6',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={26}
                      color={selectedCategory === category.id ? '#eb278d' : '#374151'}
                    />
                  </View>
                  <Text
                    className="text-[10px] text-gray-700 text-center font-medium leading-3"
                    numberOfLines={3}
                    style={{ width: 70 }}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Active Filters Badge - Only show when not searching */}
        {!searchQuery.trim() && hasActiveFilters && filteredVendors.length > 0 && (
          <View className="px-5 mb-4">
            <View className="flex-row items-center justify-between bg-pink-50 border border-pink-200 rounded-2xl p-3">
              <View className="flex-row items-center flex-1">
                <Ionicons name="funnel" size={16} color="#eb278d" />
                <Text className="text-pink-700 text-sm font-bold ml-2">
                  Showing {filteredVendors.length} filtered result{filteredVendors.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleResetFilters}
                className="bg-pink-500 px-3 py-1.5 rounded-full"
                activeOpacity={0.7}
              >
                <Text className="text-white text-xs font-bold">Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Filtered Vendors Section - Only show when not searching */}
        {!searchQuery.trim() && hasActiveFilters && filteredVendors.length > 0 && (
          <View className="px-5 mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 rounded-full bg-pink-100 items-center justify-center mr-2">
                <Ionicons name="funnel" size={16} color="#eb278d" />
              </View>
              <Text className="text-xl font-bold text-gray-900">Filtered Vendors</Text>
            </View>

            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {filteredVendors.map((vendor) => (
                <View key={vendor.id} style={{ width: (SCREEN_WIDTH - 52) / 2 }}>
                  <VendorCard
                    vendor={{
                      id: vendor.id,
                      businessName: vendor.businessName,
                      image: vendor.image,
                      service: vendor.service,
                      rating: vendor.rating,
                      reviews: vendor.reviews,
                      isVerified: vendor.isVerified,
                      vendorType: vendor.vendorType,
                    }}
                    width={(SCREEN_WIDTH - 52) / 2}
                    onPress={() => handleVendorPress(vendor.id)}
                    onFavoritePress={() => handleFavoriteToggle(vendor.id)}
                    isFavorite={favoriteVendors.has(vendor.id)}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No Results Message - Only show when not searching */}
        {!searchQuery.trim() && hasActiveFilters && filteredVendors.length === 0 && (
          <View className="px-5 mb-6">
            <View className="bg-white rounded-3xl p-8 items-center justify-center">
              <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="search-outline" size={48} color="#d1d5db" />
              </View>
              <Text className="text-gray-900 text-lg font-bold mb-2">No Vendors Found</Text>
              <Text className="text-gray-400 text-sm text-center mb-4">
                No vendors match your current filters
              </Text>
              <TouchableOpacity
                onPress={handleResetFilters}
                className="bg-pink-500 px-6 py-3 rounded-full"
                activeOpacity={0.7}
              >
                <Text className="text-white text-sm font-bold">Clear Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Top Vendors - Only show when no filters active and not searching */}
        {!searchQuery.trim() && !hasActiveFilters && (
          <View className="py-6">
            <View className="flex-row items-center justify-between px-5 mb-4">
              <View>
                <Text className="text-xl font-bold text-gray-900">Top Vendors</Text>
                <Text className="text-xs text-gray-500 mt-0.5">Highly rated professionals</Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center"
                activeOpacity={0.7}
                onPress={() => navigation.navigate('AllVendors')}
              >
                <Text className="text-sm text-pink-600 font-semibold mr-1">See All</Text>
                <Ionicons name="chevron-forward" size={16} color="#eb278d" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 20 }}
            >
              {topVendors.length > 0 ? (
                topVendors.map((vendor, index) => (
                  <Animated.View
                    key={vendor.id}
                    className="mr-4"
                    style={{
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateY: slideAnim.interpolate({
                            inputRange: [0, 30],
                            outputRange: [0, index * 5],
                          }),
                        },
                      ],
                    }}
                  >
                    <VendorCard
                      vendor={{
                        id: vendor.id,
                        businessName: vendor.businessName,
                        image: vendor.image,
                        service: vendor.service,
                        rating: vendor.rating,
                        reviews: vendor.reviews,
                        isVerified: vendor.isVerified,
                        vendorType: vendor.vendorType,
                      }}
                      width={SCREEN_WIDTH * 0.45}
                      onPress={() => handleVendorPress(vendor.id)}
                      onFavoritePress={() => handleFavoriteToggle(vendor.id)}
                      isFavorite={favoriteVendors.has(vendor.id)}
                    />
                  </Animated.View>
                ))
              ) : (
                <View className="items-center justify-center py-8 px-5">
                  <Ionicons name="people-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-400 text-sm mt-2">No vendors available</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Sponsored Products - Only show when no filters active and not searching */}
        {!searchQuery.trim() && !hasActiveFilters && sponsoredProducts.length > 0 && (
          <View className="py-6">
            <View className="flex-row items-center justify-between px-5 mb-4">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-2">
                  <Ionicons name="star" size={16} color="#a855f7" />
                </View>
                <View>
                  <Text className="text-xl font-bold text-gray-900">Sponsored Products</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">Featured marketplace items</Text>
                </View>
              </View>
              <TouchableOpacity
                className="flex-row items-center"
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Marketplace')}
              >
                <Text className="text-sm text-pink-600 font-semibold mr-1">See All</Text>
                <Ionicons name="chevron-forward" size={16} color="#eb278d" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 20 }}
            >
              {sponsoredProducts.map((product, index) => {
                const discount = calculateDiscount(product.price, product.compareAtPrice);
                const averageRating = product.rating || 0;

                return (
                  <TouchableOpacity
                    key={product._id}
                    onPress={() => handleProductPress(product._id)}
                    activeOpacity={0.7}
                    className="mr-4"
                    style={{ width: SCREEN_WIDTH * 0.45 }}
                  >
                    <View
                      className="bg-white rounded-3xl overflow-hidden"
                      style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                      }}
                    >
                      {/* Product Image */}
                      <View className="relative">
                        <Image
                          source={{
                            uri: product.images?.[0] || 'https://via.placeholder.com/150',
                          }}
                          className="w-full h-48"
                          resizeMode="cover"
                        />

                        {/* Sponsored Badge */}
                        <View className="absolute top-3 left-3">
                          <LinearGradient
                            colors={['#a855f7', '#9333ea']}
                            className="px-2.5 py-1 rounded-full flex-row items-center"
                            style={{
                              shadowColor: '#a855f7',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.3,
                              shadowRadius: 4,
                              elevation: 4,
                            }}
                          >
                            <Ionicons name="star" size={10} color="#fff" />
                            <Text className="text-white text-[10px] font-bold ml-1">
                              SPONSORED
                            </Text>
                          </LinearGradient>
                        </View>

                        {/* Discount Badge */}
                        {discount > 0 && (
                          <View className="absolute top-3 right-3 bg-red-500 px-2 py-1 rounded-full">
                            <Text className="text-white text-xs font-bold">-{discount}%</Text>
                          </View>
                        )}

                        {/* Stock Warning */}
                        {product.stock === 0 && (
                          <View className="absolute bottom-0 left-0 right-0 bg-black/70 py-1.5">
                            <Text className="text-white text-xs font-bold text-center">
                              OUT OF STOCK
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Product Info */}
                      <View className="p-4">
                        <Text className="text-gray-900 text-base font-bold mb-1" numberOfLines={2}>
                          {product.name}
                        </Text>

                        <Text className="text-gray-500 text-xs mb-2" numberOfLines={1}>
                          {product.seller?.vendorProfile?.businessName || product.seller?.fullName}
                        </Text>

                        {/* Rating */}
                        {averageRating > 0 && (
                          <View className="flex-row items-center mb-2">
                            <Ionicons name="star" size={12} color="#fbbf24" />
                            <Text className="text-gray-600 text-xs ml-1">
                              {averageRating.toFixed(1)}
                            </Text>
                            {product.totalRatings ? (
                              <Text className="text-gray-400 text-xs ml-1">
                                ({product.totalRatings})
                              </Text>
                            ) : null}
                          </View>
                        )}

                        {/* Price */}
                        <View className="flex-row items-center justify-between">
                          <View>
                            <Text className="text-pink-600 text-lg font-bold">
                              {formatPrice(product.finalPrice || product.price)}
                            </Text>
                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                              <Text className="text-gray-400 text-xs line-through">
                                {formatPrice(product.compareAtPrice)}
                              </Text>
                            )}
                          </View>

                          <View className="w-8 h-8 rounded-full bg-pink-500 items-center justify-center">
                            <Ionicons name="cart" size={16} color="#fff" />
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Sidebar */}
      <ClientSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userName={getUserDisplayName()}
        userEmail={userProfile?.user?.email || userProfile?.email || 'user@example.com'}
        userAvatar={userProfile?.user?.avatar}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        categories={categories.map((c) => ({
          _id: c.id,
          name: c.name,
        }))}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </SafeAreaView>
  );
};

export default ClientDashboardScreen;