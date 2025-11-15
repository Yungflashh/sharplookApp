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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { vendorAPI, categoriesAPI, handleAPIError } from '@/api/api';
import { Input, Button } from '@/components/ui/forms';
import CategorySelector from './components/CategorySelector';
import LocationPicker from './components/LocationPicker';

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

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [vendorType, setVendorType] = useState<VendorType>('home_service');
  const [location, setLocation] = useState<{
    coordinates: number[];
    address: string;
  } | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Field errors
  const [errors, setErrors] = useState({
    businessName: '',
    businessDescription: '',
    categories: '',
    location: '',
  });

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is required to set your business location.'
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
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
        Alert.alert(
          'Success',
          'Vendor profile created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigation will be handled by auth state change
                console.log('Vendor profile setup complete');
              },
            },
          ]
        );
      } else {
        setGeneralError(response.message || 'Failed to create vendor profile');
      }
    } catch (error: any) {
      console.error('Vendor setup error:', error);
      const apiError = handleAPIError(error);

      // Handle field-specific errors
      if (apiError.fieldErrors) {
        const newErrors = { ...errors };
        Object.keys(apiError.fieldErrors).forEach((field) => {
          if (field in newErrors) {
            (newErrors as any)[field] = apiError.fieldErrors![field];
          }
        });
        setErrors(newErrors);
      }

      // Show general error
      if (apiError.isNetworkError) {
        setGeneralError('Network error. Please check your internet connection.');
      } else {
        setGeneralError(apiError.message || 'Failed to setup vendor profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCategoryNames = () => {
    return categories
      .filter((cat) => selectedCategories.includes(cat._id))
      .map((cat) => cat.name)
      .join(', ');
  };

  const vendorTypeOptions = [
    { value: 'home_service', label: 'Home Service', icon: 'home-outline' },
    { value: 'in_shop', label: 'In-Shop', icon: 'storefront-outline' },
    { value: 'both', label: 'Both', icon: 'duplicate-outline' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 10,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Back Button */}
          <View className="flex-row items-center mb-8">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="mr-4 bg-white p-2 rounded-full"
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-black">Vendor Profile Setup</Text>
          </View>

          {/* Icon/Illustration */}
          <View className="items-center mb-6">
            <View className="bg-pink-50 p-6 rounded-full mb-4">
              <Ionicons name="business" size={48} color="#ec4899" />
            </View>
            <Text className="text-2xl font-bold text-black mb-2 text-center">
              Complete Your Profile
            </Text>
            <Text className="text-base text-gray-700 text-center px-4">
              Tell us about your business to get started
            </Text>
          </View>

          {/* General Error Message */}
          {generalError ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex-row items-start">
              <Ionicons
                name="alert-circle"
                size={20}
                color="#DC2626"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text className="text-red-600 text-sm flex-1">{generalError}</Text>
            </View>
          ) : null}

          {/* Business Name */}
          <Input
            label="Business Name"
            placeholder="Enter your business name"
            value={businessName}
            onChangeText={(text) => {
              setBusinessName(text);
              setErrors({ ...errors, businessName: '' });
              setGeneralError('');
            }}
            error={errors.businessName}
            editable={!loading}
            containerClassName="mb-6"
          />

          {/* Business Description */}
          <Input
            label="Business Description"
            placeholder="Describe your business and services"
            value={businessDescription}
            onChangeText={(text) => {
              setBusinessDescription(text);
              setErrors({ ...errors, businessDescription: '' });
              setGeneralError('');
            }}
            error={errors.businessDescription}
            editable={!loading}
            multiline
            numberOfLines={4}
            containerClassName="mb-6"
          />

          {/* Service Categories */}
          <View className="mb-6">
            <View className="relative">
              <View className="absolute -top-3 left-3 bg-white px-2 z-10">
                <Text className="text-base font-normal text-gray-700">
                  Service Categories
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCategorySelector(true)}
                disabled={loading || loadingCategories}
                className={`w-full px-4 py-4 rounded-xl border bg-white ${
                  errors.categories ? 'border-pink-500' : 'border-pink-100'
                }`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`flex-1 text-base ${
                      selectedCategories.length > 0 ? 'text-black' : 'text-gray-400'
                    }`}
                    numberOfLines={2}
                  >
                    {selectedCategories.length > 0
                      ? getSelectedCategoryNames()
                      : 'Select service categories'}
                  </Text>
                  {loadingCategories ? (
                    <ActivityIndicator size="small" color="#ec4899" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
            {errors.categories ? (
              <Text className="text-pink-500 text-xs mt-1.5 ml-1">
                {errors.categories}
              </Text>
            ) : null}
          </View>

          {/* Vendor Type */}
          <View className="mb-6">
            <Text className="text-base font-normal text-gray-700 mb-3 ml-1">
              Service Type
            </Text>
            <View className="flex-row gap-3">
              {vendorTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setVendorType(option.value as VendorType)}
                  disabled={loading}
                  className={`flex-1 px-4 py-4 rounded-xl border ${
                    vendorType === option.value
                      ? 'bg-pink-50 border-pink-500'
                      : 'bg-white border-gray-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="items-center">
                    <Ionicons
                      name={option.icon as any}
                      size={28}
                      color={vendorType === option.value ? '#ec4899' : '#6B7280'}
                    />
                    <Text
                      className={`text-sm font-medium mt-2 ${
                        vendorType === option.value ? 'text-pink-600' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View className="mb-8">
            <View className="relative">
              <View className="absolute -top-3 left-3 bg-white px-2 z-10">
                <Text className="text-base font-normal text-gray-700">
                  Business Location
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLocationPicker(true)}
                disabled={loading}
                className={`w-full px-4 py-4 rounded-xl border bg-white ${
                  errors.location ? 'border-pink-500' : 'border-pink-100'
                }`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center">
                    <Ionicons
                      name="location"
                      size={20}
                      color={location ? '#ec4899' : '#9CA3AF'}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className={`flex-1 text-base ${
                        location ? 'text-black' : 'text-gray-400'
                      }`}
                      numberOfLines={2}
                    >
                      {location ? location.address : 'Set your business location'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            </View>
            {errors.location ? (
              <Text className="text-pink-500 text-xs mt-1.5 ml-1">
                {errors.location}
              </Text>
            ) : null}
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Submit Button */}
          <Button
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || loadingCategories}
            containerClassName="mb-4"
          >
            Complete Setup
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selector Modal */}
      <CategorySelector
        visible={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        categories={categories}
        selectedCategories={selectedCategories}
        onSelect={(selected) => {
          setSelectedCategories(selected);
          setErrors({ ...errors, categories: '' });
          setGeneralError('');
        }}
      />

      {/* Location Picker Modal */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={(loc) => {
          setLocation(loc);
          setErrors({ ...errors, location: '' });
          setGeneralError('');
        }}
        currentLocation={location}
      />
    </SafeAreaView>
  );
};

export default VendorProfileSetup;
