import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, Share,
  StyleSheet, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getStoredUser, logoutUser } from '@/utils/authHelper';
import { productAPI, servicesAPI, handleAPIError } from '@/api/api';
import api from '@/api/api';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/Toast';

const PRIMARY  = '#E04079';
const BG       = '#FCE4EC';
const WHITE    = '#FFFFFF';
const TEXT_DARK = '#1A1A2E';
const TEXT_GRAY = '#6B7280';

const shadow = (opacity = 0.07, radius = 8, y = 2) =>
  Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: radius },
    android: { elevation: Math.round(radius / 2) },
  });

// ── Menu row ─────────────────────────────────────────────────────────────────
const MenuRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}> = ({ icon, title, subtitle, onPress, isLast }) => (
  <>
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.menuRow}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color={PRIMARY} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
    {!isLast && <View style={styles.menuDivider} />}
  </>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const VendorProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { top, bottom } = useSafeAreaInsets();

  const [user, setUser]               = useState<any>(null);
  const [stats, setStats]             = useState({ bookings: 0, products: 0, services: 0, reviews: 0 });
  const [showLogoutModal, setShowLogoutModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [showQRModal, setShowQRModal]           = useState(false);
  const [loggingOut, setLoggingOut]             = useState(false);

  const loadData = useCallback(async () => {
    const userData = await getStoredUser();
    setUser(userData);

    try {
      const [prodRes, svcRes] = await Promise.allSettled([
        productAPI.getMyProducts(),
        api.get('/services/vendor/my-services'),
      ]);

      const productCount =
        prodRes.status === 'fulfilled'
          ? (prodRes.value?.data?.products ?? prodRes.value?.data ?? []).length ?? 0
          : 0;

      const svcData = svcRes.status === 'fulfilled' ? svcRes.value?.data?.data : null;
      const serviceCount = Array.isArray(svcData)
        ? svcData.length
        : svcData?.services?.length ?? 0;

      setStats({
        bookings: userData?.vendorProfile?.completedBookings ?? 0,
        products: productCount,
        services: serviceCount,
        reviews:  userData?.vendorProfile?.totalRatings ?? 0,
      });
    } catch {
      setStats({
        bookings: userData?.vendorProfile?.completedBookings ?? 0,
        products: 0,
        services: 0,
        reviews:  userData?.vendorProfile?.totalRatings ?? 0,
      });
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      setShowLogoutModal(false);
    } catch {
      toast.error('Error', 'Logout failed, try again');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleShare = async () => {
    if (!user?._id) return;
    const businessName = user?.vendorProfile?.businessName || 'My Store';
    const url = `https://lookreal.beauty/vendors/${user._id}`;
    try {
      await Share.share({ message: `Check out ${businessName} on LookReal!\n${url}`, url, title: `${businessName} on LookReal` });
    } catch {
      toast.error('Error', 'Failed to share profile');
    }
  };

  const isVerified   = user?.vendorProfile?.isVerified;
  const businessName = user?.vendorProfile?.businessName || 'My Store';
  const category     = user?.vendorProfile?.categories?.[0] || 'Makeup Artist';
  const rating       = user?.vendorProfile?.rating ?? 0;
  const totalRatings = user?.vendorProfile?.totalRatings ?? 0;

  const vendorUrl  = user?._id ? `https://lookreal.beauty/vendors/${user._id}` : '';
  const qrImageUrl = vendorUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(vendorUrl)}&bgcolor=ffffff&color=1a0a14&margin=10`
    : '';

  const STAT_ITEMS = [
    { label: 'Bookings', value: stats.bookings },
    { label: 'Products', value: stats.products },
    { label: 'Service',  value: stats.services },
    { label: 'Reviews',  value: stats.reviews  },
  ];

  const BUSINESS_ITEMS = [
    { icon: 'storefront-outline' as const, title: 'My Store',      subtitle: 'Manage Store Details',      onPress: () => navigation.navigate('VendorStoreSettings') },
    { icon: 'share-social-outline' as const, title: 'Share Profile', subtitle: 'Share your store link',     onPress: handleShare },
    { icon: 'qr-code-outline' as const,  title: 'My QR Code',    subtitle: 'Show your booking QR Code', onPress: () => setShowQRModal(true) },
  ];

  const ORDERS_ITEMS = [
    { icon: 'receipt-outline' as const,       title: 'Order History',      subtitle: 'Track your orders',             onPress: () => navigation.navigate('MyOrders') },
    { icon: 'wallet-outline' as const,        title: 'Transactions',       subtitle: 'View payment history',          onPress: () => navigation.navigate('TransactionHistory') },
  ];

  const ACCOUNT_ITEMS = [
    { icon: 'person-circle-outline' as const, title: 'Personal Information', subtitle: 'Update your profile details',    onPress: () => navigation.navigate('PersonalInformation') },
    { icon: 'shield-checkmark-outline' as const, title: 'Privacy & Security', subtitle: 'Password and security settings', onPress: () => navigation.navigate('PrivacySetting') },
    { icon: 'notifications-outline' as const, title: 'Notifications',        subtitle: 'Manage notification settings',   onPress: () => navigation.navigate('NotificationsSetting') },
  ];

  const SUPPORT_ITEMS = [
    { icon: 'help-circle-outline' as const,   title: 'Help Center',   subtitle: 'FAQs and support',    onPress: () => navigation.navigate('HelpCenter') },
    { icon: 'document-text-outline' as const, title: 'Terms & Privacy', subtitle: 'Legal information', onPress: () => navigation.navigate('TermsPrivacy') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      {/* ── Header (includes status bar inset so there's no separate white strip) */}
      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: BG }}
        contentContainerStyle={{ paddingBottom: bottom + 110 }}
      >
        {/* ── Profile Card ──────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <LinearGradient
            colors={['#F06292', '#E04079']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            {/* Decorative circles */}
            <View style={styles.deco1} />
            <View style={styles.deco2} />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Avatar */}
              <View style={styles.avatarWrap}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="person" size={36} color={PRIMARY} />
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1, marginLeft: 14 }}>
                {/* Name + verified */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Text style={styles.businessName} numberOfLines={1}>{businessName}</Text>
                  {isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={WHITE} />
                    </View>
                  )}
                </View>

                {/* Category + verified label */}
                <Text style={styles.categoryText}>{category}  |  Verified Vendor</Text>

                {/* Edit btn */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('PersonalInformation')}
                  activeOpacity={0.8}
                  style={styles.editBtn}
                >
                  <Ionicons name="pencil" size={12} color={PRIMARY} />
                </TouchableOpacity>

                {/* Rating */}
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {rating.toFixed(1)} ({totalRatings}) Reviews
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── Stats Row ─────────────────────────────────────────────────────── */}
        <View style={[styles.statsCard, shadow(0.06, 8, 2)]}>
          {STAT_ITEMS.map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < STAT_ITEMS.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Business Section ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Business</Text>
          <View style={[styles.menuCard, shadow(0.06, 8, 2)]}>
            {BUSINESS_ITEMS.map((item, i) => (
              <MenuRow key={item.title} {...item} isLast={i === BUSINESS_ITEMS.length - 1} />
            ))}
          </View>
        </View>

        {/* ── Orders & Sales Section ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Orders & Sales</Text>
          <View style={[styles.menuCard, shadow(0.06, 8, 2)]}>
            {ORDERS_ITEMS.map((item, i) => (
              <MenuRow key={item.title} {...item} isLast={i === ORDERS_ITEMS.length - 1} />
            ))}
          </View>
        </View>

        {/* ── Account Section ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Account</Text>
          <View style={[styles.menuCard, shadow(0.06, 8, 2)]}>
            {ACCOUNT_ITEMS.map((item, i) => (
              <MenuRow key={item.title} {...item} isLast={i === ACCOUNT_ITEMS.length - 1} />
            ))}
          </View>
        </View>

        {/* ── Support Section ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Support</Text>
          <View style={[styles.menuCard, shadow(0.06, 8, 2)]}>
            {SUPPORT_ITEMS.map((item, i) => (
              <MenuRow key={item.title} {...item} isLast={i === SUPPORT_ITEMS.length - 1} />
            ))}
          </View>
        </View>

        {/* ── Danger Zone ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.menuCard, shadow(0.06, 8, 2)]}>
            <MenuRow
              icon="log-out-outline"
              title="Logout"
              subtitle="Sign out of your account"
              onPress={() => setShowLogoutModal(true)}
            />
            <View style={styles.menuDivider} />
            <MenuRow
              icon="trash-outline"
              title="Delete Account"
              subtitle="Permanently remove account"
              onPress={() => setShowDeleteModal(true)}
              isLast
            />
          </View>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        icon="log-out-outline"
        iconColor={PRIMARY}
        confirmText="Logout"
        confirmColor={PRIMARY}
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Account"
        message="This will permanently remove your account and all data."
        icon="warning-outline"
        iconColor="#EF4444"
        confirmText="Delete"
        confirmColor="#EF4444"
        onConfirm={() => setShowDeleteModal(false)}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* QR Modal */}
      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)}>
        <View style={styles.qrOverlay}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>My Booking QR Code</Text>
            <Text style={styles.qrSub}>Customers scan this to view and book your services</Text>

            {qrImageUrl ? (
              <Image source={{ uri: qrImageUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <View style={styles.qrPlaceholder}>
                <ActivityIndicator color={PRIMARY} />
              </View>
            )}

            <Text style={styles.qrUrl} numberOfLines={1}>{vendorUrl}</Text>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 }}>
              <TouchableOpacity onPress={handleShare} activeOpacity={0.85}
                style={{ flex: 1, backgroundColor: PRIMARY, padding: 13, borderRadius: 14, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Share Link</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowQRModal(false)} activeOpacity={0.8}
                style={{ flex: 1, backgroundColor: '#F3F4F6', padding: 13, borderRadius: 14, alignItems: 'center' }}>
                <Text style={{ color: TEXT_DARK, fontWeight: '600', fontSize: 14 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VendorProfileScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: WHITE,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },

  // Profile card
  profileCard: {
    borderRadius: 20, padding: 18, overflow: 'hidden', position: 'relative',
  },
  deco1: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  deco2: {
    position: 'absolute', bottom: -20, right: 40,
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarWrap: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: WHITE, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 4 } }),
  },
  avatar: { width: '100%', height: '100%' },
  businessName: { fontSize: 16, fontWeight: '800', color: WHITE, flex: 1 },
  verifiedBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  categoryText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginBottom: 6 },
  editBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', marginBottom: 8, alignSelf: 'flex-start',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: WHITE, fontWeight: '600' },

  // Stats
  statsCard: {
    flexDirection: 'row', backgroundColor: WHITE,
    marginHorizontal: 16, marginTop: 14, borderRadius: 18,
    paddingVertical: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: PRIMARY },
  statLabel: { fontSize: 11, color: TEXT_GRAY, fontWeight: '500', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: '#F3F4F6' },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { fontSize: 15, fontWeight: '800', color: TEXT_DARK, marginBottom: 10 },
  menuCard: { backgroundColor: WHITE, borderRadius: 18, overflow: 'hidden' },

  // Menu rows
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  menuSub: { fontSize: 12, color: TEXT_GRAY },
  menuDivider: { height: 1, backgroundColor: '#F9F0F4', marginLeft: 66 },

  // QR Modal
  qrOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  qrCard: {
    backgroundColor: WHITE, borderRadius: 24, padding: 24,
    alignItems: 'center', width: '100%',
  },
  qrTitle: { fontSize: 17, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  qrSub: { fontSize: 12, color: TEXT_GRAY, marginBottom: 20, textAlign: 'center' },
  qrImage: { width: 220, height: 220, borderRadius: 12 },
  qrPlaceholder: {
    width: 220, height: 220, backgroundColor: '#F3F4F6',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  qrUrl: { fontSize: 11, color: TEXT_GRAY, marginTop: 10 },

  version: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 24 },
});
