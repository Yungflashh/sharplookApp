import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { offerAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const BG      = '#FFF5F9';
const CARD    = '#FFFFFF';
const PINK    = '#E04079';
const PRI_DK  = '#B5315F';
const TEXT1   = '#1A1A2E';
const TEXT2   = '#6B7280';
const TEXT3   = '#9CA3AF';

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

type FilterKey = 'all' | 'open' | 'accepted' | 'closed';

const TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'open',     label: 'Open'     },
  { key: 'accepted', label: 'Accepted' },
  { key: 'closed',   label: 'Closed'   },
];

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  open:     { label: 'Open',     bg: '#D1FAE5', color: '#065F46' },
  accepted: { label: 'Accepted', bg: '#DBEAFE', color: '#1E40AF' },
  closed:   { label: 'Closed',   bg: '#F3F4F6', color: '#6B7280' },
  expired:  { label: 'Expired',  bg: '#FEE2E2', color: '#991B1B' },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const MyOffersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers,     setOffers]     = useState<Offer[]>([]);
  const [activeTab,  setActiveTab]  = useState<FilterKey>('all');

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await offerAPI.getMyOffers({ page: 1, limit: 50 });
      if (res.success) setOffers(res.data.offers || res.data || []);
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOffers(); }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers().finally(() => setRefreshing(false));
  }, []);

  const filtered = activeTab === 'all'
    ? offers
    : offers.filter(o => o.status.toLowerCase() === activeTab);

  const openCount      = offers.filter(o => o.status.toLowerCase() === 'open').length;
  const acceptedCount  = offers.filter(o => o.status.toLowerCase() === 'accepted').length;
  const totalResponses = offers.reduce((s, o) => s + (o.responses?.length || 0), 0);

  if (loading) {
    return (
      <View style={[ss.flex, { backgroundColor: BG, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  return (
    <View style={[ss.flex, { backgroundColor: BG, paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ss.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={PINK} />
        </TouchableOpacity>
        <Text style={ss.headerTitle}>My Offers</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateOffer')} style={ss.newBtn} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color={PINK} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.tabsRow} style={{ flexGrow: 0 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={[ss.tab, active && ss.tabActive]} activeOpacity={0.8}>
              <Text style={[ss.tabTxt, active && ss.tabTxtActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={ss.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
      >
        {/* Stats banner */}
        {offers.length > 0 && (
          <View style={ss.banner}>
            <View style={ss.bannerStat}>
              <Text style={ss.bannerVal}>{openCount}</Text>
              <Text style={ss.bannerLabel}>Open</Text>
            </View>
            <View style={ss.bannerDivider} />
            <View style={ss.bannerStat}>
              <Text style={ss.bannerVal}>{acceptedCount}</Text>
              <Text style={ss.bannerLabel}>Accepted</Text>
            </View>
            <View style={ss.bannerDivider} />
            <View style={ss.bannerStat}>
              <Text style={ss.bannerVal}>{totalResponses}</Text>
              <Text style={ss.bannerLabel}>Responses</Text>
            </View>
          </View>
        )}

        {/* Empty */}
        {filtered.length === 0 ? (
          <View style={ss.empty}>
            <LinearGradient colors={[PINK, PRI_DK]} style={ss.emptyIcon}>
              <Ionicons name="pricetag" size={38} color="#fff" />
            </LinearGradient>
            <Text style={ss.emptyTitle}>
              {activeTab === 'all' ? 'No Offers Yet' : `No ${TABS.find(t => t.key === activeTab)?.label} Offers`}
            </Text>
            <Text style={ss.emptyText}>
              {activeTab === 'all'
                ? 'Post an offer and let vendors compete with their best price!'
                : `You have no ${activeTab} offers right now.`}
            </Text>
            {activeTab === 'all' && (
              <TouchableOpacity onPress={() => navigation.navigate('CreateOffer')} style={ss.emptyBtn} activeOpacity={0.85}>
                <LinearGradient colors={[PINK, PRI_DK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ss.emptyBtnInner}>
                  <Ionicons name="add-circle" size={16} color="#fff" />
                  <Text style={ss.emptyBtnTxt}>Create Offer</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map(offer => {
            const sc = STATUS_MAP[offer.status.toLowerCase()] ?? { label: offer.status, bg: '#F3F4F6', color: TEXT2 };
            return (
              <TouchableOpacity
                key={offer._id}
                style={ss.card}
                onPress={() => navigation.navigate('OfferDetail', { offerId: offer._id })}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[PINK, PRI_DK]} style={ss.cardIcon}>
                  <Ionicons name="pricetag" size={20} color="#fff" />
                </LinearGradient>

                <View style={ss.cardMid}>
                  <Text style={ss.cardTitle} numberOfLines={1}>{offer.title}</Text>
                  <Text style={ss.cardSub} numberOfLines={1}>{offer.category?.name}</Text>
                  <Text style={ss.cardMeta}>
                    {offer.responses?.length || 0} responses · Exp {formatDate(offer.expiresAt)}
                  </Text>
                </View>

                <View style={ss.cardRight}>
                  <View style={[ss.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[ss.badgeTxt, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                  <Text style={ss.cardPrice}>₦{offer.proposedPrice.toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const ss = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: TEXT1, letterSpacing: -0.5 },
  newBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center' },

  tabsRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: '#F0E0E8' },
  tabActive: { backgroundColor: PINK, borderColor: PINK },
  tabTxt: { fontSize: 13, fontWeight: '600', color: TEXT2 },
  tabTxtActive: { color: '#fff', fontWeight: '700' },

  banner: {
    borderRadius: 18, padding: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: PINK, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: PINK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  bannerStat: { alignItems: 'center', flex: 1 },
  bannerVal: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  bannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.78)', fontWeight: '600', marginTop: 2 },
  bannerDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)' },

  card: {
    backgroundColor: CARD, borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardMid: { flex: 1, marginLeft: 12, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 2 },
  cardSub: { fontSize: 12, color: TEXT2, fontWeight: '500', marginBottom: 3 },
  cardMeta: { fontSize: 11, color: TEXT3, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  cardPrice: { fontSize: 13, fontWeight: '800', color: TEXT1 },

  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 },
  emptyIcon: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT1, marginBottom: 8, letterSpacing: -0.3 },
  emptyText: { fontSize: 13, color: TEXT2, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { borderRadius: 14, overflow: 'hidden' },
  emptyBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 13, gap: 7 },
  emptyBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default MyOffersScreen;
