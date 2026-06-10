import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getStoredUser, logoutUser } from '@/utils/authHelper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmationModal from '@/components/ConfirmationModal';
import { bookingAPI, orderAPI, reviewAPI, savedAPI } from '@/api/api';

const BRAND = {
  primary: '#eb278d',
  primaryDark: '#C01F73',
  primarySoft: '#FFF0F7',
  surface: '#FFFFFF',
  bg: '#F8F9FA',
  border: '#F0F0F0',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
};

interface StatTileProps {
  value: string | number;
  label: string;
}

const StatTile: React.FC<StatTileProps> = ({ value, label }) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>{value}</Text>
    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 2 }}>{label}</Text>
  </View>
);

const Divider: React.FC = () => (
  <View style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' }} />
);

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
  isLast,
  danger,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: BRAND.border,
    }}
  >
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: iconBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
      }}
    >
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: danger ? '#EF4444' : BRAND.textPrimary,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 12, color: BRAND.textMuted, marginTop: 1 }}>{subtitle}</Text>
      ) : null}
    </View>
    <Ionicons name="chevron-forward" size={18} color={danger ? '#EF4444' : '#D1D5DB'} />
  </TouchableOpacity>
);

const ClientProfileScreen: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ bookings: '—', orders: '—', reviews: '—', saved: '—' });
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadUserData();
    fetchStats();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
      fetchStats();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchStats = async () => {
    const [bookingsRes, ordersRes, reviewsRes, savedRes] = await Promise.allSettled([
      bookingAPI.getMyBookings({ role: 'client', page: 1, limit: 1 }),
      orderAPI.getMyOrders({ page: 1, limit: 1 }),
      reviewAPI.getMyReviews({ page: 1, limit: 1 }),
      savedAPI.getSavedIds(),
    ]);

    const getTotal = (res: PromiseSettledResult<any>): string => {
      if (res.status === 'rejected') return '—';
      const d = res.value;
      const total =
        d?.meta?.pagination?.total ??
        d?.data?.pagination?.total ??
        d?.meta?.total ??
        d?.data?.total ??
        d?.total ??
        null;
      return total != null ? String(total) : '—';
    };

    const savedCount =
      savedRes.status === 'fulfilled'
        ? (savedRes.value?.data?.savedVendorIds?.length ?? 0) +
          (savedRes.value?.data?.savedProductIds?.length ?? 0)
        : null;

    setStats({
      bookings: getTotal(bookingsRes),
      orders: getTotal(ordersRes),
      reviews: getTotal(reviewsRes),
      saved: savedCount != null ? String(savedCount) : '—',
    });
  };

  const loadUserData = async () => {
    const userData = await getStoredUser();
    setUser(userData);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setShowLogoutModal(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Delete account error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : 'User';

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.primary} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
      >
        {/* ── PINK HEADER ──────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: BRAND.primary,
            paddingTop: insets.top + 10,
            paddingBottom: 28,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          {/* Top bar: title + edit */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              marginBottom: 20,
            }}
          >
            <View style={{ width: 40 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>Profile</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PersonalInformation')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar + name */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ position: 'relative', marginBottom: 12 }}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: 'rgba(255,255,255,0.5)',
                  overflow: 'hidden',
                }}
              >
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Ionicons name="person" size={48} color={BRAND.primary} />
                )}
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('PersonalInformation')}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...Platform.select({
                    android: { elevation: 3 },
                    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
                  }),
                }}
              >
                <Ionicons name="camera-outline" size={14} color={BRAND.primary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 }}>{fullName}</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
              {user?.email || ''}
            </Text>

            {/* Verified badge */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 20,
                marginTop: 8,
              }}
            >
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600', marginLeft: 5 }}>
                Verified Member
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginHorizontal: 20,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 10,
            }}
          >
            <StatTile value={stats.bookings} label="Bookings" />
            <Divider />
            <StatTile value={stats.orders} label="Orders" />
            <Divider />
            <StatTile value={stats.saved} label="Saved" />
            <Divider />
            <StatTile value={stats.reviews} label="Reviews" />
          </View>
        </View>

        {/* ── ACCOUNT SECTION ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: BRAND.textMuted,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 10,
              marginLeft: 4,
            }}
          >
            Account
          </Text>
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderRadius: 18,
              overflow: 'hidden',
              ...Platform.select({
                android: { elevation: 2 },
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
              }),
            }}
          >
            <MenuItem
              icon="bag-handle-outline"
              iconBg="#FFF0F7"
              iconColor={BRAND.primary}
              title="My Orders"
              subtitle="Track and manage your orders"
              onPress={() => navigation.navigate('CustomerOrders')}
            />
            <MenuItem
              icon="heart-outline"
              iconBg="#FFF0F0"
              iconColor="#EF4444"
              title="Saved / Wishlist"
              subtitle="Your saved vendors and services"
              onPress={() => navigation.navigate('Favourites')}
            />
            <MenuItem
              icon="wallet-outline"
              iconBg="#F0FFF4"
              iconColor="#10B981"
              title="Payment & Wallet"
              subtitle="LookReal Pay"
              onPress={() => navigation.navigate('Transactions')}
              isLast
            />
          </View>
        </View>

        {/* ── ACTIVITY SECTION ─────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: BRAND.textMuted,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 10,
              marginLeft: 4,
            }}
          >
            Activity
          </Text>
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderRadius: 18,
              overflow: 'hidden',
              ...Platform.select({
                android: { elevation: 2 },
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
              }),
            }}
          >
            <MenuItem
              icon="star-outline"
              iconBg="#FFFBEB"
              iconColor="#F59E0B"
              title="My Reviews"
              subtitle="Reviews you've left"
              onPress={() => navigation.navigate('Reviews')}
            />
            <MenuItem
              icon="alert-circle-outline"
              iconBg="#FFF0F0"
              iconColor="#EF4444"
              title="Disputes"
              subtitle="View and manage disputes"
              onPress={() => navigation.navigate('Disputes')}
            />
            <MenuItem
              icon="share-social-outline"
              iconBg="#EFF6FF"
              iconColor="#3B82F6"
              title="Referral Program"
              subtitle="Earn rewards by referring friends"
              onPress={() => navigation.navigate('Referrals')}
              isLast
            />
          </View>
        </View>

        {/* ── PREFERENCES SECTION ──────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: BRAND.textMuted,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 10,
              marginLeft: 4,
            }}
          >
            Preferences
          </Text>
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderRadius: 18,
              overflow: 'hidden',
              ...Platform.select({
                android: { elevation: 2 },
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
              }),
            }}
          >
            <MenuItem
              icon="notifications-outline"
              iconBg="#F5F3FF"
              iconColor="#8B5CF6"
              title="Notifications"
              subtitle="Manage notification settings"
              onPress={() => navigation.navigate('NotificationsSetting')}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              iconBg="#F0FFF4"
              iconColor="#10B981"
              title="Privacy & Security"
              subtitle="Password and security settings"
              onPress={() => navigation.navigate('PrivacySetting')}
            />
            <MenuItem
              icon="key-outline"
              iconBg="#FFF0F7"
              iconColor={BRAND.primary}
              title="Change Password"
              subtitle="Update your account password"
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <MenuItem
              icon="help-circle-outline"
              iconBg="#FFFBEB"
              iconColor="#F59E0B"
              title="Help Center"
              subtitle="FAQs and support"
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <MenuItem
              icon="document-text-outline"
              iconBg="#EFF6FF"
              iconColor="#3B82F6"
              title="Terms & Privacy"
              subtitle="Legal information"
              onPress={() => navigation.navigate('TermsPrivacy')}
              isLast
            />
          </View>
        </View>

        {/* ── DANGER ZONE ──────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View
            style={{
              backgroundColor: BRAND.surface,
              borderRadius: 18,
              overflow: 'hidden',
              ...Platform.select({
                android: { elevation: 2 },
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
              }),
            }}
          >
            <MenuItem
              icon="log-out-outline"
              iconBg="#FFF5F5"
              iconColor="#EF4444"
              title="Logout"
              subtitle="Sign out of your account"
              onPress={() => setShowLogoutModal(true)}
              danger
            />
            <MenuItem
              icon="trash-outline"
              iconBg="#FFF5F5"
              iconColor="#EF4444"
              title="Delete Account"
              subtitle="Permanently remove your account"
              onPress={() => setShowDeleteModal(true)}
              isLast
              danger
            />
          </View>
        </View>

        {/* Version */}
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Text style={{ fontSize: 11, color: BRAND.textMuted }}>Version 1.0.0  ·  © 2024 LookReal</Text>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        icon="log-out-outline"
        iconColor={BRAND.primary}
        confirmText="Yes, Logout"
        cancelText="Cancel"
        confirmColor={BRAND.primary}
        loading={loading}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone."
        icon="warning-outline"
        iconColor="#ef4444"
        confirmText="Delete Account"
        cancelText="Cancel"
        confirmColor="#ef4444"
        loading={loading}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </View>
  );
};

export default ClientProfileScreen;
