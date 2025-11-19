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

const ChangeWithdrawalPinScreen: React.FC = () => {
  const navigation = useNavigation();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPins, setShowPins] = useState(false);

  const handleChangePin = async () => {
    // Validation
    if (!currentPin || !newPin || !confirmNewPin) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (currentPin.length !== 4 || newPin.length !== 4) {
      Alert.alert('Error', 'PIN must be exactly 4 digits');
      return;
    }

    if (!/^\d+$/.test(currentPin) || !/^\d+$/.test(newPin)) {
      Alert.alert('Error', 'PIN must contain only numbers');
      return;
    }

    if (newPin !== confirmNewPin) {
      Alert.alert('Error', 'New PINs do not match. Please try again.');
      return;
    }

    if (currentPin === newPin) {
      Alert.alert('Error', 'New PIN must be different from current PIN');
      return;
    }

    // Check for weak PINs
    const weakPins = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (weakPins.includes(newPin)) {
      Alert.alert(
        'Weak PIN',
        'This PIN is too common. Please choose a more secure PIN.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      await userAPI.changeWithdrawalPin(currentPin, newPin, confirmNewPin);
      
      Alert.alert(
        'Success',
        'Your withdrawal PIN has been changed successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to change PIN. Please verify your current PIN.');
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
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Change Withdrawal PIN
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-5 pt-8">
          {/* Icon */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-pink-100 items-center justify-center mb-4">
              <Ionicons name="key" size={40} color="#eb278d" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              Update Your PIN
            </Text>
            <Text className="text-sm text-gray-500 text-center px-8">
              Enter your current PIN and choose a new one
            </Text>
          </View>

          {/* Current PIN */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Current PIN
            </Text>
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              {showPins ? (
                <TextInput
                  className="text-center text-2xl tracking-widest text-gray-900 font-semibold"
                  placeholder="••••"
                  keyboardType="numeric"
                  maxLength={4}
                  value={currentPin}
                  onChangeText={setCurrentPin}
                  secureTextEntry={!showPins}
                />
              ) : (
                <>
                  {renderPinDots(currentPin)}
                  <TextInput
                    className="text-center text-2xl tracking-widest text-gray-900 font-semibold opacity-0 absolute"
                    placeholder="••••"
                    keyboardType="numeric"
                    maxLength={4}
                    value={currentPin}
                    onChangeText={setCurrentPin}
                    secureTextEntry={false}
                  />
                </>
              )}
            </View>
          </View>

          {/* New PIN */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              New PIN
            </Text>
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              {showPins ? (
                <TextInput
                  className="text-center text-2xl tracking-widest text-gray-900 font-semibold"
                  placeholder="••••"
                  keyboardType="numeric"
                  maxLength={4}
                  value={newPin}
                  onChangeText={setNewPin}
                  secureTextEntry={!showPins}
                />
              ) : (
                <>
                  {renderPinDots(newPin)}
                  <TextInput
                    className="text-center text-2xl tracking-widest text-gray-900 font-semibold opacity-0 absolute"
                    placeholder="••••"
                    keyboardType="numeric"
                    maxLength={4}
                    value={newPin}
                    onChangeText={setNewPin}
                    secureTextEntry={false}
                  />
                </>
              )}
            </View>
          </View>

          {/* Confirm New PIN */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Confirm New PIN
            </Text>
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              {showPins ? (
                <TextInput
                  className="text-center text-2xl tracking-widest text-gray-900 font-semibold"
                  placeholder="••••"
                  keyboardType="numeric"
                  maxLength={4}
                  value={confirmNewPin}
                  onChangeText={setConfirmNewPin}
                  secureTextEntry={!showPins}
                />
              ) : (
                <>
                  {renderPinDots(confirmNewPin)}
                  <TextInput
                    className="text-center text-2xl tracking-widest text-gray-900 font-semibold opacity-0 absolute"
                    placeholder="••••"
                    keyboardType="numeric"
                    maxLength={4}
                    value={confirmNewPin}
                    onChangeText={setConfirmNewPin}
                    secureTextEntry={false}
                  />
                </>
              )}
            </View>
          </View>

          {/* Show PIN Toggle */}
          <TouchableOpacity
            onPress={() => setShowPins(!showPins)}
            className="flex-row items-center justify-center mb-8"
          >
            <Ionicons
              name={showPins ? 'eye-off' : 'eye'}
              size={20}
              color="#6b7280"
            />
            <Text className="text-sm text-gray-600 ml-2">
              {showPins ? 'Hide PINs' : 'Show PINs'}
            </Text>
          </TouchableOpacity>

          {/* Info Box */}
          <View className="bg-blue-50 rounded-xl p-4 flex-row mb-8">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View className="flex-1 ml-3">
              <Text className="text-xs text-blue-600 leading-5">
                • New PIN must be 4 digits{'\n'}
                • Choose a different PIN from your current one{'\n'}
                • Avoid common PINs like 1234 or 0000
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleChangePin}
            disabled={loading || !currentPin || !newPin || !confirmNewPin}
            className={`rounded-2xl py-4 items-center justify-center ${
              loading || !currentPin || !newPin || !confirmNewPin
                ? 'bg-gray-300'
                : 'bg-pink-500'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Change PIN
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot PIN Link */}
          <TouchableOpacity className="mt-6 items-center">
            <Text className="text-sm text-pink-500 font-medium">
              Forgot Your PIN?
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChangeWithdrawalPinScreen;