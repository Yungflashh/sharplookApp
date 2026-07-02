import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StatusBar,
  RefreshControl, Platform, StyleSheet, Image, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation.types';
import KycGateModal from '@/components/KycGateModal';
import {
  vendorAPI, walletAPI, bookingAPI, analyticsAPI,
  userAPI, notificationAPI, messageAPI, offerAPI, handleAPIError,
} from '@/api/api';
import socketService from '@/services/socket.service';
import WalletFundingModal from '@/components/WalletFundingModal';
import WithdrawalModal from '@/components/WIthdrawalModal';
import { toast } from '@/components/ui/Toast';
import { LineChart } from 'react-native-chart-kit';

const { width: SW } = Dimensions.get('window');

const BG    = '#FFF5F9';
const CARD  = '#FFFFFF';
const PINK  = '#E04079';
const PK2   = '#B5315F';
const T1    = '#18181B';
const T2    = '#71717A';
const T3    = '#A1A1AA';

type Nav = StackNavigationProp<RootStackParamList, 'Main'>;

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning 👋' : h < 18 ? 'Good afternoon 👋' : 'Good evening 👋';
};

const money = (n: number) => `₦${n.toLocaleString()}`;

const STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  pending:     { bg: '#FFF7ED', fg: '#C2410C', label: 'Pending'     },
  confirmed:   { bg: '#EFF6FF', fg: '#1D4ED8', label: 'Upcoming'    },
  upcoming:    { bg: '#EFF6FF', fg: '#1D4ED8', label: 'Upcoming'    },
  in_progress: { bg: '#F5F3FF', fg: '#6D28D9', label: 'In progress' },
  inprogress:  { bg: '#F5F3FF', fg: '#6D28D9', label: 'In progress' },
  completed:   { bg: '#F0FDF4', fg: '#15803D', label: 'Completed'   },
  cancelled:   { bg: '#FFF1F2', fg: '#BE123C', label: 'Cancelled'   },
};

