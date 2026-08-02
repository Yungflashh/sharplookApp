import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Share,
  Clipboard,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { referralAPI } from '@/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from '@/components/ui/Toast';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG     = '#F8F9FA';
const WHITE  = '#FFFFFF';

interface ReferralStats { totalReferrals: number; completedReferrals: number; pendingReferrals: number; totalEarnings: number }
interface Referral {
  _id: string;
  referee: { firstName: string; lastName: string; email: string; avatar?: string; createdAt: string };
  status: 'pending' | 'completed' | 'expired';
  referrerReward: number;
  referrerPaid: boolean;
  firstBookingCompleted: boolean;
  createdAt: string;
}

const STATUS_CFG = {
  completed: { color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle' as const },
  pending:   { color: '#D97706', bg: '#FFFBEB', icon: 'time' as const },
  expired:   { color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle' as const },
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtN    = (n: number) => `₦${n.toLocaleString()}`;

const ReferralScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [stats, setStats]         = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => { load(); getCode(); }, []);

  const getCode = async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      if (raw) setReferralCode(JSON.parse(raw).referralCode || '');
    } catch {}
  };

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        referralAPI.getReferralStats(),
        referralAPI.getMyReferrals({ page: 1, limit: 20 }),
      ]);
      setStats(sRes.data?.stats ?? null);
      setReferrals(rRes.data || []);
      setHasMore(rRes.meta?.pagination?.hasNextPage || false);
      setPage(1);
    } catch {
      toast.error('Error', 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await referralAPI.getMyReferrals({ page: next, limit: 20 });
      setReferrals(prev => [...prev, ...(res.data || [])]);
      setPage(next);
      setHasMore(res.meta?.pagination?.hasNextPage || false);
    } catch {} finally { setLoadingMore(false); }
  };

  const share = async () => {
    await Share.share({ message: `Join LookReal and get amazing beauty services! Use my referral code: ${referralCode}\n\nDownload the app now!` });
  };
  const copy = () => { Clipboard.setString(referralCode); toast.success('Copied!', 'Referral code copied to clipboard'); };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  const Header = (
    <>
      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: PINK_S }]}>
            <Ionicons name="people" size={22} color={PINK} />
          </View>
          <Text style={s.statNum}>{stats?.totalReferrals ?? 0}</Text>
          <Text style={s.statLabel}>Total Referrals</Text>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="checkmark-done" size={22} color="#059669" />
          </View>
          <Text style={s.statNum}>{stats?.completedReferrals ?? 0}</Text>
          <Text style={s.statLabel}>Completed</Text>
        </View>
        <View style={s.statCard}>
          <View style={[s.statIcon, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="time" size={22} color="#D97706" />
          </View>
          <Text style={s.statNum}>{stats?.pendingReferrals ?? 0}</Text>
          <Text style={s.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Earnings card */}
      <View style={[s.earningsCard]}>
        <View style={[s.statIcon, { backgroundColor: '#FFFBEB', width: 52, height: 52, borderRadius: 26 }]}>
          <Ionicons name="cash" size={26} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.earningsLabel}>Total Earned</Text>
          <Text style={s.earningsValue}>{fmtN(stats?.totalEarnings ?? 0)}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: '#ECFDF5' }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>Rewards</Text>
        </View>
      </View>

      {/* Referral code card */}
      <View style={[s.codeCard]}>
        <Text style={s.codeTitle}>Your Referral Code</Text>
        <View style={s.codeBox}>
          <Text style={s.codeText}>{referralCode || '—'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.codeBtn} onPress={copy} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={18} color={PINK} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.codeBtn, { backgroundColor: PINK }]} onPress={share} activeOpacity={0.7}>
              <Ionicons name="share-social" size={18} color={WHITE} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s.codeSub}>Share this code with friends to earn rewards</Text>
      </View>

      {/* Leaderboard button */}
      <TouchableOpacity
        style={s.lbBtn}
        onPress={() => navigation.navigate('ReferralLeaderboard')}
        activeOpacity={0.7}
      >
        <View style={[s.statIcon, { backgroundColor: '#FFFBEB' }]}>
          <Ionicons name="trophy" size={20} color="#D97706" />
        </View>
        <Text style={s.lbBtnText}>View Leaderboard</Text>
        <Ionicons name="chevron-forward" size={18} color={TEXT3} />
      </TouchableOpacity>

      {/* Section header */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Your Referrals</Text>
        <Text style={s.sectionCount}>{stats?.totalReferrals ?? 0} total</Text>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#E04079', '#C0315E']} style={{ paddingTop: insets.top }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Referral Program</Text>
            <Text style={s.headerSub}>Earn rewards by inviting friends</Text>
          </View>
          <View style={s.trophyWrap}>
            <Ionicons name="trophy" size={26} color={WHITE} />
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={referrals}
        keyExtractor={i => i._id}
        renderItem={({ item }) => <ReferralCard item={item} navigation={navigation} />}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name="people-outline" size={40} color={TEXT3} /></View>
            <Text style={s.emptyTitle}>No referrals yet</Text>
            <Text style={s.emptySub}>Start inviting friends to earn rewards!</Text>
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={PINK} style={{ marginVertical: 20 }} /> : null}
      />
    </View>
  );
};

