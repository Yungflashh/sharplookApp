import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';
import { markRead } from '../registerReadState';

const BG = '#FFF0F5';
const PINK = '#E91E63';
const BORDER = '#F8BBD0';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'TermsPrivacyAuthScreen'>;
type TabType = 'terms' | 'privacy';

const TermsPrivacyAuthScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute();
  const params = route.params as { type?: TabType } | undefined;

  const [activeTab, setActiveTab] = useState<TabType>(params?.type || 'terms');
  const [hasScrolledToBottomTerms, setHasScrolledToBottomTerms] = useState(false);
  const [hasScrolledToBottomPrivacy, setHasScrolledToBottomPrivacy] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const hasScrolledCurrent =
    activeTab === 'terms' ? hasScrolledToBottomTerms : hasScrolledToBottomPrivacy;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
    if (nearBottom) {
      if (activeTab === 'terms') setHasScrolledToBottomTerms(true);
      else setHasScrolledToBottomPrivacy(true);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleDone = () => {
    markRead(activeTab);
    navigation.goBack();
  };

  const SectionCard = ({
    title,
    children,
    icon,
  }: {
    title: string;
    children: React.ReactNode;
    icon?: keyof typeof Ionicons.glyphMap;
  }) => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {icon && (
          <View style={styles.sectionIconBg}>
            <Ionicons name={icon} size={16} color={PINK} />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionContent}>{children}</Text>
    </View>
  );

  const renderTerms = () => (
    <>
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons name="document-text" size={30} color={PINK} />
        </View>
        <Text style={styles.heroTitle}>Terms of Service</Text>
        <Text style={styles.heroDate}>Last updated: July 24, 2025</Text>
      </View>

      <Text style={styles.intro}>
        Please read these terms carefully before using LookReal. By using our app,
        you agree to be bound by these terms.
      </Text>

      <SectionCard title="1. Acceptance of Terms" icon="checkmark-circle-outline">
        By downloading, installing, or using the LookReal mobile application ("App"), you agree to
        be bound by these Terms of Service. If you do not agree to these Terms, please do not use
        the App. LookReal is operated by FranBoss Dammy Nigeria Limited, a company incorporated
        under the laws of Nigeria.
      </SectionCard>

      <SectionCard title="2. Description of Service" icon="information-circle-outline">
        LookReal is a platform that connects users with beauty and wellness professionals, including
        hairstylists, barbers, nail technicians, pedicurists, and massage therapists based on their
        location. We facilitate bookings between users and service providers but are not responsible
        for the actual services rendered.
      </SectionCard>

      <SectionCard title="3. User Accounts" icon="person-outline">
        To use certain features of the App, you must create an account. You agree to provide
        accurate, current, and complete information during registration and to update such
        information to keep it accurate. You are responsible for safeguarding your password and for
        all activities that occur under your account. You must be at least 18 years old to create
        an account.
      </SectionCard>

      <SectionCard title="4. Bookings and Payments" icon="card-outline">
        When you book a service through LookReal, you enter into a direct agreement with the
        service provider. Payment is processed through our third-party payment processors.
        Cancellation and refund policies vary by service provider and are displayed at the time of
        booking. LookReal charges a service fee for facilitating bookings.
      </SectionCard>

      <SectionCard title="5. Cancellation Policies" icon="time-outline">
        {`CLIENT CANCELLATIONS: If you cancel a booking for a home service within 59 minutes of your scheduled appointment time, you will be charged a 20% cancellation fee of the total service cost. This fee compensates the service provider for potential transportation costs and time commitment.\n\nVENDOR CANCELLATIONS: Service providers who cancel confirmed bookings within 4 hours of the scheduled appointment time may face temporary or permanent restrictions from the platform. Repeated cancellations may result in account suspension or termination.`}
      </SectionCard>

      <SectionCard title="6. Platform Integrity" icon="alert-circle-outline">
        {`PROHIBITED CONDUCT: Any attempt by service providers to use LookReal for fraudulent activities, scams, or deceptive practices will result in immediate account termination.\n\nOFF-PLATFORM ARRANGEMENTS: Service providers are strictly prohibited from soliciting clients to conduct transactions outside the LookReal platform. Any services rendered or payments made outside our platform are not covered by LookReal's policies, protections, or support.`}
      </SectionCard>

      <SectionCard title="7. User Conduct" icon="shield-checkmark-outline">
        You agree not to: (a) use the App for any unlawful purpose; (b) harass, abuse, or harm
        other users; (c) provide false or misleading information; (d) interfere with the proper
        functioning of the App; (e) attempt to gain unauthorized access; (f) use the App to
        transmit viruses or malicious code.
      </SectionCard>

      <SectionCard title="8. Service Provider Terms" icon="briefcase-outline">
        Service providers on LookReal are independent contractors and not employees of FranBoss
        Dammy Nigeria Limited. LookReal does not guarantee the quality, safety, or legality of
        services offered. Service providers are responsible for complying with all applicable laws.
      </SectionCard>

      <SectionCard title="9. Intellectual Property" icon="bulb-outline">
        The App and its original content, features, and functionality are owned by FranBoss Dammy
        Nigeria Limited and are protected by international copyright, trademark, and other
        intellectual property laws.
      </SectionCard>

      <SectionCard title="10. Limitation of Liability" icon="alert-circle-outline">
        To the maximum extent permitted by law, LookReal and FranBoss Dammy Nigeria Limited shall
        not be liable for any indirect, incidental, special, consequential, or punitive damages.
        Our total liability shall not exceed the amount you paid through the App in the past 12
        months.
      </SectionCard>

      <SectionCard title="11. Termination" icon="close-circle-outline">
        We may terminate or suspend your account immediately, without prior notice, for any reason
        including breach of these Terms. Upon termination, your right to use the App will cease
        immediately.
      </SectionCard>

      <SectionCard title="12. Governing Law" icon="globe-outline">
        These Terms shall be governed by and construed in accordance with the laws of the Federal
        Republic of Nigeria. Any disputes arising from these Terms shall be resolved in the courts
        of Nigeria.
      </SectionCard>

      <ContactSection />
    </>
  );

  const renderPrivacy = () => (
    <>
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons name="shield-checkmark" size={30} color={PINK} />
        </View>
        <Text style={styles.heroTitle}>Privacy Policy</Text>
        <Text style={styles.heroDate}>Last updated: July 24, 2025</Text>
      </View>

      <Text style={styles.intro}>
        Your privacy is important to us. This policy explains how we collect, use, and protect
        your personal information.
      </Text>

      <SectionCard title="About LookReal" icon="information-circle-outline">
        LookReal, developed by FranBoss Dammy Nigeria Limited, connects users with beauty and
        wellness professionals. We are committed to protecting your privacy in compliance with the
        Nigeria Data Protection Act (2023).
      </SectionCard>

      <SectionCard title="Data Controller" icon="business-outline">
        FranBoss Dammy Nigeria Limited acts as the data controller for all Personal Data collected
        through this Application. Our primary servers are securely hosted in the United States,
        with all Personal Data processed under strict legal and contractual safeguards.
      </SectionCard>

      <View style={styles.infoRow}>
        {[
          { icon: 'person' as const, bg: '#FFF0F5', color: PINK, title: 'Personal Info', desc: 'Name, email, phone' },
          { icon: 'card' as const, bg: '#dbeafe', color: '#3b82f6', title: 'Payment Info', desc: 'Via secure processors' },
          { icon: 'analytics' as const, bg: '#dcfce7', color: '#22c55e', title: 'Usage Data', desc: 'Device & statistics' },
        ].map(item => (
          <View key={item.title} style={styles.infoCard}>
            <View style={[styles.infoCardIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={styles.infoCardTitle}>{item.title}</Text>
            <Text style={styles.infoCardDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>

      <SectionCard title="Cookies and Tracking" icon="finger-print-outline">
        We use cookies and similar tracking technologies including Session Cookies, Preference
        Cookies, Analytical Cookies, Security Cookies, and Targeting Cookies. You may configure
        your browser to refuse cookies, though some features may not function properly.
      </SectionCard>

      <SectionCard title="How We Share Your Information" icon="share-social-outline">
        We share information with Service Professionals (name, contact, location for appointments),
        Payment Processors (transaction data), and Third-party Service Providers under strict data
        protection agreements. We do not sell your personal data to third parties.
      </SectionCard>

      <SectionCard title="Your Rights" icon="checkmark-done-outline">
        You have the right to access, rectify, erase, and port your personal data. You can delete
        certain Personal Information or permanently delete your account through the App settings.
      </SectionCard>

      <SectionCard title="Data Security" icon="lock-closed-outline">
        We secure your information on servers in a controlled, secure environment with reasonable
        administrative, technical, and physical safeguards. However, no data transmission over the
        Internet can be guaranteed completely secure.
      </SectionCard>

      <SectionCard title="Children's Privacy" icon="people-outline">
        We do not knowingly collect Personal Information from children under 18. You must be at
        least 18 years old to consent to the processing of your Personal Information.
      </SectionCard>

      <SectionCard title="Policy Updates" icon="refresh-outline">
        We may update this Privacy Policy from time to time. Changes will be posted on this page
        with an updated revision date. Your continued use of the App constitutes acceptance.
      </SectionCard>

      <ContactSection />
    </>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backCircle}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={PINK} />
        </TouchableOpacity>
        <Image
          source={require('../../../../assets/lookrealMainLogo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['terms', 'privacy'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab === 'terms' ? 'document-text-outline' : 'shield-checkmark-outline'}
              size={16}
              color={activeTab === tab ? PINK : '#aaa'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'terms' ? 'Terms' : 'Privacy'}
              {tab === 'terms' && hasScrolledToBottomTerms
                ? ' ✓'
                : tab === 'privacy' && hasScrolledToBottomPrivacy
                ? ' ✓'
                : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        {activeTab === 'terms' ? renderTerms() : renderPrivacy()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 LookReal by FranBoss Dammy Nigeria Limited</Text>
        </View>
      </ScrollView>

      {/* Done Reading Button */}
      <View style={styles.doneBar}>
        {hasScrolledCurrent ? (
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.doneBtnText}>
              Done Reading {activeTab === 'terms' ? 'Terms' : 'Privacy Policy'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.doneBtnLocked}>
            <Ionicons name="arrow-down-circle-outline" size={20} color="#bbb" />
            <Text style={styles.doneBtnLockedText}>Scroll to the bottom to continue</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const ContactSection = () => {
  const openWhatsApp = () => Linking.openURL('https://wa.me/2347066965448');
  const openEmail = () => Linking.openURL('mailto:support@lookreal.beauty');
  const openCall = () => Linking.openURL('tel:+2347066965448');

  return (
    <View style={styles.contactCard}>
      <Text style={styles.contactTitle}>Need Help?</Text>
      <Text style={styles.contactSub}>Contact our support team</Text>
      <View style={styles.contactRow}>
        {[
          { label: 'WhatsApp', icon: 'logo-whatsapp' as const, bg: '#dcfce7', color: '#25D366', onPress: openWhatsApp },
          { label: 'Email', icon: 'mail' as const, bg: '#FFF0F5', color: '#E91E63', onPress: openEmail },
          { label: 'Call', icon: 'call' as const, bg: '#dbeafe', color: '#3b82f6', onPress: openCall },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.contactItem} onPress={item.onPress} activeOpacity={0.7}>
            <View style={[styles.contactIconBg, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.contactLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12,
    backgroundColor: BG,
  },
  backCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  headerLogo: { width: 100, height: 36 },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 8,
    backgroundColor: 'white', borderRadius: 14, padding: 4,
    borderWidth: 1.5, borderColor: BORDER,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  tabActive: { backgroundColor: '#FFF0F5' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#aaa' },
  tabTextActive: { color: PINK },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  heroBadge: {
    width: 68, height: 68, borderRadius: 20, backgroundColor: '#FFE4EF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  heroDate: { fontSize: 13, color: '#aaa' },
  intro: {
    fontSize: 14, color: '#555', lineHeight: 22, textAlign: 'center',
    marginBottom: 20, paddingHorizontal: 8,
  },
  sectionCard: {
    backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#f0e0ea',
    shadowColor: '#E91E63', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  sectionIconBg: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#FFE4EF',
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  sectionContent: { fontSize: 13, color: '#555', lineHeight: 21 },
  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  infoCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#f0e0ea',
  },
  infoCardIcon: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center',
    alignItems: 'center', marginBottom: 8,
  },
  infoCardTitle: { fontSize: 11, fontWeight: '700', color: '#1a1a1a', marginBottom: 3, textAlign: 'center' },
  infoCardDesc: { fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 14 },
  contactCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 20, marginTop: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#f0e0ea',
  },
  contactTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  contactSub: { fontSize: 13, color: '#888', marginBottom: 16 },
  contactRow: { flexDirection: 'row', gap: 20 },
  contactItem: { alignItems: 'center' },
  contactIconBg: {
    width: 50, height: 50, borderRadius: 14, justifyContent: 'center',
    alignItems: 'center', marginBottom: 6,
  },
  contactLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 11, color: '#bbb', textAlign: 'center' },
  doneBar: {
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  doneBtn: {
    backgroundColor: PINK, borderRadius: 30, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: PINK, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  doneBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  doneBtnLocked: {
    borderRadius: 30, paddingVertical: 15, borderWidth: 1.5, borderColor: '#ddd',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'white',
  },
  doneBtnLockedText: { color: '#bbb', fontSize: 14, fontWeight: '500' },
});

export default TermsPrivacyAuthScreen;
