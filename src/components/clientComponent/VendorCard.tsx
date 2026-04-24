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
  showFavorite?: boolean;
}
const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  onPress,
  onFavoritePress,
  isFavorite = false,
  width = 180,
  showFavorite = false
}) => {
  const renderStars = (rating: number) => {
    return <View className="flex-row items-center" style={{ gap: 1 }}>
        {[1, 2, 3, 4, 5].map(star => <Ionicons key={star} name={star <= rating ? 'star' : 'star-outline'} size={14} color={star <= rating ? '#fbbf24' : '#d1d5db'} />)}
        <Text className="text-xs text-gray-600 font-semibold ml-1.5">{rating.toFixed(1)}</Text>
      </View>;
  };
  return <TouchableOpacity className="bg-white rounded-2xl overflow-hidden border border-gray-100" style={{
    width,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  }} activeOpacity={0.9} onPress={onPress}>
      {/* Image */}
      <View className="relative">
        {vendor.image ? <Image source={{
        uri: vendor.image
      }} className="w-full" style={{ height: 170 }} resizeMode="cover" /> : <View style={{ height: 170, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: '#9ca3af' }}>
                {vendor.businessName?.charAt(0)?.toUpperCase() || 'V'}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, fontWeight: '500' }}>No photo yet</Text>
          </View>}

        {/* Favorite */}
        {showFavorite && onFavoritePress && <TouchableOpacity className="absolute top-3 right-3 w-9 h-9 rounded-full items-center justify-center" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }} activeOpacity={0.7} onPress={onFavoritePress}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color="#eb278d" />
          </TouchableOpacity>}

        {/* Verified badge */}
        {vendor.isVerified && <View className="absolute top-3 left-3 bg-green-500 px-2.5 py-1 rounded-full flex-row items-center">
            <Ionicons name="checkmark-circle" size={13} color="#fff" />
            <Text className="text-white text-[10px] font-bold ml-1">VERIFIED</Text>
          </View>}


      </View>

      {/* Content */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        {/* Business name */}
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 }} numberOfLines={2}>
          {vendor.businessName}
        </Text>

        {/* Service type badge */}
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: vendor.vendorType === 'home_service' ? '#dbeafe' : vendor.vendorType === 'in_shop' ? '#d1fae5' : '#ede9fe',
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
          }}>
            <Ionicons
              name={vendor.vendorType === 'home_service' ? 'home-outline' : vendor.vendorType === 'in_shop' ? 'storefront-outline' : 'layers-outline'}
              size={12}
              color={vendor.vendorType === 'home_service' ? '#2563eb' : vendor.vendorType === 'in_shop' ? '#059669' : '#7c3aed'}
            />
            <Text style={{
              fontSize: 11, fontWeight: '600', marginLeft: 4,
              color: vendor.vendorType === 'home_service' ? '#2563eb' : vendor.vendorType === 'in_shop' ? '#059669' : '#7c3aed',
            }}>
              {vendor.service}
            </Text>
          </View>
        </View>

        {/* Rating */}
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          {renderStars(vendor.rating)}
        </View>

        {/* Reviews */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#6b7280', fontWeight: '500' }}>
            {vendor.reviews} review{vendor.reviews !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>;
};
export default VendorCard;