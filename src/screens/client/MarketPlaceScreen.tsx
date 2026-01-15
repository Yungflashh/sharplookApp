import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, cartAPI, categoriesAPI, handleAPIError } from '@/api/api';

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (width - 48) / 2;

type MarketplaceNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

interface Product {
  _id: string;
  name: string;
  description: string;
  shortDescription?: string;
  images: string[];
  price: number;
  finalPrice: number;
  compareAtPrice?: number;
  stock: number;
  rating: number;
  totalRatings: number;
  seller: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  category: {
    _id: string;
    name: string;
    icon?: string;
  };
  condition: string;
  brand?: string;
  isFeatured: boolean;
  isSponsored: boolean;
}

interface Category {
  _id: string;
  name: string;
  icon?: string;
  image?: string;
}

const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation<MarketplaceNavigationProp>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartCount, setCartCount] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'price' | 'rating'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchAllProducts = async (pageNum: number = 1, append: boolean = false) => {
  console.log('\n🔵 ========== FETCHING PRODUCTS ==========');
  console.log('📊 Parameters:', { pageNum, append, selectedCategory, searchQuery, sortBy, sortOrder });
  
  try {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    // Fetch featured products (only on first page)
    let featuredProducts: Product[] = [];
    if (pageNum === 1) {
      console.log('\n⭐ Fetching FEATURED products...');
      try {
        const featuredResponse = await productAPI.getFeaturedProducts(20);
        console.log('📥 Featured Response:', JSON.stringify(featuredResponse, null, 2));
        
        if (featuredResponse.success) {
          // ✅ FIX: Handle both response formats
          featuredProducts = Array.isArray(featuredResponse.data) 
            ? featuredResponse.data 
            : (featuredResponse.data.products || []);
          
          console.log(`✅ Featured Products Count: ${featuredProducts.length}`);
          if (featuredProducts.length > 0) {
            console.log('📸 First Featured Product:', featuredProducts[0].name);
          }
        }
      } catch (featuredError) {
        console.error('❌ Featured Products Error:', featuredError);
      }
    }

    // Fetch regular products
    console.log('\n🛍️ Fetching REGULAR products...');
    const params: any = {
      page: pageNum,
      limit: 20,
      sortBy,
      sortOrder,
    };

    if (selectedCategory) {
      params.category = selectedCategory;
    }

    if (searchQuery) {
      params.search = searchQuery;
    }

    console.log('📤 Request Params:', params);

    const response = await productAPI.getAllProducts(params);
    console.log('📥 Regular Products Response:', JSON.stringify(response, null, 2));

    if (response.success) {
      // ✅ FIX: Handle both response formats
      const regularProducts = Array.isArray(response.data) 
        ? response.data 
        : (response.data.products || []);
      
      console.log(`✅ Regular Products Count: ${regularProducts.length}`);
      
      if (regularProducts.length > 0) {
        console.log('📸 First Regular Product:', regularProducts[0].name);
      }

      let combinedProducts: Product[] = [];

      if (pageNum === 1) {
        console.log('\n🔄 Combining products (Page 1)...');
        console.log(`📊 Featured: ${featuredProducts.length}, Regular: ${regularProducts.length}`);
        
        // Remove duplicates
        const featuredIds = new Set(featuredProducts.map(p => p._id));
        const uniqueRegularProducts = regularProducts.filter(
          (p: Product) => !featuredIds.has(p._id)
        );
        
        combinedProducts = [...featuredProducts, ...uniqueRegularProducts];
        console.log(`✅ Total Combined Products: ${combinedProducts.length}`);
      } else {
        combinedProducts = regularProducts;
      }

      console.log('\n💾 Setting state...');
      if (append) {
        setAllProducts(prev => [...prev, ...combinedProducts]);
      } else {
        setAllProducts(combinedProducts);
      }

      setHasMore(regularProducts.length === 20);
      setPage(pageNum);
      
      console.log('✅ State updated successfully');
    }
  } catch (error) {
    console.error('\n❌❌❌ FETCH PRODUCTS ERROR ❌❌❌');
    console.error('Error:', error);
    const apiError = handleAPIError(error);
    Alert.alert('Error', apiError.message);
  } finally {
    console.log('\n🏁 Fetch complete');
    setLoading(false);
    setLoadingMore(false);
  }
};

  // Fetch categories
  const fetchCategories = async () => {
    console.log('🏷️ Fetching categories...');
    try {
      const response = await categoriesAPI.getActiveCategories();
      console.log('📥 Categories Response:', response);
      if (response.success) {
        setCategories(response.data || []);
        console.log(`✅ Categories loaded: ${response.data?.length || 0}`);
      }
    } catch (error) {
      console.error('❌ Fetch categories error:', error);
    }
  };

  // Update cart count
  const updateCartCount = async () => {
    try {
      const count = await cartAPI.getCartCount();
      setCartCount(count);
      console.log(`🛒 Cart count: ${count}`);
    } catch (error) {
      console.error('❌ Update cart count error:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 Initial load...');
    fetchAllProducts();
    fetchCategories();
    updateCartCount();
  }, []);

  useFocusEffect(
    useCallback(() => {
      updateCartCount();
    }, [])
  );

  useEffect(() => {
    console.log('🔄 Filters changed, reloading products...');
    console.log('Filters:', { selectedCategory, sortBy, sortOrder });
    fetchAllProducts(1, false);
  }, [selectedCategory, sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        console.log('🔍 Search query changed:', searchQuery);
        fetchAllProducts(1, false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    console.log('🔄 Refreshing...');
    setRefreshing(true);
    Promise.all([
      fetchAllProducts(1, false),
      updateCartCount(),
    ]).finally(() => setRefreshing(false));
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      console.log(`⬇️ Loading more products (page ${page + 1})...`);
      fetchAllProducts(page + 1, true);
    }
  };

  const handleAddToCart = async (product: Product) => {
    try {
      await cartAPI.addToCart({
        product,
        quantity: 1,
      });

      await updateCartCount();
      Alert.alert('Success', 'Product added to cart');
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    }
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const calculateDiscount = (price: number, compareAt: number) => {
    if (!compareAt || compareAt <= price) return 0;
    return Math.round(((compareAt - price) / compareAt) * 100);
  };

  const renderProductCard = (product: Product, index: number) => {
    const discount = product.compareAtPrice 
      ? calculateDiscount(product.finalPrice, product.compareAtPrice)
      : 0;

    return (
      <TouchableOpacity
        key={`${product._id}-${index}`}
        onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
        style={{ width: PRODUCT_CARD_WIDTH, marginBottom: 16 }}
        activeOpacity={0.9}
      >
        <View
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              },
              android: { elevation: 3 },
            }),
          }}
        >
          {/* Image */}
          <View className="relative">
            <Image
              source={{ uri: product.images[0] }}
              style={{ width: '100%', height: 160 }}
              resizeMode="cover"
            />

            {/* Badges */}
            <View className="absolute top-2 left-2 right-2 flex-row justify-between">
              {product.isFeatured && (
                <View className="bg-yellow-500 px-2 py-1 rounded-lg">
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={10} color="#fff" />
                    <Text className="text-white text-[10px] font-bold ml-1">FEATURED</Text>
                  </View>
                </View>
              )}
              
              {product.isSponsored && !product.isFeatured && (
                <View className="bg-purple-500 px-2 py-1 rounded-lg">
                  <Text className="text-white text-[10px] font-bold">SPONSORED</Text>
                </View>
              )}
              
              {discount > 0 && (
                <View className="bg-red-500 px-2 py-1 rounded-lg ml-auto">
                  <Text className="text-white text-[10px] font-bold">-{discount}%</Text>
                </View>
              )}
            </View>

            {/* Favorite */}
            <TouchableOpacity
              className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 items-center justify-center"
              onPress={() => {}}
            >
              <Ionicons name="heart-outline" size={18} color="#eb278d" />
            </TouchableOpacity>

            {/* Stock warning */}
            {product.stock < 10 && (
              <View className="absolute bottom-2 left-2">
                <View className="bg-orange-500 px-2 py-1 rounded-lg">
                  <Text className="text-white text-[10px] font-bold">
                    {product.stock === 0 ? 'OUT OF STOCK' : `Only ${product.stock} left`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Product Info */}
          <View className="p-3">
            {/* Brand/Category */}
            <Text className="text-gray-500 text-[10px] font-medium mb-1" numberOfLines={1}>
              {product.brand || product.category.name}
            </Text>

            {/* Name */}
            <Text className="text-gray-900 text-sm font-bold mb-2" numberOfLines={2}>
              {product.name}
            </Text>

            {/* Rating */}
            {product.totalRatings > 0 && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="star" size={12} color="#fbbf24" />
                <Text className="text-gray-700 text-xs font-semibold ml-1">
                  {product.rating.toFixed(1)}
                </Text>
                <Text className="text-gray-400 text-[10px] ml-1">
                  ({product.totalRatings})
                </Text>
              </View>
            )}

            {/* Price & Cart */}
            <View className="flex-row items-center justify-between mb-2">
              <View>
                <Text className="text-pink-600 text-lg font-bold">
                  {formatPrice(product.finalPrice)}
                </Text>
                {product.compareAtPrice && product.compareAtPrice > product.finalPrice && (
                  <Text className="text-gray-400 text-xs line-through">
                    {formatPrice(product.compareAtPrice)}
                  </Text>
                )}
              </View>

              {product.stock > 0 && (
                <TouchableOpacity
                  onPress={() => handleAddToCart(product)}
                  className="w-8 h-8 rounded-full bg-pink-500 items-center justify-center"
                  activeOpacity={0.8}
                >
                  <Ionicons name="cart" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Condition */}
            {product.condition && (
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                <Text className="text-gray-500 text-[10px] capitalize">
                  {product.condition}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && page === 1) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4">Loading marketplace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Log current state
  console.log('🖼️ RENDER - All Products Count:', allProducts.length);
  
  // Separate featured and regular products for display
  const featuredProducts = allProducts.filter(p => p.isFeatured);
  const regularProducts = allProducts.filter(p => !p.isFeatured);
  
  console.log('🖼️ RENDER - Featured Count:', featuredProducts.length);
  console.log('🖼️ RENDER - Regular Count:', regularProducts.length);

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
            {/* Back Button & Title */}
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3"
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              
              <View className="flex-1">
                <Text className="text-white text-2xl font-bold">Marketplace</Text>
                <Text className="text-white/80 text-sm">
                  {allProducts.length} products available
                </Text>
              </View>
            </View>

            {/* Cart */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              className="relative"
            >
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="cart" size={24} color="#fff" />
                {cartCount > 0 && (
                  <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center">
                    <Text className="text-white text-[10px] font-bold">
                      {cartCount > 99 ? '99+' : cartCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="flex-row items-center bg-white/20 rounded-2xl px-4 py-3 mb-4">
            <Ionicons name="search" size={20} color="#fff" />
            <TextInput
              className="flex-1 ml-2 text-base text-white"
              placeholder="Search products..."
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

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              className={`px-5 py-2.5 rounded-full ${
                selectedCategory === null ? 'bg-white' : 'bg-white/20'
              }`}
            >
              <Text
                className={`font-bold text-sm ${
                  selectedCategory === null ? 'text-pink-600' : 'text-white'
                }`}
              >
                All
              </Text>
            </TouchableOpacity>

            {categories.map((category) => (
              <TouchableOpacity
                key={category._id}
                onPress={() => setSelectedCategory(category._id)}
                className={`px-5 py-2.5 rounded-full ${
                  selectedCategory === category._id ? 'bg-white' : 'bg-white/20'
                }`}
              >
                <Text
                  className={`font-bold text-sm ${
                    selectedCategory === category._id ? 'text-pink-600' : 'text-white'
                  }`}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

          if (isCloseToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Sort Options */}
        <View className="px-5 mt-5 mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {[
              { key: 'createdAt', label: 'Latest' },
              { key: 'price', label: 'Price' },
              { key: 'rating', label: 'Rating' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                onPress={() => {
                  if (sortBy === option.key) {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(option.key as any);
                    setSortOrder('desc');
                  }
                }}
                className={`px-4 py-2 rounded-xl flex-row items-center ${
                  sortBy === option.key ? 'bg-pink-500' : 'bg-white'
                }`}
                style={{
                  ...Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                    },
                    android: { elevation: 2 },
                  }),
                }}
              >
                <Text
                  className={`text-sm font-bold ${
                    sortBy === option.key ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </Text>
                {sortBy === option.key && (
                  <Ionicons
                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color="#fff"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Products Section */}
        {featuredProducts.length > 0 && (
          <View className="mb-5">
            <View className="px-5 mb-3 flex-row items-center">
              <Ionicons name="star" size={20} color="#fbbf24" />
              <Text className="text-lg font-bold text-gray-900 ml-2">Featured Products</Text>
            </View>
            <View className="px-5">
              <View className="flex-row flex-wrap justify-between">
                {featuredProducts.map((product, index) => renderProductCard(product, index))}
              </View>
            </View>
          </View>
        )}

        {/* All Products Section */}
        {regularProducts.length > 0 && (
          <View className="px-5 pb-5">
            {featuredProducts.length > 0 && (
              <Text className="text-lg font-bold text-gray-900 mb-3">All Products</Text>
            )}
            <View className="flex-row flex-wrap justify-between">
              {regularProducts.map((product, index) => renderProductCard(product, index))}
            </View>
          </View>
        )}

        {loadingMore && (
          <View className="py-4">
            <ActivityIndicator size="small" color="#eb278d" />
          </View>
        )}

        {!hasMore && allProducts.length > 10 && (
          <Text className="text-center text-gray-400 text-sm py-4">
            No more products
          </Text>
        )}

        {allProducts.length === 0 && !loading && (
          <View className="items-center justify-center py-20">
            <Ionicons name="cube-outline" size={64} color="#d1d5db" />
            <Text className="text-gray-500 text-lg font-bold mt-4">No products found</Text>
            <Text className="text-gray-400 text-sm mt-2">Try adjusting your filters</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MarketplaceScreen;