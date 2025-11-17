import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { userAPI, handleAPIError } from '@/api/api';
import ConfirmationModal from '@/components/ConfirmationModal';
const PrivacySecurityScreen: React.FC = () => {
  const navigation = useNavigation();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsType, setBiometricsType] = useState<string>('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [pinForm, setPinForm] = useState({
    pin: '',
    confirmPin: ''
  });
  useEffect(() => {
    checkBiometrics();
    loadUserPreferences();
  }, []);
  const checkBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setBiometricsAvailable(compatible);
      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricsType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricsType('Fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricsType('Iris');
        }
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          console.log('No biometrics enrolled on device');
        }
      }
    } catch (error) {
      console.error('Error checking biometrics:', error);
    }
  };
  const loadUserPreferences = async () => {
    setPreferencesLoading(true);
    try {
      const response = await userAPI.getProfile();
      console.log('🔍 Profile response:', JSON.stringify(response, null, 2));
      const userData = response.data?.data?.user || response.data?.user;
      if (userData && userData.preferences) {
        console.log('✅ User preferences loaded:', userData.preferences);
        setBiometricsEnabled(userData.preferences.fingerprintEnabled || false);
      } else {
        console.log('⚠️ No preferences found in user data');
      }
    } catch (error) {
      console.error('❌ Error loading preferences:', error);
    } finally {
      setPreferencesLoading(false);
    }
  };
  const handleBiometricsToggle = async () => {
    if (!biometricsAvailable) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device');
      return;
    }
    if (!biometricsEnabled) {
      try {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          Alert.alert('Setup Required', `Please set up ${biometricsType || 'biometric authentication'} in your device settings first.`, [{
            text: 'Cancel',
            style: 'cancel'
          }, {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {}
            }
          }]);
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricsType || 'biometric'} authentication`,
          cancelLabel: 'Cancel',
          disableDeviceFallback: false
        });
        if (result.success) {
          await updateBiometricPreference(true);
        } else {
          Alert.alert('Authentication Failed', result.error === 'user_cancel' ? 'Authentication was cancelled' : 'Could not verify your identity');
        }
      } catch (error) {
        console.error('Biometric auth error:', error);
        Alert.alert('Error', 'Failed to enable biometric authentication');
      }
    } else {
      Alert.alert('Disable Biometrics', 'Are you sure you want to disable biometric authentication?', [{
        text: 'Cancel',
        style: 'cancel'
      }, {
        text: 'Disable',
        style: 'destructive',
        onPress: () => updateBiometricPreference(false)
      }]);
    }
  };
  const updateBiometricPreference = async (enabled: boolean) => {
    setLoading(true);
    try {
      await userAPI.updatePreferences({
        fingerprintEnabled: enabled
      });
      setBiometricsEnabled(enabled);
      Alert.alert('Success', `Biometric authentication ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
      setBiometricsEnabled(!enabled);
    } finally {
      setLoading(false);
    }
  };
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };
  const handleSetPin = async () => {
    if (!pinForm.pin || !pinForm.confirmPin) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (pinForm.pin !== pinForm.confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }
    if (!/^\d{4,6}$/.test(pinForm.pin)) {
      Alert.alert('Error', 'PIN must be 4-6 digits');
      return;
    }
    setLoading(true);
    try {
      await userAPI.updatePreferences({
        fingerprintEnabled: false
      });
      Alert.alert('Success', 'PIN set successfully');
      setShowPinModal(false);
      setPinForm({
        pin: '',
        confirmPin: ''
      });
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };
  const getBiometricTitle = () => {
    if (!biometricsAvailable) return 'Biometric Authentication';
    return biometricsType ? `${biometricsType} Authentication` : 'Biometric Authentication';
  };
  const getBiometricSubtitle = () => {
    if (!biometricsAvailable) return 'Not available on this device';
    return `Use ${biometricsType || 'biometrics'} to login quickly and securely`;
  };
  const securityOptions = [{
    icon: 'finger-print',
    title: getBiometricTitle(),
    subtitle: getBiometricSubtitle(),
    type: 'switch',
    value: biometricsEnabled,
    disabled: !biometricsAvailable || loading || preferencesLoading,
    onToggle: handleBiometricsToggle
  }, {
    icon: 'shield-checkmark',
    title: 'Two-Factor Authentication',
    subtitle: 'Add an extra layer of security',
    type: 'switch',
    value: twoFactorEnabled,
    disabled: loading || preferencesLoading,
    onToggle: () => setTwoFactorEnabled(!twoFactorEnabled)
  }, {
    icon: 'lock-closed',
    title: 'Change Password',
    subtitle: 'Update your account password',
    type: 'button',
    disabled: loading,
    onPress: () => setShowPasswordModal(true)
  }, {
    icon: 'keypad',
    title: 'Set Withdrawal PIN',
    subtitle: 'Secure your wallet transactions',
    type: 'button',
    disabled: loading,
    onPress: () => setShowPinModal(true)
  }];
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Privacy & Security
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{
      paddingBottom: 20
    }}>
        {preferencesLoading ? <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#eb278d" />
            <Text className="text-gray-500 mt-2">Loading settings...</Text>
          </View> : <>
            <View className="px-5 pt-5">
              <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Security Settings
              </Text>
              <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {securityOptions.map((option, index) => <View key={index} className={`flex-row items-center p-4 ${index !== securityOptions.length - 1 ? 'border-b border-gray-100' : ''} ${option.disabled ? 'opacity-50' : ''}`}>
                    <View className="w-11 h-11 rounded-xl bg-pink-50 items-center justify-center mr-3">
                      <Ionicons name={option.icon as any} size={22} color="#eb278d" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-gray-800 mb-0.5">
                        {option.title}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {option.subtitle}
                      </Text>
                    </View>
                    {option.type === 'switch' ? loading && !option.disabled ? <ActivityIndicator size="small" color="#eb278d" /> : <Switch value={option.value} onValueChange={option.onToggle} disabled={option.disabled} trackColor={{
                false: '#d1d5db',
                true: '#fbb6ce'
              }} thumbColor={option.value ? '#eb278d' : '#f3f4f6'} /> : <TouchableOpacity onPress={option.onPress} disabled={option.disabled}>
                        <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                      </TouchableOpacity>}
                  </View>)}
              </View>
            </View>

            {}
            <View className="px-5 pt-5">
              <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Privacy
              </Text>
              <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
                  <View className="w-11 h-11 rounded-xl bg-pink-50 items-center justify-center mr-3">
                    <Ionicons name="eye-off" size={22} color="#eb278d" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-gray-800 mb-0.5">
                      Data & Privacy
                    </Text>
                    <Text className="text-xs text-gray-500">
                      Manage your data and privacy settings
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center p-4">
                  <View className="w-11 h-11 rounded-xl bg-pink-50 items-center justify-center mr-3">
                    <Ionicons name="download" size={22} color="#eb278d" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-gray-800 mb-0.5">
                      Download My Data
                    </Text>
                    <Text className="text-xs text-gray-500">
                      Request a copy of your information
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </TouchableOpacity>
              </View>
            </View>

            {}
            <View className="mx-5 mt-5 bg-blue-50 rounded-xl px-4 py-3 flex-row">
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text className="flex-1 ml-2 text-xs text-blue-600 leading-5">
                {biometricsAvailable ? `${biometricsType} authentication provides quick and secure access to your account.` : 'Enable two-factor authentication for maximum protection.'}
              </Text>
            </View>
          </>}
      </ScrollView>

      {}
      <ConfirmationModal visible={showPasswordModal} title="Change Password" message="Enter your current password and choose a new one" icon="lock-closed" iconColor="#eb278d" confirmText="Update Password" cancelText="Cancel" confirmColor="#eb278d" loading={loading} onConfirm={handleChangePassword} onCancel={() => setShowPasswordModal(false)}>
        <View className="mt-4">
          <TextInput className="bg-gray-50 rounded-xl px-4 py-3 mb-3 text-gray-900" placeholder="Current Password" secureTextEntry value={passwordForm.currentPassword} onChangeText={text => setPasswordForm({
          ...passwordForm,
          currentPassword: text
        })} />
          <TextInput className="bg-gray-50 rounded-xl px-4 py-3 mb-3 text-gray-900" placeholder="New Password" secureTextEntry value={passwordForm.newPassword} onChangeText={text => setPasswordForm({
          ...passwordForm,
          newPassword: text
        })} />
          <TextInput className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900" placeholder="Confirm New Password" secureTextEntry value={passwordForm.confirmPassword} onChangeText={text => setPasswordForm({
          ...passwordForm,
          confirmPassword: text
        })} />
        </View>
      </ConfirmationModal>

      {}
      <ConfirmationModal visible={showPinModal} title="Set Withdrawal PIN" message="Create a 4-6 digit PIN to secure your transactions" icon="keypad" iconColor="#eb278d" confirmText="Set PIN" cancelText="Cancel" confirmColor="#eb278d" loading={loading} onConfirm={handleSetPin} onCancel={() => setShowPinModal(false)}>
        <View className="mt-4">
          <TextInput className="bg-gray-50 rounded-xl px-4 py-3 mb-3 text-gray-900 text-center text-lg tracking-widest" placeholder="Enter PIN" secureTextEntry keyboardType="numeric" maxLength={6} value={pinForm.pin} onChangeText={text => setPinForm({
          ...pinForm,
          pin: text
        })} />
          <TextInput className="bg-gray-50 rounded-xl px-4 py-3 text-gray-900 text-center text-lg tracking-widest" placeholder="Confirm PIN" secureTextEntry keyboardType="numeric" maxLength={6} value={pinForm.confirmPin} onChangeText={text => setPinForm({
          ...pinForm,
          confirmPin: text
        })} />
        </View>
      </ConfirmationModal>
    </SafeAreaView>;
};
export default PrivacySecurityScreen;