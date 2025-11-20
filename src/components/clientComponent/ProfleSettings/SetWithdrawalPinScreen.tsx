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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
      <View className="flex-row justify-center space-x-3 mb-2">
        {[...Array(maxLength)].map((_, index) => (
          <View
            key={index}
            className={`w-4 h-4 rounded-full ${
              index < value.length ? 'bg-pink-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Set Withdrawal PIN
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-5 pt-8">
          {}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-pink-100 items-center justify-center mb-4">
              <Ionicons name="keypad" size={40} color="#eb278d" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              Create Withdrawal PIN
            </Text>
            <Text className="text-sm text-gray-500 text-center px-8">
              This PIN will be required for all wallet withdrawals and transactions
            </Text>
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Enter PIN
            </Text>
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              {showPin ? (
                <TextInput
                  className="text-center text-2xl tracking-widest text-gray-900 font-semibold"
                  placeholder="••••"
                  keyboardType="numeric"
                  maxLength={4}
                  value={pin}
                  onChangeText={setPin}
                  secureTextEntry={!showPin}
                />
              ) : (
                <>
                  {renderPinDots(pin)}
                  <TextInput
                    className="text-center text-2xl tracking-widest text-gray-900 font-semibold opacity-0 absolute"
                    placeholder="••••"
                    keyboardType="numeric"
                    maxLength={4}
                    value={pin}
                    onChangeText={setPin}
                    secureTextEntry={false}
                  />
                </>
              )}
            </View>
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Confirm PIN
            </Text>
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              {showPin ? (
                <TextInput
                  className="text-center text-2xl tracking-widest text-gray-900 font-semibold"
                  placeholder="••••"
                  keyboardType="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  secureTextEntry={!showPin}
                />
              ) : (
                <>
                  {renderPinDots(confirmPin)}
                  <TextInput
                    className="text-center text-2xl tracking-widest text-gray-900 font-semibold opacity-0 absolute"
                    placeholder="••••"
                    keyboardType="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    secureTextEntry={false}
                  />
                </>
              )}
            </View>
          </View>

          {}
          <TouchableOpacity
            onPress={() => setShowPin(!showPin)}
            className="flex-row items-center justify-center mb-8"
          >
            <Ionicons
              name={showPin ? 'eye-off' : 'eye'}
              size={20}
              color="#6b7280"
            />
            <Text className="text-sm text-gray-600 ml-2">
              {showPin ? 'Hide PIN' : 'Show PIN'}
            </Text>
          </TouchableOpacity>

          {}
          <View className="bg-blue-50 rounded-xl p-4 flex-row mb-8">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View className="flex-1 ml-3">
              <Text className="text-xs text-blue-600 leading-5">
                • PIN must be 4 digits{'\n'}
                • Avoid common PINs like 1234 or 0000{'\n'}
                • Keep your PIN secure and don`t share it
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSetPin}
            disabled={loading || !pin || !confirmPin}
            className={`rounded-2xl py-4 items-center justify-center ${
              loading || !pin || !confirmPin
                ? 'bg-gray-300'
                : 'bg-pink-500'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Set PIN
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SetWithdrawalPinScreen;