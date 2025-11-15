import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import ClientSidebar from '@/components/clientComponent/ClientSidebar';

import FilterModal from '@/components/FilterModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  icon: string;
  label: string;
}

interface Vendor {
  id: string;
  name: string;
  image: string;
  service: string;
  rating: number;
  reviews: number;
}

type ClientDashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

const ClientDashboardScreen: React.FC = () => {
  const navigation = useNavigation<ClientDashboardScreenNavigationProp>();
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters);
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
      sortOrder: 'asc',
    });
  };

  const categories: Category[] = [
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
  ];


  const topVendors: Vendor[] = [
    {
      id: '1',
      name: 'Rin_Adex beauty world',
      image: 'https://via.placeholder.com/150/FFB6C1/FFFFFF?text=Rin+Adex',
      service: 'Home Service',
      rating: 0.0,
      reviews: 0,
    },
    {
      id: '2',
      name: 'AdeChioma signature hair',
      image: 'https://via.placeholder.com/150/1a1a2e/FFFFFF?text=AdeChioma',
      service: 'In-Shop',
      rating: 0.0,
      reviews: 0,
    },
    {
      id: '3',
      name: 'Tossyglams',
      image: 'https://via.placeholder.com/150/8B0000/FFFFFF?text=Tossyglams',
      service: 'Home Service',
      rating: 0.0,
      reviews: 0,
    },
  ];

  const renderStars = (rating: number) => {
    return (
      <View className="flex-row items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={star <= rating ? '#fbbf24' : '#d1d5db'}
          />
        ))}
        <Text className="text-xs text-gray-500 ml-1.5">{rating.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">Hello kayode</Text>
            <Text className="text-sm text-gray-500 mt-0.5">Welcome to Sharplook</Text>
          </View>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="relative w-11 h-11 items-center justify-center"
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Chat')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#eb278d" />
              <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full" />
            </TouchableOpacity>

            <TouchableOpacity
              className="relative w-11 h-11 items-center justify-center"
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Cart')}
            >
              <Ionicons name="cart-outline" size={26} color="#eb278d" />
              <View className="absolute top-1 right-1 w-5 h-5 bg-pink-500 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-bold">1</Text>
              </View>
            </TouchableOpacity>

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
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-sm text-gray-900"
              placeholder="Search Shop or Vendor"
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity
            className="w-12 h-12 rounded-2xl bg-pink-500 items-center justify-center"
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
          </TouchableOpacity>
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
        {/* Categories */}
        <Animated.View
          className="px-5 py-6"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View className="flex-row justify-between mb-2">
            {categories.map((category, index) => (
              <TouchableOpacity
                key={category.id}
                className="items-center"
                style={{ width: (SCREEN_WIDTH - 60) / 5 }}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(category.id)}
              >
                <View
                  className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${selectedCategory === category.id ? 'bg-pink-100' : 'bg-white'
                    }`}
                  style={{
                    borderWidth: 2,
                    borderColor: selectedCategory === category.id ? '#eb278d' : '#eb278c5d',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={24}
                    color={selectedCategory === category.id ? '#eb278d' : '#9ca3af'}
                  />
                </View>
                <Text
                  className="text-[10px] text-gray-700 text-center font-medium leading-3"
                  numberOfLines={3}
                  style={{ width: (SCREEN_WIDTH - 60) / 5 }}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Top Vendors Section */}
        <View className="py-6">
          <View className="flex-row items-center justify-between px-5 mb-4">
            <View>
              <Text className="text-xl font-bold text-gray-900">Top Vendors</Text>
              <Text className="text-xs text-gray-500 mt-0.5">Highly rated professionals</Text>
            </View>
            <TouchableOpacity
              className="flex-row items-center"
              activeOpacity={0.7}
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
            {topVendors.map((vendor, index) => (
              <Animated.View
                key={vendor.id}
                className="mr-4 "
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
                <TouchableOpacity
                  className="bg-white rounded-3xl overflow-hidden border border-[#eb278c2b]"
                 
                  activeOpacity={0.95}
                >
                  {/* Vendor Image with Gradient Overlay */}
                  <View className="relative">
                    <LinearGradient
                      colors={['#f3f4f6', '#e5e7eb']}
                      className="w-full h-48 items-center justify-center"
                    >
                      <View className="w-28 h-28 rounded-full bg-white items-center justify-center">
                        <Ionicons name="person" size={64} color="#eb278d" />
                      </View>
                    </LinearGradient>

                    {/* Favorite Button */}
                    <TouchableOpacity
                      className="absolute top-3 right-3 w-9 h-9 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="heart-outline" size={18} color="#eb278d" />
                    </TouchableOpacity>

                    {/* Verified Badge */}
                    <View className="absolute top-3 left-3 bg-green-500 px-2.5 py-1 rounded-full flex-row items-center">
                      <Ionicons name="checkmark-circle" size={12} color="#fff" />
                      <Text className="text-white text-[9px] font-bold ml-1">VERIFIED</Text>
                    </View>
                  </View>

                  {/* Vendor Info */}
                  <View className="p-4">
                    <Text className="text-base font-bold text-gray-900 mb-2" numberOfLines={2}>
                      {vendor.name}
                    </Text>

                    {/* Service Type */}
                    <View className="flex-row items-center mb-3">
                      <View className="w-6 h-6 rounded-full bg-pink-100 items-center justify-center mr-2">
                        <Ionicons name="location" size={12} color="#eb278d" />
                      </View>
                      <Text className="text-xs text-gray-600 font-medium flex-1">
                        {vendor.service}
                      </Text>
                    </View>

                    {/* Rating and Reviews */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center">
                        {renderStars(vendor.rating)}
                      </View>
                      <View className="bg-pink-50 px-2.5 py-1 rounded-full">
                        <Text className="text-pink-600 text-[10px] font-bold">
                          {vendor.reviews} reviews
                        </Text>
                      </View>
                    </View>

                    {/* Book Now Button */}
                    <TouchableOpacity
                      className="bg-pink-500 py-2.5 rounded-xl items-center"
                      style={{
                        shadowColor: '#eb278d',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-sm font-bold">Book Now</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}

            {/* View More Card */}
            <TouchableOpacity
              className="rounded-3xl items-center justify-center border-2 border-dashed border-pink-300"
              style={{
                width: SCREEN_WIDTH * 0.45,
                backgroundColor: '#fce7f3',
              }}
              activeOpacity={0.7}
            >
              <View className="items-center py-20">
                <View className="w-16 h-16 rounded-full bg-pink-200 items-center justify-center mb-3">
                  <Ionicons name="arrow-forward" size={28} color="#eb278d" />
                </View>
                <Text className="text-pink-600 font-bold text-sm">View All</Text>
                <Text className="text-pink-400 text-xs mt-1">50+ Vendors</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Recommended Products */}
        <View className="px-5 py-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">Recommended Products</Text>

          <View className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]">
            <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Ionicons name="cube-outline" size={48} color="#d1d5db" />
            </View>
            <Text className="text-gray-400 text-sm font-medium">No recommended products</Text>
            <Text className="text-gray-300 text-xs mt-1">Check back later for updates</Text>
          </View>
        </View>

        {/* Special Offers Banner */}
        <View className="px-5 py-2 mb-4">
          <TouchableOpacity activeOpacity={0.9}>
            <LinearGradient
              colors={['#eb278d', '#f472b6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl p-6"
              style={{
                shadowColor: '#eb278d',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold mb-1">Special Offers! 🎉</Text>
                  <Text className="text-white/90 text-sm mb-3">
                    Get up to 30% off on selected services
                  </Text>
                  <View className="bg-white/20 self-start px-4 py-2 rounded-full">
                    <Text className="text-white text-xs font-semibold">View Deals</Text>
                  </View>
                </View>
                <Ionicons name="gift" size={60} color="rgba(255, 255, 255, 0.3)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sidebar */}
      <ClientSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userName="kayode"
        userEmail="kayode@example.com"
      />

      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        categories={categories.map(c => ({ _id: c.id, name: c.name }))}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </SafeAreaView>
  );
};

export default ClientDashboardScreen;