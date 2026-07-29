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
  StyleSheet,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { vendorAPI, userAPI, categoriesAPI } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocationPicker from '@/screens/auth/components/LocationPicker';

const PRIMARY   = '#E04079';
const BG        = '#FCE4EC';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#1A1A2E';
const TEXT_GRAY = '#6B7280';
const BORDER    = '#F3E6EC';

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
  const { top } = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [vendorAvatar, setVendorAvatar] = useState<string | undefined>();
  const [coverImage, setCoverImage]     = useState<string | undefined>();

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
  const [kycStatus, setKycStatus]         = useState<string>('not_submitted');
  const [kycEditAllowed, setKycEditAllowed] = useState<boolean>(false);
  
  
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
        
        
        setVendorAvatar(vendor.avatar || undefined);
        setCoverImage(vendor.vendorProfile?.coverImage || undefined);
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
        setKycStatus(vendor.vendorProfile?.kycStatus || 'not_submitted');
        setKycEditAllowed(!!vendor.vendorProfile?.kycEditAllowed);
        
        
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

  const pickCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setUploadingCover(true);
        try {
          const res = await vendorAPI.uploadCoverImage(uri);
          if (res.success) {
            setCoverImage(uri);
            toast.success('Success', 'Cover photo updated');
          }
        } catch (err: any) {
          toast.error('Error', err?.response?.data?.message || 'Failed to upload cover photo');
        } finally {
          setUploadingCover(false);
        }
      }
    } catch {
      toast.error('Error', 'Failed to open gallery');
    }
  };

  const pickAvatarImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setUploadingAvatar(true);
        try {
          await userAPI.uploadAvatarOnly(uri);
          setVendorAvatar(uri);
          toast.success('Success', 'Profile photo updated');
        } catch (err: any) {
          toast.error('Error', err?.response?.data?.message || 'Failed to upload photo');
        } finally {
          setUploadingAvatar(false);
        }
      }
    } catch {
      toast.error('Error', 'Failed to open gallery');
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

  const removeDocument = (documentType: 'idCard' | 'businessLicense' | 'certification', index?: number) => {
    setConfirmModal({
      visible: true,
      title: 'Remove Document',
      message: 'Are you sure you want to remove this document?',
      onConfirm: async () => {
        try {
          setUploadingDocument(true);
          await vendorAPI.deleteDocument(documentType, index);

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
          setKycStatus('not_submitted');
          toast.success('Removed', 'Document removed successfully');
        } catch (error: any) {
          toast.error('Error', error.response?.data?.message || 'Failed to remove document');
        } finally {
          setUploadingDocument(false);
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
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const toggleDay = (day: string) => {
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

  const kycLocked = kycStatus === 'approved' && !kycEditAllowed;

  // ── Document upload card sub-component ──────────────────────────────────
  const DocUploadCard = ({
    label, hint, icon, uri, locked, uploading, onPick, onRemove,
  }: {
    label: string; hint: string; icon: any;
    uri?: string; locked: boolean; uploading: boolean;
    onPick: () => void; onRemove: () => void;
  }) => (
    <View style={ss.docCard}>
      <View style={ss.docCardHeader}>
        <View style={ss.docCardIcon}>
          <Ionicons name={icon} size={16} color={PRIMARY} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={ss.docCardLabel}>{label}</Text>
          <Text style={ss.docCardHint}>{hint}</Text>
        </View>
        {uri && !locked && (
          <TouchableOpacity onPress={onRemove} activeOpacity={0.75} style={ss.docRemoveChip}>
            <Ionicons name="trash-outline" size={13} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>
      {uri ? (
        <Image source={{ uri }} style={ss.docImg} resizeMode="cover" />
      ) : (
        <TouchableOpacity
          onPress={onPick}
          disabled={uploading || locked}
          activeOpacity={0.75}
          style={[ss.uploadBox, locked && { opacity: 0.45 }]}
        >
          <View style={ss.uploadBoxInner}>
            <Ionicons name="cloud-upload-outline" size={26} color={PRIMARY} />
            <Text style={ss.uploadBoxTitle}>Tap to upload</Text>
            <Text style={ss.uploadBoxSub}>JPG, PNG up to 10 MB</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Section header component ─────────────────────────────────────────────
  const SectionHeader = ({
    id, icon, title, subtitle, badge,
  }: { id: string; icon: any; title: string; subtitle: string; badge?: string }) => {
    const isOpen = expandedSection === id;
    return (
      <TouchableOpacity onPress={() => toggleSection(id)} activeOpacity={0.8} style={ss.sectionHeader}>
        <View style={[ss.sectionIconWrap, isOpen && ss.sectionIconWrapActive]}>
          <Ionicons name={icon} size={19} color={isOpen ? WHITE : PRIMARY} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[ss.sectionTitle, isOpen && { color: PRIMARY }]}>{title}</Text>
          {badge ? (
            <View style={ss.sectionBadge}>
              <Text style={ss.sectionBadgeText}>{badge}</Text>
            </View>
          ) : (
            <Text style={ss.sectionSub}>{subtitle}</Text>
          )}
        </View>
        <View style={[ss.chevronWrap, isOpen && ss.chevronWrapActive]}>
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color={isOpen ? PRIMARY : '#C4A0B0'} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const offDays = Object.keys(availability).filter(d => !availability[d as keyof typeof availability].isAvailable);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[ss.header, { paddingTop: top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ss.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>Store Setting</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Cover + Avatar ─────────────────────────────────────────────── */}
        <View style={ss.coverWrap}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={ss.coverImg} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#F9A8C9', '#E04079']} style={ss.coverImg} />
          )}

          {/* Bottom dark gradient so name text is readable */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.58)']}
            style={ss.coverGradientOverlay}
          />

          {/* Camera badge on cover (top-right) */}
          <TouchableOpacity onPress={pickCoverImage} disabled={uploadingCover} style={ss.coverCameraBtn} activeOpacity={0.8}>
            {uploadingCover
              ? <ActivityIndicator size="small" color={PRIMARY} />
              : <Ionicons name="camera" size={16} color={PRIMARY} />}
          </TouchableOpacity>

          {/* Business name + category — inside the image, to the right of avatar column */}
          <View style={ss.coverNameWrap}>
            <Text style={ss.coverName} numberOfLines={1}>{businessName || 'Your Business'}</Text>
            <Text style={ss.coverCategory} numberOfLines={1}>
              {availableCategories.find(c => selectedCategories.includes(c._id))?.name || 'Beauty & Wellness'}
            </Text>
          </View>

          {/* Avatar — overlaps the bottom edge of the cover */}
          <TouchableOpacity onPress={pickAvatarImage} disabled={uploadingAvatar} activeOpacity={0.8} style={ss.avatarWrap}>
            {vendorAvatar ? (
              <Image source={{ uri: vendorAvatar }} style={ss.avatar} resizeMode="cover" />
            ) : (
              <View style={[ss.avatar, { backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={28} color={PRIMARY} />
              </View>
            )}
            {uploadingAvatar && (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', borderRadius: 34 }]}>
                <ActivityIndicator size="small" color={PRIMARY} />
              </View>
            )}
            <View style={ss.avatarCameraBadge}>
              <Ionicons name="camera" size={10} color={WHITE} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Accordion sections ─────────────────────────────────────────── */}
        <View style={ss.sections}>

          {/* Business Information */}
          <View style={[ss.card, expandedSection === 'business' && ss.cardActive]}>
            <SectionHeader
              id="business"
              icon="briefcase-outline"
              title="Business Information"
              subtitle="Name, bio & service type"
              badge={businessName ? businessName.slice(0, 18) + (businessName.length > 18 ? '…' : '') : undefined}
            />
            {expandedSection === 'business' && (
              <View style={ss.expanded}>
                <View style={ss.inputGroup}>
                  <Text style={ss.inputLabel}>Business Name <Text style={{ color: PRIMARY }}>*</Text></Text>
                  <TextInput
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="e.g. Glam Studio by Tolu"
                    placeholderTextColor="#C4A0B0"
                    style={ss.input}
                  />
                </View>
                <View style={ss.inputGroup}>
                  <Text style={ss.inputLabel}>Business Description <Text style={{ color: PRIMARY }}>*</Text></Text>
                  <TextInput
                    value={businessDescription}
                    onChangeText={setBusinessDescription}
                    placeholder="Tell clients what makes you special..."
                    placeholderTextColor="#C4A0B0"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={[ss.input, { minHeight: 96, paddingTop: 12 }]}
                  />
                </View>
                <View style={ss.inputGroup}>
                  <Text style={ss.inputLabel}>
                    Service Type{' '}
                    {vendorTypeSet
                      ? <Text style={{ color: '#D97706', fontWeight: '600' }}>(locked)</Text>
                      : <Text style={{ color: PRIMARY }}>*</Text>}
                  </Text>
                  <View style={ss.segControl}>
                    {([
                      { key: 'home_service', label: 'Home Visit', icon: 'home-outline' },
                      { key: 'in_shop',      label: 'In-Shop',   icon: 'storefront-outline' },
                      { key: 'both',         label: 'Both',      icon: 'swap-horizontal-outline' },
                    ] as const).map((t, idx) => {
                      const active = vendorType === t.key;
                      return (
                        <TouchableOpacity
                          key={t.key}
                          onPress={() => { if (!vendorTypeSet) setVendorType(t.key); }}
                          disabled={vendorTypeSet}
                          activeOpacity={0.75}
                          style={[
                            ss.segBtn,
                            idx === 0 && ss.segBtnFirst,
                            idx === 2 && ss.segBtnLast,
                            active && ss.segBtnActive,
                          ]}
                        >
                          <Ionicons name={t.icon} size={15} color={active ? WHITE : TEXT_GRAY} />
                          <Text style={[ss.segBtnText, active && ss.segBtnTextActive]}>{t.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {vendorTypeSet && (
                    <View style={ss.lockedNote}>
                      <Ionicons name="lock-closed-outline" size={12} color="#92400E" />
                      <Text style={ss.lockedNoteText}>Cannot be changed once set</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Categories */}
          <View style={[ss.card, expandedSection === 'categories' && ss.cardActive]}>
            <SectionHeader
              id="categories"
              icon="grid-outline"
              title="Categories"
              subtitle="What services do you offer?"
              badge={selectedCategories.length > 0 ? `${selectedCategories.length} selected` : undefined}
            />
            {expandedSection === 'categories' && (
              <View style={ss.expanded}>
                {loadingCategories ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color={PRIMARY} />
                    <Text style={{ color: TEXT_GRAY, marginTop: 8, fontSize: 13 }}>Loading categories...</Text>
                  </View>
                ) : availableCategories.length > 0 ? (
                  <View style={ss.chipGrid}>
                    {availableCategories.map(cat => {
                      const sel = selectedCategories.includes(cat._id);
                      return (
                        <TouchableOpacity
                          key={cat._id}
                          onPress={() => toggleCategory(cat._id)}
                          activeOpacity={0.7}
                          style={[ss.chip, sel && ss.chipActive]}
                        >
                          {sel && <Ionicons name="checkmark-circle" size={14} color={WHITE} style={{ marginRight: 4 }} />}
                          <Text style={[ss.chipText, sel && ss.chipTextActive]}>{cat.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Ionicons name="grid-outline" size={32} color="#C4A0B0" />
                    <Text style={{ color: TEXT_GRAY, marginTop: 8, fontSize: 13 }}>No categories available</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Business Location */}
          <View style={[ss.card, expandedSection === 'location' && ss.cardActive]}>
            <SectionHeader
              id="location"
              icon="location-outline"
              title="Business Location"
              subtitle="Where can clients find you?"
              badge={location ? location.city || 'Set' : undefined}
            />
            {expandedSection === 'location' && (
              <View style={ss.expanded}>
                {location ? (
                  <View>
                    <View style={ss.locationConfirmed}>
                      <View style={ss.locationConfirmedIcon}>
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={ss.locationConfirmedTitle}>Location confirmed</Text>
                        <Text style={ss.locationConfirmedSub} numberOfLines={1}>{location.address || `${location.city}, ${location.state}`}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setLocation(null)} activeOpacity={0.7} style={ss.changeLocBtn}>
                        <Text style={ss.changeLocText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={ss.inputGroup}>
                      <Text style={ss.inputLabel}>Street Address</Text>
                      <TextInput style={ss.input} value={location.address} onChangeText={t => setLocation({ ...location, address: t })} placeholder="Street address" placeholderTextColor="#C4A0B0" />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={[ss.inputGroup, { flex: 1 }]}>
                        <Text style={ss.inputLabel}>City</Text>
                        <TextInput style={ss.input} value={location.city} onChangeText={t => setLocation({ ...location, city: t })} placeholder="City" placeholderTextColor="#C4A0B0" />
                      </View>
                      <View style={[ss.inputGroup, { flex: 1 }]}>
                        <Text style={ss.inputLabel}>State</Text>
                        <TextInput style={ss.input} value={location.state} onChangeText={t => setLocation({ ...location, state: t })} placeholder="State" placeholderTextColor="#C4A0B0" />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setShowLocationPicker(true)}
                      activeOpacity={0.75}
                      style={ss.locationBtn}
                    >
                      <View style={ss.locationBtnIcon}>
                        <Ionicons name="map-outline" size={18} color={PRIMARY} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={ss.locationBtnTitle}>Pick Location on Map</Text>
                        <Text style={ss.locationBtnSub}>Tap and drag the pin to your location</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={getCurrentLocation}
                      disabled={locationLoading}
                      activeOpacity={0.75}
                      style={ss.locationBtnSecondary}
                    >
                      <View style={ss.locationBtnSecondaryIcon}>
                        {locationLoading
                          ? <ActivityIndicator size="small" color={TEXT_GRAY} />
                          : <Ionicons name="navigate-outline" size={16} color={TEXT_GRAY} />}
                      </View>
                      <Text style={ss.locationBtnSecondaryText}>
                        {locationLoading ? 'Detecting...' : 'Use GPS Auto-Detect'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {locationError ? (
                  <View style={ss.errorNote}>
                    <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                    <Text style={ss.errorNoteText}>{locationError}</Text>
                  </View>
                ) : null}
                <View style={ss.inputGroup}>
                  <Text style={ss.inputLabel}>Service Radius (km)</Text>
                  <View style={ss.radiusRow}>
                    <TextInput
                      style={[ss.input, { flex: 1 }]}
                      value={serviceRadius}
                      onChangeText={setServiceRadius}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor="#C4A0B0"
                    />
                    <View style={ss.radiusBadge}>
                      <Text style={ss.radiusBadgeText}>km</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Verification Documents */}
          <View style={[ss.card, expandedSection === 'documents' && ss.cardActive]}>
            <SectionHeader
              id="documents"
              icon="document-text-outline"
              title="Verification Documents"
              subtitle="ID & business verification"
              badge={
                kycLocked ? 'Verified ✓' :
                kycStatus === 'pending' ? 'Under review' :
                (documents.idCard || documents.businessLicense) ? 'Uploaded' : undefined
              }
            />
            {expandedSection === 'documents' && (
              <View style={ss.expanded}>
                {kycLocked && (
                  <View style={ss.kycApprovedBanner}>
                    <View style={ss.kycApprovedIcon}>
                      <Ionicons name="shield-checkmark" size={18} color="#059669" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={ss.kycApprovedTitle}>Identity Verified</Text>
                      <Text style={ss.kycApprovedText}>Contact support if you need to update documents.</Text>
                    </View>
                  </View>
                )}

                {/* ID Card */}
                <DocUploadCard
                  label="Government ID"
                  hint="National ID, passport or driver's licence"
                  icon="card-outline"
                  uri={documents.idCard}
                  locked={kycLocked}
                  uploading={uploadingDocument}
                  onPick={() => pickDocument('idCard')}
                  onRemove={() => removeDocument('idCard')}
                />

                {/* Business License */}
                <DocUploadCard
                  label="Business License"
                  hint="CAC certificate or business permit"
                  icon="business-outline"
                  uri={documents.businessLicense}
                  locked={kycLocked}
                  uploading={uploadingDocument}
                  onPick={() => pickDocument('businessLicense')}
                  onRemove={() => removeDocument('businessLicense')}
                />

                {/* Certifications */}
                <Text style={[ss.inputLabel, { marginBottom: 10 }]}>Certifications <Text style={{ color: TEXT_GRAY, fontWeight: '400' }}>(Optional)</Text></Text>
                <View style={ss.certGrid}>
                  {documents.certification?.map((cert, i) => (
                    <View key={i} style={ss.certThumb}>
                      <Image source={{ uri: cert }} style={ss.certImg} resizeMode="cover" />
                      {!kycLocked && (
                        <TouchableOpacity onPress={() => removeDocument('certification', i)} style={ss.certRemove} activeOpacity={0.75}>
                          <Ionicons name="close" size={11} color={WHITE} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {!kycLocked && (
                    <TouchableOpacity onPress={() => pickDocument('certification')} disabled={uploadingDocument} activeOpacity={0.75} style={ss.certAddBtn}>
                      <Ionicons name="add" size={24} color={PRIMARY} />
                      <Text style={{ fontSize: 10, color: PRIMARY, fontWeight: '700', marginTop: 2 }}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {uploadingDocument && (
                  <View style={ss.uploadingRow}>
                    <ActivityIndicator size="small" color={PRIMARY} />
                    <Text style={{ color: TEXT_GRAY, fontSize: 13, marginLeft: 8 }}>Uploading...</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Availability Schedule */}
          <View style={[ss.card, expandedSection === 'availability' && ss.cardActive]}>
            <SectionHeader
              id="availability"
              icon="time-outline"
              title="Availability Schedule"
              subtitle="When are you open for bookings?"
              badge={offDays.length > 0 ? `${7 - offDays.length} days/wk` : 'All 7 days'}
            />
            {expandedSection === 'availability' && (
              <View style={[ss.expanded, { gap: 8 }]}>
                {Object.keys(availability).map((day) => {
                  const slot = availability[day as keyof typeof availability];
                  return (
                    <View key={day} style={[ss.dayCard, !slot.isAvailable && ss.dayCardOff]}>
                      <Switch
                        value={slot.isAvailable}
                        onValueChange={() => toggleDay(day)}
                        trackColor={{ false: '#E5E7EB', true: '#FEE2F0' }}
                        thumbColor={slot.isAvailable ? PRIMARY : '#D1D5DB'}
                        ios_backgroundColor="#E5E7EB"
                        style={{ transform: [{ scaleX: 0.88 }, { scaleY: 0.88 }] }}
                      />
                      <Text style={[ss.dayName, !slot.isAvailable && ss.dayNameOff]}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Text>
                      {slot.isAvailable ? (
                        <View style={ss.timePill}>
                          <Ionicons name="time-outline" size={11} color={PRIMARY} />
                          <Text style={ss.timePillText}>{slot.from} – {slot.to}</Text>
                        </View>
                      ) : (
                        <View style={ss.offPill}>
                          <Text style={ss.offPillText}>Closed</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

        </View>
      </ScrollView>

      {/* ── Save button ─────────────────────────────────────────────────────── */}
      <View style={ss.footer}>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.88} style={ss.saveBtn}>
          <LinearGradient colors={['#F06292', '#E04079']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ss.saveGradient}>
            {saving ? <ActivityIndicator color={WHITE} /> : <Text style={ss.saveBtnText}>Save</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={(picked) => {
          setLocation({
            type: 'Point',
            coordinates: picked.coordinates as [number, number],
            address: picked.address,
            city: picked.city || '',
            state: picked.state || '',
            country: picked.country || 'Nigeria',
          });
        }}
        currentLocation={location ? { coordinates: location.coordinates, address: location.address } : null}
      />

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, visible: false })); }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

export default VendorStoreSettingsScreen;

const SHADOW = Platform.select({
  ios: { shadowColor: '#E04079', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
});

const ss = StyleSheet.create({
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: '#FAE8F0',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.3 },

  // ── Cover ─────────────────────────────────────────────────────────────────
  coverWrap: { position: 'relative', marginBottom: 22 },
  coverImg: { width: '100%', height: 190 },
  coverGradientOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
  },
  coverCameraBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 }, android: { elevation: 4 } }),
  },
  coverNameWrap: {
    position: 'absolute', bottom: 14, left: 100, right: 16,
  },
  coverName: {
    fontSize: 16, fontWeight: '800', color: WHITE,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5,
  },
  coverCategory: {
    fontSize: 12, color: 'rgba(255,255,255,0.92)', fontWeight: '600', marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  avatarWrap: {
    position: 'absolute', bottom: -36, left: 16,
    width: 68, height: 68, borderRadius: 34, overflow: 'hidden',
    borderWidth: 3, borderColor: WHITE,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6 }, android: { elevation: 6 } }),
  },
  avatar: { width: '100%', height: '100%' },
  avatarCameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },

  // ── Sections container ────────────────────────────────────────────────────
  sections: { paddingHorizontal: 14, paddingTop: 50, gap: 10 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: { backgroundColor: WHITE, borderRadius: 20, ...SHADOW },
  cardActive: {
    borderWidth: 1.5, borderColor: '#F9C8DB',
    ...Platform.select({ ios: { shadowOpacity: 0.12, shadowRadius: 14 }, android: { elevation: 4 } }),
  },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  sectionIconWrap: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center',
  },
  sectionIconWrapActive: { backgroundColor: PRIMARY },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: TEXT_DARK, letterSpacing: -0.2 },
  sectionSub:   { fontSize: 12, color: TEXT_GRAY, marginTop: 2 },
  sectionBadge: {
    alignSelf: 'flex-start', marginTop: 3,
    backgroundColor: '#FEE2F0', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 11, color: PRIMARY, fontWeight: '700' },
  chevronWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F5F5F8', alignItems: 'center', justifyContent: 'center',
  },
  chevronWrapActive: { backgroundColor: '#FEE2F0' },

  // ── Expanded content ──────────────────────────────────────────────────────
  expanded: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: 4 },

  // ── Inputs ────────────────────────────────────────────────────────────────
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: TEXT_DARK, marginBottom: 7, letterSpacing: 0.1 },
  input: {
    backgroundColor: '#FAF5F8',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: TEXT_DARK,
    borderWidth: 1.2, borderColor: '#EDE0E8',
  },

  // ── Segmented control (service type) ─────────────────────────────────────
  segControl: { flexDirection: 'row', backgroundColor: '#F5EEF3', borderRadius: 14, padding: 4 },
  segBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 10,
  },
  segBtnFirst: { borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
  segBtnLast:  { borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  segBtnActive: {
    backgroundColor: PRIMARY,
    ...Platform.select({ ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 }, android: { elevation: 3 } }),
  },
  segBtnText: { fontSize: 12, fontWeight: '700', color: TEXT_GRAY },
  segBtnTextActive: { color: WHITE },
  lockedNote: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, backgroundColor: '#FFFBEB',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  lockedNoteText: { fontSize: 11, color: '#92400E', fontWeight: '600' },

  // ── Category chips ────────────────────────────────────────────────────────
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 50, borderWidth: 1.5, borderColor: '#EDE0E8',
    backgroundColor: '#FAF5F8',
    marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, fontWeight: '600', color: TEXT_DARK },
  chipTextActive: { color: WHITE },

  // ── Location ──────────────────────────────────────────────────────────────
  locationConfirmed: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  locationConfirmedIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center',
  },
  locationConfirmedTitle: { fontSize: 13, fontWeight: '800', color: '#065F46' },
  locationConfirmedSub:   { fontSize: 11, color: '#059669', marginTop: 1 },
  changeLocBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: WHITE, borderRadius: 20,
    borderWidth: 1, borderColor: '#059669',
  },
  changeLocText: { fontSize: 12, color: '#059669', fontWeight: '700' },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF6FA', borderRadius: 16,
    padding: 14, marginBottom: 14,
    borderWidth: 1.5, borderColor: '#F9C8DB',
  },
  locationBtnIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center',
  },
  locationBtnTitle: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  locationBtnSub:   { fontSize: 11, color: TEXT_GRAY, marginTop: 2 },
  locationBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F5F8', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#EBEBF0',
  },
  locationBtnSecondaryIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EBEBF0', alignItems: 'center', justifyContent: 'center',
  },
  locationBtnSecondaryText: { fontSize: 13, fontWeight: '600', color: TEXT_GRAY },
  radiusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radiusBadge: {
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: '#FEE2F0', borderRadius: 14,
    borderWidth: 1.2, borderColor: '#F9C8DB',
  },
  radiusBadgeText: { fontSize: 13, fontWeight: '800', color: PRIMARY },
  errorNote: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8, marginBottom: 10,
  },
  errorNoteText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },

  // ── Documents ─────────────────────────────────────────────────────────────
  kycApprovedBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  kycApprovedIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center',
  },
  kycApprovedTitle: { fontSize: 13, fontWeight: '800', color: '#065F46' },
  kycApprovedText: { fontSize: 11, color: '#059669', marginTop: 2, lineHeight: 16 },

  docCard: {
    backgroundColor: '#FAF5F8', borderRadius: 16,
    padding: 12, marginBottom: 12,
    borderWidth: 1.2, borderColor: '#EDE0E8',
  },
  docCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  docCardIcon: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center',
  },
  docCardLabel: { fontSize: 13, fontWeight: '800', color: TEXT_DARK },
  docCardHint:  { fontSize: 11, color: TEXT_GRAY, marginTop: 1 },
  docRemoveChip: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    alignItems: 'center', justifyContent: 'center',
  },
  docImg: { width: '100%', height: 140, borderRadius: 12 },
  uploadBox: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#F9C8DB',
    borderRadius: 14, backgroundColor: '#FEF6FA',
    overflow: 'hidden',
  },
  uploadBoxInner: { paddingVertical: 22, alignItems: 'center', gap: 4 },
  uploadBoxTitle: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  uploadBoxSub:   { fontSize: 11, color: TEXT_GRAY },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },

  certGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  certThumb: { position: 'relative' },
  certImg: { width: 78, height: 78, borderRadius: 12 },
  certRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  certAddBtn: {
    width: 78, height: 78, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF6FA',
  },

  // ── Availability ──────────────────────────────────────────────────────────
  dayCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FAF5F8', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.2, borderColor: '#EDE0E8',
  },
  dayCardOff: { backgroundColor: '#F9F9FB', borderColor: '#EBEBF0' },
  dayName:    { flex: 1, fontSize: 14, fontWeight: '700', color: TEXT_DARK, textTransform: 'capitalize' },
  dayNameOff: { color: '#B0B0C0' },
  timePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEE2F0', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  timePillText: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  offPill: {
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  offPillText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: WHITE, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: '#FAE8F0',
  },
  saveBtn: { borderRadius: 18, overflow: 'hidden' },
  saveGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: WHITE, letterSpacing: 0.3 },
});