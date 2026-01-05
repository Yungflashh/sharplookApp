import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Alert, Image, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError, referralAPI } from '@/api/api';
import { Input, PasswordInput, Button, Checkbox, SocialLoginButton, PhoneInput, CountryCodePicker } from '@/components/ui/forms';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface LocationData {
  type: 'Point';
  coordinates: [number, number]; 
  address: string;
  city: string;
  state: string;
  country: string;
}

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralId, setReferralId] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [registerAsVendor, setRegisterAsVendor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('+234');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [generalError, setGeneralError] = useState('');
  
  
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null);
  const [referralCodeChecking, setReferralCodeChecking] = useState(false);
  const [referralCodeError, setReferralCodeError] = useState('');
  const [referrerName, setReferrerName] = useState('');
  
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: ''
  });

  
  useEffect(() => {
    checkLocationPermission();
  }, []);

  
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (referralId.trim() && referralId.length >= 6) {
        validateReferralCode(referralId);
      } else {
        setReferralCodeValid(null);
        setReferralCodeError('');
        setReferrerName('');
      }
    }, 800);

    return () => clearTimeout(delayDebounce);
  }, [referralId]);


const validateReferralCode = async (code: string) => {
  if (!code.trim()) {
    setReferralCodeValid(null);
    setReferralCodeError('');
    setReferrerName('');
    return;
  }

  setReferralCodeChecking(true);
  setReferralCodeError(''); 
  setGeneralError('');

  try {
    const response = await referralAPI.validateReferralCode(code.trim().toUpperCase());
    
    console.log('Response data:', response.data);
    
    
    const isValid = response.data?.success && response.data?.data?.valid === true;
    
    if (isValid) {
      console.log('✅ Code is VALID');
      setReferralCodeValid(true);
      setReferrerName(response.data.data.referrerName || 'a friend');
      setReferralCodeError(''); 
    } else {
      console.log('❌ Code is INVALID');
      setReferralCodeValid(false);
      setReferrerName('');
      
      setReferralCodeError('Invalid referral code');
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error);
    setReferralCodeValid(false);
    setReferralCodeError('Invalid referral code');
    setReferrerName('');
  } finally {
    setReferralCodeChecking(false);
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
          Alert.alert(
            'Location Permission Required',
            'Please enable location permissions in your device settings to use this feature.',
            [{ text: 'OK' }]
          );
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
        
        const locationData: LocationData = {
          type: 'Point',
          coordinates: [longitude, latitude],
          address: `${addressData.street || ''} ${addressData.streetNumber || ''}`.trim() || 'Address not available',
          city: addressData.city || addressData.subregion || 'Unknown City',
          state: addressData.region || 'Unknown State',
          country: addressData.country || 'Unknown Country',
        };

        setLocation(locationData);
        Alert.alert('Success', 'Location captured successfully!');
      } else {
        throw new Error('Unable to get address details');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      setLocationError('Failed to get location. Please try again.');
      Alert.alert(
        'Location Error',
        'Unable to get your location. Please ensure location services are enabled and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      terms: ''
    };

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      valid = false;
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      valid = false;
    }

    if (!email) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      valid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
      valid = false;
    } else if (!/^[0-9]{10,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Phone number is invalid';
      valid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleVendorCheckboxPress = (checked: boolean) => {
    if (checked) {
      Alert.alert(
        'Register as Vendor',
        'Are you sure you want to register as a vendor? You will need to complete additional profile setup and provide business information.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {}
          },
          {
            text: 'Yes, Continue',
            onPress: () => {
              setRegisterAsVendor(true);
            }
          }
        ]
      );
    } else {
      setRegisterAsVendor(false);
    }
  };

  const handleRegister = async () => {
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    if (!location) {
      Alert.alert(
        'Add Location?',
        'Would you like to add your location? This will help us provide better services.',
        [
          {
            text: 'Skip',
            style: 'cancel',
            onPress: () => proceedWithRegistration()
          },
          {
            text: 'Add Location',
            onPress: async () => {
              await getCurrentLocation();
              if (location) {
                proceedWithRegistration();
              }
            }
          }
        ]
      );
      return;
    }

    await proceedWithRegistration();
  };

  const proceedWithRegistration = async () => {
    setLoading(true);

    try {
      const registerData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: `${countryCode}${phone.trim()}`,
        password: password,
        confirmPassword: confirmPassword,
        isVendor: registerAsVendor
      };

      if (location) {
        registerData.location = location;
      }

      
      if (referralId.trim() && referralCodeValid === true) {
  registerData.referredBy = referralId.trim().toUpperCase();  
}

      console.log('Registration data:', registerData);

      const response = await authAPI.register(registerData);

      if (response.success) {
        if (registerAsVendor) {
          Alert.alert(
            'Success',
            'Account created successfully! Please complete your vendor profile.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
        } else {
          
          const successMessage = referralCodeValid === true 
            ? `Account created successfully! 🎉\n\nYou've been referred by ${referrerName}. Complete your first booking to unlock your rewards!`
            : 'Account created successfully!';
            
          Alert.alert(
            'Success',
            successMessage,
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
        }
      } else {
        setGeneralError(response.message || 'Unable to create account. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const apiError = handleAPIError(error);

      if (apiError.fieldErrors) {
        const newErrors = { ...errors };
        Object.keys(apiError.fieldErrors).forEach(field => {
          if (field in newErrors) {
            (newErrors as any)[field] = apiError.fieldErrors![field];
          }
        });
        setErrors(newErrors);
      }

      if (apiError.isNetworkError) {
        setGeneralError('Network error. Please check your internet connection and try again.');
      } else {
        setGeneralError(apiError.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 40
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View className="items-center mb-8">
            <Image
              source={require('@/assets/logo.png')}
              className="w-28 h-16"
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-center text-black mb-2">
              Create Your Account
            </Text>
            <Text className="text-base text-center text-gray-700">
              Please fill the details below
            </Text>
          </View>

          {/* General Error Message */}
          {generalError ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex-row items-start">
              <Ionicons
                name="alert-circle"
                size={20}
                color="#DC2626"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text className="text-red-600 text-sm flex-1">{generalError}</Text>
            </View>
          ) : null}

          {/* Name Inputs */}
          <View className="flex-row gap-3">
            <Input
              containerClassName="flex-1 mb-0"
              label="First Name"
              placeholder=""
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                setErrors({ ...errors, firstName: '' });
                setGeneralError('');
              }}
              error={errors.firstName}
              editable={!loading}
            />

            <Input
              containerClassName="flex-1 mb-0"
              label="Last Name"
              placeholder=""
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                setErrors({ ...errors, lastName: '' });
                setGeneralError('');
              }}
              error={errors.lastName}
              editable={!loading}
            />
          </View>

          {/* Email Input */}
          <Input
            label="Enter E-mail Address"
            placeholder=""
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: '' });
              setGeneralError('');
            }}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          {/* Phone Input */}
          <PhoneInput
            label="Enter Phone Number"
            placeholder="8123456789"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              setErrors({ ...errors, phone: '' });
              setGeneralError('');
            }}
            error={errors.phone}
            editable={!loading}
            countryCode={countryCode}
            onCountryCodePress={() => setShowCountryPicker(true)}
          />

          {/* Password Input */}
          <PasswordInput
            label="Password"
            placeholder=""
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: '' });
              setGeneralError('');
            }}
            error={errors.password}
            editable={!loading}
          />

          {/* Confirm Password Input */}
          <PasswordInput
            label="Confirm Password"
            placeholder=""
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setErrors({ ...errors, confirmPassword: '' });
              setGeneralError('');
            }}
            error={errors.confirmPassword}
            editable={!loading}
          />

          {/* Location Section */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Location (required)
            </Text>
            
            {location ? (
              <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-2">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="location" size={20} color="#059669" />
                  <Text className="text-green-700 font-semibold ml-2">Location Added</Text>
                </View>
                <Text className="text-gray-700 text-sm mb-1">
                  {location.address}
                </Text>
                <Text className="text-gray-600 text-xs">
                  {location.city}, {location.state}, {location.country}
                </Text>
                <TouchableOpacity
                  onPress={() => setLocation(null)}
                  className="mt-3"
                  activeOpacity={0.7}
                >
                  <Text className="text-red-600 text-sm font-semibold">Remove Location</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={getCurrentLocation}
                disabled={locationLoading || loading}
                className={`bg-pink-50 border border-pink-200 rounded-xl p-4 flex-row items-center justify-center ${
                  locationLoading || loading ? 'opacity-50' : ''
                }`}
                activeOpacity={0.7}
              >
                {locationLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#EC4899" />
                    <Text className="text-pink-600 font-semibold ml-3">Getting Location...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="location-outline" size={20} color="#EC4899" />
                    <Text className="text-pink-600 font-semibold ml-2">Add Current Location</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {locationError ? (
              <Text className="text-red-600 text-xs mt-2">{locationError}</Text>
            ) : null}

            <Text className="text-gray-500 text-xs mt-2">
              Adding your location helps us provide better services and find vendors near you.
            </Text>
          </View>

          {/* Referral Code Section */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Referral Code (Optional)
            </Text>
            
            <View className="relative">
              <View
                className={`flex-row items-center bg-white border rounded-xl px-4 py-3 ${
                  referralCodeValid === true
                    ? 'border-green-500 bg-green-50'
                    : referralCodeValid === false
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                }`}
              >
                <Ionicons
                  name="ticket-outline"
                  size={20}
                  color={
                    referralCodeValid === true
                      ? '#10B981'
                      : referralCodeValid === false
                      ? '#EF4444'
                      : '#9CA3AF'
                  }
                />
                <TextInput
                  className="flex-1 ml-3 text-base text-gray-900"
                  placeholder="Enter referral code"
                  placeholderTextColor="#9CA3AF"
                  value={referralId}
                  onChangeText={(text) => {
                    setReferralId(text.toUpperCase());
                    setGeneralError('');
                  }}
                  editable={!loading}
                  autoCapitalize="characters"
                  maxLength={10}
                  style={{ letterSpacing: 1 }}
                />
                
                {referralCodeChecking && (
                  <ActivityIndicator size="small" color="#EC4899" />
                )}
                
                {referralCodeValid === true && !referralCodeChecking && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
                
                {referralCodeValid === false && !referralCodeChecking && (
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                )}
              </View>
            </View>

            {/* Success Message */}
            {referralCodeValid === true && referrerName && (
              <View className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3 flex-row items-start">
                <Ionicons name="gift" size={20} color="#10B981" style={{ marginTop: 1 }} />
                <View className="flex-1 ml-2">
                  <Text className="text-green-700 font-semibold text-sm mb-1">
                    Valid Referral Code! 🎉
                  </Text>
                  <Text className="text-green-600 text-xs">
                    Referred by {referrerName}. You'll get bonus rewards on your first booking!
                  </Text>
                </View>
              </View>
            )}

            {/* Error Message */}
            {referralCodeError && (
              <View className="flex-row items-center mt-2">
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text className="text-red-600 text-xs ml-1">{referralCodeError}</Text>
              </View>
            )}

            {/* Info Message */}
            {!referralId && (
              <View className="flex-row items-start mt-2">
                <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" style={{ marginTop: 1 }} />
                <Text className="text-gray-500 text-xs ml-1 flex-1">
                  Have a referral code? Enter it to get exclusive rewards on your first booking!
                </Text>
              </View>
            )}
          </View>

          {/* Terms & Vendor Checkbox */}
          <View className="mb-6">
            <Checkbox
              checked={agreeToTerms}
              onChange={setAgreeToTerms}
              disabled={loading}
              error={errors.terms}
              label={
                <Text className="text-sm text-gray-700 flex-1">
                  By signing up, you agree to our{' '}
                  <Text 
                    className="text-pink-500 font-semibold"
                    onPress={() => navigation.navigate('TermsPrivacyAuthScreen', { type: 'privacy' })}
                  >
                    Privacy Policy
                  </Text>{' and '}
                  <Text 
                    className="text-pink-500 font-semibold"
                    onPress={() => navigation.navigate('TermsPrivacyAuthScreen', { type: 'terms' })}
                  >
                    Terms of Use
                  </Text>
                </Text>
              }
              containerClassName="mb-3"
            />

            <Checkbox
              checked={registerAsVendor}
              onChange={handleVendorCheckboxPress}
              disabled={loading}
              label="Register as Vendor"
            />
          </View>

          {/* Create Account Button */}
          <Button
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            containerClassName="mb-6"
          >
            Create Account
          </Button>


          {/* Login Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-base text-gray-700">Already have an account? </Text>
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text className="text-base text-pink-600 font-bold">Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Code Picker Modal */}
      <CountryCodePicker
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={setCountryCode}
        selectedCode={countryCode}
      />
    </View>
  );
};

export default RegisterScreen;