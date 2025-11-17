import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
interface VendorCardProps {
  vendor: {
    id: string;
    businessName: string;
    image?: string;
    service: string;
    rating: number;
    reviews: number;
    isVerified?: boolean;
    vendorType?: string;
  };
  onPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  width?: number;
}
const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  onPress,
  onFavoritePress,
  isFavorite = false,
  width = 180
}) => {
  const renderStars = (rating: number) => {
    return <View className="flex-row items-center">
        {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= rating ? 'star' : 'star-outline'} size={14} color={star <= rating ? '#fbbf24' : '#d1d5db'} />)}
        <Text className="text-xs text-gray-500 ml-1.5">{rating.toFixed(1)}</Text>
      </View>;
  };
  return <TouchableOpacity className="bg-white rounded-3xl overflow-hidden border border-[#eb278c2b]" style={{
    width,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  }} activeOpacity={0.95} onPress={onPress}>
      {}
      <View className="relative">
        {vendor.image ? <Image source={{
        uri: vendor.image
      }} className="w-full h-48" resizeMode="cover" /> : <LinearGradient colors={['#f3f4f6', '#e5e7eb']} className="w-full h-48 items-center justify-center">
            <View className="w-28 h-28 rounded-full bg-white items-center justify-center">
              <Ionicons name="person" size={64} color="#eb278d" />
            </View>
          </LinearGradient>}

        {}
        <TouchableOpacity className="absolute top-3 right-3 w-9 h-9 rounded-full items-center justify-center" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }} activeOpacity={0.7} onPress={onFavoritePress}>
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color="#eb278d" />
        </TouchableOpacity>

        {}
        {vendor.isVerified && <View className="absolute top-3 left-3 bg-green-500 px-2.5 py-1 rounded-full flex-row items-center">
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text className="text-white text-[9px] font-bold ml-1">VERIFIED</Text>
          </View>}
      </View>

      {}
      <View className="p-4">
        <Text className="text-base font-bold text-gray-900 mb-2" numberOfLines={2}>
          {vendor.businessName}
        </Text>

        {}
        <View className="flex-row items-center mb-3">
          <View className="w-6 h-6 rounded-full bg-pink-100 items-center justify-center mr-2">
            <Ionicons name="location" size={12} color="#eb278d" />
          </View>
          <Text className="text-xs text-gray-600 font-medium flex-1" numberOfLines={1}>
            {vendor.service}
          </Text>
        </View>

        {}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            {renderStars(vendor.rating)}
          </View>
          <View className="bg-pink-50 px-2.5 py-1 rounded-full">
            <Text className="text-pink-600 text-[10px] font-bold">
              {vendor.reviews} review{vendor.reviews !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {}
        <TouchableOpacity className="bg-pink-500 py-2.5 rounded-xl items-center" style={{
        shadowColor: '#eb278d',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3
      }} activeOpacity={0.8} onPress={onPress}>
          <Text className="text-white text-sm font-bold">Book Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>;
};
export default VendorCard;