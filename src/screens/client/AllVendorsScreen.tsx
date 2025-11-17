import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, RefreshControl, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import VendorCard from '@/components/clientComponent/VendorCard';
import FilterModal from '@/components/FilterModal';
import { vendorAPI, categoriesAPI, handleAPIError } from '@/api/api';
import { parseVendors, extractVendorsFromResponse, FormattedVendor, filterVendorsByQuery, sortVendors } from '@/utils/vendorUtils';
const {
  width: SCREEN_WIDTH
} = Dimensions.get('window');
type AllVendorsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AllVendors'>;
type AllVendorsScreenRouteProp = RouteProp<RootStackParamList, 'AllVendors'>;
interface Category {
  id: string;
  name: string;
  icon: string;
  label: string;
}
const AllVendorsScreen: React.FC = () => {
  const navigation = useNavigation<AllVendorsScreenNavigationProp>();
  const route = useRoute<AllVendorsScreenRouteProp>();
  const [vendors, setVendors] = useState<FormattedVendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<FormattedVendor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [favoriteVendors, setFavoriteVendors] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'name' | 'recent'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    searchName: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    minDuration: '',
    maxDuration: '',
    status: 'all',
    sortBy: 'rating',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getActiveCategories();
      if (response.success) {
        let categoriesData = response.data;
        if (categoriesData && !Array.isArray(categoriesData)) {
          categoriesData = categoriesData.categories || categoriesData.data || [];
        }
        if (Array.isArray(categoriesData)) {
          const formattedCategories: Category[] = categoriesData.map((cat: any) => ({
            id: cat._id || cat.id,
            name: cat.name.toLowerCase(),
            icon: 'pricetag',
            label: cat.name
          }));
          setCategories(formattedCategories);
        }
      }
    } catch (error) {
      console.error('Categories fetch error:', handleAPIError(error));
    }
  };
  const fetchVendors = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const params: any = {
        page,
        limit: 10
      };
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      if (filters.category) {
        params.category = filters.category;
      }
      const response = await vendorAPI.getAllVendors(params);
      console.log('All vendors response:', response);
      if (response.success) {
        const rawVendors = extractVendorsFromResponse(response);
        const formattedVendors = parseVendors(rawVendors);
        if (append) {
          setVendors(prev => [...prev, ...formattedVendors]);
        } else {
          setVendors(formattedVendors);
        }
        if (response.meta?.pagination) {
          setHasMore(response.meta.pagination.hasNextPage || false);
        } else {
          setHasMore(formattedVendors.length >= 10);
        }
      } else {
        setVendors([]);
        setHasMore(false);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Vendors fetch error:', apiError);
      setVendors([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  useEffect(() => {
    fetchCategories();
    fetchVendors(1, false);
  }, [selectedCategory]);
  useEffect(() => {
    let result = [...vendors];
    if (searchQuery.trim()) {
      result = filterVendorsByQuery(result, searchQuery);
    }
    result = sortVendors(result, sortBy, sortOrder);
    setFilteredVendors(result);
  }, [vendors, searchQuery, sortBy, sortOrder]);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchVendors(1, false).finally(() => {
      setRefreshing(false);
    });
  }, [selectedCategory]);
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchVendors(nextPage, true);
    }
  };
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  };
  const handleVendorPress = (vendorId: string) => {
    navigation.navigate('VendorDetail', {
      vendorId
    });
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
  };
  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters);
    setSortBy(newFilters.sortBy || 'rating');
    setSortOrder(newFilters.sortOrder || 'desc');
    setSelectedCategory(newFilters.category || '');
    setCurrentPage(1);
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
      sortBy: 'rating',
      sortOrder: 'desc'
    });
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('rating');
    setSortOrder('desc');
    setCurrentPage(1);
  };
  const renderVendorItem = ({
    item,
    index
  }: {
    item: FormattedVendor;
    index: number;
  }) => {
    const cardWidth = (SCREEN_WIDTH - 50) / 3;
    return <View className="px-1.5 mb-3" style={{
      width: SCREEN_WIDTH / 3
    }}>
        <VendorCard vendor={{
        id: item.id,
        businessName: item.businessName,
        image: item.image,
        service: item.service,
        rating: item.rating,
        reviews: item.reviews,
        isVerified: item.isVerified,
        vendorType: item.vendorType
      }} width={cardWidth} onPress={() => handleVendorPress(item.id)} onFavoritePress={() => handleFavoriteToggle(item.id)} isFavorite={favoriteVendors.has(item.id)} />
      </View>;
  };
  const renderFooter = () => {
    if (!loadingMore) return null;
    return <View className="py-4">
        <ActivityIndicator size="small" color="#eb278d" />
      </View>;
  };
  const renderEmptyState = () => <View className="flex-1 items-center justify-center py-20">
      <Ionicons name="people-outline" size={64} color="#d1d5db" />
      <Text className="text-gray-400 text-lg font-semibold mt-4">No vendors found</Text>
      <Text className="text-gray-300 text-sm mt-2">Try adjusting your filters</Text>
      <TouchableOpacity className="mt-6 bg-pink-500 px-6 py-3 rounded-xl" onPress={handleResetFilters}>
        <Text className="text-white font-semibold">Clear Filters</Text>
      </TouchableOpacity>
    </View>;
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity className="mr-3" onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">All Vendors</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} available
              </Text>
            </View>
          </View>

          <TouchableOpacity className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center" activeOpacity={0.7} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options-outline" size={20} color="#eb278d" />
          </TouchableOpacity>
        </View>

        {}
        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-3">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput className="flex-1 ml-2 text-sm text-gray-900" placeholder="Search vendors..." placeholderTextColor="#9ca3af" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>}
        </View>

        {}
        {categories.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerStyle={{
        gap: 8
      }}>
            <TouchableOpacity className={`px-4 py-2 rounded-full ${selectedCategory === '' ? 'bg-pink-500' : 'bg-gray-100'}`} onPress={() => handleCategorySelect('')} activeOpacity={0.7}>
              <Text className={`text-sm font-semibold ${selectedCategory === '' ? 'text-white' : 'text-gray-600'}`}>
                All
              </Text>
            </TouchableOpacity>
            {categories.map(category => <TouchableOpacity key={category.id} className={`px-4 py-2 rounded-full ${selectedCategory === category.id ? 'bg-pink-500' : 'bg-gray-100'}`} onPress={() => handleCategorySelect(category.id)} activeOpacity={0.7}>
                <Text className={`text-sm font-semibold ${selectedCategory === category.id ? 'text-white' : 'text-gray-600'}`}>
                  {category.label}
                </Text>
              </TouchableOpacity>)}
          </ScrollView>}

        {}
        <View className="flex-row items-center mt-4 gap-2">
          <Text className="text-xs text-gray-500">Sort by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
          gap: 6
        }}>
            {(['rating', 'reviews', 'name'] as const).map(option => <TouchableOpacity key={option} className={`px-3 py-1.5 rounded-lg ${sortBy === option ? 'bg-pink-100' : 'bg-gray-50'}`} onPress={() => {
            if (sortBy === option) {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setSortBy(option);
              setSortOrder('desc');
            }
          }} activeOpacity={0.7}>
                <View className="flex-row items-center gap-1">
                  <Text className={`text-xs font-semibold capitalize ${sortBy === option ? 'text-pink-600' : 'text-gray-600'}`}>
                    {option}
                  </Text>
                  {sortBy === option && <Ionicons name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} color="#eb278d" />}
                </View>
              </TouchableOpacity>)}
          </ScrollView>
        </View>
      </View>

      {}
      {loading ? <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-400 text-sm mt-4">Loading vendors...</Text>
        </View> : <FlatList data={filteredVendors} renderItem={renderVendorItem} keyExtractor={item => item.id} numColumns={3} contentContainerStyle={{
      paddingVertical: 16,
      paddingHorizontal: 8
    }} columnWrapperStyle={{
      justifyContent: 'space-between'
    }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" colors={['#eb278d']} />} onEndReached={loadMore} onEndReachedThreshold={0.5} ListFooterComponent={renderFooter} ListEmptyComponent={renderEmptyState} showsVerticalScrollIndicator={false} />}

      {}
      <FilterModal visible={filterModalVisible} onClose={() => setFilterModalVisible(false)} filters={filters} categories={categories.map(c => ({
      _id: c.id,
      name: c.name
    }))} onApply={handleApplyFilters} onReset={handleResetFilters} />
    </SafeAreaView>;
};
export default AllVendorsScreen;