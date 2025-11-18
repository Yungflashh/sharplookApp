import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { offerAPI, handleAPIError } from '@/api/api';
interface Offer {
  _id: string;
  title: string;
  description: string;
  proposedPrice: number;
  status: string;
  responses: any[];
  createdAt: string;
  expiresAt: string;
  category: {
    name: string;
  };
}
const MyOffersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await offerAPI.getMyOffers({
        page: 1,
        limit: 50
      });
      if (response.success) {
        const offersData = response.data.offers || response.data || [];
        setOffers(offersData);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchOffers();
  }, []);
  useFocusEffect(useCallback(() => {
    fetchOffers();
  }, []));
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers().finally(() => setRefreshing(false));
  }, []);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'closed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const renderOfferCard = (offer: Offer) => <TouchableOpacity key={offer._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm" style={{
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  }} onPress={() => navigation.navigate('OfferDetail', {
    offerId: offer._id
  })} activeOpacity={0.7}>
      {}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 mb-1">{offer.title}</Text>
          <Text className="text-sm text-gray-600">{offer.category.name}</Text>
        </View>

        <View className={`px-3 py-1 rounded-full border ${getStatusColor(offer.status)}`}>
          <Text className="text-xs font-bold capitalize">{offer.status}</Text>
        </View>
      </View>

      {}
      <View className="gap-2 mb-3">
        <View className="flex-row items-center">
          <Ionicons name="cash-outline" size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-2">Budget: {formatPrice(offer.proposedPrice)}</Text>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="chatbox-ellipses-outline" size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-2">
            {offer.responses.length} {offer.responses.length === 1 ? 'Response' : 'Responses'}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-2">
            Expires: {formatDate(offer.expiresAt)}
          </Text>
        </View>
      </View>

      {}
      <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
        <Text className="text-xs text-gray-400">Posted {formatDate(offer.createdAt)}</Text>

        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-purple-600 font-semibold">View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#9333ea" />
        </View>
      </View>
    </TouchableOpacity>;
  if (loading) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333ea" />
          <Text className="text-gray-400 text-sm mt-4">Loading offers...</Text>
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">My Offers</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateOffer')}>
            <Ionicons name="add-circle" size={28} color="#9333ea" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9333ea" />}>
        <View className="px-5 py-4">
          {offers.length > 0 ? offers.map(offer => renderOfferCard(offer)) : <View className="flex-1 items-center justify-center py-20">
              <View className="w-24 h-24 rounded-full bg-purple-100 items-center justify-center mb-4">
                <Ionicons name="pricetag-outline" size={48} color="#9333ea" />
              </View>
              <Text className="text-lg font-bold text-gray-900 mb-2">No Offers Yet</Text>
              <Text className="text-gray-600 text-center mb-6 px-8">
                Create your first offer and let vendors come to you!
              </Text>
              <TouchableOpacity className="bg-purple-600 px-6 py-3 rounded-xl" onPress={() => navigation.navigate('CreateOffer')}>
                <Text className="text-white font-semibold">Create Offer</Text>
              </TouchableOpacity>
            </View>}
        </View>
      </ScrollView>
    </SafeAreaView>;
};
export default MyOffersScreen;