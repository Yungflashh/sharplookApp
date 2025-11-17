import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
type CreateBookingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateBooking'>;
type CreateBookingRouteProp = RouteProp<RootStackParamList, 'CreateBooking'>;
const CreateBookingScreen: React.FC = () => {
  const navigation = useNavigation<CreateBookingNavigationProp>();
  const route = useRoute<CreateBookingRouteProp>();
  const {
    service,
    vendor
  } = route.params;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [locationType, setLocationType] = useState<'home' | 'shop'>('home');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>([0, 0]);
  const [clientNotes, setClientNotes] = useState('');
  const [servicePrice, setServicePrice] = useState(service.basePrice || 0);
  const [distanceCharge, setDistanceCharge] = useState(0);
  const [totalAmount, setTotalAmount] = useState(service.basePrice || 0);
  const isHomeServiceAvailable = vendor.vendorProfile.vendorType === 'home_service' || vendor.vendorProfile.vendorType === 'both';
  const isShopServiceAvailable = vendor.vendorProfile.vendorType === 'in_shop' || vendor.vendorProfile.vendorType === 'both';
  useEffect(() => {
    if (!isHomeServiceAvailable && isShopServiceAvailable) {
      setLocationType('shop');
    }
  }, []);
  useEffect(() => {
    setTotalAmount(servicePrice + distanceCharge);
  }, [servicePrice, distanceCharge]);
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
  const getCurrentLocation = async () => {
    Alert.alert('Location', 'Getting current location...');
  };
  const validateStep1 = () => {
    if (!scheduledDate) {
      Alert.alert('Error', 'Please select a date');
      return false;
    }
    if (!scheduledTime) {
      Alert.alert('Error', 'Please select a time');
      return false;
    }
    return true;
  };
  const validateStep2 = () => {
    if (locationType === 'home' && isHomeServiceAvailable) {
      if (!address.trim()) {
        Alert.alert('Error', 'Please enter your address');
        return false;
      }
      if (!city.trim()) {
        Alert.alert('Error', 'Please enter your city');
        return false;
      }
      if (!state.trim()) {
        Alert.alert('Error', 'Please enter your state');
        return false;
      }
    }
    return true;
  };
  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
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
        Alert.alert('Service Unavailable', 'This service is currently not available. Please choose another service or contact the vendor.', [{
          text: 'OK'
        }]);
        return;
      }
      const bookingData: any = {
        service: service._id,
        scheduledDate: scheduledDate.toISOString(),
        scheduledTime
      };
      if (clientNotes.trim()) {
        bookingData.clientNotes = clientNotes.trim();
      }
      if (locationType === 'home' && isHomeServiceAvailable) {
        bookingData.location = {
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          coordinates
        };
      }
      console.log('Creating booking with data:', bookingData);
      const response = await bookingAPI.createBooking(bookingData);
      console.log('Booking created:', response);
      if (response.success) {
        Alert.alert('Booking Created!', 'Your booking has been created. Please complete the payment.', [{
          text: 'OK',
          onPress: () => {
            navigation.navigate('BookingDetail', {
              bookingId: response.data.booking._id
            });
          }
        }]);
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
      Alert.alert('Booking Error', errorMessage);
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
      day: 'numeric'
    });
  };
  return <SafeAreaView className="flex-1 bg-gray-50">
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={handleBack} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>

          <Text className="text-lg font-bold text-gray-900">Book Service</Text>

          <View className="w-10" />
        </View>

        {}
        <View className="flex-row items-center justify-center mt-4 gap-2">
          {[1, 2, 3].map(s => <View key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-pink-500' : 'bg-gray-200'}`} />)}
        </View>

        {}
        <Text className="text-center text-sm text-gray-600 mt-2">
          {step === 1 && 'Select Date & Time'}
          {step === 2 && 'Choose Location'}
          {step === 3 && 'Review & Confirm'}
        </Text>
      </View>

      {}
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {}
        {step === 1 && <View className="py-6">
            {}
            <View className="bg-white rounded-2xl p-4 mb-6">
              <Text className="text-base font-bold text-gray-900 mb-2">
                {service.name}
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-600 ml-1">
                    {service.duration} min
                  </Text>
                </View>
                <Text className="text-lg font-bold text-pink-600">
                  {formatPrice(service.basePrice)}
                </Text>
              </View>
            </View>

            {}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} className="border-2 border-gray-200 rounded-xl p-4 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={24} color="#eb278d" />
                  <Text className="text-base text-gray-900 ml-3">
                    {formatDate(scheduledDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={24} color="#6b7280" />
              </TouchableOpacity>

              {showDatePicker && <DateTimePicker value={scheduledDate} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />}
            </View>

            {}
            <View className="bg-white rounded-2xl p-5">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Select Time
              </Text>
              <TouchableOpacity onPress={() => setShowTimePicker(true)} className="border-2 border-gray-200 rounded-xl p-4 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="time" size={24} color="#eb278d" />
                  <Text className="text-base text-gray-900 ml-3">
                    {scheduledTime || 'Select time'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={24} color="#6b7280" />
              </TouchableOpacity>

              {showTimePicker && <DateTimePicker value={new Date()} mode="time" display="default" onChange={onTimeChange} />}
            </View>
          </View>}

        {}
        {step === 2 && <View className="py-6">
            {}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Where should we provide the service?
              </Text>

              <View className="gap-3">
                {isHomeServiceAvailable && <TouchableOpacity onPress={() => setLocationType('home')} className={`border-2 rounded-xl p-4 ${locationType === 'home' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className={`w-12 h-12 rounded-full items-center justify-center ${locationType === 'home' ? 'bg-pink-100' : 'bg-gray-100'}`}>
                          <Ionicons name="home" size={24} color={locationType === 'home' ? '#eb278d' : '#6b7280'} />
                        </View>
                        <View className="ml-3">
                          <Text className="text-base font-bold text-gray-900">
                            At My Location
                          </Text>
                          <Text className="text-sm text-gray-500">
                            Home service available
                          </Text>
                        </View>
                      </View>
                      <Ionicons name={locationType === 'home' ? 'radio-button-on' : 'radio-button-off'} size={24} color={locationType === 'home' ? '#eb278d' : '#d1d5db'} />
                    </View>
                  </TouchableOpacity>}

                {isShopServiceAvailable && <TouchableOpacity onPress={() => setLocationType('shop')} className={`border-2 rounded-xl p-4 ${locationType === 'shop' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className={`w-12 h-12 rounded-full items-center justify-center ${locationType === 'shop' ? 'bg-pink-100' : 'bg-gray-100'}`}>
                          <Ionicons name="storefront" size={24} color={locationType === 'shop' ? '#eb278d' : '#6b7280'} />
                        </View>
                        <View className="ml-3">
                          <Text className="text-base font-bold text-gray-900">
                            At Vendor's Shop
                          </Text>
                          <Text className="text-sm text-gray-500">
                            Visit the service location
                          </Text>
                        </View>
                      </View>
                      <Ionicons name={locationType === 'shop' ? 'radio-button-on' : 'radio-button-off'} size={24} color={locationType === 'shop' ? '#eb278d' : '#d1d5db'} />
                    </View>
                  </TouchableOpacity>}
              </View>
            </View>

            {}
            {locationType === 'home' && isHomeServiceAvailable && <View className="bg-white rounded-2xl p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-base font-bold text-gray-900">
                    Your Address
                  </Text>
                  <TouchableOpacity onPress={getCurrentLocation} className="flex-row items-center">
                    <Ionicons name="navigate" size={16} color="#eb278d" />
                    <Text className="text-sm text-pink-600 ml-1 font-semibold">
                      Use current
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="gap-4">
                  {}
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      Street Address *
                    </Text>
                    <TextInput className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900" placeholder="Enter your street address" value={address} onChangeText={setAddress} multiline />
                  </View>

                  {}
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      City *
                    </Text>
                    <TextInput className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900" placeholder="Enter city" value={city} onChangeText={setCity} />
                  </View>

                  {}
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      State *
                    </Text>
                    <TextInput className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900" placeholder="Enter state" value={state} onChangeText={setState} />
                  </View>
                </View>
              </View>}

            {}
            {locationType === 'shop' && vendor.vendorProfile.location && <View className="bg-white rounded-2xl p-5">
                <Text className="text-base font-bold text-gray-900 mb-4">
                  Vendor's Location
                </Text>
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
                      {vendor.vendorProfile.location.city},{' '}
                      {vendor.vendorProfile.location.state}
                    </Text>
                  </View>
                </View>
              </View>}
          </View>}

        {}
        {step === 3 && <View className="py-6">
            {}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                Booking Summary
              </Text>

              {}
              <View className="border-b border-gray-100 pb-4 mb-4">
                <Text className="text-sm text-gray-500 mb-1">Service</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {service.name}
                </Text>
              </View>

              {}
              <View className="border-b border-gray-100 pb-4 mb-4">
                <Text className="text-sm text-gray-500 mb-1">Date & Time</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {formatDate(scheduledDate)} at {scheduledTime}
                </Text>
              </View>

              {}
              <View className="border-b border-gray-100 pb-4 mb-4">
                <Text className="text-sm text-gray-500 mb-1">Location</Text>
                {locationType === 'home' ? <Text className="text-base font-semibold text-gray-900">
                    {address}, {city}, {state}
                  </Text> : <Text className="text-base font-semibold text-gray-900">
                    {vendor.vendorProfile.location?.address}
                  </Text>}
              </View>

              {}
              <View>
                <Text className="text-sm text-gray-500 mb-1">Vendor</Text>
                <Text className="text-base font-semibold text-gray-900">
                  {vendor.vendorProfile.businessName}
                </Text>
              </View>
            </View>

            {}
            <View className="bg-white rounded-2xl p-5 mb-4">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                Price Breakdown
              </Text>

              <View className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-600">Service Fee</Text>
                  <Text className="text-gray-900 font-semibold">
                    {formatPrice(servicePrice)}
                  </Text>
                </View>

                {distanceCharge > 0 && <View className="flex-row items-center justify-between">
                    <Text className="text-gray-600">Distance Charge</Text>
                    <Text className="text-gray-900 font-semibold">
                      {formatPrice(distanceCharge)}
                    </Text>
                  </View>}

                <View className="border-t border-gray-200 pt-3 mt-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-bold text-gray-900">Total</Text>
                    <Text className="text-xl font-bold text-pink-600">
                      {formatPrice(totalAmount)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {}
            <View className="bg-white rounded-2xl p-5">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Additional Notes (Optional)
              </Text>
              <TextInput className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[100px]" placeholder="Any special requests or notes for the vendor..." value={clientNotes} onChangeText={setClientNotes} multiline textAlignVertical="top" />
            </View>
          </View>}
      </ScrollView>

      {}
      <View className="bg-white border-t border-gray-100 px-5 py-4">
        {step < 3 ? <TouchableOpacity className="bg-pink-500 py-4 rounded-xl items-center" style={{
        shadowColor: '#eb278d',
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
      }} onPress={handleNext} activeOpacity={0.8}>
            <Text className="text-white text-base font-bold">Continue</Text>
          </TouchableOpacity> : <TouchableOpacity className="bg-pink-500 py-4 rounded-xl items-center" style={{
        shadowColor: '#eb278d',
        shadowOffset: {
          width: 0,
          height: 4
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
      }} onPress={handleCreateBooking} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">
                Confirm & Pay {formatPrice(totalAmount)}
              </Text>}
          </TouchableOpacity>}
      </View>
    </SafeAreaView>;
};
export default CreateBookingScreen;