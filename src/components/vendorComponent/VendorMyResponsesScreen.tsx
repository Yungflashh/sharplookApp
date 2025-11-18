import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { offerAPI, handleAPIError } from '@/api/api';

interface OfferResponse {
  _id: string;
  title: string;
  description: string;
  proposedPrice: number;
  status: string;
  createdAt: string;
  expiresAt: string;
  category: {
    name: string;
  };
  client: {
    firstName: string;
    lastName: string;
  };
  responses: Array<{
    _id: string;
    proposedPrice: number;
    counterOffer?: number;
    message?: string;
    estimatedDuration?: number;
    respondedAt: string;
    isAccepted: boolean;
  }>;
}

const VendorMyResponsesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState<OfferResponse[]>([]);

  const fetchMyResponses = async () => {
    try {
      setLoading(true);
      const response = await offerAPI.getMyResponses({ page: 1, limit: 50 });

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
    fetchMyResponses();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyResponses();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyResponses().finally(() => setRefreshing(false));
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderResponseCard = (offer: OfferResponse) => {
    // Get my response (should be only one, but we'll get the first)
    const myResponse = offer.responses[0];

    if (!myResponse) return null;

    return (
      <View
        key={offer._id}
        className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 mb-1">{offer.title}</Text>
            <Text className="text-sm text-gray-600">
              {offer.client.firstName} {offer.client.lastName}
            </Text>
          </View>

          <View className="gap-1">
            <View className={`px-3 py-1 rounded-full ${getStatusColor(offer.status)}`}>
              <Text className="text-xs font-bold capitalize">{offer.status}</Text>
            </View>
            {myResponse.isAccepted && (
              <View className="bg-green-500 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-white">Accepted</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <Text className="text-sm text-gray-700 mb-3" numberOfLines={2}>
          {offer.description}
        </Text>

        {/* Price Comparison */}
        <View className="bg-gray-50 rounded-lg p-3 mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-gray-600">Client Budget:</Text>
            <Text className="text-base font-semibold text-gray-700">
              {formatPrice(offer.proposedPrice)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-gray-600">Your Proposal:</Text>
            <Text className="text-base font-bold text-purple-600">
              {formatPrice(myResponse.proposedPrice)}
            </Text>
          </View>

          {myResponse.counterOffer && (
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">Client Counter:</Text>
              <Text className="text-base font-semibold text-orange-600">
                {formatPrice(myResponse.counterOffer)}
              </Text>
            </View>
          )}
        </View>

        {/* Your Details */}
        <View className="gap-2 mb-3">
          {myResponse.estimatedDuration && (
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-2">
                Duration: {myResponse.estimatedDuration} mins
              </Text>
            </View>
          )}

          {myResponse.message && (
            <View className="flex-row items-start">
              <Ionicons name="chatbox-outline" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-2 flex-1" numberOfLines={2}>
                {myResponse.message}
              </Text>
            </View>
          )}

          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-2">
              Responded {formatDate(myResponse.respondedAt)}
            </Text>
          </View>
        </View>

        {/* Status Message */}
        {myResponse.isAccepted && (
          <View className="bg-green-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text className="text-sm text-green-700 ml-2 flex-1">
              Congratulations! Your response was accepted. A booking has been created.
            </Text>
          </View>
        )}

        {myResponse.counterOffer && !myResponse.isAccepted && offer.status === 'open' && (
          <View className="bg-orange-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="alert-circle" size={20} color="#f97316" />
            <Text className="text-sm text-orange-700 ml-2 flex-1">
              Client has countered with {formatPrice(myResponse.counterOffer)}. Awaiting their decision.
            </Text>
          </View>
        )}

        {offer.status === 'closed' && !myResponse.isAccepted && (
          <View className="bg-red-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="close-circle" size={20} color="#dc2626" />
            <Text className="text-sm text-red-700 ml-2 flex-1">
              This offer has been closed by the client.
            </Text>
          </View>
        )}

        {offer.status === 'expired' && !myResponse.isAccepted && (
          <View className="bg-gray-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="time" size={20} color="#6b7280" />
            <Text className="text-sm text-gray-700 ml-2 flex-1">
              This offer has expired.
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333ea" />
          <Text className="text-gray-400 text-sm mt-4">Loading responses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">My Responses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AvailableOffers')}>
            <Ionicons name="add-circle" size={28} color="#9333ea" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9333ea" />
        }
      >
        <View className="px-5 py-4">
          {offers.length > 0 ? (
            offers.map((offer) => renderResponseCard(offer))
          ) : (
            <View className="flex-1 items-center justify-center py-20">
              <View className="w-24 h-24 rounded-full bg-purple-100 items-center justify-center mb-4">
                <Ionicons name="chatbox-ellipses-outline" size={48} color="#9333ea" />
              </View>
              <Text className="text-lg font-bold text-gray-900 mb-2">No Responses Yet</Text>
              <Text className="text-gray-600 text-center mb-6 px-8">
                Browse available offers and submit your proposals to get started!
              </Text>
              <TouchableOpacity
                className="bg-purple-600 px-6 py-3 rounded-xl"
                onPress={() => navigation.navigate('AvailableOffers')}
              >
                <Text className="text-white font-semibold">Browse Offers</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default VendorMyResponsesScreen;