import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    if (!validateEmail()) return;
    setLoading(true);
    try {
      setTimeout(() => {
        setLoading(false);
        navigation.navigate('Auth', {
          screen: 'Verification',
          params: {
            email
          }
        });
      }, 1500);
    } catch (error) {
      console.error('Forgot password error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    }
  };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 20
    }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {}
        <View className="flex-row items-center mb-8">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-black">Forgot password</Text>
        </View>

        {}
        <Text className="text-base font-medium text-black mb-2">
          Please fill your email address below
        </Text>
        <Text className="text-sm text-gray-600 mb-8">
          We will send you a code to reset your password
        </Text>

        {}
        <View className="mb-6">
          <TextInput className={`w-full px-4 py-4 rounded-lg border ${error ? 'border-pink-500' : 'border-gray-300'} bg-white text-black text-sm`} placeholder="Enter E-mail Address" placeholderTextColor="#9CA3AF" value={email} onChangeText={text => {
          setEmail(text);
          setError('');
        }} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
          {error ? <Text className="text-pink-500 text-xs mt-1.5 ml-1">{error}</Text> : null}
        </View>

        {}
        <View className="flex-1" />

        {}
        <TouchableOpacity className={`rounded-lg py-4 items-center mb-6 ${loading ? 'bg-pink-400' : 'bg-pink-500'}`} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-semibold">Submit</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>;
};
export default ForgotPasswordScreen;