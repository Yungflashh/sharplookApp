import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoriesAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

const PINK = '#E04079';

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  basePrice: number;
  priceType: 'fixed' | 'hourly' | 'negotiable';
  duration: number;
  availability: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

interface AddServiceModalProps {
  visible: boolean;
  service?: any;
  onClose: () => void;
  onSave: (service: ServiceFormData, images: any[]) => Promise<void>;
}

const DAYS: { key: keyof ServiceFormData['availability']; label: string }[] = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const DEFAULT_AVAILABILITY: ServiceFormData['availability'] = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

const PRICE_TYPES: { value: ServiceFormData['priceType']; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'negotiable', label: 'Negotiable' },
];

const AddServiceModal: React.FC<AddServiceModalProps> = ({
  visible,
  service,
  onClose,
  onSave,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    category: '',
    basePrice: 0,
    priceType: 'fixed',
    duration: 0,
    availability: { ...DEFAULT_AVAILABILITY },
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (visible) {
      loadCategories();
      if (service) {
        setFormData({
          name: service.name ?? '',
          description: service.description ?? '',
          category: service.category?._id ?? service.category ?? '',
          basePrice: service.basePrice ?? 0,
          priceType: service.priceType ?? 'fixed',
          duration: service.duration ?? 0,
          availability: service.availability
            ? { ...DEFAULT_AVAILABILITY, ...service.availability }
            : { ...DEFAULT_AVAILABILITY },
        });
        if (service.images?.length > 0) {
          setSelectedImages(
            service.images.map((url: string, i: number) => ({
              uri: url,
              name: `existing_${i}.jpg`,
              type: 'image/jpeg',
            }))
          );
        }
      } else {
        resetForm();
      }
    }
  }, [service, visible]);

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch {
      // silently fail — picker will show empty state
    }
  };

  const pickImages = async () => {
    if (selectedImages.length >= 5) {
      toast.warning('Limit Reached', 'You can only upload up to 5 images');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const remaining = 5 - selectedImages.length;
      const newImages = result.assets.slice(0, remaining).map((asset) => {
        const filename = asset.uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        return {
          uri: asset.uri,
          name: filename,
          type: match ? `image/${match[1]}` : 'image/jpeg',
        };
      });
      setSelectedImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      basePrice: 0,
      priceType: 'fixed',
      duration: 0,
      availability: { ...DEFAULT_AVAILABILITY },
    });
    setSelectedImages([]);
    setErrors({});
  };

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};

    if (!formData.name.trim()) {
      e.name = 'Service name is required';
    } else if (formData.name.trim().length < 3) {
      e.name = 'Service name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      e.name = 'Service name cannot exceed 100 characters';
    }

    if (!formData.description.trim()) {
      e.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      e.description = 'Description must be at least 20 characters';
    } else if (formData.description.trim().length > 2000) {
      e.description = 'Description cannot exceed 2000 characters';
    }

    if (!formData.category) {
      e.category = 'Please select a category';
    }

    if (!formData.duration || formData.duration <= 0) {
      e.duration = 'Duration must be at least 1 minute';
    } else if (formData.duration > 480) {
      e.duration = 'Duration cannot exceed 480 minutes (8 hrs)';
    }

    if (!formData.basePrice || formData.basePrice <= 0) {
      e.basePrice = 'Price must be greater than ₦0';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Check your inputs', 'Please fix the highlighted fields and try again');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData, selectedImages);
      resetForm();
    } catch (error) {
      const apiError = handleAPIError(error);

      if (apiError.message.includes('complete your vendor profile')) {
        setConfirmModal({
          visible: true,
          title: 'Profile Incomplete',
          message: 'Please complete your vendor profile before creating services.',
          onConfirm: () => {
            handleClose();
            navigation.navigate('Profile' as any);
          },
        });
      } else if (apiError.message.includes('set your vendor type')) {
        setConfirmModal({
          visible: true,
          title: 'Vendor Type Required',
          message: 'Please set your vendor type (In-Shop, Home Service, or Both) in your profile settings.',
          onConfirm: () => {
            handleClose();
            navigation.navigate('Profile' as any);
          },
        });
      } else if (
        apiError.message.includes('must subscribe') ||
        apiError.message.includes('subscription')
      ) {
        setConfirmModal({
          visible: true,
          title: 'Subscription Required',
          message: apiError.message,
          onConfirm: () => {
            handleClose();
            navigation.navigate('Subscription' as any);
          },
        });
      } else if (apiError.message.includes('must be verified')) {
        toast.error(
          'Verification Required',
          'Your vendor account must be verified before creating services. Please contact support.'
        );
      } else {
        toast.error('Save Failed', apiError.message || 'Failed to save service. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedCategory = categories.find((c) => c._id === formData.category);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={26} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {service ? 'Edit Service' : 'Add New Service'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Picker */}
          <TouchableOpacity
            style={[
              styles.imagePickerBox,
              selectedImages.length >= 5 && styles.imagePickerFull,
            ]}
            onPress={pickImages}
            activeOpacity={0.75}
            disabled={selectedImages.length >= 5}
          >
            <Ionicons
              name="camera-outline"
              size={32}
              color={selectedImages.length >= 5 ? '#ccc' : PINK}
            />
            <Text
              style={[
                styles.imagePickerTitle,
                selectedImages.length >= 5 && styles.imagePickerTitleFull,
              ]}
            >
              {selectedImages.length === 0
                ? 'Add Service Image'
                : selectedImages.length >= 5
                ? 'Maximum Images Added'
                : `${selectedImages.length}/5 Image${selectedImages.length > 1 ? 's' : ''} Selected — Add More`}
            </Text>
            <Text style={styles.imagePickerSub}>Up to 5 images • JPG, PNG</Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbsRow}
              contentContainerStyle={{ paddingRight: 4 }}
            >
              {selectedImages.map((img, idx) => (
                <View key={idx} style={styles.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => removeImage(idx)}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Ionicons name="close" size={11} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Service Name */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Service Name <Text style={styles.asterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputErr : null]}
              placeholder="e.g., Hair Braiding, Nail Art, Makeup..."
              placeholderTextColor="#aaa"
              value={formData.name}
              onChangeText={(t) => {
                setFormData((p) => ({ ...p, name: t }));
                if (errors.name) setErrors((p) => ({ ...p, name: '' }));
              }}
            />
            {errors.name ? <Text style={styles.errText}>{errors.name}</Text> : null}
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Category <Text style={styles.asterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.dropdown, errors.category ? styles.inputErr : null]}
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.75}
            >
              <Text
                style={
                  selectedCategory ? styles.dropdownValue : styles.dropdownPlaceholder
                }
              >
                {selectedCategory ? selectedCategory.name : 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#888" />
            </TouchableOpacity>
            {errors.category ? (
              <Text style={styles.errText}>{errors.category}</Text>
            ) : null}
          </View>

          {/* Duration + Price row */}
          <View style={styles.row}>
            <View style={[styles.field, styles.rowHalf]}>
              <Text style={styles.label}>
                Duration (min) <Text style={styles.asterisk}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.duration ? styles.inputErr : null]}
                placeholder="e.g., 60"
                placeholderTextColor="#aaa"
                value={formData.duration > 0 ? String(formData.duration) : ''}
                onChangeText={(t) => {
                  const v = parseInt(t.replace(/[^0-9]/g, ''), 10) || 0;
                  setFormData((p) => ({ ...p, duration: v }));
                  if (errors.duration) setErrors((p) => ({ ...p, duration: '' }));
                }}
                keyboardType="numeric"
              />
              {errors.duration ? (
                <Text style={styles.errText}>{errors.duration}</Text>
              ) : null}
            </View>

            <View style={[styles.field, styles.rowHalf]}>
              <Text style={styles.label}>
                Price (₦) <Text style={styles.asterisk}>*</Text>
              </Text>
              <View style={[styles.priceWrap, errors.basePrice ? styles.inputErr : null]}>
                <Text style={styles.nairaSign}>₦</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor="#aaa"
                  value={formData.basePrice > 0 ? String(formData.basePrice) : ''}
                  onChangeText={(t) => {
                    const v = parseInt(t.replace(/[^0-9]/g, ''), 10) || 0;
                    setFormData((p) => ({ ...p, basePrice: v }));
                    if (errors.basePrice) setErrors((p) => ({ ...p, basePrice: '' }));
                  }}
                  keyboardType="numeric"
                />
              </View>
              {errors.basePrice ? (
                <Text style={styles.errText}>{errors.basePrice}</Text>
              ) : null}
            </View>
          </View>

          {/* Price Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Price Type</Text>
            <View style={styles.pillRow}>
              {PRICE_TYPES.map((pt) => {
                const active = formData.priceType === pt.value;
                return (
                  <TouchableOpacity
                    key={pt.value}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => setFormData((p) => ({ ...p, priceType: pt.value }))}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Description <Text style={styles.asterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.textarea, errors.description ? styles.inputErr : null]}
              placeholder="Describe your service in detail — what's included, what clients should expect..."
              placeholderTextColor="#aaa"
              value={formData.description}
              onChangeText={(t) => {
                setFormData((p) => ({ ...p, description: t }));
                if (errors.description) setErrors((p) => ({ ...p, description: '' }));
              }}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={2000}
            />
            <View style={styles.textareaFooter}>
              {errors.description ? (
                <Text style={styles.errText}>{errors.description}</Text>
              ) : (
                <Text style={styles.hintText}>Min 20 characters</Text>
              )}
              <Text style={styles.charCount}>{formData.description.length}/2000</Text>
            </View>
          </View>

          {/* Available Days */}
          <View style={[styles.field, { marginBottom: 32 }]}>
            <Text style={styles.label}>Available Days</Text>
            <View style={styles.daysRow}>
              {DAYS.map((d) => {
                const active = formData.availability[d.key];
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dayPill, active && styles.dayPillActive]}
                    onPress={() =>
                      setFormData((p) => ({
                        ...p,
                        availability: { ...p.availability, [d.key]: !active },
                      }))
                    }
                  >
                    <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDim]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {service ? 'Update Service' : 'Save Service'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Category Bottom Sheet */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select Category</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const selected = formData.category === cat._id;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    onPress={() => {
                      setFormData((p) => ({ ...p, category: cat._id }));
                      setErrors((p) => ({ ...p, category: '' }));
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selected && styles.pickerItemTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={PINK} />}
                  </TouchableOpacity>
                );
              })}
              {categories.length === 0 && (
                <Text style={styles.pickerEmpty}>No categories available</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((p) => ({ ...p, visible: false }));
        }}
        onCancel={() => setConfirmModal((p) => ({ ...p, visible: false }))}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
  },
  headerClose: { padding: 4 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  headerSpacer: { width: 34 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },

  imagePickerBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: PINK,
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: '#FEF2F7',
    marginBottom: 16,
  },
  imagePickerFull: { borderColor: '#ccc', backgroundColor: '#F9FAFB' },
  imagePickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: PINK,
    marginTop: 8,
    textAlign: 'center',
  },
  imagePickerTitleFull: { color: '#aaa' },
  imagePickerSub: { fontSize: 12, color: '#999', marginTop: 4 },

  thumbsRow: { marginBottom: 20 },
  thumbWrap: { marginRight: 10, position: 'relative' },
  thumb: { width: 76, height: 76, borderRadius: 10, backgroundColor: '#eee' },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 8 },
  asterisk: { color: PINK },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#FAFAFA',
  },
  inputErr: { borderColor: '#EF4444' },
  errText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  hintText: { fontSize: 12, color: '#9CA3AF' },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#FAFAFA',
  },
  dropdownPlaceholder: { fontSize: 15, color: '#aaa' },
  dropdownValue: { fontSize: 15, color: '#111' },

  row: { flexDirection: 'row', gap: 12 },
  rowHalf: { flex: 1 },

  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
  },
  nairaSign: { fontSize: 16, color: '#111', marginRight: 2 },
  priceInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111' },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  pillActive: { backgroundColor: PINK, borderColor: PINK },
  pillText: { fontSize: 13, fontWeight: '500', color: '#666' },
  pillTextActive: { color: '#fff', fontWeight: '700' },

  textarea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#FAFAFA',
    minHeight: 120,
  },
  textareaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  charCount: { fontSize: 12, color: '#9CA3AF' },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  dayPillActive: { backgroundColor: PINK, borderColor: PINK },
  dayPillText: { fontSize: 13, fontWeight: '500', color: '#666' },
  dayPillTextActive: { color: '#fff', fontWeight: '700' },

  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
    backgroundColor: '#fff',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#555' },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: PINK,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: PINK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  saveBtnDim: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  pickerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: { backgroundColor: '#FEF2F7', borderRadius: 10, paddingHorizontal: 8 },
  pickerItemText: { fontSize: 15, color: '#333' },
  pickerItemTextSelected: { color: PINK, fontWeight: '600' },
  pickerEmpty: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 24,
    fontSize: 14,
  },
});

export default AddServiceModal;
