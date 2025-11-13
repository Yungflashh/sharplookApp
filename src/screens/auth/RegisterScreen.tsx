import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralId, setReferralId] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: '',
  });

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: '',
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

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Replace with your actual registration API call
      // const result = await registerUser({ firstName, lastName, email, password, referralId });
      
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        Alert.alert('Success', 'Account created successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Auth', { screen: 'Login' }),
          },
        ]);
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Auth', { screen: 'Login' });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}
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
        <Text className="text-2xl font-bold text-center text-black mb-2">
          Create Your Account
        </Text>
        <Text className="text-sm text-center text-gray-600 mb-6">
          Please fill the details below
        </Text>

        {/* First Name and Last Name Row */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <TextInput
              className={`w-full px-4 py-3.5 rounded-lg border ${
                errors.firstName ? 'border-pink-500' : 'border-gray-200'
              } bg-gray-50 text-black text-sm`}
              placeholder="First Name"
              placeholderTextColor="#9CA3AF"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                setErrors({ ...errors, firstName: '' });
              }}
              editable={!loading}
            />
            {errors.firstName ? (
              <Text className="text-pink-500 text-xs mt-1 ml-1">{errors.firstName}</Text>
            ) : null}
          </View>

          <View className="flex-1">
            <TextInput
              className={`w-full px-4 py-3.5 rounded-lg border ${
                errors.lastName ? 'border-pink-500' : 'border-gray-200'
              } bg-gray-50 text-black text-sm`}
              placeholder="Last Name"
              placeholderTextColor="#9CA3AF"
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                setErrors({ ...errors, lastName: '' });
              }}
              editable={!loading}
            />
            {errors.lastName ? (
              <Text className="text-pink-500 text-xs mt-1 ml-1">{errors.lastName}</Text>
            ) : null}
          </View>
        </View>

        {/* Email Input */}
        <View className="mb-4">
          <TextInput
            className={`w-full px-4 py-3.5 rounded-lg border ${
              errors.email ? 'border-pink-500' : 'border-gray-200'
            } bg-gray-50 text-black text-sm`}
            placeholder="Enter E-mail Address"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: '' });
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
          {errors.email ? (
            <Text className="text-pink-500 text-xs mt-1 ml-1">{errors.email}</Text>
          ) : null}
        </View>

        {/* Create Password Input */}
        <View className="mb-4">
          <View className="relative">
            <TextInput
              className={`w-full px-4 py-3.5 pr-12 rounded-lg border ${
                errors.password ? 'border-pink-500' : 'border-gray-200'
              } bg-gray-50 text-black text-sm`}
              placeholder="Create Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors({ ...errors, password: '' });
              }}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              className="absolute right-4 top-3.5"
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#eb278d" />
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text className="text-pink-500 text-xs mt-1 ml-1">{errors.password}</Text>
          ) : null}
        </View>

        {/* Confirm Password Input */}
        <View className="mb-4">
          <View className="relative">
            <TextInput
              className={`w-full px-4 py-3.5 pr-12 rounded-lg border ${
                errors.confirmPassword ? 'border-pink-500' : 'border-gray-200'
              } bg-gray-50 text-black text-sm`}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrors({ ...errors, confirmPassword: '' });
              }}
              secureTextEntry={!showConfirmPassword}
              editable={!loading}
            />
            <TouchableOpacity
              className="absolute right-4 top-3.5"
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#eb278d" />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text className="text-pink-500 text-xs mt-1 ml-1">{errors.confirmPassword}</Text>
          ) : null}
        </View>

        {/* Referral ID Input (Optional) */}
        <View className="mb-4">
          <TextInput
            className="w-full px-4 py-3.5 rounded-lg border border-gray-200 bg-gray-50 text-black text-sm"
            placeholder="Referral ID(Optional)"
            placeholderTextColor="#9CA3AF"
            value={referralId}
            onChangeText={setReferralId}
            editable={!loading}
          />
        </View>

        {/* Terms and Conditions */}
        <View className="mb-6">
          <TouchableOpacity
            className="flex-row items-start"
            onPress={() => setAgreeToTerms(!agreeToTerms)}
            disabled={loading}
          >
            <View
              className={`w-5 h-5 rounded border-2 my-4 ${
                agreeToTerms ? 'border-pink-500 bg-pink-500' : 'border-pink-500 bg-white'
              } items-center justify-center mr-2`}
            >
              {agreeToTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text className="text-[13px] my-4 text-gray-700 flex-1">
              By signing up, you agree to our{' '}
              <Text className="text-pink-500 font-medium">Privacy Policy</Text> and{' '}
              <Text className="text-pink-500 font-medium">Terms of Use</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms ? (
            <Text className="text-pink-500 text-xs mt-1 ml-1">{errors.terms}</Text>
          ) : null}
        </View>

        {/* Create Account Button */}
        <TouchableOpacity
          className={`rounded-lg py-4 items-center mb-6 ${
            loading ? 'bg-pink-400' : 'bg-pink-500'
          }`}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Sign Up with Text */}
        <Text className="text-center text-sm text-gray-600 mb-4">Sign Up with</Text>

        {/* Social Login Buttons */}
        <View className="flex-row justify-center items-center gap-6 mb-6">
          <TouchableOpacity className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center">
            <Ionicons name="call" size={24} color="#000" />
          </TouchableOpacity>
          
          <TouchableOpacity className="w-12 h-12 rounded-full bg-blue-600 items-center justify-center">
            <Ionicons name="logo-facebook" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity className="w-12 h-12 rounded-full bg-blue-400 items-center justify-center">
            <Ionicons name="logo-twitter" size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity className="w-12 h-12 rounded-full bg-black items-center justify-center">
            <Ionicons name="logo-apple" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View className="flex-row justify-center items-center">
          <Text className="text-sm text-gray-600">Already have an account? </Text>
          <TouchableOpacity onPress={handleLogin} disabled={loading}>
            <Text className="text-sm text-pink-500 font-semibold">Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;