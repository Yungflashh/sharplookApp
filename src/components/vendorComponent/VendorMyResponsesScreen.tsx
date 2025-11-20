import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
        limit: 50,
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

  useFocusEffect(
    useCallback(() => {
      fetchMyResponses();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyResponses().finally(() => setRefreshing(false));
  }, []);

  const handleAcceptCounter = async (offerId: string, responseId: string) => {
    Alert.alert(
      'Accept Counter Offer',
      "Do you want to accept the client's counter offer? A booking will be created.",
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setActionLoading(responseId);
              const response = await offerAPI.acceptCounterOffer(offerId, responseId);
              if (response.success) {
                Alert.alert(
                  'Success',
                  'Counter offer accepted! Your booking has been created.',
                  [
                    {
                      text: 'View Booking',
                      onPress: () => {
                        navigation.navigate('BookingDetail', {
                          bookingId: response.data.booking._id,
                        });
                      },
                    },
                  ]
                );
                fetchMyResponses();
              }
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleVendorCounter = (offerId: string, responseId: string, currentCounter: number) => {
    setSelectedOffer({
      _id: offerId,
      responseId,
      currentPrice: currentCounter,
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
      const response = await offerAPI.vendorCounterOffer(
        selectedOffer._id,
        selectedOffer.responseId,
        price
      );
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
      year: 'numeric',
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

  const renderResponseCard = (offer: OfferResponse) => {
    const myResponse = offer.responses[0];
    if (!myResponse) return null;

    const hasClientCounter =
      myResponse.counterOffer !== undefined && myResponse.counterOffer !== null;
    const canNegotiate = offer.status === 'open' && !myResponse.isAccepted;

    return (
      <View
        key={offer._id}
        className="bg-white rounded-3xl p-5 mb-4"
        style={{
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
            },
            android: {
              elevation: 4,
            },
          }),
        }}
      >
        {}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-900 mb-2">{offer.title}</Text>
            <View className="flex-row items-center">
              <LinearGradient
                colors={['#eb278d', '#f472b6']}
                className="w-7 h-7 rounded-full items-center justify-center mr-2"
              >
                <Ionicons name="person" size={14} color="#fff" />
              </LinearGradient>
              <Text className="text-sm text-gray-700 font-semibold">
                {offer.client.firstName} {offer.client.lastName}
              </Text>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <View className={`px-3 py-1.5 rounded-full border ${getStatusColor(offer.status)}`}>
              <Text className="text-xs font-bold capitalize">{offer.status}</Text>
            </View>
            {myResponse.isAccepted && (
              <View className="bg-green-500 px-3 py-1.5 rounded-full">
                <Text className="text-xs font-bold text-white">✓ Accepted</Text>
              </View>
            )}
          </View>
        </View>

        {}
        <Text className="text-sm text-gray-700 mb-4 leading-5" numberOfLines={2}>
          {offer.description}
        </Text>

        {}
        <View className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <View className="w-8 h-8 rounded-lg bg-gray-200 items-center justify-center mr-2">
                <Ionicons name="wallet" size={16} color="#6b7280" />
              </View>
              <Text className="text-xs text-gray-600 font-medium">Client Budget</Text>
            </View>
            <Text className="text-base font-bold text-gray-700">
              {formatPrice(offer.proposedPrice)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <LinearGradient
                colors={['#eb278d', '#f472b6']}
                className="w-8 h-8 rounded-lg items-center justify-center mr-2"
              >
                <Ionicons name="pricetag" size={16} color="#fff" />
              </LinearGradient>
              <Text className="text-xs text-gray-600 font-medium">Your Proposal</Text>
            </View>
            <Text className="text-base font-bold text-pink-600">
              {formatPrice(myResponse.proposedPrice)}
            </Text>
          </View>

          {hasClientCounter && (
            <View className="border-t-2 border-orange-200 pt-3 mt-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <LinearGradient
                    colors={['#f97316', '#ea580c']}
                    className="w-8 h-8 rounded-lg items-center justify-center mr-2"
                  >
                    <Ionicons name="swap-horizontal" size={16} color="#fff" />
                  </LinearGradient>
                  <Text className="text-xs text-orange-600 font-bold">Client Counter</Text>
                </View>
                <Text className="text-lg font-bold text-orange-600">
                  {formatPrice(myResponse.counterOffer!)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {}
        <View style={{ gap: 10 }} className="mb-4">
          {myResponse.estimatedDuration && (
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-blue-100 items-center justify-center mr-2">
                <Ionicons name="time" size={16} color="#3b82f6" />
              </View>
              <Text className="text-sm text-gray-700 font-medium">
                Duration: {myResponse.estimatedDuration} mins
              </Text>
            </View>
          )}

          {myResponse.message && (
            <View className="flex-row items-start">
              <View className="w-8 h-8 rounded-lg bg-purple-100 items-center justify-center mr-2">
                <Ionicons name="chatbox" size={16} color="#a855f7" />
              </View>
              <Text className="text-sm text-gray-700 flex-1" numberOfLines={2}>
                {myResponse.message}
              </Text>
            </View>
          )}

          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center mr-2">
              <Ionicons name="calendar" size={16} color="#6b7280" />
            </View>
            <Text className="text-xs text-gray-500 font-medium">
              Responded {formatDate(myResponse.respondedAt)}
            </Text>
          </View>
        </View>

        {}
        {hasClientCounter && canNegotiate && (
          <View className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                <Ionicons name="alert-circle" size={24} color="#f97316" />
              </View>
              <Text className="text-sm text-orange-900 flex-1 font-bold leading-5">
                Client countered with {formatPrice(myResponse.counterOffer!)}
              </Text>
            </View>

            <View className="flex-row" style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleAcceptCounter(offer._id, myResponse._id)}
                disabled={actionLoading === myResponse._id}
                className="flex-1 rounded-xl overflow-hidden"
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="py-3"
                  style={{
                    shadowColor: '#10b981',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  {actionLoading === myResponse._id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text className="text-white text-center font-bold text-sm ml-1.5">
                        Accept
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  handleVendorCounter(offer._id, myResponse._id, myResponse.counterOffer!)
                }
                disabled={actionLoading === myResponse._id}
                className="flex-1 rounded-xl overflow-hidden"
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#f97316', '#ea580c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="py-3"
                  style={{
                    shadowColor: '#f97316',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="swap-horizontal" size={18} color="#fff" />
                    <Text className="text-white text-center font-bold text-sm ml-1.5">
                      Counter
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {}
        {myResponse.isAccepted && (
          <View className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            </View>
            <Text className="text-sm text-green-800 flex-1 leading-5 font-semibold">
              Congratulations! Your response was accepted. A booking has been created.
            </Text>
          </View>
        )}

        {!hasClientCounter && !myResponse.isAccepted && offer.status === 'open' && (
          <View className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex-row items-center justify-center">
            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
              <Ionicons name="time" size={24} color="#3b82f6" />
            </View>
            <Text className="text-sm text-blue-800 flex-1 leading-5 font-semibold">
              Waiting for client's response
            </Text>
          </View>
        )}

        {offer.status === 'closed' && !myResponse.isAccepted && (
          <View className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
              <Ionicons name="close-circle" size={24} color="#dc2626" />
            </View>
            <Text className="text-sm text-red-800 flex-1 leading-5 font-semibold">
              This offer has been closed by the client.
            </Text>
          </View>
        )}

        {offer.status === 'expired' && !myResponse.isAccepted && (
          <View className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 flex-row items-start">
            <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
              <Ionicons name="time" size={24} color="#6b7280" />
            </View>
            <Text className="text-sm text-gray-700 flex-1 leading-5 font-semibold">
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
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4 font-medium">Loading responses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Enhanced Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View className="flex-1 items-center">
              <Text className="text-xl font-bold text-white">My Responses</Text>
              <Text className="text-white/80 text-xs mt-0.5">
                {offers.length} {offers.length === 1 ? 'response' : 'responses'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('AvailableOffers')}
              className="w-10 h-10 rounded-full  items-center justify-center"
              activeOpacity={0.7}
            >
              {/* <Ionicons name="add" size={28} color="#fff" /> */}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#eb278d"
            colors={['#eb278d']}
          />
        }
      >
        <View className="px-5 py-4">
          {offers.length > 0 ? (
            offers.map((offer) => renderResponseCard(offer))
          ) : (
            <View className="flex-1 items-center justify-center py-20 px-8">
              <LinearGradient
                colors={['#fce7f3', '#fdf2f8']}
                className="w-32 h-32 rounded-full items-center justify-center mb-6"
              >
                <Ionicons name="chatbox-ellipses-outline" size={64} color="#eb278d" />
              </LinearGradient>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                No Responses Yet
              </Text>
              <Text className="text-gray-600 text-center text-sm mb-6 leading-5">
                Browse available offers and submit your proposals to get started!
              </Text>
              <TouchableOpacity
                className="rounded-xl overflow-hidden"
                onPress={() => navigation.navigate('AvailableOffers')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#eb278d', '#f472b6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="px-8 py-3"
                  style={{
                    shadowColor: '#eb278d',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="search" size={20} color="#fff" />
                    <Text className="text-white font-bold text-base ml-2">Browse Offers</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Enhanced Modal */}
      <Modal visible={showCounterModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl">
            {/* Modal Header */}
            <LinearGradient
              colors={['#f97316', '#ea580c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-t-3xl px-6 py-5"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-1">Counter Offer</Text>
                  <Text className="text-white/80 text-xs">Submit your counter price</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowCounterModal(false)}
                  className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <View className="px-6 py-5">
              <View className="bg-orange-50 rounded-2xl p-4 mb-6">
                <Text className="text-sm text-orange-900 font-medium leading-5">
                  Client offered{' '}
                  <Text className="font-bold">
                    {selectedOffer && formatPrice(selectedOffer.currentPrice)}
                  </Text>
                  . Enter your counter price below:
                </Text>
              </View>

              <View className="mb-6">
                <Text className="text-sm font-bold text-gray-900 mb-2">
                  Your Counter Price (₦) <Text className="text-orange-600">*</Text>
                </Text>
                <View className="flex-row items-center border-2 border-orange-200 rounded-xl px-4 bg-white">
                  <View className="w-9 h-9 rounded-lg bg-orange-100 items-center justify-center mr-3">
                    <Ionicons name="cash" size={20} color="#f97316" />
                  </View>
                  <TextInput
                    className="flex-1 py-4 text-base text-gray-900 font-semibold"
                    placeholder="Enter amount"
                    placeholderTextColor="#9ca3af"
                    value={counterPrice}
                    onChangeText={(text) => setCounterPrice(text.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  className="bg-gray-100 py-4 rounded-xl items-center"
                  onPress={() => setShowCounterModal(false)}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text className="text-gray-700 font-bold text-base">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="rounded-xl overflow-hidden"
                  onPress={submitVendorCounter}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#f97316', '#ea580c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="py-4 items-center"
                    style={{
                      shadowColor: '#f97316',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons name="send" size={20} color="#fff" />
                        <Text className="text-white font-bold text-base ml-2">
                          Submit Counter
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default VendorMyResponsesScreen;