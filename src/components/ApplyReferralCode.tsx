import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { referralAPI } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

interface ApplyReferralCodeProps {
  navigation: any;
  onSuccess?: () => void;
}

const ApplyReferralCode: React.FC<ApplyReferralCodeProps> = ({ navigation, onSuccess }) => {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const handleApplyCode = async () => {
    if (!referralCode.trim()) {
      toast.error('Error', 'Please enter a referral code');
      return;
    }

    try {
      setLoading(true);
      await referralAPI.applyReferralCode(referralCode.trim().toUpperCase());
      
      toast.success('Success!', 'Referral code applied successfully! Complete your first booking to activate your rewards.');
      onSuccess?.();
      navigation.goBack();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to apply referral code';
      toast.error('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setConfirmModal({
      visible: true,
      title: 'Skip Referral Code?',
      message: 'You can still add a referral code later from your profile settings.',
      onConfirm: () => navigation.goBack(),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#eb278d', '#c71f73']}
            className="items-center px-8 pt-8 pb-12 rounded-b-3xl"
          >
            <Ionicons name="gift" size={64} color="#FFFFFF" />
            <Text className="text-3xl font-bold text-white mt-4 text-center">
              Got a Referral Code?
            </Text>
            <Text className="text-base text-pink-100 mt-2 text-center">
              Enter your friend's code to get bonus rewards!
            </Text>
          </LinearGradient>

          <View className="px-5 pt-8">
            {/* Benefits */}
            <View 
              className="bg-white rounded-2xl p-5 mb-6"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View className="mr-3">
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
                <Text className="flex-1 text-base text-gray-900">
                  Get bonus credit on your first booking
                </Text>
              </View>
              <View className="flex-row items-center mb-4">
                <View className="mr-3">
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
                <Text className="flex-1 text-base text-gray-900">
                  Your friend earns rewards too
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="mr-3">
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
                <Text className="flex-1 text-base text-gray-900">
                  Unlock exclusive deals and offers
                </Text>
              </View>
            </View>

            {/* Input */}
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-900 mb-2">Referral Code</Text>
              <View 
                className="flex-row items-center bg-white rounded-xl px-4 py-3"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                  borderWidth: 2,
                  borderColor: '#E5E7EB',
                }}
              >
                <Ionicons name="ticket" size={20} color="#eb278d" />
                <TextInput
                  className="flex-1 text-lg text-gray-900 ml-3"
                  style={{ letterSpacing: 1 }}
                  value={referralCode}
                  onChangeText={(text) => setReferralCode(text.toUpperCase())}
                  placeholder="Enter code"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Apply Button */}
            <TouchableOpacity
              className="rounded-xl overflow-hidden mb-4"
              style={{
                shadowColor: '#eb278d',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
                opacity: loading ? 0.6 : 1,
              }}
              onPress={handleApplyCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#eb278d', '#c71f73']}
                className="flex-row items-center justify-center py-4"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text className="text-lg font-bold text-white mr-2">Apply Code</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Skip Button */}
            <TouchableOpacity 
              className="py-3 items-center"
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text className="text-base text-gray-500">Skip for now</Text>
            </TouchableOpacity>

            {/* Info Box */}
            <View className="flex-row items-center bg-pink-50 rounded-xl p-4 mt-6">
              <Ionicons name="information-circle" size={20} color="#eb278d" />
              <Text className="flex-1 text-sm text-pink-900 ml-3">
                You can add a referral code anytime from your profile settings
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({...prev, visible: false})); }}
        onCancel={() => setConfirmModal(prev => ({...prev, visible: false}))}
      />
    </SafeAreaView>
  );
};

export default ApplyReferralCode;