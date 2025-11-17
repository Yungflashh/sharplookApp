import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
interface FavoriteVendor {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  vendorProfile: {
    businessName: string;
    rating: number;
    totalRatings: number;
    categories: Array<{
      name: string;
      icon: string;
    }>;
  };
}
const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteVendor[]>([]);
  const [selectedTab, setSelectedTab] = useState<'vendors' | 'services'>('vendors');
  useEffect(() => {
    loadFavorites();
  }, [selectedTab]);
  const loadFavorites = async () => {
    try {
      setLoading(true);
      setFavorites([]);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };
  const handleRemoveFavorite = async (id: string) => {
    try {
      setFavorites(favorites.filter(item => item._id !== id));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };
  const renderVendorCard = (vendor: FavoriteVendor) => <TouchableOpacity key={vendor._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100" activeOpacity={0.7} onPress={() => navigation.navigate('VendorDetail' as never, {
    vendorId: vendor._id
  } as never)}>
      <View className="flex-row">
        <View className="w-16 h-16 rounded-xl bg-pink-100 items-center justify-center mr-3">
          {vendor.avatar ? <Image source={{
          uri: vendor.avatar
        }} className="w-full h-full rounded-xl" /> : <Ionicons name="business" size={28} color="#eb278d" />}
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 mb-1">
            {vendor.vendorProfile.businessName}
          </Text>
          <View className="flex-row items-center mb-2">
            <Ionicons name="star" size={14} color="#fbbf24" />
            <Text className="text-sm text-gray-600 ml-1">
              {vendor.vendorProfile.rating.toFixed(1)} ({vendor.vendorProfile.totalRatings})
            </Text>
          </View>
          {vendor.vendorProfile.categories.length > 0 && <Text className="text-xs text-gray-500">
              {vendor.vendorProfile.categories[0].name}
            </Text>}
        </View>

        <TouchableOpacity className="w-10 h-10 items-center justify-center" onPress={() => handleRemoveFavorite(vendor._id)}>
          <Ionicons name="heart" size={24} color="#eb278d" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>;
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            My Favorites
          </Text>
          <View className="w-10" />
        </View>
      </View>

      {}
      <View className="bg-white px-5 py-3 border-b border-gray-100">
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          <TouchableOpacity className={`flex-1 py-2 rounded-lg ${selectedTab === 'vendors' ? 'bg-white' : ''}`} onPress={() => setSelectedTab('vendors')}>
            <Text className={`text-center text-sm font-medium ${selectedTab === 'vendors' ? 'text-pink-600' : 'text-gray-600'}`}>
              Vendors
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className={`flex-1 py-2 rounded-lg ${selectedTab === 'services' ? 'bg-white' : ''}`} onPress={() => setSelectedTab('services')}>
            <Text className={`text-center text-sm font-medium ${selectedTab === 'services' ? 'text-pink-600' : 'text-gray-600'}`}>
              Services
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {}
      {loading ? <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
        </View> : favorites.length === 0 ? <View className="flex-1 items-center justify-center px-5">
          <Ionicons name="heart-outline" size={64} color="#d1d5db" />
          <Text className="text-lg font-semibold text-gray-900 mt-4">
            No Favorites Yet
          </Text>
          <Text className="text-sm text-gray-600 text-center mt-2">
            Start adding your favorite vendors and services to see them here
          </Text>
          <TouchableOpacity className="bg-pink-500 px-6 py-3 rounded-xl mt-6" onPress={() => navigation.goBack()}>
            <Text className="text-white font-semibold">Explore Vendors</Text>
          </TouchableOpacity>
        </View> : <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#eb278d" />}>
          {favorites.map(renderVendorCard)}
          <View className="h-5" />
        </ScrollView>}
    </SafeAreaView>;
};
export default FavoritesScreen;