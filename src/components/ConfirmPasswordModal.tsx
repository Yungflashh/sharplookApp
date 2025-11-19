import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authAPI, handleAPIError } from '@/api/api';

interface ConfirmPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ConfirmPasswordModal: React.FC<ConfirmPasswordModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords({ current: false, new: false, confirm: false });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      Alert.alert(
        'Weak Password',
        'Password should contain uppercase, lowercase, and numbers',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with your actual API call
      // await authAPI.changePassword(currentPassword, newPassword);
      
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      Alert.alert('Success', 'Password changed successfully');
      resetForm();
      onSuccess();
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="bg-white rounded-3xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <View className="bg-pink-500 px-6 py-5 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white text-xl font-bold mb-1">
                  Change Password
                </Text>
                <Text className="text-pink-100 text-sm">
                  Update your account password
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-white/20 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View className="p-6">
              {/* Current Password */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Current Password
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Enter current password"
                    secureTextEntry={!showPasswords.current}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                    }
                  >
                    <Ionicons
                      name={showPasswords.current ? 'eye-off' : 'eye'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                  <Ionicons name="key-outline" size={20} color="#9ca3af" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Enter new password"
                    secureTextEntry={!showPasswords.new}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                    }
                  >
                    <Ionicons
                      name={showPasswords.new ? 'eye-off' : 'eye'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                  <Ionicons name="checkmark-circle-outline" size={20} color="#9ca3af" />
                  <TextInput
                    className="flex-1 ml-3 text-gray-900"
                    placeholder="Confirm new password"
                    secureTextEntry={!showPasswords.confirm}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                    }
                  >
                    <Ionicons
                      name={showPasswords.confirm ? 'eye-off' : 'eye'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View className="bg-blue-50 rounded-xl p-3 mb-6">
                <Text className="text-xs text-blue-600 leading-5">
                  Password must be at least 8 characters and include:{'\n'}
                  • Uppercase and lowercase letters{'\n'}
                  • Numbers{'\n'}
                  • Special characters (recommended)
                </Text>
              </View>

              {/* Buttons */}
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={handleClose}
                  disabled={loading}
                  className="flex-1 bg-gray-100 rounded-xl py-3.5 items-center justify-center"
                >
                  <Text className="text-gray-700 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleChangePassword}
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                  className={`flex-1 rounded-xl py-3.5 items-center justify-center ${
                    loading || !currentPassword || !newPassword || !confirmPassword
                      ? 'bg-gray-300'
                      : 'bg-pink-500'
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ConfirmPasswordModal;