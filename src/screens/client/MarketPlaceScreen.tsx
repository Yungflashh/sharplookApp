import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, cartAPI, categoriesAPI, savedAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;
const CAT_W  = (width - 48) / 2;
const CAT_H  = 130;

const PRIMARY    = '#E04079';
const PRI_DARK   = '#B5315F';
const PRI_SOFT   = '#FEF0F5';
const PRI_MUTED  = '#FCDCE9';
const GOLD       = '#F59E0B';
const GREEN      = '#10B981';
const ORANGE     = '#F97316';
const RED        = '#EF4444';
const PURPLE     = '#8B5CF6';
const TEXT1      = '#111827';
const TEXT2      = '#6B7280';
const TEXT3      = '#9CA3AF';
const BORDER     = '#F3F4F6';
const SURFACE    = '#FFFFFF';
const BG         = '#FFF5F9';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;

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
  seller: { _id: string; firstName: string; lastName: string; avatar?: string };
  category: { _id: string; name: string; icon?: string };
  condition: string;
  brand?: string;
  isFeatured: boolean;
  isSponsored: boolean;
}

interface Category {
  _id: string;
  name: string;
  icon?: string;
  image?: string;
}

// ─── Category gradient fallbacks ─────────────────────────────────────────────
const CAT_GRADIENTS: [string, string][] = [
  ['#F9A8D4', '#E04079'],
  ['#FCA5A5', '#C2185B'],
  ['#6EE7B7', '#10B981'],
  ['#A5B4FC', '#6366F1'],
  ['#FCD34D', '#F59E0B'],
  ['#C4B5FD', '#8B5CF6'],
];

// Ionicons name fallback per category (matched by lowercased name)
const CAT_ICON_MAP: Record<string, string> = {
  makeup:    'color-palette-outline',
  'skin care': 'leaf-outline',
  skincare:  'leaf-outline',
  hair:      'cut-outline',
  'hair care': 'cut-outline',
  fragrance: 'flower-outline',
  nails:     'hand-left-outline',
  body:      'body-outline',
  wellness:  'heart-outline',
  tools:     'build-outline',
  accessories: 'glasses-outline',
};

const getCatIcon = (name: string): string =>
  CAT_ICON_MAP[name.toLowerCase()] ?? 'grid-outline';

// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard: React.FC<{
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}> = ({ product, onPress, onAddToCart, isSaved = false, onToggleSave }) => {
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.finalPrice
      ? Math.round(((product.compareAtPrice - product.finalPrice) / product.compareAtPrice) * 100)
      : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        width: CARD_W,
        marginBottom: 14,
        backgroundColor: SURFACE,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: BORDER,
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
          android: { elevation: 3 },
        }),
      }}
    >
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: product.images[0] || 'https://via.placeholder.com/150' }}
          style={{ width: '100%', height: 155 }}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }}
        />
        <View style={{ position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4 }}>
            {product.isFeatured && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
                <Ionicons name="star" size={9} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', marginLeft: 3, letterSpacing: 0.4 }}>FEATURED</Text>
              </View>
            )}
            {product.isSponsored && !product.isFeatured && (
              <View style={{ backgroundColor: PURPLE, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 }}>SPONSORED</Text>
              </View>
            )}
          </View>
          {discount > 0 && (
            <View style={{ backgroundColor: RED, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>-{discount}%</Text>
            </View>
          )}
        </View>
        {product.stock < 10 && product.stock >= 0 && (
          <View style={{ position: 'absolute', bottom: 8, left: 8, backgroundColor: product.stock === 0 ? RED : ORANGE, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
              {product.stock === 0 ? 'OUT OF STOCK' : `Only ${product.stock} left`}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={onToggleSave}
          activeOpacity={0.8}
          style={{ position: 'absolute', bottom: 8, right: 8, width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={15} color={PRIMARY} />
        </TouchableOpacity>
      </View>

      <View style={{ padding: 11 }}>
        <Text style={{ fontSize: 10, color: TEXT3, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }} numberOfLines={1}>
          {product.brand || product.category.name}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT1, lineHeight: 18, marginBottom: 6 }} numberOfLines={2}>
          {product.name}
        </Text>
        {product.totalRatings > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="star" size={11} color={GOLD} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: TEXT2, marginLeft: 3 }}>{product.rating.toFixed(1)}</Text>
            <Text style={{ fontSize: 10, color: TEXT3, marginLeft: 3 }}>({product.totalRatings})</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: PRIMARY, letterSpacing: -0.3 }}>
              ₦{product.finalPrice.toLocaleString()}
            </Text>
            {product.compareAtPrice && product.compareAtPrice > product.finalPrice && (
              <Text style={{ fontSize: 10, color: TEXT3, textDecorationLine: 'line-through' }}>
                ₦{product.compareAtPrice.toLocaleString()}
              </Text>
            )}
          </View>
          {product.stock > 0 && (
            <TouchableOpacity
              onPress={onAddToCart}
              activeOpacity={0.8}
              style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: PRI_MUTED }}
            >
              <Ionicons name="cart-outline" size={16} color={PRIMARY} />
            </TouchableOpacity>
          )}
        </View>
        {product.condition && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 7 }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: GREEN, marginRight: 5 }} />
            <Text style={{ fontSize: 10, color: TEXT3, fontWeight: '500', textTransform: 'capitalize' }}>{product.condition}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Category Card ────────────────────────────────────────────────────────────
const FALLBACK_CAT_IMAGE = require('../../../assets/banner1.png');

