import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { sharpPayAPI } from '../api/api';
import WalletFundingModal from '@/components/WalletFundingModal';
import WithdrawalModal from '@/components/WIthdrawalModal';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG     = '#F8F9FA';
const WHITE  = '#FFFFFF';

interface Transaction {
  _id: string; type: string; amount: number; status: string;
  description: string; reference: string; createdAt: string;
  balanceBefore: number; balanceAfter: number;
}
interface TransactionStats {
  totalTransactions: number; totalInflow: number; totalOutflow: number; currentBalance: number;
}

// ─── Icon / colour system per transaction type ───────────────────────────────
type TxCfg = { icon: string; color: string; bg: string };
const getTxConfig = (type: string): TxCfg => {
  const t = type.toLowerCase();
  if (t.includes('promo_bonus') || t === 'promo_bonus')          return { icon: 'gift-outline',              color: '#DB2777', bg: '#FEE2F0' };
  if (t.includes('refund'))                                       return { icon: 'refresh-outline',          color: '#3B82F6', bg: '#EFF6FF' };
  if (t.includes('earning') || t.includes('credit'))             return { icon: 'arrow-down-outline',        color: '#059669', bg: '#ECFDF5' };
  if (t.includes('deposit') || t.includes('fund'))               return { icon: 'wallet-outline',            color: '#059669', bg: '#ECFDF5' };
  if (t.includes('commission'))                                   return { icon: 'briefcase-outline',         color: '#7C3AED', bg: '#F5F3FF' };
  if (t.includes('withdrawal'))                                   return { icon: 'trending-down-outline',     color: '#D97706', bg: '#FFFBEB' };
  if (t.includes('payment') || t.includes('debit'))              return { icon: 'arrow-up-outline',          color: '#DC2626', bg: '#FEF2F2' };
  if (t.includes('booking'))                                      return { icon: 'calendar-outline',          color: PINK,      bg: PINK_S    };
  if (t.includes('order'))                                        return { icon: 'bag-handle-outline',        color: '#D97706', bg: '#FFFBEB' };
  return { icon: 'swap-horizontal-outline', color: TEXT2, bg: BORDER };
};


