import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, ActivityIndicator, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';
import { loginUser } from '@/utils/authHelper';
import { Ionicons } from '@expo/vector-icons';
type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
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
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 40
    }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {}
        <View className="items-center mb-12">
          <Image source={require('@/assets/logo.png')} className="w-32 h-20" resizeMode="contain" />
        </View>

        {}
        <Text className="text-2xl font-bold text-center text-black mb-2">
          Welcome Back
        </Text>
        <Text className="text-sm text-center text-gray-600 mb-8">
          Please fill the details below
        </Text>

        {}
        <View className="mb-4">
          <TextInput className={`w-full px-4 py-4 rounded-lg border ${errors.email ? 'border-pink-500' : 'border-gray-200'} bg-gray-50 text-black text-sm`} placeholder="Enter E-mail Address" placeholderTextColor="#9CA3AF" value={email} onChangeText={text => {
          setEmail(text);
          setErrors({
            ...errors,
            email: ''
          });
        }} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
          {errors.email ? <Text className="text-pink-500 text-xs mt-1.5 ml-1">{errors.email}</Text> : null}
        </View>

        {}
        <View className="mb-6">
          <View className="relative">
            <TextInput className={`w-full px-4 py-4 pr-12 rounded-lg border ${errors.password ? 'border-pink-500' : 'border-gray-200'} bg-gray-50 text-black text-sm`} placeholder="Enter Password" placeholderTextColor="#9CA3AF" value={password} onChangeText={text => {
            setPassword(text);
            setErrors({
              ...errors,
              password: ''
            });
          }} secureTextEntry={!showPassword} editable={!loading} />
            <TouchableOpacity className="absolute right-4 top-4" onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#eb278d" />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text className="text-pink-500 text-xs mt-1.5 ml-1">{errors.password}</Text> : null}
        </View>

        {}
        <View className="flex-row justify-between items-center mb-8">
          <TouchableOpacity className="flex-row items-center" onPress={() => setRememberMe(!rememberMe)} disabled={loading}>
            <View className={`w-5 h-5 rounded border-2 ${rememberMe ? 'border-pink-500 bg-pink-500' : 'border-pink-500 bg-white'} items-center justify-center mr-2`}>
              {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text className="text-sm text-gray-800">Remember Me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
            <Text className="text-sm text-pink-500 font-medium">Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {}
        <TouchableOpacity className={`rounded-lg py-4 items-center mb-6 ${loading ? 'bg-pink-400' : 'bg-pink-500'}`} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-semibold">Login</Text>}
        </TouchableOpacity>

        {}
        <Text className="text-center text-sm text-gray-600 mb-4">Login with</Text>

        {}
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

        {}
        <View className="flex-row justify-center items-center">
          <Text className="text-sm text-gray-600">Don`t have an account? </Text>
          <TouchableOpacity onPress={handleRegister} disabled={loading}>
            <Text className="text-sm text-pink-500 font-semibold">Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>;
};
export default LoginScreen;