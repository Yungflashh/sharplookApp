import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  StatusBar,
  Modal,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { vendorAPI, userAPI, categoriesAPI, handleAPIError } from '@/api/api';
import LocationPickerModal, { LocationResult } from '@/components/LocationPickerModal';
import { confirmEmailVerification } from '@/utils/authHelper';
import { toast } from '@/components/ui/Toast';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'VendorProfileSetup'> & {
  onSetupComplete?: () => void;
};

const { width: SW } = Dimensions.get('window');
const P = '#E91E63';
const P_LIGHT = '#FEE2F0';
const BORDER = '#F0F0F0';
const TEXT = '#1A1A1A';
const HINT = '#9CA3AF';
const BG = '#fff';

type BusinessType = 'solo_practitioner' | 'small_business' | 'salon_spa' | 'studio';
type VendorType = 'home_service' | 'in_shop' | 'both';

const BUSINESS_TYPES: { value: BusinessType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'solo_practitioner', label: 'Solo Practitioner', icon: 'person-outline' },
  { value: 'small_business', label: 'Small Business', icon: 'people-outline' },
  { value: 'salon_spa', label: 'Salon / Spa', icon: 'storefront-outline' },
  { value: 'studio', label: 'Studio / Boutique', icon: 'home-outline' },
];

const VENDOR_TYPES: { value: VendorType; label: string }[] = [
  { value: 'home_service', label: 'Home Service (I travel to clients)' },
  { value: 'in_shop', label: 'In-Shop (Clients come to me)' },
  { value: 'both', label: 'Both (Home & In-Shop)' },
];

const EXPERIENCE_OPTIONS = [
  { label: 'Less than 1 Year', value: 0 },
  { label: '1 – 2 Years', value: 1 },
  { label: '3 – 4 Years', value: 3 },
  { label: '5 – 6 Years', value: 5 },
  { label: '7 – 10 Years', value: 7 },
  { label: '10+ Years', value: 10 },
];

interface Category { _id: string; name: string }

