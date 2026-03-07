import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Platform } from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { userAPI, handleAPIError } from '@/api/api';
import ConfirmPasswordModal from '@/components/ConfirmPasswordModal';

const PrivacySecurityScreen: React.FC = () => {
  const navigation = useNavigation();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsType, setBiometricsType] = useState<string>('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [hasWithdrawalPin, setHasWithdrawalPin] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', confirmText: 'Confirm', onConfirm: () => {} });

  useEffect(() => {
    checkBiometrics();
    loadUserPreferences();
  }, []);

  
  useFocusEffect(
    React.useCallback(() => {
      loadUserPreferences();
    }, [])
  );

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
      }

      
      if (userData && userData.hasWithdrawalPin !== undefined) {
        console.log('📌 hasWithdrawalPin from backend:', userData.hasWithdrawalPin);
        setHasWithdrawalPin(userData.hasWithdrawalPin);
      } else {
        console.log('⚠️ hasWithdrawalPin not found in user data');
      }
    } catch (error) {
      console.error('❌ Error loading preferences:', error);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const handleBiometricsToggle = async () => {
    if (!biometricsAvailable) {
      toast.info('Not Available', 'Biometric authentication is not available on this device');
      return;
    }

    if (!biometricsEnabled) {
      try {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          setConfirmModal({
            visible: true,
            title: 'Setup Required',
            message: `Please set up ${biometricsType || 'biometric authentication'} in your device settings first.`,
            confirmText: 'Open Settings',
            onConfirm: () => {

              if (Platform.OS === 'ios') {

              }
            },
          });
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricsType || 'biometric'} authentication`,
          cancelLabel: 'Cancel',
          disableDeviceFallback: true,  // ✅ Force Face ID/biometric only, no PIN fallback
          fallbackLabel: '',  // Hide fallback option
        });

        if (result.success) {
          await updateBiometricPreference(true);
        } else {
          toast.error(
            'Authentication Failed',
            result.error === 'user_cancel'
              ? 'Authentication was cancelled'
              : 'Could not verify your identity'
          );
        }
      } catch (error) {
        console.error('Biometric auth error:', error);
        toast.error('Error', 'Failed to enable biometric authentication');
      }
    } else {
      setConfirmModal({
        visible: true,
        title: 'Disable Biometrics',
        message: 'Are you sure you want to disable biometric authentication?',
        confirmText: 'Disable',
        onConfirm: () => updateBiometricPreference(false),
      });
    }
  };

  const updateBiometricPreference = async (enabled: boolean) => {
    setLoading(true);
    try {
      await userAPI.updatePreferences({
        fingerprintEnabled: enabled,
      });
      setBiometricsEnabled(enabled);
      toast.success(
        'Success',
        `Biometric authentication ${enabled ? 'enabled' : 'disabled'} successfully`
      );
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message);
      setBiometricsEnabled(!enabled);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToSetPin = () => {
    console.log('🔍 handleNavigateToSetPin called');
    console.log('📌 hasWithdrawalPin:', hasWithdrawalPin);
    
    
    if (hasWithdrawalPin) {
      console.log('✅ User has PIN, showing alert to change');
      
      setConfirmModal({
        visible: true,
        title: 'PIN Already Set',
        message: 'You already have a withdrawal PIN. Would you like to change it?',
        confirmText: 'Change PIN',
        onConfirm: () => {
          console.log('🔄 Navigating to ChangeWithdrawalPin');
          try {
            navigation.navigate('ChangeWithdrawalPin' as never);
          } catch (error) {
            console.error('❌ Navigation error:', error);
            toast.error('Navigation Error', 'Could not navigate to Change PIN screen. Make sure "ChangeWithdrawalPin" is registered in your navigation stack.');
          }
        },
      });
    } else {
      console.log('⚠️ User has NO PIN, navigating to SetWithdrawalPin');
      
      try {
        navigation.navigate('SetWithdrawalPin' as never);
      } catch (error) {
        console.error('❌ Navigation error:', error);
        toast.error('Navigation Error', 'Could not navigate to Set PIN screen. Make sure "SetWithdrawalPin" is registered in your navigation stack.');
      }
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

  
  const securityOptions = [
    {
      icon: 'finger-print',
      title: getBiometricTitle(),
      subtitle: getBiometricSubtitle(),
      type: 'switch',
      value: biometricsEnabled,
      disabled: !biometricsAvailable || loading || preferencesLoading,
      onToggle: handleBiometricsToggle,
    },
   
    {
      icon: 'lock-closed',
      title: 'Change Password',
      subtitle: 'Update your account password',
      type: 'button',
      disabled: loading,
      onPress: () => setShowPasswordModal(true),
    },
    {
      icon: 'keypad',
      title: hasWithdrawalPin ? 'Change Withdrawal PIN' : 'Set Withdrawal PIN',
      subtitle: hasWithdrawalPin 
        ? 'Update your wallet security PIN'
        : 'Secure your wallet transactions',
      type: 'button',
      disabled: loading,
      onPress: handleNavigateToSetPin,
    },
  ];

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
            Privacy & Security
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {preferencesLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#eb278d" />
            <Text className="text-gray-500 mt-2">Loading settings...</Text>
          </View>
        ) : (
          <>
            {}
            <View className="px-5 pt-5">
              <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Security Settings
              </Text>
              <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {securityOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={option.type === 'switch' ? 1 : 0.6}
                    disabled={option.disabled || option.type === 'switch'}
                    onPress={option.type === 'button' ? option.onPress : undefined}
                    className={`flex-row items-center p-4 ${
                      index !== securityOptions.length - 1
                        ? 'border-b border-gray-100'
                        : ''
                    } ${option.disabled ? 'opacity-50' : ''}`}
                  >
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
                    {option.type === 'switch' ? (
                      loading && !option.disabled ? (
                        <ActivityIndicator size="small" color="#eb278d" />
                      ) : (
                        <Switch
                          value={option.value}
                          onValueChange={option.onToggle}
                          disabled={option.disabled}
                          trackColor={{ false: '#d1d5db', true: '#fbb6ce' }}
                          thumbColor={option.value ? '#eb278d' : '#f3f4f6'}
                        />
                      )
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {}
            {/* <View className="px-5 pt-5">
              <Text className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Privacy
              </Text>
              <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <TouchableOpacity 
                  className="flex-row items-center p-4 border-b border-gray-100"
                  activeOpacity={0.6}
                >
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
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity 
                  className="flex-row items-center p-4"
                  activeOpacity={0.6}
                >
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
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            </View> */}

            {}
            <View className="mx-5 mt-5 bg-blue-50 rounded-xl px-4 py-3 flex-row">
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text className="flex-1 ml-2 text-xs text-blue-600 leading-5">
                {biometricsAvailable
                  ? `${biometricsType} authentication provides quick and secure access to your account.`
                  : 'Enable two-factor authentication for maximum protection.'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {}
      <ConfirmPasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          setShowPasswordModal(false);
          toast.success('Success', 'Password changed successfully');
        }}
      />

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal(prev => ({...prev, visible: false}));
        }}
        onCancel={() => setConfirmModal(prev => ({...prev, visible: false}))}
      />
    </SafeAreaView>
  );
};

export default PrivacySecurityScreen;