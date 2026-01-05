import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
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
import CancelBookingModal from '@/components/ui/CancelBookingModal';

type BookingDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookingDetail'>;
type BookingDetailRouteProp = RouteProp<RootStackParamList, 'BookingDetail'>;

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
  paymentStatus: 'pending' | 'escrowed' | 'released' | 'refunded' | 'partially_refunded';
  paymentReference?: string;
  paymentExpiresAt?: string;
  cancellationPenalty?: number;
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
  const [showCancelModal, setShowCancelModal] = useState(false);

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

  // Auto-refresh for pending Paystack payments
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (booking?.paymentStatus === 'pending' && booking?.paymentExpiresAt) {
      // Poll every 5 seconds for payment status updates
      interval = setInterval(() => {
        fetchBookingDetails();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [booking?.paymentStatus, booking?.paymentExpiresAt]);

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

  const getPaymentStatusInfo = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e', label: 'Payment Pending', icon: 'time' };
      case 'escrowed':
        return { bg: '#dbeafe', text: '#1e40af', label: 'Payment Secured', icon: 'shield-checkmark' };
      case 'released':
        return { bg: '#d1fae5', text: '#065f46', label: 'Payment Released', icon: 'checkmark-circle' };
      case 'refunded':
        return { bg: '#e0e7ff', text: '#3730a3', label: 'Fully Refunded', icon: 'refresh-circle' };
      case 'partially_refunded':
        return { bg: '#fef3c7', text: '#92400e', label: 'Partially Refunded', icon: 'alert-circle' };
      default:
        return { bg: '#f3f4f6', text: '#374151', label: paymentStatus, icon: 'help-circle' };
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getTimeUntilExpiry = () => {
    if (!booking?.paymentExpiresAt) return null;
    
    const expiresAt = new Date(booking.paymentExpiresAt);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  const handleMessage = () => {
    const otherParty = getOtherParty();
    if (!booking || !otherParty) {
      Alert.alert('Error', 'Unable to start conversation');
      return;
    }

    navigation.navigate('ChatDetail', {
      otherUserId: otherParty.data._id,
      otherUserName:
        otherParty.type === 'vendor'
          ? otherParty.data?.vendorProfile?.businessName ||
            `${otherParty.data?.firstName} ${otherParty.data?.lastName}`
          : `${otherParty.data?.firstName} ${otherParty.data?.lastName}`,
      otherUserAvatar: otherParty.data?.avatar,
    });
  };

  const handleCancelBooking = async (reason: string) => {
    if (!booking) return;

    // Calculate time until appointment for warning
    const appointmentDate = new Date(booking.scheduledDate);
    if (booking.scheduledTime) {
      const [hours, minutes] = booking.scheduledTime.split(':').map(Number);
      appointmentDate.setHours(hours, minutes, 0, 0);
    }
    const now = new Date();
    const minutesUntilAppointment = Math.floor((appointmentDate.getTime() - now.getTime()) / 60000);

    // Show penalty warning if within 59 minutes
    if (minutesUntilAppointment < 59 && minutesUntilAppointment > 0 && !isVendor) {
      const penaltyAmount = booking.totalAmount * 0.2;
      const refundAmount = booking.totalAmount * 0.8;

      Alert.alert(
        '⚠️ Cancellation Penalty',
        `Your appointment is in ${minutesUntilAppointment} minutes.\n\nCancelling now will result in a 20% penalty:\n• Penalty: ${formatPrice(penaltyAmount)}\n• Refund: ${formatPrice(refundAmount)}\n\nDo you want to proceed?`,
        [
          { text: 'Keep Booking', style: 'cancel' },
          {
            text: 'Cancel Anyway',
            style: 'destructive',
            onPress: () => processCancellation(reason),
          },
        ]
      );
    } else {
      processCancellation(reason);
    }
  };

  const processCancellation = async (reason: string) => {
    try {
      setActionLoading(true);
      const response = await bookingAPI.cancelBooking(bookingId, reason);

      if (response.success) {
        const message = response.data.penaltyApplied
          ? `Booking cancelled. A 20% penalty (${formatPrice(response.data.penaltyAmount || 0)}) was applied. Refund: ${formatPrice(response.data.refundAmount || 0)}`
          : 'Booking cancelled successfully. Full refund has been processed.';

        Alert.alert('Booking Cancelled', message);
        setShowCancelModal(false);
        fetchBookingDetails();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
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

  const renderPaymentPendingBanner = () => {
    if (!booking || booking.paymentStatus !== 'pending') return null;

    const timeRemaining = getTimeUntilExpiry();

    return (
      <View className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-4">
        <View className="flex-row items-center mb-2">
          <Ionicons name="time" size={24} color="#f59e0b" />
          <Text className="ml-2 text-amber-800 font-bold text-base">
            Payment Pending
          </Text>
        </View>
        <Text className="text-amber-700 text-sm mb-2">
          Complete your payment on Paystack to confirm this booking.
        </Text>
        {timeRemaining && timeRemaining !== 'Expired' && (
          <View className="bg-amber-100 rounded-lg p-2 flex-row items-center justify-center">
            <Ionicons name="hourglass" size={16} color="#92400e" />
            <Text className="ml-2 text-amber-900 font-bold">
              Expires in: {timeRemaining}
            </Text>
          </View>
        )}
        {timeRemaining === 'Expired' && (
          <View className="bg-red-100 rounded-lg p-2 flex-row items-center justify-center">
            <Ionicons name="close-circle" size={16} color="#dc2626" />
            <Text className="ml-2 text-red-700 font-bold">
              Payment window expired. Booking will be cancelled.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderRefundInfo = () => {
    if (!booking) return null;

    if (booking.paymentStatus === 'refunded') {
      return (
        <View className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="refresh-circle" size={24} color="#4f46e5" />
            <Text className="ml-2 text-indigo-800 font-bold text-base">
              Full Refund Processed
            </Text>
          </View>
          <Text className="text-indigo-700 text-sm">
            {formatPrice(booking.totalAmount)} has been refunded to your wallet.
          </Text>
        </View>
      );
    }

    if (booking.paymentStatus === 'partially_refunded' && booking.cancellationPenalty) {
      const refundAmount = booking.totalAmount - booking.cancellationPenalty;
      return (
        <View className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-2">
            <Ionicons name="alert-circle" size={24} color="#f59e0b" />
            <Text className="ml-2 text-amber-800 font-bold text-base">
              Partial Refund (Penalty Applied)
            </Text>
          </View>
          <View className="gap-1">
            <Text className="text-amber-700 text-sm">
              • Original Amount: {formatPrice(booking.totalAmount)}
            </Text>
            <Text className="text-red-600 text-sm font-medium">
              • Cancellation Penalty (20%): -{formatPrice(booking.cancellationPenalty)}
            </Text>
            <Text className="text-green-700 text-sm font-bold">
              • Refunded to Wallet: {formatPrice(refundAmount)}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderActionButtons = () => {
    if (!booking) return null;

    const status = booking.status.toLowerCase();
    const serviceInfo = getServiceInfo();

    // Don't show action buttons if payment is still pending (Paystack redirect)
    if (booking.paymentStatus === 'pending') {
      return (
        <View className="bg-gray-100 rounded-2xl p-4">
          <Text className="text-gray-600 text-center text-sm">
            Complete payment to unlock booking actions
          </Text>
        </View>
      );
    }

    return (
      <View style={{ gap: 12 }}>
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

        {/* Review Submitted Button */}
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
        {['pending', 'accepted'].includes(status) && booking.paymentStatus === 'escrowed' && (
          <TouchableOpacity
            onPress={() => setShowCancelModal(true)}
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
  const paymentStatusInfo = getPaymentStatusInfo(booking.paymentStatus);
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
          {/* Payment Pending Banner */}
          {renderPaymentPendingBanner()}

          {/* Refund Info */}
          {renderRefundInfo()}

          {/* Active Dispute Alert */}
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

          {/* Service Card */}
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

          {/* Other Party Info */}
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
                </View>
              </View>

              <TouchableOpacity
                onPress={handleMessage}
                className="bg-blue-500 py-3 rounded-xl flex-row items-center justify-center"
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
          )}

          {/* Schedule Card */}
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

          {/* Price Card */}
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

              {booking.cancellationPenalty && booking.cancellationPenalty > 0 && (
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium text-red-600">Cancellation Penalty</Text>
                  <Text className="font-bold text-red-600">
                    -{formatPrice(booking.cancellationPenalty)}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center justify-between border-t-2 border-gray-100 pt-3">
                <Text className="text-base font-bold text-gray-900">Total Amount</Text>
                <Text className="text-xl font-bold text-pink-600">
                  {formatPrice(booking.totalAmount)}
                </Text>
              </View>

              {/* Payment Status */}
              <View className="bg-gray-50 rounded-xl p-3 flex-row justify-between items-center mt-2">
                <View className="flex-row items-center">
                  <Ionicons 
                    name={paymentStatusInfo.icon as any} 
                    size={18} 
                    color={paymentStatusInfo.text} 
                  />
                  <Text className="text-gray-600 font-medium ml-2">Payment Status</Text>
                </View>
                <View
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: paymentStatusInfo.bg }}
                >
                  <Text
                    className="font-bold text-xs"
                    style={{ color: paymentStatusInfo.text }}
                  >
                    {paymentStatusInfo.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Notes Card */}
          {(booking.clientNotes || booking.vendorNotes || booking.cancellationReason) && (
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
                <View className="mb-3 rounded-xl bg-pink-50 p-4">
                  <View className="mb-2 flex-row items-center">
                    <Ionicons name="briefcase" size={20} color="#eb278d" />
                    <Text className="ml-2 text-sm font-bold text-pink-900">Vendor Notes:</Text>
                  </View>
                  <Text className="leading-5 text-gray-700">{booking.vendorNotes}</Text>
                </View>
              )}

              {booking.cancellationReason && (
                <View className="rounded-xl bg-red-50 p-4">
                  <View className="mb-2 flex-row items-center">
                    <Ionicons name="close-circle" size={20} color="#dc2626" />
                    <Text className="ml-2 text-sm font-bold text-red-900">Cancellation Reason:</Text>
                  </View>
                  <Text className="leading-5 text-gray-700">{booking.cancellationReason}</Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          {renderActionButtons()}
        </View>
      </ScrollView>

      {/* Cancel Modal */}
      <CancelBookingModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelBooking}
        loading={actionLoading}
      />
    </SafeAreaView>
  );
};

export default BookingDetailScreen;