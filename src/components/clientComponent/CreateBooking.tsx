import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError, sharpPayAPI } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';

type CreateBookingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateBooking'>;
type CreateBookingRouteProp = RouteProp<RootStackParamList, 'CreateBooking'>;

type PaymentMethod = 'wallet' | 'card';

const CreateBookingScreen: React.FC = () => {
  const navigation = useNavigation<CreateBookingNavigationProp>();
  const route = useRoute<CreateBookingRouteProp>();
  const { service, vendor } = route.params;

  // Steps: 1 = Date/Time, 2 = Location, 3 = Payment Method, 4 = Review & Confirm
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [calMonth, setCalMonth] = useState(new Date());

  // Step 2
  const [locationType, setLocationType] = useState<'home' | 'shop'>(
    vendor.vendorProfile.vendorType === 'in_shop' ? 'shop' : 'home'
  );
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>([0, 0]);
  const [locationLoading, setLocationLoading] = useState(false);

  // Step 3
  const [servicePrice, setServicePrice] = useState(service.basePrice || 0);
  const [distanceCharge, setDistanceCharge] = useState(0);
  const [totalAmount, setTotalAmount] = useState(service.basePrice || 0);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  // Price Preview
  const [priceLoading, setPriceLoading] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);

  // Location
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  const isHomeServiceAvailable =
    vendor.vendorProfile.vendorType === 'home_service' ||
    vendor.vendorProfile.vendorType === 'both';
  const isShopServiceAvailable =
    vendor.vendorProfile.vendorType === 'in_shop' ||
    vendor.vendorProfile.vendorType === 'both';

  useEffect(() => {
    if (!isHomeServiceAvailable && isShopServiceAvailable) {
      setLocationType('shop');
    }
  }, []);

  useEffect(() => {
    setTotalAmount(servicePrice + distanceCharge);
  }, [servicePrice, distanceCharge]);

  useEffect(() => {
    checkLocationPermission();
    fetchWalletBalance();
  }, []);

  // Fetch price preview when entering step 3 or when location changes
  useEffect(() => {
    if (step >= 3) {
      fetchPricePreview();
    }
  }, [step, locationType, coordinates[0], coordinates[1]]);

  // Fetch wallet balance for payment method selection
  const fetchWalletBalance = async () => {
    try {
      setWalletLoading(true);
      const response = await sharpPayAPI.getBalance();
      if (response.success) {
        setWalletBalance(response.data.balance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  // Fetch price preview to calculate distance charge
  const fetchPricePreview = async () => {
    try {
      setPriceLoading(true);
      
      const previewData: any = {
        serviceId: service._id,
        serviceType: locationType,
      };

      // Only send location for home service
      if (locationType === 'home' && coordinates[0] !== 0 && coordinates[1] !== 0) {
        previewData.location = {
          coordinates: coordinates, // [longitude, latitude]
        };
      }

      console.log('📊 Fetching price preview:', previewData);
      const response = await bookingAPI.previewPrice(previewData);
      console.log('📊 Price preview response:', response);

      if (response.success) {
        const { servicePrice, distanceCharge, totalAmount, distance } = response.data;
        setServicePrice(servicePrice);
        setDistanceCharge(distanceCharge);
        setTotalAmount(totalAmount);
        if (distance !== undefined) {
          setCalculatedDistance(distance);
        }
        console.log(`✅ Price updated: Service ₦${servicePrice}, Distance ₦${distanceCharge}, Total ₦${totalAmount}`);
      }
    } catch (error) {
      console.error('Error fetching price preview:', error);
      // Fallback to base price
      setDistanceCharge(0);
      setTotalAmount(service.basePrice);
    } finally {
      setPriceLoading(false);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermissionGranted(status === 'granted');
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionGranted(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError('');

    try {
      if (!locationPermissionGranted) {
        const granted = await requestLocationPermission();
        if (!granted) {
          setLocationError('Location permission is required');
          toast.error('Location Permission Required', 'Please enable location permissions in your device settings to use this feature.');
          setLocationLoading(false);
          return;
        }
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;

      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocode && geocode.length > 0) {
        const addressData = geocode[0];
        setAddress(
          `${addressData.street || ''} ${addressData.streetNumber || ''}`.trim() ||
            'Address not available'
        );
        setCity(addressData.city || addressData.subregion || 'Unknown City');
        setState(addressData.region || 'Unknown State');
        setCoordinates([longitude, latitude]);
        toast.success('Success', 'Location captured successfully!');
      } else {
        throw new Error('Unable to get address details');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      setLocationError('Failed to get location. Please try again.');
      toast.error('Location Error', 'Unable to get your location. Please ensure location services are enabled and try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setScheduledDate(selectedDate);
    }
  };

  const onTimeChange = (_event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setScheduledTime(`${hours}:${minutes}`);
    }
  };

  // Get the Date object for time picker with currently selected time
  const getTimePickerDate = () => {
    if (scheduledTime) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const date = new Date(scheduledDate);
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
    // Default to 9 AM on the selected date
    const date = new Date(scheduledDate);
    date.setHours(9, 0, 0, 0);
    return date;
  };

  const validateStep1 = () => {
    if (!scheduledDate) {
      toast.error('Error', 'Please select a date');
      return false;
    }
    if (!scheduledTime) {
      toast.error('Error', 'Please select a time');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (locationType === 'home' && isHomeServiceAvailable) {
      if (!address.trim()) {
        toast.error('Error', 'Please enter your address');
        return false;
      }
      if (!city.trim()) {
        toast.error('Error', 'Please enter your city');
        return false;
      }
      if (!state.trim()) {
        toast.error('Error', 'Please enter your state');
        return false;
      }
    }
    return true;
  };

  const validateStep3 = () => {
    if (paymentMethod === 'wallet' && walletBalance < totalAmount) {
      setConfirmModal({
        visible: true,
        title: 'Insufficient Balance',
        message: `Your wallet balance (₦${walletBalance.toLocaleString()}) is less than the booking amount (₦${totalAmount.toLocaleString()}). Would you like to use card payment instead?`,
        onConfirm: () => setPaymentMethod('card'),
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleCreateBooking = async () => {
    try {
      setLoading(true);

      if (service.isActive === false) {
        toast.error('Service Unavailable', 'This service is currently not available. Please choose another service or contact the vendor.');
        return;
      }

      // ✅ NEW: Include paymentMethod in the request
      const bookingData: any = {
        service: service._id,
        scheduledDate: scheduledDate.toISOString(),
        scheduledTime,
        serviceType: locationType,
        paymentMethod, // ✅ Required field now
      };

      if (clientNotes.trim()) {
        bookingData.clientNotes = clientNotes.trim();
      }

      if (locationType === 'home' && isHomeServiceAvailable) {
        bookingData.location = {
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          coordinates,
        };
      }

      console.log('Creating booking with data:', bookingData);
      const response = await bookingAPI.createBooking(bookingData);
      console.log('📦 Full booking response:', JSON.stringify(response, null, 2));

      if (response.success) {
        // ✅ DEBUG: Log what we received
        console.log('📦 Response data:', response.data);
        console.log('📦 authorizationUrl:', response.data?.authorizationUrl);
        console.log('📦 paymentMethod selected:', paymentMethod);

        // ✅ Get actual amount from backend (may include distance charge)
        const actualAmount = response.data.booking?.totalAmount || totalAmount;
        const backendDistanceCharge = response.data.booking?.distanceCharge || 0;
        
        // ✅ Warn if price is different than expected
        if (actualAmount !== totalAmount) {
          console.log(`⚠️ Price difference! Frontend: ₦${totalAmount}, Backend: ₦${actualAmount}`);
        }

        // ✅ Handle different payment methods
        const hasAuthUrl = response.data?.authorizationUrl;
        
        if (paymentMethod === 'card' && hasAuthUrl) {
          console.log('🔀 Navigating to PaymentScreen with URL:', hasAuthUrl);
          // Navigate to in-app PaymentScreen with WebView
          // ✅ Use actual amount from backend
          navigation.replace('Payment', {
            bookingId: response.data.booking._id,
            amount: actualAmount, // Use backend-calculated amount
            authorizationUrl: hasAuthUrl,
            reference: response.data.reference || response.data.booking?.paymentReference,
          });
        } else if (paymentMethod === 'card' && !hasAuthUrl) {
          // Card was selected but no authorizationUrl returned - something went wrong
          console.error('❌ Card payment selected but no authorizationUrl in response!');
          toast.error('Payment Error', 'Failed to initialize card payment. Please try again or use wallet.');
        } else {
          // Wallet payment - booking is already paid!
          toast.success('Booking Confirmed!', `Your booking has been created and payment of ₦${actualAmount.toLocaleString()} was successful!${backendDistanceCharge > 0 ? `\n\n(Includes ₦${backendDistanceCharge.toLocaleString()} distance charge)` : ''}\n\nThe vendor will be notified and can accept your booking.`);
          navigation.navigate('BookingDetail', {
            bookingId: response.data.booking._id,
          });
        }
      }
    } catch (error: any) {
      const apiError = handleAPIError(error);
      console.error('Booking creation error:', error);

      let errorMessage = 'Failed to create booking';
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      toast.error('Booking Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const canPayWithWallet = walletBalance >= totalAmount;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>

  const fp = (p: number) => `₦${p.toLocaleString()}`;
  const vp = vendor.vendorProfile;

  // ── Wallet verifying overlay ───────────────────────────────────────────────
  if (walletVerifying) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <Ionicons name="sparkles" size={18} color={PINK} style={{ position: 'absolute', top: 4, left: 12 }} />
          <Ionicons name="sparkles" size={12} color={PINK} style={{ position: 'absolute', top: 0, right: 18 }} />
          <Ionicons name="heart" size={12} color={PINK} style={{ position: 'absolute', bottom: 8, left: 22 }} />
          <Ionicons name="heart" size={10} color={PINK} style={{ position: 'absolute', bottom: 6, right: 22 }} />
          <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(224,64,121,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 114, height: 114, borderRadius: 57, backgroundColor: 'rgba(224,64,121,0.13)', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={PINK} />
            </View>
          </View>
        </View>

        {/* Progress Bar - Now 4 steps */}
        <View className="flex-row items-center justify-center mt-4 gap-2">
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-pink-500' : 'bg-gray-200'}`}
            />
          ))}
        </View>

        {/* Step Label */}
        <Text className="text-center text-sm text-gray-600 mt-2">
          {step === 1 && 'Select Date & Time'}
          {step === 2 && 'Choose Location'}
          {step === 3 && 'Payment Method'}
          {step === 4 && 'Review & Pay'}
        </Text>
        <View style={{ width: '100%', backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFE4EF', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="wallet-outline" size={22} color={PINK} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 3 }}>LookReal Pay</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: PINK }}>{fp(totalAmount)}</Text>
            </View>
          </View>
        </View>
        <View style={{ width: '100%', backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFE4EF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="lock-closed" size={13} color={PINK} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: PINK, marginLeft: 6 }}>What happens next?</Text>
          </View>
          <Text style={{ fontSize: 13, color: MUTED, lineHeight: 20 }}>
            Funds will be held securely in escrow and released to the vendor once both parties confirm the service is complete.
          </Text>
        </View>
      </View>
    );
  }

  // ── Wallet payment confirmed overlay ──────────────────────────────────────
  if (walletPaid) {
    return (
      <View style={{ flex: 1, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ position: 'absolute', top: '15%', width: 260, height: 260, borderRadius: 130, backgroundColor: '#F0FDF4' }} />
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50, backgroundColor: '#10b981',
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            elevation: 8, shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3, shadowRadius: 16,
          }}>
            <Ionicons name="checkmark" size={52} color={WHITE} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 6, letterSpacing: -0.5 }}>Payment Confirmed!</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: PINK, letterSpacing: -1, marginBottom: 12 }}>{fp(paidAmount)}</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
            Your booking has been confirmed and the vendor notified.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 28 }}>
            <Ionicons name="shield-checkmark" size={16} color="#10b981" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#166534' }}>Payment held securely in escrow</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <ActivityIndicator size="small" color={PINK} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, color: MUTED, fontWeight: '500' }}>Redirecting to your booking...</Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: PINK, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}
            onPress={() => { if (paidBookingId) navigation.replace('BookingDetail', { bookingId: paidBookingId }); }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: PINK }}>View Booking Now</Text>
            <Ionicons name="arrow-forward" size={16} color={PINK} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color={PINK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 4 ? 'Payment Method' : 'Book Appointment'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Step 1: Date & Time */}
        {step === 1 && (
          <View className="py-6">
            {/* Service Info */}
            <View className="bg-white rounded-2xl p-4 mb-6">
              <Text className="text-base font-bold text-gray-900 mb-2">{service.name}</Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-600 ml-1">{service.duration} min</Text>
                </View>
              </View>
              <Text style={styles.servicePrice}>{fp(service.basePrice)}+</Text>
            </View>

            {/* Date Picker */}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-4">Select Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="border-2 border-gray-200 rounded-xl p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={24} color="#eb278d" />
                  <Text className="text-base text-gray-900 ml-3">{formatDate(scheduledDate)}</Text>
                </View>
                <Ionicons name="chevron-down" size={24} color="#6b7280" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Time Picker */}
            <View className="bg-white rounded-2xl p-5">
              <Text className="text-base font-bold text-gray-900 mb-4">Select Time</Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className="border-2 border-gray-200 rounded-xl p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="time" size={24} color="#eb278d" />
                  <Text className="text-base text-gray-900 ml-3">
                    {scheduledTime || 'Select time'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={24} color="#6b7280" />
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={getTimePickerDate()}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                />
              )}
            </View>
          </View>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <View className="py-6">
            {/* Location Type Selection */}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Where should we provide the service?
              </Text>

              <View className="gap-3">
                {isHomeServiceAvailable && (
                  <TouchableOpacity
                    onPress={() => setLocationType('home')}
                    className={`border-2 rounded-xl p-4 ${
                      locationType === 'home' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View
                          className={`w-12 h-12 rounded-full items-center justify-center ${
                            locationType === 'home' ? 'bg-pink-100' : 'bg-gray-100'
                          }`}
                        >
                          <Ionicons
                            name="home"
                            size={24}
                            color={locationType === 'home' ? '#eb278d' : '#6b7280'}
                          />
                        </View>
                        <View className="ml-3">
                          <Text className="text-base font-bold text-gray-900">At My Location</Text>
                          <Text className="text-sm text-gray-500">Home service available</Text>
                        </View>
                      </View>
                      <Ionicons
                        name={locationType === 'home' ? 'radio-button-on' : 'radio-button-off'}
                        size={24}
                        color={locationType === 'home' ? '#eb278d' : '#d1d5db'}
                      />
                    </View>
                  </TouchableOpacity>
                )}

                {isShopServiceAvailable && (
                  <TouchableOpacity
                    onPress={() => setLocationType('shop')}
                    className={`border-2 rounded-xl p-4 ${
                      locationType === 'shop' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View
                          className={`w-12 h-12 rounded-full items-center justify-center ${
                            locationType === 'shop' ? 'bg-pink-100' : 'bg-gray-100'
                          }`}
                        >
                          <Ionicons
                            name="storefront"
                            size={24}
                            color={locationType === 'shop' ? '#eb278d' : '#6b7280'}
                          />
                        </View>
                        <View className="ml-3">
                          <Text className="text-base font-bold text-gray-900">
                            At Vendor's Shop
                          </Text>
                          <Text className="text-sm text-gray-500">Visit the service location</Text>
                        </View>
                      </View>
                      <Ionicons
                        name={locationType === 'shop' ? 'radio-button-on' : 'radio-button-off'}
                        size={24}
                        color={locationType === 'shop' ? '#eb278d' : '#d1d5db'}
                      />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Address Input (Home Service) */}
            {locationType === 'home' && isHomeServiceAvailable && (
              <View className="bg-white rounded-2xl p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-base font-bold text-gray-900">Your Address</Text>
                  <TouchableOpacity
                    onPress={getCurrentLocation}
                    disabled={locationLoading}
                    className="flex-row items-center"
                    activeOpacity={0.7}
                  >
                    {locationLoading ? (
                      <ActivityIndicator size="small" color="#eb278d" />
                    ) : (
                      <>
                        <Ionicons name="navigate" size={16} color="#eb278d" />
                        <Text className="text-sm text-pink-600 ml-1 font-semibold">
                          Use current
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {locationError ? (
                  <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex-row items-center">
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text className="text-red-600 text-xs ml-2 flex-1">{locationError}</Text>
                  </View>
                ) : null}

                <View className="gap-4">
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Street Address *
                    </Text>
                    <TextInput
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                      placeholder="Enter your street address"
                      value={address}
                      onChangeText={setAddress}
                      multiline
                      editable={!locationLoading}
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">City *</Text>
                    <TextInput
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                      placeholder="Enter city"
                      value={city}
                      onChangeText={setCity}
                      editable={!locationLoading}
                    />
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">State *</Text>
                    <TextInput
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                      placeholder="Enter state"
                      value={state}
                      onChangeText={setState}
                      editable={!locationLoading}
                    />
                  </View>
                </View>

                {address && city && state && (
                  <View className="bg-green-50 border border-green-200 rounded-xl p-3 mt-4">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="checkmark-circle" size={20} color="#059669" />
                      <Text className="text-green-700 font-semibold ml-2">Location Set</Text>
                    </View>
                    <Text className="text-gray-700 text-sm">
                      {address}, {city}, {state}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Vendor Location (Shop Service) */}
            {locationType === 'shop' && vendor.vendorProfile.location && (
              <View className="bg-white rounded-2xl p-5">
                <Text className="text-base font-bold text-gray-900 mb-4">Vendor's Location</Text>
                <View className="flex-row items-start">
                  <Ionicons name="location" size={24} color="#eb278d" />
                  <View className="flex-1 ml-3">
                    <Text className="text-base text-gray-900 font-semibold">
                      {vendor.vendorProfile.businessName}
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      {vendor.vendorProfile.location.address}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      {vendor.vendorProfile.location.city}, {vendor.vendorProfile.location.state}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 3: Payment Method Selection */}
        {step === 3 && (
          <View className="py-6">
            {/* Price Summary Card */}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-3">Amount to Pay</Text>
              
              {priceLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#eb278d" />
                  <Text className="text-gray-500 ml-2">Calculating price...</Text>
                </View>
              ) : (
                <>
                  {/* Price Breakdown */}
                  <View className="mb-3">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-gray-600">Service Fee</Text>
                      <Text className="text-gray-900 font-semibold">{formatPrice(servicePrice)}</Text>
                    </View>
                    
                    {distanceCharge > 0 && (
                      <View className="flex-row justify-between items-center mb-1">
                        <View className="flex-row items-center">
                          <Text className="text-gray-600">Distance Charge</Text>
                          {calculatedDistance && (
                            <Text className="text-gray-400 text-xs ml-1">
                              ({calculatedDistance.toFixed(1)} km)
                            </Text>
                          )}
                        </View>
                        <Text className="text-gray-900 font-semibold">{formatPrice(distanceCharge)}</Text>
                      </View>
                    )}
                    
                    <View className="border-t border-gray-200 pt-2 mt-2">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-base font-bold text-gray-900">Total</Text>
                        <Text className="text-2xl font-bold text-pink-600">{formatPrice(totalAmount)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Distance Charge Info */}
                  {locationType === 'home' && distanceCharge > 0 && (
                    <View className="bg-blue-50 rounded-lg p-3 flex-row items-center">
                      <Ionicons name="car" size={16} color="#3b82f6" />
                      <Text className="text-blue-700 text-xs ml-2 flex-1">
                        Distance charge applies for home service delivery
                      </Text>
                    </View>
                  )}

                  {locationType === 'shop' && (
                    <View className="bg-green-50 rounded-lg p-3 flex-row items-center">
                      <Ionicons name="storefront" size={16} color="#10b981" />
                      <Text className="text-green-700 text-xs ml-2 flex-1">
                        No distance charge - visiting vendor's location
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View className="bg-white rounded-2xl p-5">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Select Payment Method
              </Text>

              <View className="gap-3">
                {/* Wallet Payment Option */}
                <TouchableOpacity
                  onPress={() => setPaymentMethod('wallet')}
                  disabled={walletLoading}
                  className={`border-2 rounded-xl p-4 ${
                    paymentMethod === 'wallet'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center ${
                          paymentMethod === 'wallet' ? 'bg-pink-100' : 'bg-gray-100'
                        }`}
                      >
                        <Ionicons
                          name="wallet"
                          size={24}
                          color={paymentMethod === 'wallet' ? '#eb278d' : '#6b7280'}
                        />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-bold text-gray-900">SharpPAY Wallet</Text>
                        {walletLoading ? (
                          <ActivityIndicator size="small" color="#6b7280" />
                        ) : (
                          <Text
                            className={`text-sm ${
                              canPayWithWallet ? 'text-green-600' : 'text-red-500'
                            }`}
                          >
                            Balance: {formatPrice(walletBalance)}
                            {!canPayWithWallet && ' (Insufficient)'}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons
                      name={paymentMethod === 'wallet' ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color={paymentMethod === 'wallet' ? '#eb278d' : '#d1d5db'}
                    />
                  </View>

                  {paymentMethod === 'wallet' && canPayWithWallet && (
                    <View className="mt-3 bg-green-50 rounded-lg p-3 flex-row items-center">
                      <Ionicons name="flash" size={16} color="#10b981" />
                      <Text className="text-green-700 text-sm ml-2 font-medium">
                        Instant payment - No redirect required
                      </Text>
                    </View>
                  )}

                  {paymentMethod === 'wallet' && !canPayWithWallet && !walletLoading && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('FundWallet')}
                      className="mt-3 bg-pink-100 rounded-lg p-3 flex-row items-center justify-center"
                    >
                      <Ionicons name="add-circle" size={16} color="#eb278d" />
                      <Text className="text-pink-600 text-sm ml-2 font-bold">Fund Wallet</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {/* Card Payment Option */}
                <TouchableOpacity
                  onPress={() => setPaymentMethod('card')}
                  className={`border-2 rounded-xl p-4 ${
                    paymentMethod === 'card'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center ${
                          paymentMethod === 'card' ? 'bg-pink-100' : 'bg-gray-100'
                        }`}
                      >
                        <Ionicons
                          name="card"
                          size={24}
                          color={paymentMethod === 'card' ? '#eb278d' : '#6b7280'}
                        />
                      </View>
                      <View className="ml-3">
                        <Text className="text-base font-bold text-gray-900">Debit/Credit Card</Text>
                        <Text className="text-sm text-gray-500">Pay with Paystack</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={paymentMethod === 'card' ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                      color={paymentMethod === 'card' ? '#eb278d' : '#d1d5db'}
                    />
                  </View>

                  {paymentMethod === 'card' && (
                    <View className="mt-3 bg-blue-50 rounded-lg p-3 flex-row items-center">
                      <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
                      <Text className="text-blue-700 text-sm ml-2 font-medium">
                        Secure payment via Paystack
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Cancellation Policy Notice */}
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={24} color="#f59e0b" />
                <View className="flex-1 ml-3">
                  <Text className="text-amber-800 font-bold mb-1">Cancellation Policy</Text>
                  <Text className="text-amber-700 text-sm">
                    • Free cancellation up to 59 minutes before appointment{'\n'}
                    • 20% fee applies for cancellations within 59 minutes
                  </Text>
                </View>
              </View>
            </View>

            {/* Distance Charge Info for Home Service */}
            {locationType === 'home' && distanceCharge > 0 && (
              <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4">
                <View className="flex-row items-start">
                  <Ionicons name="car" size={24} color="#3b82f6" />
                  <View className="flex-1 ml-3">
                    <Text className="text-blue-800 font-bold mb-1">Distance Charge Included</Text>
                    <Text className="text-blue-700 text-sm">
                      A {formatPrice(distanceCharge)} distance fee has been added for home service delivery
                      {calculatedDistance ? ` (${calculatedDistance.toFixed(1)} km from vendor)` : ''}.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {locationType === 'home' && distanceCharge === 0 && !priceLoading && (
              <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mt-4">
                <View className="flex-row items-start">
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  <View className="flex-1 ml-3">
                    <Text className="text-green-800 font-bold mb-1">No Distance Charge</Text>
                    <Text className="text-green-700 text-sm">
                      You're within the free delivery zone!
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <View className="py-6">
            {/* Booking Summary */}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-lg font-bold text-gray-900 mb-4">Booking Summary</Text>

              <View className="border-b border-gray-100 pb-4 mb-4">
                <Text className="text-sm text-gray-500 mb-1">Service</Text>
                <Text className="text-base font-semibold text-gray-900">{service.name}</Text>
              </View>

              <View className="border-b border-gray-100 pb-4 mb-4">
                <Text className="text-sm text-gray-500 mb-1">Date & Time</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {formatDate(scheduledDate)} at {scheduledTime}
                </Text>
              </View>

              <View className="border-b border-gray-100 pb-4 mb-4">
                <Text className="text-sm text-gray-500 mb-1">Location</Text>
                {locationType === 'home' ? (
                  <Text className="text-base font-semibold text-gray-900">
                    {address}, {city}, {state}
                  </Text>
                ) : (
                  <Text className="text-base font-semibold text-gray-900">
                    {vendor.vendorProfile.location?.address}
                  </Text>
                )}
              </View>

              <View className="border-b border-gray-100 pb-4 mb-4">
                <Text className="text-sm text-gray-500 mb-1">Vendor</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {vendor.vendorProfile.businessName}
                </Text>
              </View>

              <View>
                <Text className="text-sm text-gray-500 mb-1">Payment Method</Text>
                <View className="flex-row items-center">
                  <Ionicons
                    name={paymentMethod === 'wallet' ? 'wallet' : 'card'}
                    size={20}
                    color="#eb278d"
                  />
                  <Text className="text-base font-semibold text-gray-900 ml-2">
                    {paymentMethod === 'wallet' ? 'SharpPAY Wallet' : 'Debit/Credit Card'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Price Breakdown */}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-lg font-bold text-gray-900 mb-4">Price Breakdown</Text>

              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-600">Service Fee</Text>
                  <Text className="text-gray-900 font-semibold">{formatPrice(servicePrice)}</Text>
                </View>
              </View>
            )}
          </>
        )}

                {distanceCharge > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-600">Distance Charge</Text>
                    <Text className="text-gray-900 font-semibold">
                      {formatPrice(distanceCharge)}
                    </Text>
                  </View>
                )}

                <View className="border-t border-gray-200 pt-3 mt-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-bold text-gray-900">Total</Text>
                    <Text className="text-xl font-bold text-pink-600">
                      {formatPrice(totalAmount)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Price Breakdown */}
            <View style={[styles.card, { marginTop: 14 }]}>
              <Text style={styles.cardTitle}>Price Breakdown</Text>
              {priceLoading
                ? <ActivityIndicator color={PINK} style={{ marginTop: 14 }} />
                : (
                  <>
                    <View style={[styles.detailRow, { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                      <Text style={styles.detailLabel}>Service fee</Text>
                      <Text style={styles.detailValue}>{fp(servicePrice)}</Text>
                    </View>
                    {distanceCharge > 0 && (
                      <View style={[styles.detailRow, { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                        <Text style={styles.detailLabel}>Distance charge</Text>
                        <Text style={styles.detailValue}>{fp(distanceCharge)}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total</Text>
                      <Text style={[styles.detailValue, { color: PINK, fontSize: 17, fontWeight: '800' }]}>
                        {fp(totalAmount)}
                      </Text>
                    </View>
                  </>
                )
              }
            </View>

            {/* Cancellation Policy */}
            <View style={styles.cancelCard}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" style={{ marginTop: 1 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cancelTitle}>Cancellation Policy</Text>
                <Text style={styles.cancelBody}>
                  - Free cancellation up to 59 minutes before your appointment{'\n'}
                  - 20% fee applies for cancellations within 59 minutes
                </Text>
              </View>
            </View>

            {/* Additional Notes */}
            <View className="bg-white rounded-2xl p-5">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Additional Notes (Optional)
              </Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[100px]"
                placeholder="Any special requests or notes for the vendor..."
                value={clientNotes}
                onChangeText={setClientNotes}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Button */}
      <View className="bg-white border-t border-gray-100 px-5 py-4">
        {step < 4 ? (
          <TouchableOpacity
            className="bg-pink-500 py-4 rounded-xl items-center"
            style={{
              shadowColor: '#eb278d',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-bold">Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleCreateBooking}
            disabled={loading || (paymentMethod === 'wallet' && !canPayWithWallet)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                loading || (paymentMethod === 'wallet' && !canPayWithWallet)
                  ? ['#d1d5db', '#9ca3af']
                  : ['#eb278d', '#f472b6']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="py-4 rounded-xl items-center"
              style={{
                shadowColor: '#eb278d',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons
                    name={paymentMethod === 'wallet' ? 'wallet' : 'card'}
                    size={20}
                    color="#fff"
                  />
                  <Text className="text-white text-base font-bold ml-2">
                    {paymentMethod === 'wallet'
                      ? `Pay ${formatPrice(totalAmount)} & Confirm`
                      : `Proceed to Pay ${formatPrice(totalAmount)}`}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({...prev, visible: false})); }}
        onCancel={() => setConfirmModal(prev => ({...prev, visible: false}))}
      />
    </SafeAreaView>
  );
};

export default CreateBookingScreen;