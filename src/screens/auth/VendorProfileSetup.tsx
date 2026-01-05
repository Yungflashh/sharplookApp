import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { vendorAPI, categoriesAPI, handleAPIError } from '@/api/api';

type VendorType = 'home_service' | 'in_shop' | 'both';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
}

const VendorProfileSetup = () => {
  const navigation = useNavigation();
  
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [vendorType, setVendorType] = useState<VendorType>('home_service');
  const [location, setLocation] = useState<{
    coordinates: number[];
    address: string;
    city: string;
    state: string;
    country: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState({
    businessName: '',
    businessDescription: '',
    categories: '',
    location: '',
  });

  const [expandedSection, setExpandedSection] = useState<string | null>('business');

  useEffect(() => {
    fetchCategories();
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermissionGranted(status === 'granted');
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionGranted(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setErrors({ ...errors, location: '' });

    try {
      if (!locationPermissionGranted) {
        const granted = await requestLocationPermission();
        if (!granted) {
          Alert.alert(
            'Location Permission Required',
            'Please enable location permissions in your device settings to use this feature.'
          );
          setLocationLoading(false);
          return;
        }
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;

      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (geocode && geocode.length > 0) {
        const addressData = geocode[0];

        const locationData = {
          coordinates: [longitude, latitude],
          address:
            `${addressData.street || ''} ${addressData.streetNumber || ''}`.trim() ||
            'Address not available',
          city: addressData.city || addressData.subregion || 'Unknown City',
          state: addressData.region || 'Unknown State',
          country: addressData.country || 'Nigeria',
        };

        setLocation(locationData);
        Alert.alert('Success', 'Location captured successfully!');
      } else {
        throw new Error('Unable to get address details');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      setErrors({ ...errors, location: 'Failed to get location. Please try again.' });
      Alert.alert(
        'Location Error',
        'Unable to get your location. Please ensure location services are enabled and try again.'
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await categoriesAPI.getAll();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message || 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      businessName: '',
      businessDescription: '',
      categories: '',
      location: '',
    };

    if (!businessName.trim()) {
      newErrors.businessName = 'Business name is required';
      valid = false;
    } else if (businessName.trim().length < 3) {
      newErrors.businessName = 'Business name must be at least 3 characters';
      valid = false;
    }

    if (!businessDescription.trim()) {
      newErrors.businessDescription = 'Business description is required';
      valid = false;
    } else if (businessDescription.trim().length < 20) {
      newErrors.businessDescription = 'Description must be at least 20 characters';
      valid = false;
    }

    if (selectedCategories.length === 0) {
      newErrors.categories = 'Please select at least one service category';
      valid = false;
    }

    if (!location) {
      newErrors.location = 'Please set your business location';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    setGeneralError('');
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const setupData = {
        businessName: businessName.trim(),
        businessDescription: businessDescription.trim(),
        serviceCategories: selectedCategories,
        vendorType,
        location: location!,
      };

      const response = await vendorAPI.setupProfile(setupData);

      if (response.success) {
        Alert.alert('Success', 'Vendor profile created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              console.log('Vendor profile setup complete');
              // Navigate to appropriate screen
            },
          },
        ]);
      } else {
        setGeneralError(response.message || 'Failed to create vendor profile');
      }
    } catch (error: any) {
      console.error('Vendor setup error:', error);
      const apiError = handleAPIError(error);

      if (apiError.fieldErrors) {
        const newErrors = { ...errors };
        Object.keys(apiError.fieldErrors).forEach((field) => {
          if (field in newErrors) {
            (newErrors as any)[field] = apiError.fieldErrors![field];
          }
        });
        setErrors(newErrors);
      }

      if (apiError.isNetworkError) {
        setGeneralError('Network error. Please check your internet connection.');
      } else {
        setGeneralError(apiError.message || 'Failed to setup vendor profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
    setErrors({ ...errors, categories: '' });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={28} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Vendor Profile Setup</Text>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Section */}
          <View className="items-center px-5 py-6">
            <View className="bg-pink-50 p-6 rounded-full mb-4">
              <MaterialCommunityIcons name="store" size={48} color="#ec4899" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Complete Your Profile
            </Text>
            <Text className="text-base text-gray-600 text-center">
              Tell us about your business to get started
            </Text>
          </View>

          <View className="px-5 pb-5">
            {/* General Error */}
            {generalError ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex-row items-start">
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                <Text className="text-red-600 text-sm flex-1 ml-2">{generalError}</Text>
              </View>
            ) : null}

            {/* Business Information Section */}
            <View className="bg-white rounded-2xl p-4 mb-4">
              <TouchableOpacity
                onPress={() => toggleSection('business')}
                className="flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="store" size={22} color="#ec4899" />
                  </View>
                  <Text className="text-base font-semibold text-gray-900">
                    Business Information *
                  </Text>
                </View>
                <Ionicons
                  name={expandedSection === 'business' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#9ca3af"
                />
              </TouchableOpacity>

              {expandedSection === 'business' && (
                <View className="pt-3 border-t border-gray-100">
                  {/* Business Name */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Business Name *</Text>
                    <TextInput
                      value={businessName}
                      onChangeText={(text) => {
                        setBusinessName(text);
                        setErrors({ ...errors, businessName: '' });
                        setGeneralError('');
                      }}
                      placeholder="Enter your business name"
                      editable={!loading}
                      className="border border-pink-200 rounded-xl px-4 py-3 text-gray-900 bg-white"
                      placeholderTextColor="#9ca3af"
                    />
                    {errors.businessName ? (
                      <Text className="text-red-600 text-xs mt-1.5">{errors.businessName}</Text>
                    ) : null}
                  </View>

                  {/* Business Description */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Business Description *
                    </Text>
                    <TextInput
                      value={businessDescription}
                      onChangeText={(text) => {
                        setBusinessDescription(text);
                        setErrors({ ...errors, businessDescription: '' });
                        setGeneralError('');
                      }}
                      placeholder="Describe your business and services"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      editable={!loading}
                      className="border border-pink-200 rounded-xl px-4 py-3 text-gray-900 bg-white min-h-[100px]"
                      placeholderTextColor="#9ca3af"
                    />
                    {errors.businessDescription ? (
                      <Text className="text-red-600 text-xs mt-1.5">
                        {errors.businessDescription}
                      </Text>
                    ) : null}
                  </View>

                  {/* Service Type */}
                  <View className="mb-2">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Service Type *</Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => setVendorType('home_service')}
                        disabled={loading}
                        className={`flex-1 p-3 rounded-xl border-2 ${
                          vendorType === 'home_service'
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 bg-white'
                        }`}
                        activeOpacity={0.7}
                      >
                        <View className="items-center">
                          <Ionicons
                            name="home-outline"
                            size={24}
                            color={vendorType === 'home_service' ? '#ec4899' : '#6b7280'}
                          />
                          <Text
                            className={`text-xs font-medium mt-1 ${
                              vendorType === 'home_service' ? 'text-pink-500' : 'text-gray-600'
                            }`}
                          >
                            Home Service
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setVendorType('in_shop')}
                        disabled={loading}
                        className={`flex-1 p-3 rounded-xl border-2 ${
                          vendorType === 'in_shop'
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 bg-white'
                        }`}
                        activeOpacity={0.7}
                      >
                        <View className="items-center">
                          <Ionicons
                            name="storefront-outline"
                            size={24}
                            color={vendorType === 'in_shop' ? '#ec4899' : '#6b7280'}
                          />
                          <Text
                            className={`text-xs font-medium mt-1 ${
                              vendorType === 'in_shop' ? 'text-pink-500' : 'text-gray-600'
                            }`}
                          >
                            In-Shop
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setVendorType('both')}
                        disabled={loading}
                        className={`flex-1 p-3 rounded-xl border-2 ${
                          vendorType === 'both'
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 bg-white'
                        }`}
                        activeOpacity={0.7}
                      >
                        <View className="items-center">
                          <Ionicons
                            name="duplicate-outline"
                            size={24}
                            color={vendorType === 'both' ? '#ec4899' : '#6b7280'}
                          />
                          <Text
                            className={`text-xs font-medium mt-1 ${
                              vendorType === 'both' ? 'text-pink-500' : 'text-gray-600'
                            }`}
                          >
                            Both
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Service Categories Section */}
            <View className="bg-white rounded-2xl p-4 mb-4">
              <TouchableOpacity
                onPress={() => toggleSection('categories')}
                className="flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center mr-3">
                    <Ionicons name="grid-outline" size={22} color="#ec4899" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      Service Categories *
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {selectedCategories.length} selected
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={expandedSection === 'categories' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#9ca3af"
                />
              </TouchableOpacity>

              {expandedSection === 'categories' && (
                <View className="pt-3 border-t border-gray-100">
                  {loadingCategories ? (
                    <View className="py-4">
                      <ActivityIndicator size="small" color="#ec4899" />
                    </View>
                  ) : categories.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category._id}
                          onPress={() => toggleCategory(category._id)}
                          disabled={loading}
                          className={`px-4 py-2.5 rounded-full border-2 ${
                            selectedCategories.includes(category._id)
                              ? 'border-pink-500 bg-pink-50'
                              : 'border-gray-200 bg-white'
                          }`}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              selectedCategories.includes(category._id)
                                ? 'text-pink-500'
                                : 'text-gray-600'
                            }`}
                          >
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-gray-500 text-center py-4">
                      No categories available
                    </Text>
                  )}
                  {errors.categories ? (
                    <Text className="text-red-600 text-xs mt-2">{errors.categories}</Text>
                  ) : null}
                </View>
              )}
            </View>

            {/* Business Location Section */}
            <View className="bg-white rounded-2xl p-4 mb-4">
              <TouchableOpacity
                onPress={() => toggleSection('location')}
                className="flex-row items-center justify-between mb-3"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center mr-3">
                    <Ionicons name="location-outline" size={22} color="#ec4899" />
                  </View>
                  <Text className="text-base font-semibold text-gray-900">
                    Business Location *
                  </Text>
                </View>
                <Ionicons
                  name={expandedSection === 'location' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#9ca3af"
                />
              </TouchableOpacity>

              {expandedSection === 'location' && (
                <View className="pt-3 border-t border-gray-100">
                  {location ? (
                    <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-2">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="location" size={20} color="#059669" />
                        <Text className="text-green-700 font-semibold ml-2">Location Added</Text>
                      </View>
                      <Text className="text-gray-700 text-sm mb-1">{location.address}</Text>
                      <Text className="text-gray-600 text-xs mb-3">
                        {location.city}, {location.state}, {location.country}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setLocation(null)}
                        className="mt-2"
                        activeOpacity={0.7}
                      >
                        <Text className="text-red-600 text-sm font-semibold">
                          Change Location
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={getCurrentLocation}
                      disabled={locationLoading || loading}
                      className={`bg-pink-50 border border-pink-200 rounded-xl p-4 flex-row items-center justify-center ${
                        locationLoading || loading ? 'opacity-50' : ''
                      }`}
                      activeOpacity={0.7}
                    >
                      {locationLoading ? (
                        <>
                          <ActivityIndicator size="small" color="#EC4899" />
                          <Text className="text-pink-600 font-semibold ml-3">
                            Getting Location...
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="location-outline" size={20} color="#EC4899" />
                          <Text className="text-pink-600 font-semibold ml-2">
                            Add Current Location
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {errors.location ? (
                    <Text className="text-red-600 text-xs mt-2">{errors.location}</Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View className="bg-white border-t border-gray-200 p-5">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || loadingCategories}
          className={`bg-pink-500 rounded-xl py-4 items-center ${
            loading || loadingCategories ? 'opacity-50' : ''
          }`}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-base">Complete Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VendorProfileSetup;