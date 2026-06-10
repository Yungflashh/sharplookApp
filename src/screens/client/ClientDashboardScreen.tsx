import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  Platform,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { toast } from '@/components/ui/Toast';
import FilterModal from '@/components/FilterModal';
import VendorCard from '@/components/clientComponent/VendorCard';
import {
  userAPI, vendorAPI, categoriesAPI, servicesAPI, notificationAPI,
  messageAPI, productAPI, cartAPI, savedAPI, handleAPIError,
} from '@/api/api';
import {
  parseVendors, extractVendorsFromResponse, FormattedVendor, sortVendors,
} from '@/utils/vendorUtils';
import socketService from '@/services/socket.service';

const { width: SW } = Dimensions.get('window');

// ── Color tokens ──
const P = '#E91E63';
const P_LIGHT = '#FEE2F0';
const BG = '#F5F5F7';
const CARD = '#FFFFFF';
const TEXT = '#1A1A1A';
const HINT = '#9CA3AF';

// ── Banner carousel data ──
const BANNER_W = SW - 40;
const BANNER_GAP = 14;

const BANNERS = [
  {
    id: '1',
    headline: 'Love Your\nHair, Every Day',
    sub: 'Discover expert hair\ncare services.',
    btn: 'Book Now',
    accentColor: '#2E7D32',
    image: require('../../../assets/banner1.png'),
    category: 'hair',
  },
  {
    id: '2',
    headline: 'Perfect Nails,\nEvery Time',
    sub: 'Top nail artists near\nyou, on demand.',
    btn: 'Book Now',
    accentColor: P,
    image: require('../../../assets/banner2.png'),
    category: 'nails',
  },
  {
    id: '3',
    headline: 'Glow Up\nYour Skin',
    sub: 'Premium skincare\ntreatments await.',
    btn: 'Explore Now',
    accentColor: '#7B1FA2',
    image: require('../../../assets/banner3.png'),
    category: 'skincare',
  },
];

// ── Fallback display categories ──
const FALLBACK_CATS = [
  { id: 'f1', name: 'hair', icon: '', label: 'Hair' },
  { id: 'f2', name: 'nails', icon: '', label: 'Nails' },
  { id: 'f3', name: 'makeup', icon: '', label: 'Makeup' },
  { id: 'f4', name: 'skin', icon: '', label: 'Skin' },
];

// ── Interfaces ──
interface Category {
  id: string;
  name: string;
  icon: string;
  label: string;
}

interface UserProfile {
  user?: { firstName?: string; lastName?: string; email?: string; avatar?: string };
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

interface Product {
  _id: string;
  id: string;
  name: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  finalPrice: number;
  category: { _id: string; name: string } | any;
  seller: { _id: string; fullName: string; vendorProfile?: { businessName: string } };
  stock: number;
  rating?: number;
  totalRatings?: number;
  isSponsored?: boolean;
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'Main'>;

// ── Category icon helper ──
const renderCatIcon = (name: string, color: string, size = 22) => {
  const n = name.toLowerCase();
  if (n.includes('hair')) return <MaterialCommunityIcons name="hair-dryer" size={size} color={color} />;
  if (n.includes('nail')) return <MaterialCommunityIcons name="hand-heart-outline" size={size} color={color} />;
  if (n.includes('makeup') || n.includes('make')) return <MaterialCommunityIcons name="lipstick" size={size} color={color} />;
  if (n.includes('skin')) return <MaterialCommunityIcons name="face-woman-shimmer-outline" size={size} color={color} />;
  if (n.includes('spa') || n.includes('massage')) return <MaterialCommunityIcons name="flower-outline" size={size} color={color} />;
  if (n.includes('eye') || n.includes('brow')) return <Ionicons name="eye-outline" size={size} color={color} />;
  if (n.includes('body') || n.includes('wax')) return <MaterialCommunityIcons name="human" size={size} color={color} />;
  return <Ionicons name="sparkles-outline" size={size} color={color} />;
};

// ───────────────────────────────────────────────────────────────
const ClientDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  // ── UI state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Data state ──
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topVendors, setTopVendors] = useState<FormattedVendor[]>([]);
  const [allVendors, setAllVendors] = useState<FormattedVendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<FormattedVendor[]>([]);
  const [sponsoredProducts, setSponsoredProducts] = useState<Product[]>([]);
  const [favoriteVendors, setFavoriteVendors] = useState<Set<string>>(new Set());
  const [recommendedServices, setRecommendedServices] = useState<any[]>([]);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [filters, setFilters] = useState({
    searchName: '', category: '', minPrice: '', maxPrice: '',
    minDuration: '', maxDuration: '', status: 'all', sortBy: 'name', sortOrder: 'asc',
  });

