import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
  serviceType: 'home' | 'shop' | 'both'; // ✅ NEW FIELD
  responses: OfferResponse[];
  createdAt: string;
  expiresAt: string;
  images: string[];
  category: {
    name: string;
  };
  location?: { // ✅ Now optional
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
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false); // ✅ NEW
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [selectedResponseForAccept, setSelectedResponseForAccept] = useState<string | null>(null); // ✅ NEW
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
    // ✅ Show payment method selection first
    setSelectedResponseForAccept(responseId);
    setShowPaymentMethodModal(true);
  };

  // ✅ NEW: Handle payment method selection and process acceptance
  const processAcceptResponse = async (paymentMethod: 'wallet' | 'card') => {
    if (!selectedResponseForAccept) return;

    setShowPaymentMethodModal(false);
    setSubmitting(true);

    try {
      const response = await offerAPI.acceptResponse(offerId, selectedResponseForAccept, paymentMethod);
      
      if (response.success) {
        const { offer: acceptedOffer, booking } = response.data;
        
        // ✅ Check if payment is required (Paystack flow)
        if (paymentMethod === 'card' && booking.authorizationUrl) {
          // Navigate to PaymentScreen with Paystack URL
          navigation.navigate('Payment', {
            bookingId: booking._id,
            amount: booking.totalAmount,
            authorizationUrl: booking.authorizationUrl,
            reference: booking.paymentReference,
          });
        } else if (booking.paymentStatus === 'escrowed') {
          // Payment already completed (wallet payment)
          Alert.alert(
            'Success',
            'Response accepted! Your booking has been created and paid.',
            [
              {
                text: 'View Booking',
                onPress: () => {
                  navigation.navigate('BookingDetail', {
                    bookingId: booking._id,
                  });
                },
              },
            ]
          );
        } else {
          // Unknown payment status
          Alert.alert(
            'Success',
            'Response accepted! Your booking has been created.',
            [
              {
                text: 'View Booking',
                onPress: () => {
                  navigation.navigate('BookingDetail', {
                    bookingId: booking._id,
                  });
                },
              },
            ]
          );
        }
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setSubmitting(false);
      setSelectedResponseForAccept(null);
    }
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

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: 'checkmark-circle' as const,
        };
      case 'accepted':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: 'thumbs-up' as const,
        };
      case 'expired':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: 'time' as const,
        };
      case 'closed':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          icon: 'close-circle' as const,
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: 'help-circle' as const,
        };
    }
  };

  // ✅ NEW: Service type configuration
  const getServiceTypeConfig = (type: string) => {
    switch (type) {
      case 'home':
        return {
          icon: 'home' as const,
          label: 'Home Service',
          description: 'Vendor comes to you',
          color: '#10b981',
          bgColor: '#d1fae5',
        };
      case 'shop':
        return {
          icon: 'storefront' as const,
          label: 'In-Shop',
          description: 'You visit vendor',
          color: '#3b82f6',
          bgColor: '#dbeafe',
        };
      case 'both':
        return {
          icon: 'repeat' as const,
          label: 'Flexible',
          description: 'Either location works',
          color: '#f59e0b',
          bgColor: '#fef3c7',
        };
      default:
        return {
          icon: 'help-circle' as const,
          label: 'Unknown',
          description: 'Service type not specified',
          color: '#6b7280',
          bgColor: '#f3f4f6',
        };
    }
  };

  if (loading || !offer) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4 font-medium">
            Loading offer details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(offer.status);
  const serviceTypeConfig = getServiceTypeConfig(offer.serviceType); // ✅ NEW

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
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

            <Text className="text-lg font-bold text-white">Offer Details</Text>

            {offer.status === 'open' ? (
              <TouchableOpacity
                onPress={handleCloseOffer}
                disabled={submitting}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View className="w-10" />
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Main Info Card */}
        <View className="px-5 py-6">
          <View
            className="bg-white rounded-3xl p-5 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {/* Title & Status */}
            <View className="mb-4">
              <Text className="text-xl font-bold text-gray-900 mb-3">
                {offer.title}
              </Text>
              <View className="flex-row items-center gap-2 flex-wrap">
                <View
                  className={`px-3 py-1.5 rounded-full ${statusConfig.bg} flex-row items-center`}
                >
                  <Ionicons name={statusConfig.icon} size={14} color={statusConfig.text.includes('green') ? '#059669' : statusConfig.text.includes('blue') ? '#3b82f6' : statusConfig.text.includes('red') ? '#dc2626' : '#6b7280'} />
                  <Text className={`text-xs font-bold ml-1 capitalize ${statusConfig.text}`}>
                    {offer.status}
                  </Text>
                </View>
                <View className="px-3 py-1.5 rounded-full bg-pink-50 border border-pink-200">
                  <Text className="text-xs font-bold text-pink-700">
                    {offer.category.name}
                  </Text>
                </View>
                {/* ✅ NEW: Service Type Badge */}
                <View 
                  className="px-3 py-1.5 rounded-full flex-row items-center"
                  style={{ backgroundColor: serviceTypeConfig.bgColor }}
                >
                  <Ionicons 
                    name={serviceTypeConfig.icon} 
                    size={14} 
                    color={serviceTypeConfig.color} 
                  />
                  <Text 
                    className="text-xs font-bold ml-1"
                    style={{ color: serviceTypeConfig.color }}
                  >
                    {serviceTypeConfig.label}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <View className="bg-gray-50 rounded-2xl p-4 mb-4">
              <Text className="text-base text-gray-700 leading-6">
                {offer.description}
              </Text>
            </View>

            {/* Images */}
            {offer.images && offer.images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ gap: 12 }}
              >
                {offer.images.map((image, index) => (
                  <Image
                    key={index}
                    source={{ uri: image }}
                    className="w-32 h-32 rounded-2xl"
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}

            {/* Details Grid */}
            <View className="gap-3">
              {/* Budget */}
              <View className="bg-pink-50 rounded-2xl p-4 flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                  <Ionicons name="cash" size={20} color="#eb278d" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-pink-600 font-semibold mb-0.5">
                    YOUR BUDGET
                  </Text>
                  <Text className="text-lg font-bold text-pink-900">
                    {formatPrice(offer.proposedPrice)}
                  </Text>
                </View>
              </View>

              {/* ✅ NEW: Service Type Card */}
              <View 
                className="rounded-2xl p-4 flex-row items-center"
                style={{ backgroundColor: serviceTypeConfig.bgColor }}
              >
                <View 
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: `${serviceTypeConfig.color}20` }}
                >
                  <Ionicons 
                    name={serviceTypeConfig.icon} 
                    size={20} 
                    color={serviceTypeConfig.color} 
                  />
                </View>
                <View className="flex-1">
                  <Text 
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: serviceTypeConfig.color }}
                  >
                    SERVICE TYPE
                  </Text>
                  <Text 
                    className="text-sm font-bold mb-0.5"
                    style={{ color: serviceTypeConfig.color }}
                  >
                    {serviceTypeConfig.label}
                  </Text>
                  <Text 
                    className="text-xs"
                    style={{ color: serviceTypeConfig.color, opacity: 0.8 }}
                  >
                    {serviceTypeConfig.description}
                  </Text>
                </View>
              </View>

              {/* ✅ UPDATED: Location - Only show for home/both */}
              {(offer.serviceType === 'home' || offer.serviceType === 'both') && offer.location && (
                <View className="bg-blue-50 rounded-2xl p-4 flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Ionicons name="location" size={20} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-blue-600 font-semibold mb-0.5">
                      LOCATION
                    </Text>
                    <Text className="text-sm font-bold text-blue-900">
                      {offer.location.city}, {offer.location.state}
                    </Text>
                    <Text className="text-xs text-blue-700 mt-0.5" numberOfLines={1}>
                      {offer.location.address}
                    </Text>
                  </View>
                </View>
              )}

              {/* Timing */}
              <View className="bg-purple-50 rounded-2xl p-4 flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                  <Ionicons name="time" size={20} color="#a855f7" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-purple-600 font-semibold mb-0.5">
                    TIMING
                  </Text>
                  <Text className="text-sm font-bold text-purple-900 capitalize">
                    {offer.flexibility}
                    {offer.preferredDate && ` • ${formatDate(offer.preferredDate)}`}
                  </Text>
                </View>
              </View>

              {/* Expiry */}
              <View className="bg-orange-50 rounded-2xl p-4 flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                  <Ionicons name="calendar" size={20} color="#f97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-orange-600 font-semibold mb-0.5">
                    EXPIRES ON
                  </Text>
                  <Text className="text-sm font-bold text-orange-900">
                    {formatDate(offer.expiresAt)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Responses Section */}
          <View
            className="bg-white rounded-3xl p-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                  <Ionicons name="chatbubbles" size={20} color="#eb278d" />
                </View>
                <View>
                  <Text className="text-lg font-bold text-gray-900">
                    Vendor Responses
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {offer.responses.length} {offer.responses.length === 1 ? 'response' : 'responses'}
                  </Text>
                </View>
              </View>
            </View>

            {offer.responses.length === 0 ? (
              <View className="items-center py-12">
                <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color="#d1d5db" />
                </View>
                <Text className="text-gray-900 text-base font-bold mb-1">
                  No responses yet
                </Text>
                <Text className="text-sm text-gray-500 text-center">
                  Vendors will respond to your offer soon
                </Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {offer.responses.map((response) => (
                  <View
                    key={response._id}
                    className="rounded-2xl p-4 border-2"
                    style={{
                      backgroundColor: response.isAccepted ? '#f0fdf4' : '#fff',
                      borderColor: response.isAccepted ? '#86efac' : '#e5e7eb',
                    }}
                  >
                    {/* Vendor Info */}
                    <View className="flex-row items-center justify-between mb-4">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-gray-900 mb-1">
                          {response.vendor.vendorProfile.businessName ||
                            `${response.vendor.firstName} ${response.vendor.lastName}`}
                        </Text>
                        <View className="flex-row items-center">
                          <Ionicons name="star" size={14} color="#fbbf24" />
                          <Text className="text-sm text-gray-600 ml-1 font-medium">
                            {response.vendor.vendorProfile.rating?.toFixed(1) || 'New'}
                          </Text>
                        </View>
                      </View>

                      {response.isAccepted && (
                        <View className="bg-green-500 px-3 py-1.5 rounded-full flex-row items-center">
                          <Ionicons name="checkmark-circle" size={14} color="#fff" />
                          <Text className="text-xs font-bold text-white ml-1">
                            Accepted
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Price Details */}
                    <View className="bg-gray-50 rounded-2xl p-4 mb-3" style={{ gap: 12 }}>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-gray-600 font-medium">
                          Proposed Price
                        </Text>
                        <Text className="text-xl font-bold text-pink-600">
                          {formatPrice(response.proposedPrice)}
                        </Text>
                      </View>

                      {response.counterOffer && (
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-600 font-medium">
                            Your Counter Offer
                          </Text>
                          <Text className="text-lg font-bold text-orange-600">
                            {formatPrice(response.counterOffer)}
                          </Text>
                        </View>
                      )}

                      {response.estimatedDuration && (
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-600 font-medium">
                            Estimated Duration
                          </Text>
                          <View className="flex-row items-center">
                            <Ionicons name="time" size={16} color="#6b7280" />
                            <Text className="text-sm font-bold text-gray-700 ml-1">
                              {response.estimatedDuration} mins
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Message */}
                    {response.message && (
                      <View className="bg-blue-50 rounded-2xl p-3 mb-3">
                        <Text className="text-sm text-blue-900 leading-5">
                          "{response.message}"
                        </Text>
                      </View>
                    )}

                    {/* Timestamp */}
                    <Text className="text-xs text-gray-400 mb-3">
                      Responded on {formatDate(response.respondedAt)}
                    </Text>

                    {/* Actions */}
                    {offer.status === 'open' && !response.isAccepted && (
                      <View className="flex-row gap-3">
                        <TouchableOpacity
                          className="flex-1"
                          onPress={() => handleAcceptResponse(response._id)}
                          disabled={submitting}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#eb278d', '#f472b6']}
                            className="py-3.5 rounded-2xl items-center"
                            style={{
                              shadowColor: '#eb278d',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.3,
                              shadowRadius: 4,
                              elevation: 4,
                            }}
                          >
                            {submitting ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <View className="flex-row items-center">
                                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                <Text className="text-white text-base font-bold ml-2">
                                  Accept
                                </Text>
                              </View>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                          className="flex-1 border-2 border-pink-500 py-3.5 rounded-2xl items-center"
                          onPress={() =>
                            handleCounterOffer(response._id, response.proposedPrice)
                          }
                          disabled={submitting}
                          activeOpacity={0.7}
                        >
                          <View className="flex-row items-center">
                            <Ionicons name="swap-horizontal" size={18} color="#eb278d" />
                            <Text className="text-pink-600 text-base font-bold ml-2">
                              Counter
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Counter Offer Modal */}
      <Modal visible={showCounterModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                  <Ionicons name="swap-horizontal" size={20} color="#eb278d" />
                </View>
                <Text className="text-xl font-bold text-gray-900">Counter Offer</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCounterModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm text-gray-600 mb-4">
              Enter your counter offer amount
            </Text>

            {/* Price Input */}
            <View className="bg-gray-50 rounded-2xl p-4 mb-6 flex-row items-center border-2 border-gray-200">
              <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                <Ionicons name="cash" size={20} color="#eb278d" />
              </View>
              <TextInput
                className="flex-1 text-2xl font-bold text-gray-900"
                placeholder="0"
                value={counterPrice}
                onChangeText={(text) => setCounterPrice(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholderTextColor="#d1d5db"
              />
              <Text className="text-gray-500 text-base font-medium">NGN</Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-4 rounded-2xl items-center"
                onPress={() => setShowCounterModal(false)}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 text-base font-bold">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1"
                onPress={submitCounterOffer}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#eb278d', '#f472b6']}
                  className="py-4 rounded-2xl items-center"
                  style={{
                    shadowColor: '#eb278d',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-base font-bold">Submit Offer</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ NEW: Payment Method Selection Modal */}
      <Modal visible={showPaymentMethodModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                  <Ionicons name="card" size={20} color="#eb278d" />
                </View>
                <Text className="text-xl font-bold text-gray-900">Choose Payment</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentMethodModal(false);
                  setSelectedResponseForAccept(null);
                }}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm text-gray-600 mb-6">
              Select how you want to pay for this booking
            </Text>

            {/* Payment Options */}
            <View className="gap-3">
              {/* SharpPay Wallet Payment */}
              <TouchableOpacity
                className="border-2 border-green-500 rounded-2xl p-4 bg-green-50"
                onPress={() => processAcceptResponse('wallet')}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mr-4">
                    <Ionicons name="wallet" size={24} color="#10b981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-green-900 mb-1">
                      Pay with SharpPay
                    </Text>
                    <Text className="text-sm text-green-700">
                      Instant payment from your SharpPay wallet
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#10b981" />
                </View>
              </TouchableOpacity>

              {/* Paystack Card Payment */}
              <TouchableOpacity
                className="border-2 border-pink-500 rounded-2xl p-4 bg-pink-50"
                onPress={() => processAcceptResponse('card')}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-pink-100 items-center justify-center mr-4">
                    <Ionicons name="card" size={24} color="#eb278d" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-pink-900 mb-1">
                      Pay with Paystack
                    </Text>
                    <Text className="text-sm text-pink-700">
                      Secure card payment via Paystack
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#eb278d" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Secured Badge */}
            <View className="mt-6 bg-blue-50 rounded-xl p-3 flex-row items-center justify-center">
              <Ionicons name="shield-checkmark" size={18} color="#3b82f6" />
              <Text className="text-blue-700 text-xs font-medium ml-2">
                All payments are secured in escrow
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default OfferDetailScreen;