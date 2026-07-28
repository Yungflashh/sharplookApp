import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
  Image, KeyboardAvoidingView, Platform, StatusBar, Modal, StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { categoriesAPI, offerAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const BG     = '#FFF5F9';
const CARD   = '#FFFFFF';
const PINK   = '#E04079';
const PRI_DK = '#B5315F';
const TEXT1  = '#1A1A2E';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';

const CreateOfferScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading,           setLoading]           = useState(false);
  const [loadingLocation,   setLoadingLocation]   = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categories,        setCategories]        = useState<any[]>([]);
  const [selectedImages,    setSelectedImages]    = useState<any[]>([]);
  const [errors,            setErrors]            = useState<any>({});
  const [selectedDate,      setSelectedDate]      = useState(new Date());
  const [showDatePicker,    setShowDatePicker]    = useState(false);
  const [showTimePicker,    setShowTimePicker]    = useState(false);
  const [showCatModal,      setShowCatModal]      = useState(false);

  const [form, setForm] = useState({
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
      const res = await categoriesAPI.getAll();
      const d = res.data?.data || res.data || res || [];
      setCategories(d);
      if (d.length === 0) toast.info('Notice', 'No categories available. Please try again later.');
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
      setForm(f => ({
        ...f,
        location: {
          coordinates: [loc.coords.longitude, loc.coords.latitude],
          address: `${addr.street || ''} ${addr.name || ''}`.trim(),
          city: addr.city || '',
          state: addr.region || '',
        },
      }));
      setErrors((e: any) => ({ ...e, location: '' }));
      toast.success('Done', 'Location captured.');
    } catch {
      toast.error('Error', 'Could not get location.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const pickImages = async () => {
    if (selectedImages.length >= 5) { toast.warning('Limit Reached', 'Maximum 5 images'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) {
      const slots = 5 - selectedImages.length;
      const newImgs = result.assets.slice(0, slots).map((a, i) => {
        const ext = a.uri.split('.').pop();
        return { uri: a.uri, name: `offer_${Date.now()}_${i}.${ext}`, type: `image/${ext}` };
      });
      setSelectedImages(prev => [...prev, ...newImgs]);
    }
  };

  const validate = () => {
    const e: any = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.category) e.category = 'Please select a category';
    else if (!categories.some(c => c._id === form.category)) e.category = 'Invalid category — please select again';
    if (!form.proposedPrice || parseFloat(form.proposedPrice) <= 0) e.proposedPrice = 'Price must be greater than 0';
    if ((form.serviceType === 'home' || form.serviceType === 'both') && !form.location.coordinates?.length)
      e.location = 'Location is required for home service';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        serviceType: form.serviceType,
        proposedPrice: parseFloat(form.proposedPrice),
        preferredDate: form.preferredDate || undefined,
        preferredTime: form.preferredTime || undefined,
        flexibility: form.flexibility,
        expiresInDays: form.expiresInDays,
      };
      if (form.serviceType === 'home' || form.serviceType === 'both') payload.location = form.location;
      const res = await offerAPI.createOffer(payload, selectedImages);
      if (res.success) {
        toast.success('Offer Created!', 'Vendors will be able to respond soon.');
        navigation.goBack();
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const SERVICE_OPTS = [
    { key: 'home', label: 'Home Service', sub: 'Vendor comes to you',   icon: 'home-outline'      as const },
    { key: 'shop', label: 'In-Shop',      sub: 'You visit vendor',      icon: 'storefront-outline' as const },
    { key: 'both', label: 'Flexible',     sub: 'Either works',          icon: 'swap-horizontal'    as const },
  ];

  const FLEX_OPTS = [
    { key: 'flexible', label: 'Anytime',   sub: 'No rush, I\'m flexible', icon: 'time-outline'     as const },
    { key: 'specific', label: 'Scheduled', sub: 'I have a date in mind',  icon: 'calendar-outline' as const },
    { key: 'urgent',   label: 'ASAP',      sub: 'Need it right away',     icon: 'flash-outline'    as const },
  ];

  const selectedCatName = categories.find(c => c._id === form.category)?.name;

  return (
    <View style={[s.flex, { backgroundColor: BG, paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={PINK} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.headerTitle}>Make an Offer</Text>
          <Text style={s.headerSub}>Let vendors compete for you</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Tip */}
          <View style={s.tip}>
            <Ionicons name="bulb-outline" size={18} color={PINK} style={{ marginRight: 10, flexShrink: 0 }} />
            <Text style={s.tipTxt}>Describe what you need and set your budget. Vendors respond with their best proposals!</Text>
          </View>

          {/* Title */}
          <View style={s.group}>
            <Text style={s.label}>What do you need? <Text style={{ color: PINK }}>*</Text></Text>
            <TextInput
              style={[s.input, errors.title && s.inputError]}
              placeholder="e.g. Hair styling for wedding"
              placeholderTextColor={TEXT3}
              value={form.title}
              onChangeText={t => { setForm(f => ({ ...f, title: t })); setErrors((e: any) => ({ ...e, title: '' })); }}
            />
            {errors.title ? <Text style={s.errTxt}>{errors.title}</Text> : null}
          </View>

          {/* Description */}
          <View style={s.group}>
            <Text style={s.label}>Description <Text style={{ color: PINK }}>*</Text></Text>
            <TextInput
              style={[s.input, s.textarea, errors.description && s.inputError]}
              placeholder="Describe your requirements in detail…"
              placeholderTextColor={TEXT3}
              value={form.description}
              onChangeText={t => { setForm(f => ({ ...f, description: t })); setErrors((e: any) => ({ ...e, description: '' })); }}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            {errors.description ? <Text style={s.errTxt}>{errors.description}</Text> : null}
          </View>

          {/* Category */}
          <View style={s.group}>
            <Text style={s.label}>Category <Text style={{ color: PINK }}>*</Text></Text>
            {loadingCategories ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="small" color={PINK} />
                <Text style={s.loadingTxt}>Loading categories…</Text>
              </View>
            ) : categories.length === 0 ? (
              <View style={s.loadingBox}>
                <Ionicons name="alert-circle-outline" size={24} color={TEXT3} />
                <Text style={s.loadingTxt}>No categories available</Text>
                <TouchableOpacity onPress={loadCategories} style={s.retryBtn} activeOpacity={0.8}>
                  <Text style={s.retryTxt}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowCatModal(true)}
                style={[s.input, s.dropdownTrigger, errors.category && s.inputError]}
                activeOpacity={0.8}
              >
                <Text style={[s.dropdownTxt, !selectedCatName && { color: TEXT3 }]}>
                  {selectedCatName || 'Select a category'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={TEXT3} />
              </TouchableOpacity>
            )}
            {errors.category ? <Text style={s.errTxt}>{errors.category}</Text> : null}
          </View>

          {/* Service type */}
          <View style={s.group}>
            <Text style={s.label}>Service Type <Text style={{ color: PINK }}>*</Text></Text>
            <View style={s.optList}>
              {SERVICE_OPTS.map(opt => {
                const active = form.serviceType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => { setForm(f => ({ ...f, serviceType: opt.key as any })); if (opt.key === 'shop') setErrors((e: any) => ({ ...e, location: '' })); }}
                    style={[s.optCard, active && s.optCardActive]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={opt.icon} size={20} color={active ? PINK : TEXT3} />
                    <View style={s.flex}>
                      <Text style={[s.optLabel, active && s.optLabelActive]}>{opt.label}</Text>
                      <Text style={s.optSub}>{opt.sub}</Text>
                    </View>
                    <View style={[s.radio, active && s.radioActive]}>
                      {active && <View style={s.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Budget */}
          <View style={s.group}>
            <Text style={s.label}>Your Budget <Text style={{ color: PINK }}>*</Text></Text>
            <View style={[s.input, s.budgetRow, errors.proposedPrice && s.inputError]}>
              <Text style={s.budgetPrefix}>₦</Text>
              <TextInput
                style={s.budgetInput}
                placeholder="0"
                placeholderTextColor={TEXT3}
                value={form.proposedPrice}
                keyboardType="numeric"
                onChangeText={t => { setForm(f => ({ ...f, proposedPrice: t.replace(/[^0-9]/g, '') })); setErrors((e: any) => ({ ...e, proposedPrice: '' })); }}
              />
              <Text style={s.budgetSuffix}>NGN</Text>
            </View>
            {errors.proposedPrice ? <Text style={s.errTxt}>{errors.proposedPrice}</Text> : null}
          </View>

          {/* Timing */}
          <View style={s.group}>
            <Text style={s.label}>When do you need it?</Text>
            <View style={s.optList}>
              {FLEX_OPTS.map(opt => {
                const active = form.flexibility === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => { setForm(f => ({ ...f, flexibility: opt.key as any, preferredDate: '', preferredTime: '' })); setSelectedDate(new Date()); }}
                    style={[s.optCard, active && s.optCardActive]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={opt.icon} size={20} color={active ? PINK : TEXT3} />
                    <View style={s.flex}>
                      <Text style={[s.optLabel, active && s.optLabelActive]}>{opt.label}</Text>
                      <Text style={s.optSub}>{opt.sub}</Text>
                    </View>
                    <View style={[s.radio, active && s.radioActive]}>
                      {active && <View style={s.radioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date & time pickers (scheduled only) */}
          {form.flexibility === 'specific' && (
            <View style={s.group}>
              <Text style={s.label}>Preferred Date & Time</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[s.input, s.dateBtn, s.flex]} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={16} color={form.preferredDate ? PINK : TEXT3} />
                  <Text style={[s.dateTxt, form.preferredDate && { color: TEXT1 }]}>{form.preferredDate || 'Pick date'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[s.input, s.dateBtn, s.flex]} activeOpacity={0.8}>
                  <Ionicons name="time-outline" size={16} color={form.preferredTime ? PINK : TEXT3} />
                  <Text style={[s.dateTxt, form.preferredTime && { color: TEXT1 }]}>{form.preferredTime || 'Pick time'}</Text>
                </TouchableOpacity>
              </View>

              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker value={selectedDate} mode="date" minimumDate={new Date()} display="default"
                  onChange={(_, d) => {
                    setShowDatePicker(false);
                    if (d) { setSelectedDate(d); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); setForm(f => ({ ...f, preferredDate: `${y}-${m}-${dd}` })); }
                  }} />
              )}
              {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker value={selectedDate} mode="time" display="default"
                  onChange={(_, d) => {
                    setShowTimePicker(false);
                    if (d) { setSelectedDate(d); const h = String(d.getHours()).padStart(2,'0'); const min = String(d.getMinutes()).padStart(2,'0'); setForm(f => ({ ...f, preferredTime: `${h}:${min}` })); }
                  }} />
              )}
              {Platform.OS === 'ios' && (
                <>
                  <Modal transparent animationType="slide" visible={showDatePicker}>
                    <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
                      <View style={s.pickerSheet}>
                        <View style={s.pickerHeader}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={s.pickerCancel}>Cancel</Text></TouchableOpacity>
                          <Text style={s.pickerTitle}>Select Date</Text>
                          <TouchableOpacity onPress={() => { const y=selectedDate.getFullYear(); const m=String(selectedDate.getMonth()+1).padStart(2,'0'); const d=String(selectedDate.getDate()).padStart(2,'0'); setForm(f=>({...f,preferredDate:`${y}-${m}-${d}`})); setShowDatePicker(false); }}><Text style={s.pickerDone}>Done</Text></TouchableOpacity>
                        </View>
                        <DateTimePicker value={selectedDate} mode="date" minimumDate={new Date()} display="spinner" themeVariant="light" onChange={(_,d)=>{if(d)setSelectedDate(d);}} style={{height:216,width:'100%'}} />
                      </View>
                    </TouchableOpacity>
                  </Modal>
                  <Modal transparent animationType="slide" visible={showTimePicker}>
                    <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
                      <View style={s.pickerSheet}>
                        <View style={s.pickerHeader}>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}><Text style={s.pickerCancel}>Cancel</Text></TouchableOpacity>
                          <Text style={s.pickerTitle}>Select Time</Text>
                          <TouchableOpacity onPress={() => { const h=String(selectedDate.getHours()).padStart(2,'0'); const min=String(selectedDate.getMinutes()).padStart(2,'0'); setForm(f=>({...f,preferredTime:`${h}:${min}`})); setShowTimePicker(false); }}><Text style={s.pickerDone}>Done</Text></TouchableOpacity>
                        </View>
                        <DateTimePicker value={selectedDate} mode="time" display="spinner" themeVariant="light" onChange={(_,d)=>{if(d)setSelectedDate(d);}} style={{height:216,width:'100%'}} />
                      </View>
                    </TouchableOpacity>
                  </Modal>
                </>
              )}
            </View>
          )}

          {/* Location */}
          {(form.serviceType === 'home' || form.serviceType === 'both') && (
            <View style={s.group}>
              <Text style={s.label}>
                Location{form.serviceType === 'both' ? ' (optional)' : ''}{form.serviceType === 'home' && <Text style={{ color: PINK }}> *</Text>}
              </Text>
              <TouchableOpacity
                onPress={getCurrentLocation}
                disabled={loadingLocation}
                style={[s.input, s.locationBtn, errors.location && s.inputError]}
                activeOpacity={0.8}
              >
                <Ionicons name="location-outline" size={18} color={form.location.coordinates?.length ? PINK : TEXT3} />
                <Text style={[s.locationTxt, form.location.coordinates?.length && { color: TEXT1, fontWeight: '600' }]}>
                  {form.location.coordinates?.length ? 'Location captured — edit below' : 'Tap to use my location'}
                </Text>
                {loadingLocation
                  ? <ActivityIndicator size="small" color={PINK} />
                  : <Ionicons name={form.location.coordinates?.length ? 'checkmark-circle' : 'navigate-outline'} size={16} color={form.location.coordinates?.length ? PINK : TEXT3} />}
              </TouchableOpacity>

              {form.location.coordinates?.length >= 2 && (
                <View style={{ marginTop: 8, gap: 8 }}>
                  <TextInput style={s.input} value={form.location.address} onChangeText={t => setForm(f => ({ ...f, location: { ...f.location, address: t } }))} placeholder="Address" placeholderTextColor={TEXT3} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput style={[s.input, s.flex]} value={form.location.city} onChangeText={t => setForm(f => ({ ...f, location: { ...f.location, city: t } }))} placeholder="City" placeholderTextColor={TEXT3} />
                    <TextInput style={[s.input, s.flex]} value={form.location.state} onChangeText={t => setForm(f => ({ ...f, location: { ...f.location, state: t } }))} placeholder="State" placeholderTextColor={TEXT3} />
                  </View>
                </View>
              )}
              {errors.location ? <Text style={s.errTxt}>{errors.location}</Text> : null}
            </View>
          )}

          {/* Offer valid for */}
          <View style={s.group}>
            <Text style={s.label}>Offer Valid For</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[3, 7, 14, 30].map(d => {
                const active = form.expiresInDays === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setForm(f => ({ ...f, expiresInDays: d }))}
                    style={[s.dayPill, active && s.dayPillActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.dayPillVal, active && s.dayPillValActive]}>{d}</Text>
                    <Text style={[s.dayPillSub, active && { color: PINK }]}>days</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Images */}
          <View style={s.group}>
            <Text style={s.label}>Images ({selectedImages.length}/5) <Text style={{ color: TEXT3 }}>optional</Text></Text>
            <TouchableOpacity
              onPress={pickImages}
              disabled={selectedImages.length >= 5}
              style={[s.uploadArea, selectedImages.length >= 5 && { opacity: 0.5 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload-outline" size={28} color={PINK} />
              <Text style={s.uploadTxt}>{selectedImages.length >= 5 ? 'Maximum reached' : 'Upload Images'}</Text>
              <Text style={s.uploadSub}>Max 5 images</Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>
                {selectedImages.map((img, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri: img.uri }} style={s.thumb} resizeMode="cover" />
                    <TouchableOpacity
                      onPress={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}
                      style={s.thumbRemove}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={10} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>

        {/* Submit */}
        <View style={[s.submitWrap, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden', opacity: loading ? 0.7 : 1 }}>
            <LinearGradient colors={[PINK, PRI_DK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitBtn}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="checkmark-circle-outline" size={19} color="#fff" /><Text style={s.submitBtnTxt}>Submit Offer</Text></>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Category modal */}
      <Modal transparent animationType="slide" visible={showCatModal}>
        <TouchableOpacity style={s.catOverlay} activeOpacity={1} onPress={() => setShowCatModal(false)}>
          <View style={[s.catSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.catHeader}>
              <Text style={s.catHeaderTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)} style={s.catClose} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={TEXT1} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 12 }}>
              {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => {
                const active = form.category === cat._id;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    onPress={() => { setForm(f => ({ ...f, category: cat._id })); setErrors((e: any) => ({ ...e, category: '' })); setShowCatModal(false); }}
                    style={[s.catItem, active && s.catItemActive]}
                    activeOpacity={0.7}
                  >
                    <View style={[s.catInitial, active && s.catInitialActive]}>
                      <Text style={[s.catInitialTxt, active && { color: PINK }]}>{cat.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[s.catName, active && { color: PINK, fontWeight: '700' }]}>{cat.name}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color={PINK} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24, gap: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT1, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: TEXT3, fontWeight: '500', marginTop: 2 },

  tip: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: CARD, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F0E0E8',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  tipTxt: { flex: 1, fontSize: 13, color: TEXT2, lineHeight: 19 },

  group: { gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: TEXT2, letterSpacing: 0.4, textTransform: 'uppercase' },

  input: {
    backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: TEXT1,
  },
  inputError: { borderColor: PINK },
  textarea: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  errTxt: { fontSize: 11, color: PINK, fontWeight: '500', marginTop: 2 },

  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownTxt: { fontSize: 14, color: TEXT1, flex: 1 },

  loadingBox: { backgroundColor: CARD, borderRadius: 13, paddingVertical: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: BORDER },
  loadingTxt: { fontSize: 13, color: TEXT3, fontWeight: '500' },
  retryBtn: { backgroundColor: '#FEE2EF', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  retryTxt: { color: PINK, fontSize: 12, fontWeight: '700' },

  optList: { gap: 8 },
  optCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: CARD, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: BORDER,
  },
  optCardActive: { backgroundColor: '#FFF0F7', borderColor: PINK },
  optLabel: { fontSize: 14, fontWeight: '600', color: TEXT1, marginBottom: 2 },
  optLabelActive: { color: PINK, fontWeight: '700' },
  optSub: { fontSize: 12, color: TEXT3 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioActive: { borderColor: PINK },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PINK },

  budgetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 },
  budgetPrefix: { fontSize: 20, fontWeight: '800', color: PINK, marginRight: 6, paddingVertical: 13 },
  budgetInput: { flex: 1, fontSize: 20, fontWeight: '800', color: TEXT1, paddingVertical: 13 },
  budgetSuffix: { fontSize: 13, color: TEXT3, fontWeight: '600' },

  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13 },
  dateTxt: { flex: 1, fontSize: 14, color: TEXT3 },

  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationTxt: { flex: 1, fontSize: 14, color: TEXT3 },

  dayPill: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center',
  },
  dayPillActive: { backgroundColor: '#FFF0F7', borderColor: PINK },
  dayPillVal: { fontSize: 18, fontWeight: '800', color: TEXT1, letterSpacing: -0.3 },
  dayPillValActive: { color: PINK },
  dayPillSub: { fontSize: 10, fontWeight: '600', color: TEXT3, marginTop: 2 },

  uploadArea: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: PINK,
    borderRadius: 16, padding: 24, alignItems: 'center',
    backgroundColor: '#FFF0F7', gap: 6,
  },
  uploadTxt: { fontSize: 14, fontWeight: '700', color: PINK },
  uploadSub: { fontSize: 11, color: TEXT3 },

  thumb: { width: 84, height: 84, borderRadius: 12 },
  thumbRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: BG,
  },

  submitWrap: {
    backgroundColor: CARD, paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  submitBtn: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16 },
  submitBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  pickerCancel: { fontSize: 15, color: TEXT2, fontWeight: '600' },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: TEXT1 },
  pickerDone: { fontSize: 15, color: PINK, fontWeight: '700' },

  catOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  catSheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  catHeaderTitle: { fontSize: 17, fontWeight: '800', color: TEXT1 },
  catClose: { width: 32, height: 32, borderRadius: 10, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  catItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, marginBottom: 4 },
  catItemActive: { backgroundColor: '#FFF0F7' },
  catInitial: { width: 36, height: 36, borderRadius: 10, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  catInitialActive: { backgroundColor: '#FEE2EF' },
  catInitialTxt: { fontSize: 14, fontWeight: '700', color: TEXT2 },
  catName: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT1 },
});

export default CreateOfferScreen;
