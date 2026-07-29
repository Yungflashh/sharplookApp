import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, RefreshControl,
  ActivityIndicator, FlatList, Image, StyleSheet, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { vendorAPI, handleAPIError } from '@/api/api';
import {
  parseVendors, extractVendorsFromResponse, FormattedVendor,
  filterVendorsByQuery, sortVendors,
} from '@/utils/vendorUtils';

const BG = '#FFF0F5';
const PINK = '#E91E8C';
const CARD_R = 16;

type Nav = NativeStackNavigationProp<RootStackParamList, 'AllVendors'>;
type ServiceFilter = 'all' | 'home_service' | 'in_shop';
type SortOption = 'rating' | 'reviews' | 'name';

const SERVICE_TABS: { key: ServiceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'home_service', label: 'Home Service' },
  { key: 'in_shop', label: 'In-salon' },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'rating', label: 'Top Rated' },
  { key: 'reviews', label: 'Most Reviewed' },
  { key: 'name', label: 'A–Z' },
];

const AvatarStack: React.FC<{ images: string[] }> = ({ images }) => {
  const shown = images.slice(0, 4);
  const overflow = images.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((img, i) => (
        <Image
          key={i}
          source={{ uri: img }}
          style={{
            width: 26, height: 26, borderRadius: 13,
            borderWidth: 2, borderColor: '#fff',
            marginLeft: i > 0 ? -7 : 0,
          }}
        />
      ))}
      {overflow > 0 && (
        <View style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: '#FCE4EC', borderWidth: 2, borderColor: '#fff',
          marginLeft: -7, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: PINK }}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
};

interface VendorBigCardProps {
  vendor: FormattedVendor;
  isFavorite: boolean;
  onFavorite: () => void;
  onBook: () => void;
}

