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
  Alert,
  Share,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { vendorAPI, handleAPIError } from '@/api/api';
import ServiceCard from '@/components/clientComponent/ServiceCard';
import ReviewCard from '@/components/clientComponent/ReviewCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  accent: '#7C3AED',
  gold: '#F59E0B',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
  successSoft: '#D1FAE5',
  blue: '#3B82F6',
  blueSoft: '#DBEAFE',
};

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
  vendorProfile: {
    businessName: string;
    businessDescription?: string;
    vendorType: string;
    rating: number;
    totalRatings: number;
    completedBookings: number;
    isVerified: boolean;
    categories: Array<{ _id: string; name: string; icon: string }>;
    location?: { address: string; city: string; state: string };
    serviceRadius?: number;
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StarRow: React.FC<{ rating: number; size?: number }> = ({ rating, size = 14 }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Ionicons
        key={s}
        name={s <= Math.round(rating) ? 'star' : 'star-outline'}
        size={size}
        color={s <= Math.round(rating) ? BRAND.gold : BRAND.borderStrong}
        style={{ marginRight: 1 }}
      />
    ))}
  </View>
);

const StatPill: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  bg: string;
}> = ({ icon, value, label, color, bg }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: BRAND.surface,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: BRAND.border,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
        android: { elevation: 2 },
      }),
    }}
  >
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 11,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
      }}
    >
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 }}>
      {value}
    </Text>
    <Text style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 2, fontWeight: '500' }}>{label}</Text>
  </View>
);