const VendorProfileSetup = ({ route, navigation, onSetupComplete }: Props) => {
  const fromRegistration = route?.params?.fromRegistration ?? false;

  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [vendorType, setVendorType] = useState<VendorType>('home_service');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [yearsOfExperience, setYearsOfExperience] = useState<number | null>(null);
  const [yearsLabel, setYearsLabel] = useState('');
  const [serviceRadius, setServiceRadius] = useState('10');
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showBizTypeSheet, setShowBizTypeSheet] = useState(false);
  const [showVendorTypeSheet, setShowVendorTypeSheet] = useState(false);
  const [showExpSheet, setShowExpSheet] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await categoriesAPI.getAll();
      if (res.success && res.data) setCategories(res.data);
    } catch { /* silent */ } finally { setLoadingCategories(false); }
  };

  const clearErr = (f: string) => setErrors(prev => ({ ...prev, [f]: '' }));

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.error('Gallery permission denied'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85, allowsEditing: true, aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      clearErr('images');
    }
  };

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.error('Gallery permission denied'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85, allowsEditing: true, aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
      clearErr('images');
    }
  };

  const handleLocationConfirm = (result: LocationResult) => {
    setLocation(result);
    setShowLocationPicker(false);
    clearErr('location');
  };

  const toggleCategory = (id: string, name: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(id)) {
        setSelectedCategoryNames(ns => ns.filter(n => n !== name));
        return prev.filter(c => c !== id);
      } else {
        setSelectedCategoryNames(ns => [...ns, name]);
        return [...prev, id];
      }
    });
    clearErr('category');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!avatarUri) e.images = 'Please add your profile photo';
    else if (!coverUri) e.images = 'Please add a cover photo for your business';
    if (!businessType) e.businessType = 'Please select a business type';
    if (selectedCategories.length === 0) e.category = 'Please select at least one service category';
    if (!location) e.location = 'Please set your business location';
    if (!businessDescription.trim() || businessDescription.trim().length < 20)
      e.businessDescription = 'Business description must be at least 20 characters';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      const payload: any = {
        businessDescription: businessDescription.trim(),
        businessType,
        vendorType,
        categories: selectedCategories,
        primaryCategory: selectedCategories[0],
        location: {
          type: 'Point',
          coordinates: location!.coordinates,
          address: location!.address,
          city: location!.city,
          state: location!.state,
          country: location!.country,
        },
      };
      if (businessName.trim()) payload.businessName = businessName.trim();
      if (yearsOfExperience !== null) payload.yearsOfExperience = yearsOfExperience;
      if (serviceRadius) payload.serviceRadius = parseInt(serviceRadius, 10);

      // Run profile setup + image uploads in parallel
      const tasks: Promise<any>[] = [vendorAPI.setupProfile(payload)];
      if (avatarUri) tasks.push(userAPI.uploadAvatarOnly(avatarUri));
      if (coverUri) tasks.push(vendorAPI.uploadCoverImage(coverUri));

      const [response] = await Promise.all(tasks);

      if (response.success) {
        setShowSuccess(true);
        if (fromRegistration) {
          // Lift auth gate — RootNavigator will switch to Main
          await confirmEmailVerification();
        }
        setTimeout(() => onSetupComplete?.(), 5000);
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
        if (Object.keys(mapped).length > 0) setErrors(prev => ({ ...prev, ...mapped }));
        else toast.error('Error', apiError.message || 'Failed to setup vendor profile');
      } else {
        toast.error('Error', apiError.message || 'Failed to setup vendor profile');
      }
    } finally { setLoading(false); }
  };

  if (showSuccess) {
    return (
      <View style={ss.successScreen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Decorative top blob */}
        <View style={ss.successBlob} />

        {/* Logo */}
        <Image
          source={require('../../../assets/lookrealMainLogo.png')}
          style={ss.successLogo}
          resizeMode="contain"
        />

        {/* Check ring + circle */}
        <View style={ss.successRing}>
          <View style={ss.successCircle}>
            <Ionicons name="checkmark-sharp" size={52} color="#fff" />
          </View>
        </View>

        <Text style={ss.successTitle}>Profile Complete!</Text>
        <Text style={ss.successSub}>
          {'Your vendor profile is live.\nClients can now discover and book your services.'}
        </Text>

        <TouchableOpacity
          style={ss.successBtn}
          onPress={() => onSetupComplete?.()}
          activeOpacity={0.85}
        >
          <Text style={ss.successBtnTxt}>Get Started</Text>
          <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={ss.successHint}>Navigating automatically in a moment...</Text>
      </View>
    );
  }

  const bizTypeLabel = BUSINESS_TYPES.find(b => b.value === businessType)?.label || '';
  const vendorTypeLabel = VENDOR_TYPES.find(v => v.value === vendorType)?.label || '';

  return (
    <SafeAreaView style={ss.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={ss.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back (only if not fromRegistration going to main) */}
        {!fromRegistration && (
          <TouchableOpacity style={ss.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <View style={ss.backCircle}>
              <Ionicons name="chevron-back" size={20} color={P} />
            </View>
          </TouchableOpacity>
        )}

        {/* Logo */}
        <View style={ss.logoWrap}>
          <Image source={require('../../../assets/lookrealMainLogo.png')} style={ss.logo} resizeMode="contain" />
        </View>

        <Text style={ss.title}>Tell us about your{'\n'}beauty business</Text>
        <Text style={ss.subtitle}>This helps clients find and trust you</Text>

        {/* Cover + Avatar Images — both required */}
        <View style={ss.imageSection}>
          {/* Cover */}
          <TouchableOpacity style={ss.coverPicker} onPress={pickCover} activeOpacity={0.8}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
              <View style={ss.coverPlaceholder}>
                <Ionicons name="image-outline" size={30} color={P} />
                <Text style={ss.coverPlaceholderTxt}>Add Cover Photo</Text>
                <Text style={ss.coverPlaceholderHint}>Required · 16:9 recommended</Text>
              </View>
            )}
            <View style={ss.coverCamBadge}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Avatar overlapping cover bottom-left */}
          <TouchableOpacity style={ss.avatarPicker} onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={ss.avatarPickerImg} resizeMode="cover" />
            ) : (
              <View style={ss.avatarPlaceholder}>
                <Ionicons name="person" size={26} color={P} />
              </View>
            )}
            <View style={ss.avatarCamBadge}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Image labels row */}
        <View style={ss.imageLabels}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7}>
            <Text style={ss.imageLabelLink}>{avatarUri ? 'Change profile photo' : 'Add profile photo *'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickCover} activeOpacity={0.7}>
            <Text style={ss.imageLabelLink}>{coverUri ? 'Change cover' : 'Add cover *'}</Text>
          </TouchableOpacity>
        </View>
        {errors.images ? <Text style={[ss.err, { marginBottom: 8 }]}>{errors.images}</Text> : null}

        {/* Business Name (optional) */}
        <View style={ss.field}>
          <Text style={ss.label}>Business Name <Text style={ss.optional}>(optional)</Text></Text>
          <View style={[ss.inputRow, errors.businessName ? ss.rowErr : null]}>
            <Ionicons name="business-outline" size={16} color={P} style={ss.icon} />
            <TextInput
              style={ss.textInput}
              placeholder="e.g. Glow Studio, Clara's Nails"
              placeholderTextColor={HINT}
              value={businessName}
              onChangeText={v => { setBusinessName(v); clearErr('businessName'); }}
              maxLength={100}
              editable={!loading}
            />
          </View>
          {errors.businessName ? <Text style={ss.err}>{errors.businessName}</Text> : null}
        </View>

        {/* Business Type */}
        <View style={ss.field}>
          <Text style={ss.label}>Business Type <Text style={ss.required}>*</Text></Text>
          <TouchableOpacity
            style={[ss.inputRow, errors.businessType ? ss.rowErr : null]}
            onPress={() => setShowBizTypeSheet(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="briefcase-outline" size={16} color={P} style={ss.icon} />
            <Text style={[ss.inputText, !businessType && { color: HINT }]}>
              {bizTypeLabel || 'Select business type'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={HINT} />
          </TouchableOpacity>
          {errors.businessType ? <Text style={ss.err}>{errors.businessType}</Text> : null}
        </View>

        {/* Service Category */}
        <View style={ss.field}>
          <Text style={ss.label}>Service Category <Text style={ss.required}>*</Text></Text>
          <TouchableOpacity
            style={[ss.inputRow, errors.category ? ss.rowErr : null]}
            onPress={() => setShowCategorySheet(true)}
            activeOpacity={0.7}
            disabled={loadingCategories}
          >
            <Ionicons name="grid-outline" size={16} color={P} style={ss.icon} />
            {loadingCategories
              ? <ActivityIndicator size="small" color={P} style={{ flex: 1 }} />
              : <Text style={[ss.inputText, selectedCategoryNames.length === 0 && { color: HINT }]} numberOfLines={1}>
                  {selectedCategoryNames.length > 0
                    ? selectedCategoryNames.join(', ')
                    : 'Select service categories'}
                </Text>
            }
            <Ionicons name="chevron-down" size={16} color={HINT} />
          </TouchableOpacity>
          {selectedCategories.length > 0 && (
            <View style={ss.tagRow}>
              {selectedCategoryNames.map((name, i) => (
                <TouchableOpacity
                  key={selectedCategories[i]}
                  style={ss.tag}
                  onPress={() => toggleCategory(selectedCategories[i], name)}
                  activeOpacity={0.7}
                >
                  <Text style={ss.tagText}>{name}</Text>
                  <Ionicons name="close" size={12} color={P} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {errors.category ? <Text style={ss.err}>{errors.category}</Text> : null}
        </View>

        {/* Location */}
        <View style={ss.field}>
          <Text style={ss.label}>Location <Text style={ss.required}>*</Text></Text>
          <TouchableOpacity
            style={[ss.locationPickerBtn, errors.location && ss.rowErr]}
            onPress={() => setShowLocationPicker(true)}
            activeOpacity={0.75}
          >
            {location ? (
              <>
                <View style={ss.locationPinDot} />
                <View style={ss.locationTextCol}>
                  <Text style={ss.locationAddress} numberOfLines={1}>{location.address || [location.city, location.state].filter(Boolean).join(', ')}</Text>
                  <Text style={ss.locationMeta}>
                    {[location.city, location.state, location.country].filter(Boolean).join(' · ')}
                    {'  '}
                    <Text style={ss.coordsTxt}>
                      {location.coordinates[1].toFixed(4)}, {location.coordinates[0].toFixed(4)}
                    </Text>
                  </Text>
                </View>
                <Ionicons name="pencil" size={15} color={P} />
              </>
            ) : (
              <>
                <Ionicons name="map" size={18} color={P} />
                <Text style={ss.locationBtnTxt}>Pick on Map</Text>
                <Ionicons name="chevron-forward" size={15} color={HINT} />
              </>
            )}
          </TouchableOpacity>
          {errors.location ? <Text style={ss.err}>{errors.location}</Text> : null}
        </View>

        {/* Years of Experience */}
        <View style={ss.field}>
          <Text style={ss.label}>Years of Experience <Text style={ss.optional}>(optional)</Text></Text>
          <TouchableOpacity
            style={ss.inputRow}
            onPress={() => setShowExpSheet(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={16} color={P} style={ss.icon} />
            <Text style={[ss.inputText, !yearsLabel && { color: HINT }]}>
              {yearsLabel || 'Select experience range'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={HINT} />
          </TouchableOpacity>
        </View>

        {/* Service Type */}
        <View style={ss.field}>
          <Text style={ss.label}>Service Type <Text style={ss.required}>*</Text></Text>
          <TouchableOpacity
            style={ss.inputRow}
            onPress={() => setShowVendorTypeSheet(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="car-outline" size={16} color={P} style={ss.icon} />
            <Text style={ss.inputText} numberOfLines={1}>{vendorTypeLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={HINT} />
          </TouchableOpacity>
        </View>

        {/* Business Description */}
        <View style={ss.field}>
          <Text style={ss.label}>Business Description <Text style={ss.required}>*</Text></Text>
          <Text style={ss.hint}>Tell clients what makes your services special (min 20 characters)</Text>
          <View style={[ss.textAreaRow, errors.businessDescription ? ss.rowErr : null]}>
            <TextInput
              style={ss.textArea}
              placeholder="Describe your services, specialties, and what makes you unique..."
              placeholderTextColor={HINT}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
              value={businessDescription}
              onChangeText={v => { setBusinessDescription(v); clearErr('businessDescription'); }}
              editable={!loading}
            />
          </View>
          <View style={ss.descFooter}>
            {errors.businessDescription
              ? <Text style={ss.err}>{errors.businessDescription}</Text>
              : <Text style={ss.charHint}>
                  {businessDescription.length < 20
                    ? `${20 - businessDescription.length} more characters needed`
                    : ''}
                </Text>
            }
            <Text style={[ss.charCount, businessDescription.length > 950 && { color: '#E53E3E' }]}>
              {businessDescription.length}/1000
            </Text>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[ss.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <><Text style={ss.submitTxt}>Complete Setup</Text><Ionicons name="chevron-forward" size={18} color="#fff" /></>
          }
        </TouchableOpacity>

        <Text style={ss.footerNote}>You can update these details anytime from your profile settings.</Text>
      </ScrollView>

      {/* Business Type Sheet */}
      <Modal visible={showBizTypeSheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBizTypeSheet(false)}>
        <SafeAreaView style={ss.sheetSafe} edges={['top', 'bottom']}>
          <View style={ss.sheetHeader}>
            <Text style={ss.sheetTitle}>Business Type</Text>
            <TouchableOpacity onPress={() => setShowBizTypeSheet(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={TEXT} />
            </TouchableOpacity>
          </View>
          {BUSINESS_TYPES.map(item => {
            const sel = businessType === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[ss.sheetItem, sel && ss.sheetItemSel]}
                onPress={() => { setBusinessType(item.value); clearErr('businessType'); setShowBizTypeSheet(false); }}
                activeOpacity={0.7}
              >
                <View style={[ss.sheetIconCircle, sel && ss.sheetIconCircleSel]}>
                  <Ionicons name={item.icon} size={18} color={sel ? '#fff' : P} />
                </View>
                <Text style={[ss.sheetItemTxt, sel && { color: P, fontWeight: '600' }]}>{item.label}</Text>
                {sel ? <Ionicons name="checkmark-circle" size={22} color={P} /> : <View style={ss.unchecked} />}
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
      </Modal>

      {/* Service Type Sheet */}
      <Modal visible={showVendorTypeSheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowVendorTypeSheet(false)}>
        <SafeAreaView style={ss.sheetSafe} edges={['top', 'bottom']}>
          <View style={ss.sheetHeader}>
            <Text style={ss.sheetTitle}>Service Type</Text>
            <TouchableOpacity onPress={() => setShowVendorTypeSheet(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={TEXT} />
            </TouchableOpacity>
          </View>
          {VENDOR_TYPES.map(item => {
            const sel = vendorType === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[ss.sheetItem, sel && ss.sheetItemSel]}
                onPress={() => { setVendorType(item.value); setShowVendorTypeSheet(false); }}
                activeOpacity={0.7}
              >
                <Text style={[ss.sheetItemTxt, sel && { color: P, fontWeight: '600' }]}>{item.label}</Text>
                {sel ? <Ionicons name="checkmark-circle" size={22} color={P} /> : <View style={ss.unchecked} />}
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
      </Modal>

      {/* Category Sheet */}
      <Modal visible={showCategorySheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCategorySheet(false)}>
        <SafeAreaView style={ss.sheetSafe} edges={['top', 'bottom']}>
          <View style={ss.sheetHeader}>
            <Text style={ss.sheetTitle}>Service Categories</Text>
            <TouchableOpacity onPress={() => setShowCategorySheet(false)} activeOpacity={0.7}>
              <Text style={ss.doneTxt}>Done</Text>
            </TouchableOpacity>
          </View>
          <Text style={ss.sheetHint}>Select all categories that apply to your business</Text>
          <FlatList
            data={categories}
            keyExtractor={item => item._id}
            renderItem={({ item }) => {
              const sel = selectedCategories.includes(item._id);
              return (
                <TouchableOpacity
                  style={[ss.sheetItem, sel && ss.sheetItemSel]}
                  onPress={() => toggleCategory(item._id, item.name)}
                  activeOpacity={0.7}
                >
                  <Text style={[ss.sheetItemTxt, sel && { color: P, fontWeight: '600' }]}>{item.name}</Text>
                  {sel ? <Ionicons name="checkmark-circle" size={22} color={P} /> : <View style={ss.unchecked} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: HINT }}>No categories available</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Years of Experience Sheet */}
      <Modal visible={showExpSheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowExpSheet(false)}>
        <SafeAreaView style={ss.sheetSafe} edges={['top', 'bottom']}>
          <View style={ss.sheetHeader}>
            <Text style={ss.sheetTitle}>Years of Experience</Text>
            <TouchableOpacity onPress={() => setShowExpSheet(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={TEXT} />
            </TouchableOpacity>
          </View>
          {EXPERIENCE_OPTIONS.map(opt => {
            const sel = yearsOfExperience === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[ss.sheetItem, sel && ss.sheetItemSel]}
                onPress={() => { setYearsOfExperience(opt.value); setYearsLabel(opt.label); setShowExpSheet(false); }}
                activeOpacity={0.7}
              >
                <Text style={[ss.sheetItemTxt, sel && { color: P, fontWeight: '600' }]}>{opt.label}</Text>
                {sel ? <Ionicons name="checkmark-circle" size={22} color={P} /> : <View style={ss.unchecked} />}
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
      </Modal>

      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={handleLocationConfirm}
        initialLocation={location}
      />
    </SafeAreaView>
  );
};

const ss = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: SW * 0.06, paddingBottom: 60, paddingTop: 8 },

  // Image pickers
  imageSection: { marginBottom: 8, position: 'relative' },
  coverPicker: {
    width: '100%', height: 148,
    backgroundColor: P_LIGHT, borderRadius: 14,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    marginBottom: 0,
  },
  coverPlaceholder: { alignItems: 'center', gap: 6 },
  coverPlaceholderTxt: { fontSize: 14, color: P, fontWeight: '600' },
  coverPlaceholderHint: { fontSize: 11, color: HINT },
  coverCamBadge: {
    position: 'absolute', bottom: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center',
  },
  avatarPicker: {
    position: 'absolute', bottom: -34, left: 14,
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 3, borderColor: BG,
    overflow: 'hidden', backgroundColor: P_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarPickerImg: { width: '100%', height: '100%' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  avatarCamBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center',
  },
  imageLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 40, marginBottom: 6,
  },
  imageLabelLink: { fontSize: 12, color: P, fontWeight: '600' },
  backBtn: { marginBottom: 12 },
  backCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { width: SW * 0.42, height: 56 },
  title: { fontSize: 22, fontWeight: '700', color: TEXT, textAlign: 'center', marginBottom: 6, lineHeight: 30 },
  subtitle: { fontSize: 13, color: HINT, textAlign: 'center', marginBottom: 28 },
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 8 },
  required: { color: P },
  optional: { fontWeight: '400', color: HINT, fontSize: 12 },
  hint: { fontSize: 12, color: HINT, marginBottom: 8, lineHeight: 17 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 52,
  },
  rowErr: { borderColor: '#E53E3E' },
  icon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: TEXT },
  inputText: { flex: 1, fontSize: 15, color: TEXT },
  textAreaRow: {
    backgroundColor: '#FAFAFA', borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  textArea: {
    minHeight: 96, fontSize: 15, color: TEXT,
    ...Platform.select({ android: { textAlignVertical: 'top' as const }, ios: { paddingTop: 4 } }),
  },
  descFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  charHint: { fontSize: 12, color: HINT, flex: 1 },
  charCount: { fontSize: 12, color: HINT },
  err: { fontSize: 12, color: '#E53E3E', marginTop: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: P_LIGHT, borderRadius: 20,
    borderWidth: 1, borderColor: '#F8BBD0',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tagText: { fontSize: 12, color: P, fontWeight: '500' },
  locationPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F7F8FA', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  locationPinDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: P, flexShrink: 0,
  },
  locationTextCol: { flex: 1 },
  locationAddress: { fontSize: 14, color: TEXT, fontWeight: '600' },
  locationMeta: { fontSize: 11, color: HINT, marginTop: 2 },
  coordsTxt: { fontSize: 10, color: HINT, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  locationBtnTxt: { flex: 1, fontSize: 15, color: P, fontWeight: '600' },
  submitBtn: {
    backgroundColor: P, borderRadius: 30, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: P, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    marginTop: 8,
  },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerNote: { textAlign: 'center', fontSize: 12, color: HINT, marginTop: 16 },
  // Success screen
  successScreen: {
    flex: 1, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SW * 0.1,
  },
  successBlob: {
    position: 'absolute', top: -SW * 0.55,
    width: SW * 2, height: SW * 1.4,
    borderRadius: SW, backgroundColor: P_LIGHT,
  },
  successLogo: { width: SW * 0.38, height: 56, marginBottom: 36 },
  successRing: {
    width: 116, height: 116, borderRadius: 58,
    borderWidth: 3, borderColor: P_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  successCircle: {
    width: 94, height: 94, borderRadius: 47,
    backgroundColor: P,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 12 },
  successSub: { fontSize: 14, color: HINT, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  successBtn: {
    backgroundColor: P, borderRadius: 50,
    paddingVertical: 15, width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: P, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    marginBottom: 16,
  },
  successBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  successHint: { fontSize: 12, color: HINT },
  // Bottom sheets
  sheetSafe: { flex: 1, backgroundColor: '#fff' },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  sheetHint: { fontSize: 13, color: HINT, paddingHorizontal: 20, paddingVertical: 10 },
  doneTxt: { fontSize: 15, color: P, fontWeight: '700' },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F9F9F9',
  },
  sheetItemSel: { backgroundColor: P_LIGHT },
  sheetIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  sheetIconCircleSel: { backgroundColor: P },
  sheetItemTxt: { flex: 1, fontSize: 15, color: TEXT },
  unchecked: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D1D5DB' },
});

export default VendorProfileSetup;
