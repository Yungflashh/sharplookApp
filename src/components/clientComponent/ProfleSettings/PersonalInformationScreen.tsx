import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getStoredUser } from '@/utils/authHelper';
import { userAPI, handleAPIError } from '@/api/api';
interface PersonalInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}
const PersonalInformationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });
  useEffect(() => {
    loadUserData();
  }, []);
  const loadUserData = async () => {
    try {
      const userData = await getStoredUser();
      if (userData) {
        setFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          email: userData.email || ''
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setInitialLoading(false);
    }
  };
  const handleUpdate = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await userAPI.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim()
      });
      Alert.alert('Success', 'Profile updated successfully', [{
        text: 'OK',
        onPress: () => navigation.goBack()
      }]);
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };
  if (initialLoading) {
    return <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
        </View>
      </SafeAreaView>;
  }
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Personal Information
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{
      paddingBottom: 20
    }}>
        <View className="bg-white px-5 py-6 mb-2">
          <View className="items-center">
            <TouchableOpacity className="relative mb-4" activeOpacity={0.8}>
              <View className="w-24 h-24 rounded-full bg-pink-100 items-center justify-center">
                <Ionicons name="person" size={48} color="#eb278d" />
              </View>
              <TouchableOpacity className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-pink-500 items-center justify-center border-2 border-white" activeOpacity={0.7}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>
            <Text className="text-sm text-gray-500">
              Tap to change profile picture
            </Text>
          </View>
        </View>

        <View className="bg-white px-5 py-6 mb-2">
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              First Name <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3.5 border border-gray-200">
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <TextInput className="flex-1 ml-3 text-base text-gray-900" placeholder="Enter first name" value={formData.firstName} onChangeText={text => setFormData({
              ...formData,
              firstName: text
            })} editable={!loading} />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Last Name <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3.5 border border-gray-200">
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <TextInput className="flex-1 ml-3 text-base text-gray-900" placeholder="Enter last name" value={formData.lastName} onChangeText={text => setFormData({
              ...formData,
              lastName: text
            })} editable={!loading} />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3.5 border border-gray-200">
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <TextInput className="flex-1 ml-3 text-base text-gray-900" placeholder="Enter phone number" value={formData.phone} onChangeText={text => setFormData({
              ...formData,
              phone: text
            })} keyboardType="phone-pad" editable={!loading} />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Email Address
            </Text>
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3.5 border border-gray-200">
              <Ionicons name="mail-outline" size={20} color="#9ca3af" />
              <TextInput className="flex-1 ml-3 text-base text-gray-500" value={formData.email} editable={false} />
              <Ionicons name="lock-closed" size={16} color="#9ca3af" />
            </View>
            <Text className="text-xs text-gray-500 mt-1.5">
              Email cannot be changed
            </Text>
          </View>
        </View>

        <View className="mx-5 bg-blue-50 rounded-xl px-4 py-3 flex-row">
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <Text className="flex-1 ml-2 text-xs text-blue-600 leading-5">
            Changing your phone number will require verification
          </Text>
        </View>
      </ScrollView>

      <View className="bg-white px-5 py-4 border-t border-gray-100">
        <TouchableOpacity className={`py-4 rounded-xl items-center ${loading ? 'bg-pink-300' : 'bg-pink-500'}`} onPress={handleUpdate} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white font-semibold text-base">
              Update Profile
            </Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>;
};
export default PersonalInformationScreen;