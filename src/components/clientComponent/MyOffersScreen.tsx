import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { offerAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079',
  primaryDark: '#B5315F',
  primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5',
  primaryMuted: '#FCDCE9',
  blue: '#3B82F6',
  blueSoft: '#DBEAFE',
  green: '#10B981',
  greenSoft: '#D1FAE5',
  gold: '#F59E0B',
  goldSoft: '#FEF3C7',
  orange: '#F97316',
  orangeSoft: '#FFEDD5',
  purple: '#8B5CF6',
  purpleSoft: '#EDE9FE',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#F3F4F6',
  borderStrong: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Offer {
  _id: string;
  title: string;
  description: string;
  proposedPrice: number;
  status: string;
  serviceType: 'home' | 'shop' | 'both';
  responses: any[];
  createdAt: string;
  expiresAt: string;
  category: { name: string };
  location?: { address: string; city: string; state: string };
}

// ─── Config maps ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }
> = {
  open: { bg: BRAND.greenSoft, text: '#065F46', dot: BRAND.green, icon: 'checkmark-circle-outline', iconColor: BRAND.green },
  accepted: { bg: BRAND.blueSoft, text: '#1E40AF', dot: BRAND.blue, icon: 'thumbs-up-outline', iconColor: BRAND.blue },
  closed: { bg: BRAND.border, text: BRAND.textSecondary, dot: BRAND.textMuted, icon: 'close-circle-outline', iconColor: BRAND.textMuted },
};

const SERVICE_TYPE_CONFIG: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string }
> = {
  home: { icon: 'home-outline', label: 'Home Service', color: BRAND.green, bg: BRAND.greenSoft },
  shop: { icon: 'storefront-outline', label: 'In-Shop', color: BRAND.blue, bg: BRAND.blueSoft },
  both: { icon: 'repeat-outline', label: 'Flexible', color: BRAND.gold, bg: BRAND.goldSoft },
};

const getStatus = (s: string) =>
  STATUS_CONFIG[s.toLowerCase()] || STATUS_CONFIG.closed;

const getServiceType = (t: string) =>
  SERVICE_TYPE_CONFIG[t] || { icon: 'help-circle-outline' as const, label: 'Unknown', color: BRAND.textMuted, bg: BRAND.border };

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Compact info chip used inside cards */
const InfoChip: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  iconColor: string;
  bg: string;
}> = ({ icon, label, value, iconColor, bg }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: bg,
      borderRadius: 12,
      paddingHorizontal: 11,
      paddingVertical: 9,
      flex: 1,
    }}
  >
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: `${iconColor}22`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
      }}
    >
      <Ionicons name={icon} size={13} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: '700',
          color: iconColor,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: 1,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '800', color: BRAND.textPrimary }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

