import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  TextInput, ActivityIndicator, RefreshControl,
  Platform, Dimensions, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, cartAPI, savedAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const PRIMARY   = '#E04079';
const PRI_SOFT  = '#FEF0F5';
const PRI_MUTED = '#FCDCE9';
const GOLD      = '#F59E0B';
const GREEN     = '#10B981';
const ORANGE    = '#F97316';
const RED       = '#EF4444';
const PURPLE    = '#8B5CF6';
const TEXT1     = '#111827';
const TEXT2     = '#6B7280';
const TEXT3     = '#9CA3AF';
const BORDER    = '#F3F4F6';
const SURFACE   = '#FFFFFF';
const BG        = '#FFF5F9';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'CategoryProducts'>;
type Route = RouteProp<RootStackParamList, 'CategoryProducts'>;

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
      style={[ss.card, { width: CARD_W }]}
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

        {/* Badges */}
        <View style={{ position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 4 }}>
            {product.isFeatured && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: GOLD, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
                <Ionicons name="star" size={9} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', marginLeft: 3 }}>FEATURED</Text>
              </View>
            )}
            {product.isSponsored && !product.isFeatured && (
              <View style={{ backgroundColor: PURPLE, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>SPONSORED</Text>
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

// ─── Screen ───────────────────────────────────────────────────────────────────
const CategoryProductsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { categoryId, categoryName } = route.params;

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts]     = useState<Product[]>([]);
  const [cartCount, setCartCount]   = useState(0);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedProductIds, setSavedProductIds] = useState<Set<string>>(new Set());

  const fetchProducts = useCallback(async (pageNum = 1, append = false, search = searchQuery) => {
    try {
      if (pageNum === 1 && !append) setLoading(true);
      else if (append) setLoadingMore(true);

      const params: any = { page: pageNum, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };
      if (categoryId !== 'all') params.category = categoryId;
      if (search.trim()) params.search = search.trim();

      const res = await productAPI.getAllProducts(params);
      if (res.success) {
        const data: Product[] = Array.isArray(res.data) ? res.data : res.data.products || [];
        if (append) {
          setProducts((prev) => {
            const ids = new Set(prev.map((p) => p._id));
            return [...prev, ...data.filter((p) => !ids.has(p._id))];
          });
        } else {
          setProducts(data);
        }
        setHasMore(data.length === 20);
        setPage(pageNum);
      }
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [categoryId, searchQuery]);

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
    fetchProducts(1, false);
    updateCartCount();
    savedAPI.getSavedIds().then(res => {
      if (res?.data?.savedProductIds) setSavedProductIds(new Set(res.data.savedProductIds));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(1, false, searchQuery), 450);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(1, false);
  }, [fetchProducts]);

  const loadMore = () => { if (!loadingMore && hasMore) fetchProducts(page + 1, true); };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: SURFACE }}>
        <View style={ss.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={ss.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color={PRIMARY} />
          </TouchableOpacity>

          <Text style={ss.headerTitle} numberOfLines={1}>{categoryName}</Text>

          <TouchableOpacity onPress={() => navigation.navigate('Cart')} activeOpacity={0.8} style={{ position: 'relative' }}>
            <View style={ss.cartBtn}>
              <Ionicons name="cart-outline" size={22} color={PRIMARY} />
            </View>
            {cartCount > 0 && (
              <View style={ss.cartBadge}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER }}>
        <View style={[ss.searchBar, searchFocused && { borderColor: PRIMARY }]}>
          <Ionicons name="search-outline" size={17} color={searchFocused ? PRIMARY : TEXT3} />
          <TextInput
            style={ss.searchInput}
            placeholder={`Search in ${categoryName}…`}
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
              <Ionicons name="close-circle" size={17} color={TEXT3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={{ color: TEXT3, fontSize: 14, marginTop: 12, fontWeight: '500' }}>Loading products…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) loadMore();
          }}
          scrollEventThrottle={400}
        >
          {/* Count pill */}
          {products.length > 0 && (
            <View style={ss.countRow}>
              <Text style={ss.countText}>{products.length} product{products.length !== 1 ? 's' : ''}</Text>
            </View>
          )}

          {/* Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {products.map((product, i) => (
              <ProductCard
                key={`${product._id}-${i}`}
                product={product}
                onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
                onAddToCart={() => handleAddToCart(product)}
                isSaved={savedProductIds.has(product._id)}
                onToggleSave={() => handleToggleSaveProduct(product._id)}
              />
            ))}
          </View>

          {loadingMore && (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={PRIMARY} />
            </View>
          )}

          {!hasMore && products.length > 0 && (
            <View style={ss.endCard}>
              <Ionicons name="checkmark-circle-outline" size={20} color={TEXT3} />
              <Text style={{ color: TEXT3, fontSize: 13, marginTop: 6, fontWeight: '500' }}>You've seen everything</Text>
            </View>
          )}

          {products.length === 0 && (
            <View style={ss.empty}>
              <View style={ss.emptyIcon}>
                <Ionicons name="cube-outline" size={38} color={PRIMARY} />
              </View>
              <Text style={ss.emptyTitle}>No products found</Text>
              <Text style={ss.emptySub}>
                {searchQuery ? 'Try a different search term' : `No products in ${categoryName} yet`}
              </Text>
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={ss.clearBtn} activeOpacity={0.8}>
                  <Text style={ss.clearBtnTxt}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const ss = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, backgroundColor: SURFACE,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: PRI_MUTED,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT1, letterSpacing: -0.4, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  cartBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: PRI_MUTED,
  },
  cartBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, borderWidth: 2, borderColor: SURFACE,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    borderWidth: 1.5, borderColor: BORDER,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: TEXT1, paddingVertical: 0 },
  countRow: { marginBottom: 14 },
  countText: { fontSize: 13, color: TEXT2, fontWeight: '600' },
  card: {
    marginBottom: 14, backgroundColor: SURFACE, borderRadius: 18,
    overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  endCard: {
    marginTop: 8, backgroundColor: SURFACE, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: BORDER,
  },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: PRI_SOFT, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: PRI_MUTED,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT1, marginBottom: 8, letterSpacing: -0.3 },
  emptySub: { fontSize: 14, color: TEXT2, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  clearBtn: { backgroundColor: PRI_SOFT, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: PRI_MUTED },
  clearBtnTxt: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
});

export default CategoryProductsScreen;
