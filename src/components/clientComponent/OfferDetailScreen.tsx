import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { offerAPI, handleAPIError } from '@/api/api';

interface OfferResponse {
  _id: string;
  vendor: {
    _id: string;
    firstName: string;
    lastName: string;
    vendorProfile: {
      businessName: string;
      rating: number;
    };
  };
  proposedPrice: number;
  counterOffer?: number;
  message?: string;
  estimatedDuration?: number;
  respondedAt: string;
  isAccepted: boolean;
}

interface Offer {
  _id: string;
  title: string;
  description: string;
  proposedPrice: number;
  status: string;
  responses: OfferResponse[];
  createdAt: string;
  expiresAt: string;
  images: string[];
  category: {
    name: string;
  };
  location: {
    address: string;
    city: string;
    state: string;
  };
  flexibility: string;
  preferredDate?: string;
  preferredTime?: string;
}

const OfferDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { offerId } = route.params as { offerId: string };

  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOfferDetail();
  }, []);

  const fetchOfferDetail = async () => {
    try {
      setLoading(true);
      const response = await offerAPI.getOfferById(offerId);

      if (response.success) {
        setOffer(response.data);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptResponse = async (responseId: string) => {
    Alert.alert(
      'Accept Response',
      'Are you sure you want to accept this response? A booking will be created.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setSubmitting(true);
              const response = await offerAPI.acceptResponse(offerId, responseId);

              if (response.success) {
                Alert.alert(
                  'Success',
                  'Response accepted! Your booking has been created.',
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
              }
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleCounterOffer = (responseId: string, currentPrice: number) => {
    setSelectedResponse(responseId);
    setCounterPrice(currentPrice.toString());
    setShowCounterModal(true);
  };

  const submitCounterOffer = async () => {
    if (!selectedResponse || !counterPrice) return;

    const price = parseFloat(counterPrice);
    if (price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setSubmitting(true);
      const response = await offerAPI.counterOffer(offerId, selectedResponse, price);

      if (response.success) {
        Alert.alert('Success', 'Counter offer submitted successfully');
        setShowCounterModal(false);
        fetchOfferDetail();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseOffer = async () => {
    Alert.alert(
      'Close Offer',
      'Are you sure you want to close this offer? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              const response = await offerAPI.closeOffer(offerId);

              if (response.success) {
                Alert.alert('Success', 'Offer closed successfully', [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]);
              }
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
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

  if (loading || !offer) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#9333ea" />
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
          <Text className="text-lg font-semibold text-gray-900">Offer Details</Text>
          {offer.status === 'open' && (
            <TouchableOpacity onPress={handleCloseOffer} disabled={submitting}>
              <Ionicons name="close-circle-outline" size={24} color="#dc2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Offer Info */}
        <View className="bg-white p-5 mb-2">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900 mb-2">{offer.title}</Text>
              <View className="flex-row items-center gap-2">
                <View className={`px-3 py-1 rounded-full ${getStatusColor(offer.status)}`}>
                  <Text className="text-xs font-bold capitalize">{offer.status}</Text>
                </View>
                <View className="px-3 py-1 rounded-full bg-gray-100">
                  <Text className="text-xs font-semibold text-gray-700">{offer.category.name}</Text>
                </View>
              </View>
            </View>
          </View>

          <Text className="text-base text-gray-700 leading-6 mb-4">{offer.description}</Text>

          {/* Images */}
          {offer.images && offer.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {offer.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image }}
                  className="w-32 h-32 rounded-xl mr-2"
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}

          {/* Details */}
          <View className="gap-3">
            <View className="flex-row items-center">
              <Ionicons name="cash-outline" size={20} color="#9333ea" />
              <Text className="text-base text-gray-700 ml-3">
                Budget: <Text className="font-bold">{formatPrice(offer.proposedPrice)}</Text>
              </Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={20} color="#9333ea" />
              <Text className="text-base text-gray-700 ml-3">
                {offer.location.address}, {offer.location.city}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={20} color="#9333ea" />
              <Text className="text-base text-gray-700 ml-3 capitalize">
                {offer.flexibility} timing
                {offer.preferredDate && ` • ${formatDate(offer.preferredDate)}`}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={20} color="#9333ea" />
              <Text className="text-base text-gray-700 ml-3">
                Expires: {formatDate(offer.expiresAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Responses */}
        <View className="bg-white p-5">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Responses ({offer.responses.length})
          </Text>

          {offer.responses.length === 0 ? (
            <View className="items-center py-8">
              <Ionicons name="chatbox-ellipses-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-500 mt-3">No responses yet</Text>
              <Text className="text-sm text-gray-400 text-center mt-1">
                Vendors will respond to your offer soon
              </Text>
            </View>
          ) : (
            offer.responses.map((response) => (
              <View
                key={response._id}
                className="border border-gray-200 rounded-xl p-4 mb-3"
                style={{
                  backgroundColor: response.isAccepted ? '#f0fdf4' : '#fff',
                }}
              >
                {/* Vendor Info */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">
                      {response.vendor.vendorProfile.businessName ||
                        `${response.vendor.firstName} ${response.vendor.lastName}`}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="star" size={14} color="#fbbf24" />
                      <Text className="text-sm text-gray-600 ml-1">
                        {response.vendor.vendorProfile.rating?.toFixed(1) || 'New'}
                      </Text>
                    </View>
                  </View>

                  {response.isAccepted && (
                    <View className="bg-green-500 px-3 py-1 rounded-full">
                      <Text className="text-xs font-bold text-white">Accepted</Text>
                    </View>
                  )}
                </View>

                {/* Proposal Details */}
                <View className="bg-gray-50 rounded-lg p-3 mb-3">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm text-gray-600">Proposed Price:</Text>
                    <Text className="text-lg font-bold text-purple-600">
                      {formatPrice(response.proposedPrice)}
                    </Text>
                  </View>

                  {response.counterOffer && (
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-sm text-gray-600">Your Counter:</Text>
                      <Text className="text-base font-semibold text-orange-600">
                        {formatPrice(response.counterOffer)}
                      </Text>
                    </View>
                  )}

                  {response.estimatedDuration && (
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm text-gray-600">Duration:</Text>
                      <Text className="text-sm font-medium text-gray-700">
                        {response.estimatedDuration} mins
                      </Text>
                    </View>
                  )}
                </View>

                {/* Message */}
                {response.message && (
                  <View className="mb-3">
                    <Text className="text-sm text-gray-600 italic">`&quot{response.message}`</Text>
                  </View>
                )}

                {/* Response Date */}
                <Text className="text-xs text-gray-400 mb-3">
                  Responded {formatDate(response.respondedAt)}
                </Text>

                {/* Actions */}
                {offer.status === 'open' && !response.isAccepted && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="flex-1 bg-purple-600 py-3 rounded-xl items-center"
                      onPress={() => handleAcceptResponse(response._id)}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white font-semibold">Accept</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 border border-purple-600 py-3 rounded-xl items-center"
                      onPress={() => handleCounterOffer(response._id, response.proposedPrice)}
                      disabled={submitting}
                    >
                      <Text className="text-purple-600 font-semibold">Counter Offer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Counter Offer Modal */}
      <Modal visible={showCounterModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">Counter Offer</Text>
              <TouchableOpacity onPress={() => setShowCounterModal(false)}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm text-gray-600 mb-4">
              Enter your counter offer price
            </Text>

            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 mb-6">
              <Ionicons name="cash-outline" size={20} color="#9333ea" />
              <TextInput
                className="flex-1 py-3.5 px-3 text-base text-gray-900"
                placeholder="Enter amount"
                value={counterPrice}
                onChangeText={(text) => setCounterPrice(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-4 rounded-xl items-center"
                onPress={() => setShowCounterModal(false)}
                disabled={submitting}
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-purple-600 py-4 rounded-xl items-center"
                onPress={submitCounterOffer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default OfferDetailScreen;