/** Quick stat tile */
const StatTile: React.FC<{
  value: number;
  label: string;
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = ({ value, label, color, bg, icon }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: bg,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: `${color}33`,
    }}
  >
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: `${color}22`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
      }}
    >
      <Ionicons name={icon} size={15} color={color} />
    </View>
    <Text style={{ fontSize: 22, fontWeight: '800', color, letterSpacing: -0.5 }}>{value}</Text>
    <Text style={{ fontSize: 11, color, fontWeight: '600', marginTop: 2 }}>{label}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MyOffersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await offerAPI.getMyOffers({ page: 1, limit: 50 });
      if (response.success) {
        const data = response.data.offers || response.data || [];
        setOffers(
          data.filter((o: Offer) => {
            const isExpired = o.status.toLowerCase() === 'expired';
            return !isExpired && new Date(o.expiresAt) > new Date();
          })
        );
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);
  useFocusEffect(useCallback(() => { fetchOffers(); }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers().finally(() => setRefreshing(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatPrice = (p: number) => `₦${p.toLocaleString()}`;

  const openCount = offers.filter((o) => o.status.toLowerCase() === 'open').length;
  const acceptedCount = offers.filter((o) => o.status.toLowerCase() === 'accepted').length;
  const totalResponses = offers.reduce((s, o) => s + o.responses.length, 0);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>
            Loading your offers…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: BRAND.surface,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: BRAND.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 3 },
          }),
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
            <Text style={{ fontSize: 22, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.5 }}>
              My Offers
            </Text>
            <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
              {offers.length} active {offers.length === 1 ? 'offer' : 'offers'}
            </Text>
          </View>
        </View>

        {/* Create offer */}
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateOffer')}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 13,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={[BRAND.primary, BRAND.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 9,
              gap: 5,
            }}
          >
            <Ionicons name="add" size={17} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>New Offer</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
          />
        }
      >
        {offers.length > 0 ? (
          <>
            {/* ── STATS ──────────────────────────────────────────────────── */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <StatTile
                value={openCount}
                label="Open"
                color={BRAND.green}
                bg={BRAND.greenSoft}
                icon="radio-button-on-outline"
              />
              <StatTile
                value={acceptedCount}
                label="Accepted"
                color={BRAND.blue}
                bg={BRAND.blueSoft}
                icon="thumbs-up-outline"
              />
              <StatTile
                value={totalResponses}
                label="Responses"
                color={BRAND.primary}
                bg={BRAND.primarySoft}
                icon="chatbubbles-outline"
              />
            </View>

            {/* ── OFFER CARDS ────────────────────────────────────────────── */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: BRAND.textMuted,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Active Offers
            </Text>

            {offers.map((offer) => {
              const sc = getStatus(offer.status);
              const stc = getServiceType(offer.serviceType);

              return (
                <TouchableOpacity
                  key={offer._id}
                  onPress={() => navigation.navigate('OfferDetail', { offerId: offer._id })}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: BRAND.surface,
                    borderRadius: 20,
                    marginBottom: 14,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: BRAND.border,
                    ...Platform.select({
                      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
                      android: { elevation: 3 },
                    }),
                  }}
                >
                  {/* Status accent bar */}
                  <View style={{ height: 3, backgroundColor: sc.dot }} />

                  <View style={{ padding: 16 }}>
                    {/* Card header */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                      {/* Icon badge */}
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 13,
                          backgroundColor: BRAND.primarySoft,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                          borderWidth: 1,
                          borderColor: BRAND.primaryMuted,
                        }}
                      >
                        <Ionicons name="pricetag-outline" size={20} color={BRAND.primary} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: BRAND.textPrimary,
                            letterSpacing: -0.2,
                            marginBottom: 5,
                          }}
                          numberOfLines={2}
                        >
                          {offer.title}
                        </Text>

                        {/* Category + service type row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 3,
                                backgroundColor: BRAND.primary,
                                marginRight: 5,
                              }}
                            />
                            <Text style={{ fontSize: 12, color: BRAND.textSecondary, fontWeight: '500' }}>
                              {offer.category.name}
                            </Text>
                          </View>

                          {/* Service type chip */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: stc.bg,
                              paddingHorizontal: 7,
                              paddingVertical: 3,
                              borderRadius: 8,
                            }}
                          >
                            <Ionicons name={stc.icon} size={10} color={stc.color} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: stc.color, marginLeft: 3 }}>
                              {stc.label}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Status badge */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: sc.bg,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 10,
                          marginLeft: 8,
                        }}
                      >
                        <Ionicons name={sc.icon} size={12} color={sc.iconColor} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: sc.text,
                            marginLeft: 4,
                            textTransform: 'capitalize',
                          }}
                        >
                          {offer.status}
                        </Text>
                      </View>
                    </View>

                    {/* Info chips row */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                      <InfoChip
                        icon="cash-outline"
                        label="Budget"
                        value={formatPrice(offer.proposedPrice)}
                        iconColor={BRAND.primary}
                        bg={BRAND.primarySoft}
                      />
                      <InfoChip
                        icon="chatbubbles-outline"
                        label="Responses"
                        value={`${offer.responses.length}`}
                        iconColor={BRAND.blue}
                        bg={BRAND.blueSoft}
                      />
                    </View>

                    {/* Location / service + expiry row */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {/* Location or service type */}
                      {offer.serviceType === 'shop' ? (
                        <View
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: stc.bg,
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                          }}
                        >
                          <Ionicons name={stc.icon} size={13} color={stc.color} style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: stc.color }}>
                            {stc.label}
                          </Text>
                        </View>
                      ) : offer.location ? (
                        <View
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: BRAND.blueSoft,
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                          }}
                        >
                          <Ionicons name="location-outline" size={13} color={BRAND.blue} style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: BRAND.blue }} numberOfLines={1}>
                            {offer.location.city}, {offer.location.state}
                          </Text>
                        </View>
                      ) : null}

                      {/* Expiry */}
                      <View
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: BRAND.orangeSoft,
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                        }}
                      >
                        <Ionicons name="time-outline" size={13} color={BRAND.orange} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#9A3412' }} numberOfLines={1}>
                          {formatDate(offer.expiresAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Footer */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 12,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: BRAND.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="calendar-outline" size={12} color={BRAND.textMuted} />
                        <Text style={{ fontSize: 11, color: BRAND.textMuted, marginLeft: 4, fontWeight: '500' }}>
                          Posted {formatDate(offer.createdAt)}
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: BRAND.primarySoft,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 20,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: BRAND.primary, fontWeight: '700', marginRight: 3 }}>
                          Details
                        </Text>
                        <Ionicons name="arrow-forward" size={12} color={BRAND.primary} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          /* ── EMPTY STATE ───────────────────────────────────────────────── */
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 70 }}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 30,
                overflow: 'hidden',
                marginBottom: 20,
                ...Platform.select({
                  ios: { shadowColor: BRAND.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14 },
                  android: { elevation: 6 },
                }),
              }}
            >
              <LinearGradient
                colors={[BRAND.primary, BRAND.primaryDark]}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="pricetag-outline" size={46} color="#fff" />
              </LinearGradient>
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: BRAND.textPrimary,
                marginBottom: 8,
                letterSpacing: -0.4,
              }}
            >
              No Active Offers
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: BRAND.textSecondary,
                textAlign: 'center',
                lineHeight: 21,
                paddingHorizontal: 32,
                marginBottom: 28,
              }}
            >
              Create an offer and let vendors compete for your business with their best proposals!
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('CreateOffer')}
              activeOpacity={0.85}
              style={{ borderRadius: 16, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={[BRAND.primary, BRAND.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 26,
                  paddingVertical: 14,
                  gap: 8,
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Create Offer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyOffersScreen;