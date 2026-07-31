import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { vendorAPI, categoriesAPI, handleAPIError } from '@/api/api';
import { parseVendors, extractVendorsFromResponse, FormattedVendor } from '@/utils/vendorUtils';
import VendorCard from '@/components/clientComponent/VendorCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRIMARY = '#eb278d';
const PRIMARY_SOFT = '#FCE4EC';
const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT = 6;

interface Category {
  id: string;
  name: string;
  label: string;
  icon: string;
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  hair: 'cut-outline',
  nails: 'color-palette-outline',
  makeup: 'brush-outline',
  skin: 'water-outline',
  spa: 'flower-outline',
  massage: 'body-outline',
  beauty: 'sparkles-outline',
  facial: 'happy-outline',
};

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AllVendors'>;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [allVendors, setAllVendors] = useState<FormattedVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentSearches();
    fetchCategories();
    fetchVendors();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // ignore — recent searches are a convenience, not critical
    }
  };

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const removeRecentSearch = (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((t) => t !== term);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getActiveCategories();
      let data = response.data;
      if (data && !Array.isArray(data)) data = data.categories || data.data || [];
      if (Array.isArray(data) && data.length > 0) {
        setCategories(
          data.slice(0, 8).map((cat: any) => ({
            id: cat._id || cat.id,
            name: (cat.name || '').toLowerCase(),
            label: cat.name,
            icon: CATEGORY_ICON_MAP[(cat.name || '').toLowerCase()] || 'ellipsis-horizontal-outline',
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching categories:', handleAPIError(error).message);
    }
  };

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getAllVendors({ page: 1, limit: 100 });
      const raw = extractVendorsFromResponse(response);
      setAllVendors(parseVendors(raw));
    } catch (error) {
      console.error('Error fetching vendors:', handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory((prev) => (prev === categoryId ? '' : categoryId));
  };

  const isSearching = searchQuery.trim().length > 0 || selectedCategory !== '';

  const vendorCountForCategory = (cat: Category) =>
    allVendors.filter((v) =>
      v.serviceCategories?.some((c) => c.toLowerCase() === cat.name.toLowerCase()) ||
      v.service?.toLowerCase().includes(cat.name.toLowerCase())
    ).length;

  const results = allVendors.filter((vendor) => {
    if (selectedCategory) {
      const cat = categories.find((c) => c.id === selectedCategory);
      const matchesCategory = cat
        ? vendor.serviceCategories?.some((c) => c.toLowerCase() === cat.name.toLowerCase()) ||
          vendor.service?.toLowerCase().includes(cat.name.toLowerCase())
        : true;
      if (!matchesCategory) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        vendor.businessName.toLowerCase().includes(q) ||
        vendor.service?.toLowerCase().includes(q) ||
        vendor.serviceCategories?.some((c) => c.toLowerCase().includes(q));
      if (!matchesQuery) return false;
    }
    return true;
  });

  const cardWidth = (SCREEN_WIDTH - 52) / 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PRIMARY_SOFT }} edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Search</Text>
        </View>

        {/* Search bar */}
        <View
          className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-3"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-sm text-gray-900"
            placeholder="Search services or Professionals"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => saveRecentSearch(searchQuery)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('')}
            activeOpacity={0.8}
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: selectedCategory === '' ? PRIMARY : '#fff' }}
          >
            <Text className="text-sm font-semibold" style={{ color: selectedCategory === '' ? '#fff' : '#374151' }}>
              All
            </Text>
          </TouchableOpacity>
          {categories.slice(0, 6).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handleCategoryPress(cat.id)}
              activeOpacity={0.8}
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: selectedCategory === cat.id ? PRIMARY : '#fff' }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: selectedCategory === cat.id ? '#fff' : '#374151' }}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isSearching ? (
        <FlatList
          data={results}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingTop: 4 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth, marginBottom: 16 }}>
              <VendorCard
                vendor={{
                  id: item.id,
                  businessName: item.businessName,
                  image: item.image,
                  service: item.service,
                  rating: item.rating,
                  reviews: item.reviews,
                  isVerified: item.isVerified,
                  vendorType: item.vendorType,
                }}
                width={cardWidth}
                onPress={() => navigation.navigate('VendorDetail', { vendorId: item.id })}
              />
            </View>
          )}
          ListEmptyComponent={
            loading ? (
              <View className="items-center py-20">
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : (
              <View className="items-center py-20 px-8">
                <Ionicons name="search-outline" size={48} color="#d1a3bb" />
                <Text className="text-gray-900 font-bold text-base mt-4 mb-1">No results found</Text>
                <Text className="text-gray-400 text-sm text-center">Try a different search term or category</Text>
              </View>
            )
          }
        />
      ) : (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Recent Search */}
          {recentSearches.length > 0 && (
            <View className="mb-6">
              <Text className="text-base font-bold text-gray-900 mb-3">Recent Search</Text>
              {recentSearches.map((term) => (
                <TouchableOpacity
                  key={term}
                  onPress={() => setSearchQuery(term)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between bg-white rounded-xl px-4 py-3 mb-2"
                >
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="time-outline" size={18} color="#9ca3af" />
                    <Text className="ml-3 text-sm text-gray-700" numberOfLines={1}>
                      {term}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeRecentSearch(term)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Trending Services */}
          <View className="mb-6">
            <Text className="text-base font-bold text-gray-900 mb-3">Trending Services</Text>
            {loading ? (
              <View className="items-center py-10">
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : (
              <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                {categories.slice(0, 4).map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => handleCategoryPress(cat.id)}
                    activeOpacity={0.8}
                    className="bg-white rounded-2xl p-3 flex-row items-center"
                    style={{ width: (SCREEN_WIDTH - 52) / 2 }}
                  >
                    <View
                      className="items-center justify-center mr-3"
                      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY_SOFT }}
                    >
                      <Ionicons name={cat.icon as any} size={22} color={PRIMARY} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                        {cat.label}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-0.5">
                        {vendorCountForCategory(cat)} vendors
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default SearchScreen;
