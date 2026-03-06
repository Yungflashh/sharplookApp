import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError } from '@/api/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

const OTP_LENGTH = 6;

const VerifyOtpScreen = ({ route, navigation }: Props) => {
  const email = route.params?.email || '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Resend timer effect
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Auto-verify when OTP is complete
  useEffect(() => {
    const otpValue = otp.join('');
    if (otpValue.length === OTP_LENGTH && !loading && !success) {
      handleVerify(otpValue);
    }
  }, [otp]);

  const handleOtpChange = (value: string, index: number) => {
    setError('');
    setSuccess('');

    // Only allow numeric input
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    const newOtp = [...otp];

    // Handle paste (multiple characters)
    if (value.length > 1) {
      const pastedValues = value.slice(0, OTP_LENGTH - index).split('');
      pastedValues.forEach((char, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);

      const nextIndex = Math.min(index + pastedValues.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single character input
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleVerify = async (otpValue: string) => {
    if (otpValue.length !== OTP_LENGTH) {
      setError('Please enter the complete verification code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Call the actual API
      await authAPI.verifyEmail(otpValue);

      // Show success message
      setLoading(false);
      setSuccess('Email verified successfully! Redirecting to login...');

      // Wait 2 seconds before navigating
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Login',
              params: {
                message: 'Email verified successfully! Please login to continue.',
              },
            },
          ],
        });
      }, 2000);
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Invalid verification code. Please try again.');
      setLoading(false);
      
      // Clear OTP on error so user can retry after 2 seconds
      setTimeout(() => {
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }, 2000);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(60);
    setError('');

    try {
      // Resend verification email
      await authAPI.forgotPassword(email);
      // Note: Using forgotPassword as a placeholder - 
      // You may need a dedicated resendVerificationEmail endpoint
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Failed to resend code. Please try again.');
      setCanResend(true);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : 'your email';

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
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={handleGoBack}
            className="flex-row items-center mb-8"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#db2777" />
            <Text className="text-pink-600 font-semibold ml-2">Back</Text>
          </TouchableOpacity>

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
              Verify Your Email
            </Text>
            <Text className="text-base text-center text-gray-700">
              We've sent a verification code to
            </Text>
            <Text className="text-base text-center text-pink-600 font-semibold mt-1">
              {maskedEmail}
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex-row items-start">
              <Ionicons
                name="alert-circle"
                size={20}
                color="#DC2626"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text className="text-red-600 text-sm flex-1">{error}</Text>
            </View>
          ) : null}

          {/* Success Message */}
          {success ? (
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex-row items-start">
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#16a34a"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text className="text-green-600 text-sm flex-1">{success}</Text>
            </View>
          ) : null}

          {/* OTP Inputs */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Enter Verification Code
            </Text>
            <View className="flex-row justify-between">
              {Array(OTP_LENGTH)
                .fill(0)
                .map((_, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    className={`w-12 h-14 border-2 rounded-xl text-center text-xl font-bold ${
                      otp[index]
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 bg-gray-50'
                    } ${error ? 'border-red-300' : ''}`}
                    value={otp[index]}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? OTP_LENGTH : 1}
                    editable={!loading && !success}
                    selectTextOnFocus
                  />
                ))}
            </View>
          </View>

          {/* Loading Indicator */}
          {loading && (
            <View className="flex-row justify-center items-center mb-6">
              <ActivityIndicator size="small" color="#db2777" />
              <Text className="text-pink-600 font-medium ml-2">
                Verifying...
              </Text>
            </View>
          )}

          {/* Resend Timer */}
          <View className="flex-row justify-center items-center mb-8">
            {canResend ? (
              <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                <Text className="text-pink-600 font-semibold">Resend Code</Text>
              </TouchableOpacity>
            ) : (
              <Text className="text-gray-500">
                Resend code in{' '}
                <Text className="text-pink-600 font-semibold">
                  {resendTimer}s
                </Text>
              </Text>
            )}
          </View>

          {/* Help Text */}
          <View className="bg-pink-50 border border-pink-100 rounded-xl p-4">
            <View className="flex-row items-start">
              <Ionicons
                name="information-circle"
                size={20}
                color="#db2777"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text className="text-gray-700 text-sm">
                  Didn't receive the code? Check your spam folder or make sure
                  you entered the correct email address.
                </Text>
              </View>
            </View>
          </View>

          {/* Change Email Link */}
          <View className="flex-row justify-center items-center mt-8">
            <Text className="text-base text-gray-700">Wrong email? </Text>
            <TouchableOpacity
              onPress={handleGoBack}
              disabled={loading || !!success}
              activeOpacity={0.7}
            >
              <Text className="text-base text-pink-600 font-bold">
                Change it
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default VerifyOtpScreen;