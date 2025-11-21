import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { vendorAPI, categoriesAPI } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Category {
  _id: string;
  name: string;
  icon?: string;
}

interface LocationData {
  type: 'Point';
  coordinates: [number, number];
  address: string;
  city: string;
  state: string;
  country: string;
}

const VendorStoreSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  
  const [isEditMode, setIsEditMode] = useState(false);
  
  
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [vendorType, setVendorType] = useState<'home_service' | 'in_shop' | 'both'>('home_service');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [serviceRadius, setServiceRadius] = useState('10');
  
  
  const [availability, setAvailability] = useState({
    monday: { isAvailable: true, from: '09:00', to: '17:00' },
    tuesday: { isAvailable: true, from: '09:00', to: '17:00' },
    wednesday: { isAvailable: true, from: '09:00', to: '17:00' },
    thursday: { isAvailable: true, from: '09:00', to: '17:00' },
    friday: { isAvailable: true, from: '09:00', to: '17:00' },
    saturday: { isAvailable: true, from: '09:00', to: '17:00' },
    sunday: { isAvailable: false, from: '09:00', to: '17:00' },
  });

  const [expandedSection, setExpandedSection] = useState<string | null>('business');

  useEffect(() => {
    loadData();
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
    setLocationError('');

    try {
      
      if (!locationPermissionGranted) {
        const granted = await requestLocationPermission();
        if (!granted) {
          setLocationError('Location permission is required');
          Alert.alert(
            'Location Permission Required',
            'Please enable location permissions in your device settings to use this feature.',
            [{ text: 'OK' }]
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
        
        const locationData: LocationData = {
          type: 'Point',
          coordinates: [longitude, latitude],
          address: `${addressData.street || ''} ${addressData.streetNumber || ''}`.trim() || 'Address not available',
          city: addressData.city || addressData.subregion || 'Unknown City',
          state: addressData.region || 'Unknown State',
          country: addressData.country || 'Unknown Country',
        };

        setLocation(locationData);
        Alert.alert('Success', 'Location captured successfully!');
      } else {
        throw new Error('Unable to get address details');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      setLocationError('Failed to get location. Please try again.');
      Alert.alert(
        'Location Error',
        'Unable to get your location. Please ensure location services are enabled and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadVendorProfile(), loadCategories()]);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', 'Failed to load store settings');
    } finally {
      setLoading(false);
    }
  };

  const loadVendorProfile = async () => {
    try {
      console.log('📥 Loading vendor profile...');
      const response = await vendorAPI.getMyProfile();
      console.log('✅ Vendor profile response:', response);
      
      if (response.success && response.data.vendor) {
        const vendor = response.data.vendor;
        console.log('👤 Vendor data:', vendor);
        console.log('🏪 Vendor profile:', vendor.vendorProfile);
        
        setBusinessName(vendor.vendorProfile?.businessName || '');
        setBusinessDescription(vendor.vendorProfile?.businessDescription || '');
        setVendorType(vendor.vendorProfile?.vendorType || 'home_service');
        
        
        if (vendor.vendorProfile?.categories) {
          const categoryIds = vendor.vendorProfile.categories.map((cat: any) => {
            console.log('📦 Category:', cat);
            return typeof cat === 'string' ? cat : cat._id;
          });
          console.log('✅ Selected categories:', categoryIds);
          setSelectedCategories(categoryIds);
        }
        
        
        if (vendor.vendorProfile?.location) {
          const loc = vendor.vendorProfile.location;
          setLocation({
            type: 'Point',
            coordinates: loc.coordinates,
            address: loc.address || '',
            city: loc.city || '',
            state: loc.state || '',
            country: loc.country || 'Nigeria',
          });
        }
        
        setServiceRadius(String(vendor.vendorProfile?.serviceRadius || 10));
        
        
        if (vendor.vendorProfile?.availabilitySchedule) {
          setAvailability(vendor.vendorProfile.availabilitySchedule);
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading vendor profile:', error);
      console.error('❌ Error details:', error.response?.data);
      throw error;
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log('📥 Loading categories...');
      const response = await categoriesAPI.getActiveCategories();
      console.log('✅ Categories response:', response);
      
      if (response.success && response.data) {
        const categories = Array.isArray(response.data) ? response.data : [];
        console.log('📦 Extracted categories:', categories);
        setAvailableCategories(categories);
      }
    } catch (error: any) {
      console.error('❌ Error loading categories:', error);
      console.error('❌ Error details:', error.response?.data);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSave = async () => {
    try {
      
      if (!businessName.trim()) {
        Alert.alert('Error', 'Business name is required');
        return;
      }

      if (!businessDescription.trim()) {
        Alert.alert('Error', 'Business description is required');
        return;
      }

      if (selectedCategories.length === 0) {
        Alert.alert('Error', 'Please select at least one category');
        return;
      }

      if (!location) {
        Alert.alert('Error', 'Please add your business location');
        return;
      }

      setSaving(true);

      const updateData = {
        businessName: businessName.trim(),
        businessDescription: businessDescription.trim(),
        vendorType,
        categories: selectedCategories,
        location: {
          type: 'Point' as const,
          coordinates: location.coordinates,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
        },
        serviceRadius: parseFloat(serviceRadius),
        availabilitySchedule: availability,
      };

      console.log('💾 Saving update data:', updateData);
      const response = await vendorAPI.updateMyProfile(updateData);
      console.log('✅ Update response:', response);

      if (response.success) {
        
        const currentUser = await getStoredUser();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            vendorProfile: response.data.vendor.vendorProfile,
          };
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        }

        
        setIsEditMode(false);

        Alert.alert('Success', 'Store settings updated successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      console.error('❌ Error saving store settings:', error);
      console.error('❌ Error details:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update store settings'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (!isEditMode) return;
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const toggleDay = (day: string) => {
    if (!isEditMode) return;
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        isAvailable: !prev[day as keyof typeof prev].isAvailable,
      },
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ec4899" />
          <Text className="text-gray-600 mt-4">Loading store settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={28} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Store Settings</Text>
          
          {}
          <TouchableOpacity
            onPress={toggleEditMode}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              isEditMode ? 'bg-pink-100' : 'bg-gray-100'
            }`}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isEditMode ? "checkmark" : "pencil"} 
              size={20} 
              color={isEditMode ? "#ec4899" : "#6b7280"} 
            />
          </TouchableOpacity>
        </View>
        
        {}
        {isEditMode && (
          <View className="bg-pink-50 px-5 py-2 border-t border-pink-100">
            <View className="flex-row items-center">
              <Ionicons name="pencil" size={14} color="#ec4899" />
              <Text className="text-pink-600 text-xs font-semibold ml-2">
                Edit Mode Active - You can now make changes
              </Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          {}
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
                  Business Information
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
                {}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="Enter your business name"
                      editable={isEditMode}
                      className={`border rounded-xl px-4 py-3 text-gray-900 ${
                        isEditMode 
                          ? 'bg-white border-pink-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      placeholderTextColor="#9ca3af"
                    />
                    {!isEditMode && (
                      <View className="absolute right-3 top-3">
                        <Ionicons name="lock-closed" size={16} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                </View>

                {}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Business Description *
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={businessDescription}
                      onChangeText={setBusinessDescription}
                      placeholder="Describe your business..."
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      editable={isEditMode}
                      className={`border rounded-xl px-4 py-3 text-gray-900 min-h-[100px] ${
                        isEditMode 
                          ? 'bg-white border-pink-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      placeholderTextColor="#9ca3af"
                    />
                    {!isEditMode && (
                      <View className="absolute right-3 top-3">
                        <Ionicons name="lock-closed" size={16} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                </View>

                {}
                <View className="mb-2">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Service Type *
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => isEditMode && setVendorType('home_service')}
                      disabled={!isEditMode}
                      className={`flex-1 p-3 rounded-xl border-2 ${
                        vendorType === 'home_service'
                          ? 'border-pink-500 bg-pink-50'
                          : isEditMode 
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <Text
                        className={`text-center text-sm font-medium ${
                          vendorType === 'home_service' ? 'text-pink-500' : 'text-gray-600'
                        }`}
                      >
                        Home Service
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => isEditMode && setVendorType('in_shop')}
                      disabled={!isEditMode}
                      className={`flex-1 p-3 rounded-xl border-2 ${
                        vendorType === 'in_shop'
                          ? 'border-pink-500 bg-pink-50'
                          : isEditMode 
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <Text
                        className={`text-center text-sm font-medium ${
                          vendorType === 'in_shop' ? 'text-pink-500' : 'text-gray-600'
                        }`}
                      >
                        In-Shop
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => isEditMode && setVendorType('both')}
                      disabled={!isEditMode}
                      className={`flex-1 p-3 rounded-xl border-2 ${
                        vendorType === 'both'
                          ? 'border-pink-500 bg-pink-50'
                          : isEditMode 
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <Text
                        className={`text-center text-sm font-medium ${
                          vendorType === 'both' ? 'text-pink-500' : 'text-gray-600'
                        }`}
                      >
                        Both
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {}
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
                  <Text className="text-base font-semibold text-gray-900">Categories *</Text>
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
                ) : availableCategories.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {availableCategories.map((category) => (
                      <TouchableOpacity
                        key={category._id}
                        onPress={() => toggleCategory(category._id)}
                        disabled={!isEditMode}
                        className={`px-4 py-2.5 rounded-full border-2 ${
                          selectedCategories.includes(category._id)
                            ? 'border-pink-500 bg-pink-50'
                            : isEditMode
                            ? 'border-gray-200 bg-white'
                            : 'border-gray-200 bg-gray-50'
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
                  <Text className="text-gray-500 text-center py-4">No categories available</Text>
                )}
              </View>
            )}
          </View>

          {}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <TouchableOpacity
              onPress={() => toggleSection('location')}
              className="flex-row items-center justify-between mb-3"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center mr-3">
                  <Ionicons name="location-outline" size={22} color="#ec4899" />
                </View>
                <Text className="text-base font-semibold text-gray-900">Business Location *</Text>
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
                  <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="location" size={20} color="#059669" />
                      <Text className="text-green-700 font-semibold ml-2">Location Added</Text>
                    </View>
                    <Text className="text-gray-700 text-sm mb-1">
                      {location.address}
                    </Text>
                    <Text className="text-gray-600 text-xs mb-3">
                      {location.city}, {location.state}, {location.country}
                    </Text>
                    {isEditMode && (
                      <TouchableOpacity
                        onPress={() => setLocation(null)}
                        className="mt-2"
                        activeOpacity={0.7}
                      >
                        <Text className="text-red-600 text-sm font-semibold">Change Location</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={getCurrentLocation}
                    disabled={locationLoading || saving || !isEditMode}
                    className={`bg-pink-50 border border-pink-200 rounded-xl p-4 flex-row items-center justify-center mb-4 ${
                      locationLoading || saving || !isEditMode ? 'opacity-50' : ''
                    }`}
                    activeOpacity={0.7}
                  >
                    {locationLoading ? (
                      <>
                        <ActivityIndicator size="small" color="#EC4899" />
                        <Text className="text-pink-600 font-semibold ml-3">Getting Location...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="location-outline" size={20} color="#EC4899" />
                        <Text className="text-pink-600 font-semibold ml-2">Add Current Location</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {locationError ? (
                  <Text className="text-red-600 text-xs mb-3">{locationError}</Text>
                ) : null}

                {}
                <View className="mb-2">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Service Radius (km)
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={serviceRadius}
                      onChangeText={setServiceRadius}
                      placeholder="10"
                      keyboardType="numeric"
                      editable={isEditMode}
                      className={`border rounded-xl px-4 py-3 text-gray-900 ${
                        isEditMode 
                          ? 'bg-white border-pink-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      placeholderTextColor="#9ca3af"
                    />
                    {!isEditMode && (
                      <View className="absolute right-3 top-3">
                        <Ionicons name="lock-closed" size={16} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  <Text className="text-gray-500 text-xs mt-2">
                    Maximum distance you're willing to travel for home services
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Availability */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <TouchableOpacity
              onPress={() => toggleSection('availability')}
              className="flex-row items-center justify-between mb-3"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center mr-3">
                  <Ionicons name="time-outline" size={22} color="#ec4899" />
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  Availability Schedule
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'availability' ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#9ca3af"
              />
            </TouchableOpacity>

            {expandedSection === 'availability' && (
              <View className="pt-3 border-t border-gray-100">
                {Object.keys(availability).map((day, index) => (
                  <View
                    key={day}
                    className={`flex-row items-center justify-between py-3 ${
                      index !== Object.keys(availability).length - 1
                        ? 'border-b border-gray-100'
                        : ''
                    }`}
                  >
                    <View className="flex-row items-center flex-1">
                      <Switch
                        value={availability[day as keyof typeof availability].isAvailable}
                        onValueChange={() => toggleDay(day)}
                        disabled={!isEditMode}
                        trackColor={{ false: '#e5e7eb', true: '#fce7f3' }}
                        thumbColor={
                          availability[day as keyof typeof availability].isAvailable
                            ? '#ec4899'
                            : '#9ca3af'
                        }
                        ios_backgroundColor="#e5e7eb"
                      />
                      <Text className="text-sm font-medium text-gray-900 ml-3 capitalize">
                        {day}
                      </Text>
                    </View>
                    {availability[day as keyof typeof availability].isAvailable && (
                      <View className="flex-row items-center">
                        <Text className="text-xs text-gray-600">
                          {availability[day as keyof typeof availability].from} -{' '}
                          {availability[day as keyof typeof availability].to}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Save Button - Only show when in edit mode */}
      {isEditMode && (
        <View className="bg-white border-t border-gray-200 p-5">
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`bg-pink-500 rounded-xl py-4 items-center ${
              saving ? 'opacity-50' : ''
            }`}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default VendorStoreSettingsScreen;