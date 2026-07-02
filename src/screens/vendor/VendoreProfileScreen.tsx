import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, Platform,
  StyleSheet, Share, Modal, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { getStoredUser, logoutUser } from '@/utils/authHelper';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/Toast';
import { analyticsAPI, reviewAPI, productAPI, servicesAPI, bookingAPI } from '@/api/api';

const SW = Dimensions.get('window').width;

const PINK = '#E04079';
const BG   = '#FFF5F9';

interface Stats {
  bookings: number;
  products: number;
  services: number;
  reviews: number;
}

const VendorProfileScreen: React.FC = () => {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [user, setUser]                   = useState<any>(null);
  const [stats, setStats]                 = useState<Stats>({ bookings: 0, products: 0, services: 0, reviews: 0 });
  const [showLogout, setShowLogout]         = useState(false);
  const [loggingOut, setLoggingOut]         = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount]     = useState(false);
  const [showQR, setShowQR]                       = useState(false);

  useEffect(() => {
    loadAll();
    const unsub = navigation.addListener('focus', loadAll);
    return unsub;
  }, [navigation]);

  const loadAll = async () => {
    const userData = await getStoredUser();
    setUser(userData);
    loadStats(userData);
  };

  const loadStats = async (userData: any) => {
    const next: Stats = { bookings: 0, products: 0, services: 0, reviews: 0 };

    await Promise.allSettled([
      (async () => {
        try {
          const r = await analyticsAPI.getVendorQuickStats();
          if (r?.success) {
            const d = r.data ?? {};
            next.bookings = d.totalBookings ?? d.bookings ?? 0;
          }
        } catch {
          try {
            const r = await bookingAPI.getMyBookings({ role: 'vendor', limit: 1 });
            if (r?.success) next.bookings = r.data?.pagination?.total ?? 0;
          } catch {}
        }
      })(),
      (async () => {
        try {
          const r = await productAPI.getMyProducts({ limit: 1, page: 1 });
          if (r?.success) next.products = r.data?.pagination?.total ?? (r.data?.products?.length ?? 0);
        } catch {}
      })(),
      (async () => {
        try {
          const r = await servicesAPI.getMyServices();
          if (r?.success) {
            const arr: any[] = r.data?.services ?? r.data ?? [];
            next.services = Array.isArray(arr) ? arr.length : 0;
          }
        } catch {}
      })(),
      (async () => {
        try {
          const r = await reviewAPI.getMyReviews({ limit: 1 });
          if (r?.success) next.reviews = r.data?.pagination?.total ?? (r.data?.reviews?.length ?? 0);
        } catch {}
      })(),
    ]);

    setStats(next);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      setShowLogout(false);
    } catch {
      toast.error('Error', 'Logout failed. Try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      // placeholder — wire to real API when endpoint is available
      toast.info('Coming Soon', 'Account deletion will be available soon');
      setShowDeleteAccount(false);
    } catch {
      toast.error('Error', 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleShare = async () => {
    if (!user?._id) { toast.error('Error', 'Unable to share profile'); return; }
    try {
      const businessName = user?.vendorProfile?.businessName || 'My Store';
      const deepLink = `lookReal://vendor/${user._id}`;
      await Share.share({
        message: `Check out ${businessName} on LookReal!\n\n${deepLink}`,
        title: `${businessName} Profile`,
      });
    } catch {
      toast.error('Error', 'Failed to share profile');
    }
  };

  const isVerified = !!user?.vendorProfile?.isVerified;
  const rating     = user?.vendorProfile?.rating ?? user?.rating ?? 0;
  const ratingCount = user?.vendorProfile?.ratingCount ?? user?.ratingCount ?? 0;
  const vendorType  = user?.vendorProfile?.vendorType
    ? user.vendorProfile.vendorType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : 'Vendor';

  const SECTIONS = [
    {
      title: 'Bussiness',
      items: [
        { icon: 'storefront-outline' as const, lib: 'material', label: 'My Store',        sub: 'Manage Store Details',           onPress: () => navigation.navigate('VendorStoreSettings') },
        { icon: 'share-social-outline' as const, lib: 'ion',   label: 'Share Profile',   sub: 'Share your store link',          onPress: handleShare },
        { icon: 'qr-code-outline' as const, lib: 'ion',        label: 'My QR Code',      sub: 'Show your booking QR Code',      onPress: () => setShowQR(true) },
        { icon: 'people-outline' as const, lib: 'ion',         label: 'Browse Vendors',  sub: 'Explore other vendors near you', onPress: () => navigation.navigate('AllVendors') },
      ],
    },
    {
      title: 'Offers',
      items: [
        { icon: 'pricetag-outline' as const,      lib: 'ion', label: 'Available Offers', sub: 'Browse & respond to client offers', onPress: () => navigation.navigate('AvailableOffers') },
        { icon: 'chatbox-ellipses-outline' as const, lib: 'ion', label: 'My Responses',  sub: 'Offers you have responded to',     onPress: () => navigation.navigate('VendorMyResponses') },
      ],
    },
    {
      title: 'Orders & Sales',
      items: [
        { icon: 'bag-outline' as const,    lib: 'ion', label: 'Order History',    sub: 'Product orders',                  onPress: () => navigation.navigate('MyOrders') },
        { icon: 'wallet-outline' as const, lib: 'ion', label: 'Payment & Wallet', sub: 'Manage, earnings & withdrawal',   onPress: () => navigation.navigate('Transactions') },
        { icon: 'shield-half-outline' as const, lib: 'ion', label: 'Disputes',   sub: 'View & manage disputes',          onPress: () => navigation.navigate('Disputes') },
      ],
    },
    {
      title: 'Growth',
      items: [
        { icon: 'analytics-outline' as const,      lib: 'ion', label: 'Analytics',     sub: 'Track your performance',        onPress: () => navigation.navigate('Analytics') },
        { icon: 'card-outline' as const,           lib: 'ion', label: 'Subscriptions', sub: 'Manage your plan',              onPress: () => navigation.navigate('Subsriptions') },
        { icon: 'arrow-up-circle-outline' as const,lib: 'ion', label: 'Upgrade Plan',  sub: 'Unlock more features',          onPress: () => navigation.navigate('UpgradeTier') },
        { icon: 'share-social-outline' as const,   lib: 'ion', label: 'Referrals',     sub: 'Invite & earn rewards',         onPress: () => navigation.navigate('Referrals') },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: 'person-circle-outline' as const,      lib: 'ion', label: 'Personal Information', sub: 'Update your profile details',   onPress: () => navigation.navigate('PersonalInformation') },
        { icon: 'shield-checkmark-outline' as const,   lib: 'ion', label: 'Privacy & Security',   sub: 'Password and security setting', onPress: () => navigation.navigate('PrivacySetting') },
        { icon: 'notifications-outline' as const,      lib: 'ion', label: 'Notification',         sub: 'Mange notification setting',    onPress: () => navigation.navigate('NotificationsSetting') },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline' as const,   lib: 'ion', label: 'Help Centres',   sub: 'FAQs & guides',     onPress: () => navigation.navigate('HelpCenter') },
        { icon: 'document-text-outline' as const, lib: 'ion', label: 'Terms & Privacy', sub: 'Legal information', onPress: () => navigation.navigate('TermsPrivacy') },
      ],
    },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={PINK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Profile</Text>
          <View style={s.headerSpacer} />
        </View>

        {/* ── Profile card ── */}
        <View style={s.card}>
          {/* Avatar */}
          <View style={s.avatarWrap}>
            <View style={s.avatarCircle}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={s.avatarImg} resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={34} color={PINK} />
              )}
            </View>
            <View style={s.editBadge}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
          </View>

          {/* Info */}
          <View style={s.profileInfo}>
            <View style={s.nameRow}>
              <Text style={s.businessName} numberOfLines={1}>
                {user?.vendorProfile?.businessName || 'My Store'}
              </Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={17} color="#3B82F6" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={s.roleRow}>
              <Text style={s.roleText}>{vendorType}</Text>
              <Text style={s.roleDivider}> | </Text>
              <Text style={s.verifiedText}>Verified Vendor</Text>
            </Text>
            {rating > 0 && (
              <View style={s.ratingRow}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={s.ratingText}> {rating.toFixed(1)} ({ratingCount}) Reviews</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Stats card ── */}
        <View style={s.statsCard}>
          {[
            { val: stats.bookings, lbl: 'Bookings' },
            { val: stats.products, lbl: 'Products' },
            { val: stats.services, lbl: 'Service' },
            { val: stats.reviews,  lbl: 'Reviews' },
          ].map((item, i, arr) => (
            <React.Fragment key={item.lbl}>
              <View style={s.statCol}>
                <Text style={s.statVal}>{item.val}</Text>
                <Text style={s.statLbl}>{item.lbl}</Text>
              </View>
              {i < arr.length - 1 && <View style={s.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Sections ── */}
        {SECTIONS.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.menuCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[s.menuRow, i < section.items.length - 1 && s.menuRowBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={s.menuIcon}>
                    {item.lib === 'material' ? (
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={PINK} />
                    ) : (
                      <Ionicons name={item.icon as any} size={20} color={PINK} />
                    )}
                  </View>
                  <View style={s.menuText}>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    <Text style={s.menuSub}>{item.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ── Danger zone ── */}
        <View style={s.dangerSection}>
          <TouchableOpacity style={s.logoutBtn} onPress={() => setShowLogout(true)} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={s.logoutText}>Log Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={() => setShowDeleteAccount(true)} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={s.logoutText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <ConfirmationModal
        visible={showLogout}
        title="Log Out"
        message="Are you sure you want to log out of your account?"
        icon="log-out-outline"
        iconColor={PINK}
        confirmText="Yes, Log Out"
        cancelText="Cancel"
        confirmColor={PINK}
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => !loggingOut && setShowLogout(false)}
      />
      <ConfirmationModal
        visible={showDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your vendor account? This action cannot be undone."
        icon="warning-outline"
        iconColor="#EF4444"
        confirmText="Delete Account"
        cancelText="Cancel"
        confirmColor="#EF4444"
        loading={deletingAccount}
        onConfirm={handleDeleteAccount}
        onCancel={() => !deletingAccount && setShowDeleteAccount(false)}
      />

      {/* ── QR Code Modal ── */}
      <Modal visible={showQR} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowQR(false)}>
        <View style={s.qrOverlay}>
          <View style={s.qrSheet}>
            {/* Close */}
            <TouchableOpacity style={s.qrClose} onPress={() => setShowQR(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Vendor avatar + name */}
            <View style={s.qrAvatar}>
              {user?.avatar
                ? <Image source={{ uri: user.avatar }} style={s.qrAvatarImg} resizeMode="cover" />
                : <Ionicons name="person" size={28} color={PINK} />}
            </View>
            <Text style={s.qrName}>{user?.vendorProfile?.businessName || 'My Store'}</Text>
            <Text style={s.qrRole}>{user?.vendorProfile?.vendorType?.replace(/_/g, ' ') || 'Vendor'}</Text>

            {/* QR Code */}
            <View style={s.qrBox}>
              {user?._id ? (
                <QRCode
                  value={`lookReal://vendor/${user._id}`}
                  size={SW * 0.52}
                  color="#18181B"
                  backgroundColor="#FFFFFF"
                  logo={undefined}
                />
              ) : (
                <View style={{ width: SW * 0.52, height: SW * 0.52, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="qr-code-outline" size={64} color="#E0E0E0" />
                </View>
              )}
            </View>

            <Text style={s.qrHint}>Clients can scan this to view your profile</Text>

            {/* Share */}
            <TouchableOpacity style={s.qrShareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={s.qrShareTxt}>Share Profile Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
}) as any;

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  scroll:       { paddingBottom: 24 },

  /* header */
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FCE4EE', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { flex: 1, fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginLeft: 12 },
  headerSpacer: { width: 36 },

  /* profile card */
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 14, ...CARD_SHADOW },
  avatarWrap:   { position: 'relative', marginRight: 14 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FCE4EE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:    { width: 72, height: 72 },
  editBadge:    { position: 'absolute', bottom: 0, left: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  profileInfo:  { flex: 1 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  businessName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flexShrink: 1 },
  roleRow:      { marginBottom: 4 },
  roleText:     { fontSize: 12, color: '#6B7280' },
  roleDivider:  { fontSize: 12, color: '#6B7280' },
  verifiedText: { fontSize: 12, color: PINK, fontWeight: '600' },
  ratingRow:    { flexDirection: 'row', alignItems: 'center' },
  ratingText:   { fontSize: 12, color: '#6B7280' },

  /* stats card */
  statsCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, paddingVertical: 16, marginBottom: 6, ...CARD_SHADOW },
  statCol:      { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: 20, fontWeight: '700', color: PINK, marginBottom: 2 },
  statLbl:      { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  statDivider:  { width: 1, height: 34, backgroundColor: '#F0F0F0' },

  /* sections */
  section:      { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  menuCard:     { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...CARD_SHADOW },
  menuRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  menuRowBorder:{ borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuIcon:     { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FCE4EE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuText:     { flex: 1 },
  menuLabel:    { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  menuSub:      { fontSize: 12, color: '#9CA3AF' },

  /* danger zone */
  dangerSection:{ paddingHorizontal: 16, marginTop: 24, gap: 10 },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF5F5', gap: 8 },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF5F5', gap: 8 },
  logoutText:   { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  /* QR modal */
  qrOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  qrSheet:     { width: '100%', backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40 }, android: { elevation: 20 } }) as any },
  qrClose:     { position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: 17, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  qrAvatar:    { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FCE4EE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  qrAvatarImg: { width: 64, height: 64 },
  qrName:      { fontSize: 17, fontWeight: '800', color: '#18181B', marginBottom: 4, textAlign: 'center' },
  qrRole:      { fontSize: 12, color: '#9CA3AF', fontWeight: '500', textTransform: 'capitalize', marginBottom: 22 },
  qrBox:       { padding: 16, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: '#F0E6EC', marginBottom: 16 },
  qrHint:      { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 22, lineHeight: 18 },
  qrShareBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PINK, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16, width: '100%', justifyContent: 'center' },
  qrShareTxt:  { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default VendorProfileScreen;
