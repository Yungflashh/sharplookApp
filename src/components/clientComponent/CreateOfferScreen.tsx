import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { categoriesAPI, offerAPI, handleAPIError } from '@/api/api';

const CreateOfferScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [errors, setErrors] = useState<any>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    serviceType: 'both' as 'home' | 'shop' | 'both', // ✅ NEW FIELD
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
    setLoadingCategories(true);
    try {
      const response = await categoriesAPI.getAll();
      console.log('Categories API Response:', JSON.stringify(response, null, 2));
      
      const apiData = response.data || response;
      const categoryData = apiData.data || apiData || [];
      
      console.log('Loaded Categories:', categoryData);
      setCategories(categoryData);
      
      if (categoryData.length === 0) {
        Alert.alert('Notice', 'No categories available. Please try again later.');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please check your connection.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
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
      setErrors({ ...errors, location: '' });
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
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    } else {
      const categoryExists = categories.some(cat => cat._id === formData.category);
      if (!categoryExists) {
        console.error('Selected category not found in categories list:', formData.category);
        newErrors.category = 'Invalid category selected. Please select again.';
      }
    }
    
    if (!formData.proposedPrice || parseFloat(formData.proposedPrice) <= 0) {
      newErrors.proposedPrice = 'Price must be greater than 0';
    }
    
    // ✅ NEW: Location validation based on serviceType
    if (formData.serviceType === 'home' || formData.serviceType === 'both') {
      if (!formData.location.coordinates || formData.location.coordinates.length === 0) {
        newErrors.location = 'Location is required for home service';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      console.log('Validation failed:', errors);
      return;
    }

    setLoading(true);
    try {
      // ✅ NEW: Only include location if serviceType requires it
      const offerData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        serviceType: formData.serviceType, // ✅ NEW FIELD
        proposedPrice: parseFloat(formData.proposedPrice),
        preferredDate: formData.preferredDate || undefined,
        preferredTime: formData.preferredTime || undefined,
        flexibility: formData.flexibility,
        expiresInDays: formData.expiresInDays
      };

      // ✅ Only include location for home service
      if (formData.serviceType === 'home' || formData.serviceType === 'both') {
        offerData.location = formData.location;
      }

      console.log('Submitting offer data:', JSON.stringify(offerData, null, 2));
      console.log('Selected category ID:', formData.category);
      console.log('Service Type:', formData.serviceType);
      console.log('Available categories:', categories.map(c => ({ id: c._id, name: c.name })));

      const response = await offerAPI.createOffer(offerData, selectedImages);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Offer created successfully! Vendors will be able to respond soon.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Service type options
  const serviceTypeOptions = [
    {
      key: 'home',
      label: 'Home Service',
      icon: 'home',
      description: 'Vendor comes to you',
      color: '#10b981'
    },
    {
      key: 'shop',
      label: 'In-Shop',
      icon: 'storefront',
      description: 'You go to vendor',
      color: '#3b82f6'
    },
    {
      key: 'both',
      label: 'Flexible',
      icon: 'repeat',
      description: 'Either location',
      color: '#f59e0b'
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          shadowColor: '#eb278d',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-white">Make an Offer</Text>
            <View className="w-10" />
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5 py-6">
            {/* Info Banner */}
            <View
              className="bg-white rounded-3xl p-5 mb-6"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-start">
                <View className="w-12 h-12 rounded-full bg-pink-100 items-center justify-center mr-4">
                  <Ionicons name="bulb" size={24} color="#eb278d" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900 mb-2">
                    How it works
                  </Text>
                  <Text className="text-sm text-gray-600 leading-5">
                    Describe what you need and set your budget. Vendors will respond with their best proposals!
                  </Text>
                </View>
              </View>
            </View>

            {/* Title */}
            <View className="mb-5">
              <Text className="text-base font-bold text-gray-900 mb-3">
                What do you need? *
              </Text>
              <TextInput
                className={`border-2 ${errors.title ? 'border-red-500' : 'border-gray-200'} rounded-2xl px-4 py-4 text-base text-gray-900 bg-white`}
                placeholder="e.g., Hair styling for wedding"
                placeholderTextColor="#9ca3af"
                value={formData.title}
                onChangeText={text => {
                  setFormData({ ...formData, title: text });
                  setErrors({ ...errors, title: '' });
                }}
              />
              {errors.title && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text className="text-red-500 text-xs ml-1">{errors.title}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View className="mb-5">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Description *
              </Text>
              <TextInput
                className={`border-2 ${errors.description ? 'border-red-500' : 'border-gray-200'} rounded-2xl px-4 py-4 text-base text-gray-900 bg-white`}
                placeholder="Describe your requirements in detail..."
                placeholderTextColor="#9ca3af"
                value={formData.description}
                onChangeText={text => {
                  setFormData({ ...formData, description: text });
                  setErrors({ ...errors, description: '' });
                }}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={{ minHeight: 120 }}
              />
              {errors.description && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text className="text-red-500 text-xs ml-1">{errors.description}</Text>
                </View>
              )}
            </View>

            {/* Category */}
            <View className="mb-5">
              <Text className="text-base font-bold text-gray-900 mb-3">Category *</Text>
              
              {loadingCategories ? (
                <View className="py-8 items-center bg-white rounded-2xl">
                  <ActivityIndicator size="large" color="#eb278d" />
                  <Text className="text-gray-500 text-sm mt-3 font-medium">Loading categories...</Text>
                </View>
              ) : categories.length === 0 ? (
                <View className="py-8 items-center bg-white rounded-2xl">
                  <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-500 text-sm mt-3">No categories available</Text>
                  <TouchableOpacity onPress={loadCategories} className="mt-3 bg-pink-100 px-4 py-2 rounded-full">
                    <Text className="text-pink-700 text-sm font-semibold">Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat._id}
                      className={`px-5 py-3 rounded-2xl border-2 ${
                        formData.category === cat._id
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => {
                        console.log('Selected category:', cat._id, cat.name);
                        setFormData({ ...formData, category: cat._id });
                        setErrors({ ...errors, category: '' });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-sm font-bold ${
                          formData.category === cat._id ? 'text-pink-700' : 'text-gray-700'
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {errors.category && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text className="text-red-500 text-xs ml-1">{errors.category}</Text>
                </View>
              )}
            </View>

            {/* ✅ NEW: Service Type Selector */}
            <View className="mb-5">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Service Type *
              </Text>
              <View className="gap-3">
                {serviceTypeOptions.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    className={`border-2 rounded-2xl p-4 bg-white ${
                      formData.serviceType === option.key
                        ? 'border-pink-500'
                        : 'border-gray-200'
                    }`}
                    onPress={() => {
                      setFormData({ ...formData, serviceType: option.key as any });
                      // Clear location error if switching to shop-only
                      if (option.key === 'shop') {
                        setErrors({ ...errors, location: '' });
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center mr-4`}
                        style={{
                          backgroundColor: formData.serviceType === option.key
                            ? `${option.color}15`
                            : '#f3f4f6'
                        }}
                      >
                        <Ionicons
                          name={option.icon as any}
                          size={24}
                          color={formData.serviceType === option.key ? option.color : '#9ca3af'}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-base font-bold mb-1 ${
                            formData.serviceType === option.key
                              ? 'text-gray-900'
                              : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {option.description}
                        </Text>
                      </View>
                      {formData.serviceType === option.key && (
                        <View className="w-6 h-6 rounded-full bg-pink-500 items-center justify-center">
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ✅ Info text based on selection */}
              {formData.serviceType === 'home' && (
                <View className="flex-row items-start mt-3 bg-green-50 p-3 rounded-xl">
                  <Ionicons name="information-circle" size={16} color="#10b981" style={{ marginTop: 2 }} />
                  <Text className="text-xs text-green-700 ml-2 flex-1">
                    Location is required. Vendors will come to your specified address.
                  </Text>
                </View>
              )}
              {formData.serviceType === 'shop' && (
                <View className="flex-row items-start mt-3 bg-blue-50 p-3 rounded-xl">
                  <Ionicons name="information-circle" size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                  <Text className="text-xs text-blue-700 ml-2 flex-1">
                    You'll visit the vendor's location. No address needed.
                  </Text>
                </View>
              )}
              {formData.serviceType === 'both' && (
                <View className="flex-row items-start mt-3 bg-amber-50 p-3 rounded-xl">
                  <Ionicons name="information-circle" size={16} color="#f59e0b" style={{ marginTop: 2 }} />
                  <Text className="text-xs text-amber-700 ml-2 flex-1">
                    Vendors can offer either home service or in-shop service.
                  </Text>
                </View>
              )}
            </View>

            {/* Budget */}
            <View className="mb-5">
              <Text className="text-base font-bold text-gray-900 mb-3">Your Budget *</Text>
              <View
                className={`flex-row items-center border-2 ${
                  errors.proposedPrice ? 'border-red-500' : 'border-gray-200'
                } rounded-2xl px-4 bg-white`}
              >
                <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                  <Ionicons name="cash" size={20} color="#eb278d" />
                </View>
                <TextInput
                  className="flex-1 py-4 text-lg font-bold text-gray-900"
                  placeholder="0"
                  placeholderTextColor="#d1d5db"
                  value={formData.proposedPrice}
                  onChangeText={text => {
                    setFormData({
                      ...formData,
                      proposedPrice: text.replace(/[^0-9]/g, '')
                    });
                    setErrors({ ...errors, proposedPrice: '' });
                  }}
                  keyboardType="numeric"
                />
                <Text className="text-gray-500 text-base font-medium">NGN</Text>
              </View>
              {errors.proposedPrice && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text className="text-red-500 text-xs ml-1">{errors.proposedPrice}</Text>
                </View>
              )}
            </View>

            {/* Time Flexibility */}
            <View className="mb-5">
              <Text className="text-base font-bold text-gray-900 mb-3">Time Flexibility</Text>
              <View className="flex-row gap-3">
                {[
                  { key: 'flexible', label: 'Flexible', icon: 'time' },
                  { key: 'specific', label: 'Specific', icon: 'calendar' },
                  { key: 'urgent', label: 'Urgent', icon: 'flash' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.key}
                    className={`flex-1 py-4 rounded-2xl border-2 ${
                      formData.flexibility === option.key
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() =>
                      setFormData({ ...formData, flexibility: option.key as any })
                    }
                    activeOpacity={0.7}
                  >
                    <View className="items-center">
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={formData.flexibility === option.key ? '#eb278d' : '#6b7280'}
                      />
                      <Text
                        className={`mt-1.5 text-xs font-bold ${
                          formData.flexibility === option.key ? 'text-pink-700' : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Preferred Date & Time */}
            {formData.flexibility !== 'flexible' && (
              <View className="mb-5">
                <Text className="text-base font-bold text-gray-900 mb-3">
                  Preferred Date & Time
                </Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <TextInput
                      className="border-2 border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-900 bg-white"
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                      value={formData.preferredDate}
                      onChangeText={text =>
                        setFormData({ ...formData, preferredDate: text })
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <TextInput
                      className="border-2 border-gray-200 rounded-2xl px-4 py-4 text-base text-gray-900 bg-white"
                      placeholder="HH:MM"
                      placeholderTextColor="#9ca3af"
                      value={formData.preferredTime}
                      onChangeText={text =>
                        setFormData({ ...formData, preferredTime: text })
                      }
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ✅ UPDATED: Location - Only show for home/both service */}
            {(formData.serviceType === 'home' || formData.serviceType === 'both') && (
              <View className="mb-5">
                <Text className="text-base font-bold text-gray-900 mb-3">
                  Location {formData.serviceType === 'home' ? '*' : '(Optional)'}
                </Text>
                <TouchableOpacity
                  className={`border-2 ${
                    errors.location ? 'border-red-500' : 'border-gray-200'
                  } rounded-2xl p-4 bg-white`}
                  onPress={getCurrentLocation}
                  disabled={loadingLocation}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                      <Ionicons name="location" size={20} color="#3b82f6" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-base font-medium ${
                          formData.location.address ? 'text-gray-900' : 'text-gray-400'
                        }`}
                        numberOfLines={1}
                      >
                        {formData.location.address || 'Tap to set your location'}
                      </Text>
                      {formData.location.city && (
                        <Text className="text-xs text-gray-500 mt-1">
                          {formData.location.city}, {formData.location.state}
                        </Text>
                      )}
                    </View>
                    {loadingLocation ? (
                      <ActivityIndicator size="small" color="#eb278d" />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    )}
                  </View>
                </TouchableOpacity>
                {errors.location && (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text className="text-red-500 text-xs ml-1">{errors.location}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Offer Valid For */}
            <View className="mb-5">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Offer Valid For
              </Text>
              <View className="flex-row gap-3">
                {[3, 7, 14, 30].map(days => (
                  <TouchableOpacity
                    key={days}
                    className={`flex-1 py-4 rounded-2xl border-2 ${
                      formData.expiresInDays === days
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() =>
                      setFormData({ ...formData, expiresInDays: days })
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-center text-sm font-bold ${
                        formData.expiresInDays === days ? 'text-pink-700' : 'text-gray-700'
                      }`}
                    >
                      {days}
                    </Text>
                    <Text
                      className={`text-center text-xs mt-0.5 ${
                        formData.expiresInDays === days ? 'text-pink-600' : 'text-gray-500'
                      }`}
                    >
                      days
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Images */}
            <View className="mb-6">
              <Text className="text-base font-bold text-gray-900 mb-3">
                Add Images ({selectedImages.length}/5)
              </Text>
              <TouchableOpacity
                className="border-2 border-dashed border-gray-300 rounded-3xl p-8 items-center bg-white"
                onPress={pickImages}
                disabled={selectedImages.length >= 5}
                activeOpacity={0.7}
              >
                <View className="w-16 h-16 rounded-full bg-pink-100 items-center justify-center mb-3">
                  <Ionicons name="cloud-upload" size={32} color="#eb278d" />
                </View>
                <Text className="font-bold text-pink-700 mb-1">
                  {selectedImages.length >= 5 ? 'Maximum Reached' : 'Upload Images'}
                </Text>
                <Text className="text-xs text-gray-500">Max 5 images (optional)</Text>
              </TouchableOpacity>

              {selectedImages.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mt-4"
                  contentContainerStyle={{ gap: 12 }}
                >
                  {selectedImages.map((image, index) => (
                    <View key={index} className="relative">
                      <Image
                        source={{ uri: image.uri }}
                        className="w-24 h-24 rounded-2xl"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center"
                        onPress={() => removeImage(index)}
                        style={{
                          shadowColor: '#ef4444',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 3,
                          elevation: 4,
                        }}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View className="bg-white px-5 py-4 border-t border-gray-100">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={['#eb278d', '#f472b6']}
              className="py-4 rounded-2xl items-center"
              style={{
                shadowColor: '#eb278d',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text className="text-white font-bold text-base ml-2">Submit Offer</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateOfferScreen;