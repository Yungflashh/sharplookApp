import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';

type BookingDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookingDetail'>;
type BookingDetailRouteProp = RouteProp<RootStackParamList, 'BookingDetail'>;


// New interfaces for OtherParty
interface VendorPartyInfo {
  type: 'vendor';
  data: BookingDetail['vendor'];
  label: 'Vendor';
}

interface ClientPartyInfo {
  type: 'client';
  data: BookingDetail['client'];
  label: 'Client';
}

type OtherPartyResult = VendorPartyInfo | ClientPartyInfo | null;

interface BookingDetail {
  _id: string;
  bookingNumber?: string;
  bookingType?: 'service_based' | 'offer_based';
  service?: {
    _id: string;
    name: string;
    description?: string;
    images?: string[];
    basePrice: number;
  };
  offer?: string | {
    _id: string;
    title?: string;
    description?: string;
    images?: string[];
    price?: number;
  };
  vendor: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    avatar?: string;
    vendorProfile?: {
      businessName: string;
      rating?: number;
      completedBookings?: number;
    };
  };
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    avatar?: string;
  };
  scheduledDate: string;
  scheduledTime?: string;
  duration: number;
  location?: {
    address: string;
    city: string;
    state: string;
  };
  servicePrice: number;
  distanceCharge: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentReference?: string;
  clientNotes?: string;
  vendorNotes?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  hasDispute: boolean;
  disputeId?: string;
  hasReview: boolean;
  reviewId?: string;
  clientMarkedComplete: boolean;
  vendorMarkedComplete: boolean;
}

