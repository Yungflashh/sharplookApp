import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { notificationAPI, handleAPIError } from '@/api/api';
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

interface NotificationPrefs {
  pushNotifications: boolean;
  emailNotifications: boolean;
  bookingUpdates: boolean;
  newMessages: boolean;
  paymentAlerts: boolean;
  reminderNotifications: boolean;
  promotions: boolean;
}

const DEFAULTS: NotificationPrefs = {
  pushNotifications: true,
  emailNotifications: true,
  bookingUpdates: true,
  newMessages: true,
  paymentAlerts: true,
  reminderNotifications: true,
  promotions: false,
};

const SECTIONS = [
  {
    title: 'General',
    desc: 'Control how you receive notifications',
    items: [
      {
        key: 'pushNotifications' as keyof NotificationPrefs,
        icon: 'notifications',
        label: 'Push Notifications',
        sub: 'Real-time alerts on your device',
        color: PINK, bg: PINK_S,
      },
      {
        key: 'emailNotifications' as keyof NotificationPrefs,
        icon: 'mail',
        label: 'Email Notifications',
        sub: 'Important updates sent to your inbox',
        color: '#3B82F6', bg: '#EFF6FF',
      },
    ],
  },
  {
    title: 'Activity',
    desc: 'Stay on top of your bookings & messages',
    items: [
      {
        key: 'bookingUpdates' as keyof NotificationPrefs,
        icon: 'calendar',
        label: 'Booking Updates',
        sub: 'Status changes and confirmations',
        color: '#7C3AED', bg: '#F5F3FF',
      },
      {
        key: 'newMessages' as keyof NotificationPrefs,
        icon: 'chatbubble-ellipses',
        label: 'New Messages',
        sub: 'Chats from vendors and support',
        color: '#0D9488', bg: '#F0FDFA',
      },
      {
        key: 'paymentAlerts' as keyof NotificationPrefs,
        icon: 'wallet',
        label: 'Payment Alerts',
        sub: 'Transaction and wallet activity',
        color: '#D97706', bg: '#FFFBEB',
      },
      {
        key: 'reminderNotifications' as keyof NotificationPrefs,
        icon: 'alarm',
        label: 'Reminders',
        sub: 'Upcoming appointments and follow-ups',
        color: '#EA580C', bg: '#FFF7ED',
      },
    ],
  },
  {
    title: 'Marketing',
    desc: 'Deals, offers and platform news',
    items: [
      {
        key: 'promotions' as keyof NotificationPrefs,
        icon: 'pricetag',
        label: 'Promotions & Offers',
        sub: 'Exclusive deals and special discounts',
        color: '#059669', bg: '#ECFDF5',
      },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap(s => s.items.map(i => i.key));

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<keyof NotificationPrefs | null>(null);
  const [prefs, setPrefs]     = useState<NotificationPrefs>(DEFAULTS);
  const prefRef = useRef(prefs);
  prefRef.current = prefs;

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await notificationAPI.getNotificationSettings();
      const s = response.data?.data?.settings || response.data?.data || response.data?.settings || response.data;
      if (s) {
        setPrefs({
          pushNotifications:     s.pushNotifications     ?? true,
          emailNotifications:    s.emailNotifications    ?? true,
          bookingUpdates:        s.bookingUpdates        ?? true,
          newMessages:           s.newMessages           ?? true,
          paymentAlerts:         s.paymentAlerts         ?? true,
          reminderNotifications: s.reminderNotifications ?? true,
          promotions:            s.promotions            ?? false,
        });
      }
    } catch {
      toast.error('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (key: keyof NotificationPrefs) => {
    if (saving) return;
    const prev = prefRef.current[key] as boolean;
    const next = !prev;
    setPrefs(p => ({ ...p, [key]: next }));
    setSaving(key);
    try {
      await notificationAPI.updateNotificationSettings({ [key]: next });
    } catch (error) {
      setPrefs(p => ({ ...p, [key]: prev }));
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  const enabledCount = ALL_KEYS.filter(k => prefs[k]).length;
  const allOn = enabledCount === ALL_KEYS.length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={PINK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={s.headerSpacer} />
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={PINK} />
          <Text style={s.loaderText}>Loading settings…</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Hero summary ── */}
          <LinearGradient
            colors={['#E04079', '#C0315E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.heroLeft}>
              <View style={s.heroIconWrap}>
                <Ionicons name="notifications" size={22} color={WHITE} />
              </View>
              <View>
                <Text style={s.heroCount}>{enabledCount} of {ALL_KEYS.length} enabled</Text>
                <Text style={s.heroSub}>Notification channels active</Text>
              </View>
            </View>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeText}>{allOn ? 'All On' : enabledCount === 0 ? 'All Off' : 'Custom'}</Text>
            </View>
            <View style={s.heroDecor} />
          </LinearGradient>

          {/* ── Sections ── */}
          {SECTIONS.map(section => (
            <View key={section.title} style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>{section.title}</Text>
                <Text style={s.sectionDesc}>{section.desc}</Text>
              </View>

              <View style={s.card}>
                {section.items.map((item, ii) => {
                  const isLast = ii === section.items.length - 1;
                  const isOn = prefs[item.key] as boolean;
                  const isSaving = saving === item.key;

                  return (
                    <View key={item.key} style={[s.row, !isLast && s.rowDivider]}>
                      {/* Icon */}
                      <View style={[s.iconWrap, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon as any} size={18} color={item.color} />
                      </View>

                      {/* Text */}
                      <View style={s.rowBody}>
                        <Text style={s.rowLabel}>{item.label}</Text>
                        <Text style={s.rowSub}>{item.sub}</Text>
                      </View>

                      {/* Control */}
                      {isSaving ? (
                        <ActivityIndicator size="small" color={PINK} style={s.spinner} />
                      ) : (
                        <Switch
                          value={isOn}
                          onValueChange={() => toggle(item.key)}
                          trackColor={{ false: '#E5E7EB', true: PINK_M }}
                          thumbColor={isOn ? PINK : '#D1D5DB'}
                          ios_backgroundColor="#E5E7EB"
                          disabled={saving !== null}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {/* ── Info note ── */}
          <View style={s.infoCard}>
            <View style={s.infoIconWrap}>
              <Ionicons name="checkmark-circle" size={16} color={PINK} />
            </View>
            <Text style={s.infoText}>
              Settings save automatically — no need to tap a save button.
            </Text>
          </View>

        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT1 },
  headerSpacer: { width: 38 },

  // Loader
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { fontSize: 13, color: TEXT2 },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  // Hero
  hero: {
    borderRadius: 20, padding: 18, marginBottom: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 4 },
      ios: { shadowColor: PINK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
    }),
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroCount: { fontSize: 16, fontWeight: '800', color: WHITE },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: WHITE },
  heroDecor: {
    position: 'absolute', right: -24, top: -24,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Section
  section: { marginBottom: 22 },
  sectionHeader: { marginBottom: 10, paddingHorizontal: 4 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: TEXT1,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sectionDesc: { fontSize: 12, color: TEXT3, marginTop: 2 },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    }),
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15, gap: 13,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: BORDER },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: TEXT1, marginBottom: 2 },
  rowSub: { fontSize: 12, color: TEXT2, lineHeight: 17 },
  spinner: { width: 50, alignItems: 'center' },

  // Info note
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: PINK_S, borderRadius: 14,
    borderWidth: 1, borderColor: PINK_M,
    padding: 14,
  },
  infoIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1, fontSize: 12, color: PINK, lineHeight: 18, fontWeight: '500' },
});

export default NotificationSettingsScreen;