// ── one reusable shadow, applied only to list items & wallet card ─
const lift = Platform.select({
  ios:     { shadowColor: '#18090F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 14 },
  android: { elevation: 3 },
}) as any;

const VendorDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();

  const [kycStatus, setKycStatus]           = useState<string>('not_submitted');
  const [kycGateVisible, setKycGateVisible] = useState(false);
  const [balVisible, setBalVisible]         = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [period, setPeriod]                 = useState<'today' | 'week' | 'month'>('week');

  const [profile, setProfile]               = useState<any>(null);
  const [wallet, setWallet]                 = useState({ balance: 0, escrow: 0, earned: 0 });
  const [stats, setStats]                   = useState({ bookings: 0, orders: 0, rating: 0 });
  const [schedule, setSchedule]             = useState<any[]>([]);
  const [analytics, setAnalytics]           = useState<any>(null);
  const [chartVals, setChartVals]           = useState<number[]>([10, 20, 15, 30, 25, 40, 35]);
  const [chartLabels, setChartLabels]       = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [chartLoading, setChartLoading]     = useState(false);

  const [notifs, setNotifs]                 = useState(0);
  const [msgs, setMsgs]                     = useState(0);
  const [offerCount, setOfferCount]         = useState(0);
  const [fundModal, setFundModal]           = useState(false);
  const [withdrawModal, setWithdrawModal]   = useState(false);

  useEffect(() => {
    socketService.connect();
    socketService.onNewMessage(() => setMsgs(p => p + 1));
    socketService.onNewOffer(() => setOfferCount(p => p + 1));
    socketService.onKycStatusChanged((data) => {
      setKycStatus(data.kycStatus);
      if (data.kycStatus === 'approved') {
        toast.success('KYC Approved', 'Your identity has been verified. All features are now unlocked!');
      } else if (data.kycStatus === 'rejected') {
        toast.error('KYC Rejected', data.rejectionReason ?? 'Please re-upload valid documents.');
      }
    });
    return () => {
      socketService.removeListener('message:new');
      socketService.removeListener('offer:new');
      socketService.removeListener('kyc:status:changed');
    };
  }, []);

  useFocusEffect(useCallback(() => {
    loadCounts();
    if (!socketService.isSocketConnected()) socketService.connect();
    const t = setInterval(loadCounts, 30_000);
    return () => clearInterval(t);
  }, []));

  useEffect(() => { loadAll(); }, []);

  const loadCounts = async () => {
    try {
      const [nr, mr] = await Promise.all([
        notificationAPI.getUnreadCount(),
        messageAPI.getUnreadCount(),
      ]);
      setNotifs(nr.data?.count ?? 0);
      setMsgs(mr.data?.unreadCount ?? 0);
    } catch {}
  };

  const loadAll = async () => {
    try {
      const pr = await userAPI.getProfile();
      if (pr.success) {
        const u = pr.data.user ?? pr.data;
        setProfile(u);
        setKycStatus(u?.vendorProfile?.kycStatus ?? 'not_submitted');
      }

      // wallet — /sharppay/balance
      try {
        const wr = await walletAPI.getBalance();
        if (wr.success) {
          const d = wr.data;
          setWallet({
            balance: d.balance ?? d.availableBalance ?? 0,
            escrow:  d.escrowBalance ?? d.pendingBalance ?? d.inEscrow ?? 0,
            earned:  d.totalEarnings ?? d.totalEarned ?? 0,
          });
        }
      } catch {}

      // quick stats
      try {
        const qr = await analyticsAPI.getVendorQuickStats();
        if (qr.success) {
          const d = qr.data;
          setStats({
            bookings: d.totalBookings ?? d.bookings ?? 0,
            orders:   d.totalOrders   ?? d.orders   ?? 0,
            rating:   d.averageRating ?? d.rating   ?? 0,
          });
        }
      } catch {
        try {
          const vr = await vendorAPI.getStats();
          if (vr.success) {
            const d = vr.data?.stats ?? vr.data ?? {};
            setStats(p => ({ ...p, bookings: d.total ?? p.bookings }));
          }
        } catch {}
      }

      // today's bookings
      try {
        const br = await bookingAPI.getMyBookings({ role: 'vendor', limit: 50 });
        if (br.success) {
          const all: any[] = br.data?.bookings ?? br.data ?? [];
          const s = new Date(); s.setHours(0, 0, 0, 0);
          const e = new Date(s); e.setDate(e.getDate() + 1);
          setSchedule(
            all
              .filter(b => { const d = new Date(b.scheduledDate ?? b.date ?? b.createdAt); return d >= s && d < e; })
              .slice(0, 5)
          );
        }
      } catch {}

      // available offers count
      try {
        const or = await offerAPI.getAvailableOffers({ page: 1, limit: 1 });
        if (or.success) {
          const total = or.data?.pagination?.total ?? (or.data?.offers ?? or.data ?? []).length;
          setOfferCount(total);
        }
      } catch {}

      await loadCounts();
      await loadChart('week');
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    }
  };

  const loadChart = async (p: 'today' | 'week' | 'month') => {
    try {
      setChartLoading(true);
      const res = await analyticsAPI.getDashboard(p);
      if (res.success) {
        const d = res.data;
        const chart: Array<{ label: string; value: number }> = d.analytics?.chart ?? [];
        if (chart.length > 0) {
          setChartLabels(chart.map((c: any) => String(c.label)));
          setChartVals(chart.map((c: any) => Math.max(c.value ?? 0, 0)));
        }
        setAnalytics(d.analytics ?? null);
      }
    } catch {
      // keep last chart values on error
    } finally {
      setChartLoading(false);
    }
  };

  // re-fetch chart whenever period tab changes
  useEffect(() => { loadChart(period); }, [period]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll().finally(() => setRefreshing(false));
  }, []);

  const name    = profile?.businessName ?? profile?.firstName ?? 'Vendor';
  const active  = profile?.isActive !== false;
  const earn    = analytics?.earnings?.value ?? 0;
  const eChg    = analytics?.earnings?.change ?? 0;
  const bChg    = analytics?.bookings?.change ?? 0;
  const oChg    = analytics?.orders?.change ?? 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate('VendorProfile' as any)} style={s.avatarBtn} activeOpacity={0.8}>
          {profile?.avatar ? (
            <Image source={{ uri: profile.avatar }} style={s.avatarThumb} />
          ) : (
            <LinearGradient colors={[PINK, PK2]} style={s.avatarThumb}>
              <Text style={s.avatarInit}>{(name ?? 'V').charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
        <Text style={s.hTitle}>Dashboard</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={s.hBtn} activeOpacity={0.7}>
            <Ionicons name="notifications" size={20} color={PINK} />
            {notifs > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{notifs > 9 ? '9+' : notifs}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ChatList')} style={s.hBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="message-text" size={20} color={PINK} />
            {msgs > 0 && <View style={s.badge}><Text style={s.badgeTxt}>{msgs > 9 ? '9+' : msgs}</Text></View>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
      >
        {/* GREETING — no card, sits on BG */}
        <View style={s.greeting}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetSub}>{greet()}</Text>
            <Text style={s.greetName} numberOfLines={1}>{name}</Text>
          </View>
          <View style={[s.activePill, { backgroundColor: active ? '#DCFCE7' : '#FFE4E6' }]}>
            <View style={[s.activeDot, { backgroundColor: active ? '#16A34A' : '#DC2626' }]} />
            <Text style={[s.activeTxt, { color: active ? '#15803D' : '#B91C1C' }]}>
              {active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* WALLET CARD */}
        <View style={s.walletWrap}>
          <LinearGradient colors={['#C9306B', '#6C1132']} start={{ x: 0.05, y: 0 }} end={{ x: 0.95, y: 1 }} style={s.walletCard}>
            <Text style={s.watermark}>LR</Text>

            <View style={s.wRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.wLogo}><Text style={s.wLogoTxt}>R</Text></View>
                <Text style={s.wBrand}>LookReal Pay</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')} style={s.histPill} activeOpacity={0.8}>
                <Text style={s.histTxt}>History</Text>
                <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={s.balLbl}>Available Balance</Text>
              <TouchableOpacity onPress={() => setBalVisible(!balVisible)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
                <Ionicons name={balVisible ? 'eye-outline' : 'eye-off-outline'} size={15} color="rgba(255,255,255,0.55)" />
              </TouchableOpacity>
            </View>
            <Text style={s.balAmt}>{balVisible ? money(wallet.balance) : '₦ • • • • • •'}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.splitLbl}>In Escrow</Text>
                <Text style={s.splitVal}>{balVisible ? money(wallet.escrow) : '₦ ••••'}</Text>
              </View>
              <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.18)', marginRight: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.splitLbl}>Total Earned</Text>
                <Text style={s.splitVal}>{balVisible ? money(wallet.earned) : '₦ ••••'}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setFundModal(true)} style={s.fundBtn} activeOpacity={0.85}>
                <MaterialCommunityIcons name="plus" size={16} color={PINK} />
                <Text style={s.fundTxt}>Funds Wallet</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { if (kycStatus !== 'approved') { setKycGateVisible(true); } else { setWithdrawModal(true); } }} style={s.wdBtn} activeOpacity={0.85}>
                <MaterialCommunityIcons name="arrow-up" size={16} color="#fff" />
                <Text style={s.wdTxt}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* STATS — no card, three inline items on BG */}
        <View style={s.statsRow}>
          {[
            { icon: <MaterialCommunityIcons name="calendar-month" size={26} color="#3B82F6" />, bg: '#EFF6FF', val: String(stats.bookings), lbl: 'Bookings'     },
            { icon: <Ionicons name="bag" size={24} color="#10B981" />,                          bg: '#ECFDF5', val: String(stats.orders),   lbl: 'Total Orders' },
            { icon: <Ionicons name="star" size={24} color="#F59E0B" />,                         bg: '#FFFBEB', val: stats.rating > 0 ? stats.rating.toFixed(1) : '0.0', lbl: 'Ratings' },
          ].map((st, i) => (
            <View key={i} style={s.statItem}>
              <View style={[s.statIcon, { backgroundColor: st.bg }]}>{st.icon}</View>
              <Text style={s.statVal}>{st.val}</Text>
              <Text style={s.statLbl}>{st.lbl}</Text>
            </View>
          ))}
        </View>

        {/* QUICK ACTIONS — 3 top row, 2 centred below */}
        {(() => {
          const ACTIONS = [
            { lbl: 'Add Service', icon: <MaterialCommunityIcons name="briefcase-plus" size={26} color={PINK} />,           bg: '#FFF0F5', nav: 'Services',        badge: 0 },
            { lbl: 'Add Product', icon: <MaterialCommunityIcons name="package-variant-closed" size={26} color="#7C3AED" />, bg: '#F5F3FF', nav: 'MyProducts',      badge: 0 },
            { lbl: 'Bookings',    icon: <MaterialCommunityIcons name="calendar-check" size={26} color="#2563EB" />,         bg: '#EFF6FF', nav: 'Bookings',        badge: 0 },
            { lbl: 'Analytics',   icon: <Ionicons name="analytics" size={26} color="#0891B2" />,                            bg: '#ECFEFF', nav: 'Analytics',       badge: 0 },
            { lbl: 'Offers',      icon: <Ionicons name="pricetag" size={26} color="#16A34A" />,                             bg: '#F0FDF4', nav: 'AvailableOffers',  badge: offerCount },
          ];
          const renderItem = (a: typeof ACTIONS[0], i: number) => (
            <TouchableOpacity
              key={i}
              style={s.quickItem}
              onPress={() => {
                if (a.nav === 'AvailableOffers') setOfferCount(0);
                navigation.navigate(a.nav as any);
              }}
              activeOpacity={0.75}
            >
              <View style={s.quickIconWrap}>
                <View style={[s.quickIcon, { backgroundColor: a.bg }]}>{a.icon}</View>
                {a.badge > 0 && (
                  <View style={s.quickBadge}>
                    <Text style={s.quickBadgeTxt}>{a.badge > 99 ? '99+' : a.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={s.quickLbl}>{a.lbl}</Text>
            </TouchableOpacity>
          );
          return (
            <View style={s.sec}>
              <Text style={s.secTitle}>Quick Action</Text>
              <View style={s.quickRow}>{ACTIONS.slice(0, 3).map(renderItem)}</View>
              <View style={s.quickRowCenter}>{ACTIONS.slice(3).map(renderItem)}</View>
            </View>
          );
        })()}

        {/* TODAY SCHEDULE — section title on BG, items are white cards with shadow */}
        <View style={s.sec}>
          <View style={s.secRow}>
            <Text style={s.secTitle}>Today Schedule</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bookings')} activeOpacity={0.7}>
              <Text style={s.link}>See All</Text>
            </TouchableOpacity>
          </View>

          {schedule.length === 0 ? (
            <View style={[s.emptyWrap, lift]}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={34} color={T3} />
              <Text style={s.emptyTxt}>No bookings today</Text>
            </View>
          ) : (
            schedule.map((b, i) => {
              const key   = (b.status ?? '').toLowerCase().replace(/\s+/g, '_');
              const st    = STATUS[key] ?? STATUS.pending;
              const cName = b.client
                ? `${b.client.firstName ?? ''} ${b.client.lastName ?? ''}`.trim()
                : b.clientName ?? 'Client';
              const sName = b.service?.name ?? b.serviceName ?? 'Service';
              const time  = b.scheduledTime ?? b.time ?? '—';
              const price = b.totalPrice ?? b.price ?? 0;
              const av    = b.client?.avatar ?? null;

              return (
                <TouchableOpacity
                  key={b._id ?? i}
                  style={[s.schedCard, lift]}
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: b._id })}
                  activeOpacity={0.85}
                >
                  <View style={{ marginRight: 12 }}>
                    {av ? (
                      <Image source={{ uri: av }} style={s.ava} />
                    ) : (
                      <LinearGradient colors={[PINK, PK2]} style={s.ava}>
                        <Text style={s.avaInit}>{cName.charAt(0).toUpperCase()}</Text>
                      </LinearGradient>
                    )}
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={s.schedName} numberOfLines={1}>{cName}</Text>
                    <Text style={s.schedSvc}  numberOfLines={1}>{sName}</Text>
                    <Text style={s.schedTime}>Today · {time}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={[s.stBadge, { backgroundColor: st.bg }]}>
                      <Text style={[s.stTxt, { color: st.fg }]}>{st.label}</Text>
                    </View>
                    <Text style={s.schedPrice}>{money(price)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ANALYTICS — section title on BG, light inner panel for chart only */}
        <View style={s.sec}>
          <View style={s.secRow}>
            <Text style={s.secTitle}>Analytics</Text>
            <View style={s.tabs}>
              {(['today', 'week', 'month'] as const).map(p => {
                const on = period === p;
                return (
                  <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[s.tab, on && s.tabOn]} activeOpacity={0.8}>
                    <Text style={[s.tabTxt, on && s.tabTxtOn]}>
                      {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3 metrics in their own white pill so values are always readable */}
          <View style={[s.metricsWrap, lift]}>
          <View style={s.metrics}>
            {[
              { lbl: 'Earnings', val: money(earn),                                              chg: eChg },
              { lbl: 'Bookings', val: String(analytics?.bookings?.value ?? stats.bookings), chg: bChg },
              { lbl: 'Orders',   val: String(analytics?.orders?.value   ?? stats.orders),   chg: oChg },
            ].map((m, i) => (
              <View key={i} style={[s.metric, i < 2 && s.metricBr]}>
                <Text style={s.metricLbl}>{m.lbl}</Text>
                <Text style={s.metricVal}>{m.val}</Text>
                <Text style={s.metricChg}>
                  {(m.chg ?? 0) >= 0 ? '+' : ''}{typeof m.chg === 'number' ? m.chg.toFixed(1) : '0.0'}%
                </Text>
              </View>
            ))}
          </View>
          </View>

          {/* Chart panel — white bg, shadow, no overflow clipping */}
          <View style={[s.chartPanel, lift]}>
            {chartLoading ? (
              <View style={s.chartPlaceholder}>
                <MaterialCommunityIcons name="chart-line" size={32} color={T3} />
                <Text style={s.chartPlaceholderTxt}>Loading chart…</Text>
              </View>
            ) : (
              <LineChart
                data={{ labels: chartLabels, datasets: [{ data: chartVals }] }}
                width={SW - 40}
                height={160}
                chartConfig={{
                  backgroundColor:        CARD,
                  backgroundGradientFrom: CARD,
                  backgroundGradientTo:   CARD,
                  decimalPlaces:          0,
                  color:       (o = 1) => `rgba(224,64,121,${o})`,
                  labelColor:  ()       => T3,
                  propsForDots: { r: '5', strokeWidth: '2', stroke: PINK, fill: PINK },
                  propsForBackgroundLines: { stroke: '#F0E6EC', strokeDasharray: '' },
                  fillShadowGradientOpacity: 0.12,
                }}
                bezier
                fromZero
                withInnerLines
                withOuterLines={false}
                withShadow={false}
                style={{ borderRadius: 0, marginLeft: -16 }}
                formatYLabel={v => {
                  const n = parseInt(v, 10);
                  if (isNaN(n) || n === 0) return '₦0';
                  return n >= 1000 ? `₦${(n / 1000).toFixed(0)}k` : `₦${n}`;
                }}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <KycGateModal
        visible={kycGateVisible}
        action="withdrawal"
        kycStatus={kycStatus as any}
        onClose={() => setKycGateVisible(false)}
        onGoToKyc={() => { setKycGateVisible(false); navigation.navigate('VendorStoreSettings' as any); }}
      />
      <WalletFundingModal
        visible={fundModal}
        onClose={() => setFundModal(false)}
        onSuccess={loadAll}
        currentBalance={wallet.balance}
      />
      <WithdrawalModal
        visible={withdrawModal}
        onClose={() => setWithdrawModal(false)}
        onSuccess={loadAll}
        currentBalance={wallet.balance}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 },
  hBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FAE8F0', alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: 17, fontWeight: '800', color: T1, letterSpacing: -0.4 },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  avatarThumb: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { fontSize: 16, fontWeight: '800', color: '#fff' },
  badge: { position: 'absolute', top: -1, right: -1, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: CARD },
  badgeTxt: { fontSize: 7, fontWeight: '900', color: '#fff' },

  // greeting — no card
  greeting: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 22 },
  greetSub: { fontSize: 13, color: T2, fontWeight: '500', marginBottom: 3 },
  greetName: { fontSize: 22, fontWeight: '900', color: T1, letterSpacing: -0.6 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  activeDot: { width: 7, height: 7, borderRadius: 4 },
  activeTxt: { fontSize: 12, fontWeight: '700' },

  // wallet card
  walletWrap: {
    marginHorizontal: 16, marginBottom: 28, borderRadius: 24,
    ...Platform.select({
      ios:     { shadowColor: '#7A1040', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  walletCard: { borderRadius: 24, padding: 22, overflow: 'hidden' },
  watermark: { position: 'absolute', right: 10, bottom: 10, fontSize: 100, fontWeight: '900', color: 'rgba(255,255,255,0.05)', letterSpacing: -6 },
  wRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  wLogo: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  wLogoTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
  wBrand: { color: '#fff', fontSize: 14, fontWeight: '700' },
  histPill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20 },
  histTxt: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '700' },
  balLbl: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  balAmt: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -0.5, marginBottom: 18 },
  splitLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 3 },
  splitVal: { color: '#fff', fontSize: 14, fontWeight: '700' },
  fundBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 13 },
  fundTxt: { color: PINK, fontWeight: '700', fontSize: 14 },
  wdBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingVertical: 13 },
  wdTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // stats — no card, live on BG
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingBottom: 28 },
  statItem: { alignItems: 'center', gap: 8 },
  statIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: T1, letterSpacing: -0.4 },
  statLbl: { fontSize: 11, color: T2, fontWeight: '600' },

  // sections
  sec: { paddingHorizontal: 20, paddingBottom: 26 },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  secTitle: { fontSize: 16, fontWeight: '800', color: T1, letterSpacing: -0.3 },
  link: { fontSize: 13, fontWeight: '700', color: PINK },

  // quick actions — responsive grid
  quickRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  quickRowCenter: { flexDirection: 'row', justifyContent: 'space-evenly' },
  quickItem:      { flex: 1, alignItems: 'center', gap: 8 },
  quickIconWrap:  { position: 'relative' },
  quickIcon:      { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickBadge:     { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: BG },
  quickBadgeTxt:  { fontSize: 9, fontWeight: '900', color: '#fff' },
  quickLbl:       { fontSize: 11, fontWeight: '700', color: T1, textAlign: 'center' },

  // schedule cards — white card with shadow, no border
  schedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 18, padding: 14, marginBottom: 10 },
  ava: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avaInit: { color: '#fff', fontWeight: '800', fontSize: 22 },
  schedName: { fontSize: 14, fontWeight: '700', color: T1, marginBottom: 2 },
  schedSvc: { fontSize: 12, color: T2, marginBottom: 4 },
  schedTime: { fontSize: 11, color: PINK, fontWeight: '600' },
  stBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stTxt: { fontSize: 11, fontWeight: '700' },
  schedPrice: { fontSize: 13, fontWeight: '800', color: T1 },
  emptyWrap: { backgroundColor: CARD, borderRadius: 18, paddingVertical: 32, alignItems: 'center', gap: 10 },
  emptyTxt: { fontSize: 13, color: T3, fontWeight: '500' },

  // analytics — metrics float on BG, only chart has a panel
  tabs: { flexDirection: 'row', backgroundColor: '#F0E6EC', borderRadius: 20, padding: 3 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 17 },
  tabOn: { backgroundColor: PINK },
  tabTxt: { fontSize: 12, fontWeight: '700', color: T2 },
  tabTxtOn: { color: '#fff' },
  metricsWrap: { backgroundColor: CARD, borderRadius: 20, marginBottom: 14, paddingVertical: 16 },
  metrics: { flexDirection: 'row' },
  metric: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  metricBr: { borderRightWidth: 1, borderRightColor: '#F0E6EC' },
  metricLbl: { fontSize: 11, color: T3, fontWeight: '500', marginBottom: 5 },
  metricVal: { fontSize: 15, fontWeight: '900', color: T1, letterSpacing: -0.3, marginBottom: 3 },
  metricChg: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  chartPanel: { backgroundColor: CARD, borderRadius: 20, paddingTop: 16, paddingRight: 8, overflow: 'hidden' },
  chartPlaceholder: { height: 160, alignItems: 'center', justifyContent: 'center', gap: 8 },
  chartPlaceholderTxt: { fontSize: 13, color: T3, fontWeight: '500' },
});

export default VendorDashboardScreen;
