import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface Service {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  priceType: 'fixed' | 'variable';
  currency: string;
  duration: number;
  category: {
    _id: string;
    name: string;
  };
  images: string[];
  serviceArea?: {
    type: string;
    coordinates: number[];
    radius: number;
  };
  isActive: boolean;
  rating?: number;
  reviewCount?: number;
}
interface ServiceCardProps {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
}
const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onEdit,
  onDelete
}) => {
  return <View className="bg-white rounded-2xl overflow-hidden shadow-md">
      {}
      <View className="relative w-full h-32">
        {service.images && service.images.length > 0 ? <Image source={{
        uri: service.images[0]
      }} className="w-full h-full" resizeMode="cover" /> : <View className="w-full h-full bg-gray-100 justify-center items-center">
            <Ionicons name="image-outline" size={32} color="#999" />
          </View>}
        {}
        <View className={`absolute top-2 right-2 px-2 py-0.5 rounded-full ${service.isActive ? 'bg-green-500' : 'bg-gray-400'}`}>
          <Text className="text-white text-xs font-semibold">
            {service.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        {}
        {service.rating && service.rating > 0 && <View className="absolute bottom-2 left-2 bg-white/90 px-1.5 py-0.5 rounded-lg flex-row items-center">
            <Ionicons name="star" size={12} color="#FFA500" />
            <Text className="text-xs font-semibold ml-0.5">{service.rating.toFixed(1)}</Text>
            {service.reviewCount && service.reviewCount > 0 && <Text className="text-xs text-gray-500 ml-0.5">({service.reviewCount})</Text>}
          </View>}
      </View>

      {}
      <View className="p-3">
        <View className="mb-1.5">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {service.name}
          </Text>
          <View className="px-1.5 py-0.5 rounded-md self-start mt-1" style={{
          backgroundColor: '#fce7f5'
        }}>
            <Text className="text-xs font-semibold" style={{
            color: '#eb278d'
          }}>
              {service.category.name}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-gray-600 mb-2" numberOfLines={2}>
          {service.description}
        </Text>

        {}
        <View className="flex-row items-center mb-2 gap-3">
          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={14} color="#eb278d" />
            <Text className="text-xs text-gray-900 font-medium ml-1">
              {service.currency} {service.basePrice.toLocaleString()}
              {service.priceType === 'variable' && '+'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#eb278d" />
            <Text className="text-xs text-gray-900 font-medium ml-1">
              {service.duration} min
            </Text>
          </View>
        </View>

        {}
        {service.serviceArea && <View className="flex-row items-center mb-2">
            <Ionicons name="location-outline" size={14} color="#eb278d" />
            <Text className="text-xs text-gray-600 ml-1">
              {(service.serviceArea.radius / 1000).toFixed(1)} km
            </Text>
          </View>}

        {}
        <View className="flex-row gap-2">
          <TouchableOpacity className="flex-1 flex-row items-center justify-center py-2 rounded-lg" style={{
          backgroundColor: '#eb278d'
        }} onPress={onEdit} activeOpacity={0.7}>
            <Ionicons name="pencil" size={14} color="#FFFFFF" />
            <Text className="text-white text-xs font-semibold ml-1">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 bg-red-500 flex-row items-center justify-center py-2 rounded-lg" onPress={onDelete} activeOpacity={0.7}>
            <Ionicons name="trash" size={14} color="#FFFFFF" />
            <Text className="text-white text-xs font-semibold ml-1">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>;
};
export default ServiceCard;