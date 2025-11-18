import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { categoriesAPI, offerAPI, handleAPIError } from '@/api/api';
const CreateOfferScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [errors, setErrors] = useState<any>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    proposedPrice: '',
    location: {
      address: '',
      city: '',
      state: '',
      coordinates: [] as number[]
    },
    preferredDate: '',
    preferredTime: '',
    flexibility: 'flexible' as 'flexible' | 'specific' | 'urgent',
    expiresInDays: 7
  });
  useEffect(() => {
    loadCategories();
  }, []);
  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };
  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const {
        status
      } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const [addressResponse] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      setFormData({
        ...formData,
        location: {
          coordinates: [location.coords.longitude, location.coords.latitude],
          address: `${addressResponse.street || ''} ${addressResponse.name || ''}`.trim(),
          city: addressResponse.city || '',
          state: addressResponse.region || ''
        }
      });
      setErrors({
        ...errors,
        location: ''
      });
      Alert.alert('Success', 'Location updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Could not get location');
    } finally {
      setLoadingLocation(false);
    }
  };
  const pickImages = async () => {
    if (selectedImages.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 images');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8
    });
    if (!result.canceled) {
      const remainingSlots = 5 - selectedImages.length;
      const newImages = result.assets.slice(0, remainingSlots).map((asset, index) => {
        const uriParts = asset.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        return {
          uri: asset.uri,
          name: `offer_${Date.now()}_${index}.${fileType}`,
          type: `image/${fileType}`
        };
      });
      setSelectedImages([...selectedImages, ...newImages]);
    }
  };
  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };
  const validateForm = () => {
    const newErrors: any = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.proposedPrice || parseFloat(formData.proposedPrice) <= 0) {
      newErrors.proposedPrice = 'Price must be greater than 0';
    }
    if (!formData.location.coordinates || formData.location.coordinates.length === 0) {
      newErrors.location = 'Please set your location';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const offerData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        proposedPrice: parseFloat(formData.proposedPrice),
        location: formData.location,
        preferredDate: formData.preferredDate || undefined,
        preferredTime: formData.preferredTime || undefined,
        flexibility: formData.flexibility,
        expiresInDays: formData.expiresInDays
      };
      const response = await offerAPI.createOffer(offerData, selectedImages);
      if (response.success) {
        Alert.alert('Success', 'Offer created successfully! Vendors will be able to respond soon.', [{
          text: 'OK',
          onPress: () => navigation.goBack()
        }]);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Make an Offer</Text>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {}
          <View className="bg-purple-50 rounded-xl p-4 my-4 flex-row">
            <Ionicons name="information-circle" size={24} color="#9333ea" />
            <Text className="flex-1 ml-3 text-sm text-purple-700 leading-5">
              Describe what you need and your budget. Vendors will respond with their proposals.
            </Text>
          </View>

          {}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">
              What do you need? *
            </Text>
            <TextInput className={`border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white`} placeholder="e.g., Hair styling for wedding" value={formData.title} onChangeText={text => {
            setFormData({
              ...formData,
              title: text
            });
            setErrors({
              ...errors,
              title: ''
            });
          }} />
            {errors.title && <Text className="text-red-500 text-xs mt-1">{errors.title}</Text>}
          </View>

          {}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">
              Description *
            </Text>
            <TextInput className={`border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white h-28`} placeholder="Describe your requirements in detail..." value={formData.description} onChangeText={text => {
            setFormData({
              ...formData,
              description: text
            });
            setErrors({
              ...errors,
              description: ''
            });
          }} multiline numberOfLines={5} textAlignVertical="top" />
            {errors.description && <Text className="text-red-500 text-xs mt-1">{errors.description}</Text>}
          </View>

          {}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              {categories.map(cat => <TouchableOpacity key={cat._id} className={`px-4 py-2.5 rounded-full mr-2 border ${formData.category === cat._id ? 'border-purple-500' : 'border-gray-300 bg-gray-50'}`} style={formData.category === cat._id ? {
              backgroundColor: '#9333ea'
            } : {}} onPress={() => {
              setFormData({
                ...formData,
                category: cat._id
              });
              setErrors({
                ...errors,
                category: ''
              });
            }}>
                  <Text className={`text-sm font-medium ${formData.category === cat._id ? 'text-white' : 'text-gray-700'}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>)}
            </ScrollView>
            {errors.category && <Text className="text-red-500 text-xs mt-1">{errors.category}</Text>}
          </View>

          {}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Your Budget (₦) *</Text>
            <View className={`flex-row items-center border ${errors.proposedPrice ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 bg-white`}>
              <Ionicons name="cash-outline" size={20} color="#9333ea" />
              <TextInput className="flex-1 py-3.5 px-3 text-base text-gray-900" placeholder="Enter your budget" value={formData.proposedPrice} onChangeText={text => {
              setFormData({
                ...formData,
                proposedPrice: text.replace(/[^0-9]/g, '')
              });
              setErrors({
                ...errors,
                proposedPrice: ''
              });
            }} keyboardType="numeric" />
            </View>
            {errors.proposedPrice && <Text className="text-red-500 text-xs mt-1">{errors.proposedPrice}</Text>}
          </View>

          {}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Time Flexibility</Text>
            <View className="flex-row gap-2">
              {[{
              key: 'flexible',
              label: 'Flexible',
              icon: 'time-outline'
            }, {
              key: 'specific',
              label: 'Specific Date',
              icon: 'calendar-outline'
            }, {
              key: 'urgent',
              label: 'Urgent',
              icon: 'flash-outline'
            }].map(option => <TouchableOpacity key={option.key} className={`flex-1 px-3 py-3 rounded-xl border flex-row items-center justify-center ${formData.flexibility === option.key ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white'}`} onPress={() => setFormData({
              ...formData,
              flexibility: option.key as any
            })}>
                  <Ionicons name={option.icon as any} size={16} color={formData.flexibility === option.key ? '#9333ea' : '#6b7280'} />
                  <Text className={`ml-1 text-xs font-medium ${formData.flexibility === option.key ? 'text-purple-700' : 'text-gray-700'}`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          {formData.flexibility !== 'flexible' && <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-900 mb-2">
                Preferred Date & Time
              </Text>
              <View className="flex-row gap-3">
                <TextInput className="flex-1 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white" placeholder="Date (YYYY-MM-DD)" value={formData.preferredDate} onChangeText={text => setFormData({
              ...formData,
              preferredDate: text
            })} />
                <TextInput className="flex-1 border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white" placeholder="Time (HH:MM)" value={formData.preferredTime} onChangeText={text => setFormData({
              ...formData,
              preferredTime: text
            })} />
              </View>
            </View>}

          {}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Location *</Text>
            <TouchableOpacity className={`flex-row items-center justify-between border ${errors.location ? 'border-red-500' : 'border-gray-300'} rounded-xl px-4 py-3.5 bg-white`} onPress={getCurrentLocation} disabled={loadingLocation}>
              <View className="flex-row items-center flex-1">
                <Ionicons name="location-outline" size={20} color="#9333ea" />
                <Text className={`ml-3 text-base ${formData.location.address ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                  {formData.location.address || 'Set your location'}
                </Text>
              </View>
              {loadingLocation ? <ActivityIndicator size="small" color="#9333ea" /> : <Ionicons name="chevron-forward" size={20} color="#9333ea" />}
            </TouchableOpacity>
            {formData.location.city && <Text className="text-xs text-gray-500 mt-1">
                {formData.location.city}, {formData.location.state}
              </Text>}
            {errors.location && <Text className="text-red-500 text-xs mt-1">{errors.location}</Text>}
          </View>

          {}
          <View className="mb-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">
              Offer Valid For (Days)
            </Text>
            <View className="flex-row gap-2">
              {[3, 7, 14, 30].map(days => <TouchableOpacity key={days} className={`flex-1 px-3 py-3 rounded-xl border ${formData.expiresInDays === days ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white'}`} onPress={() => setFormData({
              ...formData,
              expiresInDays: days
            })}>
                  <Text className={`text-center text-sm font-medium ${formData.expiresInDays === days ? 'text-purple-700' : 'text-gray-700'}`}>
                    {days} days
                  </Text>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-gray-900 mb-2">
              Add Images ({selectedImages.length}/5)
            </Text>
            <TouchableOpacity className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center bg-white" onPress={pickImages} disabled={selectedImages.length >= 5}>
              <Ionicons name="cloud-upload-outline" size={32} color="#9333ea" />
              <Text className="font-medium mt-2 text-purple-700">
                {selectedImages.length >= 5 ? 'Maximum Images Reached' : 'Upload Images'}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">Max 5 images</Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                {selectedImages.map((image, index) => <View key={index} className="relative mr-2">
                    <Image source={{
                uri: image.uri
              }} className="w-20 h-20 rounded-lg" />
                    <TouchableOpacity className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1" onPress={() => removeImage(index)}>
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>)}
              </ScrollView>}
          </View>
        </ScrollView>

        {}
        <View className="bg-white px-5 py-4 border-t border-gray-100">
          <TouchableOpacity className={`py-4 rounded-xl items-center ${loading ? 'bg-purple-300' : 'bg-purple-600'}`} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold text-base">Submit Offer</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>;
};
export default CreateOfferScreen;