import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, categoriesAPI, handleAPIError } from '@/api/api';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AddEditProductRouteProp = RouteProp<RootStackParamList, 'AddProduct' | 'EditProduct'>;
type AddEditProductNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ProductImage {
  uri: string;
  type: string;
  name: string;
}

interface Category {
  _id: string;
  name: string;
  icon?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Reusable Components ──────────────────────────────────────────────────────

const FieldLabel: React.FC<{ label: string; required?: boolean }> = ({ label, required }) => (
  <View style={styles.fieldLabelRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {required && <Text style={styles.fieldRequired}> *</Text>}
  </View>
);

const StyledInput: React.FC<{
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: any;
  maxLength?: number;
  prefix?: string;
  suffix?: string;
  style?: any;
}> = ({ value, onChangeText, placeholder, multiline, keyboardType, maxLength, prefix, suffix, style }) => (
  <View style={[styles.inputWrap, multiline && styles.inputWrapMulti]}>
    {prefix && <View style={styles.inputAddon}><Text style={styles.inputAddonText}>{prefix}</Text></View>}
    <TextInput
      style={[styles.input, multiline && styles.inputMulti, prefix && { paddingLeft: 0 }, style]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#C7C7CC"
      multiline={multiline}
      keyboardType={keyboardType}
      maxLength={maxLength}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
    {suffix && <View style={styles.inputAddonRight}><Text style={styles.inputAddonText}>{suffix}</Text></View>}
  </View>
);

const Toggle: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => (
  <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={[styles.toggle, value && styles.toggleActive]}>
    <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
  </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

const AddEditProductScreen: React.FC = () => {
  const navigation = useNavigation<AddEditProductNavigationProp>();
  const route = useRoute<AddEditProductRouteProp>();
  const submittingRef = useRef(false);

  const isEdit = route.name === 'EditProduct';
  const productId = isEdit ? (route.params as any)?.productId : null;

  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [condition, setCondition] = useState<'new' | 'refurbished' | 'used'>('new');
  const [brand, setBrand] = useState('');
  const [homeDelivery, setHomeDelivery] = useState(true);
  const [pickup, setPickup] = useState(true);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('3');
  const [images, setImages] = useState<ProductImage[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    fetchCategories();
    if (isEdit && productId) fetchProduct();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getActiveCategories();
      if (response.success) setCategories(response.data || []);
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoadingProduct(true);
      const response = await productAPI.getProductById(productId, false);
      if (response.success) {
        const p = response.data.product;
        setName(p.name);
        setDescription(p.description);
        setShortDescription(p.shortDescription || '');
        setSelectedCategory(p.category._id);
        setPrice(p.price.toString());
        setCompareAtPrice(p.compareAtPrice?.toString() || '');
        setStock(p.stock.toString());
        setLowStockThreshold(p.lowStockThreshold?.toString() || '10');
        setCondition(p.condition);
        setBrand(p.brand || '');
        setHomeDelivery(p.deliveryOptions?.homeDelivery || false);
        setPickup(p.deliveryOptions?.pickup || false);
        setEstimatedDeliveryDays(p.deliveryOptions?.estimatedDeliveryDays?.toString() || '3');
        setExistingImages(p.images || []);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message);
      navigation.goBack();
    } finally {
      setLoadingProduct(false);
    }
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('Permission Required', 'Please grant permission to access photos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 10 - images.length - existingImages.length,
      });
      if (!result.canceled) {
        const newImages = result.assets.map((asset, index) => {
          let mimeType = 'image/jpeg';
          if (asset.uri) {
            const ext = asset.uri.split('.').pop()?.toLowerCase();
            if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'gif') mimeType = 'image/gif';
            else if (ext === 'webp') mimeType = 'image/webp';
          }
          return { uri: asset.uri, type: mimeType, name: asset.fileName || `product_${Date.now()}_${index}.jpg` };
        });
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      toast.error('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    const updated = [...images];
    updated.splice(index, 1);
    setImages(updated);
  };

  const removeExistingImage = (index: number) => {
    setConfirmModal({
      visible: true,
      title: 'Remove Image',
      message: 'This will permanently remove the image from this product.',
      onConfirm: () => {
        const updated = [...existingImages];
        updated.splice(index, 1);
        setExistingImages(updated);
      },
    });
  };

  const validateForm = () => {
    if (!name.trim()) { toast.warning('Required', 'Please enter a product name'); return false; }
    if (!description.trim()) { toast.warning('Required', 'Please enter a product description'); return false; }
    if (!selectedCategory) { toast.warning('Required', 'Please select a category'); return false; }
    if (!price || parseFloat(price.replace(/,/g, '')) <= 0) { toast.error('Invalid', 'Please enter a valid selling price'); return false; }
    if (!stock || parseInt(stock.replace(/,/g, '')) < 0) { toast.error('Invalid', 'Please enter a valid stock quantity'); return false; }
    if (!isEdit && images.length === 0) { toast.warning('Required', 'Please add at least one product image'); return false; }
    if (!homeDelivery && !pickup) { toast.warning('Required', 'Please select at least one delivery option'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (submittingRef.current) return;
    if (!validateForm()) return;
    submittingRef.current = true;
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      const API_BASE_URL = 'https://sharplook-backend-production.onrender.com/api/v1';
      if (!token) throw new Error('No authentication token found. Please login again.');

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      if (shortDescription.trim()) formData.append('shortDescription', shortDescription.trim());
      formData.append('category', selectedCategory);
      formData.append('price', String(parseFloat(price.replace(/,/g, ''))));
      if (compareAtPrice) formData.append('compareAtPrice', String(parseFloat(compareAtPrice.replace(/,/g, ''))));
      formData.append('stock', String(parseInt(stock.replace(/,/g, ''))));
      formData.append('lowStockThreshold', String(parseInt(lowStockThreshold.replace(/,/g, ''))));
      formData.append('condition', condition);
      if (brand.trim()) formData.append('brand', brand.trim());
      formData.append('deliveryOptions', JSON.stringify({ homeDelivery, pickup, estimatedDeliveryDays: parseInt(estimatedDeliveryDays) }));
      if (isEdit && existingImages.length > 0) formData.append('existingImages', JSON.stringify(existingImages));

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        let imageUri = image.uri;
        if (Platform.OS === 'ios' && imageUri.startsWith('file://')) imageUri = imageUri.replace('file://', '');
        formData.append('images', { uri: imageUri, type: image.type || 'image/jpeg', name: image.name || `product_${Date.now()}_${i}.jpg` } as any);
      }

      const endpoint = isEdit ? `${API_BASE_URL}/products/${productId}` : `${API_BASE_URL}/products`;
      const fetchResponse = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData,
      });

      const responseText = await fetchResponse.text();
      const result = JSON.parse(responseText);

      if (!fetchResponse.ok) throw new Error(result.message || `Request failed with status ${fetchResponse.status}`);
      if (result.success) {
        toast.success('Success', isEdit ? 'Product updated successfully' : 'Product created. Pending admin approval.');
        navigation.goBack();
      } else {
        throw new Error(result.message || 'Operation failed');
      }
    } catch (error: any) {
      let msg = 'Failed to save product';
      if (error?.message?.includes('Network request failed')) msg = 'Network error. Check your internet connection and try again.';
      else if (error?.message?.includes('timeout')) msg = 'Request timed out. Please try again.';
      else if (error?.message) msg = error.message;

      if (msg.includes('Upgrade') || msg.includes('plan allows')) {
        toast.info('Limit Reached', msg);
        navigation.navigate('UpgradeTier' as never);
        return;
      }
      toast.error('Error', msg);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const totalImages = images.length + existingImages.length;
  const parsedPrice = parseFloat(price.replace(/,/g, '')) || 0;
  const parsedCompareAtPrice = parseFloat(compareAtPrice.replace(/,/g, '')) || 0;
  const discount = parsedCompareAtPrice > 0 && parsedPrice > 0 && parsedCompareAtPrice > parsedPrice
    ? Math.round(((parsedCompareAtPrice - parsedPrice) / parsedCompareAtPrice) * 100)
    : null;
  const selectedCategoryName = categories.find(c => c._id === selectedCategory)?.name;

  if (loadingProduct) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8166D" />
        <Text style={styles.loadingText}>Loading product…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>

      {/* ── Category Picker Modal ────────────────────────────────────────── */}
      <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerSheetTitle}>Select Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(c) => c._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = selectedCategory === item._id;
                return (
                  <TouchableOpacity
                    onPress={() => { setSelectedCategory(item._id); setShowCategoryPicker(false); }}
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerItemText, active && styles.pickerItemTextActive]}>{item.name}</Text>
                    {active && <Ionicons name="checkmark-circle" size={20} color="#E8166D" />}
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Confirm Modal ────────────────────────────────────────────────── */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#E8166D', '#FF5FA0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Product' : 'Add Product'}</Text>
          <Text style={styles.headerSub}>{isEdit ? 'Update your product listing' : 'Create a new product listing'}</Text>
        </View>
      </LinearGradient>

      {/* ── Scrollable Content ─────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Image Section ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="images-outline" size={15} color="#E8166D" />
            </View>
            <Text style={styles.sectionTitle}>Product Photos</Text>
            <Text style={styles.imageCount}>{totalImages}/10</Text>
          </View>

          {totalImages === 0 ? (
            <TouchableOpacity onPress={pickImages} style={styles.dashedBox} activeOpacity={0.75}>
              <View style={styles.dashedBoxIconWrap}>
                <Ionicons name="camera-outline" size={30} color="#E8166D" />
              </View>
              <Text style={styles.dashedBoxTitle}>Add Product Photos</Text>
              <Text style={styles.dashedBoxSub}>Tap to upload up to 10 photos</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
              {existingImages.map((uri, i) => (
                <View key={`ex-${i}`} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                  {i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
                  <TouchableOpacity onPress={() => removeExistingImage(i)} style={styles.removeBtn}>
                    <Ionicons name="close" size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.map((img, i) => (
                <View key={`new-${i}`} style={styles.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} resizeMode="cover" />
                  {existingImages.length === 0 && i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
                  <TouchableOpacity onPress={() => removeImage(i)} style={styles.removeBtn}>
                    <Ionicons name="close" size={10} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {totalImages < 10 && (
                <TouchableOpacity onPress={pickImages} style={styles.addThumbBtn} activeOpacity={0.7}>
                  <Ionicons name="add" size={24} color="#E8166D" />
                  <Text style={styles.addThumbLabel}>Add</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>

        {/* ── Basic Info ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="create-outline" size={15} color="#3B82F6" />
            </View>
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

          {/* Product Name */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Product Name" required />
            <StyledInput value={name} onChangeText={setName} placeholder="e.g., Premium Wireless Headphones" />
          </View>

          {/* Category */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Category" required />
            <TouchableOpacity onPress={() => setShowCategoryPicker(true)} style={styles.pickerBtn} activeOpacity={0.8}>
              <Text style={[styles.pickerBtnText, !selectedCategoryName && { color: '#C7C7CC' }]}>
                {selectedCategoryName || 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Short Description */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Short Description" />
            <StyledInput value={shortDescription} onChangeText={setShortDescription} placeholder="One-line summary for listings" maxLength={100} />
            <Text style={styles.charCount}>{shortDescription.length} / 100</Text>
          </View>

          {/* Full Description */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Description" required />
            <StyledInput value={description} onChangeText={setDescription} placeholder="Features, specifications, benefits…" multiline />
          </View>

          {/* Brand */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Brand" />
            <StyledInput value={brand} onChangeText={setBrand} placeholder="e.g., Nike, Apple, Samsung" />
          </View>

          {/* Condition */}
          <View style={[styles.fieldWrap, { marginBottom: 0 }]}>
            <FieldLabel label="Condition" required />
            <View style={styles.conditionRow}>
              {([
                { value: 'new', label: 'New', icon: 'sparkles-outline' },
                { value: 'refurbished', label: 'Refurbished', icon: 'construct-outline' },
                { value: 'used', label: 'Used', icon: 'time-outline' },
              ] as const).map((c) => {
                const active = condition === c.value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => setCondition(c.value)}
                    style={[styles.conditionBtn, active && styles.conditionBtnActive]}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={c.icon} size={15} color={active ? '#E8166D' : '#8E8E93'} />
                    <Text style={[styles.conditionLabel, active && styles.conditionLabelActive]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Pricing & Stock ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#F0FFF4' }]}>
              <Ionicons name="pricetag-outline" size={15} color="#22C55E" />
            </View>
            <Text style={styles.sectionTitle}>Pricing & Stock</Text>
          </View>

          {/* Price + Stock side by side */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldWrap, { flex: 1, marginRight: 10 }]}>
              <FieldLabel label="Price (₦)" required />
              <StyledInput value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9,.]/g, ''))} placeholder="0.00" keyboardType="decimal-pad" prefix="₦" />
            </View>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <FieldLabel label="Stock Qty" required />
              <StyledInput value={stock} onChangeText={(t) => setStock(t.replace(/[^0-9]/g, ''))} placeholder="0" keyboardType="number-pad" />
            </View>
          </View>

          {/* Original Price */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Original Price (optional)" />
            <StyledInput value={compareAtPrice} onChangeText={(t) => setCompareAtPrice(t.replace(/[^0-9,.]/g, ''))} placeholder="0.00" keyboardType="decimal-pad" prefix="₦" />
            {discount !== null && (
              <View style={styles.discountBadge}>
                <Ionicons name="trending-down" size={12} color="#16A34A" />
                <Text style={styles.discountText}>{discount}% off</Text>
              </View>
            )}
          </View>

          {/* Low Stock Alert */}
          <View style={[styles.fieldWrap, { marginBottom: 0 }]}>
            <FieldLabel label="Low Stock Alert" />
            <StyledInput value={lowStockThreshold} onChangeText={(t) => setLowStockThreshold(t.replace(/[^0-9]/g, ''))} placeholder="10" keyboardType="number-pad" suffix="units" />
          </View>
        </View>

        {/* ── Delivery Options ────────────────────────────────────────── */}
        <View style={[styles.card, { marginBottom: 0 }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="car-outline" size={15} color="#3B82F6" />
            </View>
            <Text style={styles.sectionTitle}>Delivery Options</Text>
          </View>

          <View style={styles.deliveryRow}>
            <View style={[styles.deliveryIconWrap, homeDelivery ? styles.deliveryIconActive : styles.deliveryIconInactive]}>
              <Ionicons name="home-outline" size={18} color={homeDelivery ? '#E8166D' : '#C7C7CC'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.deliveryTitle}>Home Delivery</Text>
              <Text style={styles.deliverySub}>Fee calculated by distance</Text>
            </View>
            <Toggle value={homeDelivery} onToggle={() => setHomeDelivery(!homeDelivery)} />
          </View>

          {homeDelivery && (
            <View style={styles.deliverySubField}>
              <FieldLabel label="Estimated Delivery Days" />
              <StyledInput value={estimatedDeliveryDays} onChangeText={setEstimatedDeliveryDays} placeholder="3" keyboardType="number-pad" suffix="days" />
            </View>
          )}

          <View style={styles.divider} />

          <View style={[styles.deliveryRow, { marginBottom: 0 }]}>
            <View style={[styles.deliveryIconWrap, pickup ? styles.deliveryIconActive : styles.deliveryIconInactive]}>
              <Ionicons name="storefront-outline" size={18} color={pickup ? '#E8166D' : '#C7C7CC'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.deliveryTitle}>Pickup Available</Text>
              <Text style={styles.deliverySub}>Customer collects — no delivery fee</Text>
            </View>
            <Toggle value={pickup} onToggle={() => setPickup(!pickup)} />
          </View>
        </View>

      </ScrollView>

      {/* ── Save Button ─────────────────────────────────────────────────── */}
      <View style={styles.saveBarWrap}>
        <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
          <LinearGradient colors={['#E8166D', '#FF5FA0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBar}>
            {loading ? (
              <View style={styles.saveBarInner}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.saveBarText}>{isEdit ? 'Updating…' : 'Saving…'}</Text>
              </View>
            ) : (
              <View style={styles.saveBarInner}>
                <Ionicons name={isEdit ? 'checkmark-circle' : 'bag-add-outline'} size={20} color="#fff" />
                <Text style={styles.saveBarText}>{isEdit ? 'Update Product' : 'Save Product'}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  loadingContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#8E8E93', fontWeight: '500' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3, flex: 1 },
  imageCount: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },

  // Dashed box
  dashedBox: {
    borderWidth: 2, borderColor: '#E8166D', borderStyle: 'dashed',
    borderRadius: 16, height: 180,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF8FB',
  },
  dashedBoxIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  dashedBoxTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  dashedBoxSub: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },

  // Thumbnails
  thumbRow: { paddingBottom: 4 },
  thumbWrap: { width: 86, height: 86, borderRadius: 14, marginRight: 10, position: 'relative' },
  thumb: { width: 86, height: 86, borderRadius: 14, backgroundColor: '#E5E5EA' },
  mainBadge: {
    position: 'absolute', top: 5, left: 5,
    backgroundColor: '#E8166D', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  mainBadgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  removeBtn: {
    position: 'absolute', top: -5, right: -5,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F2F2F7',
  },
  addThumbBtn: {
    width: 86, height: 86, borderRadius: 14,
    backgroundColor: '#FFF0F6', borderWidth: 1.5, borderColor: '#E8166D', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addThumbLabel: { fontSize: 11, color: '#E8166D', fontWeight: '700', marginTop: 2 },

  // Category picker button
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F2F2F7', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  pickerBtnText: { fontSize: 15, color: '#1C1C1E', fontWeight: '400', flex: 1 },

  // Category picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '70%',
  },
  pickerHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  pickerSheetTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 12, letterSpacing: -0.3 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  pickerItemActive: { backgroundColor: 'transparent' },
  pickerItemText: { fontSize: 15, color: '#3A3A3C', fontWeight: '500' },
  pickerItemTextActive: { color: '#E8166D', fontWeight: '700' },

  // Field
  fieldWrap: { marginBottom: 16 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#3A3A3C' },
  fieldRequired: { fontSize: 13, fontWeight: '700', color: '#FF3B30' },
  charCount: { fontSize: 11, color: '#C7C7CC', marginTop: 5, textAlign: 'right', fontWeight: '500' },

  // Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E5EA',
  },
  inputWrapMulti: { alignItems: 'flex-start' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1C1C1E', fontWeight: '400' },
  inputMulti: { minHeight: 110, paddingTop: 13 },
  inputAddon: { paddingHorizontal: 13, paddingVertical: 13, backgroundColor: '#E9E9EE' },
  inputAddonRight: { paddingHorizontal: 13, paddingVertical: 13, backgroundColor: '#E9E9EE' },
  inputAddonText: { fontSize: 14, fontWeight: '600', color: '#6C6C70' },

  // Row fields (price + stock side by side)
  rowFields: { flexDirection: 'row' },

  // Condition
  conditionRow: { flexDirection: 'row', gap: 10 },
  conditionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: '#E5E5EA',
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  conditionBtnActive: { backgroundColor: '#FFF0F6', borderColor: '#E8166D' },
  conditionLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  conditionLabelActive: { color: '#E8166D' },

  // Discount badge
  discountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, backgroundColor: '#F0FFF4', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  discountText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },

  // Delivery
  deliveryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  deliveryIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deliveryIconActive: { backgroundColor: '#FFF0F6' },
  deliveryIconInactive: { backgroundColor: '#F2F2F7' },
  deliveryTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  deliverySub: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  deliverySubField: { marginLeft: 52, marginBottom: 14 },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginVertical: 8, marginHorizontal: -18 },

  // Toggle
  toggle: {
    width: 46, height: 28, borderRadius: 14,
    backgroundColor: '#E5E5EA', justifyContent: 'center', paddingHorizontal: 3, marginLeft: 10,
  },
  toggleActive: { backgroundColor: '#E8166D' },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleKnobActive: { alignSelf: 'flex-end' },

  // Save button
  saveBarWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1, borderTopColor: '#F2F2F7',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  saveBar: { paddingVertical: 16, borderRadius: 16 },
  saveBarInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBarText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
});

export default AddEditProductScreen;
