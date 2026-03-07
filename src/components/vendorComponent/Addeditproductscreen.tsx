import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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

interface FieldInfo {
  title: string;
  description: string;
  required: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FIELD_INFO: { [key: string]: FieldInfo } = {
  images: {
    title: 'Product Images',
    description: 'Add clear, high-quality photos of your product. The first image will be the main display photo. You can add up to 10 images.',
    required: true,
  },
  name: {
    title: 'Product Name',
    description: 'Enter a clear and descriptive name for your product. This is what customers will see first.',
    required: true,
  },
  shortDescription: {
    title: 'Short Description',
    description: 'A brief one-line summary of your product. This appears in product listings and search results.',
    required: false,
  },
  description: {
    title: 'Full Description',
    description: 'Provide detailed information about your product including features, benefits, specifications, and any other relevant details.',
    required: true,
  },
  category: {
    title: 'Category',
    description: 'Select the category that best fits your product. This helps customers find your product easily.',
    required: true,
  },
  brand: {
    title: 'Brand',
    description: 'Enter the brand name of the product (e.g., Nike, Apple, Samsung). Leave empty if unbranded.',
    required: false,
  },
  condition: {
    title: 'Product Condition',
    description: 'New: Brand new, unused. Refurbished: Professionally restored. Used: Previously owned.',
    required: true,
  },
  sellingPrice: {
    title: 'Selling Price',
    description: 'The actual price customers will pay. Enter the amount in Naira (₦).',
    required: true,
  },
  originalPrice: {
    title: 'Original Price',
    description: 'The original or market price before discount. Shows customers how much they\'re saving.',
    required: false,
  },
  stock: {
    title: 'Stock Quantity',
    description: 'How many units of this product do you have available for sale?',
    required: true,
  },
  lowStock: {
    title: 'Low Stock Alert',
    description: 'You\'ll be notified when stock reaches this number. Helps you restock on time.',
    required: false,
  },
  homeDelivery: {
    title: 'Home Delivery',
    description: 'Enable this if you can deliver products to customers\' addresses. Delivery fee will be calculated based on distance.',
    required: false,
  },
  pickup: {
    title: 'Pickup Available',
    description: 'Enable this if customers can pick up products from your location. No delivery fee applies.',
    required: false,
  },
  deliveryDays: {
    title: 'Estimated Delivery Time',
    description: 'Average number of days it takes to deliver the product after order confirmation.',
    required: false,
  },
};

// ─── Reusable Components ──────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
}> = ({ icon, iconBg, iconColor, title }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
      <Ionicons name={icon as any} size={15} color={iconColor} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const FieldLabel: React.FC<{
  label: string;
  required?: boolean;
  onInfo?: () => void;
}> = ({ label, required, onInfo }) => (
  <View style={styles.fieldLabelRow}>
    <View style={styles.fieldLabelLeft}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {required && <View style={styles.requiredDot} />}
    </View>
    {onInfo && (
      <TouchableOpacity onPress={onInfo} style={styles.infoBtn} activeOpacity={0.6}>
        <Ionicons name="information-circle-outline" size={17} color="#C7C7CC" />
      </TouchableOpacity>
    )}
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

const Toggle: React.FC<{
  value: boolean;
  onToggle: () => void;
}> = ({ value, onToggle }) => (
  <TouchableOpacity
    onPress={onToggle}
    activeOpacity={0.8}
    style={[styles.toggle, value && styles.toggleActive]}
  >
    <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
  </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

const AddEditProductScreen: React.FC = () => {
  const navigation = useNavigation<AddEditProductNavigationProp>();
  const route = useRoute<AddEditProductRouteProp>();

  const isEdit = route.name === 'EditProduct';
  const productId = isEdit ? (route.params as any)?.productId : null;

  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeFieldInfo, setActiveFieldInfo] = useState<FieldInfo | null>(null);

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

  const showFieldInfo = (fieldKey: string) => {
    setActiveFieldInfo(FIELD_INFO[fieldKey]);
    setShowInfoModal(true);
  };

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
    if (!price || parseFloat(price) <= 0) { toast.error('Invalid', 'Please enter a valid selling price'); return false; }
    if (!stock || parseInt(stock) < 0) { toast.error('Invalid', 'Please enter a valid stock quantity'); return false; }
    if (!isEdit && images.length === 0) { toast.warning('Required', 'Please add at least one product image'); return false; }
    if (!homeDelivery && !pickup) { toast.warning('Required', 'Please select at least one delivery option'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
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
      formData.append('price', String(parseFloat(price)));
      if (compareAtPrice) formData.append('compareAtPrice', String(parseFloat(compareAtPrice)));
      formData.append('stock', String(parseInt(stock)));
      formData.append('lowStockThreshold', String(parseInt(lowStockThreshold)));
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
      toast.error('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const totalImages = images.length + existingImages.length;
  const progress = ((existingImages.length > 0 || images.length > 0 ? 1 : 0) + (name ? 1 : 0) + (description ? 1 : 0) + (selectedCategory ? 1 : 0) + (price ? 1 : 0) + (stock ? 1 : 0)) / 6;
  const discount = compareAtPrice && price && parseFloat(compareAtPrice) > parseFloat(price)
    ? Math.round(((parseFloat(compareAtPrice) - parseFloat(price)) / parseFloat(compareAtPrice)) * 100)
    : null;

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

      {/* ── Info Modal ─────────────────────────────────────────────── */}
      <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowInfoModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="information" size={20} color="#E8166D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{activeFieldInfo?.title}</Text>
                {activeFieldInfo?.required && (
                  <View style={styles.modalRequiredRow}>
                    <View style={styles.requiredDot} />
                    <Text style={styles.modalRequiredText}>Required</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowInfoModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>{activeFieldInfo?.description}</Text>
            <TouchableOpacity onPress={() => setShowInfoModal(false)} style={styles.modalAction}>
              <Text style={styles.modalActionText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <LinearGradient colors={['#E8166D', '#FF5FA0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{isEdit ? 'Edit Product' : 'New Product'}</Text>
            <Text style={styles.headerSub}>{isEdit ? 'Update your listing details' : 'Create a new product listing'}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {Math.round(progress * 100)}% complete
        </Text>
      </LinearGradient>

      {/* ── Scrollable Content ─────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Images ──────────────────────────────────────────────── */}
        <View style={styles.imagesSection}>
          <View style={styles.imagesSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.imagesSectionTitle}>Photos</Text>
              <View style={styles.requiredDot} />
            </View>
            <TouchableOpacity onPress={() => showFieldInfo('images')} activeOpacity={0.6} style={styles.infoBtn}>
              <Ionicons name="information-circle-outline" size={17} color="#C7C7CC" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
            {existingImages.map((uri, i) => (
              <View key={`ex-${i}`} style={styles.imageThumbWrap}>
                <Image source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
                {i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
                <TouchableOpacity onPress={() => removeExistingImage(i)} style={styles.imageRemoveBtn}>
                  <Ionicons name="close" size={11} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.map((img, i) => (
              <View key={`new-${i}`} style={styles.imageThumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.imageThumb} resizeMode="cover" />
                {existingImages.length === 0 && i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>}
                <TouchableOpacity onPress={() => removeImage(i)} style={styles.imageRemoveBtn}>
                  <Ionicons name="close" size={11} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {totalImages < 10 && (
              <TouchableOpacity onPress={pickImages} style={styles.addImageBtn} activeOpacity={0.7}>
                <View style={styles.addImageIcon}>
                  <Ionicons name="add" size={22} color="#E8166D" />
                </View>
                <Text style={styles.addImageLabel}>Add photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Text style={styles.imageCount}>{totalImages} / 10 photos</Text>
        </View>

        {/* ── Basic Info Card ─────────────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader icon="create-outline" iconBg="#FFF0F6" iconColor="#E8166D" title="Basic Information" />

          {/* Name */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Product Name" required onInfo={() => showFieldInfo('name')} />
            <StyledInput value={name} onChangeText={setName} placeholder="e.g., Premium Wireless Headphones" />
          </View>

          {/* Short desc */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Short Description" onInfo={() => showFieldInfo('shortDescription')} />
            <StyledInput value={shortDescription} onChangeText={setShortDescription} placeholder="One-line summary for listings" maxLength={100} />
            <Text style={styles.charCount}>{shortDescription.length} / 100</Text>
          </View>

          {/* Full desc */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Full Description" required onInfo={() => showFieldInfo('description')} />
            <StyledInput
              value={description}
              onChangeText={setDescription}
              placeholder="Features, specifications, benefits…"
              multiline
            />
          </View>

          {/* Category */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Category" required onInfo={() => showFieldInfo('category')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {categories.map((cat) => {
                const active = selectedCategory === cat._id;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    onPress={() => setSelectedCategory(cat._id)}
                    style={[styles.chip, active && styles.chipActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Brand */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Brand" onInfo={() => showFieldInfo('brand')} />
            <StyledInput value={brand} onChangeText={setBrand} placeholder="e.g., Nike, Apple, Samsung" />
          </View>

          {/* Condition */}
          <View style={[styles.fieldWrap, { marginBottom: 0 }]}>
            <FieldLabel label="Condition" required onInfo={() => showFieldInfo('condition')} />
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
                    <Ionicons name={c.icon} size={16} color={active ? '#E8166D' : '#8E8E93'} />
                    <Text style={[styles.conditionLabel, active && styles.conditionLabelActive]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Pricing & Stock ─────────────────────────────────────── */}
        <View style={styles.card}>
          <SectionHeader icon="pricetag-outline" iconBg="#F0FFF4" iconColor="#22C55E" title="Pricing & Stock" />

          {/* Selling Price */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Selling Price" required onInfo={() => showFieldInfo('sellingPrice')} />
            <StyledInput value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" prefix="₦" />
          </View>

          {/* Original Price */}
          <View style={styles.fieldWrap}>
            <FieldLabel label="Original Price" onInfo={() => showFieldInfo('originalPrice')} />
            <StyledInput value={compareAtPrice} onChangeText={setCompareAtPrice} placeholder="0.00" keyboardType="decimal-pad" prefix="₦" />
            {discount !== null && (
              <View style={styles.discountBadge}>
                <Ionicons name="trending-down" size={12} color="#16A34A" />
                <Text style={styles.discountText}>{discount}% off</Text>
              </View>
            )}
          </View>

          {/* Stock row */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldWrap, { flex: 1, marginBottom: 0, marginRight: 10 }]}>
              <FieldLabel label="Stock" required onInfo={() => showFieldInfo('stock')} />
              <StyledInput value={stock} onChangeText={setStock} placeholder="0" keyboardType="number-pad" />
            </View>
            <View style={[styles.fieldWrap, { flex: 1, marginBottom: 0 }]}>
              <FieldLabel label="Low Alert" onInfo={() => showFieldInfo('lowStock')} />
              <StyledInput value={lowStockThreshold} onChangeText={setLowStockThreshold} placeholder="10" keyboardType="number-pad" />
            </View>
          </View>
        </View>

        {/* ── Delivery Options ────────────────────────────────────── */}
        <View style={[styles.card, { marginBottom: 0 }]}>
          <SectionHeader icon="car-outline" iconBg="#EFF6FF" iconColor="#3B82F6" title="Delivery Options" />

          {/* Home Delivery row */}
          <View style={styles.deliveryRow}>
            <View style={[styles.deliveryIconWrap, homeDelivery ? styles.deliveryIconActive : styles.deliveryIconInactive]}>
              <Ionicons name="home-outline" size={18} color={homeDelivery ? '#E8166D' : '#C7C7CC'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.deliveryTitle}>Home Delivery</Text>
              <Text style={styles.deliverySub}>Fee calculated by distance</Text>
            </View>
            <TouchableOpacity onPress={() => showFieldInfo('homeDelivery')} style={styles.infoBtn} activeOpacity={0.6}>
              <Ionicons name="information-circle-outline" size={17} color="#C7C7CC" />
            </TouchableOpacity>
            <Toggle value={homeDelivery} onToggle={() => setHomeDelivery(!homeDelivery)} />
          </View>

          {homeDelivery && (
            <View style={styles.deliverySubField}>
              <FieldLabel label="Estimated Delivery Days" onInfo={() => showFieldInfo('deliveryDays')} />
              <StyledInput value={estimatedDeliveryDays} onChangeText={setEstimatedDeliveryDays} placeholder="3" keyboardType="number-pad" suffix="days" />
            </View>
          )}

          <View style={styles.divider} />

          {/* Pickup row */}
          <View style={[styles.deliveryRow, { marginBottom: 0 }]}>
            <View style={[styles.deliveryIconWrap, pickup ? styles.deliveryIconActive : styles.deliveryIconInactive]}>
              <Ionicons name="storefront-outline" size={18} color={pickup ? '#E8166D' : '#C7C7CC'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.deliveryTitle}>Pickup Available</Text>
              <Text style={styles.deliverySub}>Customer collects — no delivery fee</Text>
            </View>
            <TouchableOpacity onPress={() => showFieldInfo('pickup')} style={styles.infoBtn} activeOpacity={0.6}>
              <Ionicons name="information-circle-outline" size={17} color="#C7C7CC" />
            </TouchableOpacity>
            <Toggle value={pickup} onToggle={() => setPickup(!pickup)} />
          </View>
        </View>

      </ScrollView>

      {/* ── Save Button ─────────────────────────────────────────────── */}
      <View style={styles.saveBarWrap}>
        <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85} style={{ borderRadius: 16, overflow: 'hidden' }}>
          <LinearGradient colors={['#E8166D', '#FF5FA0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBar}>
            {loading ? (
              <View style={styles.saveBarInner}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.saveBarText}>{isEdit ? 'Updating…' : 'Creating…'}</Text>
              </View>
            ) : (
              <View style={styles.saveBarInner}>
                <Ionicons name={isEdit ? 'checkmark-circle' : 'add-circle'} size={20} color="#fff" />
                <Text style={styles.saveBarText}>{isEdit ? 'Update Product' : 'Create Product'}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  // Loading
  loadingContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#8E8E93', fontWeight: '500' },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: '#fff', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6, fontWeight: '600' },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },

  // Images
  imagesSection: { marginBottom: 14 },
  imagesSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  imagesSectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3 },
  imagesRow: { paddingBottom: 4 },
  imageThumbWrap: { width: 90, height: 90, borderRadius: 14, marginRight: 10, position: 'relative' },
  imageThumb: { width: 90, height: 90, borderRadius: 14, backgroundColor: '#E5E5EA' },
  mainBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: '#E8166D', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  mainBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  imageRemoveBtn: {
    position: 'absolute', top: -5, right: -5,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F2F2F7',
  },
  addImageBtn: {
    width: 90, height: 90, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E5EA', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addImageIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  addImageLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '600' },
  imageCount: { fontSize: 12, color: '#8E8E93', marginTop: 8, fontWeight: '500' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3 },

  // Field
  fieldWrap: { marginBottom: 18 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  fieldLabelLeft: { flexDirection: 'row', alignItems: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#3A3A3C', letterSpacing: -0.1 },
  requiredDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF3B30', marginLeft: 5 },
  infoBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
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

  // Chips
  chipRow: { paddingVertical: 2 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: '#E5E5EA', marginRight: 8,
  },
  chipActive: { backgroundColor: '#FFF0F6', borderColor: '#E8166D' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  chipTextActive: { color: '#E8166D' },

  // Condition
  conditionRow: { flexDirection: 'row', gap: 10 },
  conditionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: '#E5E5EA',
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  conditionBtnActive: { backgroundColor: '#FFF0F6', borderColor: '#E8166D' },
  conditionLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  conditionLabelActive: { color: '#E8166D' },

  // Discount badge
  discountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, backgroundColor: '#F0FFF4', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  discountText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },

  // Row fields
  rowFields: { flexDirection: 'row' },

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

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  modalIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.3, flex: 1 },
  modalRequiredRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  modalRequiredText: { fontSize: 11, color: '#FF3B30', fontWeight: '600', marginLeft: 5 },
  modalCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  modalBody: { fontSize: 14, lineHeight: 22, color: '#3A3A3C', marginBottom: 22 },
  modalAction: { backgroundColor: '#E8166D', borderRadius: 14, paddingVertical: 14 },
  modalActionText: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },

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