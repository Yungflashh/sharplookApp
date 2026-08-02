import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG     = '#F8F9FA';
const WHITE  = '#FFFFFF';

type TabType = 'terms' | 'privacy';
interface Props { navigation?: any; route?: any; initialTab?: TabType; onBack?: () => void }

const CONTACT_ACTIONS = [
  { icon: 'logo-whatsapp' as const, label: 'WhatsApp', color: '#25D366', bg: '#F0FFF4', url: 'https://wa.me/2347066965448' },
  { icon: 'mail-outline' as const,  label: 'Email',    color: '#3B82F6', bg: '#EFF6FF', url: 'mailto:support@lookreal.beauty' },
  { icon: 'call-outline' as const,  label: 'Call Us',  color: '#F59E0B', bg: '#FFFBEB', url: 'tel:+2347066965448' },
];

const SectionCard = ({ title, icon, children }: { title: string; icon?: string; children: string }) => (
  <View style={s.sectionCard}>
    <View style={s.sectionHead}>
      {icon && (
        <View style={s.sectionIconWrap}>
          <Ionicons name={icon as any} size={16} color={PINK} />
        </View>
      )}
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
    <Text style={s.sectionBody}>{children}</Text>
  </View>
);

const ContactSection = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={s.contactCard}>
    <Text style={s.contactTitle}>{title}</Text>
    <Text style={s.contactSub}>{subtitle}</Text>
    <View style={s.contactRow}>
      {CONTACT_ACTIONS.map(a => (
        <TouchableOpacity key={a.label} onPress={() => Linking.openURL(a.url)} activeOpacity={0.7} style={s.contactBtn}>
          <View style={[s.contactIconWrap, { backgroundColor: a.bg }]}>
            <Ionicons name={a.icon} size={22} color={a.color} />
          </View>
          <Text style={[s.contactLabel, { color: a.color }]}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

export default function TermsPrivacyScreen({ navigation, route, initialTab, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const startTab = route?.params?.initialTab || initialTab || 'terms';
  const [activeTab, setActiveTab] = useState<TabType>(startTab);

  const handleBack = () => { if (onBack) onBack(); else navigation?.goBack(); };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Header */}
      <View style={{ backgroundColor: WHITE, paddingTop: insets.top }}>
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={PINK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Legal</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Tab bar */}
        <View style={s.tabBar}>
          {(['terms', 'privacy'] as TabType[]).map(tab => {
            const active = tab === activeTab;
            const icon = tab === 'terms' ? 'document-text-outline' : 'shield-checkmark-outline';
            const label = tab === 'terms' ? 'Terms of Service' : 'Privacy Policy';
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
                style={[s.tab, active && s.tabActive]}
              >
                <Ionicons name={icon as any} size={16} color={active ? PINK : TEXT3} />
                <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}

        <View style={s.footer}>
          <Text style={s.footerText}>© 2025 LookReal by FranBoss Dammy Nigeria Limited</Text>
          <Text style={s.footerSub}>All rights reserved</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const TermsContent = () => (
  <>
    <View style={s.hero}>
      <View style={[s.heroIcon, { backgroundColor: PINK_S }]}>
        <Ionicons name="document-text" size={32} color={PINK} />
      </View>
      <Text style={s.heroTitle}>Terms of Service</Text>
      <Text style={s.heroSub}>Last updated: July 24, 2025</Text>
    </View>
    <Text style={s.intro}>
      Please read these terms carefully before using LookReal. By using our app, you agree to be bound by these terms.
    </Text>

    <SectionCard title="1. Acceptance of Terms" icon="checkmark-circle-outline">
      By downloading, installing, or using the LookReal mobile application ("App"), you agree to be bound by these Terms of Service. If you do not agree to these Terms, please do not use the App. LookReal is operated by FranBoss Dammy Nigeria Limited, a company incorporated under the laws of Nigeria.
    </SectionCard>

    <SectionCard title="2. Description of Service" icon="information-circle-outline">
      LookReal is a platform that connects users with beauty and wellness professionals, including hairstylists, barbers, nail technicians, pedicurists, and massage therapists based on their location. We facilitate bookings between users and service providers but are not responsible for the actual services rendered.
    </SectionCard>

    <SectionCard title="3. User Accounts" icon="person-outline">
      To use certain features of the App, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your password and for all activities that occur under your account. You must be at least 18 years old to create an account.
    </SectionCard>

    <SectionCard title="4. Bookings and Payments" icon="card-outline">
      When you book a service through LookReal, you enter into a direct agreement with the service provider. Payment is processed through our third-party payment processors. Cancellation and refund policies vary by service provider and are displayed at the time of booking. LookReal charges a service fee for facilitating bookings.
    </SectionCard>

    <SectionCard title="5. Cancellation Policies" icon="time-outline">
      {`CLIENT CANCELLATIONS: If you cancel a booking for a home service within 59 minutes of your scheduled appointment time, you will be charged a 20% cancellation fee of the total service cost. This fee compensates the service provider for potential transportation costs and time commitment.\n\nVENDOR CANCELLATIONS: Service providers who cancel confirmed bookings within 4 hours of the scheduled appointment time will receive a notification and may face temporary or permanent restrictions from the platform.`}
    </SectionCard>

    <SectionCard title="6. Platform Integrity & Off-Platform Transactions" icon="alert-circle-outline">
      {`PROHIBITED CONDUCT: Any attempt by service providers to use LookReal for fraudulent activities, scams, or deceptive practices will result in immediate account termination.\n\nOFF-PLATFORM ARRANGEMENTS: Service providers are strictly prohibited from soliciting clients to conduct transactions outside the LookReal platform. Any services rendered or payments made outside our platform are not covered by LookReal's policies or protections.`}
    </SectionCard>

    <SectionCard title="7. User Conduct" icon="shield-checkmark-outline">
      You agree not to: (a) use the App for any unlawful purpose; (b) harass, abuse, or harm other users or service providers; (c) provide false or misleading information; (d) interfere with the proper functioning of the App; (e) attempt to gain unauthorized access to any part of the App; (f) use the App to transmit viruses or malicious code.
    </SectionCard>

    <SectionCard title="8. Service Provider Terms" icon="briefcase-outline">
      Service providers on LookReal are independent contractors and not employees of FranBoss Dammy Nigeria Limited. LookReal does not guarantee the quality, safety, or legality of services offered. Service providers are responsible for complying with all applicable laws and regulations.
    </SectionCard>

    <SectionCard title="9. Intellectual Property" icon="bulb-outline">
      The App and its original content, features, and functionality are owned by FranBoss Dammy Nigeria Limited and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the App.
    </SectionCard>

    <SectionCard title="10. Limitation of Liability" icon="warning-outline">
      To the maximum extent permitted by law, LookReal and FranBoss Dammy Nigeria Limited shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App or services booked through the App. Our total liability shall not exceed the amount you paid through the App in the past 12 months.
    </SectionCard>

    <SectionCard title="11. Termination" icon="close-circle-outline">
      We may terminate or suspend your account and access to the App immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the App will cease immediately. You may also delete your account at any time through the App settings.
    </SectionCard>

    <SectionCard title="12. Governing Law" icon="globe-outline">
      These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of Nigeria.
    </SectionCard>

    <ContactSection title="Need Help?" subtitle="Contact our support team" />
  </>
);

const PrivacyContent = () => (
  <>
    <View style={s.hero}>
      <View style={[s.heroIcon, { backgroundColor: PINK_S }]}>
        <Ionicons name="shield-checkmark" size={32} color={PINK} />
      </View>
      <Text style={s.heroTitle}>Privacy Policy</Text>
      <Text style={s.heroSub}>Last updated: July 24, 2025</Text>
    </View>
    <Text style={s.intro}>
      Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
    </Text>

    <SectionCard title="About LookReal" icon="information-circle-outline">
      Welcome to LookReal, a mobile application developed by FranBoss Dammy Nigeria Limited. We seamlessly connect users with hairstylists, barbers, nail technicians, pedicurists and massage therapists based on their location. We are committed to protecting your privacy and ensuring the security of your personal data in compliance with the Nigeria Data Protection Act (2023).
    </SectionCard>

    <SectionCard title="Data Controller" icon="business-outline">
      FranBoss Dammy Nigeria Limited acts as the data controller in respect of all Personal Data collected through this Mobile Application. The company is responsible for determining the purposes and means of processing such data. Our primary servers are securely hosted in the United States, with all Personal Data processed under strict legal and contractual safeguards.
    </SectionCard>

    {/* Info cards row */}
    <View style={s.infoRow}>
      {[
        { icon: 'person', color: PINK, bg: PINK_S, title: 'Personal Info', text: 'Name, email, phone for authentication' },
        { icon: 'card', color: '#3B82F6', bg: '#EFF6FF', title: 'Payment Info', text: 'Processed securely via third-party providers' },
        { icon: 'analytics', color: '#10B981', bg: '#ECFDF5', title: 'Usage Data', text: 'Device info, access times and statistics' },
      ].map(({ icon, color, bg, title, text }) => (
        <View key={title} style={s.infoCard}>
          <View style={[s.infoIconWrap, { backgroundColor: bg }]}>
            <Ionicons name={icon as any} size={22} color={color} />
          </View>
          <Text style={s.infoTitle}>{title}</Text>
          <Text style={s.infoText}>{text}</Text>
        </View>
      ))}
    </View>

    <SectionCard title="Cookies and Tracking" icon="finger-print-outline">
      We use cookies and similar tracking technologies including Session Cookies, Preference Cookies, Analytical Cookies, Security Cookies, and Targeting Cookies. You may configure your browser to refuse cookies, though some features may not function properly.
    </SectionCard>

    <SectionCard title="How We Share Your Information" icon="share-social-outline">
      We share information with Service Professionals (name, contact details, location for appointments), Payment Processors (transaction data for payments/refunds), and Third-party Service Providers (cloud hosting, analytics, customer support) under strict data protection agreements. We may disclose data if required by law. We do not sell your personal data to third parties.
    </SectionCard>

    <SectionCard title="Your Rights" icon="checkmark-done-outline">
      You have the right to access, rectify, erase, and port your personal data. You can delete certain Personal Information or permanently delete your account through the App settings. We may maintain necessary copies for legal compliance purposes.
    </SectionCard>

    <SectionCard title="Data Security" icon="lock-closed-outline">
      We secure your information on servers in a controlled, secure environment with reasonable administrative, technical, and physical safeguards. However, no data transmission over the Internet can be guaranteed completely secure.
    </SectionCard>

    <SectionCard title="Data Breach Protocol" icon="warning-outline">
      In the event of a security breach affecting your Personal Information, we will make reasonable efforts to notify affected individuals through the App, email, or phone if there is a reasonable risk of harm.
    </SectionCard>

    <SectionCard title="Children's Privacy" icon="people-outline">
      We do not knowingly collect Personal Information from children under 18. You must be at least 18 years old to consent to the processing of your Personal Information.
    </SectionCard>

    <SectionCard title="Policy Updates" icon="refresh-outline">
      We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. Your continued use of the App constitutes acceptance of any changes.
    </SectionCard>

    <ContactSection title="Questions About Your Data?" subtitle="Our team is here to help" />
  </>
);

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

  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14,
    backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER,
  },
  tabActive: { backgroundColor: PINK_S, borderColor: PINK },
  tabText: { fontSize: 13, fontWeight: '600', color: TEXT3 },
  tabTextActive: { color: PINK },

  hero: { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
  heroIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: TEXT1, marginBottom: 4 },
  heroSub: { fontSize: 13, color: TEXT2 },
  intro: { fontSize: 14, color: TEXT2, lineHeight: 22, textAlign: 'center', paddingHorizontal: 8, marginBottom: 20 },

  sectionCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 1 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 } }),
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT1, flex: 1 },
  sectionBody: { fontSize: 13, color: TEXT2, lineHeight: 21 },

  infoRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  infoCard: {
    flex: 1, backgroundColor: WHITE, borderRadius: 16, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 1 } }),
  },
  infoIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  infoTitle: { fontSize: 12, fontWeight: '700', color: TEXT1, marginBottom: 4, textAlign: 'center' },
  infoText: { fontSize: 10, color: TEXT2, textAlign: 'center', lineHeight: 14 },

  contactCard: {
    backgroundColor: WHITE, borderRadius: 20, padding: 20,
    alignItems: 'center', marginTop: 10,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  contactTitle: { fontSize: 17, fontWeight: '700', color: TEXT1, marginBottom: 4 },
  contactSub: { fontSize: 13, color: TEXT2, marginBottom: 20 },
  contactRow: { flexDirection: 'row', gap: 20 },
  contactBtn: { alignItems: 'center' },
  contactIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  contactLabel: { fontSize: 13, fontWeight: '600' },

  footer: { alignItems: 'center', paddingTop: 32 },
  footerText: { fontSize: 11, color: TEXT3, marginBottom: 2, textAlign: 'center' },
  footerSub: { fontSize: 10, color: BORDER },
});
