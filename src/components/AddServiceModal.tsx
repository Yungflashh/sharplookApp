import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Image, StyleSheet, Dimensions, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoriesAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

const { width: W } = Dimensions.get('window');
const PRIMARY  = '#E04079';
const BG       = '#FCE4EC';
const WHITE    = '#FFFFFF';
const TEXT     = '#1A1A2E';
const GRAY     = '#6B7280';
const MUTED    = '#9CA3AF';
const BORDER   = '#F0E4EA';
const INPUT_BG = '#FAFAFA';

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  basePrice: number;
  priceType: 'fixed' | 'negotiable';
  currency: string;
  duration: number;
  serviceArea: { type: string; coordinates: number[]; radius: number };
}

interface Props {
  visible: boolean;
  service?: any;
  onClose: () => void;
  onSave: (service: ServiceFormData, images: any[]) => Promise<void>;
}

const AddServiceModal: React.FC<Props> = ({ visible, service, onClose, onSave }) => {
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const submitting  = useRef(false);

  const blank = (): ServiceFormData => ({
    name: '', description: '', category: '', basePrice: 0,
    priceType: 'fixed', currency: 'NGN', duration: 0,
    serviceArea: { type: 'Point', coordinates: [], radius: 10000 },
  });

  const [form, setForm]           = useState<ServiceFormData>(blank());
  const [categories, setCategories] = useState<any[]>([]);
  const [images, setImages]         = useState<any[]>([]);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', confirmText: 'Confirm', onConfirm: () => {} });

  useEffect(() => {
    if (!visible) return;
    loadCategories();
    if (service) {
      setForm({
        name: service.name, description: service.description,
        category: service.category?._id || service.category,
        basePrice: service.basePrice, priceType: service.priceType,
        currency: service.currency, duration: service.duration,
        serviceArea: service.serviceArea || blank().serviceArea,
      });
      if (service.images?.length) {
        setImages(service.images.map((url: string, i: number) => ({
          uri: url, name: `existing_${i}.jpg`, type: 'image/jpeg',
        })));
      }
    } else {
      reset();
    }
  }, [service, visible]);

  const loadCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      if (res.success) setCategories(res.data || []);
    } catch {
      setCategories([
        { _id: '1', name: 'Hair' }, { _id: '2', name: 'Makeup' },
        { _id: '3', name: 'Nails' }, { _id: '4', name: 'Spa' },
      ]);
    }
  };

  const reset = () => { setForm(blank()); setImages([]); setErrors({}); };

  const pickImages = async () => {
    if (images.length >= 5) { toast.warning('Limit', 'Maximum 5 images'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, quality: 0.8,
    });
    if (!res.canceled) {
      const slots = 5 - images.length;
      const next = res.assets.slice(0, slots).map(a => {
        const name = a.uri.split('/').pop() || 'image.jpg';
        const ext  = /\.(\w+)$/.exec(name);
        return { uri: a.uri, name, type: ext ? `image/${ext[1]}` : 'image/jpeg' };
      });
      setImages(prev => [...prev, ...next]);
    }
  };

  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const getGPS = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { toast.error('Permission denied', 'Location access is required'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setForm(f => ({ ...f, serviceArea: { ...f.serviceArea, coordinates: [loc.coords.longitude, loc.coords.latitude] } }));
      setErrors(e => ({ ...e, location: '' }));
      toast.success('Location set', 'Your GPS location has been captured');
    } catch { toast.error('Error', 'Could not get your location'); }
    finally { setLocLoading(false); }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Service name is required';
    if (!form.description.trim()) e.description = 'Description is required';
    else if (form.description.trim().length < 20) e.description = 'At least 20 characters required';
    if (!form.category) e.category = 'Please choose a category';
    if (!form.basePrice || form.basePrice <= 0) e.price = 'Enter a valid price';
    if (!form.duration || form.duration <= 0) e.duration = 'Enter duration in minutes';
    if (!form.serviceArea.coordinates.length) e.location = 'Please set your GPS location';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (submitting.current) return;
    if (!validate()) return;
    submitting.current = true;
    setLoading(true);
    try {
      await onSave(form, images);
      reset();
    } catch (err) {
      const apiErr = handleAPIError(err);
      const msg = apiErr.message || 'Failed to save service';
      if (apiErr.status === 403 || msg.toLowerCase().includes('upgrade') || msg.toLowerCase().includes('free plan')) {
        setConfirmModal({
          visible: true,
          title: 'Plan Limit Reached',
          message: `${msg}\n\nUpgrade your plan to add more services.`,
          confirmText: 'Upgrade Plan',
          onConfirm: () => { handleClose(); navigation.navigate('UpgradeTier' as any); },
        });
      } else if (msg.includes('complete your vendor profile')) {
        setConfirmModal({ visible: true, title: 'Profile Incomplete', message: 'Please complete your vendor profile before creating services.', onConfirm: () => { handleClose(); navigation.navigate('Profile' as any); } });
      } else if (msg.includes('subscribe') || msg.includes('subscription')) {
        setConfirmModal({ visible: true, title: 'Subscription Required', message: msg, onConfirm: () => { handleClose(); navigation.navigate('Subscription' as any); } });
      } else {
        toast.error('Could not save service', msg);
      }
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  const selectedCatName = categories.find(c => c._id === form.category)?.name || '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backBtn} activeOpacity={0.75}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{service ? 'Edit Service' : 'Add Services'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: BG }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Image Upload ────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.imageBox, images.length >= 5 && { opacity: 0.5 }]}
            onPress={pickImages}
            activeOpacity={0.8}
            disabled={images.length >= 5}
          >
            {images.length === 0 ? (
              <>
                <View style={styles.cameraCircle}>
                  <Ionicons name="camera-outline" size={28} color={PRIMARY} />
                </View>
                <Text style={styles.imageBoxLabel}>Add Product Image</Text>
                <Text style={styles.imageBoxSub}>Up to 5 images</Text>
              </>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {images.map((img, i) => (
                  <View key={i} style={styles.thumbWrap}>
                    <Image source={{ uri: img.uri }} style={styles.thumb} />
                    <TouchableOpacity style={styles.thumbDel} onPress={() => removeImage(i)}>
                      <Ionicons name="close" size={12} color={WHITE} />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <View style={styles.thumbAdd}>
                    <Ionicons name="add" size={24} color={PRIMARY} />
                  </View>
                )}
              </ScrollView>
            )}
          </TouchableOpacity>

          {/* ── Service Name ─────────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>Service Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter service name..."
              placeholderTextColor={MUTED}
              value={form.name}
              onChangeText={t => { setForm(f => ({ ...f, name: t })); setErrors(e => ({ ...e, name: '' })); }}
            />
            {errors.name ? <Text style={styles.errText}>{errors.name}</Text> : null}
          </View>

          {/* ── Category ─────────────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, errors.category && styles.inputError]}
              onPress={() => setShowCatPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pickerText, !selectedCatName && { color: MUTED }]}>
                {selectedCatName || 'Choose Categories'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={GRAY} />
            </TouchableOpacity>
            {errors.category ? <Text style={styles.errText}>{errors.category}</Text> : null}
          </View>

          {/* ── Duration + Price side by side ────────────────────────── */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Duration</Text>
              <TextInput
                style={[styles.input, errors.duration && styles.inputError]}
                placeholder="Duration..."
                placeholderTextColor={MUTED}
                keyboardType="numeric"
                value={form.duration ? form.duration.toString() : ''}
                onChangeText={t => {
                  const v = parseInt(t.replace(/[^0-9]/g, '')) || 0;
                  setForm(f => ({ ...f, duration: v }));
                  setErrors(e => ({ ...e, duration: '' }));
                }}
              />
              {errors.duration ? <Text style={styles.errText}>{errors.duration}</Text> : null}
              <Text style={styles.hint}>minutes</Text>
            </View>
            <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Price (₦)</Text>
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                placeholder="1,000"
                placeholderTextColor={MUTED}
                keyboardType="numeric"
                value={form.basePrice ? form.basePrice.toString() : ''}
                onChangeText={t => {
                  const v = parseInt(t.replace(/[^0-9]/g, '')) || 0;
                  setForm(f => ({ ...f, basePrice: v }));
                  setErrors(e => ({ ...e, price: '' }));
                }}
              />
              {errors.price ? <Text style={styles.errText}>{errors.price}</Text> : null}
            </View>
          </View>

          {/* ── Price Type toggle ────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>Price Type</Text>
            <View style={styles.toggleRow}>
              {(['fixed', 'negotiable'] as const).map(pt => (
                <TouchableOpacity
                  key={pt}
                  style={[styles.toggleBtn, form.priceType === pt && styles.toggleBtnActive]}
                  onPress={() => setForm(f => ({ ...f, priceType: pt }))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, form.priceType === pt && styles.toggleTextActive]}>
                    {pt.charAt(0).toUpperCase() + pt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Description ──────────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Enter product details..."
              placeholderTextColor={MUTED}
              value={form.description}
              onChangeText={t => { setForm(f => ({ ...f, description: t })); setErrors(e => ({ ...e, description: '' })); }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={2000}
            />
            <View style={styles.descFooter}>
              {errors.description
                ? <Text style={styles.errText}>{errors.description}</Text>
                : <Text style={styles.hint}>Min 20 characters</Text>
              }
              <Text style={styles.hint}>{form.description.length}/2000</Text>
            </View>
          </View>

          {/* ── Service Location ─────────────────────────────────────── */}
          <View style={styles.field}>
            <Text style={styles.label}>Service Location</Text>
            <View style={styles.locRow}>
              <View style={[styles.input, styles.locRadiusWrap, { flex: 1, marginRight: 10, flexDirection: 'row', alignItems: 'center' }]}>
                <Ionicons name="location-outline" size={16} color={PRIMARY} />
                <TextInput
                  style={styles.locRadiusInput}
                  placeholder="Radius (km)"
                  placeholderTextColor={MUTED}
                  keyboardType="numeric"
                  value={(form.serviceArea.radius / 1000).toString()}
                  onChangeText={t => {
                    const km = parseFloat(t) || 10;
                    setForm(f => ({ ...f, serviceArea: { ...f.serviceArea, radius: km * 1000 } }));
                  }}
                />
              </View>
              <TouchableOpacity style={styles.gpsBtn} onPress={getGPS} disabled={locLoading} activeOpacity={0.85}>
                {locLoading
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <><Ionicons name="navigate" size={16} color={WHITE} /><Text style={styles.gpsBtnText}> Set GPS</Text></>
                }
              </TouchableOpacity>
            </View>
            {form.serviceArea.coordinates.length > 0
              ? <View style={styles.locConfirm}>
                  <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                  <Text style={styles.locConfirmText}>
                    GPS set · {form.serviceArea.coordinates[1].toFixed(4)}, {form.serviceArea.coordinates[0].toFixed(4)}
                  </Text>
                </View>
              : null
            }
            {errors.location ? <Text style={styles.errText}>{errors.location}</Text> : null}
            <Text style={styles.hint}>Set your base location and travel radius for home services</Text>
          </View>

        </ScrollView>

        {/* ── Save Button ──────────────────────────────────────────────── */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={WHITE} />
              : <Text style={styles.saveBtnText}>{service ? 'Update Service' : 'Save Services'}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Category Picker Sheet ─────────────────────────────────────── */}
      <Modal visible={showCatPicker} transparent animationType="slide" onRequestClose={() => setShowCatPicker(false)}>
        <TouchableOpacity style={styles.catOverlay} activeOpacity={1} onPress={() => setShowCatPicker(false)} />
        <View style={[styles.catSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.catHandle} />
          <Text style={styles.catSheetTitle}>Choose Category</Text>
          <FlatList
            data={categories}
            keyExtractor={item => item._id}
            renderItem={({ item }) => {
              const selected = form.category === item._id;
              return (
                <TouchableOpacity
                  style={[styles.catItem, selected && styles.catItemActive]}
                  onPress={() => {
                    setForm(f => ({ ...f, category: item._id }));
                    setErrors(e => ({ ...e, category: '' }));
                    setShowCatPicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catItemText, selected && styles.catItemTextActive]}>{item.name}</Text>
                  {selected && <Ionicons name="checkmark" size={18} color={WHITE} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />
    </Modal>
  );
};

export default AddServiceModal;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: PRIMARY, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: WHITE },

  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },

  // Image upload box
  imageBox: {
    borderWidth: 1.5, borderColor: PRIMARY, borderStyle: 'dashed',
    borderRadius: 16, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 24, paddingHorizontal: 16, marginBottom: 20,
    minHeight: 120,
  },
  cameraCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  imageBoxLabel: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 3 },
  imageBoxSub: { fontSize: 12, color: MUTED },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbDel: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  thumbAdd: {
    width: 72, height: 72, borderRadius: 10,
    backgroundColor: BG, borderWidth: 1.5, borderColor: PRIMARY,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
  },

  // Form fields
  field: { marginBottom: 18 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 8 },
  input: {
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: TEXT,
  },
  inputError: { borderColor: '#EF4444' },
  textArea: { height: 110, paddingTop: 12 },
  errText: { fontSize: 11, color: '#EF4444', marginTop: 4 },
  hint: { fontSize: 11, color: MUTED, marginTop: 4 },
  descFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Category picker button
  pickerBtn: {
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerText: { fontSize: 14, color: TEXT, flex: 1 },

  // Price type toggle
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: BORDER, alignItems: 'center',
    backgroundColor: WHITE,
  },
  toggleBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toggleText: { fontSize: 13, fontWeight: '600', color: GRAY },
  toggleTextActive: { color: WHITE },

  // Location
  locRow: { flexDirection: 'row', alignItems: 'center' },
  locRadiusWrap: { paddingVertical: 0 },
  locRadiusInput: { flex: 1, fontSize: 14, color: TEXT, paddingVertical: 12, marginLeft: 8 },
  gpsBtn: {
    backgroundColor: PRIMARY, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center',
  },
  gpsBtnText: { color: WHITE, fontSize: 13, fontWeight: '700' },
  locConfirm: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 5 },
  locConfirmText: { fontSize: 12, color: '#10b981', fontWeight: '600' },

  // Save footer
  footer: {
    backgroundColor: WHITE, paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: BORDER,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06, shadowRadius: 8,
  },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: WHITE },

  // Category sheet
  catOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  catSheet: {
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 16, maxHeight: '60%',
  },
  catHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 16,
  },
  catSheetTitle: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 14 },
  catItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12,
    marginBottom: 8, backgroundColor: '#F9FAFB',
  },
  catItemActive: { backgroundColor: PRIMARY },
  catItemText: { fontSize: 14, fontWeight: '600', color: TEXT },
  catItemTextActive: { color: WHITE },
});