const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  completed:  { color: '#059669', bg: '#ECFDF5' },
  success:    { color: '#059669', bg: '#ECFDF5' },
  pending:    { color: '#D97706', bg: '#FFFBEB' },
  processing: { color: '#2563EB', bg: '#EFF6FF' },
  failed:     { color: '#DC2626', bg: '#FEF2F2' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isOutflow = (type: string) =>
  ['payment', 'withdrawal', 'debit', 'commission'].some(t => type.toLowerCase().includes(t));

const fmtAmount = (n: number) => `₦${n.toLocaleString()}`;

const fmtDate = (d: string) => {
  const date = new Date(d);
  const now  = new Date();
  const mins = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  if (hrs < 48)  return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

const formatType = (t: string) => {
  const lower = t.toLowerCase();
  if (lower === 'promo_bonus') return 'Promo Bonus 🎁';
  return t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const groupByDate = (txns: Transaction[]): { label: string; items: Transaction[] }[] => {
  const now = new Date();
  const todayStr     = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();
  const groups: { label: string; items: Transaction[] }[] = [];
  txns.forEach(txn => {
    const d = new Date(txn.createdAt);
    const dStr = d.toDateString();
    const label = dStr === todayStr ? 'Today'
      : dStr === yesterdayStr       ? 'Yesterday'
      : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    const g = groups.find(x => x.label === label);
    if (g) g.items.push(txn);
    else groups.push({ label, items: [txn] });
  });
  return groups;
};

// ─── Screen ──────────────────────────────────────────────────────────────────
const TransactionHistoryScreen = () => {
  const navigation = useNavigation();
  const insets     = useSafeAreaInsets();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats]               = useState<TransactionStats | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [filter, setFilter]             = useState<'all' | 'inflow' | 'outflow'>('all');
  const [dateFilter, setDateFilter]     = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showBalance, setShowBalance]   = useState(false);
  const [fundingModal, setFundingModal] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);

  const calcTotals = (txns: Transaction[]) => {
    let inflow = 0, outflow = 0;
    txns.forEach(t => { isOutflow(t.type) ? (outflow += t.amount) : (inflow += t.amount); });
    setStats(p => ({ totalTransactions: txns.length, totalInflow: inflow, totalOutflow: outflow, currentBalance: p?.currentBalance ?? 0 }));
  };

  const loadTransactions = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await sharpPayAPI.getTransactions({ page: pageNum, limit: 20 });
      const next: Transaction[] = res.data || [];
      const all = refresh || pageNum === 1 ? next : [...transactions, ...next];
      setTransactions(all);
      calcTotals(all);
      setHasMore(res.meta?.pagination?.hasNextPage ?? next.length === 20);
      setPage(pageNum);
    } catch {}
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  };

  const loadStats = async () => {
    try {
      const res = await sharpPayAPI.getStats();
      const s = res.data?.stats || {};
      setStats(p => ({ totalTransactions: p?.totalTransactions ?? 0, totalInflow: p?.totalInflow ?? 0, totalOutflow: p?.totalOutflow ?? 0, currentBalance: s.currentBalance || s.availableBalance || 0 }));
    } catch {}
  };

  useEffect(() => { loadTransactions(1); loadStats(); }, []);

  const onRefresh = useCallback(() => { loadTransactions(1, true); loadStats(); }, []);
  const loadMore  = () => { if (!loadingMore && hasMore) loadTransactions(page + 1); };

  const filterByDate = (t: Transaction) => {
    if (dateFilter === 'all') return true;
    const d = new Date(t.createdAt), now = new Date();
    if (dateFilter === 'today')  return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateFilter === 'week')   return d >= new Date(now.getTime() - 7 * 86400000);
    if (dateFilter === 'month')  return d >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return true;
  };

  const filtered = transactions.filter(t => {
    if (filter === 'inflow'  && isOutflow(t.type))  return false;
    if (filter === 'outflow' && !isOutflow(t.type)) return false;
    return filterByDate(t);
  });

  const grouped = groupByDate(filtered);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <View style={{ backgroundColor: WHITE, paddingTop: insets.top }}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={s.backBtn}>
              <Ionicons name="chevron-back" size={22} color={PINK} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Transaction History</Text>
            <View style={{ width: 38 }} />
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PINK} />
          <Text style={{ fontSize: 13, color: TEXT2, marginTop: 12 }}>Loading transactions…</Text>
        </View>
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
          <Text style={s.headerTitle}>Transaction History</Text>
          <View style={{ width: 38 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
        onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) loadMore();
        }}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Wallet card ──────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <LinearGradient
            colors={['#E04079', '#C0315E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.walletCard}
          >
            {/* Top row */}
            <View style={s.walletTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.walletLabel}>LookReal Pay</Text>
                <Text style={s.walletSub}>Available Balance</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBalance(p => !p)}
                activeOpacity={0.7}
                style={s.eyeBtn}
              >
                <Ionicons name={showBalance ? 'eye-outline' : 'eye-off-outline'} size={18} color={WHITE} />
              </TouchableOpacity>
            </View>

            {/* Balance */}
            <View style={s.balanceRow}>
              <Text style={s.balanceText}>
                {showBalance ? fmtAmount(stats?.currentBalance ?? 0) : '₦ ••••••'}
              </Text>
            </View>

            {/* Stats strip */}
            <View style={s.statsStrip}>
              <View style={s.statItem}>
                <View style={s.statIconWrap}>
                  <Ionicons name="arrow-down-outline" size={16} color={WHITE} />
                </View>
                <View>
                  <Text style={s.statItemLabel}>Total Inflow</Text>
                  <Text style={s.statItemValue}>
                    {showBalance ? fmtAmount(stats?.totalInflow ?? 0) : '••••'}
                  </Text>
                </View>
              </View>
              <View style={s.stripDivider} />
              <View style={s.statItem}>
                <View style={s.statIconWrap}>
                  <Ionicons name="arrow-up-outline" size={16} color={WHITE} />
                </View>
                <View>
                  <Text style={s.statItemLabel}>Total Outflow</Text>
                  <Text style={s.statItemValue}>
                    {showBalance ? fmtAmount(stats?.totalOutflow ?? 0) : '••••'}
                  </Text>
                </View>
              </View>
              <View style={s.stripDivider} />
              <View style={s.statItem}>
                <View style={s.statIconWrap}>
                  <Ionicons name="receipt-outline" size={16} color={WHITE} />
                </View>
                <View>
                  <Text style={s.statItemLabel}>Transactions</Text>
                  <Text style={s.statItemValue}>{stats?.totalTransactions ?? 0}</Text>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={s.actionBtnOutline}
                onPress={() => setFundingModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color={WHITE} />
                <Text style={s.actionBtnOutlineTxt}>Fund Wallet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.actionBtnSolid}
                onPress={() => setWithdrawModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-up-circle-outline" size={18} color={PINK} />
                <Text style={s.actionBtnSolidTxt}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          {/* Type filter */}
          <View style={s.typeFilterRow}>
            {(['all', 'inflow', 'outflow'] as const).map(f => {
              const active = filter === f;
              const icon = f === 'inflow' ? 'arrow-down-outline' : f === 'outflow' ? 'arrow-up-outline' : 'swap-horizontal-outline';
              const label = f === 'all' ? 'All' : f === 'inflow' ? 'Inflow' : 'Outflow';
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.7}
                  style={[s.typeChip, active && s.typeChipActive]}
                >
                  <Ionicons name={icon as any} size={14} color={active ? WHITE : TEXT2} />
                  <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingRight: 4 }}
            style={{ marginTop: 10 }}
          >
            {([
              { key: 'all',   label: 'All Time'    },
              { key: 'today', label: 'Today'       },
              { key: 'week',  label: 'Last 7 Days' },
              { key: 'month', label: 'Last 30 Days'},
            ] as const).map(d => {
              const active = dateFilter === d.key;
              return (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setDateFilter(d.key)}
                  activeOpacity={0.7}
                  style={[s.dateChip, active && s.dateChipActive]}
                >
                  <Text style={[s.dateChipText, active && s.dateChipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Transaction list ─────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {grouped.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="receipt-outline" size={40} color={TEXT3} />
              </View>
              <Text style={s.emptyTitle}>No Transactions</Text>
              <Text style={s.emptySub}>
                {filter !== 'all'
                  ? `No ${filter} transactions found`
                  : 'Your transaction history will appear here'}
              </Text>
            </View>
          ) : (
            grouped.map(group => (
              <View key={group.label}>
                {/* Date group header */}
                <Text style={s.groupLabel}>{group.label}</Text>

                {/* Cards */}
                <View style={s.groupCard}>
                  {group.items.map((txn, i) => {
                    const cfg      = getTxConfig(txn.type);
                    const negative = isOutflow(txn.type);
                    const stsCfg   = STATUS_CFG[txn.status.toLowerCase()] ?? STATUS_CFG['pending'];
                    const isLast   = i === group.items.length - 1;
                    return (
                      <View key={`${txn._id}-${i}`} style={[s.txRow, !isLast && s.txRowBorder]}>
                        {/* Icon */}
                        <View style={[s.txIcon, { backgroundColor: cfg.bg }]}>
                          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                        </View>

                        {/* Info */}
                        <View style={s.txBody}>
                          <Text style={s.txType} numberOfLines={1}>{formatType(txn.type)}</Text>
                          {txn.description ? (
                            <Text style={s.txDesc} numberOfLines={1}>{txn.description}</Text>
                          ) : null}
                          <Text style={s.txTime}>{fmtDate(txn.createdAt)}</Text>
                        </View>

                        {/* Amount + status */}
                        <View style={s.txRight}>
                          <Text style={[s.txAmount, { color: negative ? '#DC2626' : '#059669' }]}>
                            {negative ? '−' : '+'}₦{txn.amount.toLocaleString()}
                          </Text>
                          <View style={[s.statusPill, { backgroundColor: stsCfg.bg }]}>
                            <Text style={[s.statusText, { color: stsCfg.color }]}>
                              {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {loadingMore && (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={PINK} />
            </View>
          )}
          {!hasMore && filtered.length > 0 && (
            <Text style={{ textAlign: 'center', color: TEXT3, fontSize: 12, paddingVertical: 16 }}>
              You've reached the end
            </Text>
          )}
        </View>
      </ScrollView>

      <WalletFundingModal
        visible={fundingModal}
        onClose={() => setFundingModal(false)}
        onSuccess={() => { loadTransactions(1, true); loadStats(); }}
        currentBalance={stats?.currentBalance ?? 0}
      />
      <WithdrawalModal
        visible={withdrawModal}
        onClose={() => setWithdrawModal(false)}
        onSuccess={() => { loadTransactions(1, true); loadStats(); }}
        currentBalance={stats?.currentBalance ?? 0}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
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

  // Wallet card
  walletCard: {
    borderRadius: 24, padding: 20,
    ...Platform.select({ android: { elevation: 10 }, ios: { shadowColor: PINK, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16 } }),
  },
  walletTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  walletLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: 2 },
  walletSub:   { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  eyeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  balanceRow: { marginBottom: 20 },
  balanceText: { fontSize: 36, fontWeight: '800', color: WHITE, letterSpacing: 0.5 },

  statsStrip: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 14, marginBottom: 16, alignItems: 'center',
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  statItemLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  statItemValue: { fontSize: 13, fontWeight: '700', color: WHITE },
  stripDivider:  { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },

  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
  },
  actionBtnOutlineTxt: { fontSize: 14, fontWeight: '600', color: WHITE },
  actionBtnSolid: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 12, backgroundColor: WHITE,
  },
  actionBtnSolidTxt: { fontSize: 14, fontWeight: '600', color: PINK },

  // Filters
  typeFilterRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER,
  },
  typeChipActive:      { backgroundColor: PINK, borderColor: PINK },
  typeChipText:        { fontSize: 13, fontWeight: '600', color: TEXT2 },
  typeChipTextActive:  { color: WHITE },
  dateChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: BORDER,
  },
  dateChipActive:      { backgroundColor: PINK_S, borderColor: PINK },
  dateChipText:        { fontSize: 12, fontWeight: '600', color: TEXT2 },
  dateChipTextActive:  { color: PINK },

  // Transaction list
  groupLabel: {
    fontSize: 11, fontWeight: '700', color: TEXT3,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginTop: 4,
  },
  groupCard: {
    backgroundColor: WHITE, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER, marginBottom: 16,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  txIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txBody: { flex: 1 },
  txType: { fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 2 },
  txDesc: { fontSize: 12, color: TEXT2, marginBottom: 2 },
  txTime: { fontSize: 11, color: TEXT3 },
  txRight: { alignItems: 'flex-end', gap: 5 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT1, marginBottom: 6 },
  emptySub:  { fontSize: 13, color: TEXT3, textAlign: 'center', paddingHorizontal: 32 },
});

export default TransactionHistoryScreen;
