import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CancelBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}

const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState('');
  const MIN_CHARACTERS = 10;

  const isReasonValid = reason.trim().length >= MIN_CHARACTERS;
  const remainingChars = MIN_CHARACTERS - reason.trim().length;

  const handleConfirm = async () => {
    if (!isReasonValid) {
      alert(`Please provide at least ${MIN_CHARACTERS} characters for cancellation reason`);
      return;
    }
    await onConfirm(reason);
    setReason('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className="bg-white rounded-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Cancel Booking</Text>
              <TouchableOpacity onPress={onClose} disabled={loading}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-4">
              Please provide a reason for cancellation:
            </Text>

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g., Schedule conflict, Found another service..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-gray-50 rounded-xl p-4 mb-2 text-gray-900"
              style={{ minHeight: 100 }}
              editable={!loading}
            />

            {/* Character counter */}
            <Text className={`text-sm mb-4 ${remainingChars > 0 ? 'text-red-500' : 'text-green-600'}`}>
              {remainingChars > 0 
                ? `${remainingChars} more character${remainingChars !== 1 ? 's' : ''} required`
                : `✓ ${reason.trim().length} characters`
              }
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                disabled={loading}
                className="flex-1 bg-gray-200 py-4 rounded-xl"
                activeOpacity={0.8}
              >
                <Text className="text-center font-bold text-gray-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={loading || !isReasonValid}
                className={`flex-1 py-4 rounded-xl ${
                  loading || !isReasonValid ? 'bg-red-300' : 'bg-red-500'
                }`}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-center font-bold text-white">Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CancelBookingModal;