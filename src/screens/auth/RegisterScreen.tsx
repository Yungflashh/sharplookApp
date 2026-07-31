import React, { useState, useEffect } from 'react';
import {
  View, TouchableOpacity, Text, Image, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError, referralAPI } from '@/api/api';
import { Checkbox, CountryCodePicker } from '@/components/ui/forms';
import { COUNTRIES } from '@/components/ui/forms/countryData';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import LocationPicker from './components/LocationPicker';
import { isValidPhoneNumber } from 'libphonenumber-js';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
type RegisterScreenRouteProp = RouteProp<AuthStackParamList, 'Register'>;

const PRIMARY = '#E04079';
const BG      = '#FCE4EC';
const WHITE   = '#FFFFFF';
const TEXT    = '#1A1A2E';
const GRAY    = '#6B7280';
const MUTED   = '#9CA3AF';
const BORDER  = '#F3E6EC';

interface LocationData {
  type: 'Point';
  coordinates: [number, number];
  address: string;
  city: string;
  state: string;
  country: string;
}

const getCountryFlag = (code: string) => {
  const country = COUNTRIES.find(c => c.code === code);
  return country ? country.flag : '🌍';
};

// Strip a leading trunk-prefix "0" (e.g. "08123456789" -> "8123456789") since most
// countries' local-format numbers include it but international (E.164) format doesn't.
const getNationalNumber = (raw: string) => raw.replace(/[\s\-\(\)]/g, '').replace(/^0+/, '');

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const route = useRoute<RegisterScreenRouteProp>();
  const [asVendor, setAsVendor] = useState(route.params?.asVendor ?? false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+234');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [hearAboutUs, setHearAboutUs] = useState('');
  const [showHearAboutUsDropdown, setShowHearAboutUsDropdown] = useState(false);

  const [referralId, setReferralId] = useState('');
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null);
  const [referralCodeChecking, setReferralCodeChecking] = useState(false);
  const [referralCodeError, setReferralCodeError] = useState('');
  const [referrerName, setReferrerName] = useState('');

  const [location, setLocation] = useState<LocationData | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [autoSubmitAfterLocation, setAutoSubmitAfterLocation] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

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
  const handleLocationSelected = (loc: { coordinates: number[]; address: string; city?: string; state?: string; country?: string }) => {
    const locationData: LocationData = {
      type: 'Point',
      coordinates: [loc.coordinates[0], loc.coordinates[1]],
      address: loc.address,
      city: loc.city || '',
      state: loc.state || '',
      country: loc.country || '',
    };
    setLocation(locationData);
    if (autoSubmitAfterLocation) {
      setAutoSubmitAfterLocation(false);
      proceedWithRegistration();
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
      terms: '',
      hearAboutUs: ''
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
    } else if (!isValidPhoneNumber(`${countryCode}${getNationalNumber(phone)}`)) {
      newErrors.phone = 'Please enter a valid phone number for the selected country';
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

    if (!hearAboutUs) {
      newErrors.hearAboutUs = 'Please tell us how you heard about us';
      valid = false;
    }

    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleRegister = async () => {
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    if (!location) {
      setConfirmModal({
        visible: true,
        title: 'Add Location?',
        message: 'Would you like to add your location? This will help us provide better services. Press confirm to add location, or cancel to skip.',
        onConfirm: () => {
          setAutoSubmitAfterLocation(true);
          setShowLocationPicker(true);
        },
      });
      return;
    }

    await proceedWithRegistration();
  };

  const proceedWithRegistration = async () => {
    setLoading(true);

    try {
      const registerData: any = {
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        phone: `${countryCode}${getNationalNumber(phone)}`,
        password: password,
        confirmPassword: confirmPassword,
        hearAboutUs: hearAboutUs,
        isVendor: asVendor,
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
        const successMessage = asVendor
          ? 'Account created successfully! Please log in to complete your vendor profile.'
          : referralCodeValid === true
            ? `Account created successfully! You've been referred by ${referrerName}. Complete your first booking to unlock your rewards!`
            : 'Account created successfully!';

        toast.success('Success', successMessage);
        navigation.navigate('Login');
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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={20} color={PRIMARY} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require('@/assets/app-icon.png')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            {asVendor ? (
              <View style={styles.vendorBadge}>
                <Ionicons name="storefront-outline" size={13} color={PRIMARY} />
                <Text style={styles.vendorBadgeText}>Vendor Sign Up</Text>
              </View>
            ) : null}
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {asVendor ? 'Please fill your details below to register as a vendor' : 'Please fill your details below'}
            </Text>
            <TouchableOpacity onPress={() => setAsVendor((v) => !v)} activeOpacity={0.7} style={styles.modeSwitch}>
              <Ionicons name="swap-horizontal" size={14} color={PRIMARY} />
              <Text style={styles.modeSwitchText}>
                {asVendor ? 'Switch to customer sign up' : 'Sign up as a vendor instead'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* General Error Message */}
          {generalError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          {/* First / Last Name */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <View style={[styles.inputRow, errors.firstName ? styles.inputRowError : null]}>
                <Ionicons name="person-outline" size={18} color={MUTED} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="John"
                  placeholderTextColor={MUTED}
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    setErrors({ ...errors, firstName: '' });
                    setGeneralError('');
                  }}
                  editable={!loading}
                />
              </View>
              {errors.firstName ? <Text style={styles.fieldError}>{errors.firstName}</Text> : null}
            </View>

            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <View style={[styles.inputRow, errors.lastName ? styles.inputRowError : null]}>
                <Ionicons name="person-outline" size={18} color={MUTED} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Doe"
                  placeholderTextColor={MUTED}
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    setErrors({ ...errors, lastName: '' });
                    setGeneralError('');
                  }}
                  editable={!loading}
                />
              </View>
              {errors.lastName ? <Text style={styles.fieldError}>{errors.lastName}</Text> : null}
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.inputRow, errors.email ? styles.inputRowError : null]}>
              <Ionicons name="mail-outline" size={18} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="example@gmail.com"
                placeholderTextColor={MUTED}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors({ ...errors, email: '' });
                  setGeneralError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          {/* Phone */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.phonePill}
                onPress={() => setShowCountryPicker(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.phoneFlag}>{getCountryFlag(countryCode)}</Text>
                <Text style={styles.phoneCode}>{countryCode}</Text>
                <Ionicons name="chevron-down" size={14} color={MUTED} />
              </TouchableOpacity>

              <View style={[styles.inputRow, styles.phoneBox, errors.phone ? styles.inputRowError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="Your number"
                  placeholderTextColor={MUTED}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text.replace(/[^0-9]/g, ''));
                    setErrors({ ...errors, phone: '' });
                    setGeneralError('');
                  }}
                  keyboardType="phone-pad"
                  maxLength={14}
                  editable={!loading}
                />
              </View>
            </View>
            {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.inputRow, errors.password ? styles.inputRowError : null]}>
              <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={MUTED}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors({ ...errors, password: '' });
                  setGeneralError('');
                }}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={19} color={PRIMARY} />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <View style={[styles.inputRow, errors.confirmPassword ? styles.inputRowError : null]}>
              <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor={MUTED}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors({ ...errors, confirmPassword: '' });
                  setGeneralError('');
                }}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={19} color={PRIMARY} />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
          </View>

          {/* Location Section */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Location (required)
            </Text>

            {location ? (
              <View className="bg-white border border-pink-200 rounded-xl p-4 mb-2">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={20} color="#E04079" />
                    <Text className="text-gray-900 font-semibold ml-2">Location Added</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowLocationPicker(true)} disabled={loading} activeOpacity={0.7}>
                    <Text className="text-pink-600 text-xs font-semibold">Adjust on Map</Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-500 text-xs mb-1">Address</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 mb-2"
                  value={location.address}
                  onChangeText={(text) => setLocation({ ...location, address: text })}
                  placeholder="Enter your address"
                  editable={!loading}
                />
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs mb-1">City</Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                      value={location.city}
                      onChangeText={(text) => setLocation({ ...location, city: text })}
                      placeholder="City"
                      editable={!loading}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs mb-1">State</Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800"
                      value={location.state}
                      onChangeText={(text) => setLocation({ ...location, state: text })}
                      placeholder="State"
                      editable={!loading}
                    />
                  </View>
                </View>
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
                onPress={() => setShowLocationPicker(true)}
                disabled={loading}
                className={`bg-pink-50 border border-pink-200 rounded-xl p-4 flex-row items-center justify-center ${
                  loading ? 'opacity-50' : ''
                }`}
                activeOpacity={0.7}
              >
                <Ionicons name="map-outline" size={20} color="#EC4899" />
                <Text className="text-pink-600 font-semibold ml-2">Pick Location on Map</Text>
              </TouchableOpacity>
            )}

            <Text className="text-gray-500 text-xs mt-2">
              Adding your location helps us provide better services and find vendors near you.
            </Text>
          </View>

          {/* How Did You Hear About Us Section */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              How did you hear about us? <Text className="text-red-500">*</Text>
            </Text>

            <TouchableOpacity
              onPress={() => setShowHearAboutUsDropdown(!showHearAboutUsDropdown)}
              disabled={loading}
              className={`flex-row items-center justify-between bg-white border rounded-xl px-4 py-3.5 ${
                errors.hearAboutUs ? 'border-red-500' : hearAboutUs ? 'border-pink-500' : 'border-gray-300'
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center flex-1">
                <Ionicons
                  name="megaphone-outline"
                  size={20}
                  color={hearAboutUs ? '#EC4899' : '#9CA3AF'}
                />
                <Text className={`ml-3 text-base ${hearAboutUs ? 'text-gray-900' : 'text-gray-400'}`}>
                  {hearAboutUs
                    ? [
                        { value: 'instagram', label: 'Instagram' },
                        { value: 'facebook', label: 'Facebook' },
                        { value: 'tiktok', label: 'TikTok' },
                        { value: 'twitter', label: 'Twitter / X' },
                        { value: 'youtube', label: 'YouTube' },
                        { value: 'linkedin', label: 'LinkedIn' },
                        { value: 'whatsapp', label: 'WhatsApp' },
                        { value: 'google_search', label: 'Google Search' },
                        { value: 'friend_family', label: 'Friend / Family' },
                        { value: 'referral', label: 'Referral' },
                        { value: 'blog_article', label: 'Blog / Article' },
                        { value: 'other', label: 'Other' },
                      ].find((o) => o.value === hearAboutUs)?.label
                    : 'Select an option'}
                </Text>
              </View>
              <Ionicons
                name={showHearAboutUsDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {showHearAboutUsDropdown && (
              <View className="bg-white border border-gray-200 rounded-xl mt-1 overflow-hidden" style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                {[
                  { value: 'instagram', label: 'Instagram', icon: 'logo-instagram' },
                  { value: 'facebook', label: 'Facebook', icon: 'logo-facebook' },
                  { value: 'tiktok', label: 'TikTok', icon: 'logo-tiktok' },
                  { value: 'twitter', label: 'Twitter / X', icon: 'logo-twitter' },
                  { value: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
                  { value: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin' },
                  { value: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
                  { value: 'google_search', label: 'Google Search', icon: 'search-outline' },
                  { value: 'friend_family', label: 'Friend / Family', icon: 'people-outline' },
                  { value: 'referral', label: 'Referral', icon: 'gift-outline' },
                  { value: 'blog_article', label: 'Blog / Article', icon: 'newspaper-outline' },
                  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
                ].map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setHearAboutUs(option.value);
                      setShowHearAboutUsDropdown(false);
                      setErrors({ ...errors, hearAboutUs: '' });
                      setGeneralError('');
                    }}
                    className={`flex-row items-center px-4 py-3 ${
                      hearAboutUs === option.value ? 'bg-pink-50' : ''
                    } ${index < 11 ? 'border-b border-gray-100' : ''}`}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={hearAboutUs === option.value ? '#EC4899' : '#6B7280'}
                    />
                    <Text
                      className={`ml-3 text-base ${
                        hearAboutUs === option.value ? 'text-pink-600 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </Text>
                    {hearAboutUs === option.value && (
                      <Ionicons name="checkmark" size={20} color="#EC4899" style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {errors.hearAboutUs ? (
              <View className="flex-row items-center mt-2">
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text className="text-red-600 text-xs ml-1">{errors.hearAboutUs}</Text>
              </View>
            ) : null}
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

          {/* Terms Checkbox */}
          <View style={{ marginBottom: 22 }}>
            <Checkbox
              checked={agreeToTerms}
              onChange={setAgreeToTerms}
              disabled={loading}
              error={errors.terms}
              label={
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => navigation.navigate('TermsPrivacyAuthScreen', { type: 'terms', onAccept: () => setAgreeToTerms(true) })}
                  >
                    Terms & Condition
                  </Text>
                  {' '}and{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => navigation.navigate('TermsPrivacyAuthScreen', { type: 'privacy', onAccept: () => setAgreeToTerms(true) })}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              }
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="chevron-forward" size={18} color={WHITE} style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have any account? </Text>
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Log In</Text>
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

      {/* Live Map Location Picker */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => {
          setShowLocationPicker(false);
          setAutoSubmitAfterLocation(false);
        }}
        onSelectLocation={handleLocationSelected}
        currentLocation={location ? {
          coordinates: location.coordinates,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
        } : null}
      />

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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FCE4EC', alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 4,
  },
  logoWrap: { alignItems: 'center', marginTop: 4, marginBottom: 16 },
  logo: { width: 84, height: 84, borderRadius: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  vendorBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  vendorBadgeText: { fontSize: 12, fontWeight: '700', color: PRIMARY, marginLeft: 5 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: GRAY, marginTop: 4, textAlign: 'center', paddingHorizontal: 12 },
  modeSwitch: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  modeSwitchText: { fontSize: 12.5, fontWeight: '600', color: PRIMARY, marginLeft: 5, textDecorationLine: 'underline' },
  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 14, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  errorBannerText: { color: '#DC2626', fontSize: 13, flex: 1 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 7 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 52,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  inputRowError: { borderColor: PRIMARY },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: TEXT, height: '100%', padding: 0 },
  fieldError: { color: PRIMARY, fontSize: 12, marginTop: 5, marginLeft: 2 },
  phoneRow: { flexDirection: 'row', gap: 10 },
  phonePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 12, height: 52,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  phoneFlag: { fontSize: 18, marginRight: 6 },
  phoneCode: { fontSize: 14, color: TEXT, marginRight: 4, fontWeight: '600' },
  phoneBox: { flex: 1 },
  termsText: { fontSize: 13, color: '#374151', flexShrink: 1 },
  termsLink: { color: PRIMARY, fontWeight: '700' },
  continueBtn: {
    backgroundColor: PRIMARY, borderRadius: 999, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  continueBtnDisabled: { opacity: 0.7 },
  continueBtnText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  footerRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  footerText: { fontSize: 14, color: GRAY },
  footerLink: { fontSize: 14, color: PRIMARY, fontWeight: '700' },
});

export default RegisterScreen;
