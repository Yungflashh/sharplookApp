import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { loginUser } from '@/utils/authHelper';
import { Input, PasswordInput, Button, SocialLoginButton } from '@/components/ui/forms';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  // Check if device is a tablet (iPad)
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      email: '',
      password: '',
    };

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

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    let shouldResetLoading = true;

    try {
      const result = await loginUser(email, password);
      console.log('Login result:', result);

      if (result.success) {
        console.log('✅ Login successful! Auth state updated.');
        shouldResetLoading = false; // Don't reset if navigating away
      } else {
        const errorMessage = result.error || 'Invalid credentials. Please try again.';

        // Check for verification required first (more specific)
        if (errorMessage.toLowerCase().includes('verify')) {
          shouldResetLoading = false; // Don't reset if navigating away
          setLoading(false); // Reset before navigation
          // Navigate to OTP verification screen
          navigation.navigate('VerifyOtp', { email });
          return; // Exit early, don't show error
        }
        
        setGeneralError(errorMessage);
        
        if (errorMessage.toLowerCase().includes('email') && !errorMessage.toLowerCase().includes('verify')) {
          setErrors((prev) => ({
            ...prev,
            email: 'Please check your email address',
          }));
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      if (shouldResetLoading) {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: isTablet ? 80 : 24,
            paddingTop: isTablet ? 80 : 60,
            paddingBottom: 40,
            justifyContent: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Content Container - Centered on iPad */}
          <View style={{ maxWidth: isTablet ? 500 : undefined, alignSelf: 'center', width: '100%' }}>
            {/* Logo */}
            <View className="items-center mb-10">
              <Image
                source={require('@/assets/app-icon.png')}
                className="w-32 h-20"
                resizeMode="contain"
              />
            </View>

            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-center text-black mb-2">
                Welcome Back
              </Text>
              <Text className="text-base text-center text-gray-700">
                Sign in to continue your journey
              </Text>
            </View>

            {/* General Error */}
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
              textContentType="emailAddress"
              autoComplete="email"
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
              containerClassName="mb-2"
              textContentType="password"
              autoComplete="password"
            />

            {/* Forgot Password */}
            <View className="flex-row justify-end mb-6">
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text className="text-sm text-pink-600 font-semibold">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <Button
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              containerClassName="mb-6"
            >
              Login
            </Button>

            {/* Register Link */}
            <View className="flex-row justify-center items-center">
              <Text className="text-base text-gray-700">Don`t have an account? </Text>
              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text className="text-base text-pink-600 font-bold">Register Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;