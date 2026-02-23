import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
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

const FIELD_INFO: { [key: string]: FieldInfo } = {
  images: {
    title: 'Product Images',
    description: 'Add clear, high-quality photos of your product. First image will be the main display photo. You can add up to 10 images.',
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
    description: 'The actual price customers will pay when they purchase this product. Enter the amount in Naira (₦).',
    required: true,
  },
  originalPrice: {
    title: 'Original Price',
    description: 'The original or market price before discount. This will show customers how much they\'re saving. Leave empty if no discount.',
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

  useEffect(() => {
    fetchCategories();
    if (isEdit && productId) {
      fetchProduct();
    }
  }, []);

  const showFieldInfo = (fieldKey: string) => {
    setActiveFieldInfo(FIELD_INFO[fieldKey]);
    setShowInfoModal(true);
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getActiveCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoadingProduct(true);
      const response = await productAPI.getProductById(productId, false);
      
      if (response.success) {
        const product = response.data.product;
        
        setName(product.name);
        setDescription(product.description);
        setShortDescription(product.shortDescription || '');
        setSelectedCategory(product.category._id);
        setPrice(product.price.toString());
        setCompareAtPrice(product.compareAtPrice?.toString() || '');
        setStock(product.stock.toString());
        setLowStockThreshold(product.lowStockThreshold?.toString() || '10');
        setCondition(product.condition);
        setBrand(product.brand || '');
        
        setHomeDelivery(product.deliveryOptions?.homeDelivery || false);
        setPickup(product.deliveryOptions?.pickup || false);
        setEstimatedDeliveryDays(product.deliveryOptions?.estimatedDeliveryDays?.toString() || '3');
        
        setExistingImages(product.images || []);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
      navigation.goBack();
    } finally {
      setLoadingProduct(false);
    }
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access photos');
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
            const extension = asset.uri.split('.').pop()?.toLowerCase();
            if (extension === 'png') {
              mimeType = 'image/png';
            } else if (extension === 'jpg' || extension === 'jpeg') {
              mimeType = 'image/jpeg';
            } else if (extension === 'gif') {
              mimeType = 'image/gif';
            } else if (extension === 'webp') {
              mimeType = 'image/webp';
            }
          }

          return {
            uri: asset.uri,
            type: mimeType,
            name: asset.fileName || `product_${Date.now()}_${index}.jpg`,
          };
        });
        
        console.log('📸 New images picked:', newImages);
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  const removeExistingImage = (index: number) => {
    Alert.alert(
      'Remove Image',
      'This will remove the image from the product',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = [...existingImages];
            updated.splice(index, 1);
            setExistingImages(updated);
          },
        },
      ]
    );
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter product name');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter product description');
      return false;
    }
    if (!selectedCategory) {
      Alert.alert('Required', 'Please select a category');
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Invalid', 'Please enter a valid selling price');
      return false;
    }
    if (!stock || parseInt(stock) < 0) {
      Alert.alert('Invalid', 'Please enter a valid stock quantity');
      return false;
    }
    if (!isEdit && images.length === 0) {
      Alert.alert('Required', 'Please add at least one product image');
      return false;
    }
    if (!homeDelivery && !pickup) {
      Alert.alert('Required', 'Please select at least one delivery option');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const productData = {
        name: name.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim() || undefined,
        category: selectedCategory,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
        stock: parseInt(stock),
        lowStockThreshold: parseInt(lowStockThreshold),
        condition,
        brand: brand.trim() || undefined,
        deliveryOptions: {
          homeDelivery,
          pickup,
          estimatedDeliveryDays: parseInt(estimatedDeliveryDays),
        },
      };

      console.log('📦 Starting save process...');
      console.log('📦 Product Data:', JSON.stringify(productData, null, 2));
      console.log('🖼️ New images:', images.length);
      console.log('🖼️ Existing images:', existingImages.length);

      const token = await AsyncStorage.getItem('accessToken');
      const API_BASE_URL = 'https://sharplook-backend-production.onrender.com/api/v1';

      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      console.log('🔑 Token present:', token ? 'Yes' : 'No');
      console.log('🌐 API URL:', API_BASE_URL);

      const formData = new FormData();

      console.log('📝 Adding text fields to FormData...');
      formData.append('name', productData.name);
      formData.append('description', productData.description);
      
      if (productData.shortDescription) {
        formData.append('shortDescription', productData.shortDescription);
      }
      
      formData.append('category', productData.category);
      formData.append('price', String(productData.price));
      
      if (productData.compareAtPrice) {
        formData.append('compareAtPrice', String(productData.compareAtPrice));
      }
      
      formData.append('stock', String(productData.stock));
      formData.append('lowStockThreshold', String(productData.lowStockThreshold));
      formData.append('condition', productData.condition);
      
      if (productData.brand) {
        formData.append('brand', productData.brand);
      }

      formData.append('deliveryOptions', JSON.stringify(productData.deliveryOptions));

      console.log('✅ Text fields added');

      if (isEdit && existingImages.length > 0) {
        console.log('📋 Adding existing images list...');
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      if (images.length > 0) {
        console.log('🖼️ Adding new images...');
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          console.log(`📸 Processing image ${i + 1}/${images.length}`);
          console.log(`  URI: ${image.uri}`);
          console.log(`  Type: ${image.type}`);
          console.log(`  Name: ${image.name}`);

          let imageUri = image.uri;
          if (Platform.OS === 'ios' && imageUri.startsWith('file://')) {
            imageUri = imageUri.replace('file://', '');
          }

          const imageData: any = {
            uri: imageUri,
            type: image.type || 'image/jpeg',
            name: image.name || `product_${Date.now()}_${i}.jpg`,
          };

          formData.append('images', imageData);
          console.log(`✅ Image ${i + 1} added`);
        }
      }

      console.log('✅ All data added to FormData');

      const endpoint = isEdit 
        ? `${API_BASE_URL}/products/${productId}` 
        : `${API_BASE_URL}/products`;
      const method = isEdit ? 'PUT' : 'POST';

      console.log(`🚀 Sending ${method} request to:`, endpoint);

      const fetchResponse = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      console.log('📥 Response received');
      console.log('📥 Status:', fetchResponse.status);
      console.log('📥 Status Text:', fetchResponse.statusText);

      let result;
      const responseText = await fetchResponse.text();
      console.log('📥 Raw response:', responseText);

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error(`Server returned invalid JSON. Status: ${fetchResponse.status}`);
      }

      console.log('📥 Parsed response:', result);

      if (!fetchResponse.ok) {
        console.error('❌ Request failed');
        console.error('Error details:', result);
        throw new Error(result.message || `Request failed with status ${fetchResponse.status}`);
      }

      if (result.success) {
        console.log('✅ Success!');
        Alert.alert(
          'Success',
          isEdit 
            ? 'Product updated successfully' 
            : 'Product created successfully. It will be visible after admin approval.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error(result.message || 'Operation failed');
      }

    } catch (error: any) {
      console.error('❌❌❌ ERROR CAUGHT ❌❌❌');
      console.error('Error type:', typeof error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Full error:', error);

      let errorMessage = 'Failed to save product';

      if (error?.message?.includes('Network request failed')) {
        errorMessage = 
          '❌ Network Error\n\n' +
          'Possible causes:\n' +
          '1. Backend server is not running\n' +
          '2. Wrong API URL\n' +
          '3. No internet connection\n' +
          '4. Image files too large\n' +
          '5. CORS issue\n\n' +
          'Check console logs for details.';
      } else if (error?.message?.includes('timeout')) {
        errorMessage = 'Request timeout. The server took too long to respond. Try again.';
      } else if (error?.message?.includes('JSON')) {
        errorMessage = 'Server returned invalid response. Check backend logs.';
      } else if (error?.message?.includes('token')) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProduct) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4">Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-center items-center px-6"
          activeOpacity={1}
          onPress={() => setShowInfoModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-md"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 16,
            }}
          >
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                  <Ionicons name="information" size={22} color="#eb278d" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 text-lg font-bold">
                    {activeFieldInfo?.title}
                  </Text>
                  {activeFieldInfo?.required && (
                    <View className="flex-row items-center mt-1">
                      <View className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                      <Text className="text-red-500 text-xs font-semibold">Required Field</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowInfoModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center ml-2"
              >
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 text-[15px] leading-6 mb-6">
              {activeFieldInfo?.description}
            </Text>

            <TouchableOpacity
              onPress={() => setShowInfoModal(false)}
              className="bg-pink-500 py-3.5 rounded-xl"
            >
              <Text className="text-white text-center font-semibold text-base">Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Header */}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pb-6"
      >
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-11 h-11 rounded-full bg-white/20 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View className="flex-1 mx-4">
              <Text className="text-white text-2xl font-bold">
                {isEdit ? 'Edit Product' : 'Add Product'}
              </Text>
              <Text className="text-white/80 text-sm mt-0.5">
                {isEdit ? 'Update your product details' : 'Create a new product listing'}
              </Text>
            </View>
          </View>

          {/* Progress Indicator */}
          <View className="bg-white/20 rounded-full h-1.5 overflow-hidden">
            <View 
              className="bg-white h-full rounded-full"
              style={{ 
                width: `${
                  ((images.length > 0 ? 1 : 0) + 
                  (name ? 1 : 0) + 
                  (description ? 1 : 0) + 
                  (selectedCategory ? 1 : 0) + 
                  (price ? 1 : 0) + 
                  (stock ? 1 : 0)) / 6 * 100
                }%` 
              }}
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Images Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-pink-100 items-center justify-center mr-2.5">
                <Ionicons name="images" size={16} color="#eb278d" />
              </View>
              <Text className="text-gray-900 text-lg font-bold">Product Images</Text>
              <View className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5" />
            </View>
            <TouchableOpacity
              onPress={() => showFieldInfo('images')}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {/* Existing Images */}
            {existingImages.map((uri, index) => (
              <View 
                key={`existing-${index}`} 
                className="mr-3 relative"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Image
                  source={{ uri }}
                  className="w-28 h-28 rounded-2xl"
                  resizeMode="cover"
                />
                {index === 0 && (
                  <View className="absolute top-2 left-2 bg-pink-500 px-2 py-1 rounded-lg">
                    <Text className="text-white text-xs font-bold">Main</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => removeExistingImage(index)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 items-center justify-center border-2 border-white"
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {/* New Images */}
            {images.map((image, index) => (
              <View 
                key={`new-${index}`} 
                className="mr-3 relative"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Image
                  source={{ uri: image.uri }}
                  className="w-28 h-28 rounded-2xl"
                  resizeMode="cover"
                />
                {existingImages.length === 0 && index === 0 && (
                  <View className="absolute top-2 left-2 bg-pink-500 px-2 py-1 rounded-lg">
                    <Text className="text-white text-xs font-bold">Main</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 items-center justify-center border-2 border-white"
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Image Button */}
            {(images.length + existingImages.length) < 10 && (
              <TouchableOpacity
                onPress={pickImages}
                className="w-28 h-28 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 items-center justify-center"
                activeOpacity={0.7}
              >
                <View className="w-12 h-12 rounded-full bg-pink-100 items-center justify-center mb-2">
                  <Ionicons name="camera" size={22} color="#eb278d" />
                </View>
                <Text className="text-gray-500 text-xs font-semibold">Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Text className="text-gray-500 text-xs mt-3 px-1">
            {images.length + existingImages.length}/10 images • First image is the main display photo
          </Text>
        </View>

        {/* Basic Information Card */}
        <View 
          className="bg-white rounded-3xl p-5 mb-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-5">
            <View className="w-8 h-8 rounded-full bg-pink-100 items-center justify-center mr-2.5">
              <Ionicons name="information-circle" size={16} color="#eb278d" />
            </View>
            <Text className="text-gray-900 text-lg font-bold">Basic Information</Text>
          </View>

          {/* Product Name */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center">
                <Text className="text-gray-700 text-sm font-semibold">Product Name</Text>
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5" />
              </View>
              <TouchableOpacity
                onPress={() => showFieldInfo('name')}
                className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              className="bg-gray-50 px-4 py-3.5 rounded-xl text-gray-900 text-base"
              placeholder="e.g., Premium Wireless Headphones"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Short Description */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-gray-700 text-sm font-semibold">Short Description</Text>
              <TouchableOpacity
                onPress={() => showFieldInfo('shortDescription')}
                className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              className="bg-gray-50 px-4 py-3.5 rounded-xl text-gray-900 text-base"
              placeholder="Brief one-line summary"
              placeholderTextColor="#9ca3af"
              value={shortDescription}
              onChangeText={setShortDescription}
              maxLength={100}
            />
            <Text className="text-gray-400 text-xs mt-1.5 px-1">
              {shortDescription.length}/100 characters
            </Text>
          </View>

          {/* Full Description */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center">
                <Text className="text-gray-700 text-sm font-semibold">Full Description</Text>
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5" />
              </View>
              <TouchableOpacity
                onPress={() => showFieldInfo('description')}
                className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              className="bg-gray-50 px-4 py-3.5 rounded-xl text-gray-900 text-base"
              placeholder="Provide detailed information about features, specifications, benefits..."
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{ minHeight: 120 }}
            />
          </View>

          {/* Category */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center">
                <Text className="text-gray-700 text-sm font-semibold">Category</Text>
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5" />
              </View>
              <TouchableOpacity
                onPress={() => showFieldInfo('category')}
                className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category._id}
                  onPress={() => setSelectedCategory(category._id)}
                  className={`px-5 py-3 rounded-xl mr-2.5 ${
                    selectedCategory === category._id
                      ? 'bg-pink-500'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selectedCategory === category._id ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Brand */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-gray-700 text-sm font-semibold">Brand</Text>
              <TouchableOpacity
                onPress={() => showFieldInfo('brand')}
                className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              className="bg-gray-50 px-4 py-3.5 rounded-xl text-gray-900 text-base"
              placeholder="e.g., Nike, Apple, Samsung"
              placeholderTextColor="#9ca3af"
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          {/* Condition */}
          <View>
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center">
                <Text className="text-gray-700 text-sm font-semibold">Condition</Text>
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5" />
              </View>
              <TouchableOpacity
                onPress={() => showFieldInfo('condition')}
                className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View className="flex-row gap-2.5">
              {[
                { value: 'new', label: 'New', icon: 'sparkles' },
                { value: 'refurbished', label: 'Refurbished', icon: 'construct' },
                { value: 'used', label: 'Used', icon: 'time' },
              ].map((cond) => (
                <TouchableOpacity
                  key={cond.value}
                  onPress={() => setCondition(cond.value as any)}
                  className={`flex-1 py-3.5 rounded-xl border ${
                    condition === cond.value 
                      ? 'bg-pink-500 border-pink-500' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="items-center">
                    <Ionicons 
                      name={cond.icon as any} 
                      size={18} 
                      color={condition === cond.value ? '#fff' : '#6b7280'} 
                    />
                    <Text
                      className={`text-sm font-semibold mt-1 ${
                        condition === cond.value ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {cond.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Pricing & Stock Card */}
        <View 
          className="bg-white rounded-3xl p-5 mb-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-5">
            <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-2.5">
              <Ionicons name="cash" size={16} color="#10b981" />
            </View>
            <Text className="text-gray-900 text-lg font-bold">Pricing & Stock</Text>
          </View>

          {/* Selling Price */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center">
                <Text className="text-gray-700 text-sm font-semibold">Selling Price (₦)</Text>
                <View className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5" />
              </View>
              <TouchableOpacity
                onPress={() => showFieldInfo('sellingPrice')}
                className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center bg-gray-50 rounded-xl overflow-hidden">
              <View className="bg-gray-100 px-4 py-3.5">
                <Text className="text-gray-600 font-semibold">₦</Text>
              </View>
              <TextInput
                className="flex-1 px-4 py-3.5 text-gray-900 text-base font-semibold"
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Original Price */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-gray-700 text-sm font-semibold">Original Price (₦)</Text>
              <TouchableOpacity
                onPress={() => showFieldInfo('originalPrice')}
                className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center bg-gray-50 rounded-xl overflow-hidden">
              <View className="bg-gray-100 px-4 py-3.5">
                <Text className="text-gray-600 font-semibold">₦</Text>
              </View>
              <TextInput
                className="flex-1 px-4 py-3.5 text-gray-900 text-base"
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={compareAtPrice}
                onChangeText={setCompareAtPrice}
                keyboardType="decimal-pad"
              />
            </View>
            {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price || '0') && (
              <View className="flex-row items-center mt-2 px-1">
                <Ionicons name="trending-down" size={14} color="#10b981" />
                <Text className="text-green-600 text-xs font-semibold ml-1">
                  {Math.round(((parseFloat(compareAtPrice) - parseFloat(price)) / parseFloat(compareAtPrice)) * 100)}% discount
                </Text>
              </View>
            )}
          </View>

          {/* Stock Row */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-2.5">
                <View className="flex-row items-center">
                  <Text className="text-gray-700 text-sm font-semibold">Stock</Text>
                  <View className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5" />
                </View>
                <TouchableOpacity
                  onPress={() => showFieldInfo('stock')}
                  className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <TextInput
                className="bg-gray-50 px-4 py-3.5 rounded-xl text-gray-900 text-base font-semibold"
                placeholder="0"
                placeholderTextColor="#9ca3af"
                value={stock}
                onChangeText={setStock}
                keyboardType="number-pad"
              />
            </View>

            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-gray-700 text-sm font-semibold">Low Alert</Text>
                <TouchableOpacity
                  onPress={() => showFieldInfo('lowStock')}
                  className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <TextInput
                className="bg-gray-50 px-4 py-3.5 rounded-xl text-gray-900 text-base"
                placeholder="10"
                placeholderTextColor="#9ca3af"
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Delivery Options Card */}
        <View 
          className="bg-white rounded-3xl p-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-5">
            <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-2.5">
              <Ionicons name="car" size={16} color="#3b82f6" />
            </View>
            <Text className="text-gray-900 text-lg font-bold">Delivery Options</Text>
          </View>

          {/* Home Delivery */}
          <TouchableOpacity
            onPress={() => setHomeDelivery(!homeDelivery)}
            className="mb-4"
            activeOpacity={0.7}
          >
            <View className="flex-row items-start justify-between p-4 bg-gray-50 rounded-2xl">
              <View className="flex-row items-start flex-1">
                <View className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
                  homeDelivery ? 'bg-pink-100' : 'bg-gray-200'
                }`}>
                  <Ionicons 
                    name="home" 
                    size={22} 
                    color={homeDelivery ? '#eb278d' : '#9ca3af'} 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 text-base font-semibold mb-1">
                    Home Delivery
                  </Text>
                  <Text className="text-gray-500 text-xs leading-5">
                    Deliver to customer's address. Fee calculated by distance.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => showFieldInfo('homeDelivery')}
                className="w-7 h-7 rounded-full bg-white items-center justify-center ml-2"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
              <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ml-3 ${
                  homeDelivery ? 'border-pink-500 bg-pink-500' : 'border-gray-300 bg-white'
                }`}
              >
                {homeDelivery && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </View>
          </TouchableOpacity>

          {homeDelivery && (
            <View className="ml-14 mb-4 pr-4">
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-gray-700 text-sm font-semibold">
                  Estimated Delivery Time
                </Text>
                <TouchableOpacity
                  onPress={() => showFieldInfo('deliveryDays')}
                  className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center bg-gray-50 rounded-xl overflow-hidden">
                <TextInput
                  className="flex-1 px-4 py-3.5 text-gray-900 text-base"
                  placeholder="3"
                  placeholderTextColor="#9ca3af"
                  value={estimatedDeliveryDays}
                  onChangeText={setEstimatedDeliveryDays}
                  keyboardType="number-pad"
                />
                <View className="bg-gray-100 px-4 py-3.5">
                  <Text className="text-gray-600 font-medium">days</Text>
                </View>
              </View>
            </View>
          )}

          {/* Pickup Option */}
          <TouchableOpacity
            onPress={() => setPickup(!pickup)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-start justify-between p-4 bg-gray-50 rounded-2xl">
              <View className="flex-row items-start flex-1">
                <View className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
                  pickup ? 'bg-pink-100' : 'bg-gray-200'
                }`}>
                  <Ionicons 
                    name="storefront" 
                    size={22} 
                    color={pickup ? '#eb278d' : '#9ca3af'} 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 text-base font-semibold mb-1">
                    Pickup Available
                  </Text>
                  <Text className="text-gray-500 text-xs leading-5">
                    Customers can collect from your location. No delivery fee.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => showFieldInfo('pickup')}
                className="w-7 h-7 rounded-full bg-white items-center justify-center ml-2"
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
              <View
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ml-3 ${
                  pickup ? 'border-pink-500 bg-pink-500' : 'border-gray-300 bg-white'
                }`}
              >
                {pickup && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white px-5 pt-4 pb-6 border-t border-gray-100"
        style={{
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
            },
            android: { elevation: 12 },
          }),
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#eb278d', '#f472b6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="py-4 rounded-2xl"
            style={{
              shadowColor: '#eb278d',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {loading ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white text-base font-bold ml-2">
                  {isEdit ? 'Updating...' : 'Creating...'}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center justify-center">
                <Ionicons 
                  name={isEdit ? 'checkmark-circle' : 'add-circle'} 
                  size={22} 
                  color="#fff" 
                />
                <Text className="text-white text-base font-bold ml-2">
                  {isEdit ? 'Update Product' : 'Create Product'}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddEditProductScreen;