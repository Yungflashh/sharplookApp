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

  // Keep only one product per seller/vendor (used for the recommended fallback)
  const dedupeProductsBySeller = (products: any[]): any[] => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const p of products) {
      const sellerId = p?.seller?._id || p?.seller?.id || p?.seller || p?.vendor?._id || p?.vendor?.id || p?.vendor;
      const key = String(sellerId || p?._id || '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  };

  // Only show approved, active, non-deleted, in-stock products in the fallback
  const onlyShowableProducts = (products: any[]): any[] =>
    products.filter(p => {
      if (!p) return false;
      if (p.isDeleted === true) return false;
      if (p.isActive === false) return false;
      if (p.approvalStatus && p.approvalStatus !== 'approved') return false;
      // 'status' can be either an approval-style or lifecycle string — block known bad ones
      if (p.status && ['pending', 'rejected', 'draft', 'archived', 'inactive'].includes(String(p.status).toLowerCase())) return false;
      // Must have at least one image to show in the card
      if (!Array.isArray(p.images) || p.images.length === 0) return false;
      return true;
    });

  const fetchSponsoredProducts = async () => {
    const fetchFallback = async () => {
      const fallbackRes = await productAPI.getAllProducts({ limit: 50, sortBy: 'rating', sortOrder: 'desc' });
      if (fallbackRes.success) {
        const fallbackData = Array.isArray(fallbackRes.data)
          ? fallbackRes.data
          : (fallbackRes.data.products || []);
        const showable = onlyShowableProducts(fallbackData);
        const deduped = dedupeProductsBySeller(showable).slice(0, 10);
        setSponsoredProducts(deduped);
        console.log('✅ Loaded fallback recommended products (filtered + deduped):', deduped.length);
      } else {
        setSponsoredProducts([]);
      }
    };

    try {
      const response = await productAPI.getSponsoredProducts(10);
      console.log('Sponsored products response:', response);

      let productsData: any[] = [];
      if (response.success) {
        productsData = Array.isArray(response.data)
          ? response.data
          : (response.data.products || []);
      }

      if (productsData.length > 0) {
        setSponsoredProducts(productsData);
        console.log('✅ Loaded sponsored products:', productsData.length);
      } else {
        // Fallback — no sponsored products, fetch recommended (all products) instead
        console.log('ℹ️ No sponsored products, falling back to recommended');
        await fetchFallback();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Sponsored products fetch error:', apiError);
      try { await fetchFallback(); } catch { setSponsoredProducts([]); }
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

  // Keep only one entry per vendor (used for the all-vendors fallback)
  const dedupeVendors = (vendors: any[]): any[] => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const v of vendors) {
      const id = v?.id || v?._id || v?.vendorId || v?.userId;
      const key = String(id || '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  };

  // Only keep vendors that have a profile image
  const onlyWithImage = (vendors: any[]): any[] =>
    vendors.filter(v => {
      const img = v?.image || v?.avatar || v?.profileImage || v?.vendorProfile?.profileImage;
      return typeof img === 'string' && img.trim().length > 0;
    });

  // Only keep vendors that have at least one service listing
  const onlyWithServices = (vendors: any[]): any[] =>
    vendors.filter(v => (v?.totalServices ?? 0) > 0);

  const fetchTopVendors = async () => {
    const fetchFallback = async () => {
      const fallbackRes = await vendorAPI.getAllVendors({ limit: 50 });
      if (fallbackRes.success) {
        const rawVendors = extractVendorsFromResponse(fallbackRes);
        const formattedVendors = parseVendors(rawVendors);
        const sorted = sortVendors(formattedVendors, 'rating', 'desc');
        const deduped = dedupeVendors(sorted);
        const withImage = onlyWithServices(onlyWithImage(deduped)).slice(0, 10);
        setTopVendors(withImage);
        console.log('✅ Loaded fallback vendors (deduped + image + services):', withImage.length);
      } else {
        setTopVendors([]);
      }
    };

    try {
      const response = await vendorAPI.getTopVendors();
      console.log('Top vendors response:', response);

      let sortedVendors: any[] = [];
      if (response.success) {
        const rawVendors = extractVendorsFromResponse(response);
        const formattedVendors = parseVendors(rawVendors);
        sortedVendors = sortVendors(formattedVendors, 'rating', 'desc');
      }

      // Always filter to vendors with both a profile image and at least one service
      const sortedWithImage = onlyWithServices(onlyWithImage(dedupeVendors(sortedVendors)));

      if (sortedWithImage.length > 0) {
        setTopVendors(sortedWithImage);
      } else {
        // Fallback — no top vendors with images, use the all-vendors endpoint
        console.log('ℹ️ No top vendors with images, falling back to all vendors');
        await fetchFallback();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Top vendors fetch error:', apiError);
      try { await fetchFallback(); } catch { setTopVendors([]); }
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

      // Search both services/vendors API and also filter local vendors
      const [serviceSearchRes] = await Promise.all([
        servicesAPI.searchServices({ query: query.trim() }).catch(() => ({ success: false, data: [] })),
      ]);

      let vendorsFromSearch: any[] = [];

      if (serviceSearchRes.success) {
        let vendorsData = serviceSearchRes.data;
        if (vendorsData && !Array.isArray(vendorsData)) {
          vendorsData = vendorsData.vendors || vendorsData.data || [];
        }
        if (Array.isArray(vendorsData)) {
          vendorsFromSearch = vendorsData;
        }
      }

      // Also filter locally loaded vendors by search query
      const q = query.trim().toLowerCase();
      const localMatches = allVendors.filter(v =>
        v.businessName.toLowerCase().includes(q) ||
        v.service?.toLowerCase().includes(q) ||
        v.vendorType?.toLowerCase().includes(q)
      );

      // Merge results, avoiding duplicates
      const seenIds = new Set(vendorsFromSearch.map((v: any) => v._id));
      const localUnique = localMatches.filter(v => !seenIds.has(v.id)).map(v => ({
        _id: v.id,
        businessName: v.businessName,
        avatar: v.image,
        rating: v.rating,
        totalReviews: v.reviews,
        isVerified: v.isVerified,
        vendorType: v.vendorType,
        services: [],
      }));

      const combined = [...vendorsFromSearch, ...localUnique];
      console.log('✅ Search results:', combined.length, '(API:', vendorsFromSearch.length, '+ local:', localUnique.length, ')');
      setRecommendedServices(combined);
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
          <View className="pt-6 pb-4">
            {/* Section header */}
            <View className="flex-row items-center justify-between px-5 mb-4">
              <View>
                <Text className="text-[19px] font-bold text-gray-900 tracking-tight">For you</Text>
                <Text className="text-[12px] text-gray-500 mt-0.5">Picked from the marketplace</Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center"
                activeOpacity={0.6}
                onPress={() => navigation.navigate('Marketplace')}
              >
                <Text className="text-[13px] text-pink-600 font-semibold mr-0.5">See all</Text>
                <Ionicons name="chevron-forward" size={15} color="#eb278d" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 24 }}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH * 0.46 + 14}
              snapToAlignment="start"
            >
              {sponsoredProducts.map((product) => {
                const discount = calculateDiscount(product.price, product.compareAtPrice);
                const averageRating = product.rating || 0;
                const cardWidth = SCREEN_WIDTH * 0.46;
                const sellerName = product.seller?.vendorProfile?.businessName || product.seller?.fullName;

                return (
                  <TouchableOpacity
                    key={product._id}
                    onPress={() => handleProductPress(product._id)}
                    activeOpacity={0.85}
                    style={{ width: cardWidth, marginRight: 14 }}
                  >
                    <View
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: 18,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#F1F2F4',
                        shadowColor: '#0F172A',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.06,
                        shadowRadius: 12,
                        elevation: 3,
                      }}
                    >
                      {/* Image area */}
                      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#F8F9FB' }}>
                        <Image
                          source={{ uri: product.images?.[0] || 'https://via.placeholder.com/300' }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />

                        {/* Discount pill (top-left) */}
                        {discount > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 10, left: 10,
                              backgroundColor: '#EF4444',
                              paddingHorizontal: 8, paddingVertical: 3,
                              borderRadius: 999,
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>
                              -{discount}%
                            </Text>
                          </View>
                        )}

                        {/* Sponsored dot (top-right) — minimal */}
                        {product.isSponsored && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 10, right: 10,
                              backgroundColor: 'rgba(255,255,255,0.95)',
                              paddingHorizontal: 7, paddingVertical: 3,
                              borderRadius: 999,
                              flexDirection: 'row', alignItems: 'center',
                            }}
                          >
                            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#a855f7', marginRight: 4 }} />
                            <Text style={{ color: '#6B21A8', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 }}>
                              AD
                            </Text>
                          </View>
                        )}

                        {/* Out of stock overlay */}
                        {product.stock === 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              left: 0, right: 0, bottom: 0,
                              backgroundColor: 'rgba(15,23,42,0.78)',
                              paddingVertical: 6,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
                              OUT OF STOCK
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Info */}
                      <View style={{ padding: 12 }}>
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A', letterSpacing: -0.1 }}
                        >
                          {product.name}
                        </Text>

                        {sellerName ? (
                          <Text
                            numberOfLines={1}
                            style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '500' }}
                          >
                            {sellerName}
                          </Text>
                        ) : null}

                        {/* Rating row */}
                        {averageRating > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                            <Ionicons name="star" size={11} color="#F59E0B" />
                            <Text style={{ fontSize: 11, color: '#475569', marginLeft: 3, fontWeight: '600' }}>
                              {averageRating.toFixed(1)}
                            </Text>
                            {product.totalRatings ? (
                              <Text style={{ fontSize: 10, color: '#94A3B8', marginLeft: 3 }}>
                                ({product.totalRatings})
                              </Text>
                            ) : null}
                          </View>
                        )}

                        {/* Price + cart row */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 10,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={1}
                              style={{ fontSize: 15, fontWeight: '800', color: '#eb278d', letterSpacing: -0.3 }}
                            >
                              {formatPrice(product.finalPrice || product.price)}
                            </Text>
                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                              <Text
                                numberOfLines={1}
                                style={{ fontSize: 10, color: '#CBD5E1', textDecorationLine: 'line-through', marginTop: 1 }}
                              >
                                {formatPrice(product.compareAtPrice)}
                              </Text>
                            )}
                          </View>

                          <View
                            style={{
                              width: 30, height: 30, borderRadius: 15,
                              backgroundColor: '#FDF2F8',
                              borderWidth: 1, borderColor: '#FBCFE8',
                              alignItems: 'center', justifyContent: 'center',
                              marginLeft: 8,
                            }}
                          >
                            <Ionicons name="add" size={16} color="#eb278d" />
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