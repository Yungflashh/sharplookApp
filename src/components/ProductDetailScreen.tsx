import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
  Share,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, cartAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

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
  totalOrders?: number;
  totalViews?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalDate?: string;
  createdAt?: string;
  seller: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    vendorProfile?: { businessName: string; rating: number };
  };
  category: { _id: string; name: string };
  condition: string;
  brand?: string;
  isFeatured: boolean;
  isSponsored: boolean;
  variants?: Array<{ name: string; options: string[]; priceModifier?: number }>;
  deliveryOptions: {
    homeDelivery?: boolean;
    pickup?: boolean;
    deliveryFee?: number;
    estimatedDeliveryDays?: number;
  };
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  weight?: number;
  sku?: string;
}

const APPROVAL_CFG = {
  approved: { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle' as const, iconColor: '#10B981', label: 'Approved' },
  pending:  { bg: '#FEF3C7', text: '#92400E', icon: 'time-outline'     as const, iconColor: '#F59E0B', label: 'Under Review' },
  rejected: { bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle'     as const, iconColor: '#EF4444', label: 'Rejected' },
};

const formatPrice = (n: number) => `₦${n.toLocaleString()}`;

const formatDate = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation<ProductDetailNavigationProp>();
  const route = useRoute<ProductDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => { fetchProduct(); }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProductById(productId);
      if (response.success) setProduct(response.data.product);
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product || addingRef.current) return;
    if (product.variants && product.variants.length > 0) {
      const allSelected = product.variants.every((variant) => selectedVariants[variant.name]);

      if (!allSelected) {
        toast.error('Select Options', 'Please select all product options');
        return;
      }
    }
    if (quantity > product.stock) {
      toast.error('Out of Stock', `Only ${product.stock} items available`);
      return;
    }
    addingRef.current = true;
    try {
      setAddingToCart(true);
      const selectedVariant = product.variants?.length
        ? { name: product.variants[0].name, option: selectedVariants[product.variants[0].name] }
        : undefined;
      await cartAPI.addToCart({ product, quantity, selectedVariant });
      setConfirmModal({
        visible: true,
        title: 'Added to Cart',
        message: `${product.name} has been added to your cart.`,
        onConfirm: () => navigation.navigate('Cart'),
      });

      setConfirmModal({
        visible: true,
        title: 'Success',
        message: 'Product added to cart',
        onConfirm: () => navigation.navigate('Cart'),
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Error', 'Failed to add product to cart');
    } finally {
      setAddingToCart(false);
      addingRef.current = false;
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
        message: `Check out ${product.name} on LookReal!\nhttps://lookreal.beauty/share/product/${product._id}`,
        url: `https://lookreal.beauty/share/product/${product._id}`,
        title: product.name,
      });
    } catch {}
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#E8166D" />
        <Text style={styles.loadingText}>Loading product…</Text>
      </SafeAreaView>
    );
  }

  if (!product) return null;

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.finalPrice) / product.compareAtPrice) * 100)
    : 0;
  const approvalCfg = product.approvalStatus ? APPROVAL_CFG[product.approvalStatus] : null;
  const totalImages = product.images?.length || 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      {}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.navRight}>
          <TouchableOpacity onPress={handleShare} activeOpacity={0.85} style={styles.navBtn}>
            <Ionicons name="share-outline" size={20} color="#1C1C1E" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} activeOpacity={0.85} style={styles.navBtn}>
            <Ionicons name="cart-outline" size={20} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* ── Image Carousel ──────────────────────────────────────────── */}
        <View style={styles.carouselWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => setSelectedImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={16}
          >
            {product.images.map((image, index) => (
              <Image key={index} source={{ uri: image }} style={styles.carouselImage} resizeMode="cover" />
            ))}
          </ScrollView>

          {/* Counter badge */}
          {totalImages > 1 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{selectedImageIndex + 1}/{totalImages}</Text>
            </View>
          )}

          {/* Approval badge */}
          {approvalCfg && (
            <View style={[styles.approvalBadge, { backgroundColor: approvalCfg.bg }]}>
              <Ionicons name={approvalCfg.icon} size={12} color={approvalCfg.iconColor} />
              <Text style={[styles.approvalBadgeText, { color: approvalCfg.text }]}>{approvalCfg.label}</Text>
            </View>
          )}

          {/* Discount badge */}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}

          {/* Dot indicators */}
          {totalImages > 1 && (
            <View style={styles.dotsRow}>
              {product.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === selectedImageIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── Product Info ─────────────────────────────────────────────── */}
        <View style={styles.infoCard}>

          {/* Category + condition */}
          <Text style={styles.categoryText}>
            {product.category?.name}
            {product.condition ? ` · ${product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}` : ''}
          </Text>

          {/* Name */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* Rating */}
          {product.totalRatings > 0 && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(product.rating) ? 'star' : 'star-outline'}
                  size={14}
                  color="#F59E0B"
                />
              ))}
              <Text style={styles.ratingText}>{product.rating.toFixed(1)} ({product.totalRatings})</Text>
            </View>
          )}

          {/* Price row */}
          <View style={styles.priceRow}>
            <Text style={styles.priceMain}>{formatPrice(product.finalPrice)}</Text>
            {product.compareAtPrice && product.compareAtPrice > product.finalPrice && (
              <Text style={styles.priceStrike}>{formatPrice(product.compareAtPrice)}</Text>
            )}
          </View>

          {/* Seller Info */}
          <TouchableOpacity
            onPress={() => navigation.navigate('VendorDetail', { vendorId: product.seller._id })}
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
            </View>
          )}
        </View>

        {/* ── Product Status Card ──────────────────────────────────────── */}
        {approvalCfg && (
          <View style={styles.statusCard}>
            <View style={styles.statusCardHeader}>
              <View style={[styles.statusIconWrap, { backgroundColor: approvalCfg.bg }]}>
                <Ionicons name={approvalCfg.icon} size={18} color={approvalCfg.iconColor} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.statusCardTitle}>Product Status</Text>
                <Text style={[styles.statusCardStatus, { color: approvalCfg.text }]}>{approvalCfg.label}</Text>
              </View>
              {(product.approvalDate || product.createdAt) && (
                <Text style={styles.statusCardDate}>
                  {formatDate(product.approvalDate || product.createdAt)}
                </Text>
              )}
            </View>
            {product.approvalStatus === 'pending' && (
              <Text style={styles.statusCardNote}>Your product is under review. We'll notify you once approved.</Text>
            )}
            {product.approvalStatus === 'rejected' && (
              <Text style={styles.statusCardNote}>Your product was rejected. Please edit and resubmit.</Text>
            )}
          </View>
        )}

        {/* ── Variants ─────────────────────────────────────────────────── */}
        {product.variants && product.variants.length > 0 && (
          <View style={styles.sectionCard}>
            {product.variants.map((variant) => (
              <View key={variant.name} style={{ marginBottom: 16 }}>
                <Text style={styles.sectionCardTitle}>Select {variant.name}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
                  {variant.options.map((option) => {
                    const active = selectedVariants[variant.name] === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setSelectedVariants({ ...selectedVariants, [variant.name]: option })}
                        style={[styles.variantChip, active && styles.variantChipActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.variantChipText, active && styles.variantChipTextActive]}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </View>
        )}

        {/* ── Quantity ─────────────────────────────────────────────────── */}
        {product.stock > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} style={styles.qtyBtn}>
                <Ionicons name="remove" size={20} color={quantity <= 1 ? '#D1D5DB' : '#1C1C1E'} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(Math.min(product.stock, quantity + 1))} disabled={quantity >= product.stock} style={styles.qtyBtn}>
                <Ionicons name="add" size={20} color={quantity >= product.stock ? '#D1D5DB' : '#1C1C1E'} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Delivery Options ─────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Delivery Options</Text>
          {product.deliveryOptions.homeDelivery && (
            <View style={styles.deliveryRow}>
              <View style={styles.deliveryIcon}>
                <Ionicons name="home-outline" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.deliveryTitle}>Home Delivery</Text>
                <Text style={styles.deliverySub}>
                  {product.deliveryOptions.deliveryFee ? formatPrice(product.deliveryOptions.deliveryFee) : 'Free delivery'}
                  {product.deliveryOptions.estimatedDeliveryDays ? ` · ${product.deliveryOptions.estimatedDeliveryDays} days` : ''}
                </Text>
              </View>
            </View>
          )}
          {product.deliveryOptions.pickup && (
            <View style={[styles.deliveryRow, { marginBottom: 0 }]}>
              <View style={[styles.deliveryIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="storefront-outline" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.deliveryTitle}>Pickup Available</Text>
                <Text style={styles.deliverySub}>Free pickup from seller's location</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Description ──────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Description</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </View>

        {/* ── Seller ───────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => navigation.navigate('VendorDetail', { vendorId: product.seller._id })}
          style={[styles.sectionCard, styles.sellerCard]}
          activeOpacity={0.85}
        >
          <Text style={styles.sectionCardTitle}>Sold by</Text>
          <View style={styles.sellerRow}>
            {product.seller.avatar ? (
              <Image source={{ uri: product.seller.avatar }} style={styles.sellerAvatar} />
            ) : (
              <View style={[styles.sellerAvatar, styles.sellerAvatarFallback]}>
                <Ionicons name="person" size={22} color="#E8166D" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.sellerName}>
                {product.seller.vendorProfile?.businessName || `${product.seller.firstName} ${product.seller.lastName}`}
              </Text>
              {product.seller.vendorProfile?.rating ? (
                <View style={styles.sellerRatingRow}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.sellerRatingText}>{product.seller.vendorProfile.rating.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </View>
        </TouchableOpacity>

        {/* Specifications */}
        {(product.dimensions || product.weight || product.sku) && (
          <View style={[styles.sectionCard, { marginBottom: 0 }]}>
            <Text style={styles.sectionCardTitle}>Specifications</Text>
            {product.sku && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>SKU</Text>
                <Text style={styles.specValue}>{product.sku}</Text>
              </View>
            )}
            {product.weight && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Weight</Text>
                <Text style={styles.specValue}>{product.weight} kg</Text>
              </View>
            )}
            {product.dimensions && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Dimensions</Text>
                <Text style={styles.specValue}>{product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} {product.dimensions.unit || 'cm'}</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: product.stock > 0 ? 110 : 40 }} />
      </ScrollView>

      {/* ── Bottom Actions ───────────────────────────────────────────────── */}
      {product.stock > 0 && (
        <View
          className="bg-white px-5 border-t border-gray-100"
          style={{
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12),
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
              className="flex-1 bg-white border-2 border-pink-500 rounded-2xl items-center justify-center"
              style={{ paddingVertical: 14 }}
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
                style={{ paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
              >
                <Text className="text-white text-base font-bold">Buy Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({...prev, visible: false})); }}
        onCancel={() => setConfirmModal(prev => ({...prev, visible: false}))}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F7' },

  loadingRoot: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#8E8E93', fontSize: 14, marginTop: 12, fontWeight: '500' },

  // Nav bar
  navBar: {
    position: 'absolute', left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  navRight: { flexDirection: 'row', gap: 8 },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },

  // Carousel
  carouselWrap: { position: 'relative' },
  carouselImage: { width, height: width * 0.85, backgroundColor: '#E5E5EA' },
  counterBadge: {
    position: 'absolute', top: 68, right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  approvalBadge: {
    position: 'absolute', top: 68, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  approvalBadgeText: { fontSize: 11, fontWeight: '700' },
  discountBadge: {
    position: 'absolute', bottom: 44, left: 16,
    backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  discountText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  dotsRow: {
    position: 'absolute', bottom: 16, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 20, backgroundColor: '#E8166D' },

  // Info card
  infoCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
  },
  categoryText: { fontSize: 13, color: '#8E8E93', fontWeight: '500', marginBottom: 6 },
  productName: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5, marginBottom: 10, lineHeight: 28 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 12 },
  ratingText: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginLeft: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 12 },
  priceMain: { fontSize: 28, fontWeight: '800', color: '#E8166D', letterSpacing: -0.5 },
  priceStrike: { fontSize: 17, color: '#C7C7CC', textDecorationLine: 'line-through', fontWeight: '500' },

  // Stock badge
  stockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  stockBadgeGreen: { backgroundColor: '#D1FAE5' },
  stockBadgeOrange: { backgroundColor: '#FFEDD5' },
  stockBadgeRed: { backgroundColor: '#FEE2E2' },
  stockBadgeText: { fontSize: 13, fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row', borderRadius: 16,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },

  // Product status card
  statusCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statusCardHeader: { flexDirection: 'row', alignItems: 'center' },
  statusIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusCardTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  statusCardStatus: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  statusCardDate: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  statusCardNote: {
    fontSize: 13, color: '#6B7280', lineHeight: 18, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },

  // Generic section card
  sectionCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionCardTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginBottom: 12, letterSpacing: -0.2 },

  // Variants
  variantChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#F2F2F7', borderWidth: 1.5, borderColor: '#E5E5EA',
  },
  variantChipActive: { backgroundColor: '#FFF0F6', borderColor: '#E8166D' },
  variantChipText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },
  variantChipTextActive: { color: '#E8166D' },

  // Quantity
  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 16, alignSelf: 'flex-start', overflow: 'hidden',
  },
  qtyBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  qtyValue: { minWidth: 40, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#1C1C1E' },

  // Delivery
  deliveryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  deliveryIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center',
  },
  deliveryTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  deliverySub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  // Description
  descriptionText: { fontSize: 14, color: '#6B7280', lineHeight: 22 },

  // Seller
  sellerCard: { paddingBottom: 18 },
  sellerRow: { flexDirection: 'row', alignItems: 'center' },
  sellerAvatar: { width: 46, height: 46, borderRadius: 23 },
  sellerAvatarFallback: { backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center' },
  sellerName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  sellerRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sellerRatingText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  // Specs
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  specLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  specValue: { fontSize: 13, color: '#1C1C1E', fontWeight: '600' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F2F2F7',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  cartBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, borderWidth: 2, borderColor: '#E8166D',
    paddingVertical: 14, backgroundColor: '#fff',
  },
  cartBtnText: { color: '#E8166D', fontSize: 15, fontWeight: '700' },
  buyNowBtn: { paddingVertical: 15, alignItems: 'center' },
  buyNowText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default ProductDetailScreen;
