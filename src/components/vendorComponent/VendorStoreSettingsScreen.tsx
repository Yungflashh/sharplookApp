import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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

interface DocumentsData {
  idCard?: string;
  businessLicense?: string;
  certification?: string[];
}

const VendorStoreSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [vendorTypeSet, setVendorTypeSet] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });


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
  
  
  const [documents, setDocuments] = useState<DocumentsData>({
    idCard: undefined,
    businessLicense: undefined,
    certification: [],
  });
  
  
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
    requestMediaLibraryPermission();
  }, []);

  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('Permission Required', 'We need camera roll permissions to upload documents.');
      }
    }
  };

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
          toast.warning(
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
        
        const locationData: LocationData = {
          type: 'Point',
          coordinates: [longitude, latitude],
          address: `${addressData.street || ''} ${addressData.streetNumber || ''}`.trim() || 'Address not available',
          city: addressData.city || addressData.subregion || 'Unknown City',
          state: addressData.region || 'Unknown State',
          country: addressData.country || 'Unknown Country',
        };

        setLocation(locationData);
        toast.success('Success', 'Location captured successfully!');
      } else {
        throw new Error('Unable to get address details');
      }
    } catch (error: any) {
      console.error('Location error:', error);
      setLocationError('Failed to get location. Please try again.');
      toast.error(
        'Location Error',
        'Unable to get your location. Please ensure location services are enabled and try again.'
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
      toast.error('Error', 'Failed to load store settings');
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
        
        
        const currentVendorType = vendor.vendorProfile?.vendorType;
        if (currentVendorType) {
          setVendorType(currentVendorType);
          setVendorTypeSet(true); 
        }
        
        
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
        
        
        if (vendor.vendorProfile?.documents) {
          setDocuments({
            idCard: vendor.vendorProfile.documents.idCard,
            businessLicense: vendor.vendorProfile.documents.businessLicense,
            certification: vendor.vendorProfile.documents.certification || [],
          });
        }
        
        
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

  const pickDocument = async (documentType: 'idCard' | 'businessLicense' | 'certification') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(documentType, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      toast.error('Error', 'Failed to pick document');
    }
  };

  const uploadDocument = async (
    documentType: 'idCard' | 'businessLicense' | 'certification',
    uri: string
  ) => {
    try {
      setUploadingDocument(true);

      
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'document.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('document', {
        uri,
        name: filename,
        type,
      } as any);

      formData.append('documentType', documentType);

      console.log('📤 Uploading document:', documentType);
      const response = await vendorAPI.uploadDocument(formData);
      console.log('✅ Upload response:', response);

      if (response.success) {
        
        if (documentType === 'certification') {
          setDocuments((prev) => ({
            ...prev,
            certification: [
              ...(prev.certification || []),
              response.data.vendor.vendorProfile.documents.certification.slice(-1)[0],
            ],
          }));
        } else {
          setDocuments((prev) => ({
            ...prev,
            [documentType]: response.data.vendor.vendorProfile.documents[documentType],
          }));
        }

        toast.success('Success', 'Document uploaded successfully');
      }
    } catch (error: any) {
      console.error('❌ Error uploading document:', error);
      toast.error('Error', error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingDocument(false);
    }
  };

  const removeDocument = (documentType: 'idCard' | 'businessLicense', index?: number) => {
    setConfirmModal({
      visible: true,
      title: 'Remove Document',
      message: 'Are you sure you want to remove this document?',
      onConfirm: () => {
        if (documentType === 'certification' && index !== undefined) {
          setDocuments((prev) => ({
            ...prev,
            certification: prev.certification?.filter((_, i) => i !== index) || [],
          }));
        } else {
          setDocuments((prev) => ({
            ...prev,
            [documentType]: undefined,
          }));
        }
      },
    });
  };

  const handleSave = async () => {
    try {
      
      if (!businessName.trim()) {
        toast.warning('Error', 'Business name is required');
        return;
      }

      if (!businessDescription.trim()) {
        toast.warning('Error', 'Business description is required');
        return;
      }

      if (selectedCategories.length === 0) {
        toast.warning('Error', 'Please select at least one category');
        return;
      }

      if (!location) {
        toast.warning('Error', 'Please add your business location');
        return;
      }

      setSaving(true);

      const updateData = {
        businessName: businessName.trim(),
        businessDescription: businessDescription.trim(),
        vendorType: !vendorTypeSet ? vendorType : undefined, 
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

        
        if (!vendorTypeSet && updateData.vendorType) {
          setVendorTypeSet(true);
        }

        
        setIsEditMode(false);

        toast.success('Success', 'Store settings updated successfully');
      }
    } catch (error: any) {
      console.error('❌ Error saving store settings:', error);
      console.error('❌ Error details:', error.response?.data);
      toast.error(
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
    if (isEditMode) {
      
      setConfirmModal({
        visible: true,
        title: 'Discard Changes?',
        message: 'You have unsaved changes. Do you want to discard them?',
        onConfirm: () => {
          setIsEditMode(false);
          loadData();
        },
      });
    } else {
      
      setIsEditMode(true);
    }
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
              name={isEditMode ? "close" : "pencil"} 
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
                Edit Mode Active - Make your changes and save
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
                    Service Type * {vendorTypeSet && '(Cannot be changed)'}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => {
                        if (isEditMode && !vendorTypeSet) {
                          setVendorType('home_service');
                        }
                      }}
                      disabled={!isEditMode || vendorTypeSet}
                      className={`flex-1 p-3 rounded-xl border-2 ${
                        vendorType === 'home_service'
                          ? 'border-pink-500 bg-pink-50'
                          : isEditMode && !vendorTypeSet
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      activeOpacity={0.7}
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
                      onPress={() => {
                        if (isEditMode && !vendorTypeSet) {
                          setVendorType('in_shop');
                        }
                      }}
                      disabled={!isEditMode || vendorTypeSet}
                      className={`flex-1 p-3 rounded-xl border-2 ${
                        vendorType === 'in_shop'
                          ? 'border-pink-500 bg-pink-50'
                          : isEditMode && !vendorTypeSet
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      activeOpacity={0.7}
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
                      onPress={() => {
                        if (isEditMode && !vendorTypeSet) {
                          setVendorType('both');
                        }
                      }}
                      disabled={!isEditMode || vendorTypeSet}
                      className={`flex-1 p-3 rounded-xl border-2 ${
                        vendorType === 'both'
                          ? 'border-pink-500 bg-pink-50'
                          : isEditMode && !vendorTypeSet
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      activeOpacity={0.7}
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
                  {vendorTypeSet && (
                    <Text className="text-orange-600 text-xs mt-2">
                      ⚠️ Service type has been set and cannot be changed
                    </Text>
                  )}
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

          {/* Documents Section */}
          <View className="bg-white rounded-2xl p-4 mb-4">
            <TouchableOpacity
              onPress={() => toggleSection('documents')}
              className="flex-row items-center justify-between mb-3"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center mr-3">
                  <MaterialCommunityIcons name="file-document" size={22} color="#ec4899" />
                </View>
                <Text className="text-base font-semibold text-gray-900">
                  Verification Documents
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'documents' ? 'chevron-up' : 'chevron-down'}
                size={24}
                color="#9ca3af"
              />
            </TouchableOpacity>

            {expandedSection === 'documents' && (
              <View className="pt-3 border-t border-gray-100">
                {/* ID Card */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">ID Card</Text>
                  {documents.idCard ? (
                    <View className="relative">
                      <Image
                        source={{ uri: documents.idCard }}
                        className="w-full h-40 rounded-xl"
                        resizeMode="cover"
                      />
                      {isEditMode && (
                        <TouchableOpacity
                          onPress={() => removeDocument('idCard')}
                          className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash" size={16} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => pickDocument('idCard')}
                      disabled={uploadingDocument || !isEditMode}
                      className={`border-2 border-dashed border-gray-300 rounded-xl p-6 items-center ${
                        !isEditMode ? 'opacity-50' : ''
                      }`}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="cloud-upload-outline" size={32} color="#9ca3af" />
                      <Text className="text-gray-600 text-sm mt-2">Upload ID Card</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Business License */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Business License</Text>
                  {documents.businessLicense ? (
                    <View className="relative">
                      <Image
                        source={{ uri: documents.businessLicense }}
                        className="w-full h-40 rounded-xl"
                        resizeMode="cover"
                      />
                      {isEditMode && (
                        <TouchableOpacity
                          onPress={() => removeDocument('businessLicense')}
                          className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash" size={16} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => pickDocument('businessLicense')}
                      disabled={uploadingDocument || !isEditMode}
                      className={`border-2 border-dashed border-gray-300 rounded-xl p-6 items-center ${
                        !isEditMode ? 'opacity-50' : ''
                      }`}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="cloud-upload-outline" size={32} color="#9ca3af" />
                      <Text className="text-gray-600 text-sm mt-2">Upload Business License</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Certifications */}
                <View className="mb-2">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Certifications (Optional)
                  </Text>
                  {documents.certification && documents.certification.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mb-3">
                      {documents.certification.map((cert, index) => (
                        <View key={index} className="relative">
                          <Image
                            source={{ uri: cert }}
                            className="w-24 h-24 rounded-xl"
                            resizeMode="cover"
                          />
                          {isEditMode && (
                            <TouchableOpacity
                              onPress={() => removeDocument('certification', index)}
                              className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close" size={12} color="#fff" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                  {isEditMode && (
                    <TouchableOpacity
                      onPress={() => pickDocument('certification')}
                      disabled={uploadingDocument}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-6 items-center"
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={32} color="#9ca3af" />
                      <Text className="text-gray-600 text-sm mt-2">Add Certification</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Availability Section */}
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

export default VendorStoreSettingsScreen;