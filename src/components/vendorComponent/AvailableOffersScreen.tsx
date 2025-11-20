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
    estimatedDuration: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchOffers = async () => {
    try {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      let locationParams = {};

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        locationParams = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          maxDistance: 50,
        };
      }

      const response = await offerAPI.getAvailableOffers({
        ...locationParams,
        page: 1,
        limit: 50,
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

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers().finally(() => setRefreshing(false));
  }, []);

  const handleRespondToOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setResponseData({
      proposedPrice: offer.proposedPrice.toString(),
      message: '',
      estimatedDuration: '',
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
        estimatedDuration: responseData.estimatedDuration
          ? parseInt(responseData.estimatedDuration)
          : undefined,
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
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const renderOfferCard = (offer: Offer) => (
    <TouchableOpacity
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
      activeOpacity={0.95}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-bold text-gray-900 mb-2">{offer.title}</Text>
          <View className="flex-row items-center">
            <View className="bg-pink-100 px-3 py-1 rounded-full mr-2">
              <Text className="text-xs font-bold text-pink-700">{offer.category.name}</Text>
            </View>
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-blue-700 capitalize">{offer.flexibility}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Description */}
      <Text className="text-sm text-gray-700 mb-4 leading-5" numberOfLines={3}>
        {offer.description}
      </Text>

      {/* Details Section */}
      <View className="bg-gray-50 rounded-2xl p-4 mb-4" style={{ gap: 12 }}>
        <View className="flex-row items-center">
          <LinearGradient
            colors={['#eb278d', '#f472b6']}
            className="w-9 h-9 rounded-xl items-center justify-center mr-3"
          >
            <Ionicons name="person" size={18} color="#fff" />
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-0.5 font-medium">Client</Text>
            <Text className="text-sm font-bold text-gray-900">
              {offer.client.firstName} {offer.client.lastName}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <LinearGradient
            colors={['#10b981', '#059669']}
            className="w-9 h-9 rounded-xl items-center justify-center mr-3"
          >
            <Ionicons name="cash" size={18} color="#fff" />
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-0.5 font-medium">Budget</Text>
            <Text className="text-base font-bold text-green-600">
              {formatPrice(offer.proposedPrice)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            className="w-9 h-9 rounded-xl items-center justify-center mr-3"
          >
            <Ionicons name="location" size={18} color="#fff" />
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-0.5 font-medium">Location</Text>
            <Text className="text-sm font-bold text-gray-900">
              {offer.location.city}, {offer.location.state}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            className="w-9 h-9 rounded-xl items-center justify-center mr-3"
          >
            <Ionicons name="time" size={18} color="#fff" />
          </LinearGradient>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-0.5 font-medium">Expires</Text>
            <Text className="text-sm font-bold text-gray-900">{formatDate(offer.expiresAt)}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between pt-4 border-t border-gray-100">
        <Text className="text-xs text-gray-400 font-medium">
          Posted {formatDate(offer.createdAt)}
        </Text>

        <TouchableOpacity
          className="rounded-xl overflow-hidden"
          onPress={() => handleRespondToOffer(offer)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#eb278d', '#f472b6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-6 py-2.5"
            style={{
              shadowColor: '#eb278d',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center">
              <Ionicons name="paper-plane" size={16} color="#fff" />
              <Text className="text-white font-bold text-sm ml-1.5">Respond</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4 font-medium">Loading offers...</Text>
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
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View className="flex-1 items-center">
              <Text className="text-xl font-bold text-white">Available Offers</Text>
              <Text className="text-white/80 text-xs mt-0.5">
                {offers.length} {offers.length === 1 ? 'offer' : 'offers'} available
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('VendorMyResponses')}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="chatbox-ellipses" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Stats Card */}
          <View className="bg-white/20 rounded-2xl p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white/90 text-xl font-semibold mb-1">Active Offers</Text>
                <Text className="text-white text-2xl font-bold">{offers.length}</Text>
              </View>
              <View className="w-px h-10 bg-black mx-4" />
             
            </View>
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
          {/* Info Banner */}
          <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex-row">
            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
            </View>
            <Text className="flex-1 text-sm text-blue-900 leading-5 font-medium">
              These are open offers from clients looking for services. Respond with your best
              proposal!
            </Text>
          </View>

          {offers.length > 0 ? (
            offers.map((offer) => renderOfferCard(offer))
          ) : (
            <View className="flex-1 items-center justify-center py-20 px-8">
              <LinearGradient
                colors={['#fce7f3', '#fdf2f8']}
                className="w-32 h-32 rounded-full items-center justify-center mb-6"
              >
                <Ionicons name="pricetag-outline" size={64} color="#eb278d" />
              </LinearGradient>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                No Offers Available
              </Text>
              <Text className="text-gray-600 text-center text-sm leading-5">
                Check back later for new offers from clients seeking your services
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Enhanced Modal */}
      <Modal visible={showRespondModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '85%' }}>
            {/* Modal Header */}
            <LinearGradient
              colors={['#eb278d', '#f472b6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-t-3xl px-6 py-5"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-1">Submit Your Proposal</Text>
                  <Text className="text-white/80 text-xs">Make your best offer to win this job</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowRespondModal(false)}
                  className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView className="px-6 py-5" showsVerticalScrollIndicator={false}>
              {selectedOffer && (
                <View className="bg-gray-50 rounded-2xl p-4 mb-6">
                  <Text className="text-base font-bold text-gray-900 mb-2">
                    {selectedOffer.title}
                  </Text>
                  <View className="flex-row items-center">
                    <Ionicons name="cash" size={16} color="#10b981" />
                    <Text className="text-sm text-gray-600 ml-2">
                      Client Budget:{' '}
                      <Text className="font-bold text-green-600">
                        {formatPrice(selectedOffer.proposedPrice)}
                      </Text>
                    </Text>
                  </View>
                </View>
              )}

              {/* Your Price */}
              <View className="mb-5">
                <Text className="text-sm font-bold text-gray-900 mb-2">
                  Your Price (₦) <Text className="text-pink-600">*</Text>
                </Text>
                <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 bg-white">
                  <View className="w-9 h-9 rounded-lg bg-green-100 items-center justify-center mr-3">
                    <Ionicons name="cash" size={20} color="#10b981" />
                  </View>
                  <TextInput
                    className="flex-1 py-4 text-base text-gray-900 font-semibold"
                    placeholder="Enter your price"
                    placeholderTextColor="#9ca3af"
                    value={responseData.proposedPrice}
                    onChangeText={(text) =>
                      setResponseData({
                        ...responseData,
                        proposedPrice: text.replace(/[^0-9]/g, ''),
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Estimated Duration */}
              <View className="mb-5">
                <Text className="text-sm font-bold text-gray-900 mb-2">
                  Estimated Duration (minutes)
                </Text>
                <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 bg-white">
                  <View className="w-9 h-9 rounded-lg bg-blue-100 items-center justify-center mr-3">
                    <Ionicons name="time" size={20} color="#3b82f6" />
                  </View>
                  <TextInput
                    className="flex-1 py-4 text-base text-gray-900 font-semibold"
                    placeholder="e.g., 60"
                    placeholderTextColor="#9ca3af"
                    value={responseData.estimatedDuration}
                    onChangeText={(text) =>
                      setResponseData({
                        ...responseData,
                        estimatedDuration: text.replace(/[^0-9]/g, ''),
                      })
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Message */}
              <View className="mb-6">
                <Text className="text-sm font-bold text-gray-900 mb-2">
                  Message <Text className="text-gray-400">(Optional)</Text>
                </Text>
                <View className="border-2 border-gray-200 rounded-xl p-4 bg-white">
                  <TextInput
                    className="text-base text-gray-900 min-h-[100px]"
                    placeholder="Tell the client why you're the best fit for this job..."
                    placeholderTextColor="#9ca3af"
                    value={responseData.message}
                    onChangeText={(text) =>
                      setResponseData({
                        ...responseData,
                        message: text,
                      })
                    }
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="px-6 pb-6 pt-4 border-t border-gray-100" style={{ gap: 12 }}>
              <TouchableOpacity
                className="bg-gray-100 py-4 rounded-xl items-center"
                onPress={() => setShowRespondModal(false)}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text className="text-gray-700 font-bold text-base">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-xl overflow-hidden"
                onPress={submitResponse}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#eb278d', '#f472b6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="py-4 items-center"
                  style={{
                    shadowColor: '#eb278d',
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
                      <Text className="text-white font-bold text-base ml-2">Submit Proposal</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AvailableOffersScreen;