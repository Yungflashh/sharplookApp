import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { categoriesAPI, offerAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  blue: '#3B82F6',
  blueSoft: '#DBEAFE',
  green: '#10B981',
  greenSoft: '#D1FAE5',
  gold: '#F59E0B',
  goldSoft: '#FEF3C7',
  orange: '#F97316',
  orangeSoft: '#FFEDD5',
  red: '#EF4444',
  redSoft: '#FEE2E2',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Section label */
const Label: React.FC<{ text: string; required?: boolean }> = ({ text, required }) => (
  <Text
    style={{
      fontSize: 12,
      fontWeight: '700',
      color: BRAND.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 8,
    }}
  >
    {text}
    {required && <Text style={{ color: BRAND.primary }}> *</Text>}
  </Text>
);

/** Inline error row */
const FieldError: React.FC<{ message: string }> = ({ message }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
    <Ionicons name="alert-circle" size={12} color={BRAND.red} />
    <Text style={{ fontSize: 11, color: BRAND.red, marginLeft: 4, fontWeight: '500' }}>
      {message}
    </Text>
  </View>
);

/** Styled text input */
const StyledInput: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  hasError?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: any;
  maxLength?: number;
  style?: any;
}> = ({ hasError, style, ...props }) => (
  <TextInput
    style={[
      {
        backgroundColor: BRAND.surfaceAlt,
        borderWidth: 1.5,
        borderColor: hasError ? BRAND.red : BRAND.border,
        borderRadius: 13,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        fontSize: 14,
        color: BRAND.textPrimary,
        textAlignVertical: props.multiline ? 'top' : 'center',
      },
      style,
    ]}
    placeholderTextColor={BRAND.textMuted}
    autoCorrect={false}
    {...props}
  />
);

