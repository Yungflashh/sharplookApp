import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { userAPI, handleAPIError } from '@/api/api';

const SetWithdrawalPinScreen: React.FC = () => {
  const navigation = useNavigation();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleSetPin = async () => {
    
    if (!pin || !confirmPin) {
      Alert.alert('Error', 'Please enter and confirm your PIN');
      return;
    }

    if (pin.length !== 4) {
      Alert.alert('Error', 'PIN must be exactly 4 digits');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      Alert.alert('Error', 'PIN must contain only numbers');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match. Please try again.');
      return;
    }

    
    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (weakPins.includes(pin)) {
      Alert.alert(
        'Weak PIN',
        'This PIN is too common. Please choose a more secure PIN.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      await userAPI.setWithdrawalPin(pin, confirmPin);
      
      Alert.alert(
        'Success',
        'Your withdrawal PIN has been set successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              
              navigation.goBack();
              
              
            },
          },
        ]
      );
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPinDots = (value: string, maxLength: number = 4) => {
    return (
      <View className="flex-row justify-center space-x-4">
        {[...Array(maxLength)].map((_, index) => (
          <View
            key={index}
            className={`w-14 h-14 rounded-2xl border-2 items-center justify-center ${
              index < value.length 
                ? 'bg-pink-50 border-pink-500' 
                : 'bg-gray-50 border-gray-300'
            }`}
          >
            {index < value.length && (
              <View className="w-3 h-3 rounded-full bg-pink-500" />
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">
              Set Withdrawal PIN
            </Text>
            <View className="w-10" />
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View className="flex-1 px-6 pt-8">
            {/* Icon and Title */}
            <View className="items-center mb-10">
              <LinearGradient
                colors={['#eb278d', '#f472b6']}
                className="w-24 h-24 rounded-3xl items-center justify-center mb-5"
                style={{
                  shadowColor: '#eb278d',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Ionicons name="lock-closed" size={44} color="#fff" />
              </LinearGradient>
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                Create Your PIN
              </Text>
              <Text className="text-sm text-gray-500 text-center px-4 leading-6">
                Set up a secure 4-digit PIN to protect your wallet transactions
              </Text>
            </View>

            {/* Enter PIN */}
            <View className="mb-8">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Enter PIN
              </Text>
              <View 
                className="bg-gray-50 rounded-3xl p-6 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {showPin ? (
                  <TextInput
                    className="text-center text-3xl tracking-[20px] text-gray-900 font-bold"
                    placeholder="0000"
                    placeholderTextColor="#d1d5db"
                    keyboardType="numeric"
                    maxLength={4}
                    value={pin}
                    onChangeText={setPin}
                    secureTextEntry={false}
                  />
                ) : (
                  <View className="relative">
                    {renderPinDots(pin)}
                    <TextInput
                      className="opacity-0 absolute inset-0"
                      keyboardType="numeric"
                      maxLength={4}
                      value={pin}
                      onChangeText={setPin}
                      secureTextEntry={false}
                      autoFocus
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Confirm PIN */}
            <View className="mb-6">
              <Text className="text-base font-bold text-gray-900 mb-4">
                Confirm PIN
              </Text>
              <View 
                className="bg-gray-50 rounded-3xl p-6 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {showPin ? (
                  <TextInput
                    className="text-center text-3xl tracking-[20px] text-gray-900 font-bold"
                    placeholder="0000"
                    placeholderTextColor="#d1d5db"
                    keyboardType="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    secureTextEntry={false}
                  />
                ) : (
                  <View className="relative">
                    {renderPinDots(confirmPin)}
                    <TextInput
                      className="opacity-0 absolute inset-0"
                      keyboardType="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChangeText={setConfirmPin}
                      secureTextEntry={false}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Show/Hide PIN Toggle */}
            <TouchableOpacity
              onPress={() => setShowPin(!showPin)}
              className="flex-row items-center justify-center py-3 mb-6"
              activeOpacity={0.7}
            >
              <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2">
                <Ionicons
                  name={showPin ? 'eye-off' : 'eye'}
                  size={18}
                  color="#6b7280"
                />
              </View>
              <Text className="text-sm font-semibold text-gray-700">
                {showPin ? 'Hide PIN' : 'Show PIN'}
              </Text>
            </TouchableOpacity>

            {/* Security Tips */}
            <View className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 mb-8 border border-blue-100">
              <View className="flex-row items-start mb-3">
                <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Ionicons name="shield-checkmark" size={18} color="#3b82f6" />
                </View>
                <Text className="flex-1 text-sm font-bold text-blue-900">
                  Security Tips
                </Text>
              </View>
              <View className="ml-11">
                <View className="flex-row items-start mb-2">
                  <View className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 mr-2" />
                  <Text className="flex-1 text-xs text-blue-700 leading-5">
                    Use a unique 4-digit PIN
                  </Text>
                </View>
                <View className="flex-row items-start mb-2">
                  <View className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 mr-2" />
                  <Text className="flex-1 text-xs text-blue-700 leading-5">
                    Avoid common patterns like 1234 or 0000
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <View className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 mr-2" />
                  <Text className="flex-1 text-xs text-blue-700 leading-5">
                    Never share your PIN with anyone
                  </Text>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSetPin}
              disabled={loading || !pin || !confirmPin}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  loading || !pin || !confirmPin
                    ? ['#d1d5db', '#9ca3af']
                    : ['#eb278d', '#f472b6']
                }
                className="rounded-2xl py-5 items-center justify-center"
                style={{
                  shadowColor: loading || !pin || !confirmPin ? '#000' : '#eb278d',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: loading || !pin || !confirmPin ? 0.1 : 0.3,
                  shadowRadius: 8,
                  elevation: loading || !pin || !confirmPin ? 2 : 6,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white text-base font-bold">
                    Set PIN
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SetWithdrawalPinScreen;