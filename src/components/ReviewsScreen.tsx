import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { reviewAPI, handleAPIError } from '@/api/api';
import { getStoredUser } from '@/utils/authHelper';
import { toast } from '@/components/ui/Toast';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const PINK_M = '#FCDCE9';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG     = '#F8F9FA';
const WHITE  = '#FFFFFF';
const GOLD   = '#FBBF24';

type ReviewsNav   = NativeStackNavigationProp<RootStackParamList, 'Reviews'>;
type ReviewsRoute = RouteProp<RootStackParamList, 'Reviews'>;

interface Review {
  _id: string;
  reviewer: { _id: string; firstName: string; lastName: string; avatar?: string };
  rating: number;
  title?: string;
  comment: string;
  detailedRatings?: { quality?: number; punctuality?: number; communication?: number; value?: number };
  images?: string[];
  response?: { comment: string; respondedAt: string };
  createdAt: string;
  helpfulCount: number;
  notHelpfulCount: number;
  isVerifiedBooking?: boolean;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

const Stars = ({ rating, size = 16 }: { rating: number; size?: number }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(s => (
      <Ionicons key={s} name={s <= Math.round(rating) ? 'star' : 'star-outline'} size={size} color={s <= Math.round(rating) ? GOLD : BORDER} />
    ))}
  </View>
);

