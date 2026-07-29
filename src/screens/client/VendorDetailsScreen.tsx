import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator,
  Dimensions, Image, Share, StatusBar, StyleSheet, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { vendorAPI, productAPI, handleAPIError } from '@/api/api';
import ServiceCard from '@/components/clientComponent/ServiceCard';
import ReviewCard from '@/components/clientComponent/ReviewCard';
import { toast } from '@/components/ui/Toast';

const { width: W } = Dimensions.get('window');
const HERO_H = 290;
const AVATAR_SIZE = 78;
const PINK = '#E04079';
const BG = '#fff';
const TEXT = '#111827';
const MUTED = '#6B7280';
const BORDER = '#F3F4F6';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VendorDetail'>;
type RouteP = RouteProp<RootStackParamList, 'VendorDetail'>;
type TabKey = 'portfolio' | 'services' | 'products' | 'reviews';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'services', label: 'Service' },
  { key: 'products', label: 'Product' },
  { key: 'reviews', label: 'Reviews' },
];

interface VendorData {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
  avatar?: string;
  isOnline: boolean;
  createdAt?: string;
  vendorProfile: {
    businessName: string;
    businessDescription?: string;
    vendorType: string;
    rating: number;
    totalRatings: number;
    totalReviews?: number;
    completedBookings: number;
    isVerified: boolean;
    profileImage?: string;
    coverImage?: string;
    portfolioImages?: string[];
    totalServices?: number;
    categories: Array<{ _id: string; name: string; icon?: string }>;
    location?: { address?: string; city?: string; state?: string; coordinates?: number[] };
  };
}

const formatVendorType = (type: string) => {
  if (type === 'home_service') return 'Home Service';
  if (type === 'in_shop') return 'In-salon';
  return 'Home & In-salon';
};

const getExperienceYears = (createdAt?: string): number => {
  if (!createdAt) return 1;
  const years = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365));
  return Math.max(1, years);
};

const IMG_COL = (W - 32 - 4) / 3;

