import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, TextInput, Modal } from 'react-native';
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fetchMyResponses = async () => {
    try {
      setLoading(true);
      const response = await offerAPI.getMyResponses({
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
    fetchMyResponses();
  }, []);
  useFocusEffect(useCallback(() => {
    fetchMyResponses();
  }, []));
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyResponses().finally(() => setRefreshing(false));
  }, []);
  const handleAcceptCounter = async (offerId: string, responseId: string) => {
    Alert.alert('Accept Counter Offer', "Do you want to accept the client's counter offer? A booking will be created.", [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Accept',
      onPress: async () => {
        try {
          setActionLoading(responseId);
          const response = await offerAPI.acceptCounterOffer(offerId, responseId);
          if (response.success) {
            Alert.alert('Success', 'Counter offer accepted! Your booking has been created.', [{
              text: 'View Booking',
              onPress: () => {
                navigation.navigate('BookingDetail', {
                  bookingId: response.data.booking._id
                });
              }
            }]);
            fetchMyResponses();
          }
        } catch (error) {
          const apiError = handleAPIError(error);
          Alert.alert('Error', apiError.message);
        } finally {
          setActionLoading(null);
        }
      }
    }]);
  };
  const handleVendorCounter = (offerId: string, responseId: string, currentCounter: number) => {
    setSelectedOffer({
      _id: offerId,
      responseId,
      currentPrice: currentCounter
    });
    setCounterPrice(currentCounter.toString());
    setShowCounterModal(true);
  };
  const submitVendorCounter = async () => {
    if (!selectedOffer || !counterPrice) return;
    const price = parseFloat(counterPrice);
    if (price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    try {
      setSubmitting(true);
      const response = await offerAPI.vendorCounterOffer(selectedOffer._id, selectedOffer.responseId, price);
      if (response.success) {
        Alert.alert('Success', 'Counter offer submitted successfully');
        setShowCounterModal(false);
        fetchMyResponses();
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
    const myResponse = offer.responses[0];
    if (!myResponse) return null;
    const hasClientCounter = myResponse.counterOffer !== undefined && myResponse.counterOffer !== null;
    const canNegotiate = offer.status === 'open' && !myResponse.isAccepted;
    return <View key={offer._id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm" style={{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2
    }}>
        {}
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
            {myResponse.isAccepted && <View className="bg-green-500 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-white">Accepted</Text>
              </View>}
          </View>
        </View>

        {}
        <Text className="text-sm text-gray-700 mb-3" numberOfLines={2}>
          {offer.description}
        </Text>

        {}
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

          {hasClientCounter && <View className="flex-row items-center justify-between border-t border-gray-200 pt-2 mt-2">
              <View className="flex-row items-center">
                <Ionicons name="arrow-forward" size={16} color="#f97316" />
                <Text className="text-sm text-orange-600 font-semibold ml-1">
                  Client Counter:
                </Text>
              </View>
              <Text className="text-lg font-bold text-orange-600">
                {formatPrice(myResponse.counterOffer!)}
              </Text>
            </View>}
        </View>

        {}
        <View className="gap-2 mb-3">
          {myResponse.estimatedDuration && <View className="flex-row items-center">
              <Ionicons name="time-outline" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-2">
                Duration: {myResponse.estimatedDuration} mins
              </Text>
            </View>}

          {myResponse.message && <View className="flex-row items-start">
              <Ionicons name="chatbox-outline" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-2 flex-1" numberOfLines={2}>
                {myResponse.message}
              </Text>
            </View>}

          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-2">
              Responded {formatDate(myResponse.respondedAt)}
            </Text>
          </View>
        </View>

        {}
        {hasClientCounter && canNegotiate && <View className="bg-orange-50 rounded-lg p-3 mb-3">
            <View className="flex-row items-center mb-3">
              <Ionicons name="alert-circle" size={20} color="#f97316" />
              <Text className="text-sm text-orange-700 ml-2 flex-1 font-semibold">
                Client has countered with {formatPrice(myResponse.counterOffer!)}
              </Text>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => handleAcceptCounter(offer._id, myResponse._id)} disabled={actionLoading === myResponse._id} className="flex-1 bg-green-500 py-3 rounded-xl" style={{
            shadowColor: '#10b981',
            shadowOffset: {
              width: 0,
              height: 2
            },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2
          }}>
                {actionLoading === myResponse._id ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-center font-bold text-sm">
                    Accept {formatPrice(myResponse.counterOffer!)}
                  </Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleVendorCounter(offer._id, myResponse._id, myResponse.counterOffer!)} disabled={actionLoading === myResponse._id} className="flex-1 bg-orange-500 py-3 rounded-xl" style={{
            shadowColor: '#f97316',
            shadowOffset: {
              width: 0,
              height: 2
            },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2
          }}>
                <Text className="text-white text-center font-bold text-sm">Counter Back</Text>
              </TouchableOpacity>
            </View>
          </View>}

        {}
        {myResponse.isAccepted && <View className="bg-green-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text className="text-sm text-green-700 ml-2 flex-1">
              Congratulations! Your response was accepted. A booking has been created.
            </Text>
          </View>}

        {!hasClientCounter && !myResponse.isAccepted && offer.status === 'open' && <View className="bg-blue-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="hourglass" size={20} color="#3b82f6" />
            <Text className="text-sm text-blue-700 ml-2 flex-1">
              Waiting for client`s response
            </Text>
          </View>}

        {offer.status === 'closed' && !myResponse.isAccepted && <View className="bg-red-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="close-circle" size={20} color="#dc2626" />
            <Text className="text-sm text-red-700 ml-2 flex-1">
              This offer has been closed by the client.
            </Text>
          </View>}

        {offer.status === 'expired' && !myResponse.isAccepted && <View className="bg-gray-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="time" size={20} color="#6b7280" />
            <Text className="text-sm text-gray-700 ml-2 flex-1">This offer has expired.</Text>
          </View>}
      </View>;
  };
  if (loading) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333ea" />
          <Text className="text-gray-400 text-sm mt-4">Loading responses...</Text>
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
          <Text className="text-xl font-bold text-gray-900">My Responses</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AvailableOffers')}>
            <Ionicons name="add-circle" size={28} color="#9333ea" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9333ea" />}>
        <View className="px-5 py-4">
          {offers.length > 0 ? offers.map(offer => renderResponseCard(offer)) : <View className="flex-1 items-center justify-center py-20">
              <View className="w-24 h-24 rounded-full bg-purple-100 items-center justify-center mb-4">
                <Ionicons name="chatbox-ellipses-outline" size={48} color="#9333ea" />
              </View>
              <Text className="text-lg font-bold text-gray-900 mb-2">No Responses Yet</Text>
              <Text className="text-gray-600 text-center mb-6 px-8">
                Browse available offers and submit your proposals to get started!
              </Text>
              <TouchableOpacity className="bg-purple-600 px-6 py-3 rounded-xl" onPress={() => navigation.navigate('AvailableOffers')}>
                <Text className="text-white font-semibold">Browse Offers</Text>
              </TouchableOpacity>
            </View>}
        </View>
      </ScrollView>

      {}
      <Modal visible={showCounterModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Counter Back</Text>
              <TouchableOpacity onPress={() => setShowCounterModal(false)}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm text-gray-600 mb-4">
              Client offered{' '}
              {selectedOffer && formatPrice(selectedOffer.currentPrice)}. Enter your
              counter price:
            </Text>

            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 mb-6">
              <Ionicons name="cash-outline" size={20} color="#9333ea" />
              <TextInput className="flex-1 py-3.5 px-3 text-base text-gray-900" placeholder="Enter amount" value={counterPrice} onChangeText={text => setCounterPrice(text.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 bg-gray-100 py-4 rounded-xl items-center" onPress={() => setShowCounterModal(false)} disabled={submitting}>
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 bg-orange-500 py-4 rounded-xl items-center" onPress={submitVendorCounter} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Submit Counter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>;
};
export default VendorMyResponsesScreen;