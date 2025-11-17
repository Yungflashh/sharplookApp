import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
interface ServiceCardProps {
  service: {
    _id: string;
    name: string;
    description?: string;
    basePrice: number;
    duration?: number;
    category?: {
      name: string;
      icon: string;
    };
    images?: string[];
    isActive?: boolean;
  };
  onPress?: () => void;
}
const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onPress
}) => {
  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };
  return <TouchableOpacity className="bg-white rounded-2xl overflow-hidden mb-4" style={{
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  }} onPress={onPress} activeOpacity={0.9}>
      <View className="flex-row">
        {}
        <View className="w-28 h-28">
          {service.images && service.images.length > 0 ? <Image source={{
          uri: service.images[0]
        }} className="w-full h-full" resizeMode="cover" /> : <LinearGradient colors={['#f3f4f6', '#e5e7eb']} className="w-full h-full items-center justify-center">
              <Ionicons name="cut" size={32} color="#9ca3af" />
            </LinearGradient>}
          
          {}
          {service.isActive !== undefined && <View className={`absolute top-2 right-2 px-2 py-0.5 rounded-full ${service.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
              <Text className="text-white text-[10px] font-bold">
                {service.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>}
        </View>

        {}
        <View className="flex-1 p-4">
          <View className="flex-row items-start justify-between mb-2">
            <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={2}>
              {service.name}
            </Text>
          </View>

          {service.description && <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
              {service.description}
            </Text>}

          <View className="flex-row items-center justify-between">
            {}
            <View className="flex-row items-center">
              <Ionicons name="pricetag" size={16} color="#eb278d" />
              <Text className="text-lg font-bold text-pink-600 ml-1">
                {formatPrice(service.basePrice)}
              </Text>
            </View>

            {}
            {service.duration && <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text className="text-sm text-gray-600 ml-1">
                  {formatDuration(service.duration)}
                </Text>
              </View>}
          </View>

          {}
          {service.category && <View className="mt-2">
              <View className="bg-pink-50 px-3 py-1 rounded-full self-start">
                <Text className="text-pink-600 text-xs font-semibold">
                  {service.category.name}
                </Text>
              </View>
            </View>}
        </View>
      </View>

      {}
      <View className="border-t border-gray-100 px-4 py-3">
        {service.isActive !== false ? <TouchableOpacity className="bg-pink-500 py-2.5 rounded-xl items-center" style={{
        shadowColor: '#eb278d',
        shadowOffset: {
          width: 0,
          height: 2
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2
      }} onPress={onPress} activeOpacity={0.8}>
            <Text className="text-white text-sm font-bold">Book This Service</Text>
          </TouchableOpacity> : <View className="bg-gray-100 py-2.5 rounded-xl items-center">
            <Text className="text-gray-400 text-sm font-bold">Service Unavailable</Text>
          </View>}
      </View>
    </TouchableOpacity>;
};
export default ServiceCard;