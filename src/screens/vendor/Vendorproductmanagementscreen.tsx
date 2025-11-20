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
import { productAPI, handleAPIError } from '@/api/api';

type VendorProductManagementNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'VendorProductManagement'
>;

interface Product {
  _id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  finalPrice: number;
  stock: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  category: {
    _id?: string;
    name: string;
  };
  totalOrders?: number;
  totalSales?: number;
  rating?: number;
  totalRatings?: number;
  rejectionReason?: string;
  createdAt: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const VendorProductManagementScreen: React.FC = () => {
  const navigation = useNavigation<VendorProductManagementNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching products...');
      
      const response = await productAPI.getMyProducts();
      
      console.log('📦 Full response:', JSON.stringify(response, null, 2));
      console.log('✅ Response success:', response.success);
      console.log('📊 Response data:', response.data);

      if (response.success) {
        
        let productList: Product[] = [];
        
        if (response.data.products) {
          
          productList = response.data.products;
          console.log('📦 Found products in response.data.products');
        } else if (Array.isArray(response.data)) {
          
          productList = response.data;
          console.log('📦 Found products in response.data (array)');
        } else if (response.data.data && response.data.data.products) {
          
          productList = response.data.data.products;
          console.log('📦 Found products in response.data.data.products');
        } else if (response.data.data && Array.isArray(response.data.data)) {
          
          productList = response.data.data;
          console.log('📦 Found products in response.data.data (array)');
        } else {
          console.error('❌ Unknown response structure:', response);
        }

        console.log('📦 Product count:', productList.length);
        console.log('📦 First product:', productList[0]);

        setProducts(productList);
        
        if (productList.length === 0) {
          console.log('⚠️ No products found');
        }
      } else {
        console.error('❌ Response not successful');
        Alert.alert('Error', 'Failed to fetch products');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('❌ Fetch products error:', apiError);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  React.useEffect(() => {
    let filtered = products;

    
    if (activeFilter !== 'all') {
      filtered = filtered.filter((product) => product.approvalStatus === activeFilter);
    }

    
    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    console.log('🔍 Filtered products count:', filtered.length);
    setFilteredProducts(filtered);
  }, [products, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts().finally(() => setRefreshing(false));
  }, []);

  const handleAddProduct = () => {
    navigation.navigate('AddProduct');
  };

  const handleEditProduct = (productId: string) => {
    navigation.navigate('EditProduct', { productId });
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productAPI.deleteProduct(productId);
              Alert.alert('Success', 'Product deleted successfully');
              fetchProducts();
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleUpdateStock = (product: Product) => {
    Alert.prompt(
      'Update Stock',
      `Current stock: ${product.stock}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (value) => {
            const quantity = parseInt(value || '0');
            if (isNaN(quantity) || quantity < 0) {
              Alert.alert('Invalid', 'Please enter a valid number');
              return;
            }

            try {
              await productAPI.updateStock(product._id, quantity);
              Alert.alert('Success', 'Stock updated successfully');
              fetchProducts();
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message || 'Failed to update stock');
            }
          },
        },
      ],
      'plain-text',
      product.stock.toString(),
      'number-pad'
    );
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time';
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderProductCard = (product: Product) => (
    <TouchableOpacity
      key={product._id}
      onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
      activeOpacity={0.9}
      className="bg-white rounded-2xl mb-4"
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
      <View className="flex-row p-4">
        {}
        {product.images && product.images.length > 0 ? (
          <Image
            source={{ uri: product.images[0] }}
            className="w-24 h-24 rounded-xl"
            resizeMode="cover"
          />
        ) : (
          <View className="w-24 h-24 rounded-xl bg-gray-200 items-center justify-center">
            <Ionicons name="image-outline" size={32} color="#9ca3af" />
          </View>
        )}

        {}
        <View className="flex-1 ml-3">
          {}
          <View className="flex-row items-center justify-between mb-2">
            <View
              className={`px-3 py-1 rounded-full border-2 ${getStatusColor(product.approvalStatus)}`}
            >
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <Ionicons
                  name={getStatusIcon(product.approvalStatus) as any}
                  size={12}
                  color={
                    product.approvalStatus === 'approved'
                      ? '#15803d'
                      : product.approvalStatus === 'rejected'
                      ? '#dc2626'
                      : '#ca8a04'
                  }
                />
                <Text className="text-xs font-bold capitalize">{product.approvalStatus}</Text>
              </View>
            </View>

            {}
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Product Options', '', [
                  {
                    text: 'Edit',
                    onPress: () => handleEditProduct(product._id),
                  },
                  {
                    text: 'Update Stock',
                    onPress: () => handleUpdateStock(product),
                  },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDeleteProduct(product._id),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="ellipsis-vertical" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {}
          <Text className="text-gray-900 text-sm font-bold mb-1" numberOfLines={2}>
            {product.name}
          </Text>

          {}
          <Text className="text-gray-500 text-xs mb-2">{product.category?.name || 'No Category'}</Text>

          {}
          <View className="flex-row items-center justify-between">
            <Text className="text-pink-600 text-base font-bold">{formatPrice(product.finalPrice || product.price)}</Text>
            {/* jjj */}
            <View
              className={`px-2 py-1 rounded-lg ${
                product.stock === 0
                  ? 'bg-red-100'
                  : product.stock < 10
                  ? 'bg-orange-100'
                  : 'bg-green-100'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  product.stock === 0
                    ? 'text-red-700'
                    : product.stock < 10
                    ? 'text-orange-700'
                    : 'text-green-700'
                }`}
              >
                Stock: {product.stock}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {}
      {(product.totalOrders || product.totalSales || product.totalRatings) && (
        <View className="border-t border-gray-100 px-4 py-3">
          <View className="flex-row items-center justify-between">
            {product.totalOrders !== undefined && (
              <View className="flex-row items-center">
                <Ionicons name="cart" size={14} color="#9ca3af" />
                <Text className="text-gray-600 text-xs ml-1">
                  {product.totalOrders || 0} orders
                </Text>
              </View>
            )}

            {product.totalSales !== undefined && (
              <View className="flex-row items-center">
                <Ionicons name="cash" size={14} color="#9ca3af" />
                <Text className="text-gray-600 text-xs ml-1">
                  {formatPrice(product.totalSales || 0)} sales
                </Text>
              </View>
            )}

            {product.totalRatings && product.totalRatings > 0 && (
              <View className="flex-row items-center">
                <Ionicons name="star" size={14} color="#fbbf24" />
                <Text className="text-gray-600 text-xs ml-1">
                  {product.rating?.toFixed(1) || 0} ({product.totalRatings})
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {}
      {product.approvalStatus === 'rejected' && product.rejectionReason && (
        <View className="bg-red-50 px-4 py-3 border-t border-red-100">
          <View className="flex-row items-start">
            <Ionicons name="alert-circle" size={16} color="#dc2626" />
            <View className="flex-1 ml-2">
              <Text className="text-red-900 text-xs font-semibold mb-1">Rejection Reason:</Text>
              <Text className="text-red-700 text-xs">{product.rejectionReason}</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20 px-8">
      <LinearGradient
        colors={['#fce7f3', '#fdf2f8']}
        className="w-32 h-32 rounded-full items-center justify-center mb-6"
      >
        <Ionicons name="cube-outline" size={64} color="#eb278d" />
      </LinearGradient>
      <Text className="text-xl font-bold text-gray-900 mb-2 text-center">No Products Yet</Text>
      <Text className="text-gray-600 text-center text-sm mb-6">
        {activeFilter !== 'all' 
          ? `No ${activeFilter} products found`
          : "Start by adding your first product to sell on the marketplace"}
      </Text>
      <TouchableOpacity
        onPress={handleAddProduct}
        className="bg-pink-500 px-8 py-4 rounded-2xl"
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text className="text-white text-base font-bold">Add Your First Product</Text>
      </TouchableOpacity>
    </View>
  );

  const getProductCounts = () => {
    return {
      all: products.length,
      pending: products.filter((p) => p.approvalStatus === 'pending').length,
      approved: products.filter((p) => p.approvalStatus === 'approved').length,
      rejected: products.filter((p) => p.approvalStatus === 'rejected').length,
    };
  };

  const counts = getProductCounts();

  const filters: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
  ];

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4">Loading products...</Text>
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
            <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
            <View>
              <Text className="text-white text-2xl font-bold mb-1">My Products</Text>
              <Text className="text-white/80 text-sm">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleAddProduct}
              className="w-12 h-12 rounded-full bg-white/20 items-center justify-center"
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {}
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
                  {filter.label} ({filter.count})
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
          {filteredProducts.length > 0 ? (
            filteredProducts.map(renderProductCard)
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>

      {}
      <TouchableOpacity
        onPress={handleAddProduct}
        className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-pink-500 items-center justify-center"
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default VendorProductManagementScreen;