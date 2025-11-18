import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { categoriesAPI, handleAPIError } from '@/api/api';
interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  basePrice: number;
  priceType: 'fixed' | 'variable';
  currency: string;
  duration: number;
  serviceArea: {
    type: string;
    coordinates: number[];
    radius: number;
  };
}
interface AddServiceModalProps {
  visible: boolean;
  service?: any;
  onClose: () => void;
  onSave: (service: ServiceFormData, images: any[]) => Promise<void>;
}
const AddServiceModal: React.FC<AddServiceModalProps> = ({
  visible,
  service,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    category: '',
    basePrice: 0,
    priceType: 'fixed',
    currency: 'NGN',
    duration: 0,
    serviceArea: {
      type: 'Point',
      coordinates: [],
      radius: 10000
    }
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  useEffect(() => {
    if (visible) {
      loadCategories();
      if (service) {
        setFormData({
          name: service.name,
          description: service.description,
          category: service.category._id,
          basePrice: service.basePrice,
          priceType: service.priceType,
          currency: service.currency,
          duration: service.duration,
          serviceArea: service.serviceArea || formData.serviceArea
        });
        if (service.images && service.images.length > 0) {
          const existingImages = service.images.map((url: string, index: number) => ({
            uri: url,
            name: `existing_${index}.jpg`,
            type: 'image/jpeg'
          }));
          setSelectedImages(existingImages);
        }
      } else {
        resetForm();
      }
    }
  }, [service, visible]);
  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Error loading categories:', apiError.message);
      setCategories([{
        _id: '1',
        name: 'Hair'
      }, {
        _id: '2',
        name: 'Makeup'
      }, {
        _id: '3',
        name: 'Nails'
      }, {
        _id: '4',
        name: 'Spa'
      }]);
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
      setFormData({
        ...formData,
        serviceArea: {
          ...formData.serviceArea,
          coordinates: [location.coords.longitude, location.coords.latitude]
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
      const newImages = result.assets.slice(0, remainingSlots).map(asset => {
        const filename = asset.uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        return {
          uri: asset.uri,
          name: filename,
          type: type
        };
      });
      setSelectedImages([...selectedImages, ...newImages]);
    }
  };
  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      basePrice: 0,
      priceType: 'fixed',
      currency: 'NGN',
      duration: 0,
      serviceArea: {
        type: 'Point',
        coordinates: [],
        radius: 10000
      }
    });
    setSelectedImages([]);
    setErrors({});
  };
  const validateForm = () => {
    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'Service name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Please select a category';
    if (!formData.basePrice || formData.basePrice <= 0) newErrors.basePrice = 'Price must be greater than 0';
    if (!formData.duration || formData.duration <= 0) newErrors.duration = 'Duration must be selected';
    if (!formData.serviceArea.coordinates || formData.serviceArea.coordinates.length === 0) {
      newErrors.location = 'Please set your service location using GPS';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await onSave(formData, selectedImages);
      resetForm();
    } catch (error) {
      console.error('Error saving service:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleClose = () => {
    resetForm();
    onClose();
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
        {}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
          <TouchableOpacity onPress={handleClose} className="p-1">
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            {service ? 'Edit Service' : 'Add New Service'}
          </Text>
          <View className="w-9" />
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {}
          <View className="mb-6 mt-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Service Name *</Text>
            <TextInput className={`border ${errors.name ? 'border-[#FF0000]' : 'border-gray-300'} rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50`} placeholder="e.g., Hair Styling" placeholderTextColor="#999" value={formData.name} onChangeText={text => {
            setFormData({
              ...formData,
              name: text
            });
            setErrors({
              ...errors,
              name: ''
            });
          }} />
            {errors.name && <Text className="text-[#FF0000] text-xs mt-1">{errors.name}</Text>}
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Description *</Text>
            <TextInput className={`border ${errors.description ? 'border-[#FF0000]' : 'border-gray-300'} rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 h-24`} placeholder="Describe your service..." placeholderTextColor="#999" value={formData.description} onChangeText={text => {
            setFormData({
              ...formData,
              description: text
            });
            setErrors({
              ...errors,
              description: ''
            });
          }} multiline numberOfLines={4} textAlignVertical="top" />
            {errors.description && <Text className="text-[#FF0000] text-xs mt-1">{errors.description}</Text>}
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              {categories.map(cat => <TouchableOpacity key={cat._id} className={`px-4 py-2.5 rounded-full mr-2 ${formData.category === cat._id ? 'border border-gray-300' : 'bg-gray-100 border border-gray-300'}`} style={formData.category === cat._id ? {
              backgroundColor: '#eb278d'
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
            {errors.category && <Text className="text-[#FF0000] text-xs mt-1">{errors.category}</Text>}
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Price (₦) *</Text>
            <View className="flex-row items-center gap-3">
              <View className={`flex-1 flex-row items-center border ${errors.basePrice ? 'border-[#FF0000]' : 'border-gray-300'} rounded-xl px-4 bg-gray-50`}>
                <Ionicons name="cash-outline" size={20} color="#eb278d" />
                <TextInput className="flex-1 py-3.5 px-3 text-base text-gray-900" placeholder="0" placeholderTextColor="#999" value={formData.basePrice ? formData.basePrice.toString() : ''} onChangeText={text => {
                const numValue = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                setFormData({
                  ...formData,
                  basePrice: numValue
                });
                setErrors({
                  ...errors,
                  basePrice: ''
                });
              }} keyboardType="numeric" />
              </View>
              {}
              <View className="flex-row border border-gray-300 rounded-xl overflow-hidden">
                <TouchableOpacity className={`px-4 py-3 ${formData.priceType === 'fixed' ? '' : 'bg-white'}`} style={formData.priceType === 'fixed' ? {
                backgroundColor: '#eb278d'
              } : {}} onPress={() => setFormData({
                ...formData,
                priceType: 'fixed'
              })}>
                  <Text className={`text-sm font-medium ${formData.priceType === 'fixed' ? 'text-white' : 'text-gray-700'}`}>
                    Fixed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity className={`px-4 py-3 ${formData.priceType === 'variable' ? '' : 'bg-white'}`} style={formData.priceType === 'variable' ? {
                backgroundColor: '#eb278d'
              } : {}} onPress={() => setFormData({
                ...formData,
                priceType: 'variable'
              })}>
                  <Text className={`text-sm font-medium ${formData.priceType === 'variable' ? 'text-white' : 'text-gray-700'}`}>
                    Variable
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {errors.basePrice && <Text className="text-[#FF0000] text-xs mt-1">{errors.basePrice}</Text>}
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Duration (minutes) *</Text>
            <View className="flex-row flex-wrap gap-2 mt-2">
              {[15, 30, 45, 60, 90, 120].map(mins => <TouchableOpacity key={mins} className={`px-4 py-2 rounded-lg ${formData.duration === mins ? '' : 'bg-gray-100 border border-gray-300'}`} style={formData.duration === mins ? {
              backgroundColor: '#eb278d'
            } : {}} onPress={() => {
              setFormData({
                ...formData,
                duration: mins
              });
              setErrors({
                ...errors,
                duration: ''
              });
            }}>
                  <Text className={`text-sm font-medium ${formData.duration === mins ? 'text-white' : 'text-gray-700'}`}>
                    {mins} min
                  </Text>
                </TouchableOpacity>)}
            </View>
            {errors.duration && <Text className="text-[#FF0000] text-xs mt-1">{errors.duration}</Text>}
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Service Location & Radius *</Text>
            <View className="flex-row items-center gap-3 mb-2">
              <View className="flex-1 flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
                <Ionicons name="location-outline" size={20} color="#eb278d" />
                <TextInput className="flex-1 py-3.5 px-3 text-base text-gray-900" placeholder="Radius (km)" placeholderTextColor="#999" value={(formData.serviceArea.radius / 1000).toString()} onChangeText={text => {
                const km = parseFloat(text) || 10;
                setFormData({
                  ...formData,
                  serviceArea: {
                    ...formData.serviceArea,
                    radius: km * 1000
                  }
                });
              }} keyboardType="numeric" />
              </View>
              <TouchableOpacity className="px-4 py-3.5 rounded-xl flex-row items-center" style={{
              backgroundColor: '#eb278d'
            }} onPress={getCurrentLocation} disabled={loadingLocation}>
                {loadingLocation ? <ActivityIndicator size="small" color="#fff" /> : <>
                    <Ionicons name="navigate" size={18} color="#fff" />
                    <Text className="text-white text-sm font-medium ml-1">Set GPS</Text>
                  </>}
              </TouchableOpacity>
            </View>
            {formData.serviceArea.coordinates.length > 0 && <View className="flex-row items-center mt-1">
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text className="text-xs text-green-600 ml-1">
                  Location set: {formData.serviceArea.coordinates[1].toFixed(4)}, {formData.serviceArea.coordinates[0].toFixed(4)}
                </Text>
              </View>}
            {errors.location && <Text className="text-[#FF0000] text-xs mt-1">{errors.location}</Text>}
          </View>

          {}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-gray-900 mb-2">
              Service Images ({selectedImages.length}/5)
            </Text>
            <TouchableOpacity className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center bg-gray-50" onPress={pickImages} disabled={selectedImages.length >= 5}>
              <Ionicons name="cloud-upload-outline" size={32} color="#eb278d" />
              <Text className="font-medium mt-2" style={{
              color: '#eb278d'
            }}>
                {selectedImages.length >= 5 ? 'Maximum Images Reached' : 'Upload Images'}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">Max 5 images</Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                {selectedImages.map((image, index) => <View key={index} className="relative mr-2">
                    <Image source={{
                uri: image.uri
              }} className="w-20 h-20 rounded-lg" />
                    <TouchableOpacity className="absolute -top-2 -right-2 bg-[#FF0000] rounded-full p-1" onPress={() => removeImage(index)}>
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>)}
              </ScrollView>}
          </View>
        </ScrollView>

        {}
        <View className="flex-row p-5 gap-3 border-t border-gray-200">
          <TouchableOpacity className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center border border-gray-300" onPress={handleClose} disabled={loading}>
            <Text className="text-gray-700 text-base font-semibold">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 py-3.5 rounded-xl items-center" style={{
          backgroundColor: '#eb278d'
        }} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-semibold">
                {service ? 'Update' : 'Save'} Service
              </Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>;
};
export default AddServiceModal;