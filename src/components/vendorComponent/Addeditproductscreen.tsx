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

const AddEditProductScreen: React.FC = () => {
  const navigation = useNavigation<AddEditProductNavigationProp>();
  const route = useRoute<AddEditProductRouteProp>();
  
  const isEdit = route.name === 'EditProduct';
  const productId = isEdit ? (route.params as any)?.productId : null;

  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [categories, setCategories] = useState<Category[]>([]);

  
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
  const [sku, setSku] = useState('');
  const [weight, setWeight] = useState('');
  
  const [homeDelivery, setHomeDelivery] = useState(true);
  const [pickup, setPickup] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('3');

  const [images, setImages] = useState<ProductImage[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories();
    if (isEdit && productId) {
      fetchProduct();
    }
  }, []);

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
        setSku(product.sku || '');
        setWeight(product.weight?.toString() || '');
        
        setHomeDelivery(product.deliveryOptions?.homeDelivery || false);
        setPickup(product.deliveryOptions?.pickup || false);
        setDeliveryFee(product.deliveryOptions?.deliveryFee?.toString() || '');
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
      Alert.alert('Invalid', 'Please enter a valid price');
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
        sku: sku.trim() || undefined,
        weight: weight ? parseFloat(weight) : undefined,
        deliveryOptions: {
          homeDelivery,
          pickup,
          deliveryFee: deliveryFee ? parseFloat(deliveryFee) : undefined,
          estimatedDeliveryDays: parseInt(estimatedDeliveryDays),
        },
      };

      console.log('📦 Starting save process...');
      console.log('📦 Product Data:', JSON.stringify(productData, null, 2));
      console.log('🖼️ New images:', images.length);
      console.log('🖼️ Existing images:', existingImages.length);

      const token = await AsyncStorage.getItem('accessToken');
      const API_BASE_URL = 'https://sharplook-be.onrender.com/api/v1';

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
      
      if (productData.sku) {
        formData.append('sku', productData.sku);
      }
      
      if (productData.weight) {
        formData.append('weight', String(productData.weight));
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
      {}
      <LinearGradient
        colors={['#eb278d', '#f472b6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pb-4"
      >
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3"
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold">
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        {}
        <View className="mb-6">
          <Text className="text-gray-900 text-lg font-bold mb-3">Product Images *</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            {}
            {existingImages.map((uri, index) => (
              <View key={`existing-${index}`} className="mr-3 relative">
                <Image
                  source={{ uri }}
                  className="w-24 h-24 rounded-xl"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => removeExistingImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 items-center justify-center"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {}
            {images.map((image, index) => (
              <View key={`new-${index}`} className="mr-3 relative">
                <Image
                  source={{ uri: image.uri }}
                  className="w-24 h-24 rounded-xl"
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 items-center justify-center"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {}
            {(images.length + existingImages.length) < 10 && (
              <TouchableOpacity
                onPress={pickImages}
                className="w-24 h-24 rounded-xl bg-gray-100 items-center justify-center border-2 border-dashed border-gray-300"
              >
                <Ionicons name="camera" size={32} color="#9ca3af" />
                <Text className="text-gray-400 text-xs mt-1">Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <Text className="text-gray-500 text-xs">
            Add up to 10 images. First image will be the main photo.
          </Text>
        </View>

        {}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-gray-900 text-base font-bold mb-4">Basic Information</Text>

          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-semibold mb-2">Product Name *</Text>
            <TextInput
              className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
              placeholder="e.g., Luxury Hair Growth Serum"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-semibold mb-2">Short Description</Text>
            <TextInput
              className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
              placeholder="Brief one-line description"
              value={shortDescription}
              onChangeText={setShortDescription}
              maxLength={100}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-semibold mb-2">Description *</Text>
            <TextInput
              className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
              placeholder="Detailed product description..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-semibold mb-2">Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category._id}
                  onPress={() => setSelectedCategory(category._id)}
                  className={`px-4 py-3 rounded-xl mr-2 ${
                    selectedCategory === category._id
                      ? 'bg-pink-500'
                      : 'bg-gray-100'
                  }`}
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

          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-semibold mb-2">Brand</Text>
            <TextInput
              className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
              placeholder="e.g., Nike, Apple, etc."
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-semibold mb-2">Condition *</Text>
            <View className="flex-row" style={{ gap: 8 }}>
              {['new', 'refurbished', 'used'].map((cond) => (
                <TouchableOpacity
                  key={cond}
                  onPress={() => setCondition(cond as any)}
                  className={`flex-1 py-3 rounded-xl ${
                    condition === cond ? 'bg-pink-500' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-center text-sm font-semibold capitalize ${
                      condition === cond ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {cond}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-semibold mb-2">SKU</Text>
            <TextInput
              className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
              placeholder="Product SKU (optional)"
              value={sku}
              onChangeText={setSku}
            />
          </View>

          <View>
            <Text className="text-gray-700 text-sm font-semibold mb-2">Weight (kg)</Text>
            <TextInput
              className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
              placeholder="e.g., 0.5"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-gray-900 text-base font-bold mb-4">Pricing & Stock</Text>

          <View className="flex-row mb-4" style={{ gap: 12 }}>
            <View className="flex-1">
              <Text className="text-gray-700 text-sm font-semibold mb-2">Price (₦) *</Text>
              <TextInput
                className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                placeholder="0.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <View className="flex-1">
              <Text className="text-gray-700 text-sm font-semibold mb-2">Compare Price (₦)</Text>
              <TextInput
                className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                placeholder="0.00"
                value={compareAtPrice}
                onChangeText={setCompareAtPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <Text className="text-gray-700 text-sm font-semibold mb-2">Stock Quantity *</Text>
              <TextInput
                className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                placeholder="0"
                value={stock}
                onChangeText={setStock}
                keyboardType="number-pad"
              />
            </View>

            <View className="flex-1">
              <Text className="text-gray-700 text-sm font-semibold mb-2">Low Stock Alert</Text>
              <TextInput
                className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                placeholder="10"
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <Text className="text-gray-900 text-base font-bold mb-4">Delivery Options *</Text>

          <TouchableOpacity
            onPress={() => setHomeDelivery(!homeDelivery)}
            className="flex-row items-center justify-between mb-4 p-3 bg-gray-50 rounded-xl"
          >
            <View className="flex-row items-center">
              <Ionicons name="home" size={24} color="#eb278d" />
              <Text className="text-gray-900 text-sm font-semibold ml-3">Home Delivery</Text>
            </View>
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                homeDelivery ? 'border-pink-500 bg-pink-500' : 'border-gray-300'
              }`}
            >
              {homeDelivery && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>

          {homeDelivery && (
            <View className="ml-9 mb-4">
              <View className="flex-row" style={{ gap: 12 }}>
                <View className="flex-1">
                  <Text className="text-gray-700 text-sm font-semibold mb-2">Delivery Fee (₦)</Text>
                  <TextInput
                    className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                    placeholder="0.00"
                    value={deliveryFee}
                    onChangeText={setDeliveryFee}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-gray-700 text-sm font-semibold mb-2">Est. Days</Text>
                  <TextInput
                    className="bg-gray-50 px-4 py-3 rounded-xl text-gray-900"
                    placeholder="3"
                    value={estimatedDeliveryDays}
                    onChangeText={setEstimatedDeliveryDays}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setPickup(!pickup)}
            className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl"
          >
            <View className="flex-row items-center">
              <Ionicons name="storefront" size={24} color="#eb278d" />
              <Text className="text-gray-900 text-sm font-semibold ml-3">Pickup Available</Text>
            </View>
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                pickup ? 'border-pink-500 bg-pink-500' : 'border-gray-300'
              }`}
            >
              {pickup && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
        </View>

        <View className="h-24" />
      </ScrollView>

      {}
      <View
        className="bg-white px-5 py-4 border-t border-gray-100"
        style={{
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
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
            className="py-4 rounded-2xl items-center"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-lg font-bold">
                {isEdit ? 'Update Product' : 'Create Product'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddEditProductScreen;