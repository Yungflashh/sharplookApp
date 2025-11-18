import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { offerAPI, handleAPIError } from '@/api/api';
import * as Location from 'expo-location';
interface Offer {
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
  location: {
    city: string;
    state: string;
  };
  flexibility: string;
}
const AvailableOffersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [responseData, setResponseData] = useState({
    proposedPrice: '',
    message: '',
    estimatedDuration: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const fetchOffers = async () => {
    try {
      setLoading(true);
      const {
        status
      } = await Location.requestForegroundPermissionsAsync();
      let locationParams = {};
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        locationParams = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          maxDistance: 50
        };
      }
      const response = await offerAPI.getAvailableOffers({
        ...locationParams,
        page: 1,
        limit: 50
      });
      if (response.success) {
        const offersData = response.data.offers || response.data || [];
        setOffers(offersData);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Error fetching offers:', apiError);
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
  const handleRespondToOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setResponseData({
      proposedPrice: offer.proposedPrice.toString(),
      message: '',
      estimatedDuration: ''
    });
    setShowRespondModal(true);
  };
  const submitResponse = async () => {
    if (!selectedOffer) return;
    if (!responseData.proposedPrice || parseFloat(responseData.proposedPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    try {
      setSubmitting(true);
      const data = {
        proposedPrice: parseFloat(responseData.proposedPrice),
        message: responseData.message || undefined,
        estimatedDuration: responseData.estimatedDuration ? parseInt(responseData.estimatedDuration) : undefined
      };
      const response = await offerAPI.respondToOffer(selectedOffer._id, data);
      if (response.success) {
        Alert.alert('Success', 'Your response has been submitted successfully!');
        setShowRespondModal(false);
        fetchOffers();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setSubmitting(false);
    }
  };
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
  const renderOfferCard = (offer: Offer) => <TouchableOpacity key={offer._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm" style={{
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  }} activeOpacity={0.7}>
      {}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900 mb-1">{offer.title}</Text>
          <Text className="text-sm text-gray-600">{offer.category.name}</Text>
        </View>

        <View className="bg-purple-100 px-3 py-1 rounded-full">
          <Text className="text-xs font-bold text-purple-700 capitalize">
            {offer.flexibility}
          </Text>
        </View>
      </View>

      {}
      <Text className="text-sm text-gray-700 mb-3" numberOfLines={2}>
        {offer.description}
      </Text>

      {}
      <View className="gap-2 mb-3">
        <View className="flex-row items-center">
          <Ionicons name="person-outline" size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-2">
            {offer.client.firstName} {offer.client.lastName}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="cash-outline" size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-2">
            Budget: <Text className="font-semibold">{formatPrice(offer.proposedPrice)}</Text>
          </Text>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text className="text-sm text-gray-600 ml-2">
            {offer.location.city}, {offer.location.state}
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

        <TouchableOpacity className="bg-purple-600 px-4 py-2 rounded-lg" onPress={() => handleRespondToOffer(offer)}>
          <Text className="text-white font-semibold text-sm">Respond</Text>
        </TouchableOpacity>
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
          <Text className="text-xl font-bold text-gray-900">Available Offers</Text>
          <TouchableOpacity onPress={() => navigation.navigate('VendorMyResponses')}>
            <Ionicons name="chatbox-ellipses-outline" size={24} color="#9333ea" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9333ea" />}>
        <View className="px-5 py-4">
          {}
          <View className="bg-purple-50 rounded-xl p-4 mb-4 flex-row">
            <Ionicons name="information-circle" size={24} color="#9333ea" />
            <Text className="flex-1 ml-3 text-sm text-purple-700 leading-5">
              These are open offers from clients looking for services. Respond with your best proposal!
            </Text>
          </View>

          {offers.length > 0 ? offers.map(offer => renderOfferCard(offer)) : <View className="flex-1 items-center justify-center py-20">
              <View className="w-24 h-24 rounded-full bg-purple-100 items-center justify-center mb-4">
                <Ionicons name="pricetag-outline" size={48} color="#9333ea" />
              </View>
              <Text className="text-lg font-bold text-gray-900 mb-2">No Offers Available</Text>
              <Text className="text-gray-600 text-center px-8">
                Check back later for new offers from clients
              </Text>
            </View>}
        </View>
      </ScrollView>

      {}
      <Modal visible={showRespondModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6" style={{
          maxHeight: '80%'
        }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Submit Response</Text>
              <TouchableOpacity onPress={() => setShowRespondModal(false)}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedOffer && <View className="bg-gray-50 rounded-xl p-4 mb-6">
                <Text className="text-base font-bold text-gray-900 mb-1">
                  {selectedOffer.title}
                </Text>
                <Text className="text-sm text-gray-600">
                  Client Budget: {formatPrice(selectedOffer.proposedPrice)}
                </Text>
              </View>}

            <ScrollView showsVerticalScrollIndicator={false}>
              {}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-900 mb-2">
                  Your Price (₦) *
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-xl px-4">
                  <Ionicons name="cash-outline" size={20} color="#9333ea" />
                  <TextInput className="flex-1 py-3.5 px-3 text-base text-gray-900" placeholder="Enter your price" value={responseData.proposedPrice} onChangeText={text => setResponseData({
                  ...responseData,
                  proposedPrice: text.replace(/[^0-9]/g, '')
                })} keyboardType="numeric" />
                </View>
              </View>

              {}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-900 mb-2">
                  Estimated Duration (minutes)
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-xl px-4">
                  <Ionicons name="time-outline" size={20} color="#9333ea" />
                  <TextInput className="flex-1 py-3.5 px-3 text-base text-gray-900" placeholder="e.g., 60" value={responseData.estimatedDuration} onChangeText={text => setResponseData({
                  ...responseData,
                  estimatedDuration: text.replace(/[^0-9]/g, '')
                })} keyboardType="numeric" />
                </View>
              </View>

              {}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-900 mb-2">
                  Message (Optional)
                </Text>
                <TextInput className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 h-24" placeholder="Tell the client why you're the best fit..." value={responseData.message} onChangeText={text => setResponseData({
                ...responseData,
                message: text
              })} multiline numberOfLines={4} textAlignVertical="top" />
              </View>
            </ScrollView>

            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 bg-gray-100 py-4 rounded-xl items-center" onPress={() => setShowRespondModal(false)} disabled={submitting}>
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 bg-purple-600 py-4 rounded-xl items-center" onPress={submitResponse} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Submit Response</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>;
};
export default AvailableOffersScreen;