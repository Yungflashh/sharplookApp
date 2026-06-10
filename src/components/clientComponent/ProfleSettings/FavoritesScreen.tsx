import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { savedAPI, cartAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const { width } = Dimensions.get('window');
const PRODUCT_W = (width - 48) / 2;

const PINK = '#E04079';
const PINK_SOFT = '#FFF0F7';
const GOLD = '#F59E0B';
const GREEN = '#10B981';
const TEXT1 = '#111827';
const TEXT2 = '#6B7280';
const TEXT3 = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG = '#FFF5F9';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SavedVendor {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  vendorProfile: {
    businessName: string;
    rating?: number;
    totalRatings?: number;
    totalReviews?: number;
    vendorType?: string;
    profileImage?: string;
    portfolioImages?: string[];
    isVerified?: boolean;
    categories?: Array<{ name: string }>;
  };
}

interface SavedProduct {
  _id: string;
  name: string;
  images: string[];
  price: number;
  finalPrice: number;
  compareAtPrice?: number;
  stock: number;
  rating: number;
  totalRatings: number;
  status?: string;
  isNew?: boolean;
  seller: { _id: string; firstName: string; lastName: string };
  category: { _id: string; name: string };
  brand?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const vendorTypeLabel = (type?: string) => {
  if (type === 'home_service') return 'Home Service';
  if (type === 'in_shop') return 'In-Shop';
  if (type === 'both') return 'Home Service & In-shop';
  return 'Service';
};

const Stars: React.FC<{ rating: number; size?: number }> = ({ rating, size = 13 }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(s => (
      <Ionicons key={s} name={s <= Math.round(rating) ? 'star' : 'star-outline'} size={size} color={GOLD} />
    ))}
  </View>
);

// ─── Vendor Card (Services tab) ───────────────────────────────────────────────
const VendorSavedCard: React.FC<{
  vendor: SavedVendor;
  onUnsave: () => void;
  onBook: () => void;
}> = ({ vendor, onUnsave, onBook }) => {
  const vp = vendor.vendorProfile;
  const image = vp.profileImage || vendor.avatar;
  const rating = vp.rating ?? 0;
  const reviews = vp.totalRatings ?? vp.totalReviews ?? 0;
  const initials = (vp.businessName || 'V').slice(0, 2).toUpperCase();
  const portfolio = vp.portfolioImages?.slice(0, 3) ?? [];

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: BORDER,
        ...Platform.select({
          android: { elevation: 3 },
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
        }),
      }}
    >
      {/* Image */}
      <View style={{ height: 210, position: 'relative', backgroundColor: '#f3e6f0' }}>
        {image ? (
          <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9c8e0' }}>
            <Text style={{ fontSize: 48, fontWeight: '900', color: '#fff' }}>{initials}</Text>
          </View>
        )}
        {/* Heart unsave */}
        <TouchableOpacity
          onPress={onUnsave}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.95)',
            alignItems: 'center',
            justifyContent: 'center',
            ...Platform.select({ android: { elevation: 4 } }),
          }}
        >
          <Ionicons name="heart" size={18} color={PINK} />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={{ padding: 14 }}>
        {/* Name + verified */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT1, flex: 1 }} numberOfLines={1}>
            {vp.businessName}
          </Text>
          {vp.isVerified && (
            <Ionicons name="checkmark-circle" size={18} color={GREEN} style={{ marginLeft: 6 }} />
          )}
        </View>

        {/* Rating */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Stars rating={rating} />
          <Text style={{ fontSize: 12, color: TEXT2, marginLeft: 6 }}>
            {rating.toFixed(1)} ({reviews} review{reviews !== 1 ? 's' : ''})
          </Text>
        </View>

        {/* Service type */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="home-outline" size={13} color={TEXT3} />
          <Text style={{ fontSize: 12, color: TEXT2, marginLeft: 5 }}>{vendorTypeLabel(vp.vendorType)}</Text>
        </View>

        {/* Portfolio avatars */}
        {portfolio.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            {portfolio.map((img, i) => (
              <Image
                key={i}
                source={{ uri: img }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  borderWidth: 2,
                  borderColor: '#fff',
                  marginLeft: i === 0 ? 0 : -8,
                }}
              />
            ))}
            {(vp.portfolioImages?.length ?? 0) > 3 && (
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: PINK_SOFT,
                  borderWidth: 2,
                  borderColor: '#fff',
                  marginLeft: -8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: PINK }}>
                  +{(vp.portfolioImages?.length ?? 0) - 3}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Book button */}
        <TouchableOpacity
          onPress={onBook}
          activeOpacity={0.85}
          style={{
            backgroundColor: PINK,
            borderRadius: 14,
            paddingVertical: 13,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Book Appointment</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Product Card (Products tab) ──────────────────────────────────────────────
const ProductSavedCard: React.FC<{
  product: SavedProduct;
  onUnsave: () => void;
  onPress: () => void;
  onAddToCart: () => void;
}> = ({ product, onUnsave, onPress, onAddToCart }) => {
  const stockLabel = product.stock === 0 ? 'Out of Stock' : product.stock > 10 ? 'In Stock' : `${product.stock} left`;
  const stockColor = product.stock === 0 ? '#EF4444' : GREEN;
  const isNew = product.isNew;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        width: PRODUCT_W,
        backgroundColor: '#fff',
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: BORDER,
        ...Platform.select({
          android: { elevation: 3 },
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
        }),
      }}
    >
      {/* Image */}
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: product.images?.[0] }}
          style={{ width: '100%', height: 155 }}
          resizeMode="cover"
        />
        {/* Stock badge */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: stockColor,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
            {isNew ? 'New' : stockLabel}
          </Text>
        </View>
        {/* Heart unsave */}
        <TouchableOpacity
          onPress={onUnsave}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="heart" size={15} color={PINK} />
        </TouchableOpacity>
      </View>

      <View style={{ padding: 10 }}>
        <Text style={{ fontSize: 10, color: TEXT3, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 }} numberOfLines={1}>
          {product.brand || product.category?.name}
        </Text>
        {product.totalRatings > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="star" size={11} color={GOLD} />
            <Text style={{ fontSize: 11, color: TEXT2, marginLeft: 3, fontWeight: '600' }}>
              {product.rating.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 10, color: TEXT3, marginLeft: 2 }}>({product.totalRatings})</Text>
          </View>
        )}
        <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT1, lineHeight: 18, marginBottom: 3 }} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={{ fontSize: 11, color: TEXT3, marginBottom: 6 }} numberOfLines={1}>
          {product.seller?.firstName} {product.seller?.lastName}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '800', color: PINK, letterSpacing: -0.3, marginBottom: 8 }}>
          ₦{(product.finalPrice ?? product.price).toLocaleString()}
        </Text>
        <TouchableOpacity
          onPress={onAddToCart}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: PINK,
            borderRadius: 10,
            paddingVertical: 7,
            gap: 6,
          }}
        >
          <Text style={{ color: PINK, fontSize: 12, fontWeight: '700' }}>Add to cart</Text>
          <Ionicons name="chevron-forward" size={13} color={PINK} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState<SavedVendor[]>([]);
  const [products, setProducts] = useState<SavedProduct[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [vendorRes, productRes] = await Promise.allSettled([
        savedAPI.getVendors({ limit: 50 }),
        savedAPI.getProducts({ limit: 50 }),
      ]);
      if (vendorRes.status === 'fulfilled' && vendorRes.value?.success) {
        setVendors(vendorRes.value.data?.vendors ?? []);
      }
      if (productRes.status === 'fulfilled' && productRes.value?.success) {
        setProducts(productRes.value.data?.products ?? []);
      }
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); fetchAll(); }, [fetchAll]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleUnsaveVendor = async (vendorId: string) => {
    try {
      await savedAPI.toggleVendor(vendorId);
      setVendors(prev => prev.filter(v => v._id !== vendorId));
      toast.success('Removed', 'Vendor removed from wishlist');
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    }
  };

  const handleUnsaveProduct = async (productId: string) => {
    try {
      await savedAPI.toggleProduct(productId);
      setProducts(prev => prev.filter(p => p._id !== productId));
      toast.success('Removed', 'Product removed from wishlist');
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    }
  };

  const handleAddToCart = async (product: SavedProduct) => {
    try {
      await cartAPI.addToCart({ productId: product._id, quantity: 1 });
      toast.success('Added', `${product.name} added to cart`);
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PINK} />
        </View>
      </SafeAreaView>
    );
  }

  const currentList = activeTab === 'services' ? vendors : products;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={{ backgroundColor: '#fff' }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: PINK_SOFT,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={PINK} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT1 }}>Saved / Wishlist</Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: BORDER }}>
          {(['services', 'products'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
              style={{ marginRight: 24, paddingBottom: 10 }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: activeTab === tab ? '700' : '500',
                  color: activeTab === tab ? PINK : TEXT3,
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'services' ? 'Services' : 'Products'}
              </Text>
              {activeTab === tab && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2.5,
                    backgroundColor: PINK,
                    borderRadius: 2,
                  }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 32 + insets.bottom,
          ...(activeTab === 'products' && currentList.length > 0
            ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }
            : {}),
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />
        }
      >
        {currentList.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: PINK_SOFT,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="heart-outline" size={40} color={PINK} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT1, marginBottom: 8 }}>Nothing saved yet</Text>
            <Text style={{ fontSize: 14, color: TEXT2, textAlign: 'center', paddingHorizontal: 32 }}>
              {activeTab === 'services'
                ? 'Tap the heart on any vendor to save them here.'
                : 'Tap the heart on any product to save it here.'}
            </Text>
          </View>
        ) : activeTab === 'services' ? (
          vendors.map(vendor => (
            <VendorSavedCard
              key={vendor._id}
              vendor={vendor}
              onUnsave={() => handleUnsaveVendor(vendor._id)}
              onBook={() => navigation.navigate('VendorDetail', { vendorId: vendor._id })}
            />
          ))
        ) : (
          products.map(product => (
            <ProductSavedCard
              key={product._id}
              product={product}
              onUnsave={() => handleUnsaveProduct(product._id)}
              onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
              onAddToCart={() => handleAddToCart(product)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default FavoritesScreen;
