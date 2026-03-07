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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, cartAPI, categoriesAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  gold: '#F59E0B',
  goldSoft: '#FEF3C7',
  green: '#10B981',
  greenSoft: '#D1FAE5',
  purple: '#8B5CF6',
  purpleSoft: '#EDE9FE',
  orange: '#F97316',
  orangeSoft: '#FFEDD5',
  red: '#EF4444',
  redSoft: '#FEE2E2',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard: React.FC<{
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
}> = ({ product, onPress, onAddToCart }) => {
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.finalPrice
      ? Math.round(((product.compareAtPrice - product.finalPrice) / product.compareAtPrice) * 100)
      : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        width: CARD_WIDTH,
        marginBottom: 14,
        backgroundColor: BRAND.surface,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: BRAND.border,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
          },
          android: { elevation: 3 },
        }),
      }}
    >
      {/* Image */}
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: product.images[0] || 'https://via.placeholder.com/150' }}
          style={{ width: '100%', height: 155 }}
          resizeMode="cover"
        />

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }}
        />

        {/* Top badges */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View style={{ gap: 4 }}>
            {product.isFeatured && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: BRAND.gold,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 7,
                }}
              >
                <Ionicons name="star" size={9} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', marginLeft: 3, letterSpacing: 0.4 }}>
                  FEATURED
                </Text>
              </View>
            )}
            {product.isSponsored && !product.isFeatured && (
              <View
                style={{
                  backgroundColor: BRAND.purple,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  borderRadius: 7,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 }}>
                  SPONSORED
                </Text>
              </View>
            )}
          </View>

          {discount > 0 && (
            <View
              style={{
                backgroundColor: BRAND.red,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 7,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>-{discount}%</Text>
            </View>
          )}
        </View>

        {/* Stock warning */}
        {product.stock < 10 && product.stock >= 0 && (
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              backgroundColor: product.stock === 0 ? BRAND.red : BRAND.orange,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 7,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
              {product.stock === 0 ? 'OUT OF STOCK' : `Only ${product.stock} left`}
            </Text>
          </View>
        )}

        {/* Wishlist button */}
        <TouchableOpacity
          onPress={() => {}}
          activeOpacity={0.8}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.9)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="heart-outline" size={15} color={BRAND.primary} />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={{ padding: 11 }}>
        {/* Brand / category label */}
        <Text
          style={{
            fontSize: 10,
            color: BRAND.textMuted,
            fontWeight: '600',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            marginBottom: 3,
          }}
          numberOfLines={1}
        >
          {product.brand || product.category.name}
        </Text>

        {/* Name */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: BRAND.textPrimary,
            lineHeight: 18,
            marginBottom: 6,
          }}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {/* Rating */}
        {product.totalRatings > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="star" size={11} color={BRAND.gold} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND.textSecondary, marginLeft: 3 }}>
              {product.rating.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 10, color: BRAND.textMuted, marginLeft: 3 }}>
              ({product.totalRatings})
            </Text>
          </View>
        )}

        {/* Price + cart */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.3 }}>
              ₦{product.finalPrice.toLocaleString()}
            </Text>
            {product.compareAtPrice && product.compareAtPrice > product.finalPrice && (
              <Text style={{ fontSize: 10, color: BRAND.textMuted, textDecorationLine: 'line-through' }}>
                ₦{product.compareAtPrice.toLocaleString()}
              </Text>
            )}
          </View>

          {product.stock > 0 && (
            <TouchableOpacity
              onPress={onAddToCart}
              activeOpacity={0.8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: BRAND.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: BRAND.primaryMuted,
              }}
            >
              <Ionicons name="cart-outline" size={16} color={BRAND.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Condition dot */}
        {product.condition && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 7 }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: BRAND.green,
                marginRight: 5,
              }}
            />
            <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', textTransform: 'capitalize' }}>
              {product.condition}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Section Header ────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}> = ({ title, icon, iconColor = BRAND.gold }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
    {icon && (
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          backgroundColor: `${iconColor}22`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <Ionicons name={icon} size={14} color={iconColor} />
      </View>
    )}
    <Text style={{ fontSize: 17, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.3 }}>
      {title}
    </Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MarketplaceScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartCount, setCartCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'createdAt' | 'price' | 'rating'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchAllProducts = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      let featuredProducts: Product[] = [];
      if (pageNum === 1) {
        try {
          const featuredRes = await productAPI.getFeaturedProducts(20);
          if (featuredRes.success) {
            featuredProducts = Array.isArray(featuredRes.data)
              ? featuredRes.data
              : featuredRes.data.products || [];
          }
        } catch {}
      }

      const params: any = { page: pageNum, limit: 20, sortBy, sortOrder };
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;

      const response = await productAPI.getAllProducts(params);

      if (response.success) {
        const regularProducts = Array.isArray(response.data)
          ? response.data
          : response.data.products || [];

        let combined: Product[] = [];
        if (pageNum === 1) {
          const featuredIds = new Set(featuredProducts.map((p) => p._id));
          combined = [
            ...featuredProducts,
            ...regularProducts.filter((p: Product) => !featuredIds.has(p._id)),
          ];
        } else {
          combined = regularProducts;
        }

        if (append) {
          setAllProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            return [...prev, ...combined.filter((p) => !existingIds.has(p._id))];
          });
        } else {
          setAllProducts(combined);
        }

        setHasMore(regularProducts.length === 20);
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
    try {
      setCartCount(await cartAPI.getCartCount());
    } catch {}
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

  useEffect(() => {
    fetchAllProducts();
    fetchCategories();
    updateCartCount();
  }, []);

  useFocusEffect(useCallback(() => { updateCartCount(); }, []));

  useEffect(() => { fetchAllProducts(1, false); }, [selectedCategory, sortBy, sortOrder]);

  useEffect(() => {
    const t = setTimeout(() => fetchAllProducts(1, false), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchAllProducts(1, false), updateCartCount()]).finally(() =>
      setRefreshing(false)
    );
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) fetchAllProducts(page + 1, true);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && page === 1) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>
            Loading marketplace…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const featuredProducts = allProducts.filter((p) => p.isFeatured);
  const regularProducts = allProducts.filter((p) => !p.isFeatured);

  const SORT_OPTIONS = [
    { key: 'createdAt', label: 'Latest', icon: 'time-outline' as const },
    { key: 'price', label: 'Price', icon: 'pricetag-outline' as const },
    { key: 'rating', label: 'Top Rated', icon: 'star-outline' as const },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND.surface }}>
        <View
          style={{
            backgroundColor: BRAND.surface,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: BRAND.border,
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
              android: { elevation: 3 },
            }),
          }}
        >
          {/* Row 1: back + title + cart */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  backgroundColor: BRAND.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: BRAND.border,
                  marginRight: 12,
                }}
              >
                <Ionicons name="arrow-back" size={20} color={BRAND.textPrimary} />
              </TouchableOpacity>

              <View>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: BRAND.textPrimary,
                    letterSpacing: -0.5,
                  }}
                >
                  Marketplace
                </Text>
                <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
                  {allProducts.length} products available
                </Text>
              </View>
            </View>

            {/* Cart button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              activeOpacity={0.8}
              style={{ position: 'relative' }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: BRAND.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: BRAND.primaryMuted,
                }}
              >
                <Ionicons name="cart-outline" size={22} color={BRAND.primary} />
                {cartCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: BRAND.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                      borderWidth: 2,
                      borderColor: BRAND.surface,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {cartCount > 99 ? '99+' : cartCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2: search */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: BRAND.surfaceAlt,
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: Platform.OS === 'ios' ? 11 : 9,
              marginBottom: 14,
              borderWidth: 1.5,
              borderColor: searchFocused ? BRAND.primary : BRAND.border,
            }}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={searchFocused ? BRAND.primary : BRAND.textMuted}
            />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 9,
                fontSize: 14,
                color: BRAND.textPrimary,
                paddingVertical: 0,
              }}
              placeholder="Search products…"
              placeholderTextColor={BRAND.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={BRAND.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Row 3: category pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {/* All pill */}
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: selectedCategory === null ? BRAND.primary : BRAND.surfaceAlt,
                borderWidth: 1,
                borderColor: selectedCategory === null ? BRAND.primary : BRAND.borderStrong,
                ...Platform.select({
                  ios:
                    selectedCategory === null
                      ? { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 }
                      : {},
                  android: selectedCategory === null ? { elevation: 3 } : {},
                }),
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: selectedCategory === null ? '#fff' : BRAND.textSecondary,
                }}
              >
                All
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isActive = selectedCategory === cat._id;
              return (
                <TouchableOpacity
                  key={cat._id}
                  onPress={() => setSelectedCategory(cat._id)}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: isActive ? BRAND.primary : BRAND.surfaceAlt,
                    borderWidth: 1,
                    borderColor: isActive ? BRAND.primary : BRAND.borderStrong,
                    ...Platform.select({
                      ios: isActive
                        ? { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 }
                        : {},
                      android: isActive ? { elevation: 3 } : {},
                    }),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: isActive ? '#fff' : BRAND.textSecondary,
                    }}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* ── SCROLL CONTENT ───────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) loadMore();
        }}
        scrollEventThrottle={400}
      >
        {/* ── SORT OPTIONS ─────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 13, color: BRAND.textMuted, fontWeight: '500' }}>
            Sort by
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    if (sortBy === opt.key) {
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setSortBy(opt.key as any);
                      setSortOrder('desc');
                    }
                  }}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    backgroundColor: isActive ? BRAND.primary : BRAND.surface,
                    borderWidth: 1,
                    borderColor: isActive ? BRAND.primary : BRAND.border,
                    gap: 5,
                    ...Platform.select({
                      ios: isActive
                        ? { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 5 }
                        : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
                      android: { elevation: isActive ? 3 : 1 },
                    }),
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={13}
                    color={isActive ? '#fff' : BRAND.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isActive ? '#fff' : BRAND.textSecondary,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {isActive && (
                    <Ionicons
                      name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={12}
                      color="#fff"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── FEATURED SECTION ─────────────────────────────────────────── */}
        {featuredProducts.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 6 }}>
            {/* Divider label */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 14,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: BRAND.goldSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="star" size={14} color={BRAND.gold} />
              </View>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '800',
                  color: BRAND.textPrimary,
                  letterSpacing: -0.3,
                  flex: 1,
                }}
              >
                Featured
              </Text>
              <View
                style={{
                  backgroundColor: BRAND.goldSoft,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '700' }}>
                  {featuredProducts.length} items
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {featuredProducts.map((product, index) => (
                <ProductCard
                  key={`featured-${product._id}-${index}`}
                  product={product}
                  onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Divider between featured and all products */}
        {featuredProducts.length > 0 && regularProducts.length > 0 && (
          <View
            style={{
              marginHorizontal: 20,
              marginBottom: 16,
              height: 1,
              backgroundColor: BRAND.border,
            }}
          />
        )}

        {/* ── ALL / REGULAR PRODUCTS ───────────────────────────────────── */}
        {regularProducts.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            {featuredProducts.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 14,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    backgroundColor: BRAND.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="grid-outline" size={14} color={BRAND.primary} />
                </View>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: '800',
                    color: BRAND.textPrimary,
                    letterSpacing: -0.3,
                    flex: 1,
                  }}
                >
                  All Products
                </Text>
                <View
                  style={{
                    backgroundColor: BRAND.primarySoft,
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: BRAND.primaryMuted,
                  }}
                >
                  <Text style={{ fontSize: 11, color: BRAND.primary, fontWeight: '700' }}>
                    {regularProducts.length} items
                  </Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {regularProducts.map((product, index) => (
                <ProductCard
                  key={`regular-${product._id}-${index}`}
                  product={product}
                  onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Load more indicator */}
        {loadingMore && (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={BRAND.primary} />
          </View>
        )}

        {/* End of list */}
        {!hasMore && allProducts.length > 10 && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 8,
              backgroundColor: BRAND.surface,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: BRAND.border,
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={BRAND.textMuted} />
            <Text style={{ color: BRAND.textMuted, fontSize: 13, marginTop: 6, fontWeight: '500' }}>
              You've seen everything
            </Text>
          </View>
        )}

        {/* Empty state */}
        {allProducts.length === 0 && !loading && (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 26,
                backgroundColor: BRAND.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
                borderWidth: 1,
                borderColor: BRAND.border,
              }}
            >
              <Ionicons name="cube-outline" size={42} color={BRAND.textMuted} />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: BRAND.textPrimary,
                marginBottom: 8,
                letterSpacing: -0.3,
              }}
            >
              No products found
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: BRAND.textSecondary,
                textAlign: 'center',
                lineHeight: 21,
                marginBottom: 24,
              }}
            >
              Try adjusting your search or filters
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory(null);
              }}
              activeOpacity={0.8}
              style={{
                backgroundColor: BRAND.primarySoft,
                paddingHorizontal: 20,
                paddingVertical: 11,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: BRAND.primaryMuted,
              }}
            >
              <Text style={{ color: BRAND.primary, fontWeight: '700', fontSize: 14 }}>
                Clear Filters
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MarketplaceScreen;