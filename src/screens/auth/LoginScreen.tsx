import React, { useState } from 'react';
import { View, Text, Alert, Image, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { loginUser } from '@/utils/authHelper';
import { Input, PasswordInput, Button, SocialLoginFullButton } from '@/components/ui/forms';
type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState({
    email: '',
    password: ''
  });
  const validateForm = () => {
    let valid = true;
    const newErrors = {
      email: '',
      password: ''
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
    try {
      const result = await loginUser(email, password);
      console.log('Login result:', result);
      if (result.success) {
        console.log('✅ Login successful! Auth state updated.');
      } else {
        const errorMessage = result.error || 'Invalid credentials. Please try again.';
        setGeneralError(errorMessage);
        if (errorMessage.toLowerCase().includes('email')) {
          setErrors(prev => ({
            ...prev,
            email: 'Please check your email address'
          }));
        } else if (errorMessage.toLowerCase().includes('password')) {
          setErrors(prev => ({
            ...prev,
            password: 'Please check your password'
          }));
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };
  const handleRegister = () => {
    navigation.navigate('Register');
  };
  return <View className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40
      }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {}
          <View className="items-center mb-10">
            <Image source={require('@/assets/logo.png')} className="w-32 h-20" resizeMode="contain" />
          </View>

          {}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-center text-black mb-2">
              Welcome Back
            </Text>
            <Text className="text-base text-center text-gray-700">
              Sign in to continue your journey
            </Text>
          </View>

          {}
          {generalError ? <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex-row items-start">
              <Ionicons name="alert-circle" size={20} color="#DC2626" style={{
            marginRight: 8,
            marginTop: 2
          }} />
              <Text className="text-red-600 text-sm flex-1">{generalError}</Text>
            </View> : null}

          {}
          <Input label="Enter E-mail Address" placeholder="" value={email} onChangeText={text => {
          setEmail(text);
          setErrors({
            ...errors,
            email: ''
          });
          setGeneralError('');
        }} error={errors.email} autoCapitalize="none" keyboardType="email-address" editable={!loading} />

          {}
          <PasswordInput label="Password" placeholder="" value={password} onChangeText={text => {
          setPassword(text);
          setErrors({
            ...errors,
            password: ''
          });
          setGeneralError('');
        }} error={errors.password} editable={!loading} containerClassName="mb-2" />

          {}
          <View className="flex-row justify-end mb-6">
            <TouchableOpacity onPress={handleForgotPassword} disabled={loading} activeOpacity={0.7}>
              <Text className="text-sm text-pink-600 font-semibold">Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {}
          <Button onPress={handleLogin} loading={loading} disabled={loading} containerClassName="mb-6">
            Login
          </Button>

          {}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-pink-200" />
            <Text className="px-4 text-sm text-gray-700">or continue with</Text>
            <View className="flex-1 h-px bg-pink-200" />
          </View>

          {}
          <View className="gap-3 mb-8">
            <SocialLoginFullButton platform="google" />
            <SocialLoginFullButton platform="facebook" />
            <SocialLoginFullButton platform="apple" />
          </View>

          {}
          <View className="flex-row justify-center items-center">
            <Text className="text-base text-gray-700">Don`t have an account? </Text>
            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.7}>
              <Text className="text-base text-pink-600 font-bold">Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>;
};
export default LoginScreen;