import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { referralAPI } from '@/api/api';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG     = '#F8F9FA';
const WHITE  = '#FFFFFF';

const GOLD   = '#F59E0B';
const SILVER = '#94A3B8';
const BRONZE = '#CD7C54';

interface LeaderboardEntry {
  user: { _id: string; firstName: string; lastName: string; avatar?: string };
  referralCount: number;
  totalEarnings: number;
}

const RANK_COLORS = [GOLD, SILVER, BRONZE];
const RANK_BG     = ['#FFFBEB', '#F8FAFC', '#FFF7ED'];

const fmtN = (n: number) => `₦${n.toLocaleString()}`;

const ReferralLeaderboard = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [data, setData]         = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await referralAPI.getLeaderboard(20);
      setData(res.data?.leaderboard ?? []);
    } catch {}
    finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  const top3 = data.slice(0, 3);
  const rest  = data.slice(3);

  const Podium = () => (
    <View style={s.podium}>
      {/* 2nd place */}
      {top3[1] && (
        <View style={[s.podiumItem, { marginTop: 24 }]}>
          <View style={[s.podiumAvatar, { borderColor: SILVER }]}>
            {top3[1].user.avatar ? (
              <Image source={{ uri: top3[1].user.avatar }} style={s.podiumImg} />
            ) : (
              <View style={[s.podiumImg, { backgroundColor: SILVER, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={s.initials}>{top3[1].user.firstName[0]}{top3[1].user.lastName[0]}</Text>
              </View>
            )}
            <View style={[s.rankBadge, { backgroundColor: SILVER }]}>
              <Text style={s.rankBadgeText}>2</Text>
            </View>
          </View>
          <Text style={s.podiumName} numberOfLines={1}>{top3[1].user.firstName}</Text>
          <View style={[s.podiumPill, { backgroundColor: '#F8FAFC' }]}>
            <Ionicons name="people" size={11} color={SILVER} />
            <Text style={[s.podiumPillText, { color: SILVER }]}>{top3[1].referralCount}</Text>
          </View>
        </View>
      )}

      {/* 1st place */}
      {top3[0] && (
        <View style={s.podiumItem}>
          <View style={s.crownWrap}>
            <Text style={s.crown}>👑</Text>
          </View>
          <View style={[s.podiumAvatar, { borderColor: GOLD, width: 80, height: 80, borderRadius: 40 }]}>
            {top3[0].user.avatar ? (
              <Image source={{ uri: top3[0].user.avatar }} style={{ width: 72, height: 72, borderRadius: 36 }} />
            ) : (
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[s.initials, { fontSize: 24 }]}>{top3[0].user.firstName[0]}{top3[0].user.lastName[0]}</Text>
              </View>
            )}
            <View style={[s.rankBadge, { backgroundColor: GOLD }]}>
              <Text style={s.rankBadgeText}>1</Text>
            </View>
          </View>
          <Text style={[s.podiumName, { fontWeight: '700', fontSize: 14 }]} numberOfLines={1}>{top3[0].user.firstName}</Text>
          <View style={[s.podiumPill, { backgroundColor: '#FFFBEB' }]}>
            <Ionicons name="people" size={11} color={GOLD} />
            <Text style={[s.podiumPillText, { color: GOLD }]}>{top3[0].referralCount}</Text>
          </View>
          <Text style={s.earningsTop}>{fmtN(top3[0].totalEarnings)}</Text>
        </View>
      )}

      {/* 3rd place */}
      {top3[2] && (
        <View style={[s.podiumItem, { marginTop: 40 }]}>
          <View style={[s.podiumAvatar, { borderColor: BRONZE }]}>
            {top3[2].user.avatar ? (
              <Image source={{ uri: top3[2].user.avatar }} style={s.podiumImg} />
            ) : (
              <View style={[s.podiumImg, { backgroundColor: BRONZE, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={s.initials}>{top3[2].user.firstName[0]}{top3[2].user.lastName[0]}</Text>
              </View>
            )}
            <View style={[s.rankBadge, { backgroundColor: BRONZE }]}>
              <Text style={s.rankBadgeText}>3</Text>
            </View>
          </View>
          <Text style={s.podiumName} numberOfLines={1}>{top3[2].user.firstName}</Text>
          <View style={[s.podiumPill, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="people" size={11} color={BRONZE} />
            <Text style={[s.podiumPillText, { color: BRONZE }]}>{top3[2].referralCount}</Text>
          </View>
        </View>
      )}
    </View>
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
            <Text style={s.headerTitle}>Leaderboard</Text>
            <Text style={s.headerSub}>Top referrers this month</Text>
          </View>
          <View style={s.trophyWrap}>
            <Ionicons name="trophy" size={26} color={WHITE} />
          </View>
        </View>

        {data.length >= 3 && <Podium />}
        <View style={{ height: data.length >= 3 ? 20 : 16 }} />
      </LinearGradient>

      <FlatList
        data={rest}
        keyExtractor={i => i.user._id}
        renderItem={({ item, index }) => <RankCard entry={item} rank={index + 4} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
        ListEmptyComponent={
          rest.length === 0 && data.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Ionicons name="trophy-outline" size={40} color={TEXT3} /></View>
              <Text style={s.emptyTitle}>No leaderboard data yet</Text>
              <Text style={s.emptySub}>Be the first to start referring!</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const RankCard = ({ entry, rank }: { entry: LeaderboardEntry; rank: number }) => {
  const initials = `${entry.user.firstName[0] ?? ''}${entry.user.lastName[0] ?? ''}`;
  return (
    <View style={s.rankCard}>
      {/* Rank number */}
      <View style={s.rankNumWrap}>
        <Text style={s.rankNum}>{rank}</Text>
      </View>

      {/* Avatar */}
      {entry.user.avatar ? (
        <Image source={{ uri: entry.user.avatar }} style={s.avatar} />
      ) : (
        <View style={[s.avatar, { backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: PINK }}>{initials}</Text>
        </View>
      )}

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={s.rankName}>{entry.user.firstName} {entry.user.lastName}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <View style={s.metaPill}>
            <Ionicons name="people" size={11} color={PINK} />
            <Text style={[s.metaText, { color: PINK }]}>{entry.referralCount} refs</Text>
          </View>
          <View style={[s.metaPill, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="cash" size={11} color="#059669" />
            <Text style={[s.metaText, { color: '#059669' }]}>{fmtN(entry.totalEarnings)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: WHITE },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  trophyWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 16, gap: 8 },
  podiumItem: { alignItems: 'center', flex: 1 },
  crownWrap: { marginBottom: 4 },
  crown: { fontSize: 22 },
  podiumAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, overflow: 'visible', position: 'relative', marginBottom: 6 },
  podiumImg: { width: 56, height: 56, borderRadius: 28 },
  rankBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: WHITE },
  rankBadgeText: { fontSize: 11, fontWeight: '800', color: WHITE },
  initials: { fontSize: 18, fontWeight: '700', color: WHITE },
  podiumName: { fontSize: 13, fontWeight: '600', color: WHITE, marginBottom: 4, textAlign: 'center' },
  podiumPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  podiumPillText: { fontSize: 11, fontWeight: '700' },
  earningsTop: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  rankCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  rankNumWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  rankNum: { fontSize: 14, fontWeight: '700', color: TEXT2 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  rankName: { fontSize: 15, fontWeight: '600', color: TEXT1 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: PINK_S, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  metaText: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 20 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: TEXT2, marginBottom: 8 },
  emptySub: { fontSize: 13, color: TEXT3, textAlign: 'center' },
});

export default ReferralLeaderboard;
