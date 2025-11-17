import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT
} = Dimensions.get('window');
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
}
interface FilterOptions {
  category: string;
  priceRange: string;
  rating: number;
  distance: string;
  availability: string;
  sortBy: string;
}
const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApplyFilters
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [selectedDistance, setSelectedDistance] = useState<string>('');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('');
  const [selectedSortBy, setSelectedSortBy] = useState<string>('');
  const categories = [{
    id: 'all',
    label: 'All Services',
    icon: 'grid'
  }, {
    id: 'beauty',
    label: 'Beauty & Wellness',
    icon: 'sparkles'
  }, {
    id: 'spa',
    label: 'Spa & Treatment',
    icon: 'flower'
  }, {
    id: 'skincare',
    label: 'Skincare',
    icon: 'water'
  }, {
    id: 'makeup',
    label: 'Makeup',
    icon: 'brush'
  }, {
    id: 'hair',
    label: 'Hair Styling',
    icon: 'cut'
  }];
  const priceRanges = [{
    id: 'any',
    label: 'Any Price'
  }, {
    id: 'budget',
    label: '₦ - Budget Friendly'
  }, {
    id: 'moderate',
    label: '₦₦ - Moderate'
  }, {
    id: 'premium',
    label: '₦₦₦ - Premium'
  }, {
    id: 'luxury',
    label: '₦₦₦₦ - Luxury'
  }];
  const ratings = [{
    value: 0,
    label: 'Any Rating'
  }, {
    value: 5,
    label: '5 Stars'
  }, {
    value: 4,
    label: '4+ Stars'
  }, {
    value: 3,
    label: '3+ Stars'
  }];
  const distances = [{
    id: 'any',
    label: 'Any Distance'
  }, {
    id: '5km',
    label: 'Within 5 km'
  }, {
    id: '10km',
    label: 'Within 10 km'
  }, {
    id: '20km',
    label: 'Within 20 km'
  }, {
    id: '50km',
    label: 'Within 50 km'
  }];
  const availability = [{
    id: 'any',
    label: 'Any Time'
  }, {
    id: 'today',
    label: 'Available Today'
  }, {
    id: 'tomorrow',
    label: 'Available Tomorrow'
  }, {
    id: 'week',
    label: 'This Week'
  }, {
    id: 'weekend',
    label: 'This Weekend'
  }];
  const sortOptions = [{
    id: 'recommended',
    label: 'Recommended',
    icon: 'star'
  }, {
    id: 'rating',
    label: 'Highest Rated',
    icon: 'trending-up'
  }, {
    id: 'popular',
    label: 'Most Popular',
    icon: 'flame'
  }, {
    id: 'nearest',
    label: 'Nearest First',
    icon: 'location'
  }, {
    id: 'priceLow',
    label: 'Price: Low to High',
    icon: 'arrow-up'
  }, {
    id: 'priceHigh',
    label: 'Price: High to Low',
    icon: 'arrow-down'
  }];
  const handleReset = () => {
    setSelectedCategory('');
    setSelectedPriceRange('');
    setSelectedRating(0);
    setSelectedDistance('');
    setSelectedAvailability('');
    setSelectedSortBy('');
  };
  const handleApply = () => {
    const filters: FilterOptions = {
      category: selectedCategory,
      priceRange: selectedPriceRange,
      rating: selectedRating,
      distance: selectedDistance,
      availability: selectedAvailability,
      sortBy: selectedSortBy
    };
    onApplyFilters(filters);
    onClose();
  };
  const renderStars = (count: number) => {
    return <View className="flex-row">
        {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= count ? 'star' : 'star-outline'} size={14} color={star <= count ? '#fbbf24' : '#d1d5db'} style={{
        marginRight: 2
      }} />)}
      </View>;
  };
  return <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        {}
        <LinearGradient colors={['#eb278d', '#f472b6']} start={{
        x: 0,
        y: 0
      }} end={{
        x: 1,
        y: 1
      }} className="pb-4">
          <View className="flex-row items-center justify-between px-5 py-4">
            <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center rounded-full" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
          }} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <Text className="text-xl font-bold text-white">Filters</Text>

            <TouchableOpacity onPress={handleReset} className="px-4 py-2 rounded-full" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)'
          }} activeOpacity={0.7}>
              <Text className="text-white text-sm font-semibold">Reset</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {}
          <View className="px-5 py-5">
            <Text className="text-lg font-bold text-gray-900 mb-3">Sort By</Text>
            <View className="flex-row flex-wrap gap-2">
              {sortOptions.map(option => <TouchableOpacity key={option.id} onPress={() => setSelectedSortBy(option.id)} className={`flex-row items-center px-4 py-3 rounded-xl ${selectedSortBy === option.id ? 'bg-pink-500' : 'bg-white'}`} style={{
              borderWidth: selectedSortBy === option.id ? 0 : 1,
              borderColor: '#e5e7eb',
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: {
                    width: 0,
                    height: 1
                  },
                  shadowOpacity: 0.05,
                  shadowRadius: 4
                },
                android: {
                  elevation: 2
                }
              })
            }} activeOpacity={0.7}>
                  <Ionicons name={option.icon as any} size={18} color={selectedSortBy === option.id ? '#fff' : '#eb278d'} />
                  <Text className={`ml-2 text-sm font-semibold ${selectedSortBy === option.id ? 'text-white' : 'text-gray-700'}`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          <View className="px-5 py-5 border-t border-gray-200">
            <Text className="text-lg font-bold text-gray-900 mb-3">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map(category => <TouchableOpacity key={category.id} onPress={() => setSelectedCategory(category.id)} className={`flex-row items-center px-4 py-3 rounded-xl ${selectedCategory === category.id ? 'bg-pink-500' : 'bg-white'}`} style={{
              borderWidth: selectedCategory === category.id ? 0 : 1,
              borderColor: '#e5e7eb'
            }} activeOpacity={0.7}>
                  <Ionicons name={category.icon as any} size={18} color={selectedCategory === category.id ? '#fff' : '#eb278d'} />
                  <Text className={`ml-2 text-sm font-semibold ${selectedCategory === category.id ? 'text-white' : 'text-gray-700'}`}>
                    {category.label}
                  </Text>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          <View className="px-5 py-5 border-t border-gray-200">
            <Text className="text-lg font-bold text-gray-900 mb-3">Price Range</Text>
            <View className="bg-white rounded-2xl overflow-hidden">
              {priceRanges.map((range, index) => <TouchableOpacity key={range.id} onPress={() => setSelectedPriceRange(range.id)} className={`flex-row items-center justify-between p-4 ${index !== priceRanges.length - 1 ? 'border-b border-gray-100' : ''}`} activeOpacity={0.7}>
                  <Text className="text-gray-800 font-medium">{range.label}</Text>
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${selectedPriceRange === range.id ? 'bg-pink-500' : 'border-2 border-gray-300'}`}>
                    {selectedPriceRange === range.id && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          <View className="px-5 py-5 border-t border-gray-200">
            <Text className="text-lg font-bold text-gray-900 mb-3">Rating</Text>
            <View className="bg-white rounded-2xl overflow-hidden">
              {ratings.map((rating, index) => <TouchableOpacity key={rating.value} onPress={() => setSelectedRating(rating.value)} className={`flex-row items-center justify-between p-4 ${index !== ratings.length - 1 ? 'border-b border-gray-100' : ''}`} activeOpacity={0.7}>
                  <View className="flex-row items-center">
                    {rating.value > 0 && renderStars(rating.value)}
                    <Text className="text-gray-800 font-medium ml-2">{rating.label}</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${selectedRating === rating.value ? 'bg-pink-500' : 'border-2 border-gray-300'}`}>
                    {selectedRating === rating.value && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          <View className="px-5 py-5 border-t border-gray-200">
            <Text className="text-lg font-bold text-gray-900 mb-3">Distance</Text>
            <View className="bg-white rounded-2xl overflow-hidden">
              {distances.map((distance, index) => <TouchableOpacity key={distance.id} onPress={() => setSelectedDistance(distance.id)} className={`flex-row items-center justify-between p-4 ${index !== distances.length - 1 ? 'border-b border-gray-100' : ''}`} activeOpacity={0.7}>
                  <Text className="text-gray-800 font-medium">{distance.label}</Text>
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${selectedDistance === distance.id ? 'bg-pink-500' : 'border-2 border-gray-300'}`}>
                    {selectedDistance === distance.id && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          <View className="px-5 py-5 border-t border-gray-200">
            <Text className="text-lg font-bold text-gray-900 mb-3">Availability</Text>
            <View className="bg-white rounded-2xl overflow-hidden">
              {availability.map((avail, index) => <TouchableOpacity key={avail.id} onPress={() => setSelectedAvailability(avail.id)} className={`flex-row items-center justify-between p-4 ${index !== availability.length - 1 ? 'border-b border-gray-100' : ''}`} activeOpacity={0.7}>
                  <Text className="text-gray-800 font-medium">{avail.label}</Text>
                  <View className={`w-6 h-6 rounded-full items-center justify-center ${selectedAvailability === avail.id ? 'bg-pink-500' : 'border-2 border-gray-300'}`}>
                    {selectedAvailability === avail.id && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          <View className="h-32" />
        </ScrollView>

        {}
        <View className="px-5 py-4 bg-white border-t border-gray-200" style={{
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: -2
            },
            shadowOpacity: 0.1,
            shadowRadius: 8
          },
          android: {
            elevation: 8
          }
        })
      }}>
          <TouchableOpacity onPress={handleApply} className="bg-pink-500 py-4 rounded-xl items-center" style={{
          shadowColor: '#eb278d',
          shadowOffset: {
            width: 0,
            height: 4
          },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6
        }} activeOpacity={0.8}>
            <Text className="text-white text-base font-bold">Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>;
};
export default FilterModal;