const BookingDetailScreen: React.FC = () => {
  const navigation = useNavigation<BookingDetailNavigationProp>();
  const route = useRoute<BookingDetailRouteProp>();
  const { bookingId } = route.params;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await getStoredUser();
      if (userData) {
        setCurrentUserId(userData._id);
        setIsVendor(userData.isVendor || false);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await bookingAPI.getBookingById(bookingId);
      console.log('Booking detail:', response);

      if (response.success) {
        const bookingData = response.data.booking || response.data;
        setBooking(bookingData);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Booking detail error:', apiError);
      Alert.alert('Error', apiError.message || 'Failed to load booking details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  // Helper function to get service/offer details
  const getServiceInfo = () => {
    if (!booking) return null;

    if (booking.service) {
      return {
        name: booking.service.name,
        description: booking.service.description,
        images: booking.service.images,
      };
    }

    if (booking.offer && typeof booking.offer === 'object') {
      return {
        name: booking.offer.title || 'Custom Offer',
        description: booking.offer.description,
        images: booking.offer.images,
      };
    }

    // Fallback for offer-based booking without full offer details
    return {
      name: 'Custom Service Offer',
      description: 'Service details from accepted offer',
      images: undefined,
    };
  };

  const getOtherParty = (): OtherPartyResult => {
    if (!booking || !currentUserId) return null;

    if (booking.client._id === currentUserId) {
      return {
        type: 'vendor',
        data: booking.vendor,
        label: 'Vendor',
      };
    }

    if (booking.vendor._id === currentUserId) {
      return {
        type: 'client',
        data: booking.client,
        label: 'Client',
      };
    }

    return {
      type: 'vendor',
      data: booking.vendor,
      label: 'Vendor',
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'accepted':
        return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
      case 'in_progress':
        return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' };
      case 'completed':
        return { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      default:
        return { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleCreateDispute = () => {
    if (!booking) return;

    if (!['accepted', 'in_progress', 'completed'].includes(booking.status.toLowerCase())) {
      Alert.alert(
        'Cannot Create Dispute',
        'Disputes can only be created for accepted, in-progress, or completed bookings.'
      );
      return;
    }

    if (booking.hasDispute) {
      Alert.alert(
        'Dispute Already Exists',
        'A dispute already exists for this booking. Would you like to view it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Dispute',
            onPress: () => {
              if (booking.disputeId) {
                navigation.navigate('DisputeDetail', { disputeId: booking.disputeId });
              } else {
                navigation.navigate('Disputes');
              }
            },
          },
        ]
      );
      return;
    }

    navigation.navigate('CreateDispute', { bookingId: booking._id });
  };

  const handleViewDispute = () => {
    if (booking?.disputeId) {
      navigation.navigate('DisputeDetail', { disputeId: booking.disputeId });
    } else {
      navigation.navigate('Disputes');
    }
  };

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }

    const phoneUrl = `tel:${phoneNumber}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Cannot make phone call on this device');
        }
      })
      .catch((err) => console.error('Error opening phone app:', err));
  };

  const handleMessage = () => {
    const otherParty = getOtherParty();
    if (!booking || !otherParty) {
      Alert.alert('Error', 'Unable to start conversation');
      return;
    }

    // Navigate to ChatDetail screen
    navigation.navigate('ChatDetail', {
      otherUserId: otherParty.data._id,
      otherUserName: otherParty.type === 'vendor'
        ? otherParty.data?.vendorProfile?.businessName ||
          `${otherParty.data?.firstName} ${otherParty.data?.lastName}`
        : `${otherParty.data?.firstName} ${otherParty.data?.lastName}`,
      otherUserAvatar: otherParty.data?.avatar,
    });
  };

  const handleCancelBooking = () => {
    Alert.prompt(
      'Cancel Booking',
      'Please provide a reason for cancellation:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              setActionLoading(true);
              const response = await bookingAPI.cancelBooking(bookingId, reason);

              if (response.success) {
                Alert.alert('Success', 'Booking cancelled successfully');
                fetchBookingDetails();
              }
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message || 'Failed to cancel booking');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleMarkComplete = () => {
    Alert.alert(
      'Mark as Complete',
      'Confirm that the service has been completed satisfactorily?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await bookingAPI.markComplete(bookingId);

              if (response.success) {
                Alert.alert('Success', 'Booking marked as complete');
                fetchBookingDetails();
              }
            } catch (error) {
              const apiError = handleAPIError(error);
              Alert.alert('Error', apiError.message || 'Failed to mark complete');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderActionButtons = () => {
    if (!booking) return null;

    const status = booking.status.toLowerCase();
    const serviceInfo = getServiceInfo();

    return (
      <View style={{ gap: 12 }}>
        {/* Complete Payment Button */}
        {status === 'pending' && booking.paymentStatus !== 'escrowed' && !isVendor && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Payment', { bookingId: booking._id })}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#eb278d', '#f472b6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="py-4 rounded-2xl"
              style={{
                shadowColor: '#eb278d',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text className="text-white text-center font-bold text-base">
                Complete Payment
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Mark Complete Button */}
        {['accepted', 'in_progress'].includes(status) && !isVendor && (
          <TouchableOpacity
            onPress={handleMarkComplete}
            disabled={actionLoading || booking.clientMarkedComplete}
            className={`py-4 rounded-2xl ${
              booking.clientMarkedComplete ? 'bg-gray-300' : 'bg-green-600'
            }`}
            style={{
              shadowColor: booking.clientMarkedComplete ? '#9ca3af' : '#10b981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View className="flex-row items-center justify-center">
                {booking.clientMarkedComplete && (
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                )}
                <Text className="text-white text-center font-bold text-base ml-2">
                  {booking.clientMarkedComplete ? 'Marked Complete' : 'Mark as Complete'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Leave Review Button */}
        {status === 'completed' && !booking.hasReview && !isVendor && (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('CreateReview', {
                bookingId: booking._id,
                vendorName:
                  booking.vendor?.vendorProfile?.businessName ||
                  `${booking.vendor?.firstName} ${booking.vendor?.lastName}`,
                serviceName: serviceInfo?.name || 'Service',
              })
            }
            className="bg-yellow-500 py-4 rounded-2xl flex-row items-center justify-center"
            style={{
              shadowColor: '#eab308',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="star" size={20} color="#fff" />
            <Text className="ml-2 text-base font-bold text-white">Leave a Review</Text>
          </TouchableOpacity>
        )}

        {/* Review Submitted */}
        {status === 'completed' && booking.hasReview && !isVendor && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Review Submitted', 'Thank you for your feedback!');
            }}
            className="flex-row items-center justify-center rounded-2xl bg-green-500 py-4"
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text className="ml-2 text-base font-bold text-white">✓ Review Submitted</Text>
          </TouchableOpacity>
        )}

        {/* Cancel Booking Button */}
        {['pending', 'accepted'].includes(status) && (
          <TouchableOpacity
            onPress={handleCancelBooking}
            disabled={actionLoading}
            className="bg-red-500 py-4 rounded-2xl"
            style={{
              shadowColor: '#ef4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-center font-bold text-base">Cancel Booking</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Dispute Buttons */}
        {['accepted', 'in_progress', 'completed'].includes(status) && (
          <>
            {booking.hasDispute ? (
              <TouchableOpacity
                onPress={handleViewDispute}
                className="bg-orange-500 py-4 rounded-2xl flex-row items-center justify-center"
                style={{
                  shadowColor: '#f97316',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle" size={20} color="#fff" />
                <Text className="ml-2 text-base font-bold text-white">View Active Dispute</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCreateDispute}
                className="flex-row items-center justify-center rounded-2xl border-2 border-red-500 bg-white py-4"
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                <Text className="ml-2 text-base font-bold text-red-500">Report Issue</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="mt-4 text-sm font-medium text-gray-500">Loading booking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
          <Text className="mt-4 text-lg font-bold text-gray-900">Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = getStatusColor(booking.status);
  const otherParty = getOtherParty();
  const serviceInfo = getServiceInfo();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="px-5 py-4">
          <View className="mb-4 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <Text className="text-lg font-bold text-white">Booking Details</Text>

            <View className="w-10" />
          </View>

          {/* Status Badge */}
          <View className="flex-row items-center justify-between">
            <View
              className="px-4 py-2 rounded-full"
              style={{
                backgroundColor: statusColors.bg,
                borderWidth: 2,
                borderColor: statusColors.border,
              }}
            >
              <Text className="font-bold text-sm" style={{ color: statusColors.text }}>
                {formatStatus(booking.status)}
              </Text>
            </View>

            {booking.bookingNumber && (
              <View className="rounded-full bg-white/20 px-3 py-1.5">
                <Text className="text-xs font-bold text-white">#{booking.bookingNumber}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-4" style={{ gap: 16 }}>
          {/* Dispute Alert */}
          {booking.hasDispute && (
            <TouchableOpacity
              onPress={handleViewDispute}
              className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 flex-row items-start"
              activeOpacity={0.7}
            >
              <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                <Ionicons name="alert-circle" size={24} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-base font-bold text-orange-900">Active Dispute</Text>
                <Text className="text-sm text-orange-700">
                  There is an active dispute for this booking. Tap to view details.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#f97316" />
            </TouchableOpacity>
          )}

          {/* Service Details */}
          <View
            className="bg-white rounded-3xl overflow-hidden"
            style={{
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                },
                android: { elevation: 4 },
              }),
            }}
          >
            {serviceInfo?.images && serviceInfo.images.length > 0 && (
              <Image
                source={{ uri: serviceInfo.images[0] }}
                className="w-full h-48"
                resizeMode="cover"
              />
            )}

            <View className="p-5">
              <Text className="mb-2 text-xl font-bold text-gray-900">
                {serviceInfo?.name || 'Unknown Service'}
              </Text>

              {serviceInfo?.description && (
                <Text className="mb-4 text-sm leading-5 text-gray-600">
                  {serviceInfo.description}
                </Text>
              )}

              <View className="flex-row" style={{ gap: 20 }}>
                <View className="flex-row items-center">
                  <View className="mr-2 h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                    <Ionicons name="time" size={16} color="#3b82f6" />
                  </View>
                  <Text className="font-medium text-gray-700">{booking.duration} mins</Text>
                </View>

                <View className="flex-row items-center">
                  <View className="mr-2 h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                    <Ionicons name="cash" size={16} color="#10b981" />
                  </View>
                  <Text className="font-medium text-gray-700">
                    {formatPrice(booking.servicePrice)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Other Party Information */}
          {otherParty && (
            <View
              className="bg-white rounded-3xl p-5"
              style={{
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                  },
                  android: { elevation: 4 },
                }),
              }}
            >
              <Text className="text-lg font-bold text-gray-900 mb-4">
                {otherParty.label} Information
              </Text>

              <View className="mb-4 flex-row items-center">
                <View className="mr-3 h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-400 to-pink-600">
                  {otherParty.data?.avatar ? (
                    <Image
                      source={{ uri: otherParty.data.avatar }}
                      className="h-16 w-16 rounded-full"
                    />
                  ) : (
                    <Ionicons name="person" size={32} color="#fff" />
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">
                    {otherParty.type === 'vendor'
                      ? otherParty.data?.vendorProfile?.businessName ||
                        `${otherParty.data?.firstName} ${otherParty.data?.lastName}`
                      : `${otherParty.data?.firstName} ${otherParty.data?.lastName}`}
                  </Text>

                  {otherParty.type === 'vendor' && otherParty.data?.vendorProfile && (
                    <View className="mt-1 flex-row items-center">
                      <Ionicons name="star" size={14} color="#fbbf24" />
                      <Text className="ml-1 text-sm text-gray-600">
                        {otherParty.data.vendorProfile.rating?.toFixed(1) || 'New'} •{' '}
                        {otherParty.data.vendorProfile.completedBookings || 0} jobs
                      </Text>
                    </View>
                  )}

                  {otherParty.type === 'client' && (
                    <View className="mt-1 flex-row items-center">
                      <Ionicons name="mail" size={14} color="#6b7280" />
                      <Text className="ml-1 text-sm text-gray-600">
                        {otherParty.data?.email || 'No email'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="flex-row" style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => handleCall(otherParty.data?.phone)}
                  className="flex-1 bg-green-500 py-3 rounded-xl flex-row items-center justify-center"
                  style={{
                    shadowColor: '#10b981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={18} color="#fff" />
                  <Text className="ml-2 font-bold text-white">Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleMessage}
                  className="flex-1 bg-blue-500 py-3 rounded-xl flex-row items-center justify-center"
                  style={{
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble" size={18} color="#fff" />
                  <Text className="text-white font-bold ml-2">Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Schedule */}
          <View
            className="bg-white rounded-3xl p-5"
            style={{
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                },
                android: { elevation: 4 },
              }),
            }}
          >
            <Text className="text-lg font-bold text-gray-900 mb-4">Schedule</Text>

            <View style={{ gap: 16 }}>
              <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                  <Ionicons name="calendar" size={20} color="#a855f7" />
                </View>
                <Text className="flex-1 font-medium text-gray-700">
                  {formatDate(booking.scheduledDate)}
                </Text>
              </View>

              {booking.scheduledTime && (
                <View className="flex-row items-center">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <Ionicons name="time" size={20} color="#3b82f6" />
                  </View>
                  <Text className="font-medium text-gray-700">{booking.scheduledTime}</Text>
                </View>
              )}

              {booking.location && (
                <View className="flex-row items-start">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                    <Ionicons name="location" size={20} color="#10b981" />
                  </View>
                  <Text className="flex-1 font-medium text-gray-700">
                    {booking.location.address}, {booking.location.city}, {booking.location.state}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Price Breakdown */}
          <View
            className="bg-white rounded-3xl p-5"
            style={{
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                },
                android: { elevation: 4 },
              }),
            }}
          >
            <Text className="text-lg font-bold text-gray-900 mb-4">Price Breakdown</Text>

            <View style={{ gap: 12 }}>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600 font-medium">Service Fee</Text>
                <Text className="text-gray-900 font-bold">
                  {formatPrice(booking.servicePrice)}
                </Text>
              </View>

              {booking.distanceCharge > 0 && (
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium text-gray-600">Distance Charge</Text>
                  <Text className="font-bold text-gray-900">
                    {formatPrice(booking.distanceCharge)}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center justify-between border-t-2 border-gray-100 pt-3">
                <Text className="text-base font-bold text-gray-900">Total Amount</Text>
                <Text className="text-xl font-bold text-pink-600">
                  {formatPrice(booking.totalAmount)}
                </Text>
              </View>

              <View className="bg-gray-50 rounded-xl p-3 flex-row justify-between items-center mt-2">
                <Text className="text-gray-600 font-medium">Payment Status</Text>
                <View
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      booking.paymentStatus === 'escrowed'
                        ? '#dbeafe'
                        : booking.paymentStatus === 'released'
                        ? '#d1fae5'
                        : '#fef3c7',
                  }}
                >
                  <Text
                    className="font-bold text-xs"
                    style={{
                      color:
                        booking.paymentStatus === 'escrowed'
                          ? '#1e40af'
                          : booking.paymentStatus === 'released'
                          ? '#065f46'
                          : '#92400e',
                    }}
                  >
                    {formatStatus(booking.paymentStatus)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Notes */}
          {(booking.clientNotes || booking.vendorNotes) && (
            <View
              className="bg-white rounded-3xl p-5"
              style={{
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                  },
                  android: { elevation: 4 },
                }),
              }}
            >
              <Text className="text-lg font-bold text-gray-900 mb-4">Notes</Text>

              {booking.clientNotes && (
                <View className="mb-3 rounded-xl bg-blue-50 p-4">
                  <View className="mb-2 flex-row items-center">
                    <Ionicons name="person-circle" size={20} color="#3b82f6" />
                    <Text className="ml-2 text-sm font-bold text-blue-900">Client Notes:</Text>
                  </View>
                  <Text className="leading-5 text-gray-700">{booking.clientNotes}</Text>
                </View>
              )}

              {booking.vendorNotes && (
                <View className="rounded-xl bg-pink-50 p-4">
                  <View className="mb-2 flex-row items-center">
                    <Ionicons name="briefcase" size={20} color="#eb278d" />
                    <Text className="ml-2 text-sm font-bold text-pink-900">Vendor Notes:</Text>
                  </View>
                  <Text className="leading-5 text-gray-700">{booking.vendorNotes}</Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          {renderActionButtons()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BookingDetailScreen;