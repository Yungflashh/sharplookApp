import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
type BookingDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BookingDetail'>;
type BookingDetailRouteProp = RouteProp<RootStackParamList, 'BookingDetail'>;
interface BookingDetail {
  _id: string;
  bookingNumber?: string;
  service: {
    _id: string;
    name: string;
    description?: string;
    images?: string[];
    basePrice: number;
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
  const {
    bookingId
  } = route.params;
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
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
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  const handleCreateDispute = () => {
    if (!booking) return;
    if (!['accepted', 'in_progress', 'completed'].includes(booking.status.toLowerCase())) {
      Alert.alert('Cannot Create Dispute', 'Disputes can only be created for accepted, in-progress, or completed bookings.');
      return;
    }
    if (booking.hasDispute) {
      Alert.alert('Dispute Already Exists', 'A dispute already exists for this booking. Would you like to view it?', [{
        text: 'Cancel',
        style: 'cancel'
      }, {
        text: 'View Dispute',
        onPress: () => {
          if (booking.disputeId) {
            navigation.navigate('DisputeDetail', {
              disputeId: booking.disputeId
            });
          } else {
            navigation.navigate('Disputes');
          }
        }
      }]);
      return;
    }
    navigation.navigate('CreateDispute', {
      bookingId: booking._id
    });
  };
  const handleViewDispute = () => {
    if (booking?.disputeId) {
      navigation.navigate('DisputeDetail', {
        disputeId: booking.disputeId
      });
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
    Linking.canOpenURL(phoneUrl).then(supported => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Cannot make phone call on this device');
      }
    }).catch(err => console.error('Error opening phone app:', err));
  };
  const handleMessage = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    const smsUrl = `sms:${phoneNumber}`;
    Linking.canOpenURL(smsUrl).then(supported => {
      if (supported) {
        Linking.openURL(smsUrl);
      } else {
        Alert.alert('Error', 'Cannot send SMS on this device');
      }
    }).catch(err => console.error('Error opening SMS app:', err));
  };
  const handleCancelBooking = () => {
    Alert.prompt('Cancel Booking', 'Please provide a reason for cancellation:', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Confirm',
      style: 'destructive',
      onPress: async reason => {
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
      }
    }], 'plain-text');
  };
  const handleMarkComplete = () => {
    Alert.alert('Mark as Complete', 'Confirm that the service has been completed satisfactorily?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
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
      }
    }]);
  };
  const renderActionButtons = () => {
    if (!booking) return null;
    const status = booking.status.toLowerCase();
    return <View className="gap-3">
        {}
        {status === 'pending' && booking.paymentStatus !== 'escrowed' && <TouchableOpacity onPress={() => navigation.navigate('Payment', {
        bookingId: booking._id
      })} disabled={actionLoading} className="bg-pink-600 py-4 rounded-xl" activeOpacity={0.7}>
            <Text className="text-white text-center font-bold text-base">
              Complete Payment
            </Text>
          </TouchableOpacity>}

        {}
        {['accepted', 'in_progress'].includes(status) && <TouchableOpacity onPress={handleMarkComplete} disabled={actionLoading || booking.clientMarkedComplete} className={`py-4 rounded-xl ${booking.clientMarkedComplete ? 'bg-gray-300' : 'bg-green-600'}`} activeOpacity={0.7}>
            {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-center font-bold text-base">
                {booking.clientMarkedComplete ? '✓ Marked Complete' : 'Mark as Complete'}
              </Text>}
          </TouchableOpacity>}

        {}
        {status === 'completed' && !booking.hasReview && <TouchableOpacity onPress={() => navigation.navigate('CreateReview', {
        bookingId: booking._id,
        vendorName: booking.vendor?.vendorProfile?.businessName || `${booking.vendor?.firstName} ${booking.vendor?.lastName}`,
        serviceName: booking.service.name
      })} className="bg-yellow-500 py-4 rounded-xl flex-row items-center justify-center" activeOpacity={0.7}>
            <Ionicons name="star" size={20} color="#fff" />
            <Text className="text-white font-bold text-base ml-2">
              Leave a Review
            </Text>
          </TouchableOpacity>}

        {}
        {status === 'completed' && booking.hasReview && <TouchableOpacity onPress={() => {
        Alert.alert('Review Submitted', 'Thank you for your feedback!');
      }} className="bg-green-500 py-4 rounded-xl flex-row items-center justify-center" activeOpacity={0.7}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text className="text-white font-bold text-base ml-2">
              ✓ Review Submitted
            </Text>
          </TouchableOpacity>}

        {}
        {['pending', 'accepted'].includes(status) && <TouchableOpacity onPress={handleCancelBooking} disabled={actionLoading} className="bg-red-500 py-4 rounded-xl" activeOpacity={0.7}>
            {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-center font-bold text-base">
                Cancel Booking
              </Text>}
          </TouchableOpacity>}

        {}
        {['accepted', 'in_progress', 'completed'].includes(status) && <>
            {booking.hasDispute ? <TouchableOpacity onPress={handleViewDispute} className="bg-orange-500 py-4 rounded-xl flex-row items-center justify-center" activeOpacity={0.7}>
                <Ionicons name="alert-circle" size={20} color="#fff" />
                <Text className="text-white font-bold text-base ml-2">
                  View Active Dispute
                </Text>
              </TouchableOpacity> : <TouchableOpacity onPress={handleCreateDispute} className="bg-white border-2 border-red-500 py-4 rounded-xl flex-row items-center justify-center" activeOpacity={0.7}>
                <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                <Text className="text-red-500 font-bold text-base ml-2">
                  Report Issue
                </Text>
              </TouchableOpacity>}
          </>}
      </View>;
  };
  if (loading) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-400 text-sm mt-4">Loading booking...</Text>
        </View>
      </SafeAreaView>;
  }
  if (!booking) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-900 text-lg font-bold">Booking not found</Text>
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-gray-900">Booking Details</Text>

          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-6">
          {}
          <View className="flex-row items-center justify-between mb-6">
            <View className={`px-4 py-2 rounded-full border ${getStatusColor(booking.status)}`}>
              <Text className="font-bold">{formatStatus(booking.status)}</Text>
            </View>

            {booking.bookingNumber && <Text className="text-sm text-gray-600">#{booking.bookingNumber}</Text>}
          </View>

          {}
          {booking.hasDispute && <TouchableOpacity onPress={handleViewDispute} className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex-row items-start" activeOpacity={0.7}>
              <Ionicons name="alert-circle" size={24} color="#f97316" />
              <View className="flex-1 ml-3">
                <Text className="text-orange-900 font-bold mb-1">
                  Active Dispute
                </Text>
                <Text className="text-orange-700 text-sm">
                  There is an active dispute for this booking. Tap to view details.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#f97316" />
            </TouchableOpacity>}

          {}
          <View className="bg-white rounded-2xl p-4 mb-4">
            {booking.service.images && booking.service.images.length > 0 && <Image source={{
            uri: booking.service.images[0]
          }} className="w-full h-48 rounded-xl mb-4" resizeMode="cover" />}

            <Text className="text-xl font-bold text-gray-900 mb-2">
              {booking.service.name}
            </Text>

            {booking.service.description && <Text className="text-gray-600 text-sm mb-4">
                {booking.service.description}
              </Text>}

            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={18} color="#6b7280" />
                <Text className="text-gray-600 ml-2">{booking.duration} mins</Text>
              </View>

              <View className="flex-row items-center">
                <Ionicons name="cash-outline" size={18} color="#6b7280" />
                <Text className="text-gray-600 ml-2">
                  {formatPrice(booking.servicePrice)}
                </Text>
              </View>
            </View>
          </View>

          {}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-3">
              {booking.vendor ? 'Vendor' : 'Client'} Information
            </Text>

            <View className="flex-row items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-pink-100 items-center justify-center mr-3">
                {booking.vendor?.avatar ? <Image source={{
                uri: booking.vendor.avatar
              }} className="w-16 h-16 rounded-full" /> : <Ionicons name="person" size={32} color="#ec4899" />}
              </View>

              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900">
                  {booking.vendor?.vendorProfile?.businessName || `${booking.vendor?.firstName} ${booking.vendor?.lastName}`}
                </Text>

                {booking.vendor?.vendorProfile && <View className="flex-row items-center mt-1">
                    <Ionicons name="star" size={14} color="#fbbf24" />
                    <Text className="text-sm text-gray-600 ml-1">
                      {booking.vendor.vendorProfile.rating?.toFixed(1) || 'New'} •{' '}
                      {booking.vendor.vendorProfile.completedBookings || 0} jobs
                    </Text>
                  </View>}
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => handleCall(booking.vendor?.phone)} className="flex-1 bg-green-500 py-3 rounded-xl flex-row items-center justify-center" activeOpacity={0.7}>
                <Ionicons name="call" size={20} color="#fff" />
                <Text className="text-white font-semibold ml-2">Call</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleMessage(booking.vendor?.phone)} className="flex-1 bg-blue-500 py-3 rounded-xl flex-row items-center justify-center" activeOpacity={0.7}>
                <Ionicons name="chatbubble" size={20} color="#fff" />
                <Text className="text-white font-semibold ml-2">Message</Text>
              </TouchableOpacity>
            </View>
          </View>

          {}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Schedule
            </Text>

            <View className="gap-3">
              <View className="flex-row items-center">
                <Ionicons name="calendar" size={20} color="#6b7280" />
                <Text className="text-gray-700 ml-3">
                  {formatDate(booking.scheduledDate)}
                </Text>
              </View>

              {booking.scheduledTime && <View className="flex-row items-center">
                  <Ionicons name="time" size={20} color="#6b7280" />
                  <Text className="text-gray-700 ml-3">{booking.scheduledTime}</Text>
                </View>}

              {booking.location && <View className="flex-row items-start">
                  <Ionicons name="location" size={20} color="#6b7280" />
                  <Text className="text-gray-700 ml-3 flex-1">
                    {booking.location.address}, {booking.location.city},{' '}
                    {booking.location.state}
                  </Text>
                </View>}
            </View>
          </View>

          {}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Price Breakdown
            </Text>

            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Service Fee</Text>
                <Text className="text-gray-900 font-semibold">
                  {formatPrice(booking.servicePrice)}
                </Text>
              </View>

              {booking.distanceCharge > 0 && <View className="flex-row justify-between">
                  <Text className="text-gray-600">Distance Charge</Text>
                  <Text className="text-gray-900 font-semibold">
                    {formatPrice(booking.distanceCharge)}
                  </Text>
                </View>}

              <View className="border-t border-gray-200 pt-2 mt-2 flex-row justify-between">
                <Text className="text-gray-900 font-bold">Total</Text>
                <Text className="text-pink-600 font-bold text-lg">
                  {formatPrice(booking.totalAmount)}
                </Text>
              </View>

              <View className="flex-row justify-between mt-2">
                <Text className="text-gray-600">Payment Status</Text>
                <Text className={`font-semibold ${booking.paymentStatus === 'escrowed' ? 'text-blue-600' : booking.paymentStatus === 'released' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {formatStatus(booking.paymentStatus)}
                </Text>
              </View>
            </View>
          </View>

          {}
          {(booking.clientNotes || booking.vendorNotes) && <View className="bg-white rounded-2xl p-4 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-3">Notes</Text>

              {booking.clientNotes && <View className="mb-3">
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    Client Notes:
                  </Text>
                  <Text className="text-gray-600">{booking.clientNotes}</Text>
                </View>}

              {booking.vendorNotes && <View>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    Vendor Notes:
                  </Text>
                  <Text className="text-gray-600">{booking.vendorNotes}</Text>
                </View>}
            </View>}

          {}
          {renderActionButtons()}
        </View>
      </ScrollView>
    </SafeAreaView>;
};
export default BookingDetailScreen;