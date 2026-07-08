import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Image, ActivityIndicator, Platform, StyleSheet,
  StatusBar, KeyboardAvoidingView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, categoriesAPI, handleAPIError } from '@/api/api';
import * as ImagePicker from 'expo-image-picker';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

const BG   = '#FFF5F9';
const PINK = '#E04079';
const CARD = '#FFFFFF';
const T1   = '#1A1A2E';
const T2   = '#6B7280';
const T3   = '#9CA3AF';

type AddEditRouteProp = RouteProp<RootStackParamList, 'AddProduct' | 'EditProduct'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface ProductImage { uri: string; type: string; name: string; }
interface Category    { _id: string; name: string; }

const AddEditProductScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<AddEditRouteProp>();
  const insets     = useSafeAreaInsets();

  const isEdit    = route.name === 'EditProduct';
  const productId = isEdit ? (route.params as any)?.productId : null;

  const [loading, setLoading]               = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [categories, setCategories]         = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [confirmModal, setConfirmModal]     = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const [name, setName]                   = useState('');
  const [description, setDescription]     = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [price, setPrice]                 = useState('');
  const [stock, setStock]                 = useState('');
  const [brand, setBrand]                 = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [condition, setCondition]         = useState<'new' | 'refurbished' | 'used'>('new');
  const [homeDelivery, setHomeDelivery]   = useState(true);
  const [pickup, setPickup]               = useState(true);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('3');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [images, setImages]               = useState<ProductImage[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [errors, setErrors]               = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCategories();
    if (isEdit && productId) fetchProduct();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getActiveCategories();
      if (res.success) setCategories(res.data || []);
    } catch { /* silent */ }
  };

  const fetchProduct = async () => {
    try {
      setLoadingProduct(true);
      const res = await productAPI.getProductById(productId, false);
      if (res.success) {
        const p = res.data.product;
        setName(p.name);
        setDescription(p.description);
        setSelectedCategory(p.category._id);
        setPrice(p.price.toString());
        setCompareAtPrice(p.compareAtPrice?.toString() || '');
        setStock(p.stock.toString());
        setLowStockThreshold(p.lowStockThreshold?.toString() || '10');
        setCondition(p.condition);
        setBrand(p.brand || '');
        setHomeDelivery(p.deliveryOptions?.homeDelivery ?? true);
        setPickup(p.deliveryOptions?.pickup ?? true);
        setEstimatedDeliveryDays(p.deliveryOptions?.estimatedDeliveryDays?.toString() || '3');
        setExistingImages(p.images || []);
      }
    } catch (e) {
      toast.error('Error', handleAPIError(e).message);
      navigation.goBack();
    } finally {
      setLoadingProduct(false);
    }
  };

  const pickImages = async () => {
    const total = images.length + existingImages.length;
    if (total >= 5) { toast.warning('Limit Reached', 'Up to 5 images allowed'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - total,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => {
        const filename = asset.uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        return { uri: asset.uri, type: match ? `image/${match[1]}` : 'image/jpeg', name: filename };
      });
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeNewImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const removeExistingImage = (i: number) => {
    setConfirmModal({
      visible: true,
      title: 'Remove Image',
      message: 'This will permanently remove the image from this product.',
      onConfirm: () => setExistingImages(prev => prev.filter((_, idx) => idx !== i)),
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim())              e.name        = 'Product name is required';
    else if (name.trim().length < 3) e.name      = 'Name must be at least 3 characters';
    if (!description.trim())       e.description = 'Description is required';
    else if (description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!selectedCategory)         e.category    = 'Please select a category';
    if (!price || parseFloat(price) <= 0) e.price = 'Enter a valid price';
    if (!stock || parseInt(stock) < 0)   e.stock = 'Enter a valid stock quantity';
    if (!isEdit && images.length === 0 && existingImages.length === 0) e.images = 'Add at least one product image';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Check your inputs', 'Please fix the highlighted fields and try again');
      return;
    }
    try {
      setLoading(true);

      const productData = {
        name: name.trim(),
        description: description.trim(),
        category: selectedCategory,
        price: parseFloat(price),
        stock: parseInt(stock),
        condition,
        lowStockThreshold: parseInt(lowStockThreshold),
        deliveryOptions: {
          homeDelivery,
          pickup,
          estimatedDeliveryDays: parseInt(estimatedDeliveryDays),
        },
        ...(compareAtPrice ? { compareAtPrice: parseFloat(compareAtPrice) } : {}),
        ...(brand.trim() ? { brand: brand.trim() } : {}),
        ...(isEdit && existingImages.length > 0 ? { existingImages } : {}),
      };

      let res: any;
      if (isEdit) {
        res = await productAPI.updateProduct(productId, productData, images);
      } else {
        res = await productAPI.createProduct(productData, images);
      }

      if (res.success) {
        toast.success(
          isEdit ? 'Product Updated' : 'Product Created',
          isEdit ? 'Your product has been updated successfully.' : 'Product submitted and pending admin approval.'
        );
        navigation.goBack();
      } else {
        throw new Error(res.message || 'Operation failed');
      }
    } catch (error: any) {
      const msg = handleAPIError(error).message || 'Failed to save product';
      if (msg.includes('Upgrade') || msg.includes('plan allows')) {
        toast.info('Limit Reached', msg);
        navigation.navigate('UpgradeTier' as never);
        return;
      }
      toast.error('Save Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = categories.find(c => c._id === selectedCategory);
  const totalImages = images.length + existingImages.length;

  if (loadingProduct) {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color={PINK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? 'Edit Product' : 'Add Products'}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Picker */}
          <TouchableOpacity
            style={[s.imageBox, totalImages >= 5 && s.imageBoxFull]}
            onPress={pickImages}
            activeOpacity={0.75}
            disabled={totalImages >= 5}
          >
            <Ionicons name="camera-outline" size={32} color={totalImages >= 5 ? T3 : PINK} />
            <Text style={[s.imageBoxTitle, totalImages >= 5 && { color: T3 }]}>
              {totalImages === 0
                ? 'Add Product Image'
                : totalImages >= 5
                ? 'Maximum Images Added'
                : `${totalImages}/5 Image${totalImages > 1 ? 's' : ''} — Add More`}
            </Text>
            <Text style={s.imageBoxSub}>Up to 5 images</Text>
          </TouchableOpacity>

          {totalImages > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.thumbsRow}
              contentContainerStyle={{ paddingRight: 4 }}
            >
              {existingImages.map((uri, i) => (
                <View key={`ex-${i}`} style={s.thumbWrap}>
                  <Image source={{ uri }} style={s.thumb} />
                  <TouchableOpacity style={s.thumbRemove} onPress={() => removeExistingImage(i)}>
                    <Ionicons name="close" size={11} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.map((img, i) => (
                <View key={`new-${i}`} style={s.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={s.thumb} />
                  <TouchableOpacity style={s.thumbRemove} onPress={() => removeNewImage(i)}>
                    <Ionicons name="close" size={11} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          {errors.images ? <Text style={s.errText}>{errors.images}</Text> : null}

          {/* Product Name */}
          <View style={s.field}>
            <Text style={s.label}>Product Name</Text>
            <TextInput
              style={[s.input, errors.name && s.inputErr]}
              placeholder="Enter product name"
              placeholderTextColor={T3}
              value={name}
              onChangeText={t => { setName(t); if (errors.name) setErrors(p => ({ ...p, name: '' })); }}
            />
            {errors.name ? <Text style={s.errText}>{errors.name}</Text> : null}
          </View>

          {/* Category */}
          <View style={s.field}>
            <Text style={s.label}>Category</Text>
            <TouchableOpacity
              style={[s.dropdown, errors.category && s.inputErr]}
              onPress={() => setShowCategoryPicker(true)}
              activeOpacity={0.75}
            >
              <Text style={selectedCat ? s.dropdownValue : s.dropdownPlaceholder}>
                {selectedCat ? selectedCat.name : 'Choose Categories'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={T3} />
            </TouchableOpacity>
            {errors.category ? <Text style={s.errText}>{errors.category}</Text> : null}
          </View>

          {/* Price + Stock */}
          <View style={s.row}>
            <View style={[s.field, s.rowHalf]}>
              <Text style={s.label}>Price (₦)</Text>
              <View style={[s.priceWrap, errors.price && s.inputErr]}>
                <Text style={s.nairaSign}>₦</Text>
                <TextInput
                  style={s.priceInput}
                  placeholder="1,000"
                  placeholderTextColor={T3}
                  value={price}
                  onChangeText={t => { setPrice(t.replace(/[^0-9.]/g, '')); if (errors.price) setErrors(p => ({ ...p, price: '' })); }}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.price ? <Text style={s.errText}>{errors.price}</Text> : null}
            </View>

            <View style={[s.field, s.rowHalf]}>
              <Text style={s.label}>Stock Qty</Text>
              <TextInput
                style={[s.input, errors.stock && s.inputErr]}
                placeholder="Stock"
                placeholderTextColor={T3}
                value={stock}
                onChangeText={t => { setStock(t.replace(/[^0-9]/g, '')); if (errors.stock) setErrors(p => ({ ...p, stock: '' })); }}
                keyboardType="number-pad"
              />
              {errors.stock ? <Text style={s.errText}>{errors.stock}</Text> : null}
            </View>
          </View>

          {/* Description */}
          <View style={[s.field, { marginBottom: 32 }]}>
            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.textarea, errors.description && s.inputErr]}
              placeholder="Enter product details..."
              placeholderTextColor={T3}
              value={description}
              onChangeText={t => { setDescription(t); if (errors.description) setErrors(p => ({ ...p, description: '' })); }}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={2000}
            />
            {errors.description ? <Text style={s.errText}>{errors.description}</Text> : null}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
          <TouchableOpacity
            style={[s.saveBtn, loading && s.saveBtnDim]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveBtnTxt}>{isEdit ? 'Update Product' : 'Add Product'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={s.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={[s.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>Select Category</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map(cat => {
                const selected = selectedCategory === cat._id;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    style={[s.pickerItem, selected && s.pickerItemSelected]}
                    onPress={() => {
                      setSelectedCategory(cat._id);
                      setErrors(p => ({ ...p, category: '' }));
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[s.pickerItemTxt, selected && s.pickerItemTxtSelected]}>
                      {cat.name}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color={PINK} />}
                  </TouchableOpacity>
                );
              })}
              {categories.length === 0 && (
                <Text style={s.pickerEmpty}>No categories available</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: T1, letterSpacing: -0.4 },

  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },

  imageBox: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: PINK,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  imageBoxFull:  { borderColor: T3 },
  imageBoxTitle: { fontSize: 15, fontWeight: '600', color: PINK, marginTop: 8 },
  imageBoxSub:   { fontSize: 12, color: T3, marginTop: 4 },

  thumbsRow: { marginBottom: 16 },
  thumbWrap: { marginRight: 10, position: 'relative' },
  thumb:     { width: 72, height: 72, borderRadius: 10, backgroundColor: '#eee' },
  thumbRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },

  field:   { marginBottom: 18 },
  label:   { fontSize: 14, fontWeight: '700', color: T1, marginBottom: 8 },
  errText: { fontSize: 12, color: '#EF4444', marginTop: 4 },

  input: {
    backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: T1,
  },
  inputErr: { borderColor: '#EF4444' },

  dropdown: {
    backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownPlaceholder: { fontSize: 15, color: T3 },
  dropdownValue:       { fontSize: 15, color: T1 },

  row:      { flexDirection: 'row', gap: 12 },
  rowHalf:  { flex: 1 },

  priceWrap: {
    backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
  },
  nairaSign:  { fontSize: 15, color: T1, marginRight: 2 },
  priceInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: T1 },

  textarea: {
    backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13,
    fontSize: 15, color: T1, minHeight: 120,
  },

  footer: {
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: BG,
  },
  saveBtn: {
    backgroundColor: PINK, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    ...Platform.select({
      android: { elevation: 3 },
      ios:     { shadowColor: PINK, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
    }),
  },
  saveBtnDim: { opacity: 0.6 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '70%',
  },
  pickerHandle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  pickerTitle:           { fontSize: 17, fontWeight: '700', color: T1, marginBottom: 12 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected:    { backgroundColor: '#FEF2F7', borderRadius: 10, paddingHorizontal: 8 },
  pickerItemTxt:         { fontSize: 15, color: T2 },
  pickerItemTxtSelected: { color: PINK, fontWeight: '600' },
  pickerEmpty:           { textAlign: 'center', color: T3, paddingVertical: 24, fontSize: 14 },
});

export default AddEditProductScreen;