// ── Portfolio grid ────────────────────────────────────────────────────────────
const PortfolioGrid: React.FC<{ images: string[]; bio?: string }> = ({ images, bio }) => (
  <View style={{ paddingTop: 4 }}>
    {!!bio && (
      <Text style={styles.bio}>{bio}</Text>
    )}
    {images.length > 0 ? (
      <View style={styles.grid}>
        {images.map((img, i) => (
          <Image
            key={i}
            source={{ uri: img }}
            style={[styles.gridImg, i % 3 === 1 && { marginHorizontal: 2 }]}
            resizeMode="cover"
          />
        ))}
      </View>
    ) : (
      <View style={styles.emptyBox}>
        <Ionicons name="images-outline" size={36} color={MUTED} />
        <Text style={styles.emptyTitle}>No portfolio yet</Text>
        <Text style={styles.emptyBody}>This vendor hasn't added portfolio images.</Text>
      </View>
    )}
  </View>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ icon: any; title: string; body: string }> = ({ icon, title, body }) => (
  <View style={styles.emptyBox}>
    <Ionicons name={icon} size={36} color={MUTED} />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyBody}>{body}</Text>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const VendorDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { vendorId } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('portfolio');
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getVendorDetail(vendorId);
      if (response.success || response.data?.success) {
        const d = response.data?.data || response.data;
        setVendor(d.vendor);
        setServices(d.services || []);
        setReviews(d.reviews || []);
        setStats(d.stats);
        try {
          const prodRes = await productAPI.getAllProducts({ seller: vendorId, limit: 50 });
          if (prodRes.success) {
            const prods = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.products || [];
            setProducts(prods);
          }
        } catch {}
      }
    } catch (error) {
      console.error('Vendor detail fetch error:', handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendorDetails(); }, [vendorId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVendorDetails().finally(() => setRefreshing(false));
  }, [vendorId]);

  const handleShareVendor = async () => {
    if (!vendor) return;
    try {
      await Share.share({
        message: `Check out ${vendor.vendorProfile.businessName} on LookReal!\nhttps://lookreal.beauty/vendors/${vendorId}`,
      });
    } catch {}
  };

  const handleMessageVendor = () => {
    if (!vendor?._id) return;
    navigation.navigate('ChatDetail', {
      otherUserId: vendor._id,
      otherUserName: vendor.vendorProfile.businessName,
      otherUserAvatar: vendor.vendorProfile.profileImage || vendor.avatar,
    });
  };

  const handleBookService = (serviceId: string) => {
    const service = services.find((s) => s._id === serviceId);
    if (!service || !vendor) return;
    if (service.isActive === false) {
      toast.warning('Unavailable', 'This service is currently not available.');
      return;
    }
    servicesAPI.trackView(serviceId).catch(() => {});
    navigation.navigate('CreateBooking', {
      service: {
        _id: service._id, name: service.name, description: service.description,
        basePrice: service.basePrice, duration: service.duration,
        category: service.category, isActive: service.isActive,
      },
      vendor: {
        _id: vendor._id,
        vendorProfile: {
          businessName: vendor.vendorProfile.businessName,
          vendorType: vendor.vendorProfile.vendorType,
          profileImage: vendor.vendorProfile.profileImage,
          location: vendor.vendorProfile.location as any,
        },
      },
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: TEXT, marginTop: 14 }}>Vendor not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={[styles.bookBtn, { marginTop: 20, paddingHorizontal: 28 }]}>
          <Text style={styles.bookBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const vp = vendor.vendorProfile;
  const heroImg = vp.coverImage || vp.profileImage || vendor.avatar;
  const avatarImg = vp.profileImage || vendor.avatar;
  const portfolioImages = vp.portfolioImages || [];
  const rating = vp.rating || 0;
  const reviewCount = vp.totalReviews || vp.totalRatings || 0;
  const bookings = vp.completedBookings || 0;
  const expYears = getExperienceYears(vendor.createdAt);
  const location = vp.location;
  const categoryName = vp.categories?.[0]?.name || 'Beauty Service';
  const vendorType = vp.vendorType;

  const STATS = [
    { value: rating.toFixed(1), label: 'Rating' },
    { value: reviewCount > 999 ? `${Math.floor(reviewCount / 1000)}k` : String(reviewCount), label: 'Reviews' },
    { value: bookings > 29 ? `${Math.floor(bookings / 10) * 10}+` : String(bookings), label: 'Bookings' },
    { value: `${expYears} Yr${expYears !== 1 ? 's' : ''}`, label: 'Experience' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <View style={{ height: HERO_H }}>
        {heroImg ? (
          <Image source={{ uri: heroImg }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#F5C6D8' }]} />
        )}

        {/* Nav buttons */}
        <View style={[styles.heroNav, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={styles.heroBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShareVendor} activeOpacity={0.85} style={styles.heroBtn}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Avatar — overlapping hero bottom */}
        <View style={styles.avatarWrap}>
          {avatarImg ? (
            <Image source={{ uri: avatarImg }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: PINK, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>
                {vp.businessName.charAt(0)}
              </Text>
            </View>
          )}
          {vendor.isOnline && <View style={styles.onlineDot} />}
        </View>
      </View>

      {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />
        }
      >
        {/* Space for avatar overlap */}
        <View style={{ marginTop: AVATAR_SIZE / 2 + 6, paddingHorizontal: 16 }}>

          {/* Name + verified */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
            <Text style={styles.vendorName} numberOfLines={1}>{vp.businessName}</Text>
            {vp.isVerified && (
              <Ionicons name="checkmark-circle" size={20} color={PINK} style={{ marginLeft: 6 }} />
            )}
          </View>

          {/* Subtitle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="storefront-outline" size={13} color={MUTED} />
            <Text style={styles.subtitle}>
              {' '}{categoryName}
              {location?.city ? ` • ${location.city}, Nigeria` : ''}
            </Text>
          </View>

          {/* Badges */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
            style={{ marginBottom: 16 }}
          >
            {vp.isVerified && (
              <View style={[styles.badge, { backgroundColor: '#FEE2F0', borderColor: '#FCA5C9' }]}>
                <Ionicons name="checkmark-circle" size={12} color={PINK} />
                <Text style={[styles.badgeText, { color: PINK }]}>Verified</Text>
              </View>
            )}
            {(vendorType === 'home_service' || vendorType === 'both') && (
              <View style={[styles.badge, { backgroundColor: '#FEE2F0', borderColor: '#FCA5C9' }]}>
                <Ionicons name="home-outline" size={12} color={PINK} />
                <Text style={[styles.badgeText, { color: PINK }]}>Home Service</Text>
              </View>
            )}
            {(vendorType === 'in_shop' || vendorType === 'both') && (
              <View style={[styles.badge, { backgroundColor: '#FEF9C3', borderColor: '#FDE68A' }]}>
                <Ionicons name="flash-outline" size={12} color="#B45309" />
                <Text style={[styles.badgeText, { color: '#B45309' }]}>In-salon</Text>
              </View>
            )}
            {vp.categories?.slice(0, 2).map(cat => (
              <View key={cat._id} style={[styles.badge, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
                <Text style={[styles.badgeText, { color: '#7C3AED' }]}>{cat.name}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {STATS.map((s, i) => (
              <React.Fragment key={s.label}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
                {i < STATS.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── TABS ────────────────────────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.75}
                style={styles.tabItem}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {active && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>

          {/* Portfolio */}
          {activeTab === 'portfolio' && (
            <PortfolioGrid images={portfolioImages} bio={vp.businessDescription} />
          )}

          {/* Services */}
          {activeTab === 'services' && (
            services.length > 0 ? (
              <View style={{ gap: 12 }}>
                {services.map(service => (
                  <ServiceCard key={service._id} service={service} onPress={() => handleBookService(service._id)} />
                ))}
              </View>
            ) : (
              <EmptyState icon="briefcase-outline" title="No services yet" body="This vendor hasn't added any services yet." />
            )
          )}

          {/* Products */}
          {activeTab === 'products' && (
            products.length > 0 ? (
              <View style={{ gap: 12 }}>
                {products.map((product: any) => (
                  <TouchableOpacity
                    key={product._id}
                    onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
                    activeOpacity={0.85}
                    style={styles.productCard}
                  >
                    <Image
                      source={product.images?.[0] ? { uri: product.images[0] } : require('../../../assets/app-icon.jpg')}
                      style={styles.productImg}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
                      <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
                      {product.category?.name && (
                        <Text style={styles.productCat}>{product.category.name}</Text>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <Text style={styles.productPrice}>
                          ₦{(product.finalPrice ?? product.price)?.toLocaleString()}
                        </Text>
                        {product.compareAtPrice > product.finalPrice && (
                          <Text style={styles.productCompare}>
                            ₦{product.compareAtPrice?.toLocaleString()}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={MUTED} style={{ marginRight: 12, alignSelf: 'center' }} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <EmptyState icon="bag-outline" title="No products yet" body="This vendor hasn't added any products yet." />
            )
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            reviews.length > 0 ? (
              <>
                {/* Rating summary */}
                <View style={styles.ratingCard}>
                  <View style={{ alignItems: 'center', marginRight: 20 }}>
                    <Text style={styles.ratingBig}>{rating.toFixed(1)}</Text>
                    <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
                      {[1,2,3,4,5].map(s => (
                        <Ionicons key={s} name={s <= Math.round(rating) ? 'star' : 'star-outline'}
                          size={13} color={s <= Math.round(rating) ? '#F59E0B' : '#E5E7EB'} />
                      ))}
                    </View>
                    <Text style={styles.ratingTotal}>{reviewCount} reviews</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {[5,4,3,2,1].map(star => {
                      const cnt = reviews.filter((r: any) => r.rating === star).length;
                      const pct = reviews.length ? (cnt / reviews.length) * 100 : 0;
                      return (
                        <View key={star} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                          <Text style={styles.starLabel}>{star}★</Text>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${pct}%` }]} />
                          </View>
                          <Text style={styles.starLabel}>{cnt}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  {reviews.slice(0, 5).map(review => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                </View>

                {reviews.length > 5 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Reviews', { userId: vendor._id, type: 'vendor' })}
                    activeOpacity={0.8}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>View All {reviewCount} Reviews</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <EmptyState icon="chatbubbles-outline" title="No reviews yet" body="Be the first to review this vendor." />
            )
          )}
        </View>
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ─────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity onPress={handleMessageVendor} activeOpacity={0.8} style={styles.chatBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={PINK} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.bookBtn}
          onPress={() => {
            if (services.length === 0) {
              toast.info('No Services', 'This vendor has no services yet.');
              return;
            }
            if (activeTab === 'services') {
              handleBookService(services[0]._id);
            } else {
              setActiveTab('services');
            }
          }}
        >
          <Text style={styles.bookBtnText}>
            {activeTab === 'services' && services.length > 0 ? 'Book Service' : 'Select Service'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VendorDetailScreen;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  /* Hero */
  heroNav: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16,
  },
  heroBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarWrap: {
    position: 'absolute', bottom: -(AVATAR_SIZE / 2),
    left: 20,
  },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3.5, borderColor: '#fff',
  },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff',
  },

  /* Profile info */
  vendorName: { fontSize: 21, fontWeight: '800', color: TEXT, flex: 1, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: MUTED, fontWeight: '500' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },

  /* Stats */
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF5F9', borderRadius: 16,
    paddingVertical: 14, marginBottom: 4,
    borderWidth: 1, borderColor: '#FDE8EF',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 19, fontWeight: '800', color: TEXT, marginBottom: 3 },
  statLabel: { fontSize: 11, color: MUTED, fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: '#FCC9DE' },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1.5, borderBottomColor: BORDER,
    marginTop: 16,
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: 13, position: 'relative',
  },
  tabText: { fontSize: 13, fontWeight: '500', color: MUTED },
  tabTextActive: { fontWeight: '700', color: TEXT },
  tabUnderline: {
    position: 'absolute', bottom: -1, left: '20%', right: '20%',
    height: 2.5, backgroundColor: PINK, borderRadius: 2,
  },

  /* Portfolio grid */
  bio: {
    fontSize: 14, color: MUTED, lineHeight: 22, marginBottom: 16,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridImg: { width: IMG_COL, height: IMG_COL, marginBottom: 2 },

  /* Product card */
  productCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER, flexDirection: 'row',
    elevation: 1,
  },
  productImg: { width: 100, height: 100, backgroundColor: '#F9FAFB' },
  productName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  productCat: { fontSize: 12, color: MUTED },
  productPrice: { fontSize: 16, fontWeight: '800', color: PINK },
  productCompare: { fontSize: 12, color: MUTED, textDecorationLine: 'line-through' },

  /* Reviews */
  ratingCard: {
    flexDirection: 'row', backgroundColor: '#FFF5F9',
    borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#FDE8EF',
  },
  ratingBig: { fontSize: 42, fontWeight: '800', color: PINK, letterSpacing: -1 },
  ratingTotal: { fontSize: 11, color: MUTED, marginTop: 4 },
  starLabel: { fontSize: 11, color: MUTED, width: 22, fontWeight: '500' },
  barTrack: {
    flex: 1, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3,
    overflow: 'hidden', marginHorizontal: 6,
  },
  barFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3 },
  seeAllBtn: {
    marginTop: 14, borderRadius: 13, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: PINK,
  },
  seeAllText: { color: PINK, fontWeight: '700', fontSize: 14 },

  /* Empty state */
  emptyBox: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24,
    backgroundColor: '#FAFAFA', borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginTop: 12, marginBottom: 5 },
  emptyBody: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },

  /* Bottom bar */
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
    gap: 10,
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06, shadowRadius: 10,
  },
  chatBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#FEE2F0',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FCA5C9',
  },
  bookBtn: {
    flex: 1, height: 50, backgroundColor: PINK,
    borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
});