const CategoryCard: React.FC<{
  category: Category;
  count: number;
  index: number;
  onPress: () => void;
}> = ({ category, count, index, onPress }) => {
  const [imgError, setImgError] = React.useState(false);
  const grad = CAT_GRADIENTS[index % CAT_GRADIENTS.length];
  const showRemote = !!category.image && !imgError;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        width: CAT_W,
        height: CAT_H,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10 },
          android: { elevation: 5 },
        }),
      }}
    >
      {/* Background: remote image → local fallback image with gradient tint */}
      {showRemote ? (
        <Image
          source={{ uri: category.image }}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          <Image
            source={FALLBACK_CAT_IMAGE}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[`${grad[0]}99`, `${grad[1]}CC`]}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
          />
        </>
      )}

      {/* Bottom gradient + text */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.68)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', justifyContent: 'flex-end', padding: 12 }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}>{category.name}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '500', marginTop: 2 }}>
          {count > 0 ? `${count} Products` : 'Browse'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [cartCount, setCartCount]     = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchAllProducts = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params: any = { page: pageNum, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };
      if (searchQuery) params.search = searchQuery;

      const response = await productAPI.getAllProducts(params);
      if (response.success) {
        const products: Product[] = Array.isArray(response.data) ? response.data : response.data.products || [];
        if (append) {
          setAllProducts((prev) => {
            const ids = new Set(prev.map((p) => p._id));
            return [...prev, ...products.filter((p) => !ids.has(p._id))];
          });
        } else {
          setAllProducts(products);
        }
        setHasMore(products.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getActiveCategories();
      if (response.success) setCategories(response.data || []);
    } catch {}
  };

  const updateCartCount = async () => {
    try { setCartCount(await cartAPI.getCartCount()); } catch {}
  };

  const handleAddToCart = async (product: Product) => {
    try {
      await cartAPI.addToCart({ product, quantity: 1 });
      await updateCartCount();
      toast.success('Added to cart', product.name);
    } catch {
      toast.error('Error', 'Failed to add product to cart');
    }
  };

  const handleToggleSaveProduct = async (productId: string) => {
    const wasSaved = savedProductIds.has(productId);
    setSavedProductIds(prev => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      const res = await savedAPI.toggleProduct(productId);
      toast.success(res.data?.saved ? 'Saved' : 'Removed', res.message || 'Wishlist updated');
    } catch (err) {
      setSavedProductIds(prev => {
        const next = new Set(prev);
        wasSaved ? next.add(productId) : next.delete(productId);
        return next;
      });
      toast.error('Error', handleAPIError(err).message);
    }
  };

  useEffect(() => {
    fetchAllProducts(); fetchCategories(); updateCartCount();
    savedAPI.getSavedIds().then(res => {
      if (res?.data?.savedProductIds) setSavedProductIds(new Set(res.data.savedProductIds));
    }).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { updateCartCount(); }, []));
  useEffect(() => {
    const t = setTimeout(() => fetchAllProducts(1, false), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchAllProducts(1, false), updateCartCount()]).finally(() => setRefreshing(false));
  }, []);

  const loadMore = () => { if (!loadingMore && hasMore) fetchAllProducts(page + 1, true); };

  // Compute product count per category
  const countByCategory = allProducts.reduce<Record<string, number>>((acc, p) => {
    const id = p.category?._id;
    if (id) acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  if (loading && page === 1) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={{ color: TEXT3, fontSize: 14, marginTop: 12, fontWeight: '500' }}>Loading marketplace…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: SURFACE }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
          backgroundColor: SURFACE,
        }}>
            {/* Title */}
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT1, letterSpacing: -0.5 }}>
            Marketplace
          </Text>

          {/* Cart */}
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} activeOpacity={0.8} style={{ position: 'relative' }}>
            <View style={{
              width: 42, height: 42, borderRadius: 21,
              backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: PRI_MUTED,
            }}>
              <Ionicons name="cart-outline" size={22} color={PRIMARY} />
            </View>
            {cartCount > 0 && (
              <View style={{
                position: 'absolute', top: -3, right: -3,
                minWidth: 18, height: 18, borderRadius: 9,
                backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 4, borderWidth: 2, borderColor: SURFACE,
              }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── SCROLL CONTENT ─────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) loadMore();
        }}
        scrollEventThrottle={400}
      >
        {/* Search bar */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: SURFACE, borderRadius: 14,
            paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
            borderWidth: 1.5, borderColor: searchFocused ? PRIMARY : BORDER,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 },
              android: { elevation: 2 },
            }),
          }}>
            <Ionicons name="search-outline" size={18} color={searchFocused ? PRIMARY : TEXT3} />
            <TextInput
              style={{ flex: 1, marginLeft: 9, fontSize: 14, color: TEXT1, paddingVertical: 0 }}
              placeholder="Search services"
              placeholderTextColor={TEXT3}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={TEXT3} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Hero Banner */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <TouchableOpacity activeOpacity={0.92} style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: PRI_SOFT }}>
            <Image
              source={require('../../../assets/mrkt.png')}
              style={{ width: '100%', height: undefined, aspectRatio: 16 / 9 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Browse Categories */}
        <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT1, letterSpacing: -0.3 }}>
              Browse Categories
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('CategoryProducts', { categoryId: 'all', categoryName: 'All Products' })} activeOpacity={0.7}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>See all</Text>
            </TouchableOpacity>
          </View>

          {/* 2×2 grid */}
          {categories.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {categories.slice(0, 6).map((cat, i) => (
                <CategoryCard
                  key={cat._id}
                  category={cat}
                  count={countByCategory[cat._id] || 0}
                  index={i}
                  onPress={() => navigation.navigate('CategoryProducts', { categoryId: cat._id, categoryName: cat.name })}
                />
              ))}
            </View>
          ) : (
            // Skeleton placeholders while categories load
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    width: CAT_W, height: CAT_H, borderRadius: 16, marginBottom: 12,
                    backgroundColor: PRI_SOFT,
                  }}
                />
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
};

export default MarketplaceScreen;