const ReviewsScreen: React.FC = () => {
  const navigation = useNavigation<ReviewsNav>();
  const route      = useRoute<ReviewsRoute>();
  const insets     = useSafeAreaInsets();

  const params = route.params ?? {};
  const { userId: paramUserId, serviceId, type = 'vendor' } = params;

  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(paramUserId);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [reviews, setReviews]               = useState<Review[]>([]);
  const [stats, setStats]                   = useState<any>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [page, setPage]                     = useState(1);
  const [hasMore, setHasMore]               = useState(true);

  useEffect(() => {
    if (!paramUserId) {
      getStoredUser().then(u => { if (u?._id) setResolvedUserId(u._id); });
    }
  }, [paramUserId]);

  const fetchReviews = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const qp = { page: pageNum, limit: 20, rating: selectedRating || undefined };
      let response;
      if (type === 'service' && serviceId) {
        response = await reviewAPI.getServiceReviews(serviceId, qp);
      } else if (resolvedUserId) {
        response = await reviewAPI.getReviewsForUser(resolvedUserId, qp);
      }
      if (response?.success) {
        const items: Review[] = Array.isArray(response.data) ? response.data : (response.data?.reviews || []);
        setReviews(prev => append ? [...prev, ...items] : items);
        setHasMore(response.meta?.pagination?.hasNextPage ?? items.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      const e = handleAPIError(error);
      toast.error('Error', e.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!resolvedUserId) return;
    try {
      const r = await reviewAPI.getReviewStats(resolvedUserId);
      if (r.success) setStats(r.data?.stats || r.data);
    } catch {}
  };

  useEffect(() => {
    if (resolvedUserId || serviceId) {
      fetchReviews();
      if (resolvedUserId) fetchStats();
    }
  }, [selectedRating, resolvedUserId]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchReviews(1, false), fetchStats()]).finally(() => setRefreshing(false));
  };

  const loadMore = () => { if (!loading && hasMore) fetchReviews(page + 1, true); };

  // Build bar data sorted 5→1
  const barData: { star: number; count: number }[] = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: stats?.byRating?.find((r: any) => r._id === star)?.count ?? 0,
  }));
  const totalReviews = stats?.total || 0;

  if (loading && page === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <ActivityIndicator size="large" color={PINK} />
        <Text style={{ fontSize: 13, color: TEXT2, marginTop: 12 }}>Loading reviews…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: PINK_S }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Header */}
      <View style={{ backgroundColor: WHITE, paddingTop: insets.top }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={PINK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Reviews</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Rating summary */}
        {stats && (
          <View style={s.statCard}>
            {/* Left: big score */}
            <View style={s.statLeft}>
              <Text style={s.bigScore}>{(stats.averageRating || 0).toFixed(1)}</Text>
              <Stars rating={stats.averageRating || 0} size={18} />
              <Text style={s.reviewCount}>Reviews ({totalReviews})</Text>
            </View>

            {/* Divider */}
            <View style={s.statDivider} />

            {/* Right: bars 5→1 */}
            <View style={s.barsCol}>
              {barData.map(({ star, count }) => {
                const pct = totalReviews > 0 ? count / totalReviews : 0;
                return (
                  <View key={star} style={s.barRow}>
                    <Text style={s.barLabel}>{star}</Text>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { width: `${Math.max(pct * 100, pct > 0 ? 4 : 0)}%` as any }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedRating(null)}
            activeOpacity={0.7}
            style={[s.chip, selectedRating === null && s.chipActive]}
          >
            <Text style={[s.chipText, selectedRating === null && s.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {[1, 2, 3, 4, 5].map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setSelectedRating(r)}
              activeOpacity={0.7}
              style={[s.chip, selectedRating === r && s.chipActive]}
            >
              <Ionicons name="star" size={13} color={selectedRating === r ? WHITE : GOLD} />
              <Text style={[s.chipText, selectedRating === r && s.chipTextActive]}>
                {r} {r === 1 ? 'Star' : 'Stars'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Review list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
        onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) loadMore();
        }}
        scrollEventThrottle={400}
      >
        {reviews.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="star-outline" size={40} color={TEXT3} />
            </View>
            <Text style={s.emptyTitle}>No Reviews Yet</Text>
            <Text style={s.emptySub}>
              {selectedRating ? `No ${selectedRating}-star reviews found` : 'Be the first to leave a review!'}
            </Text>
          </View>
        ) : (
          <>
            {reviews.map(review => <ReviewCard key={review._id} review={review} />)}
            {loading && page > 1 && <ActivityIndicator size="small" color={PINK} style={{ marginVertical: 16 }} />}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const ReviewCard = ({ review }: { review: Review }) => {
  const initials = `${review.reviewer?.firstName?.charAt(0) ?? ''}${review.reviewer?.lastName?.charAt(0) ?? ''}`;

  return (
    <View style={s.card}>
      {/* Top row: avatar + name/date + stars */}
      <View style={s.cardTop}>
        {review.reviewer.avatar ? (
          <Image source={{ uri: review.reviewer.avatar }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: PINK }}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.reviewerName}>{review.reviewer.firstName} {review.reviewer.lastName}</Text>
          <Text style={s.reviewDate}>{fmtDate(review.createdAt)}</Text>
        </View>
        <Stars rating={review.rating} size={16} />
      </View>

      {/* Title */}
      {review.title ? <Text style={s.reviewTitle}>{review.title}</Text> : null}

      {/* Comment */}
      <Text style={s.reviewComment}>{review.comment}</Text>

      {/* Vendor response */}
      {review.response && (
        <View style={s.responseBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ionicons name="chatbubble-ellipses" size={14} color={PINK} />
            <Text style={s.responseLabel}>Vendor Response</Text>
          </View>
          <Text style={s.responseText}>{review.response.comment}</Text>
          <Text style={s.responseDate}>{fmtDate(review.response.respondedAt)}</Text>
        </View>
      )}

      {/* Footer: verified badge + helpful counts */}
      <View style={s.cardFooter}>
        <View style={s.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={13} color={PINK} />
          <Text style={s.verifiedText}>Verified Booking</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={s.voteItem}>
            <Ionicons name="thumbs-up" size={15} color={TEXT3} />
            <Text style={s.voteCount}>{review.helpfulCount}</Text>
          </View>
          <View style={s.voteItem}>
            <Ionicons name="thumbs-down" size={15} color={TEXT3} />
            <Text style={s.voteCount}>{review.notHelpfulCount}</Text>
          </View>
        </View>
      </View>
    </View>
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

  statCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, margin: 16, marginBottom: 0,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  statLeft: { alignItems: 'center', width: 90 },
  bigScore: { fontSize: 40, fontWeight: '800', color: TEXT1, lineHeight: 44 },
  reviewCount: { fontSize: 12, color: TEXT2, marginTop: 4 },
  statDivider: { width: 1, height: 80, backgroundColor: BORDER, marginHorizontal: 16 },
  barsCol: { flex: 1, gap: 7 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 12, color: TEXT2, width: 10, textAlign: 'center' },
  barTrack: { flex: 1, height: 8, backgroundColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: PINK, borderRadius: 4 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  reviewerName: { fontSize: 15, fontWeight: '700', color: TEXT1, marginBottom: 2 },
  reviewDate: { fontSize: 12, color: TEXT2 },
  reviewTitle: { fontSize: 15, fontWeight: '700', color: TEXT1, marginBottom: 8 },
  reviewComment: { fontSize: 14, color: TEXT1, lineHeight: 22, marginBottom: 12 },

  responseBox: {
    backgroundColor: PINK_S, borderRadius: 12, padding: 12, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: PINK,
  },
  responseLabel: { fontSize: 12, fontWeight: '700', color: PINK },
  responseText: { fontSize: 13, color: TEXT1, lineHeight: 18 },
  responseDate: { fontSize: 11, color: TEXT2, marginTop: 6 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER,
  },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PINK_S, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  verifiedText: { fontSize: 12, fontWeight: '600', color: PINK },
  voteItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  voteCount: { fontSize: 13, color: TEXT2, fontWeight: '500' },

  empty: { alignItems: 'center', paddingTop: 64 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT1, marginBottom: 6 },
  emptySub: { fontSize: 13, color: TEXT3, textAlign: 'center', paddingHorizontal: 32 },
});

export default ReviewsScreen;