/** Hint info chip */
const HintChip: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
  bg: string;
}> = ({ icon, text, color, bg }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: bg,
      borderRadius: 11,
      padding: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: `${color}33`,
    }}
  >
    <Ionicons name={icon} size={13} color={color} style={{ marginTop: 1, marginRight: 7 }} />
    <Text style={{ fontSize: 12, color, fontWeight: '500', flex: 1, lineHeight: 17 }}>{text}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CreateOfferScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [errors, setErrors] = useState<any>({});

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    serviceType: 'both' as 'home' | 'shop' | 'both',
    proposedPrice: '',
    location: { address: '', city: '', state: '', coordinates: [] as number[] },
    preferredDate: '',
    preferredTime: '',
    flexibility: 'flexible' as 'flexible' | 'specific' | 'urgent',
    expiresInDays: 7,
  });

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await categoriesAPI.getAll();
      const apiData = response.data || response;
      const categoryData = apiData.data || apiData || [];
      setCategories(categoryData);
      if (categoryData.length === 0) toast.info('Notice', 'No categories available. Please try again later.');
    } catch {
      toast.error('Error', 'Failed to load categories. Please check your connection.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { toast.error('Permission denied', 'Location permission is required'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      const [addr] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setFormData({
        ...formData,
        location: {
          coordinates: [loc.coords.longitude, loc.coords.latitude],
          address: `${addr.street || ''} ${addr.name || ''}`.trim(),
          city: addr.city || '',
          state: addr.region || '',
        },
      });
      setErrors({ ...errors, location: '' });
      toast.success('Done', 'Location updated successfully.');
    } catch {
      toast.error('Error', 'Could not get location.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const pickImages = async () => {
    if (selectedImages.length >= 5) { toast.warning('Limit Reached', 'You can only upload up to 5 images'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) {
      const slots = 5 - selectedImages.length;
      const newImages = result.assets.slice(0, slots).map((asset, i) => {
        const ext = asset.uri.split('.').pop();
        return { uri: asset.uri, name: `offer_${Date.now()}_${i}.${ext}`, type: `image/${ext}` };
      });
      setSelectedImages([...selectedImages, ...newImages]);
    }
  };

  const validateForm = () => {
    const e: any = {};
    if (!formData.title.trim()) e.title = 'Title is required';
    if (!formData.description.trim()) e.description = 'Description is required';
    if (!formData.category) { e.category = 'Please select a category'; }
    else if (!categories.some((c) => c._id === formData.category)) e.category = 'Invalid category selected. Please select again.';
    if (!formData.proposedPrice || parseFloat(formData.proposedPrice) <= 0) e.proposedPrice = 'Price must be greater than 0';
    if ((formData.serviceType === 'home' || formData.serviceType === 'both') && !formData.location.coordinates?.length) e.location = 'Location is required for home service';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const offerData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        serviceType: formData.serviceType,
        proposedPrice: parseFloat(formData.proposedPrice),
        preferredDate: formData.preferredDate || undefined,
        preferredTime: formData.preferredTime || undefined,
        flexibility: formData.flexibility,
        expiresInDays: formData.expiresInDays,
      };
      if (formData.serviceType === 'home' || formData.serviceType === 'both') offerData.location = formData.location;
      const response = await offerAPI.createOffer(offerData, selectedImages);
      if (response.success) {
        toast.success('Offer Created!', 'Vendors will be able to respond soon.');
        navigation.goBack();
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const SERVICE_TYPE_OPTIONS = [
    { key: 'home', label: 'Home Service', icon: 'home-outline' as const, description: 'Vendor comes to you', color: BRAND.green, bg: BRAND.greenSoft },
    { key: 'shop', label: 'In-Shop', icon: 'storefront-outline' as const, description: 'You go to vendor', color: BRAND.blue, bg: BRAND.blueSoft },
    { key: 'both', label: 'Flexible', icon: 'repeat-outline' as const, description: 'Either location works', color: BRAND.gold, bg: BRAND.goldSoft },
  ];

  const FLEXIBILITY_OPTIONS = [
    {
      key: 'flexible',
      label: 'Anytime',
      sub: 'No rush, I\'m flexible',
      icon: 'time-outline' as const,
      color: BRAND.green,
      bg: BRAND.greenSoft,
    },
    {
      key: 'specific',
      label: 'Scheduled',
      sub: 'I have a date in mind',
      icon: 'calendar-outline' as const,
      color: BRAND.blue,
      bg: BRAND.blueSoft,
    },
    {
      key: 'urgent',
      label: 'ASAP',
      sub: 'Need it right away',
      icon: 'flash-outline' as const,
      color: BRAND.orange,
      bg: BRAND.orangeSoft,
    },
  ];

  const SERVICE_HINTS: Record<string, { icon: keyof typeof Ionicons.glyphMap; text: string; color: string; bg: string }> = {
    home: { icon: 'information-circle-outline', text: 'Location is required. Vendors will come to your specified address.', color: BRAND.green, bg: BRAND.greenSoft },
    shop: { icon: 'information-circle-outline', text: "You'll visit the vendor's location. No address needed.", color: BRAND.blue, bg: BRAND.blueSoft },
    both: { icon: 'information-circle-outline', text: 'Vendors can offer either home service or in-shop service.', color: BRAND.gold, bg: BRAND.goldSoft },
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: BRAND.surface,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: BRAND.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 3 },
          }),
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            backgroundColor: BRAND.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: BRAND.border,
          }}
        >
          <Ionicons name="close" size={20} color={BRAND.textPrimary} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.3 }}>
            Make an Offer
          </Text>
          <Text style={{ fontSize: 11, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
            Let vendors compete for you
          </Text>
        </View>

        {/* Spacer */}
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── HOW IT WORKS BANNER ──────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderRadius: 18,
              padding: 16,
              marginBottom: 20,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: BRAND.primaryMuted,
              ...Platform.select({
                ios: { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
                android: { elevation: 2 },
              }),
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                backgroundColor: BRAND.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
                borderWidth: 1,
                borderColor: BRAND.primaryMuted,
              }}
            >
              <Ionicons name="bulb-outline" size={20} color={BRAND.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 3 }}>
                How it works
              </Text>
              <Text style={{ fontSize: 12, color: BRAND.textSecondary, lineHeight: 17 }}>
                Describe what you need and set your budget. Vendors will respond with their best proposals!
              </Text>
            </View>
          </View>

          {/* ── TITLE ────────────────────────────────────────────────────── */}
          <View style={{ marginBottom: 18 }}>
            <Label text="What do you need?" required />
            <StyledInput
              placeholder="e.g., Hair styling for wedding"
              value={formData.title}
              hasError={!!errors.title}
              onChangeText={(t) => { setFormData({ ...formData, title: t }); setErrors({ ...errors, title: '' }); }}
            />
            {errors.title && <FieldError message={errors.title} />}
          </View>

          {/* ── DESCRIPTION ──────────────────────────────────────────────── */}
          <View style={{ marginBottom: 18 }}>
            <Label text="Description" required />
            <StyledInput
              placeholder="Describe your requirements in detail…"
              value={formData.description}
              hasError={!!errors.description}
              multiline
              numberOfLines={5}
              style={{ minHeight: 110, paddingTop: 12 }}
              onChangeText={(t) => { setFormData({ ...formData, description: t }); setErrors({ ...errors, description: '' }); }}
            />
            {errors.description && <FieldError message={errors.description} />}
          </View>

          {/* ── CATEGORY ─────────────────────────────────────────────────── */}
          <View style={{ marginBottom: 18 }}>
            <Label text="Category" required />
            {loadingCategories ? (
              <View
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 14,
                  paddingVertical: 28,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: BRAND.border,
                }}
              >
                <ActivityIndicator size="small" color={BRAND.primary} />
                <Text style={{ color: BRAND.textMuted, fontSize: 12, marginTop: 8, fontWeight: '500' }}>
                  Loading categories…
                </Text>
              </View>
            ) : categories.length === 0 ? (
              <View
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 14,
                  paddingVertical: 28,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: BRAND.border,
                }}
              >
                <Ionicons name="alert-circle-outline" size={36} color={BRAND.textMuted} />
                <Text style={{ color: BRAND.textMuted, fontSize: 13, marginTop: 8, fontWeight: '500' }}>
                  No categories available
                </Text>
                <TouchableOpacity
                  onPress={loadCategories}
                  activeOpacity={0.8}
                  style={{
                    marginTop: 10,
                    backgroundColor: BRAND.primarySoft,
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: BRAND.primaryMuted,
                  }}
                >
                  <Text style={{ color: BRAND.primary, fontSize: 12, fontWeight: '700' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Dropdown trigger */}
                <TouchableOpacity
                  onPress={() => setShowCategoryDropdown(true)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: BRAND.surfaceAlt,
                    borderWidth: 1.5,
                    borderColor: errors.category ? BRAND.red : formData.category ? BRAND.primary : BRAND.border,
                    borderRadius: 13,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                  }}
                >
                  <Ionicons
                    name="grid-outline"
                    size={16}
                    color={formData.category ? BRAND.primary : BRAND.textMuted}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: formData.category ? BRAND.textPrimary : BRAND.textMuted,
                      fontWeight: formData.category ? '600' : '400',
                    }}
                  >
                    {formData.category
                      ? categories.find((c) => c._id === formData.category)?.name ?? 'Select a category'
                      : 'Select a category'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={BRAND.textMuted} />
                </TouchableOpacity>

                {/* Category modal */}
                <Modal transparent animationType="slide" visible={showCategoryDropdown}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setShowCategoryDropdown(false)}
                  >
                    <View
                      style={{
                        backgroundColor: '#fff',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        maxHeight: '70%',
                        paddingBottom: 30,
                      }}
                    >
                      {/* Header */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 20,
                          paddingTop: 18,
                          paddingBottom: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: BRAND.border,
                        }}
                      >
                        <Text style={{ fontSize: 17, fontWeight: '800', color: BRAND.textPrimary }}>
                          Select Category
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowCategoryDropdown(false)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            backgroundColor: BRAND.surfaceAlt,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: BRAND.border,
                          }}
                        >
                          <Ionicons name="close" size={17} color={BRAND.textPrimary} />
                        </TouchableOpacity>
                      </View>

                      {/* Alphabetical list */}
                      <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 12 }}
                      >
                        {[...categories]
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((cat) => {
                            const isSelected = formData.category === cat._id;
                            return (
                              <TouchableOpacity
                                key={cat._id}
                                onPress={() => {
                                  setFormData({ ...formData, category: cat._id });
                                  setErrors({ ...errors, category: '' });
                                  setShowCategoryDropdown(false);
                                }}
                                activeOpacity={0.7}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  paddingHorizontal: 14,
                                  paddingVertical: 14,
                                  borderRadius: 12,
                                  marginBottom: 4,
                                  backgroundColor: isSelected ? BRAND.primarySoft : 'transparent',
                                }}
                              >
                                <View
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    backgroundColor: isSelected ? BRAND.primaryMuted : BRAND.surfaceAlt,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                    borderWidth: 1,
                                    borderColor: isSelected ? BRAND.primaryLight : BRAND.border,
                                  }}
                                >
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? BRAND.primary : BRAND.textSecondary }}>
                                    {cat.name.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                                <Text
                                  style={{
                                    flex: 1,
                                    fontSize: 15,
                                    fontWeight: isSelected ? '700' : '500',
                                    color: isSelected ? BRAND.primary : BRAND.textPrimary,
                                  }}
                                >
                                  {cat.name}
                                </Text>
                                {isSelected && (
                                  <Ionicons name="checkmark-circle" size={20} color={BRAND.primary} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>
              </>
            )}
            {errors.category && <FieldError message={errors.category} />}
          </View>

          {/* ── SERVICE TYPE ─────────────────────────────────────────────── */}
          <View style={{ marginBottom: 18 }}>
            <Label text="Service Type" required />
            <View style={{ gap: 10 }}>
              {SERVICE_TYPE_OPTIONS.map((opt) => {
                const isActive = formData.serviceType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => {
                      setFormData({ ...formData, serviceType: opt.key as any });
                      if (opt.key === 'shop') setErrors({ ...errors, location: '' });
                    }}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: isActive ? opt.bg : BRAND.surface,
                      borderWidth: 1.5,
                      borderColor: isActive ? opt.color : BRAND.border,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        backgroundColor: isActive ? `${opt.color}22` : BRAND.surfaceAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name={opt.icon} size={20} color={isActive ? opt.color : BRAND.textMuted} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 2 }}>
                        {opt.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: BRAND.textSecondary }}>{opt.description}</Text>
                    </View>

                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isActive ? opt.color : BRAND.borderStrong,
                        backgroundColor: isActive ? opt.color : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isActive && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <HintChip {...SERVICE_HINTS[formData.serviceType]} />
          </View>

          {/* ── BUDGET ───────────────────────────────────────────────────── */}
          <View style={{ marginBottom: 18 }}>
            <Label text="Your Budget" required />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: BRAND.surfaceAlt,
                borderWidth: 1.5,
                borderColor: errors.proposedPrice ? BRAND.red : BRAND.border,
                borderRadius: 13,
                paddingHorizontal: 14,
                paddingVertical: 2,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  backgroundColor: BRAND.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: BRAND.primaryMuted,
                }}
              >
                <Ionicons name="cash-outline" size={17} color={BRAND.primary} />
              </View>
              <TextInput
                style={{ flex: 1, fontSize: 18, fontWeight: '800', color: BRAND.textPrimary, paddingVertical: Platform.OS === 'ios' ? 13 : 11 }}
                placeholder="0"
                placeholderTextColor={BRAND.border}
                value={formData.proposedPrice}
                keyboardType="numeric"
                onChangeText={(t) => { setFormData({ ...formData, proposedPrice: t.replace(/[^0-9]/g, '') }); setErrors({ ...errors, proposedPrice: '' }); }}
              />
              <Text style={{ fontSize: 13, color: BRAND.textMuted, fontWeight: '600' }}>NGN</Text>
            </View>
            {errors.proposedPrice && <FieldError message={errors.proposedPrice} />}
          </View>

          {/* ── FLEXIBILITY ──────────────────────────────────────────────── */}
          <View style={{ marginBottom: 18 }}>
            <Label text="When do you need it?" />
            <View style={{ gap: 10 }}>
              {FLEXIBILITY_OPTIONS.map((opt) => {
                const isActive = formData.flexibility === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => {
                      setFormData({ ...formData, flexibility: opt.key as any, preferredDate: '', preferredTime: '' });
                      setSelectedDate(new Date());
                    }}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: isActive ? opt.bg : BRAND.surface,
                      borderWidth: 1.5,
                      borderColor: isActive ? opt.color : BRAND.border,
                    }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: isActive ? `${opt.color}22` : BRAND.surfaceAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name={opt.icon} size={20} color={isActive ? opt.color : BRAND.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 2 }}>
                        {opt.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: BRAND.textSecondary }}>{opt.sub}</Text>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: isActive ? opt.color : BRAND.borderStrong,
                        backgroundColor: isActive ? opt.color : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isActive && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── DATE & TIME (only for Scheduled) ────────────────────────── */}
          {formData.flexibility === 'specific' && (
            <View style={{ marginBottom: 18 }}>
              <Label text="Preferred Date & Time" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Date picker trigger */}
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: BRAND.surfaceAlt,
                    borderWidth: 1.5,
                    borderColor: BRAND.border,
                    borderRadius: 13,
                    paddingHorizontal: 12,
                    paddingVertical: 13,
                    gap: 8,
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color={formData.preferredDate ? BRAND.blue : BRAND.textMuted} />
                  <Text
                    style={{
                      fontSize: 14,
                      color: formData.preferredDate ? BRAND.textPrimary : BRAND.textMuted,
                      fontWeight: formData.preferredDate ? '600' : '400',
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {formData.preferredDate || 'Pick date'}
                  </Text>
                </TouchableOpacity>

                {/* Time picker trigger */}
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: BRAND.surfaceAlt,
                    borderWidth: 1.5,
                    borderColor: BRAND.border,
                    borderRadius: 13,
                    paddingHorizontal: 12,
                    paddingVertical: 13,
                    gap: 8,
                  }}
                >
                  <Ionicons name="time-outline" size={16} color={formData.preferredTime ? BRAND.blue : BRAND.textMuted} />
                  <Text
                    style={{
                      fontSize: 14,
                      color: formData.preferredTime ? BRAND.textPrimary : BRAND.textMuted,
                      fontWeight: formData.preferredTime ? '600' : '400',
                      flex: 1,
                    }}
                  >
                    {formData.preferredTime || 'Pick time'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Android: inline pickers */}
              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  minimumDate={new Date()}
                  display="default"
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setSelectedDate(date);
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setFormData((prev) => ({ ...prev, preferredDate: `${y}-${m}-${d}` }));
                    }
                  }}
                />
              )}
              {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display="default"
                  onChange={(_, date) => {
                    setShowTimePicker(false);
                    if (date) {
                      setSelectedDate(date);
                      const h = String(date.getHours()).padStart(2, '0');
                      const min = String(date.getMinutes()).padStart(2, '0');
                      setFormData((prev) => ({ ...prev, preferredTime: `${h}:${min}` }));
                    }
                  }}
                />
              )}

              {/* iOS: modal pickers */}
              {Platform.OS === 'ios' && (
                <>
                  <Modal transparent animationType="slide" visible={showDatePicker}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                      activeOpacity={1}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={{ fontSize: 15, color: BRAND.textSecondary, fontWeight: '600' }}>Cancel</Text>
                          </TouchableOpacity>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: BRAND.textPrimary }}>Select Date</Text>
                          <TouchableOpacity onPress={() => {
                            const y = selectedDate.getFullYear();
                            const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                            const d = String(selectedDate.getDate()).padStart(2, '0');
                            setFormData((prev) => ({ ...prev, preferredDate: `${y}-${m}-${d}` }));
                            setShowDatePicker(false);
                          }}>
                            <Text style={{ fontSize: 15, color: BRAND.blue, fontWeight: '700' }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ backgroundColor: '#F9FAFB' }}>
                          <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            minimumDate={new Date()}
                            display="spinner"
                            themeVariant="light"
                            onChange={(_, date) => { if (date) setSelectedDate(date); }}
                            style={{ height: 216, width: '100%' }}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Modal>

                  <Modal transparent animationType="slide" visible={showTimePicker}>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                      activeOpacity={1}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                            <Text style={{ fontSize: 15, color: BRAND.textSecondary, fontWeight: '600' }}>Cancel</Text>
                          </TouchableOpacity>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: BRAND.textPrimary }}>Select Time</Text>
                          <TouchableOpacity onPress={() => {
                            const h = String(selectedDate.getHours()).padStart(2, '0');
                            const min = String(selectedDate.getMinutes()).padStart(2, '0');
                            setFormData((prev) => ({ ...prev, preferredTime: `${h}:${min}` }));
                            setShowTimePicker(false);
                          }}>
                            <Text style={{ fontSize: 15, color: BRAND.blue, fontWeight: '700' }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ backgroundColor: '#F9FAFB' }}>
                          <DateTimePicker
                            value={selectedDate}
                            mode="time"
                            display="spinner"
                            themeVariant="light"
                            onChange={(_, date) => { if (date) setSelectedDate(date); }}
                            style={{ height: 216, width: '100%' }}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                </>
              )}
            </View>
          )}

          {/* ASAP hint */}
          {formData.flexibility === 'urgent' && (
            <View style={{ marginBottom: 18 }}>
              <HintChip
                icon="flash"
                text="Vendors will see this as high priority and respond as quickly as possible."
                color={BRAND.orange}
                bg={BRAND.orangeSoft}
              />
            </View>
          )}

          {/* ── LOCATION (conditional) ───────────────────────────────────── */}
          {(formData.serviceType === 'home' || formData.serviceType === 'both') && (
            <View style={{ marginBottom: 18 }}>
              <Label
                text={`Location${formData.serviceType === 'home' ? '' : ' (optional)'}`}
                required={formData.serviceType === 'home'}
              />
              <TouchableOpacity
                onPress={getCurrentLocation}
                disabled={loadingLocation}
                activeOpacity={0.8}
                style={{
                  backgroundColor: BRAND.surfaceAlt,
                  borderWidth: 1.5,
                  borderColor: errors.location ? BRAND.red : BRAND.border,
                  borderRadius: 13,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    backgroundColor: BRAND.blueSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="location-outline" size={18} color={BRAND.blue} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: formData.location.coordinates?.length ? '600' : '400',
                      color: formData.location.coordinates?.length ? BRAND.textPrimary : BRAND.textMuted,
                    }}
                    numberOfLines={1}
                  >
                    {formData.location.coordinates?.length ? 'Location captured — edit below' : 'Tap to set your location'}
                  </Text>
                </View>

                {loadingLocation ? (
                  <ActivityIndicator size="small" color={BRAND.primary} />
                ) : (
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      backgroundColor: BRAND.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: BRAND.border,
                    }}
                  >
                    <Ionicons name={formData.location.coordinates?.length ? 'checkmark-circle' : 'navigate-outline'} size={14} color={formData.location.coordinates?.length ? BRAND.green : BRAND.textMuted} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Editable address fields — only show after coordinates are captured */}
              {formData.location.coordinates?.length >= 2 && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <TextInput
                    style={{
                      backgroundColor: BRAND.surfaceAlt,
                      borderWidth: 1,
                      borderColor: BRAND.border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                      color: BRAND.textPrimary,
                    }}
                    value={formData.location.address}
                    onChangeText={(text) => setFormData({ ...formData, location: { ...formData.location, address: text } })}
                    placeholder="Enter your address"
                    placeholderTextColor={BRAND.textMuted}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        backgroundColor: BRAND.surfaceAlt,
                        borderWidth: 1,
                        borderColor: BRAND.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: BRAND.textPrimary,
                      }}
                      value={formData.location.city}
                      onChangeText={(text) => setFormData({ ...formData, location: { ...formData.location, city: text } })}
                      placeholder="City"
                      placeholderTextColor={BRAND.textMuted}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        backgroundColor: BRAND.surfaceAlt,
                        borderWidth: 1,
                        borderColor: BRAND.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: BRAND.textPrimary,
                      }}
                      value={formData.location.state}
                      onChangeText={(text) => setFormData({ ...formData, location: { ...formData.location, state: text } })}
                      placeholder="State"
                      placeholderTextColor={BRAND.textMuted}
                    />
                  </View>
                </View>
              )}
              {errors.location && <FieldError message={errors.location} />}
            </View>
          )}

          {/* ── EXPIRY DAYS ──────────────────────────────────────────────── */}
          <View style={{ marginBottom: 18 }}>
            <Label text="Offer Valid For" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[3, 7, 14, 30].map((days) => {
                const isActive = formData.expiresInDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    onPress={() => setFormData({ ...formData, expiresInDays: days })}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 14,
                      backgroundColor: isActive ? BRAND.primarySoft : BRAND.surface,
                      borderWidth: 1.5,
                      borderColor: isActive ? BRAND.primary : BRAND.border,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '800',
                        color: isActive ? BRAND.primary : BRAND.textPrimary,
                        letterSpacing: -0.3,
                      }}
                    >
                      {days}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: isActive ? BRAND.primaryLight : BRAND.textMuted, marginTop: 2 }}>
                      days
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── IMAGES ───────────────────────────────────────────────────── */}
          <View style={{ marginBottom: 8 }}>
            <Label text={`Add Images (${selectedImages.length}/5)`} />

            <TouchableOpacity
              onPress={pickImages}
              disabled={selectedImages.length >= 5}
              activeOpacity={0.8}
              style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: selectedImages.length >= 5 ? BRAND.border : BRAND.primaryLight,
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
                backgroundColor: selectedImages.length >= 5 ? BRAND.surfaceAlt : BRAND.primarySoft,
              }}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  backgroundColor: selectedImages.length >= 5 ? BRAND.border : BRAND.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={26}
                  color={selectedImages.length >= 5 ? BRAND.textMuted : BRAND.primary}
                />
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: selectedImages.length >= 5 ? BRAND.textMuted : BRAND.primary,
                  marginBottom: 3,
                }}
              >
                {selectedImages.length >= 5 ? 'Maximum Reached' : 'Upload Images'}
              </Text>
              <Text style={{ fontSize: 11, color: BRAND.textMuted }}>Max 5 images · optional</Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingTop: 12 }}
              >
                {selectedImages.map((image, index) => (
                  <View key={index} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri: image.uri }}
                      style={{ width: 88, height: 88, borderRadius: 14 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => setSelectedImages(selectedImages.filter((_, i) => i !== index))}
                      activeOpacity={0.8}
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 24,
                        height: 24,
                        borderRadius: 8,
                        backgroundColor: BRAND.red,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: BRAND.surface,
                        ...Platform.select({
                          ios: { shadowColor: BRAND.red, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
                          android: { elevation: 4 },
                        }),
                      }}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>

        {/* ── SUBMIT ───────────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: BRAND.surface,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: insets.bottom + 14,
            borderTopWidth: 1,
            borderTopColor: BRAND.border,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 12 },
              android: { elevation: 10 },
            }),
          }}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden', opacity: loading ? 0.7 : 1 }}
          >
            <LinearGradient
              colors={[BRAND.primary, BRAND.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={19} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.1 }}>
                    Submit Offer
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateOfferScreen;