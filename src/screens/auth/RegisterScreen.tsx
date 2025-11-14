import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Alert, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError } from '@/api/api';
import { Input, PasswordInput, Button, Checkbox, SocialLoginFullButton, PhoneInput, CountryCodePicker } from '@/components/ui/forms';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

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
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: ''
  });
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
      Alert.alert('Register as Vendor', 'Are you sure you want to register as a vendor? You will need to complete additional profile setup and provide business information.', [{
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {}
      }, {
        text: 'Yes, Continue',
        onPress: () => {
          setRegisterAsVendor(true);
        }
      }]);
    } else {
      setRegisterAsVendor(false);
    }
  };
  const handleRegister = async () => {
    // Clear previous errors
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

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

      if (referralId.trim()) {
        registerData.referralId = referralId.trim();
      }

      console.log(registerData);
      const response = await authAPI.register(registerData);

      if (response.success) {
        if (registerAsVendor) {
          Alert.alert('Success', 'Account created successfully! Please complete your vendor profile.', [{
            text: 'OK',
            onPress: () => navigation.navigate('VendorProfileSetup')
          }]);
        } else {
          Alert.alert('Success', 'Account created successfully!', [{
            text: 'OK',
            onPress: () => navigation.navigate('Login')
          }]);
        }
      } else {
        setGeneralError(response.message || 'Unable to create account. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const apiError = handleAPIError(error);

      // Handle field-specific errors from backend
      if (apiError.fieldErrors) {
        const newErrors = { ...errors };
        Object.keys(apiError.fieldErrors).forEach(field => {
          if (field in newErrors) {
            (newErrors as any)[field] = apiError.fieldErrors![field];
          }
        });
        setErrors(newErrors);
      }

      // Show general error message
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
  return <View className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40
      }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View className="items-center mb-8">
            <Image source={require('@/assets/logo.png')} className="w-28 h-16" resizeMode="contain" />
          </View>

          {/* Header */}
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
              <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
              <Text className="text-red-600 text-sm flex-1">{generalError}</Text>
            </View>
          ) : null}

          {/* Name Inputs */}
          <View className="flex-row gap-3">
            <Input containerClassName="flex-1 mb-0" label="First Name" placeholder="" value={firstName} onChangeText={text => {
            setFirstName(text);
            setErrors({
              ...errors,
              firstName: ''
            });
            setGeneralError('');
          }} error={errors.firstName} editable={!loading} />

            <Input containerClassName="flex-1 mb-0" label="Last Name" placeholder="" value={lastName} onChangeText={text => {
            setLastName(text);
            setErrors({
              ...errors,
              lastName: ''
            });
            setGeneralError('');
          }} error={errors.lastName} editable={!loading} />
          </View>

          {/* Email Input */}
          <Input label="Enter E-mail Address" placeholder="" value={email} onChangeText={text => {
          setEmail(text);
          setErrors({
            ...errors,
            email: ''
          });
          setGeneralError('');
        }} error={errors.email} autoCapitalize="none" keyboardType="email-address" editable={!loading} />

          {/* Phone Input */}
          <PhoneInput label="Enter Phone Number" placeholder="8123456789" value={phone} onChangeText={text => {
          setPhone(text);
          setErrors({
            ...errors,
            phone: ''
          });
          setGeneralError('');
        }} error={errors.phone} editable={!loading} countryCode={countryCode} onCountryCodePress={() => setShowCountryPicker(true)} />

          {/* Password Input */}
          <PasswordInput label="Password" placeholder="" value={password} onChangeText={text => {
          setPassword(text);
          setErrors({
            ...errors,
            password: ''
          });
          setGeneralError('');
        }} error={errors.password} editable={!loading} />

          {/* Confirm Password Input */}
          <PasswordInput label="Confirm Password" placeholder="" value={confirmPassword} onChangeText={text => {
          setConfirmPassword(text);
          setErrors({
            ...errors,
            confirmPassword: ''
          });
          setGeneralError('');
        }} error={errors.confirmPassword} editable={!loading} />

          {/* Referral Input */}
          <Input label="Referral Code (optional)" placeholder="" value={referralId} onChangeText={setReferralId} editable={!loading} />

          {/* Checkboxes */}
          <View className="mb-6">
            <Checkbox checked={agreeToTerms} onChange={setAgreeToTerms} disabled={loading} error={errors.terms} label={<Text className="text-sm text-gray-700 flex-1">
                  By signing up, you agree to our{' '}
                  <Text className="text-pink-500 font-semibold">Privacy Policy</Text> and{' '}
                  <Text className="text-pink-500 font-semibold">Terms of Use</Text>
                </Text>} containerClassName="mb-3" />

            <Checkbox checked={registerAsVendor} onChange={handleVendorCheckboxPress} disabled={loading} label="Register as Vendor" />
          </View>

          {/* Register Button */}
          <Button onPress={handleRegister} loading={loading} disabled={loading} containerClassName="mb-6">
            Create Account
          </Button>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-pink-200" />
            <Text className="px-4 text-sm text-gray-700">or sign up with</Text>
            <View className="flex-1 h-px bg-pink-200" />
          </View>

          {/* Social Login Buttons */}
          <View className="gap-3 mb-8">
            <SocialLoginFullButton platform="google" />
            <SocialLoginFullButton platform="facebook" />
            <SocialLoginFullButton platform="apple" />
          </View>

          {/* Login Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-base text-gray-700">Already have an account? </Text>
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.7}>
              <Text className="text-base text-pink-600 font-bold">Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Code Picker Modal */}
      <CountryCodePicker visible={showCountryPicker} onClose={() => setShowCountryPicker(false)} onSelect={setCountryCode} selectedCode={countryCode} />
    </View>;
};
export default RegisterScreen;