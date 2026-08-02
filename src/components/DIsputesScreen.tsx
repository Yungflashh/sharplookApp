import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { disputeAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG     = '#F8F9FA';
const WHITE  = '#FFFFFF';

type DisputesNav = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type FilterTab = 'all' | 'open' | 'in_review' | 'resolved' | 'closed';

interface Dispute {
  _id: string;
  booking?: { _id: string; service?: { name: string }; scheduledDate?: string; totalAmount?: number };
  reason: string;
  description?: string;
  category?: string;
  status: string;
  priority?: string;
  createdAt: string;
  resolvedAt?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  open:      { label: 'Open',      color: '#D97706', bg: '#FFFBEB', icon: 'alert-circle' },
  in_review: { label: 'In Review', color: '#2563EB', bg: '#EFF6FF', icon: 'eye' },
  resolved:  { label: 'Resolved',  color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle' },
  closed:    { label: 'Closed',    color: TEXT3,     bg: BORDER,    icon: 'close-circle' },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#16A34A',
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatStatus = (s: string) =>
  s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const DisputesScreen: React.FC = () => {
  const navigation = useNavigation<DisputesNav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [disputes, setDisputes]         = useState<Dispute[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);

  const fetchDisputes = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1 && !append) setLoading(true);
      const response = await disputeAPI.getMyDisputes({ page: pageNum, limit: 20 });
      if (response.success) {
        const items: Dispute[] = Array.isArray(response.data) ? response.data : (response.data?.disputes || []);
        setDisputes(prev => append ? [...prev, ...items] : items);
        setHasMore(response.meta?.pagination?.hasNextPage ?? items.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      const e = handleAPIError(error);
      toast.error('Error', e.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDisputes(1, false); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDisputes(1, false);
    setRefreshing(false);
  }, []);

  const loadMore = () => { if (!loading && hasMore) fetchDisputes(page + 1, true); };

  const counts = {
    total:     disputes.length,
    open:      disputes.filter(d => d.status === 'open').length,
    in_review: disputes.filter(d => d.status === 'in_review').length,
    resolved:  disputes.filter(d => d.status === 'resolved').length,
    closed:    disputes.filter(d => d.status === 'closed').length,
  };

  const FILTERS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',      label: 'All',       count: counts.total },
    { key: 'open',     label: 'Open',      count: counts.open },
    { key: 'in_review',label: 'In Review', count: counts.in_review },
    { key: 'resolved', label: 'Resolved',  count: counts.resolved },
    { key: 'closed',   label: 'Closed',    count: counts.closed },
  ];

  const filtered = disputes.filter(d => {
    const passFilter = activeFilter === 'all' || d.status === activeFilter;
    const passSearch = !search || [d.reason, d.category, d.booking?.service?.name]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return passFilter && passSearch;
  });

  if (loading && page === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <ActivityIndicator size="large" color={PINK} />
        <Text style={{ fontSize: 13, color: TEXT2, marginTop: 12 }}>Loading disputes…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Header */}
      <View style={{ backgroundColor: WHITE, paddingTop: insets.top }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={PINK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Disputes</Text>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => navigation.navigate('CreateDispute' as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color={WHITE} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 }}>
          <View style={s.searchRow}>
            <Ionicons name="search-outline" size={18} color={TEXT3} />
            <TextInput
              style={s.searchInput}
              placeholder="Search disputes…"
              placeholderTextColor={TEXT3}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={TEXT3} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}
        >
          {FILTERS.map(f => {
            const active = f.key === activeFilter;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
                style={[s.chip, active && s.chipActive]}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {f.label}{f.count > 0 ? ` (${f.count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
        onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) loadMore();
        }}
        scrollEventThrottle={400}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="shield-checkmark-outline" size={40} color={TEXT3} />
            </View>
            <Text style={s.emptyTitle}>No Disputes</Text>
            <Text style={s.emptySub}>
              {activeFilter !== 'all'
                ? `You don't have any ${formatStatus(activeFilter).toLowerCase()} disputes`
                : "You haven't raised any disputes yet"}
            </Text>
          </View>
        ) : (
          <>
            {filtered.map(d => <DisputeCard key={d._id} dispute={d} onPress={() => navigation.navigate('DisputeDetail', { disputeId: d._id })} />)}
            {loading && page > 1 && <ActivityIndicator size="small" color={PINK} style={{ marginVertical: 16 }} />}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const DisputeCard = ({ dispute: d, onPress }: { dispute: Dispute; onPress: () => void }) => {
  const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG['closed'];
  const priority = d.priority?.toLowerCase();
  const priorityColor = priority ? (PRIORITY_COLORS[priority] ?? TEXT2) : TEXT2;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      {/* Top row */}
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {d.booking?.service?.name || 'Booking Dispute'}
          </Text>
          {d.category ? <Text style={s.cardCategory}>{d.category}</Text> : null}
        </View>
        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
          <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Reason */}
      <View style={s.reasonBox}>
        <Text style={s.reasonText} numberOfLines={2}>{d.reason}</Text>
      </View>

      {/* Meta row */}
      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={TEXT3} />
          <Text style={s.metaText}>{formatDate(d.createdAt)}</Text>
        </View>
        {d.priority && (
          <View style={s.metaItem}>
            <Ionicons name="flag-outline" size={13} color={priorityColor} />
            <Text style={[s.metaText, { color: priorityColor, fontWeight: '600' }]}>
              {formatStatus(d.priority)}
            </Text>
          </View>
        )}
        {d.booking?.totalAmount ? (
          <View style={s.metaItem}>
            <Ionicons name="cash-outline" size={13} color={TEXT3} />
            <Text style={s.metaText}>₦{d.booking.totalAmount.toLocaleString()}</Text>
          </View>
        ) : null}
      </View>

      {/* Footer */}
      <View style={s.cardFooter}>
        <Text style={s.cardId}>ID: {d._id.slice(-8).toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={s.viewDetails}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={PINK} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT1 },
  newBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PINK, alignItems: 'center', justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    borderWidth: 1.5, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 } }),
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT1, paddingVertical: 0 },

  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: WHITE,
    borderWidth: 1.5, borderColor: BORDER,
  },
  chipActive: { backgroundColor: PINK, borderColor: PINK },
  chipText: { fontSize: 13, fontWeight: '600', color: TEXT2 },
  chipTextActive: { color: WHITE },

  card: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT1, marginBottom: 2 },
  cardCategory: { fontSize: 12, color: TEXT2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  reasonBox: { backgroundColor: BG, borderRadius: 10, padding: 12, marginBottom: 10 },
  reasonText: { fontSize: 13, color: TEXT2, lineHeight: 18 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: TEXT2 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER,
  },
  cardId: { fontSize: 11, color: TEXT3 },
  viewDetails: { fontSize: 13, color: PINK, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 64 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT1, marginBottom: 6 },
  emptySub: { fontSize: 13, color: TEXT3, textAlign: 'center', paddingHorizontal: 32 },
});

export default DisputesScreen;