const TabBar: React.FC<{
  tabs: string[];
  active: string;
  onChange: (t: any) => void;
}> = ({ tabs, active, onChange }) => (
  <View
    style={{
      flexDirection: 'row',
      marginHorizontal: 20,
      backgroundColor: BRAND.surfaceAlt,
      borderRadius: 14,
      padding: 4,
      borderWidth: 1,
      borderColor: BRAND.border,
    }}
  >
    {tabs.map((tab) => {
      const isActive = active === tab;
      return (
        <TouchableOpacity
          key={tab}
          onPress={() => onChange(tab)}
          activeOpacity={0.75}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 11,
            alignItems: 'center',
            backgroundColor: isActive ? BRAND.surface : 'transparent',
            ...Platform.select({
              ios: isActive
                ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }
                : {},
              android: isActive ? { elevation: 2 } : {},
            }),
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: isActive ? '700' : '500',
              color: isActive ? BRAND.primary : BRAND.textMuted,
              textTransform: 'capitalize',
              letterSpacing: 0.1,
            }}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const InfoRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  sub?: string;
  iconColor?: string;
  iconBg?: string;
}> = ({ icon, text, sub, iconColor = BRAND.primary, iconBg = BRAND.primarySoft }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: iconBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: BRAND.textPrimary }}>{text}</Text>
      {sub && <Text style={{ fontSize: 12, color: BRAND.textSecondary, marginTop: 1 }}>{sub}</Text>}
    </View>
  </View>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  children,
  action,
}) => (
  <View
    style={{
      backgroundColor: BRAND.surface,
      borderRadius: 20,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: BRAND.border,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
        android: { elevation: 2 },
      }),
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, letterSpacing: -0.2 }}>
        {title}
      </Text>
      {action}
    </View>
    {children}
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
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'reviews'>('about');
  const [isFavorite, setIsFavorite] = useState(false);

  const scrollY = new Animated.Value(0);

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
        message: `Check out ${vendor.vendorProfile.businessName} on LookReal!\nhttps://lookreal.com/vendors/${vendorId}`,
        url: `https://lookreal.com/vendors/${vendorId}`,
        title: vendor.vendorProfile.businessName,
      });
    } catch { Alert.alert('Error', 'Failed to share vendor profile.'); }
  };

  const handleMessageVendor = () => {
    if (!vendor?._id) { Alert.alert('Error', 'Cannot open chat — vendor information is incomplete'); return; }
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
      Alert.alert('Service Unavailable', 'This service is currently not available.');
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>
            Loading vendor details…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vendor) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: BRAND.surfaceAlt,
              borderWidth: 1,
              borderColor: BRAND.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Ionicons name="alert-circle-outline" size={40} color={BRAND.textMuted} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 6 }}>
            Vendor not found
          </Text>
          <Text style={{ fontSize: 14, color: BRAND.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            This vendor profile doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={{
              backgroundColor: BRAND.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const heroHeight = 260;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
      <StatusBar barStyle="light-content" />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <View style={{ height: heroHeight, position: 'relative' }}>
        {vendor.avatar ? (
          <Image source={{ uri: vendor.avatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[BRAND.primary, '#B5315F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 64, fontWeight: '800', color: 'rgba(255,255,255,0.3)' }}>
                {vendor.vendorProfile.businessName.charAt(0)}
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* Gradient overlay at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 }}
        />

        {/* Top nav row */}
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
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                backgroundColor: 'rgba(0,0,0,0.35)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleShareVendor}
                activeOpacity={0.85}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsFavorite(!isFavorite)}
                activeOpacity={0.85}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  backgroundColor: isFavorite ? 'rgba(212,38,122,0.75)' : 'rgba(0,0,0,0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Online badge */}
        {vendor.isOnline && (
          <View style={{ position: 'absolute', top: 56 + insets.top, alignSelf: 'center' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: BRAND.success,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.5)',
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 6 }} />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>Online Now</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── PROFILE CARD (overlaps hero) ──────────────────────────────────── */}
      <View
        style={{
          marginTop: -28,
          marginHorizontal: 16,
          backgroundColor: BRAND.surface,
          borderRadius: 22,
          padding: 18,
          borderWidth: 1,
          borderColor: BRAND.border,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16 },
            android: { elevation: 8 },
          }),
          zIndex: 10,
        }}
      >
        {/* Name + verified */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
              <Text
                style={{
                  fontSize: 21,
                  fontWeight: '800',
                  color: BRAND.textPrimary,
                  letterSpacing: -0.4,
                  flexShrink: 1,
                }}
                numberOfLines={2}
              >
                {vendor.vendorProfile?.businessName || `${vendor.firstName} ${vendor.lastName}`}
              </Text>
              {vendor.vendorProfile.isVerified && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: BRAND.successSoft,
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                    borderRadius: 8,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={13} color={BRAND.success} />
                  <Text style={{ fontSize: 10, color: BRAND.success, fontWeight: '700', marginLeft: 3 }}>
                    Verified
                  </Text>
                </View>
              )}
            </View>

            {/* Rating row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <StarRow rating={vendor.vendorProfile.rating} size={14} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, marginLeft: 6 }}>
                {vendor.vendorProfile.rating.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 12, color: BRAND.textMuted, marginLeft: 4 }}>
                ({vendor.vendorProfile.totalRatings} reviews)
              </Text>
            </View>

            {/* Meta info */}
            <View style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="storefront-outline" size={13} color={BRAND.textMuted} style={{ marginRight: 5 }} />
                <Text style={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: '500' }}>
                  {formatVendorType(vendor.vendorProfile.vendorType)}
                </Text>
              </View>
              {vendor.vendorProfile?.location?.city && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location-outline" size={13} color={BRAND.textMuted} style={{ marginRight: 5 }} />
                  <Text style={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: '500' }}>
                    {vendor.vendorProfile.location.city}, {vendor.vendorProfile.location.state}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Category chips */}
        {vendor.vendorProfile.categories?.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: BRAND.border }}>
            {vendor.vendorProfile.categories.map((cat) => (
              <View
                key={cat._id}
                style={{
                  backgroundColor: BRAND.primarySoft,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: BRAND.primaryMuted,
                }}
              >
                <Text style={{ fontSize: 11, color: BRAND.primary, fontWeight: '600' }}>{cat.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── STAT PILLS ────────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          marginTop: 14,
          gap: 10,
        }}
      >
        <StatPill
          icon="checkmark-done-outline"
          value={vendor.vendorProfile.completedBookings}
          label="Completed"
          color={BRAND.success}
          bg={BRAND.successSoft}
        />
        <StatPill
          icon="briefcase-outline"
          value={stats?.totalServices || 0}
          label="Services"
          color={BRAND.blue}
          bg={BRAND.blueSoft}
        />
        <StatPill
          icon="chatbubbles-outline"
          value={stats?.totalReviews || 0}
          label="Reviews"
          color={BRAND.gold}
          bg="#FEF3C7"
        />
      </View>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <View style={{ marginTop: 16, marginBottom: 12 }}>
        <TabBar
          tabs={['about', 'services', 'reviews']}
          active={activeTab}
          onChange={setActiveTab}
        />
      </View>

      {/* ── TAB CONTENT ───────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />
        }
      >
        {/* ── ABOUT ──────────────────────────────────────────────────────── */}
        {activeTab === 'about' && (
          <View style={{ paddingTop: 4 }}>
            {vendor.vendorProfile.businessDescription && (
              <SectionCard title="About">
                <Text style={{ fontSize: 14, color: BRAND.textSecondary, lineHeight: 22 }}>
                  {vendor.vendorProfile.businessDescription}
                </Text>
              </SectionCard>
            )}

            {vendor.vendorProfile.location && (
              <SectionCard title="Location">
                <InfoRow
                  icon="location"
                  text={vendor.vendorProfile.location.address}
                  sub={`${vendor.vendorProfile.location.city}, ${vendor.vendorProfile.location.state}`}
                />
              </SectionCard>
            )}

            {vendor.vendorProfile.serviceRadius && (
              <View
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: BRAND.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  ...Platform.select({
                    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
                    android: { elevation: 2 },
                  }),
                }}
              >
                <InfoRow
                  icon="navigate-circle-outline"
                  text="Service Radius"
                  sub="Maximum coverage distance"
                />
                <View
                  style={{
                    backgroundColor: BRAND.primarySoft,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: BRAND.primaryMuted,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: BRAND.primary }}>
                    {vendor.vendorProfile.serviceRadius} km
                  </Text>
                </View>
              </View>
            )}

          
          </View>
        )}

        {/* ── SERVICES ───────────────────────────────────────────────────── */}
        {activeTab === 'services' && (
          <View style={{ paddingTop: 4 }}>
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
              <View
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 20,
                  padding: 40,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: BRAND.border,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 22,
                    backgroundColor: BRAND.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: BRAND.border,
                  }}
                >
                  <Ionicons name="briefcase-outline" size={34} color={BRAND.textMuted} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 6 }}>
                  No services yet
                </Text>
                <Text style={{ fontSize: 13, color: BRAND.textMuted, textAlign: 'center', lineHeight: 19 }}>
                  This vendor hasn't added any services yet.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── REVIEWS ────────────────────────────────────────────────────── */}
        {activeTab === 'reviews' && (
          <View style={{ paddingTop: 4 }}>
            {reviews.length > 0 ? (
              <>
                {/* Rating summary */}
                <View
                  style={{
                    backgroundColor: BRAND.surface,
                    borderRadius: 20,
                    padding: 18,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: BRAND.border,
                    ...Platform.select({
                      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
                      android: { elevation: 2 },
                    }),
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', color: BRAND.textPrimary }}>
                      Customer Reviews
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Reviews', { userId: vendor._id, type: 'vendor' })}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: BRAND.primarySoft,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 20,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: BRAND.primary, fontWeight: '600' }}>See All</Text>
                      <Ionicons name="chevron-forward" size={13} color={BRAND.primary} style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: BRAND.surfaceAlt,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: BRAND.border,
                    }}
                  >
                    {/* Big score */}
                    <View style={{ alignItems: 'center', marginRight: 20, minWidth: 72 }}>
                      <Text style={{ fontSize: 44, fontWeight: '800', color: BRAND.primary, letterSpacing: -2 }}>
                        {(vendor.vendorProfile.rating || 0).toFixed(1)}
                      </Text>
                      <StarRow rating={Math.round(vendor.vendorProfile.rating || 0)} size={13} />
                      <Text style={{ fontSize: 11, color: BRAND.textMuted, marginTop: 4, fontWeight: '500' }}>
                        {vendor.vendorProfile.totalRatings || 0} reviews
                      </Text>
                    </View>

                    {/* Bars */}
                    <View style={{ flex: 1 }}>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = reviews.filter((r: any) => r.rating === star).length;
                        const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                        return (
                          <View key={star} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                            <Text style={{ fontSize: 11, color: BRAND.textMuted, width: 20, fontWeight: '600' }}>
                              {star}★
                            </Text>
                            <View
                              style={{
                                flex: 1,
                                height: 6,
                                backgroundColor: BRAND.borderStrong,
                                borderRadius: 3,
                                overflow: 'hidden',
                                marginHorizontal: 8,
                              }}
                            >
                              <View
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  backgroundColor: pct > 0 ? BRAND.gold : 'transparent',
                                  borderRadius: 3,
                                }}
                              />
                            </View>
                            <Text style={{ fontSize: 11, color: BRAND.textMuted, width: 18, textAlign: 'right', fontWeight: '500' }}>
                              {count}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Recent reviews */}
                <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 10 }}>
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
                      backgroundColor: BRAND.surface,
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: BRAND.primary,
                    }}
                  >
                    <Text style={{ color: BRAND.primary, fontWeight: '700', fontSize: 14 }}>
                      View All {reviews.length} Reviews
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View
                style={{
                  backgroundColor: BRAND.surface,
                  borderRadius: 20,
                  padding: 40,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: BRAND.border,
                }}
              >
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 22,
                    backgroundColor: BRAND.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: BRAND.border,
                  }}
                >
                  <Ionicons name="chatbubbles-outline" size={34} color={BRAND.textMuted} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 6 }}>
                  No reviews yet
                </Text>
                <Text style={{ fontSize: 13, color: BRAND.textMuted, textAlign: 'center', lineHeight: 19 }}>
                  Be the first to review this vendor
                </Text>
                {stats?.totalReviews > 0 && (
                  <TouchableOpacity
                    onPress={fetchVendorDetails}
                    activeOpacity={0.8}
                    style={{
                      marginTop: 16,
                      backgroundColor: BRAND.primary,
                      paddingHorizontal: 22,
                      paddingVertical: 10,
                      borderRadius: 22,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Refresh Reviews</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ─────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: BRAND.surface,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: BRAND.border,
          flexDirection: 'row',
          gap: 10,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 10 },
            android: { elevation: 10 },
          }),
        }}
      >
        {/* Message button */}
        <TouchableOpacity
          onPress={handleMessageVendor}
          activeOpacity={0.8}
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: BRAND.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: BRAND.primaryMuted,
          }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={BRAND.primary} />
        </TouchableOpacity>

        {/* Book / CTA */}
        <TouchableOpacity
          onPress={() => {
            if (services.length === 0) {
              Alert.alert('No Services', 'This vendor has not added any services yet.');
              return;
            }
            if (activeTab === 'services') {
              handleBookService(services[0]._id);
            } else {
              setActiveTab('services');
            }
          }}
          activeOpacity={0.85}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={[BRAND.primary, '#B5315F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 52,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Ionicons
              name={activeTab === 'services' && services.length > 0 ? 'calendar-outline' : 'grid-outline'}
              size={18}
              color="#fff"
            />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 }}>
              {activeTab === 'services' && services.length > 0 ? 'Select Service' : 'Book Now'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VendorDetailScreen;