  // ── Carousel state ──
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Computed display categories: first 4 from API + More ──
  const baseCats = categories.length > 0 ? categories.slice(0, 4) : FALLBACK_CATS;
  const displayCategories = [...baseCats, { id: 'more', name: 'more', icon: '', label: 'More' }];

  // ── Auto-scroll carousel every 3 s ──
  const startBannerTimer = useCallback(() => {
    if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    bannerTimerRef.current = setInterval(() => {
      setBannerIndex(prev => {
        const next = (prev + 1) % BANNERS.length;
        bannerScrollRef.current?.scrollTo({ x: next * (BANNER_W + BANNER_GAP), animated: true });
        return next;
      });
    }, 3000);
  }, []);

  useEffect(() => {
    startBannerTimer();
    return () => { if (bannerTimerRef.current) clearInterval(bannerTimerRef.current); };
  }, [startBannerTimer]);

  // ── Socket ──
  useEffect(() => {
    socketService.connect();
    socketService.onNewMessage(() => setUnreadMessagesCount(p => p + 1));
    return () => { socketService.removeListener('message:new'); };
  }, []);

  // ── Data helpers ──
  const dedupeProductsBySeller = (products: any[]): any[] => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const p of products) {
      const key = String(p?.seller?._id || p?.seller?.id || p?.seller || p?._id || '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  };

  const onlyShowableProducts = (products: any[]): any[] =>
    products.filter(p => {
      if (!p || p.isDeleted === true || p.isActive === false) return false;
      if (p.approvalStatus && p.approvalStatus !== 'approved') return false;
      if (p.status && ['pending', 'rejected', 'draft', 'archived', 'inactive'].includes(String(p.status).toLowerCase())) return false;
      if (!Array.isArray(p.images) || p.images.length === 0) return false;
      return true;
    });

  const dedupeVendors = (vendors: any[]): any[] => {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const v of vendors) {
      const key = String(v?.id || v?._id || v?.vendorId || v?.userId || '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  };

  const onlyWithImage = (vendors: any[]): any[] =>
    vendors.filter(v => {
      const img = v?.image || v?.avatar || v?.profileImage || v?.vendorProfile?.profileImage;
      return typeof img === 'string' && img.trim().length > 0;
    });

  // ── Fetch functions ──
  const fetchCartCount = async () => {
    try {
      const response = await cartAPI.getCart();
      if (response.success) {
        const items = (response.data?.cart || response.data)?.items || [];
        setCartItemsCount(items.reduce((s: number, i: any) => s + (i.quantity || 0), 0));
      }
    } catch { setCartItemsCount(0); }
  };

  const fetchSponsoredProducts = async () => {
    const fetchFallback = async () => {
      const r = await productAPI.getAllProducts({ limit: 50, sortBy: 'rating', sortOrder: 'desc' });
      if (r.success) {
        const data = Array.isArray(r.data) ? r.data : (r.data.products || []);
        setSponsoredProducts(dedupeProductsBySeller(onlyShowableProducts(data)).slice(0, 10));
      } else { setSponsoredProducts([]); }
    };
    try {
      const response = await productAPI.getSponsoredProducts(10);
      const data = response.success
        ? (Array.isArray(response.data) ? response.data : (response.data.products || []))
        : [];
      if (data.length > 0) { setSponsoredProducts(data); }
      else { await fetchFallback(); }
    } catch { try { await fetchFallback(); } catch { setSponsoredProducts([]); } }
  };

  const fetchUnreadNotificationCount = async () => {
    try {
      const r = await notificationAPI.getUnreadCount();
      const count = r.data?.count ?? r.data?.data?.count ?? r.count ?? 0;
      setUnreadNotificationCount(count);
    } catch {}
  };

  const fetchUnreadMessagesCount = async () => {
    try {
      const r = await messageAPI.getUnreadCount();
      const count = r.data?.unreadCount ?? r.unreadCount ?? 0;
      setUnreadMessagesCount(count);
    } catch {}
  };

  const fetchUserProfile = async () => {
    try {
      const r = await userAPI.getProfile();
      if (r.success) setUserProfile(r.data);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const r = await categoriesAPI.getActiveCategories();
      if (r.success) {
        let data = r.data;
        if (data && !Array.isArray(data)) data = data.categories || data.data || [];
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data.map((c: any) => ({
            id: c._id || c.id,
            name: c.name.toLowerCase(),
            icon: '',
            label: c.name,
          })));
          return;
        }
      }
    } catch {}
  };

  const fetchTopVendors = async () => {
    const fetchFallback = async () => {
      const r = await vendorAPI.getAllVendors({ limit: 50 });
      if (r.success) {
        const formatted = parseVendors(extractVendorsFromResponse(r));
        setTopVendors(onlyWithImage(dedupeVendors(sortVendors(formatted, 'rating', 'desc'))).slice(0, 10));
      } else { setTopVendors([]); }
    };
    try {
      const r = await vendorAPI.getTopVendors();
      const formatted = r.success ? parseVendors(extractVendorsFromResponse(r)) : [];
      const withImg = onlyWithImage(dedupeVendors(sortVendors(formatted, 'rating', 'desc')));
      if (withImg.length > 0) { setTopVendors(withImg); }
      else { await fetchFallback(); }
    } catch { try { await fetchFallback(); } catch { setTopVendors([]); } }
  };

  const fetchAllVendors = async (params?: any) => {
    try {
      const r = await vendorAPI.getAllVendors(params);
      if (r.success) {
        const formatted = parseVendors(extractVendorsFromResponse(r));
        setAllVendors(formatted);
        setFilteredVendors(formatted);
        setHasActiveFilters(!!(params && Object.keys(params).length > 0));
      } else { setAllVendors([]); setFilteredVendors([]); }
    } catch { setAllVendors([]); setFilteredVendors([]); }
  };

  const searchVendors = async (query: string) => {
    if (!query.trim()) { setRecommendedServices([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    try {
      const r = await servicesAPI.searchServices({ query: query.trim() }).catch(() => ({ success: false, data: [] }));
      let apiResults: any[] = [];
      if (r.success) {
        const d = r.data;
        apiResults = Array.isArray(d) ? d : (d?.vendors || d?.data || []);
      }
      const q = query.trim().toLowerCase();
      const localMatches = allVendors.filter(v =>
        v.businessName.toLowerCase().includes(q) ||
        v.service?.toLowerCase().includes(q) ||
        v.vendorType?.toLowerCase().includes(q)
      );
      const seen = new Set(apiResults.map((v: any) => v._id));
      const localUnique = localMatches.filter(v => !seen.has(v.id)).map(v => ({
        _id: v.id, businessName: v.businessName, avatar: v.image,
        rating: v.rating, totalReviews: v.reviews, isVerified: v.isVerified,
      }));
      setRecommendedServices([...apiResults, ...localUnique]);
    } catch { setRecommendedServices([]); }
    finally { setSearchLoading(false); }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUserProfile(), fetchCategories(), fetchTopVendors(),
        fetchSponsoredProducts(), fetchCartCount(),
        fetchUnreadNotificationCount(), fetchUnreadMessagesCount(),
      ]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboardData();
    savedAPI.getSavedIds().then(res => {
      if (res?.data?.savedVendorIds) setFavoriteVendors(new Set(res.data.savedVendorIds));
    }).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCartCount();
      fetchUnreadNotificationCount();
      fetchUnreadMessagesCount();
      if (!socketService.isSocketConnected()) socketService.connect();
      const interval = setInterval(() => {
        fetchCartCount();
        fetchUnreadNotificationCount();
        fetchUnreadMessagesCount();
      }, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim()) searchVendors(searchQuery);
      else { setRecommendedServices([]); setSearchLoading(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Handlers ──
  const handleCategorySelect = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    navigation.navigate('AllVendors', { categoryId, categoryName: cat?.name });
  };

  const handleApplyFilters = async (newFilters: any) => {
    setFilters(newFilters);
    const params: any = {};
    if (newFilters.category) {
      const found = categories.find(c => c.id === newFilters.category || c.name.toLowerCase() === newFilters.category.toLowerCase());
      if (found) { params.category = found.id; setSelectedCategory(found.id); }
    }
    if (newFilters.searchName?.trim()) params.search = newFilters.searchName.trim();
    if (newFilters.minPrice) params.minPrice = newFilters.minPrice;
    if (newFilters.maxPrice) params.maxPrice = newFilters.maxPrice;
    if (newFilters.sortBy) { params.sortBy = newFilters.sortBy; params.sortOrder = newFilters.sortOrder || 'asc'; }
    await fetchAllVendors(params);
    setFilterModalVisible(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  }, []);

  const handleResetFilters = () => {
    setFilters({ searchName: '', category: '', minPrice: '', maxPrice: '', minDuration: '', maxDuration: '', status: 'all', sortBy: 'name', sortOrder: 'asc' });
    setSelectedCategory(''); setFilteredVendors([]); setHasActiveFilters(false);
  };

  const handleVendorPress = (vendorId: string) => navigation.navigate('VendorDetail', { vendorId });
  const handleFavoriteToggle = async (vendorId: string) => {
    const wasSaved = favoriteVendors.has(vendorId);
    setFavoriteVendors(prev => {
      const s = new Set(prev);
      s.has(vendorId) ? s.delete(vendorId) : s.add(vendorId);
      return s;
    });
    try {
      const res = await savedAPI.toggleVendor(vendorId);
      toast.success(res.data?.saved ? 'Saved' : 'Removed', res.message || 'Wishlist updated');
    } catch (err) {
      setFavoriteVendors(prev => {
        const s = new Set(prev);
        wasSaved ? s.add(vendorId) : s.delete(vendorId);
        return s;
      });
      toast.error('Error', handleAPIError(err).message);
    }
  };
  const handleProductPress = (productId: string) => navigation.navigate('ProductDetail', { productId });

  const calculateDiscount = (price: number, comparePrice?: number) =>
    comparePrice && comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;

  const getUserDisplayName = () =>
    userProfile?.user?.firstName || userProfile?.firstName || 'User';

  // ────────────────────────────────────────────────────────────
  return (
    // backgroundColor matches header white so status-bar area blends seamlessly
    <SafeAreaView style={[s.safe, { backgroundColor: CARD }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD} />

      {/* ── Sticky Header ── */}
      <View style={s.header}>
        {/* Greeting + icon row */}
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetName}>Hello, {getUserDisplayName()}</Text>
            <Text style={s.greetSub}>what are you looking for today?</Text>
          </View>
          <View style={s.headerIcons}>
            <TouchableOpacity
              style={s.iconCircle}
              onPress={() => navigation.navigate('Notifications' as never)}
              activeOpacity={0.75}
            >
              <Ionicons name="notifications" size={18} color={P} />
              {unreadNotificationCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeTxt}>{unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.iconCircle}
              onPress={() => navigation.navigate('ChatList')}
              activeOpacity={0.75}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={P} />
              {unreadMessagesCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeTxt}>{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</Text>
                </View>
              )}
            </TouchableOpacity>

          </View>
        </View>

        {/* Search row */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={17} color={HINT} />
            <TextInput
              style={s.searchInput}
              placeholder="Search services or professionals"
              placeholderTextColor={HINT}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={17} color={HINT} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => setFilterModalVisible(true)} activeOpacity={0.8}>
            <Ionicons name="options-outline" size={20} color="#fff" />
            {hasActiveFilters && <View style={s.filterActiveDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: BG, flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P} colors={[P]} />}
      >
        {/* ── Hero Banner Carousel ── */}
        {!searchQuery.trim() && (
          <View style={s.bannerSection}>
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={BANNER_W + BANNER_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 20, gap: BANNER_GAP }}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_W + BANNER_GAP));
                setBannerIndex(Math.max(0, Math.min(idx, BANNERS.length - 1)));
                startBannerTimer();
              }}
              scrollEventThrottle={16}
            >
              {BANNERS.map(b => (
                <TouchableOpacity
                  key={b.id}
                  activeOpacity={0.92}
                  style={[s.bannerCard, { width: BANNER_W, backgroundColor: '#F9F0FF' }]}
                  onPress={() => navigation.navigate('AllVendors')}
                >
                  {/* Left: text + CTA */}
                  <View style={s.bannerLeft}>
                    <Text style={[s.bannerHeadline, { color: '#1A1A1A' }]}>{b.headline}</Text>
                    <Text style={s.bannerSub}>{b.sub}</Text>
                    <TouchableOpacity
                      style={[s.bannerBtn, { backgroundColor: b.accentColor }]}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('AllVendors')}
                    >
                      <Text style={s.bannerBtnTxt}>{b.btn}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Right: image */}
                  <View style={s.bannerImgWrap}>
                    <Image source={b.image} style={s.bannerImg} resizeMode="cover" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Dot indicators */}
            <View style={s.dotsRow}>
              {BANNERS.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    bannerScrollRef.current?.scrollTo({ x: i * (BANNER_W + BANNER_GAP), animated: true });
                    setBannerIndex(i);
                    startBannerTimer();
                  }}
                  style={[s.dot, i === bannerIndex && s.dotActive]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Search Results ── */}
        {searchQuery.trim().length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Search Results</Text>
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Text style={s.seeAll}>Clear</Text>
              </TouchableOpacity>
            </View>

            {searchLoading ? (
              <View style={s.emptyBox}>
                <ActivityIndicator size="large" color={P} />
                <Text style={s.emptyTxt}>Searching...</Text>
              </View>
            ) : recommendedServices.length > 0 ? (
              <View style={{ gap: 10 }}>
                {recommendedServices.map((v, idx) => (
                  <TouchableOpacity
                    key={v._id || idx}
                    style={s.searchCard}
                    activeOpacity={0.8}
                    onPress={() => v._id && navigation.navigate('VendorDetail', { vendorId: v._id })}
                  >
                    <View style={s.searchAvatar}>
                      {v.avatar
                        ? <Image source={{ uri: v.avatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        : <Ionicons name="person" size={22} color={P} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                        <Text style={s.searchName} numberOfLines={1}>{v.businessName}</Text>
                        {v.isVerified && (
                          <View style={s.verifiedBadge}>
                            <Ionicons name="checkmark" size={8} color="#fff" />
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="star" size={11} color="#F59E0B" />
                        <Text style={s.searchRating}> {v.rating?.toFixed(1) || '0.0'}</Text>
                        <Text style={s.searchReviews}> ({v.totalReviews || 0} reviews)</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={HINT} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={s.emptyBox}>
                <Ionicons name="search-outline" size={44} color="#DDD" />
                <Text style={s.emptyTxt}>No results found</Text>
                <Text style={[s.emptyTxt, { fontSize: 12, marginTop: -4 }]}>Try different keywords</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Categories ── */}
        {!searchQuery.trim() && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Categories</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllServices')} activeOpacity={0.7}>
                <Text style={s.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            >
              {displayCategories.map(cat => {
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={s.catItem}
                    onPress={() =>
                      cat.id === 'more'
                        ? navigation.navigate('AllVendors')
                        : handleCategorySelect(cat.id)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={[s.catIconBox, isActive && s.catIconBoxActive]}>
                      {cat.id === 'more'
                        ? <MaterialCommunityIcons name="dots-grid" size={22} color={isActive ? '#fff' : P} />
                        : renderCatIcon(cat.name, isActive ? '#fff' : P)}
                    </View>
                    <Text style={[s.catLabel, isActive && { color: P, fontWeight: '700' }]} numberOfLines={1}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Active Filter Badge ── */}
        {!searchQuery.trim() && hasActiveFilters && filteredVendors.length > 0 && (
          <View style={s.filterBadge}>
            <Ionicons name="funnel" size={14} color={P} />
            <Text style={s.filterBadgeTxt}>
              {filteredVendors.length} filtered result{filteredVendors.length !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity onPress={handleResetFilters} style={s.clearFilterBtn} activeOpacity={0.7}>
              <Text style={s.clearFilterTxt}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Filtered Vendors ── */}
        {!searchQuery.trim() && hasActiveFilters && filteredVendors.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { marginBottom: 14 }]}>Filtered Vendors</Text>
            <View style={s.vendorGrid}>
              {filteredVendors.map(v => (
                <VendorCard
                  key={v.id}
                  vendor={{ id: v.id, businessName: v.businessName, image: v.image, service: v.service, rating: v.rating, reviews: v.reviews, isVerified: v.isVerified, vendorType: v.vendorType }}
                  width={(SW - 52) / 2}
                  onPress={() => handleVendorPress(v.id)}
                  onFavoritePress={() => handleFavoriteToggle(v.id)}
                  isFavorite={favoriteVendors.has(v.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── No Filter Results ── */}
        {!searchQuery.trim() && hasActiveFilters && filteredVendors.length === 0 && (
          <View style={[s.section, { alignItems: 'center', paddingVertical: 32 }]}>
            <Ionicons name="search-outline" size={48} color="#DDD" />
            <Text style={[s.emptyTxt, { marginTop: 12 }]}>No vendors match your filters</Text>
            <TouchableOpacity onPress={handleResetFilters} style={s.resetBtn} activeOpacity={0.8}>
              <Text style={s.resetBtnTxt}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Top Vendors ── */}
        {!searchQuery.trim() && !hasActiveFilters && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Top Vendors</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllVendors')} activeOpacity={0.7}>
                <Text style={s.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={P} style={{ marginTop: 16 }} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20 }}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              >
                {topVendors.length > 0 ? (
                  topVendors.map(v => (
                    <VendorCard
                      key={v.id}
                      vendor={{ id: v.id, businessName: v.businessName, image: v.image, service: v.service, rating: v.rating, reviews: v.reviews, isVerified: v.isVerified, vendorType: v.vendorType }}
                      width={SW * 0.44}
                      onPress={() => handleVendorPress(v.id)}
                      onFavoritePress={() => handleFavoriteToggle(v.id)}
                      isFavorite={favoriteVendors.has(v.id)}
                    />
                  ))
                ) : (
                  <View style={s.emptyBox}>
                    <Ionicons name="people-outline" size={44} color="#DDD" />
                    <Text style={s.emptyTxt}>No vendors available</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── For You (Products) ── */}
        {!searchQuery.trim() && !hasActiveFilters && sponsoredProducts.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>For you</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Marketplace' as never)} activeOpacity={0.7}>
                <Text style={s.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
              decelerationRate="fast"
              snapToInterval={SW * 0.48 + 14}
              snapToAlignment="start"
            >
              {sponsoredProducts.map(product => {
                const discount = calculateDiscount(product.price, product.compareAtPrice);
                const cardW = SW * 0.48;
                const sellerName =
                  product.seller?.vendorProfile?.businessName || product.seller?.fullName;
                const catName =
                  typeof product.category === 'object' ? product.category?.name : '';
                const inStock = product.stock > 0;
                const rating = product.rating || 0;

                return (
                  <TouchableOpacity
                    key={product._id}
                    onPress={() => handleProductPress(product._id)}
                    activeOpacity={0.88}
                    style={[s.productCard, { width: cardW }]}
                  >
                    {/* ── Product Image ── */}
                    <View style={s.productImgWrap}>
                      <Image
                        source={{ uri: product.images?.[0] }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />

                      {/* Bottom gradient scrim for readability */}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.28)']}
                        style={s.productScrim}
                      />

                      {/* Stock / New badge — top-left */}
                      <View style={[s.productBadge, { backgroundColor: inStock ? '#22C55E' : '#EF4444' }]}>
                        <Text style={s.productBadgeTxt}>{inStock ? 'In stock' : 'Out of stock'}</Text>
                      </View>

                      {/* Discount — bottom-left on scrim */}
                      {discount > 0 && (
                        <View style={s.discountBadge}>
                          <Text style={s.discountTxt}>-{discount}%</Text>
                        </View>
                      )}

                      {/* Heart — top-right */}
                      <TouchableOpacity style={s.productHeart} activeOpacity={0.75}>
                        <Ionicons name="heart-outline" size={15} color="#555" />
                      </TouchableOpacity>
                    </View>

                    {/* ── Product Info ── */}
                    <View style={s.productInfo}>
                      {catName ? (
                        <Text style={s.productCat} numberOfLines={1}>{catName}</Text>
                      ) : null}

                      <Text style={s.productName} numberOfLines={2}>{product.name}</Text>

                      {sellerName ? (
                        <Text style={s.productSeller} numberOfLines={1}>{sellerName}</Text>
                      ) : null}

                      {rating > 0 && (
                        <View style={s.productRatingRow}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={s.productRatingNum}> {rating.toFixed(1)}</Text>
                          {product.totalRatings ? (
                            <Text style={s.productRatingCount}> ({product.totalRatings} Reviews)</Text>
                          ) : null}
                        </View>
                      )}

                      {/* Price + add-to-cart row */}
                      <View style={s.productPriceRow}>
                        <View>
                          <Text style={s.productPrice}>
                            {formatPrice(product.finalPrice || product.price)}
                          </Text>
                          {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <Text style={s.productStrike}>{formatPrice(product.compareAtPrice)}</Text>
                          )}
                        </View>
                        <View style={s.addBtn}>
                          <Ionicons name="add" size={18} color="#fff" />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ── Filter Modal ── */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        categories={categories.map(c => ({ _id: c.id, name: c.name }))}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </SafeAreaView>
  );
};

// ── Styles ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CARD },

  // Header
  header: {
    backgroundColor: CARD,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  greetName: { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  greetSub: { fontSize: 13, color: HINT, marginTop: 2 },
  headerIcons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: CARD,
  },
  badgeTxt: { fontSize: 8, fontWeight: '800', color: '#fff' },

  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F7', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: TEXT },
  filterBtn: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: P,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  filterActiveDot: {
    position: 'absolute', top: -3, right: -3,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#F97316', borderWidth: 2, borderColor: CARD,
  },

  // Banner carousel
  bannerSection: { paddingTop: 20, paddingBottom: 2 },
  bannerCard: {
    borderRadius: 24, overflow: 'hidden',
    height: 190, flexDirection: 'row',
  },
  bannerLeft: {
    flex: 1, paddingLeft: 22, paddingRight: 10,
    justifyContent: 'center', paddingVertical: 20,
  },
  bannerHeadline: { fontSize: 19, fontWeight: '900', lineHeight: 25, marginBottom: 5 },
  bannerSub: { fontSize: 11, color: '#555', lineHeight: 16, marginBottom: 14 },
  bannerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50,
  },
  bannerBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
  bannerImgWrap: {
    width: 148,
  },
  bannerImg: { width: '100%', height: '100%' },

  // Dots
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, marginTop: 14, marginBottom: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB' },
  dotActive: { width: 22, height: 6, borderRadius: 3, backgroundColor: P },

  // Sections
  section: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 4 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  seeAll: { fontSize: 13, color: P, fontWeight: '700' },

  // Categories
  catItem: { alignItems: 'center', width: 64 },
  catIconBox: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center',
    marginBottom: 7, borderWidth: 1.5, borderColor: '#FBCFE8',
  },
  catIconBoxActive: { backgroundColor: P, borderColor: P },
  catLabel: { fontSize: 11, color: TEXT, textAlign: 'center', fontWeight: '500' },

  // Filter badge
  filterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: P_LIGHT, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FBCFE8',
  },
  filterBadgeTxt: { flex: 1, fontSize: 13, color: P, fontWeight: '600' },
  clearFilterBtn: {
    backgroundColor: P, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4,
  },
  clearFilterTxt: { fontSize: 12, color: '#fff', fontWeight: '700' },

  // Vendor grid
  vendorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Empty / reset
  emptyBox: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTxt: { fontSize: 13, color: HINT, fontWeight: '500', textAlign: 'center' },
  resetBtn: {
    backgroundColor: P, paddingHorizontal: 28, paddingVertical: 11,
    borderRadius: 50, marginTop: 8,
  },
  resetBtnTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },

  // Search result card
  searchCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  searchAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  searchName: { fontSize: 14, fontWeight: '700', color: TEXT },
  verifiedBadge: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center', marginLeft: 5,
  },
  searchRating: { fontSize: 11, color: '#475569', fontWeight: '600' },
  searchReviews: { fontSize: 11, color: HINT },

  // Product card
  productCard: {
    backgroundColor: CARD, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  productImgWrap: { width: '100%', height: 190, backgroundColor: '#F8F9FB' },
  productScrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 70,
  },
  productBadge: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  productBadgeTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },
  discountBadge: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: '#EF4444', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
  },
  discountTxt: { fontSize: 10, color: '#fff', fontWeight: '800' },
  productHeart: {
    position: 'absolute', top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },
  productInfo: { padding: 12 },
  productCat: { fontSize: 11, color: HINT, marginBottom: 2 },
  productName: { fontSize: 13, fontWeight: '700', color: TEXT, lineHeight: 19, marginBottom: 2 },
  productSeller: { fontSize: 11, color: HINT, marginBottom: 5 },
  productRatingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  productRatingNum: { fontSize: 11, color: '#475569', fontWeight: '600' },
  productRatingCount: { fontSize: 10, color: HINT },
  productPriceRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 8,
  },
  productPrice: { fontSize: 15, fontWeight: '800', color: P },
  productStrike: {
    fontSize: 11, color: '#CBD5E1',
    textDecorationLine: 'line-through', marginTop: 1,
  },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 4,
  },
});

export default ClientDashboardScreen;
