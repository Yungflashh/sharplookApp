import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, cartAPI, handleAPIError } from '@/api/api';

const { width } = Dimensions.get('window');

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;

interface Product {
  _id: string;
  name: string;
  description: string;
  shortDescription?: string;
  images: string[];
  price: number;
  finalPrice: number;
  compareAtPrice?: number;
  stock: number;
  rating: number;
  totalRatings: number;
  totalReviews: number;
  seller: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    vendorProfile?: {
      businessName: string;
      rating: number;
    };
  };
  category: {
    _id: string;
    name: string;
  };
  condition: string;
  brand?: string;
  isFeatured: boolean;
  isSponsored: boolean;
  variants?: Array<{
    name: string;
    options: string[];
    priceModifier?: number;
  }>;
  deliveryOptions: {
    homeDelivery?: boolean;
    pickup?: boolean;
    deliveryFee?: number;
    estimatedDeliveryDays?: number;
  };
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  weight?: number;
  sku?: string;
}

const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation<ProductDetailNavigationProp>();
  const route = useRoute<ProductDetailRouteProp>();
  const { productId } = route.params;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProductById(productId);

      if (response.success) {
        setProduct(response.data.product);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Validate variant selection
    if (product.variants && product.variants.length > 0) {
      const allSelected = product.variants.every((variant) => selectedVariants[variant.name]);

      if (!allSelected) {
        Alert.alert('Select Options', 'Please select all product options');
        return;
      }
    }

    // Check stock
    if (quantity > product.stock) {
      Alert.alert('Out of Stock', `Only ${product.stock} items available`);
      return;
    }

    try {
      setAddingToCart(true);

      const selectedVariant =
        product.variants && product.variants.length > 0
          ? {
              name: product.variants[0].name,
              option: selectedVariants[product.variants[0].name],
            }
          : undefined;

      await cartAPI.addToCart({
        product,
        quantity,
        selectedVariant,
      });

      Alert.alert('Success', 'Product added to cart', [
        { text: 'Continue Shopping', style: 'cancel' },
        {
          text: 'View Cart',
          onPress: () => navigation.navigate('Cart'),
        },
      ]);
    } catch (error) {
      console.error('Add to cart error:', error);
      Alert.alert('Error', 'Failed to add product to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigation.navigate('Cart');
  };

  const handleShare = async () => {
    if (!product) return;

    try {
      await Share.share({
        message: `Check out ${product.name} on SharpLook! ${product.finalPrice}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const calculateDiscount = (price: number, compareAt: number) => {
    if (!compareAt || compareAt <= price) return 0;
    return Math.round(((compareAt - price) / compareAt) * 100);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-500 text-sm mt-4">Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return null;
  }

  const discount = product.compareAtPrice
    ? calculateDiscount(product.finalPrice, product.compareAtPrice)
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>

        <View className="flex-row items-center" style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={handleShare}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="share-outline" size={20} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Cart')}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="cart-outline" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {product.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={{ width, height: width }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Image Indicators */}
          <View className="absolute bottom-4 left-0 right-0 flex-row justify-center" style={{ gap: 6 }}>
            {product.images.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full ${
                  index === selectedImageIndex ? 'bg-pink-500 w-6' : 'bg-white/60 w-2'
                }`}
              />
            ))}
          </View>

          {/* Badges */}
          <View className="absolute top-4 left-4 right-4 flex-row justify-between">
            {discount > 0 && (
              <View className="bg-red-500 px-3 py-1.5 rounded-xl">
                <Text className="text-white text-xs font-bold">-{discount}% OFF</Text>
              </View>
            )}
            {product.isSponsored && (
              <View className="bg-purple-500 px-3 py-1.5 rounded-xl ml-auto">
                <Text className="text-white text-xs font-bold">SPONSORED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Product Info */}
        <View className="px-5 py-6">
          {/* Brand/Category */}
          <View className="flex-row items-center mb-2">
            <Text className="text-gray-500 text-sm font-medium">
              {product.brand || product.category.name}
            </Text>
            {product.condition && (
              <>
                <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />
                <Text className="text-gray-500 text-sm capitalize">{product.condition}</Text>
              </>
            )}
          </View>

          {/* Name */}
          <Text className="text-gray-900 text-2xl font-bold mb-3">{product.name}</Text>

          {/* Rating & Reviews */}
          {product.totalRatings > 0 && (
            <TouchableOpacity
              onPress={() => {/* Navigate to reviews */}}
              className="flex-row items-center mb-4"
            >
              <View className="flex-row items-center mr-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(product.rating) ? 'star' : 'star-outline'}
                    size={16}
                    color="#fbbf24"
                  />
                ))}
              </View>
              <Text className="text-gray-700 text-sm font-semibold">
                {product.rating.toFixed(1)} ({product.totalRatings} ratings)
              </Text>
            </TouchableOpacity>
          )}

          {/* Price */}
          <View className="bg-pink-50 p-4 rounded-2xl mb-4">
            <View className="flex-row items-baseline">
              <Text className="text-pink-600 text-3xl font-bold">
                {formatPrice(product.finalPrice)}
              </Text>
              {product.compareAtPrice && product.compareAtPrice > product.finalPrice && (
                <Text className="text-gray-400 text-lg line-through ml-3">
                  {formatPrice(product.compareAtPrice)}
                </Text>
              )}
            </View>
            {discount > 0 && (
              <Text className="text-pink-600 text-sm font-semibold mt-1">
                You save {formatPrice(product.compareAtPrice! - product.finalPrice)}
              </Text>
            )}
          </View>

          {/* Stock Status */}
          <View className="flex-row items-center mb-6">
            <View
              className={`w-3 h-3 rounded-full mr-2 ${
                product.stock > 10 ? 'bg-green-500' : product.stock > 0 ? 'bg-orange-500' : 'bg-red-500'
              }`}
            />
            <Text
              className={`text-sm font-semibold ${
                product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-orange-600' : 'text-red-600'
              }`}
            >
              {product.stock === 0
                ? 'Out of Stock'
                : product.stock < 10
                ? `Only ${product.stock} left in stock`
                : 'In Stock'}
            </Text>
          </View>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <View className="mb-6">
              {product.variants.map((variant) => (
                <View key={variant.name} className="mb-4">
                  <Text className="text-gray-900 text-base font-bold mb-3">
                    Select {variant.name}:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {variant.options.map((option) => (
                      <TouchableOpacity
                        key={option}
                        onPress={() =>
                          setSelectedVariants({ ...selectedVariants, [variant.name]: option })
                        }
                        className={`px-5 py-3 rounded-xl border-2 ${
                          selectedVariants[variant.name] === option
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selectedVariants[variant.name] === option
                              ? 'text-pink-600'
                              : 'text-gray-700'
                          }`}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </View>
          )}

          {/* Quantity */}
          {product.stock > 0 && (
            <View className="mb-6">
              <Text className="text-gray-900 text-base font-bold mb-3">Quantity:</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl w-36">
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-12 h-12 items-center justify-center"
                >
                  <Ionicons name="remove" size={22} color={quantity <= 1 ? '#d1d5db' : '#000'} />
                </TouchableOpacity>

                <View className="flex-1 items-center">
                  <Text className="text-gray-900 text-lg font-bold">{quantity}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="w-12 h-12 items-center justify-center"
                >
                  <Ionicons
                    name="add"
                    size={22}
                    color={quantity >= product.stock ? '#d1d5db' : '#000'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Delivery Info */}
          <View className="bg-gray-50 p-4 rounded-2xl mb-6">
            <Text className="text-gray-900 text-base font-bold mb-3">Delivery Options:</Text>
            
            {product.deliveryOptions.homeDelivery && (
              <View className="flex-row items-start mb-2">
                <Ionicons name="home" size={18} color="#10b981" />
                <View className="flex-1 ml-3">
                  <Text className="text-gray-900 text-sm font-semibold">Home Delivery</Text>
                  <Text className="text-gray-500 text-xs">
                    {product.deliveryOptions.deliveryFee
                      ? formatPrice(product.deliveryOptions.deliveryFee)
                      : 'Free delivery'}
                    {product.deliveryOptions.estimatedDeliveryDays &&
                      ` • ${product.deliveryOptions.estimatedDeliveryDays} days`}
                  </Text>
                </View>
              </View>
            )}

            {product.deliveryOptions.pickup && (
              <View className="flex-row items-start">
                <Ionicons name="storefront" size={18} color="#3b82f6" />
                <View className="flex-1 ml-3">
                  <Text className="text-gray-900 text-sm font-semibold">Pickup Available</Text>
                  <Text className="text-gray-500 text-xs">Free pickup from seller's location</Text>
                </View>
              </View>
            )}
          </View>

          {/* Seller Info */}
          <TouchableOpacity
            onPress={() => navigation.navigate('VendorPublicProfile', { vendorId: product.seller._id })}
            className="bg-gray-50 p-4 rounded-2xl mb-6"
          >
            <Text className="text-gray-900 text-base font-bold mb-3">Sold by:</Text>
            <View className="flex-row items-center">
              {product.seller.avatar ? (
                <Image
                  source={{ uri: product.seller.avatar }}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <View className="w-12 h-12 rounded-full bg-pink-100 items-center justify-center">
                  <Ionicons name="person" size={24} color="#eb278d" />
                </View>
              )}
              <View className="flex-1 ml-3">
                <Text className="text-gray-900 text-sm font-bold">
                  {product.seller.vendorProfile?.businessName ||
                    `${product.seller.firstName} ${product.seller.lastName}`}
                </Text>
                {product.seller.vendorProfile?.rating && (
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="star" size={14} color="#fbbf24" />
                    <Text className="text-gray-600 text-xs ml-1">
                      {product.seller.vendorProfile.rating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-gray-900 text-base font-bold mb-3">Description:</Text>
            <Text className="text-gray-600 text-sm leading-6">{product.description}</Text>
          </View>

          {/* Specifications */}
          {(product.dimensions || product.weight || product.sku) && (
            <View className="mb-6">
              <Text className="text-gray-900 text-base font-bold mb-3">Specifications:</Text>
              <View className="bg-gray-50 p-4 rounded-2xl" style={{ gap: 12 }}>
                {product.sku && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600 text-sm">SKU</Text>
                    <Text className="text-gray-900 text-sm font-semibold">{product.sku}</Text>
                  </View>
                )}
                {product.weight && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600 text-sm">Weight</Text>
                    <Text className="text-gray-900 text-sm font-semibold">{product.weight} kg</Text>
                  </View>
                )}
                {product.dimensions && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600 text-sm">Dimensions</Text>
                    <Text className="text-gray-900 text-sm font-semibold">
                      {product.dimensions.length} × {product.dimensions.width} ×{' '}
                      {product.dimensions.height} {product.dimensions.unit || 'cm'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      {product.stock > 0 && (
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
          <View className="flex-row" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={handleAddToCart}
              disabled={addingToCart}
              className="flex-1 bg-white border-2 border-pink-500 py-4 rounded-2xl items-center"
              activeOpacity={0.8}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color="#eb278d" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons name="cart-outline" size={20} color="#eb278d" />
                  <Text className="text-pink-600 text-base font-bold ml-2">Add to Cart</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBuyNow}
              disabled={addingToCart}
              className="flex-1"
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#eb278d', '#f472b6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 rounded-2xl items-center"
              >
                <Text className="text-white text-base font-bold">Buy Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ProductDetailScreen;