const VendorBigCard: React.FC<VendorBigCardProps> = ({ vendor, isFavorite, onFavorite, onBook }) => {
  const serviceColor =
    vendor.vendorType === 'home_service' ? '#2563eb' :
    vendor.vendorType === 'in_shop' ? '#059669' : '#7c3aed';
  const serviceBg =
    vendor.vendorType === 'home_service' ? '#dbeafe' :
    vendor.vendorType === 'in_shop' ? '#d1fae5' : '#ede9fe';
  const serviceIcon: any =
    vendor.vendorType === 'home_service' ? 'home-outline' :
    vendor.vendorType === 'in_shop' ? 'storefront-outline' : 'layers-outline';

  return (
    <View style={styles.card}>
      {/* Hero image */}
      <View>
        {vendor.image ? (
          <Image
            source={{ uri: vendor.image }}
            style={{ width: '100%', height: 210, borderTopLeftRadius: CARD_R, borderTopRightRadius: CARD_R }}
            resizeMode="cover"
          />
        ) : (
          <View style={{
            width: '100%', height: 210,
            borderTopLeftRadius: CARD_R, borderTopRightRadius: CARD_R,
            backgroundColor: '#f9e4f0', alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 52, fontWeight: '800', color: PINK, opacity: 0.3 }}>
              {vendor.businessName.charAt(0)}
            </Text>
          </View>
        )}

        {/* Heart */}
        <TouchableOpacity onPress={onFavorite} activeOpacity={0.8} style={styles.heartBtn}>
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={PINK} />
        </TouchableOpacity>

        {/* Verified overlay badge */}
        {vendor.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={11} color="#fff" />
            <Text style={styles.verifiedText}>VERIFIED</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Name + checkmark */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <Text style={styles.vendorName} numberOfLines={1}>{vendor.businessName}</Text>
          {vendor.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginLeft: 5 }} />
          )}
        </View>

        {/* Rating */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 9 }}>
          <Ionicons name="star" size={14} color="#f59e0b" />
          <Text style={styles.ratingVal}>{vendor.rating.toFixed(1)}</Text>
          <Text style={styles.ratingCount}> ({vendor.reviews} review{vendor.reviews !== 1 ? 's' : ''})</Text>
        </View>

        {/* Service type pill */}
        <View style={{ flexDirection: 'row', marginBottom: 11 }}>
          <View style={[styles.servicePill, { backgroundColor: serviceBg }]}>
            <Ionicons name={serviceIcon} size={12} color={serviceColor} />
            <Text style={[styles.servicePillText, { color: serviceColor }]}>{vendor.service}</Text>
          </View>
        </View>

        {/* Portfolio / services count + price */}
        <View style={styles.metaRow}>
          {vendor.portfolioImages && vendor.portfolioImages.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AvatarStack images={vendor.portfolioImages} />
              <Text style={styles.metaLabel}> {vendor.portfolioImages.length} portfolio</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="construct-outline" size={15} color="#9ca3af" />
              <Text style={styles.metaLabel}>
                {' '}{vendor.totalServices ?? 0} service{(vendor.totalServices ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {vendor.startingPrice ? (
            <Text style={styles.price}>From ₦{vendor.startingPrice.toLocaleString()}</Text>
          ) : (
            <Text style={styles.priceRequest}>Price on request</Text>
          )}
        </View>

        {/* Book button */}
        <TouchableOpacity activeOpacity={0.85} onPress={onBook} style={styles.bookBtn}>
          <Text style={styles.bookBtnText}>Book Appointment</Text>
          <Ionicons name="chevron-forward" size={17} color="#fff" style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const SortSheet: React.FC<{
  visible: boolean;
  current: SortOption;
  onSelect: (s: SortOption) => void;
  onClose: () => void;
}> = ({ visible, current, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.sheetOverlay}>
      <TouchableOpacity activeOpacity={1} style={styles.sheetContainer}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Sort By</Text>
        {SORT_OPTIONS.map((opt, i) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => { onSelect(opt.key); onClose(); }}
            style={[
              styles.sheetRow,
              i < SORT_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
            ]}
          >
            <Text style={[styles.sheetRowText, current === opt.key && { color: PINK, fontWeight: '700' }]}>
              {opt.label}
            </Text>
            {current === opt.key && <Ionicons name="checkmark" size={20} color={PINK} />}
          </TouchableOpacity>
        ))}
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const AllVendorsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [vendors, setVendors] = useState<FormattedVendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<FormattedVendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favoriteVendors, setFavoriteVendors] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchVendors = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const response = await vendorAPI.getAllVendors({ page, limit: 20 });
      if (response.success) {
        const rawVendors = extractVendorsFromResponse(response);
        const formatted = parseVendors(rawVendors);
        const seen = new Set<string>();
        const unique = formatted.filter(v => {
          if (!v.id || seen.has(v.id)) return false;
          seen.add(v.id);
          return true;
        });

        if (append) {
          setVendors(prev => {
            const existingIds = new Set(prev.map(v => v.id));
            const merged = [...prev];
            for (const v of unique) {
              if (!existingIds.has(v.id)) { existingIds.add(v.id); merged.push(v); }
            }
            return merged;
          });
        } else {
          setVendors(unique);
        }

        setHasMore(
          response.meta?.pagination
            ? response.meta.pagination.hasNextPage || false
            : formatted.length >= 20
        );
      }
    } catch (error) {
      console.error('Vendors fetch error:', handleAPIError(error).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchVendors(1, false);
  }, []);

  useEffect(() => {
    let result = [...vendors];
    if (serviceFilter !== 'all') {
      result = result.filter(v =>
        serviceFilter === 'home_service'
          ? v.vendorType === 'home_service' || v.vendorType === 'both'
          : v.vendorType === 'in_shop' || v.vendorType === 'both'
      );
    }
    if (searchQuery.trim()) result = filterVendorsByQuery(result, searchQuery);
    result = sortVendors(result, sortBy, 'desc');
    setFilteredVendors(result);
  }, [vendors, searchQuery, serviceFilter, sortBy]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchVendors(1, false).finally(() => setRefreshing(false));
  }, []);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const next = currentPage + 1;
      setCurrentPage(next);
      fetchVendors(next, true);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavoriteVendors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label ?? 'Top Rated';

  const renderItem = ({ item }: { item: FormattedVendor }) => (
    <VendorBigCard
      vendor={item}
      isFavorite={favoriteVendors.has(item.id)}
      onFavorite={() => toggleFavorite(item.id)}
      onBook={() => navigation.navigate('VendorDetail', { vendorId: item.id })}
    />
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Vendors</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vendors..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={17} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Service type tabs — segment control */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmentContainer}>
          {SERVICE_TABS.map(tab => {
            const active = serviceFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => setServiceFilter(tab.key)}
                style={[styles.segmentTab, active && styles.segmentTabActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Section header */}
      {!loading && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {filteredVendors.length} Vendor{filteredVendors.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={() => setSortSheetVisible(true)} activeOpacity={0.7} style={styles.sortBtn}>
            <Text style={styles.sortBtnText}>Sort: {currentSortLabel}</Text>
            <Ionicons name="chevron-down" size={13} color="#6b7280" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PINK} />
          <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>Loading vendors...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVendors}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 28, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator size="small" color={PINK} style={{ paddingVertical: 16 }} />
              : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
              <Ionicons name="people-outline" size={60} color="#d1d5db" />
              <Text style={{ color: '#374151', fontSize: 16, fontWeight: '600', marginTop: 16 }}>
                No vendors found
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 6 }}>
                Try a different filter or search
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <SortSheet
        visible={sortSheetVisible}
        current={sortBy}
        onSelect={setSortBy}
        onClose={() => setSortSheetVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, marginHorizontal: 8, fontSize: 14, color: '#111827' },
  /* Segment control */
  segmentWrap: { paddingHorizontal: 16, marginBottom: 12 },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1.5,
    borderColor: '#F2C4DA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  segmentTab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: PINK,
    shadowColor: PINK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 4, elevation: 4,
  },
  segmentText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  segmentTextActive: { color: '#fff', fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  /* Card */
  card: {
    backgroundColor: '#fff', borderRadius: CARD_R, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09, shadowRadius: 12, elevation: 4, overflow: 'hidden',
  },
  heartBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  verifiedBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  verifiedText: { color: '#fff', fontSize: 9, fontWeight: '700', marginLeft: 3, letterSpacing: 0.3 },
  cardBody: { padding: 14 },
  vendorName: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1 },
  ratingVal: { fontSize: 14, fontWeight: '700', color: '#111827', marginLeft: 4 },
  ratingCount: { fontSize: 13, color: '#6b7280' },
  servicePill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  servicePillText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13,
  },
  metaLabel: { fontSize: 12, color: '#6b7280' },
  price: { fontSize: 14, fontWeight: '700', color: PINK },
  priceRequest: { fontSize: 12, color: '#9ca3af' },
  bookBtn: {
    backgroundColor: PINK, borderRadius: 11, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  bookBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  /* Sort sheet */
  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 12, paddingBottom: 36, paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12,
  },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15,
  },
  sheetRowText: { fontSize: 15, color: '#374151', fontWeight: '500' },
});

export default AllVendorsScreen;
