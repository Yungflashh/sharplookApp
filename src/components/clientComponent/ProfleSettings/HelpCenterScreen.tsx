import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const PINK    = '#E04079';
const PINK_S  = '#FFF0F7';
const PINK_M  = '#FCDCE9';
const TEXT1   = '#111827';
const TEXT2   = '#6B7280';
const TEXT3   = '#9CA3AF';
const BORDER  = '#F3F4F6';
const BG      = '#F8F9FA';
const WHITE   = '#FFFFFF';

interface FAQItem { question: string; answer: string; category: string }

const FAQS: FAQItem[] = [
  { category: 'Bookings', question: 'How do I book a service?', answer: 'Browse vendors, select a service, choose your preferred date and time, and confirm. You will receive a confirmation notification right away.' },
  { category: 'Bookings', question: 'Can I cancel or reschedule a booking?', answer: 'Yes — go to Bookings, open the booking, and tap Cancel or Reschedule. Note that cancellation policies may apply depending on timing.' },
  { category: 'Payments', question: 'What payment methods are accepted?', answer: 'We accept card payments, bank transfers, and LookReal Pay (wallet). All transactions are secured and encrypted end-to-end.' },
  { category: 'Payments', question: 'How do refunds work?', answer: 'Approved refunds are processed within 5–7 business days and credited back to your original payment method or wallet balance.' },
  { category: 'Account', question: 'How do I update my profile information?', answer: 'Go to Profile → Personal Information to update your name, phone number, and other details.' },
  { category: 'Account', question: 'How do I reset my password?', answer: 'Use "Forgot Password" on the login screen, or change it from Privacy & Security settings while you are logged in.' },
  { category: 'Vendors', question: 'How do I become a vendor?', answer: 'Register as a vendor during sign-up or upgrade your account from profile settings. Complete the verification process to start offering services.' },
  { category: 'Vendors', question: 'How are vendors verified?', answer: 'Vendors go through document verification, business information review, and quality checks before receiving the Verified badge.' },
];

const QUICK_ACTIONS = [
  { icon: 'logo-whatsapp' as const, label: 'WhatsApp', sub: 'Chat with us', color: '#25D366', bg: '#F0FFF4', url: 'https://wa.me/2347066965448' },
  { icon: 'mail-outline' as const, label: 'Email', sub: 'Get help by email', color: '#3B82F6', bg: '#EFF6FF', url: 'mailto:support@lookreal.beauty' },
  { icon: 'call-outline' as const, label: 'Call Us', sub: 'Mon – Fri, 9am–6pm', color: '#F59E0B', bg: '#FFFBEB', url: 'tel:+2347066965448' },
];

const CATEGORIES = Array.from(new Set(FAQS.map(f => f.category)));

const CAT_META: Record<string, { icon: string; color: string; bg: string }> = {
  Bookings: { icon: 'calendar-outline', color: PINK, bg: PINK_S },
  Payments: { icon: 'card-outline', color: '#10B981', bg: '#F0FFF4' },
  Account:  { icon: 'person-outline', color: '#3B82F6', bg: '#EFF6FF' },
  Vendors:  { icon: 'storefront-outline', color: '#F59E0B', bg: '#FFFBEB' },
};

const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setExpanded(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const filtered = FAQS.filter(f =>
    !search ||
    f.question.toLowerCase().includes(search.toLowerCase()) ||
    f.answer.toLowerCase().includes(search.toLowerCase()) ||
    f.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      <SafeAreaView style={{ backgroundColor: WHITE }} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={PINK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Help Center</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 8 }}>
          <View style={s.searchRow}>
            <Ionicons name="search-outline" size={18} color={TEXT3} />
            <TextInput
              style={s.searchInput}
              placeholder="Search for answers…"
              placeholderTextColor={TEXT3}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={TEXT3} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Contact Support */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text style={s.sectionLabel}>Contact Support</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {QUICK_ACTIONS.map(a => (
              <TouchableOpacity
                key={a.label}
                onPress={() => Linking.openURL(a.url)}
                activeOpacity={0.8}
                style={[s.contactCard, { backgroundColor: a.bg, flex: 1 }]}
              >
                <View style={[s.contactIcon, { backgroundColor: `${a.color}22` }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={[s.contactLabel, { color: a.color }]}>{a.label}</Text>
                <Text style={s.contactSub}>{a.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQs */}
        {(search ? [{ key: 'Results', items: filtered }] : CATEGORIES.map(c => ({ key: c, items: filtered.filter(f => f.category === c) }))).map(({ key, items }) =>
          items.length === 0 ? null : (
            <View key={key} style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <View style={s.catHeader}>
                {CAT_META[key] && (
                  <View style={[s.catIcon, { backgroundColor: CAT_META[key].bg }]}>
                    <Ionicons name={CAT_META[key].icon as any} size={14} color={CAT_META[key].color} />
                  </View>
                )}
                <Text style={s.sectionLabel}>{key}</Text>
              </View>

              <View style={s.faqCard}>
                {items.map((faq, i) => {
                  const globalIdx = FAQS.indexOf(faq);
                  const isOpen = expanded.has(globalIdx);
                  const isLast = i === items.length - 1;
                  return (
                    <TouchableOpacity
                      key={globalIdx}
                      onPress={() => toggle(globalIdx)}
                      activeOpacity={0.75}
                      style={[s.faqItem, !isLast && s.faqBorder, isOpen && s.faqItemOpen]}
                    >
                      <View style={s.faqRow}>
                        <Text style={[s.faqQ, isOpen && { color: PINK }]} numberOfLines={isOpen ? undefined : 2}>
                          {faq.question}
                        </Text>
                        <View style={[s.chevronWrap, isOpen && { backgroundColor: PINK_M }]}>
                          <Ionicons
                            name={isOpen ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={isOpen ? PINK : TEXT3}
                          />
                        </View>
                      </View>
                      {isOpen && (
                        <Text style={s.faqA}>{faq.answer}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <View style={s.emptyIcon}>
              <Ionicons name="search-outline" size={36} color={TEXT3} />
            </View>
            <Text style={s.emptyTitle}>No results found</Text>
            <Text style={s.emptySub}>Try searching with different keywords</Text>
          </View>
        )}

        {/* Footer note */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={PINK} />
          <Text style={s.infoText}>
            Can't find what you're looking for? Our support team responds within 24 hours.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PINK_S,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT1 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    borderWidth: 1.5, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 } }),
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT1, paddingVertical: 0 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: TEXT2, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },

  contactCard: {
    borderRadius: 16, padding: 14, alignItems: 'center',
    ...Platform.select({ android: { elevation: 1 } }),
  },
  contactIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  contactLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  contactSub: { fontSize: 10, color: TEXT3, textAlign: 'center' },

  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  catIcon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  faqCard: {
    backgroundColor: WHITE, borderRadius: 18,
    overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  faqItem: { paddingHorizontal: 16, paddingVertical: 16 },
  faqItemOpen: { backgroundColor: '#FDFAFF' },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  faqRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT1, lineHeight: 20 },
  faqA: { fontSize: 13, color: TEXT2, lineHeight: 20, marginTop: 10 },
  chevronWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TEXT1, marginBottom: 6 },
  emptySub: { fontSize: 13, color: TEXT3 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: PINK_S, borderRadius: 14, marginHorizontal: 16, marginTop: 8, padding: 14,
  },
  infoText: { flex: 1, fontSize: 12, color: PINK, lineHeight: 18, fontWeight: '500' },
});

export default HelpCenterScreen;
