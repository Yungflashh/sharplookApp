import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  StatusBar,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { vendorAPI, categoriesAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const BG = '#FFF0F5';
const PINK = '#E91E63';
const BORDER = '#F8BBD0';
const { width: SW } = Dimensions.get('window');

type VendorType = 'home_service' | 'in_shop' | 'both';

const VENDOR_TYPES: { value: VendorType; label: string; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { value: 'home_service', label: 'Home Service', icon: 'home-outline', hint: 'You travel to clients' },
  { value: 'in_shop', label: 'In-Shop', icon: 'storefront-outline', hint: 'Clients come to you' },
  { value: 'both', label: 'Both', icon: 'duplicate-outline', hint: 'Home & walk-in' },
];

interface Category { _id: string; name: string }
interface LocationData {
  type: 'Point';
  coordinates: [number, number];
  address: string;
  city: string;
  state: string;
  country: string;
}

interface Props { onSetupComplete?: () => void }

const VendorProfileSetup = ({ onSetupComplete }: Props) => {
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [vendorType, setVendorType] = useState<VendorType>('home_service');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [serviceRadius, setServiceRadius] = useState('10');
  const [location, setLocation] = useState<LocationData | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Address search
  const [locationMode, setLocationMode] = useState<'gps' | 'search'>('gps');
  const [addressSearch, setAddressSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await categoriesAPI.getAll();
      if (response.success && response.data) setCategories(response.data);
    } catch { /* silent */ } finally { setLoadingCategories(false); }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    clearErr('location');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.info('Permission Required', 'Please enable location permissions in settings.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = position.coords;
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const a = geocode[0];
        setLocation({
          type: 'Point',
          coordinates: [longitude, latitude],
          address: `${a.streetNumber || ''} ${a.street || ''}`.trim() || a.name || 'Address not available',
          city: a.city || a.subregion || a.district || 'Unknown City',
          state: a.region || 'Unknown State',
          country: a.country || 'Nigeria',
        });
      }
    } catch {
      setErrors(prev => ({ ...prev, location: 'Could not get your location. Try searching by address instead.' }));
    } finally { setLocationLoading(false); }
  };

  const searchAddress = async () => {
    if (!addressSearch.trim()) return;
    setSearchLoading(true);
    clearErr('location');
    try {
      const results = await Location.geocodeAsync(addressSearch.trim());
      if (!results || results.length === 0) {
        setErrors(prev => ({ ...prev, location: 'Address not found. Try being more specific (e.g. "123 Allen Ave, Ikeja, Lagos").' }));
        return;
      }
      const { latitude, longitude } = results[0];
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const a = geocode?.[0];
      setLocation({
        type: 'Point',
        coordinates: [longitude, latitude],
        address: `${a?.streetNumber || ''} ${a?.street || ''}`.trim() || addressSearch.trim(),
        city: a?.city || a?.subregion || a?.district || 'Unknown City',
        state: a?.region || 'Unknown State',
        country: a?.country || 'Nigeria',
      });
    } catch {
      setErrors(prev => ({ ...prev, location: 'Search failed. Check your connection and try again.' }));
    } finally { setSearchLoading(false); }
  };

  const clearErr = (field: string) => setErrors(prev => ({ ...prev, [field]: '' }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!businessName.trim() || businessName.trim().length < 2)
      e.businessName = 'Business name is required (2–100 characters)';
    else if (businessName.trim().length > 100)
      e.businessName = 'Business name cannot exceed 100 characters';
    if (!businessDescription.trim() || businessDescription.trim().length < 20)
      e.businessDescription = 'Description must be at least 20 characters';
    else if (businessDescription.trim().length > 1000)
      e.businessDescription = 'Description cannot exceed 1000 characters';
    if (!selectedCategory)
      e.category = 'Please select a service category';
    if (!location)
      e.location = 'Please set your business location';
    else if (!location.address.trim())
      e.location = 'Please enter a street address';
    const radius = parseInt(serviceRadius, 10);
    if (serviceRadius && (isNaN(radius) || radius < 1 || radius > 100))
      e.serviceRadius = 'Service radius must be between 1 and 100 km';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const setupData: any = {
        businessName: businessName.trim(),
        businessDescription: businessDescription.trim(),
        categories: [selectedCategory],
        primaryCategory: selectedCategory,
        vendorType,
        location: location!,
      };
      if (yearsOfExperience) setupData.yearsOfExperience = parseInt(yearsOfExperience, 10);
      if (serviceRadius) setupData.serviceRadius = parseInt(serviceRadius, 10);

      const response = await vendorAPI.setupProfile(setupData);
      if (response.success) {
        setShowSuccess(true);
        setTimeout(() => onSetupComplete?.(), 2000);
      } else {
        toast.error('Setup Failed', response.message || 'Failed to create vendor profile');
      }
    } catch (error: any) {
      const apiError = handleAPIError(error);
      if (apiError.fieldErrors) {
        const mapped: Record<string, string> = {};
        const fe = apiError.fieldErrors;
        if (fe.businessName) mapped.businessName = fe.businessName;
        if (fe.businessDescription) mapped.businessDescription = fe.businessDescription;
        if (fe.categories || fe.primaryCategory) mapped.category = fe.categories || fe.primaryCategory;
        if (fe.location) mapped.location = fe.location;
        if (fe.serviceRadius) mapped.serviceRadius = fe.serviceRadius;
        if (Object.keys(mapped).length > 0) {
          setErrors(prev => ({ ...prev, ...mapped }));
        } else {
          toast.error('Error', apiError.message || 'Failed to setup vendor profile');
        }
      } else {
        toast.error('Error', apiError.message || 'Failed to setup vendor profile');
      }
    } finally { setLoading(false); }
  };

  const selectCategory = (id: string, name: string) => {
    setSelectedCategory(id);
    setSelectedCategoryName(name);
    setShowCategoryModal(false);
    clearErr('category');
  };

  const descLen = businessDescription.length;

  if (showSuccess) {
    return (
      <View style={styles.successScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <Text style={styles.decoTopLeft}>🍃</Text>
        <Text style={styles.decoTopRight}>💕</Text>
        <Text style={styles.decoMidLeft}>✨</Text>
        <Text style={styles.decoMidRight}>🌿</Text>
        <Image
          source={require('../../../assets/lookrealMainLogo.png')}
          style={styles.successLogo}
          resizeMode="contain"
        />
        <Text style={styles.successTitle}>{'Welcome to LookReal! 🌹'}</Text>
        <Text style={styles.successSub}>{'You\'re all set to discover\namazing beauty services.'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../assets/lookrealMainLogo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>{'Tell us about your\nbeauty business'}</Text>
          <Text style={styles.subtitle}>Fill in your business details to get started</Text>

          {/* Business Name */}
          <Text style={styles.label}>Business Name <Text style={styles.required}>*</Text></Text>
          <Text style={styles.hint}>The name clients will see when searching for your services</Text>
          <View style={[styles.inputRow, errors.businessName && styles.inputErr]}>
            <Ionicons name="business-outline" size={18} color={PINK} style={styles.icon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Glow Studio, Clara's Hair Palace"
              placeholderTextColor="#ccc"
              value={businessName}
              onChangeText={v => { setBusinessName(v); clearErr('businessName'); }}
              maxLength={100}
              editable={!loading}
            />
          </View>
          {errors.businessName ? <Text style={styles.errText}>{errors.businessName}</Text> : null}

          {/* Business Description */}
          <Text style={styles.label}>Business Description <Text style={styles.required}>*</Text></Text>
          <Text style={styles.hint}>Describe your services, specialties, and what makes you unique (min 20 characters)</Text>
          <View style={[styles.inputRow, styles.textAreaRow, errors.businessDescription ? styles.inputErr : null]}>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="e.g. Specialising in natural hair braiding, locs, and Afro styling with over 5 years experience in Lagos..."
              placeholderTextColor="#ccc"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
              value={businessDescription}
              onChangeText={v => { setBusinessDescription(v); clearErr('businessDescription'); }}
              editable={!loading}
            />
          </View>
          <View style={styles.descFooter}>
            {errors.businessDescription
              ? <Text style={styles.errText}>{errors.businessDescription}</Text>
              : <Text style={styles.charHint}>{descLen < 20 ? `${20 - descLen} more characters needed` : ''}</Text>
            }
            <Text style={[styles.charCount, descLen > 950 && styles.charCountWarn]}>{descLen}/1000</Text>
          </View>

          {/* Business Type */}
          <Text style={styles.label}>Business Type <Text style={styles.required}>*</Text></Text>
          <Text style={styles.hint}>This cannot be changed after setup</Text>
          <View style={styles.typeRow}>
            {VENDOR_TYPES.map(({ value, label, icon, hint }) => (
              <TouchableOpacity
                key={value}
                style={[styles.typeBtn, vendorType === value && styles.typeBtnActive]}
                onPress={() => setVendorType(value)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Ionicons name={icon} size={20} color={vendorType === value ? PINK : '#888'} />
                <Text style={[styles.typeBtnText, vendorType === value && styles.typeBtnTextActive]}>{label}</Text>
                <Text style={styles.typeBtnHint}>{hint}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Service Categories */}
          <Text style={styles.label}>Service Category <Text style={styles.required}>*</Text></Text>
          <Text style={styles.hint}>Choose the primary category that best describes your business</Text>
          <TouchableOpacity
            style={[styles.inputRow, errors.category && styles.inputErr]}
            onPress={() => { setShowCategoryModal(true); clearErr('category'); }}
            activeOpacity={0.7}
            disabled={loading || loadingCategories}
          >
            <Ionicons name="grid-outline" size={18} color={PINK} style={styles.icon} />
            {loadingCategories
              ? <ActivityIndicator size="small" color={PINK} style={{ flex: 1 }} />
              : <Text style={[styles.textInput, !selectedCategory && { color: '#ccc' }]} numberOfLines={1}>
                  {!selectedCategory ? 'Select a category (e.g. Hair, Nails, Makeup)' : selectedCategoryName}
                </Text>
            }
            <Ionicons name="chevron-down" size={16} color="#bbb" />
          </TouchableOpacity>
          {selectedCategory ? (
            <View style={styles.tagRow}>
              <TouchableOpacity
                style={styles.tag}
                onPress={() => { setSelectedCategory(''); setSelectedCategoryName(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.tagText}>{selectedCategoryName}</Text>
                <Ionicons name="close" size={12} color={PINK} />
              </TouchableOpacity>
            </View>
          ) : null}
          {errors.category ? <Text style={styles.errText}>{errors.category}</Text> : null}

          {/* Location */}
          <Text style={styles.label}>Business Location <Text style={styles.required}>*</Text></Text>
          <Text style={styles.hint}>Used to show your business to nearby clients</Text>

          {/* Location mode tabs */}
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, locationMode === 'gps' && styles.modeTabActive]}
              onPress={() => setLocationMode('gps')}
              activeOpacity={0.7}
            >
              <Ionicons name="locate" size={15} color={locationMode === 'gps' ? PINK : '#888'} />
              <Text style={[styles.modeTabText, locationMode === 'gps' && styles.modeTabTextActive]}>
                Use GPS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, locationMode === 'search' && styles.modeTabActive]}
              onPress={() => setLocationMode('search')}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={15} color={locationMode === 'search' ? PINK : '#888'} />
              <Text style={[styles.modeTabText, locationMode === 'search' && styles.modeTabTextActive]}>
                Search Address
              </Text>
            </TouchableOpacity>
          </View>

          {locationMode === 'gps' ? (
            <TouchableOpacity
              style={[styles.inputRow, errors.location && !location && styles.inputErr]}
              onPress={getCurrentLocation}
              disabled={locationLoading || loading}
              activeOpacity={0.7}
            >
              {locationLoading
                ? <ActivityIndicator size="small" color={PINK} style={styles.icon} />
                : <Ionicons name="location-outline" size={18} color={PINK} style={styles.icon} />
              }
              <Text style={[styles.textInput, { color: locationLoading ? '#aaa' : PINK }]}>
                {locationLoading ? 'Detecting your location...' : 'Tap to detect current location'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.inputRow, errors.location && !location && styles.inputErr]}>
              <Ionicons name="search" size={18} color={PINK} style={styles.icon} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="e.g. 15 Allen Avenue, Ikeja, Lagos"
                placeholderTextColor="#ccc"
                value={addressSearch}
                onChangeText={setAddressSearch}
                onSubmitEditing={searchAddress}
                returnKeyType="search"
                editable={!loading && !searchLoading}
              />
              <TouchableOpacity
                onPress={searchAddress}
                disabled={searchLoading || !addressSearch.trim()}
                activeOpacity={0.7}
                style={styles.searchBtn}
              >
                {searchLoading
                  ? <ActivityIndicator size="small" color={PINK} />
                  : <Ionicons name="arrow-forward-circle" size={26} color={addressSearch.trim() ? PINK : '#ddd'} />
                }
              </TouchableOpacity>
            </View>
          )}

          {location ? (
            <View style={styles.locationCard}>
              <View style={styles.locationCardHeader}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.locationDetectedLabel}>Location detected — refine your street address below</Text>
                <TouchableOpacity onPress={() => { setLocation(null); setAddressSearch(''); }} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={20} color="#E53E3E" />
                </TouchableOpacity>
              </View>
              {/* Editable street address */}
              <View style={styles.locationField}>
                <Ionicons name="home-outline" size={15} color={PINK} style={{ marginRight: 8, marginTop: 2 }} />
                <TextInput
                  style={styles.locationAddressInput}
                  value={location.address}
                  onChangeText={v => setLocation(prev => prev ? { ...prev, address: v } : prev)}
                  placeholder="Street address, building, landmark..."
                  placeholderTextColor="#bbb"
                  multiline
                  editable={!loading}
                />
              </View>
              {/* Locked city / state / country row */}
              <View style={styles.locationMetaRow}>
                <View style={styles.locationMeta}>
                  <Ionicons name="location" size={13} color="#6B7280" />
                  <Text style={styles.locationMetaText}>{location.city}</Text>
                </View>
                <Text style={styles.locationMetaDot}>·</Text>
                <Text style={styles.locationMetaText}>{location.state}</Text>
                <Text style={styles.locationMetaDot}>·</Text>
                <Text style={styles.locationMetaText}>{location.country}</Text>
              </View>
            </View>
          ) : null}
          {errors.location ? <Text style={styles.errText}>{errors.location}</Text> : null}

          {/* Service Radius */}
          <Text style={styles.label}>Service Radius <Text style={styles.optionalLabel}>(optional)</Text></Text>
          <Text style={styles.hint}>How far are you willing to travel for home services? (1–100 km, default 10 km)</Text>
          <View style={[styles.inputRow, errors.serviceRadius && styles.inputErr]}>
            <Ionicons name="radio-outline" size={18} color={PINK} style={styles.icon} />
            <TextInput
              style={styles.textInput}
              placeholder="10"
              placeholderTextColor="#ccc"
              keyboardType="number-pad"
              value={serviceRadius}
              onChangeText={v => { setServiceRadius(v); clearErr('serviceRadius'); }}
              editable={!loading}
              maxLength={3}
            />
            <Text style={styles.unitLabel}>km</Text>
          </View>
          {errors.serviceRadius ? <Text style={styles.errText}>{errors.serviceRadius}</Text> : null}

          {/* Years of Experience */}
          <Text style={styles.label}>Years of Experience <Text style={styles.optionalLabel}>(optional)</Text></Text>
          <Text style={styles.hint}>Helps clients trust your expertise</Text>
          <View style={styles.inputRow}>
            <Ionicons name="time-outline" size={18} color={PINK} style={styles.icon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 3"
              placeholderTextColor="#ccc"
              keyboardType="number-pad"
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              editable={!loading}
              maxLength={2}
            />
            <Text style={styles.unitLabel}>years</Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <>
                  <Text style={styles.submitText}>Complete Setup</Text>
                  <Ionicons name="chevron-forward" size={18} color="white" />
                </>
            }
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            You can update these details anytime from your profile settings.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>Tap to select the category that best fits your business</Text>
          <FlatList
            data={categories}
            keyExtractor={item => item._id}
            renderItem={({ item }) => {
              const selected = selectedCategory === item._id;
              return (
                <TouchableOpacity
                  style={[styles.modalItem, selected && styles.modalItemActive]}
                  onPress={() => selectCategory(item._id, item.name)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalItemText, selected && styles.modalItemTextActive]}>
                    {item.name}
                  </Text>
                  {selected
                    ? <Ionicons name="checkmark-circle" size={22} color={PINK} />
                    : <View style={styles.uncheckedCircle} />
                  }
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={styles.emptyList}>
                <Text style={styles.emptyText}>No categories available</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: SW * 0.06, paddingBottom: 60, paddingTop: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logoImg: { width: SW * 0.72, height: 108 },
  title: {
    fontSize: 24, fontWeight: '700', color: '#1a1a1a',
    textAlign: 'center', marginBottom: 6, lineHeight: 32,
  },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 3, marginTop: 18 },
  required: { color: PINK },
  optionalLabel: { fontWeight: '400', color: '#aaa', fontSize: 13 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8, lineHeight: 17 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 52,
  },
  textAreaRow: { height: 'auto' as any, alignItems: 'flex-start', paddingVertical: 12 },
  inputErr: { borderColor: '#E53E3E' },
  icon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  textArea: {
    minHeight: 96,
    ...Platform.select({ android: { textAlignVertical: 'top' as const }, ios: { paddingTop: 4 } }),
  },
  errText: { fontSize: 12, color: '#E53E3E', marginTop: 4 },
  charHint: { fontSize: 12, color: '#9CA3AF', flex: 1 },
  charCount: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  charCountWarn: { color: '#E53E3E' },
  descFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    borderColor: BORDER, backgroundColor: 'white', alignItems: 'center', gap: 3,
  },
  typeBtnActive: { borderColor: PINK, backgroundColor: '#FFF0F5' },
  typeBtnText: { fontSize: 12, color: '#888', fontWeight: '600' },
  typeBtnTextActive: { color: PINK },
  typeBtnHint: { fontSize: 10, color: '#bbb', textAlign: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF0F5', borderRadius: 20, borderWidth: 1,
    borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 5,
  },
  tagText: { fontSize: 12, color: PINK, fontWeight: '500' },
  modeTabs: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    borderColor: BORDER, backgroundColor: 'white',
  },
  modeTabActive: { borderColor: PINK, backgroundColor: '#FFF0F5' },
  modeTabText: { fontSize: 13, color: '#888', fontWeight: '500' },
  modeTabTextActive: { color: PINK },
  searchBtn: { paddingLeft: 6 },
  locationCard: {
    marginTop: 10,
    backgroundColor: '#F0FFF4', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#BBF7D0', paddingHorizontal: 14, paddingVertical: 12,
  },
  locationCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  locationDetectedLabel: { flex: 1, fontSize: 12, color: '#059669', fontWeight: '500' },
  locationField: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'white', borderRadius: 10, borderWidth: 1.5,
    borderColor: '#BBF7D0', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
  },
  locationAddressInput: {
    flex: 1, fontSize: 14, color: '#1a1a1a', minHeight: 40,
    ...Platform.select({ android: { textAlignVertical: 'top' as const }, ios: { paddingTop: 4 } }),
  },
  locationMetaRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4,
  },
  locationMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationMetaText: { fontSize: 12, color: '#6B7280' },
  locationMetaDot: { fontSize: 12, color: '#9CA3AF' },
  locationAddress: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  locationSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  unitLabel: { fontSize: 14, color: '#888', marginLeft: 6 },
  submitBtn: {
    backgroundColor: PINK, borderRadius: 30, paddingVertical: 16, marginTop: 32,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PINK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  submitText: { color: 'white', fontSize: 16, fontWeight: '600' },
  footerNote: { textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 16 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  modalHint: { fontSize: 13, color: '#9CA3AF', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f9f9f9',
  },
  modalItemActive: { backgroundColor: '#FFF0F5' },
  modalItemText: { fontSize: 15, color: '#374151' },
  modalItemTextActive: { color: PINK, fontWeight: '600' },
  uncheckedCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: '#D1D5DB',
  },
  modalFooter: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  doneBtn: {
    backgroundColor: PINK, borderRadius: 30, paddingVertical: 14,
    alignItems: 'center', elevation: 3,
  },
  doneBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
  emptyList: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
  successScreen: {
    flex: 1, backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  successLogo: { width: SW * 0.65, height: SW * 0.65, marginBottom: 28 },
  successTitle: {
    fontSize: 26, fontWeight: '700', color: '#1a1a1a',
    textAlign: 'center', marginBottom: 12,
  },
  successSub: {
    fontSize: 16, color: '#888', textAlign: 'center', lineHeight: 24,
  },
  decoTopLeft: { position: 'absolute', top: SW * 0.18, left: SW * 0.08, fontSize: 30 },
  decoTopRight: { position: 'absolute', top: SW * 0.12, right: SW * 0.1, fontSize: 24 },
  decoMidLeft: { position: 'absolute', top: '42%', left: SW * 0.05, fontSize: 22 },
  decoMidRight: { position: 'absolute', top: '36%', right: SW * 0.06, fontSize: 26 },
});

export default VendorProfileSetup;
