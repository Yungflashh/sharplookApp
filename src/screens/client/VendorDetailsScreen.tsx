import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image,
  Share,
  Platform,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { vendorAPI, productAPI, handleAPIError } from '@/api/api';
import ServiceCard from '@/components/clientComponent/ServiceCard';
import ReviewCard from '@/components/clientComponent/ReviewCard';
import { toast } from '@/components/ui/Toast';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
const PINK = '#E91E63';
const BG = '#FFF5F8';
const GOLD = '#F59E0B';

// ─── Types ───────────────────────────────────────────────────────────────────
type Nav = NativeStackNavigationProp<RootStackParamList, 'VendorDetail'>;
type RouteP = RouteProp<RootStackParamList, 'VendorDetail'>;

interface VendorData {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
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
    coverImage?: string;
    portfolioImages?: string[];
    yearsOfExperience?: number;
    categories: Array<{ _id: string; name: string; icon: string }>;
    location?: { address: string; city: string; state: string; coordinates?: number[] };
  };
}

// ─── StarRow helper ───────────────────────────────────────────────────────────
const StarRow: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons
        key={s}
        name={s <= Math.round(rating) ? 'star' : 'star-outline'}
        size={size}
        color={s <= Math.round(rating) ? GOLD : '#E5E7EB'}
        style={{ marginRight: 1 }}
      />
    ))}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'Portfolio' | 'Service' | 'Product' | 'Reviews'>('Portfolio');
  const [isFavorite, setIsFavorite] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Haversine formula to calculate distance between two coordinates
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

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
        setPortfolioImages(d.vendor?.vendorProfile?.portfolioImages || []);

        try {
          const prodRes = await productAPI.getAllProducts({ seller: vendorId, limit: 50 });
          if (prodRes.success) {
            const prods = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.products || [];
            setProducts(prods);
          }
        } catch (e) {
          console.log('Vendor products fetch error:', e);
        }
      }
    } catch (error) {
      console.error('Vendor detail fetch error:', handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendorDetails(); }, [vendorId]);

  useEffect(() => {
    if (!vendor?.vendorProfile?.location?.coordinates) return;
    const coords = vendor.vendorProfile.location.coordinates;
    if (!coords || coords.length < 2) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        const dist = getDistanceKm(pos.coords.latitude, pos.coords.longitude, coords[1], coords[0]);
        setDistanceKm(dist);
      } catch (e) {
        console.log('Distance calc error:', e);
      }
    })();
  }, [vendor]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVendorDetails().finally(() => setRefreshing(false));
  }, [vendorId]);

  const handleShareVendor = async () => {
    if (!vendor) return;
    try {
      await Share.share({
        message: `Check out ${vendor.vendorProfile.businessName} on LookReal!\nhttps://lookreal.beauty/share/vendor/${vendorId}`,
        url: `https://lookreal.beauty/share/vendor/${vendorId}`,
        title: vendor.vendorProfile.businessName,
      });
    } catch { toast.error('Error', 'Failed to share vendor profile.'); }
  };

  const handleMessageVendor = () => {
    if (!vendor?._id) { toast.error('Error', 'Cannot open chat — vendor information is incomplete'); return; }
    navigation.navigate('ChatDetail', {
      otherUserId: vendor._id,
      otherUserName: vendor.vendorProfile.businessName,
      otherUserAvatar: vendor.avatar,
    });
  };

  const handleBookService = (serviceId: string) => {
    const service = services.find((s) => s._id === serviceId);
    if (!service || !vendor) return;
    if (service.isActive === false) {
      toast.warning('Service Unavailable', 'This service is currently not available.');
      return;
    }
    navigation.navigate('CreateBooking', {
      service: {
        _id: service._id,
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        duration: service.duration,
        category: service.category,
        isActive: service.isActive,
        image: service.images?.[0] || service.image || undefined,
      },
      vendor: {
        _id: vendor._id,
        vendorProfile: {
          businessName: vendor.vendorProfile.businessName,
          vendorType: vendor.vendorProfile.vendorType,
          location: vendor.vendorProfile.location,
        },
      },
    });
  };

  const formatVendorType = (type: string) => {
    const map: Record<string, string> = {
      home_service: 'Home Service',
      in_shop: 'In-Shop',
      both: 'Home & In-Shop',
    };
    return map[type] || 'Service Available';
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PINK} />
          <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 12, fontWeight: '500' }}>
            Loading vendor details…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vendor) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={56} color="#9CA3AF" style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
            Vendor not found
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
            This vendor profile doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={{ backgroundColor: PINK, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const vendorProfile = vendor.vendorProfile;
  const vendorType = vendorProfile.vendorType;
  const isVerified = vendorProfile.isVerified;
  const businessName = vendorProfile.businessName || `${vendor.firstName} ${vendor.lastName}`;

  // Hero image: coverImage → avatar → gradient
  const heroImageUri = vendorProfile.coverImage || vendor.avatar || null;

  // Category display
  const categoryName = vendorProfile.categories?.[0]?.name || formatVendorType(vendorType);
  const locationCity = vendorProfile.location?.city || '';
  const locationState = vendorProfile.location?.state || '';
  const locationLine = [categoryName, locationCity && locationState ? `${locationCity}, ${locationState}` : locationCity || locationState].filter(Boolean).join(' · ');

  // Stats
  const rating = vendorProfile.rating || 0;
  const totalReviews = vendorProfile.totalRatings || vendorProfile.totalReviews || 0;
  const completedBookings = vendorProfile.completedBookings || 0;

  // Experience label from vendor-entered value
  const expYears = vendorProfile.yearsOfExperience;
  let yearsExp = 'New';
  if (expYears !== undefined && expYears !== null) {
    if (expYears === 0) yearsExp = '<1 Yr';
    else if (expYears >= 10) yearsExp = '10+ Yrs';
    else yearsExp = `${expYears}+ Yrs`;
  }

  // Portfolio grid
  const GRID_GAP = 4;
  const GRID_PADDING = 20; // left + right padding
  const imgSize = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
  const displayedPortfolio = portfolioImages.slice(0, 9);
  const hasMorePortfolio = portfolioImages.length > 9;

  const TABS: Array<'Portfolio' | 'Service' | 'Product' | 'Reviews'> = ['Portfolio', 'Service', 'Product', 'Reviews'];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />
        }
      >
        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <View style={{ height: 280, position: 'relative' }}>
          {heroImageUri ? (
            <Image source={{ uri: heroImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={['#E91E63', '#C2185B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 72, fontWeight: '800', color: 'rgba(255,255,255,0.3)' }}>
                {businessName.charAt(0)}
              </Text>
            </LinearGradient>
          )}

          {/* Top nav — back + heart + share */}
          <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingTop: 8,
              }}
            >
              {/* Back */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>

              {/* Heart + Share */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setIsFavorite(!isFavorite)}
                  activeOpacity={0.85}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShareVendor}
                  activeOpacity={0.85}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="share-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          {/* Circular vendor avatar — overlaps bottom-left edge of hero */}
          <View
            style={{
              position: 'absolute',
              bottom: -42,
              left: 20,
              width: 84,
              height: 84,
              borderRadius: 42,
              borderWidth: 3,
              borderColor: PINK,
              backgroundColor: '#fff',
              overflow: 'hidden',
            }}
          >
            {vendor.avatar ? (
              <Image source={{ uri: vendor.avatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={['#E91E63', '#C2185B']}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff' }}>
                  {businessName.charAt(0)}
                </Text>
              </LinearGradient>
            )}
          </View>
        </View>

        {/* ── MAIN CONTENT (paddingTop clears avatar overhang) ──────────────── */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>

          {/* Business name + verified */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: '#1A1A1A',
                letterSpacing: -0.4,
                flexShrink: 1,
              }}
              numberOfLines={2}
            >
              {businessName}
            </Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={20} color={PINK} />
            )}
          </View>

          {/* Category · Location */}
          {locationLine !== '' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 }}>
              <Ionicons name="storefront-outline" size={13} color="#9CA3AF" />
              <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500', flexShrink: 1 }}>
                {locationLine}
              </Text>
            </View>
          )}

          {/* Tags row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {isVerified && (
              <View
                style={{
                  backgroundColor: '#FCE4EC',
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: PINK,
                }}
              >
                <Text style={{ fontSize: 12, color: PINK, fontWeight: '600' }}>Verified</Text>
              </View>
            )}
            {(vendorType === 'home_service' || vendorType === 'both') && (
              <View
                style={{
                  backgroundColor: '#EDE9FE',
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: '#C4B5FD',
                }}
              >
                <Text style={{ fontSize: 12, color: '#7C3AED', fontWeight: '600' }}>Home Service</Text>
              </View>
            )}
            {(vendorType === 'in_shop' || vendorType === 'both') && (
              <View
                style={{
                  backgroundColor: '#D1FAE5',
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: '#6EE7B7',
                }}
              >
                <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>In-salon</Text>
              </View>
            )}
          </View>

          {/* ── STATS STRIP ─────────────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: 18,
              backgroundColor: '#fff',
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#F3F4F6',
            }}
          >
            {/* Rating */}
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A' }}>
                {rating.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2 }}>Rating</Text>
              <Ionicons name="star" size={12} color={GOLD} style={{ marginTop: 2 }} />
            </View>

            <View style={{ width: 1, backgroundColor: '#E5E7EB', marginVertical: 12 }} />

            {/* Reviews */}
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A' }}>
                {totalReviews}
              </Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2 }}>Reviews</Text>
            </View>

            <View style={{ width: 1, backgroundColor: '#E5E7EB', marginVertical: 12 }} />

            {/* Bookings */}
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A' }}>
                {completedBookings > 0 ? `${completedBookings}+` : completedBookings}
              </Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2 }}>Bookings</Text>
            </View>

            <View style={{ width: 1, backgroundColor: '#E5E7EB', marginVertical: 12 }} />

            {/* Experience */}
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A1A1A' }}>{yearsExp}</Text>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2 }}>Experience</Text>
            </View>
          </View>

          {/* ── UNDERLINE TABS ──────────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.75}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: isActive ? 2 : 0,
                    borderBottomColor: isActive ? PINK : 'transparent',
                    marginBottom: -1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? '800' : '500',
                      color: isActive ? PINK : '#6B7280',
                    }}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
          <View style={{ marginTop: 16 }}>

            {/* ── PORTFOLIO ─────────────────────────────────────────────────── */}
            {activeTab === 'Portfolio' && (
              <View>
                {/* Business description */}
                {vendorProfile.businessDescription ? (
                  <Text style={{ fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 16 }}>
                    {vendorProfile.businessDescription}
                  </Text>
                ) : null}

                {displayedPortfolio.length > 0 ? (
                  <>
                    {/* 3-column grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
                      {displayedPortfolio.map((uri, idx) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.85}
                          onPress={() => openLightbox(portfolioImages, idx)}
                        >
                          <Image
                            source={{ uri }}
                            style={{
                              width: imgSize,
                              height: imgSize,
                              borderRadius: 10,
                              backgroundColor: '#F3F4F6',
                            }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* View All button */}
                    {hasMorePortfolio && (
                      <TouchableOpacity
                        onPress={() => setShowPortfolioModal(true)}
                        activeOpacity={0.8}
                        style={{
                          marginTop: 14,
                          borderWidth: 1.5,
                          borderColor: PINK,
                          borderRadius: 14,
                          paddingVertical: 13,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: PINK, fontWeight: '700', fontSize: 14 }}>
                          View All {portfolioImages.length} Photos
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="images-outline" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                      No portfolio yet
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                      This vendor hasn't added any portfolio images yet.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── SERVICE ───────────────────────────────────────────────────── */}
            {activeTab === 'Service' && (
              <View>
                {services.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {services.map((service) => (
                      <ServiceCard
                        key={service._id}
                        service={service}
                        onPress={() => handleBookService(service._id)}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="briefcase-outline" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                      No services yet
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                      This vendor hasn't added any services yet.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── PRODUCT ───────────────────────────────────────────────────── */}
            {activeTab === 'Product' && (
              <View>
                {products.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {products.map((product: any) => (
                      <TouchableOpacity
                        key={product._id}
                        onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
                        activeOpacity={0.85}
                        style={{
                          backgroundColor: '#fff',
                          borderRadius: 18,
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: '#F3F4F6',
                          flexDirection: 'row',
                          ...Platform.select({
                            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
                            android: { elevation: 2 },
                          }),
                        }}
                      >
                        <Image
                          source={product.images?.[0] ? { uri: product.images[0] } : require('../../../assets/app-icon.jpg')}
                          style={{ width: 100, height: 100, backgroundColor: '#F9FAFB' }}
                          resizeMode="cover"
                        />
                        <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
                          <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                            {product.name}
                          </Text>
                          {product.category?.name && (
                            <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>
                              {product.category.name}
                            </Text>
                          )}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: PINK }}>
                              ₦{(product.finalPrice ?? product.price)?.toLocaleString()}
                            </Text>
                            {product.compareAtPrice > product.finalPrice && (
                              <Text style={{ fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' }}>
                                ₦{product.compareAtPrice?.toLocaleString()}
                              </Text>
                            )}
                          </View>
                          {product.rating > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                              <Ionicons name="star" size={12} color={GOLD} />
                              <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>
                                {product.rating.toFixed(1)}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ justifyContent: 'center', paddingRight: 12 }}>
                          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="bag-outline" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                      No products yet
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                      This vendor hasn't added any products yet.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── REVIEWS ───────────────────────────────────────────────────── */}
            {activeTab === 'Reviews' && (
              <View>
                {reviews.length > 0 ? (
                  <>
                    {/* Rating summary */}
                    <View
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        padding: 18,
                        marginBottom: 14,
                        borderWidth: 1,
                        borderColor: '#F3F4F6',
                        ...Platform.select({
                          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
                          android: { elevation: 2 },
                        }),
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Customer Reviews</Text>
                        <TouchableOpacity
                          onPress={() => navigation.navigate('Reviews', { userId: vendor._id, type: 'vendor' })}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FFF5F8',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 20,
                          }}
                        >
                          <Text style={{ fontSize: 12, color: PINK, fontWeight: '600' }}>See All</Text>
                          <Ionicons name="chevron-forward" size={13} color={PINK} style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#F9FAFB',
                          borderRadius: 14,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: '#F3F4F6',
                        }}
                      >
                        <View style={{ alignItems: 'center', marginRight: 20, minWidth: 72 }}>
                          <Text style={{ fontSize: 44, fontWeight: '800', color: PINK, letterSpacing: -2 }}>
                            {(rating || 0).toFixed(1)}
                          </Text>
                          <StarRow rating={Math.round(rating || 0)} size={13} />
                          <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: '500' }}>
                            {totalReviews} reviews
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = reviews.filter((r: any) => r.rating === star).length;
                            const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                            return (
                              <View key={star} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                <Text style={{ fontSize: 11, color: '#9CA3AF', width: 20, fontWeight: '600' }}>
                                  {star}★
                                </Text>
                                <View
                                  style={{
                                    flex: 1,
                                    height: 6,
                                    backgroundColor: '#E5E7EB',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                    marginHorizontal: 8,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: `${pct}%`,
                                      height: '100%',
                                      backgroundColor: pct > 0 ? GOLD : 'transparent',
                                      borderRadius: 3,
                                    }}
                                  />
                                </View>
                                <Text style={{ fontSize: 11, color: '#9CA3AF', width: 18, textAlign: 'right', fontWeight: '500' }}>
                                  {count}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>

                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 }}>
                      Recent Reviews
                    </Text>
                    <View style={{ gap: 10 }}>
                      {reviews.slice(0, 3).map((review) => (
                        <ReviewCard key={review._id} review={review} />
                      ))}
                    </View>

                    {reviews.length > 3 && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Reviews', { userId: vendor._id, type: 'vendor' })}
                        activeOpacity={0.8}
                        style={{
                          marginTop: 12,
                          backgroundColor: '#fff',
                          borderRadius: 14,
                          paddingVertical: 14,
                          alignItems: 'center',
                          borderWidth: 1.5,
                          borderColor: PINK,
                        }}
                      >
                        <Text style={{ color: PINK, fontWeight: '700', fontSize: 14 }}>
                          View All {reviews.length} Reviews
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
                      No reviews yet
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                      Be the first to review this vendor.
                    </Text>
                  </View>
                )}
              </View>
            )}

          </View>
        </View>
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ─────────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: BG,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderTopWidth: 1,
          borderTopColor: '#FCE4EC',
        }}
      >
        {/* Chat bubble */}
        <TouchableOpacity
          onPress={handleMessageVendor}
          activeOpacity={0.8}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: '#FCE4EC',
            borderWidth: 1,
            borderColor: '#F9A8D4',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={PINK} />
        </TouchableOpacity>

        {/* Select Service gradient button */}
        <TouchableOpacity
          onPress={() => {
            if (activeTab === 'Service' && services.length > 0) {
              handleBookService(services[0]._id);
            } else {
              setActiveTab('Service');
            }
          }}
          activeOpacity={0.85}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={['#E91E63', '#C2185B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 52,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Select Service</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── PORTFOLIO FULL-SCREEN MODAL ─────────────────────────────────────── */}
      <Modal
        visible={showPortfolioModal}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setShowPortfolioModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#FCE4EC',
            }}
          >
            <TouchableOpacity
              onPress={() => setShowPortfolioModal(false)}
              activeOpacity={0.8}
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#111827' }}>
              Portfolio
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Subtitle */}
          <View style={{ alignItems: 'center', paddingVertical: 8, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>{businessName}</Text>
            {isVerified && <Ionicons name="checkmark-circle" size={14} color={PINK} />}
          </View>

          {/* Grid */}
          <FlatList
            data={portfolioImages}
            keyExtractor={(_, idx) => String(idx)}
            numColumns={3}
            contentContainerStyle={{ padding: 4 }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setShowPortfolioModal(false);
                  openLightbox(portfolioImages, index);
                }}
                style={{ margin: 2, flex: 1 / 3 }}
              >
                <Image
                  source={{ uri: item }}
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    borderRadius: 10,
                    backgroundColor: '#F3F4F6',
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* ── IMAGE LIGHTBOX MODAL ────────────────────────────────────────────── */}
      <Modal
        visible={showLightbox}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setShowLightbox(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Close button — uses insets so it always clears the status bar */}
          <TouchableOpacity
            onPress={() => setShowLightbox(false)}
            activeOpacity={0.8}
            style={{
              position: 'absolute',
              top: insets.top + 10,
              right: 16,
              zIndex: 20,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Paged images */}
          <FlatList
            data={lightboxImages}
            keyExtractor={(_, idx) => String(idx)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={lightboxIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setLightboxIndex(idx);
            }}
            renderItem={({ item }) => (
              <View
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={{ uri: item }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          {/* Index indicator */}
          <View
            style={{
              position: 'absolute',
              bottom: insets.bottom + 24,
              left: 0,
              right: 0,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
              {lightboxIndex + 1} / {lightboxImages.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VendorDetailScreen;
