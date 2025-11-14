import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { authAPI, handleAPIError } from '@/api/api';
import { Input, Button } from '@/components/ui/forms';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const validateEmail = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    return true;
  };
  const handleSubmit = async () => {
    // Clear previous errors and messages
    setGeneralError('');
    setSuccessMessage('');

    if (!validateEmail()) return;

    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(email.trim().toLowerCase());

      if (response.success) {
        setSuccessMessage('Password reset code has been sent to your email. Please check your inbox.');

        // Navigate to verification screen after a short delay
        setTimeout(() => {
          navigation.navigate('Auth', {
            screen: 'Verification',
            params: {
              email: email.trim().toLowerCase()
            }
          });
        }, 2000);
      } else {
        setGeneralError(response.message || 'Failed to send reset code. Please try again.');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const apiError = handleAPIError(error);

      // Handle field-specific errors
      if (apiError.fieldErrors?.email) {
        setError(apiError.fieldErrors.email);
      }

      // Show general error message
      if (apiError.isNetworkError) {
        setGeneralError('Network error. Please check your internet connection and try again.');
      } else {
        setGeneralError(apiError.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  return <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 40
      }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header with Back Button */}
          <View className="flex-row items-center mb-10">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 bg-white p-2 rounded-full" activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-black">Forgot password</Text>
          </View>

          {/* Icon/Illustration */}
          <View className="items-center mb-8">
            <View className="bg-white p-6 rounded-full mb-4">
              <Ionicons name="lock-closed" size={48} color="#ec4899" />
            </View>
            <Text className="text-2xl font-bold text-black mb-2 text-center">
              Reset Your Password
            </Text>
            <Text className="text-base text-gray-700 text-center px-4">
              Please fill your email address below
            </Text>
            <Text className="text-sm text-gray-600 text-center px-4 mt-1">
              We will send you a code to reset your password
            </Text>
          </View>

          {/* Success Message */}
          {successMessage ? (
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex-row items-start">
              <Ionicons name="checkmark-circle" size={20} color="#16A34A" style={{ marginRight: 8, marginTop: 2 }} />
              <Text className="text-green-600 text-sm flex-1">{successMessage}</Text>
            </View>
          ) : null}

          {/* General Error Message */}
          {generalError ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex-row items-start">
              <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8, marginTop: 2 }} />
              <Text className="text-red-600 text-sm flex-1">{generalError}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <Input label="Enter E-mail Address" placeholder="" value={email} onChangeText={text => {
          setEmail(text);
          setError('');
          setGeneralError('');
          setSuccessMessage('');
        }} error={error} autoCapitalize="none" keyboardType="email-address" editable={!loading} />

          {/* Spacer */}
          <View className="flex-1" />

          {/* Submit Button */}
          <Button onPress={handleSubmit} loading={loading} disabled={loading} containerClassName="mb-6">
            Submit
          </Button>

          {/* Back to Login */}
          <View className="flex-row justify-center items-center mb-4">
            <Text className="text-base text-gray-700">Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading} activeOpacity={0.7}>
              <Text className="text-base text-pink-600 font-bold">Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>;
};
export default ForgotPasswordScreen;