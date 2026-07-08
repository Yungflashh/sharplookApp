import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Platform, StyleSheet, Dimensions, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { analyticsAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const { width: SW } = Dimensions.get('window');

const PINK  = '#E04079';
const PK2   = '#B5315F';
const BG    = '#FFF5F9';
const CARD  = '#FFFFFF';
const T1    = '#18181B';
const T2    = '#71717A';
const T3    = '#A1A1AA';

type Period  = '7days' | '30days' | '90days' | 'all';
type TabKey  = 'overview' | 'revenue' | 'performance';

const PERIODS: { label: string; value: Period }[] = [
  { label: '7 Days',  value: '7days'  },
  { label: '30 Days', value: '30days' },
  { label: '90 Days', value: '90days' },
  { label: 'All Time', value: 'all'   },
];

const lift = Platform.select({
  ios:     { shadowColor: '#18090F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 14 },
  android: { elevation: 3 },
}) as any;

const money = (n: number) => `₦${(n || 0).toLocaleString()}`;
const pct   = (n: number) => `${(n || 0).toFixed(0)}%`;
const fmt   = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n || 0);
};

const getDateRange = (period: Period) => {
  const end = new Date().toISOString();
  const DAY = 86_400_000;
  const days = period === '7days' ? 7 : period === '30days' ? 30 : period === '90days' ? 90 : null;
  const start = days ? new Date(Date.now() - days * DAY).toISOString() : new Date(2020, 0, 1).toISOString();
  return { startDate: start, endDate: end };
};

// ── Reusable sub-components ──────────────────────────────────────────────────

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={sc.sectionHead}>
    <Text style={sc.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={sc.sectionSub}>{subtitle}</Text> : null}
  </View>
);

const ProgressBar = ({ value, color, track = '#F0E6EC' }: { value: number; color: string; track?: string }) => (
  <View style={[sc.track, { backgroundColor: track }]}>
    <View style={[sc.fill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }]} />
  </View>
);

// ── Main screen ──────────────────────────────────────────────────────────────

const VendorAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period,     setPeriod]     = useState<Period>('30days');
  const [tab,        setTab]        = useState<TabKey>('overview');
  const [quick,      setQuick]      = useState<any>(null);
  const [data,       setData]       = useState<any>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [qr, ar] = await Promise.all([
        analyticsAPI.getVendorQuickStats(),
        analyticsAPI.getVendorAnalytics(getDateRange(period)),
      ]);
      if (qr.success)  setQuick(qr.data);
      if (ar.success)  setData(ar.data);
    } catch (e) {
      toast.error('Error', handleAPIError(e).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  // ── Hero metrics ──────────────────────────────────────────────────────────

  const totalRevenue = data?.revenue?.total ?? 0;
  const bookings     = data?.bookings?.total ?? quick?.totalBookings ?? 0;
  const orders       = data?.orders?.total   ?? quick?.totalOrders   ?? 0;
  const rating       = data?.reviews?.averageRating ?? quick?.averageRating ?? 0;
  const inEscrow     = data?.revenue?.inEscrow  ?? 0;
  const released     = data?.revenue?.released  ?? 0;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={PINK} />
        <Text style={s.loadingTxt}>Loading analytics…</Text>
      </View>
    );
  }

  // ── Overview tab ──────────────────────────────────────────────────────────

  const OverviewTab = () => (
    <View style={s.tabContent}>

      {/* 2×2 stat grid */}
      <View style={s.grid2}>
        {[
          { label: 'Bookings',  val: fmt(bookings), sub: `${fmt(data?.bookings?.completed ?? 0)} completed`, icon: 'calendar-month', ic: 'mc', color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Orders',    val: fmt(orders),   sub: `${fmt(data?.orders?.completed ?? 0)} completed`,   icon: 'bag',            ic: 'io', color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Products',  val: fmt(data?.overview?.totalProducts ?? quick?.totalProducts ?? 0),  sub: `${fmt(data?.overview?.activeProducts ?? 0)} active`,   icon: 'cube',   ic: 'io', color: '#0891B2', bg: '#ECFEFF' },
          { label: 'Services',  val: fmt(data?.overview?.totalServices ?? quick?.totalServices ?? 0),  sub: `${fmt(data?.overview?.activeServices ?? 0)} active`,   icon: 'briefcase', ic: 'io', color: PINK, bg: '#FFF0F5' },
        ].map((item, i) => (
          <View key={i} style={[s.gridCard, lift]}>
            <View style={[s.gridIcon, { backgroundColor: item.bg }]}>
              {item.ic === 'mc'
                ? <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                : <Ionicons name={item.icon as any} size={22} color={item.color} />}
            </View>
            <Text style={s.gridVal}>{item.val}</Text>
            <Text style={s.gridLabel}>{item.label}</Text>
            <Text style={s.gridSub}>{item.sub}</Text>
          </View>
        ))}
      </View>

      {/* Reviews card */}
      {data?.reviews && (
        <View style={[s.card, lift]}>
          <SectionHeader title="Customer Reviews" subtitle={`${data.reviews.total} total`} />
          <View style={s.ratingRow}>
            <View style={s.ratingLeft}>
              <Text style={s.bigRating}>{(data.reviews.averageRating || 0).toFixed(1)}</Text>
              <View style={s.stars}>
                {[1,2,3,4,5].map(n => (
                  <Ionicons key={n} name={n <= Math.round(data.reviews.averageRating) ? 'star' : 'star-outline'} size={14} color="#F59E0B" />
                ))}
              </View>
              <View style={[s.posPill, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[s.posText, { color: '#16A34A' }]}>{pct(data.reviews.positivePercentage)} positive</Text>
              </View>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              {[5,4,3,2,1].map(n => {
                const count = data.reviews.distribution?.[n] ?? 0;
                const pctVal = data.reviews.total > 0 ? (count / data.reviews.total) * 100 : 0;
                return (
                  <View key={n} style={s.ratingBarRow}>
                    <Text style={s.ratingBarLbl}>{n}</Text>
                    <Ionicons name="star" size={10} color="#F59E0B" style={{ marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={pctVal} color="#F59E0B" track="#FEF9EC" />
                    </View>
                    <Text style={s.ratingBarCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Customer insights */}
      {data?.customers && (
        <View style={[s.card, lift]}>
          <SectionHeader title="Customer Insights" />
          <View style={s.insightRow}>
            {[
              { label: 'Total',     val: data.customers.total,     color: '#2563EB', bg: '#EFF6FF', icon: 'people' },
              { label: 'Returning', val: data.customers.returning, color: '#16A34A', bg: '#F0FDF4', icon: 'repeat', note: `${pct(data.customers.returningRate)} rate` },
              { label: 'New',       val: data.customers.new,       color: '#7C3AED', bg: '#F5F3FF', icon: 'person-add' },
            ].map((c, i) => (
              <View key={i} style={[s.insightCard, { backgroundColor: c.bg }]}>
                <Ionicons name={c.icon as any} size={20} color={c.color} />
                <Text style={[s.insightVal, { color: c.color }]}>{fmt(c.val)}</Text>
                <Text style={s.insightLabel}>{c.label}</Text>
                {c.note ? <Text style={[s.insightNote, { color: c.color }]}>{c.note}</Text> : null}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  // ── Revenue tab ───────────────────────────────────────────────────────────

  const RevenueTab = () => {
    const byPeriod  = (data?.revenue?.byPeriod ?? []).slice(-7);
    const maxRev    = Math.max(...byPeriod.map((d: any) => d.revenue || 0), 1);
    const bookPct   = totalRevenue > 0 ? (data?.revenue?.fromBookings / totalRevenue) * 100 : 0;
    const ordPct    = totalRevenue > 0 ? (data?.revenue?.fromOrders   / totalRevenue) * 100 : 0;

    return (
      <View style={s.tabContent}>

        {/* Revenue sources split */}
        <View style={[s.card, lift]}>
          <SectionHeader title="Revenue Sources" subtitle={money(totalRevenue) + ' total'} />
          {[
            { label: 'From Bookings', val: data?.revenue?.fromBookings ?? 0, pct: bookPct, color: '#2563EB', bg: '#EFF6FF', icon: 'calendar' },
            { label: 'From Orders',   val: data?.revenue?.fromOrders   ?? 0, pct: ordPct,  color: '#7C3AED', bg: '#F5F3FF', icon: 'bag'      },
            { label: 'In Escrow',     val: inEscrow, pct: totalRevenue > 0 ? (inEscrow / totalRevenue) * 100 : 0, color: '#D97706', bg: '#FFFBEB', icon: 'hourglass' },
            { label: 'Released',      val: released, pct: totalRevenue > 0 ? (released / totalRevenue) * 100 : 0, color: '#16A34A', bg: '#F0FDF4', icon: 'checkmark-circle' },
          ].map((item, i) => (
            <View key={i} style={s.sourceRow}>
              <View style={[s.sourceIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.sourceLabelRow}>
                  <Text style={s.sourceLabel}>{item.label}</Text>
                  <Text style={[s.sourceVal, { color: item.color }]}>{money(item.val)}</Text>
                </View>
                <ProgressBar value={item.pct} color={item.color} />
              </View>
            </View>
          ))}
        </View>

        {/* Daily revenue bars */}
        {byPeriod.length > 0 && (
          <View style={[s.card, lift]}>
            <SectionHeader title="Revenue Trend" subtitle="Last 7 days" />
            <View style={{ gap: 12 }}>
              {byPeriod.map((item: any, i: number) => {
                const pctBar = (item.revenue / maxRev) * 100;
                const d = new Date(item.date);
                const label = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
                return (
                  <View key={i}>
                    <View style={s.trendLabelRow}>
                      <Text style={s.trendDate}>{label}</Text>
                      <Text style={s.trendAmt}>{money(item.revenue)}</Text>
                    </View>
                    <View style={s.trendBarBg}>
                      <LinearGradient colors={[PINK, PK2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.trendBarFill, { width: `${pctBar}%` }]} />
                    </View>
                    <View style={s.trendMeta}>
                      <Text style={s.trendMetaTxt}>{item.bookings} bookings</Text>
                      <Text style={s.trendMetaTxt}>{item.orders} orders</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Services */}
        {(data?.bookings?.topServices ?? []).length > 0 && (
          <View style={[s.card, lift]}>
            <SectionHeader title="Top Services" subtitle={`${data.bookings.topServices.length} services`} />
            {data.bookings.topServices.slice(0, 5).map((item: any, i: number) => (
              <View key={i} style={[s.rankRow, i < 4 && s.rankRowBorder]}>
                <View style={s.rankBadge}><Text style={s.rankNum}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rankName} numberOfLines={1}>{item.service?.name ?? 'Unknown'}</Text>
                  <Text style={s.rankMeta}>{item.bookings} bookings</Text>
                </View>
                <Text style={s.rankAmt}>{money(item.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Products */}
        {(data?.orders?.topProducts ?? []).length > 0 && (
          <View style={[s.card, lift]}>
            <SectionHeader title="Top Products" subtitle={`${data.orders.topProducts.length} products`} />
            {data.orders.topProducts.slice(0, 5).map((item: any, i: number) => (
              <View key={i} style={[s.rankRow, i < 4 && s.rankRowBorder]}>
                <View style={[s.rankBadge, { backgroundColor: '#F5F3FF' }]}><Text style={[s.rankNum, { color: '#7C3AED' }]}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rankName} numberOfLines={1}>{item.product?.name ?? 'Unknown'}</Text>
                  <Text style={s.rankMeta}>{item.orders} orders · {item.quantity} units</Text>
                </View>
                <Text style={[s.rankAmt, { color: '#7C3AED' }]}>{money(item.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Avg order value */}
        {(data?.orders?.averageOrderValue ?? 0) > 0 && (
          <View style={[s.card, lift, { flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
            <View style={[s.bigIconWrap, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="trending-up" size={28} color="#16A34A" />
            </View>
            <View>
              <Text style={s.bigIconLabel}>Avg. Order Value</Text>
              <Text style={s.bigIconVal}>{money(data.orders.averageOrderValue)}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Performance tab ───────────────────────────────────────────────────────

  const PerformanceTab = () => {
    const perf = data?.performance ?? {};
    const METRICS = [
      { label: 'Acceptance Rate',       val: pct(perf.acceptanceRate),        pct: perf.acceptanceRate ?? 0,                                     color: '#16A34A', icon: 'checkmark-circle' },
      { label: 'Completion Rate',       val: pct(perf.completionRate),        pct: perf.completionRate ?? 0,                                     color: '#2563EB', icon: 'flag'             },
      { label: 'Customer Satisfaction', val: pct(perf.customerSatisfactionScore), pct: perf.customerSatisfactionScore ?? 0,                      color: PINK,      icon: 'happy'            },
      { label: 'On-Time Delivery',      val: pct(perf.onTimeDeliveryRate),    pct: perf.onTimeDeliveryRate ?? 0,                                 color: '#7C3AED', icon: 'rocket'           },
      { label: 'Cancellation Rate',     val: pct(perf.cancellationRate),      pct: 100 - (perf.cancellationRate ?? 0),                           color: '#EF4444', icon: 'close-circle'     },
      { label: 'Avg Response Time',     val: `${(perf.responseTime ?? 0).toFixed(1)}h`, pct: Math.min((24 / (perf.responseTime || 24)) * 100, 100), color: '#D97706', icon: 'time'        },
    ];

    return (
      <View style={s.tabContent}>
        <View style={[s.card, lift]}>
          <SectionHeader title="Performance Metrics" />
          <View style={{ gap: 18 }}>
            {METRICS.map((m, i) => (
              <View key={i}>
                <View style={s.metricHeader}>
                  <View style={s.metricLeft}>
                    <View style={[s.metricDot, { backgroundColor: m.color + '20' }]}>
                      <Ionicons name={m.icon as any} size={14} color={m.color} />
                    </View>
                    <Text style={s.metricLabel}>{m.label}</Text>
                  </View>
                  <Text style={[s.metricVal, { color: m.color }]}>{m.val}</Text>
                </View>
                <ProgressBar value={m.pct} color={m.color} />
              </View>
            ))}
          </View>
        </View>

        {/* Booking status breakdown */}
        {(data?.bookings?.byStatus ?? []).length > 0 && (
          <View style={[s.card, lift]}>
            <SectionHeader title="Booking Status Breakdown" />
            {data.bookings.byStatus.map((bs: any, i: number) => {
              const STATUS_COLOR: Record<string, string> = {
                completed: '#16A34A', pending: '#D97706', cancelled: '#EF4444',
                confirmed: '#2563EB', in_progress: '#7C3AED', accepted: '#0891B2',
              };
              const color = STATUS_COLOR[bs.status] ?? T3;
              return (
                <View key={i} style={s.bsRow}>
                  <View style={[s.bsDot, { backgroundColor: color }]} />
                  <Text style={s.bsLabel}>{bs.status.replace(/_/g, ' ')}</Text>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <ProgressBar value={bs.percentage} color={color} track="#F5F5F5" />
                  </View>
                  <Text style={[s.bsCount, { color }]}>{bs.count}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Booking rates summary */}
        {data?.bookings && (
          <View style={[s.card, lift]}>
            <SectionHeader title="Booking Summary" />
            <View style={s.summaryGrid}>
              {[
                { label: 'Completed',   val: data.bookings.completed,  color: '#16A34A', bg: '#F0FDF4' },
                { label: 'Pending',     val: data.bookings.pending,    color: '#D97706', bg: '#FFFBEB' },
                { label: 'In Progress', val: data.bookings.inProgress, color: '#7C3AED', bg: '#F5F3FF' },
                { label: 'Cancelled',   val: data.bookings.cancelled,  color: '#EF4444', bg: '#FFF1F2' },
              ].map((item, i) => (
                <View key={i} style={[s.summaryCard, { backgroundColor: item.bg }]}>
                  <Text style={[s.summaryVal, { color: item.color }]}>{fmt(item.val ?? 0)}</Text>
                  <Text style={s.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.hBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={PINK} />
        </TouchableOpacity>
        <Text style={s.hTitle}>Analytics</Text>
        <TouchableOpacity style={s.hBtn} onPress={onRefresh} activeOpacity={0.7} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={PINK} />
            : <Ionicons name="refresh" size={20} color={PINK} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
      >
        {/* ── Hero revenue card ── */}
        <View style={s.heroWrap}>
          <LinearGradient colors={['#C9306B', '#6C1132']} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={s.heroCard}>
            <Text style={s.heroWatermark}>₦</Text>
            <Text style={s.heroLabel}>Total Revenue</Text>
            <Text style={s.heroAmt}>{money(totalRevenue)}</Text>
            <View style={s.heroRow}>
              {[
                { label: 'Bookings', val: fmt(bookings),      icon: 'calendar'         },
                { label: 'Orders',   val: fmt(orders),        icon: 'bag'              },
                { label: 'Rating',   val: rating.toFixed(1),  icon: 'star'             },
              ].map((h, i) => (
                <React.Fragment key={h.label}>
                  <View style={s.heroStat}>
                    <Ionicons name={h.icon as any} size={14} color="rgba(255,255,255,0.65)" />
                    <Text style={s.heroStatVal}>{h.val}</Text>
                    <Text style={s.heroStatLbl}>{h.label}</Text>
                  </View>
                  {i < 2 && <View style={s.heroDivider} />}
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* ── Period pills ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.periodRow}>
          {PERIODS.map(p => {
            const on = period === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                style={[s.periodPill, on && s.periodPillOn]}
                onPress={() => setPeriod(p.value)}
                activeOpacity={0.75}
              >
                <Text style={[s.periodTxt, on && s.periodTxtOn]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Tab bar ── */}
        <View style={s.tabBar}>
          {(['overview', 'revenue', 'performance'] as TabKey[]).map(t => {
            const on = tab === t;
            const LABEL: Record<TabKey, string> = { overview: 'Overview', revenue: 'Revenue', performance: 'Performance' };
            const ICON:  Record<TabKey, string> = { overview: 'analytics-outline', revenue: 'cash-outline', performance: 'trending-up-outline' };
            return (
              <TouchableOpacity key={t} style={[s.tabItem, on && s.tabItemOn]} onPress={() => setTab(t)} activeOpacity={0.8}>
                <Ionicons name={ICON[t] as any} size={16} color={on ? PINK : T3} />
                <Text style={[s.tabTxt, on && s.tabTxtOn]}>{LABEL[t]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab content ── */}
        {tab === 'overview'     && <OverviewTab />}
        {tab === 'revenue'      && <RevenueTab />}
        {tab === 'performance'  && <PerformanceTab />}
      </ScrollView>
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  loadingTxt:  { marginTop: 12, fontSize: 13, color: T2, fontWeight: '500' },

  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  hBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FAE8F0', alignItems: 'center', justifyContent: 'center' },
  hTitle:   { fontSize: 17, fontWeight: '800', color: T1, letterSpacing: -0.4 },

  // hero
  heroWrap:      { marginHorizontal: 16, marginBottom: 20, borderRadius: 24, ...Platform.select({ ios: { shadowColor: '#7A1040', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 24 }, android: { elevation: 12 } }) as any },
  heroCard:      { borderRadius: 24, padding: 22, overflow: 'hidden' },
  heroWatermark: { position: 'absolute', right: 12, top: -10, fontSize: 120, fontWeight: '900', color: 'rgba(255,255,255,0.05)' },
  heroLabel:     { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginBottom: 6 },
  heroAmt:       { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 20 },
  heroRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 12 },
  heroStat:      { flex: 1, alignItems: 'center', gap: 3 },
  heroStatVal:   { fontSize: 16, fontWeight: '800', color: '#fff' },
  heroStatLbl:   { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  heroDivider:   { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  // period pills
  periodRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  periodPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1.5, borderColor: '#F0E6EC' },
  periodPillOn: { backgroundColor: PINK, borderColor: PINK },
  periodTxt:  { fontSize: 13, fontWeight: '700', color: T2 },
  periodTxtOn:{ color: '#fff' },

  // tab bar
  tabBar:    { flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, backgroundColor: CARD, borderRadius: 16, padding: 4, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) as any },
  tabItem:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12 },
  tabItemOn: { backgroundColor: '#FFF0F5' },
  tabTxt:    { fontSize: 11, fontWeight: '700', color: T3 },
  tabTxtOn:  { color: PINK },

  // tab content wrapper
  tabContent: { paddingHorizontal: 16, gap: 16 },

  // generic card
  card: { backgroundColor: CARD, borderRadius: 20, padding: 18 },

  // section header
  sectionHead:  { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T1, letterSpacing: -0.2 },
  sectionSub:   { fontSize: 12, color: T3, marginTop: 2, fontWeight: '500' },

  // progress bar
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },

  // 2×2 grid
  grid2:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard:  { width: (SW - 44) / 2, backgroundColor: CARD, borderRadius: 20, padding: 16 },
  gridIcon:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gridVal:   { fontSize: 26, fontWeight: '900', color: T1, letterSpacing: -0.5, marginBottom: 2 },
  gridLabel: { fontSize: 12, fontWeight: '700', color: T2, marginBottom: 2 },
  gridSub:   { fontSize: 11, color: T3 },

  // reviews
  ratingRow:     { flexDirection: 'row', gap: 16 },
  ratingLeft:    { alignItems: 'center', gap: 6, marginRight: 4 },
  bigRating:     { fontSize: 42, fontWeight: '900', color: T1, letterSpacing: -1 },
  stars:         { flexDirection: 'row', gap: 2 },
  posPill:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginTop: 4 },
  posText:       { fontSize: 10, fontWeight: '700' },
  ratingBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingBarLbl:  { fontSize: 11, color: T2, width: 12, textAlign: 'right', fontWeight: '600' },
  ratingBarCount:{ fontSize: 11, color: T3, width: 20, textAlign: 'right' },

  // insights
  insightRow:  { flexDirection: 'row', gap: 10 },
  insightCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
  insightVal:  { fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  insightLabel:{ fontSize: 11, color: T2, fontWeight: '600' },
  insightNote: { fontSize: 10, fontWeight: '700' },

  // revenue sources
  sourceRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sourceIcon:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sourceLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sourceLabel:    { fontSize: 13, fontWeight: '600', color: T1 },
  sourceVal:      { fontSize: 13, fontWeight: '800' },

  // trend bars
  trendLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  trendDate:     { fontSize: 12, color: T2, fontWeight: '600' },
  trendAmt:      { fontSize: 13, fontWeight: '800', color: T1 },
  trendBarBg:    { height: 10, backgroundColor: '#F0E6EC', borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  trendBarFill:  { height: 10, borderRadius: 5 },
  trendMeta:     { flexDirection: 'row', justifyContent: 'space-between' },
  trendMetaTxt:  { fontSize: 10, color: T3 },

  // rank rows
  rankRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rankRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  rankBadge:     { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFF0F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankNum:       { fontSize: 11, fontWeight: '900', color: PINK },
  rankName:      { fontSize: 14, fontWeight: '700', color: T1, marginBottom: 2 },
  rankMeta:      { fontSize: 11, color: T3 },
  rankAmt:       { fontSize: 14, fontWeight: '800', color: PINK },

  // big icon stat
  bigIconWrap:  { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bigIconLabel: { fontSize: 12, color: T2, fontWeight: '600', marginBottom: 3 },
  bigIconVal:   { fontSize: 22, fontWeight: '900', color: T1, letterSpacing: -0.4 },

  // performance metrics
  metricHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  metricLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricDot:    { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricLabel:  { fontSize: 13, fontWeight: '600', color: T1 },
  metricVal:    { fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },

  // booking status
  bsRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  bsDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  bsLabel: { fontSize: 12, fontWeight: '600', color: T1, textTransform: 'capitalize', width: 80 },
  bsCount: { fontSize: 12, fontWeight: '800', width: 28, textAlign: 'right' },

  // summary grid
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { width: (SW - 80) / 2, borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryVal:  { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  summaryLabel:{ fontSize: 11, fontWeight: '600', color: T2 },
});

const sc = StyleSheet.create({
  sectionHead:  { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: T1, letterSpacing: -0.2 },
  sectionSub:   { fontSize: 12, color: T3, marginTop: 2, fontWeight: '500' },
  track:        { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:         { height: 6, borderRadius: 3 },
});

export default VendorAnalyticsScreen;