const ReferralCard = ({ item, navigation }: { item: Referral; navigation: any }) => {
  const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.pending;
  const initials = `${item.referee.firstName[0] ?? ''}${item.referee.lastName[0] ?? ''}`;

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => navigation.navigate('ReferralDetail', { referralId: item._id })}
      activeOpacity={0.75}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        {item.referee.avatar ? (
          <Image source={{ uri: item.referee.avatar }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { backgroundColor: PINK, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: WHITE }}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.refName}>{item.referee.firstName} {item.referee.lastName}</Text>
          <Text style={s.refEmail} numberOfLines={1}>{item.referee.email}</Text>
          <Text style={s.refJoined}>Joined {fmtDate(item.referee.createdAt)}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={14} color={cfg.color} />
          <Text style={[s.badgeText, { color: cfg.color }]}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
        </View>
      </View>

      <View style={s.cardFooter}>
        <View>
          <Text style={s.rewardLabel}>Reward</Text>
          <Text style={s.rewardValue}>{fmtN(item.referrerReward)}</Text>
        </View>
        {item.referrerPaid ? (
          <View style={[s.pill, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="checkmark-circle" size={13} color="#059669" />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>Paid</Text>
          </View>
        ) : item.status === 'pending' && !item.firstBookingCompleted ? (
          <View style={[s.pill, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="time" size={13} color="#D97706" />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#D97706' }}>Awaiting booking</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  trophyWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statNum: { fontSize: 22, fontWeight: '700', color: TEXT1 },
  statLabel: { fontSize: 11, color: TEXT2, marginTop: 4, textAlign: 'center' },

  earningsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: WHITE, borderRadius: 18, padding: 16, marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  earningsLabel: { fontSize: 12, color: TEXT2, marginBottom: 2 },
  earningsValue: { fontSize: 24, fontWeight: '700', color: TEXT1 },

  codeCard: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16, marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  codeTitle: { fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 12 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PINK_S, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 10, borderWidth: 2, borderColor: PINK, borderStyle: 'dashed',
  },
  codeText: { fontSize: 22, fontWeight: '700', color: PINK, letterSpacing: 3 },
  codeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  codeSub: { fontSize: 12, color: TEXT2, textAlign: 'center' },

  lbBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 18, padding: 16, marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  lbBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT1 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT1 },
  sectionCount: { fontSize: 13, color: TEXT2 },

  card: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  refName: { fontSize: 15, fontWeight: '600', color: TEXT1, marginBottom: 2 },
  refEmail: { fontSize: 12, color: TEXT2, marginBottom: 2 },
  refJoined: { fontSize: 11, color: TEXT3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER,
  },
  rewardLabel: { fontSize: 11, color: TEXT3, marginBottom: 2 },
  rewardValue: { fontSize: 18, fontWeight: '700', color: PINK },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },

  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 20 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: TEXT2, marginBottom: 8 },
  emptySub: { fontSize: 13, color: TEXT3, textAlign: 'center' },
});

export default ReferralScreen;
