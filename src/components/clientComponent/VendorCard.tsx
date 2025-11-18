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
  onPress: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  width?: number;
  showFavorite?: boolean; // Add this prop
}

const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  onPress,
  onFavoritePress,
  isFavorite = false,
  width = 180,
  showFavorite = false, // Default to false (hidden)
}) => {
  const renderStars = (rating: number) => {
    return (
      <View className="flex-row items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={17} // Reduced from 14
            color={star <= rating ? '#fbbf24' : '#d1d5db'}
          />
        ))}
        <Text className="text-[10px] text-gray-500 ml-1">{rating.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-3xl overflow-hidden border border-[#eb278c2b]"
      style={{
        width,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}
      activeOpacity={0.95}
      onPress={onPress}
    >
      {/* Vendor Image - Reduced Height */}
      <View className="relative">
        {vendor.image ? (
          <Image
            source={{ uri: vendor.image }}
            className="w-full h-36" // Reduced from h-48
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#f3f4f6', '#e5e7eb']}
            className="w-full h-36 items-center justify-center" // Reduced from h-48
          >
            <View className="w-20 h-20 rounded-full bg-white items-center justify-center"> {/* Reduced from w-28 h-28 */}
              <Ionicons name="person" size={48} color="#eb278d" /> {/* Reduced from 64 */}
            </View>
          </LinearGradient>
        )}

        {/* Favorite Button - Conditionally Rendered */}
        {showFavorite && onFavoritePress && (
          <TouchableOpacity
            className="absolute top-3 right-3 w-9 h-9 rounded-full items-center justify-center"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
            activeOpacity={0.7}
            onPress={onFavoritePress}
          >
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color="#eb278d" />
          </TouchableOpacity>
        )}

        {/* Verified Badge */}
        {vendor.isVerified && (
          <View className="absolute top-3 left-3 bg-green-500 px-2.5 py-1 rounded-full flex-row items-center">
            <Ionicons name="checkmark-circle" size={12} color="#fff" />
            <Text className="text-white text-[9px] font-bold ml-1">VERIFIED</Text>
          </View>
        )}
      </View>

      {/* Vendor Info - Reduced Padding */}
      <View className="p-3"> {/* Reduced from p-4 */}
        <Text className="text-sm font-bold text-gray-900 mb-1.5" numberOfLines={2}> {/* Reduced font and margin */}
          {vendor.businessName}
        </Text>

        {/* Service Type */}
        <View className="flex-row items-center mb-2"> {/* Reduced margin */}
          <View className="w-5 h-5 rounded-full bg-pink-100 items-center justify-center mr-1.5"> {/* Reduced size */}
            <Ionicons name="location" size={10} color="#eb278d" /> {/* Reduced from 12 */}
          </View>
          <Text className="text-[11px] text-gray-600 font-medium flex-1" numberOfLines={1}> {/* Reduced font */}
            {vendor.service}
          </Text>
        </View>

        {/* Rating and Reviews */}
        <View className="flex-row items-center justify-between mb-2.5"> {/* Reduced margin */}
          <View className="flex-row items-center">{renderStars(vendor.rating)}</View>
          <View className="bg-pink-50 px-2 py-0.5 rounded-full">
            <Text className="text-pink-600 text-[9px] font-bold"> {/* Reduced font */}
              {vendor.reviews} review{vendor.reviews !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Book Now Button - Smaller */}
        {/* <TouchableOpacity
          className="bg-pink-500 py-2 rounded-xl items-center"
          style={{
            shadowColor: '#eb278d',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
          activeOpacity={0.8}
          onPress={onPress}
        >
          <Text className="text-white text-xs font-bold">Book Now</Text> 
        </TouchableOpacity> */}
      </View>
    </TouchableOpacity>
  );
};

export default VendorCard;
