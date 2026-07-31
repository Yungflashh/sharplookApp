import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type TabType = "terms" | "privacy";

interface Props {
  navigation?: any;
  route?: any;
  initialTab?: TabType;
  onBack?: () => void;
}

const PRIMARY = '#E04079';
const BG      = '#FCE4EC';
const WHITE   = '#FFFFFF';
const TEXT    = '#1A1A2E';
const GRAY    = '#6B7280';

const TERMS_SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: 'By downloading, installing, or using the LookReal mobile application ("App"), you agree to be bound by these Terms of Service. If you do not agree to these Terms, please do not use the App. LookReal is operated by FranBoss Dammy Nigeria Limited, a company incorporated under the laws of Nigeria.',
  },
  {
    title: 'Description of Service',
    body: 'LookReal is a platform that connects users with beauty and wellness professionals, including hairstylists, barbers, nail technicians, pedicurists, and massage therapists based on their location. We facilitate bookings between users and service providers but are not responsible for the actual services rendered.',
  },
  {
    title: 'User Accounts',
    body: 'To use certain features of the App, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your password and for all activities that occur under your account. You must be at least 18 years old to create an account.',
  },
  {
    title: 'Bookings and Payments',
    body: 'When you book a service through LookReal, you enter into a direct agreement with the service provider. Payment is processed through our third-party payment processors. Cancellation and refund policies vary by service provider and are displayed at the time of booking. LookReal charges a service fee for facilitating bookings.',
  },
  {
    title: 'Cancellation Policies',
    body: 'CLIENT CANCELLATIONS: If you cancel a booking for a home service within 59 minutes of your scheduled appointment time, you will be charged a 20% cancellation fee of the total service cost. This fee compensates the service provider for potential transportation costs and time commitment, as they may have already commenced travel to your location. This fee will be automatically deducted and transferred to the affected service provider.\n\nVENDOR CANCELLATIONS: Service providers who cancel confirmed bookings within 4 hours of the scheduled appointment time will receive a notification and may face temporary or permanent restrictions from the platform. Repeated cancellations may result in account suspension or termination.',
  },
  {
    title: 'Platform Integrity and Off-Platform Transactions',
    body: 'PROHIBITED CONDUCT: Any attempt by service providers to use LookReal for fraudulent activities, scams, or deceptive practices will result in immediate account termination and may be reported to relevant authorities.\n\nOFF-PLATFORM ARRANGEMENTS: Service providers are strictly prohibited from soliciting clients to conduct transactions outside the LookReal platform. Similarly, clients should not agree to or initiate arrangements to meet or transact with service providers outside of LookReal\'s booking system. Any services rendered or payments made outside our platform are not covered by LookReal\'s policies, protections, or support. LookReal shall not be liable for any disputes, damages, injuries, or losses arising from off-platform transactions. Violations of this policy may result in account suspension or permanent ban for both parties involved.',
  },
  {
    title: 'User Conduct',
    body: 'You agree not to: (a) use the App for any unlawful purpose; (b) harass, abuse, or harm other users or service providers; (c) provide false or misleading information; (d) interfere with the proper functioning of the App; (e) attempt to gain unauthorized access to any part of the App; (f) use the App to transmit viruses or malicious code.',
  },
  {
    title: 'Service Provider Terms',
    body: 'Service providers on LookReal are independent contractors and not employees of FranBoss Dammy Nigeria Limited. LookReal does not guarantee the quality, safety, or legality of services offered. Service providers are responsible for complying with all applicable laws and regulations.',
  },
  {
    title: 'Intellectual Property',
    body: 'The App and its original content, features, and functionality are owned by FranBoss Dammy Nigeria Limited and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the App.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted by law, LookReal and FranBoss Dammy Nigeria Limited shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App or services booked through the App. Our total liability shall not exceed the amount you paid through the App in the past 12 months.',
  },
  {
    title: 'Termination',
    body: 'We may terminate or suspend your account and access to the App immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the App will cease immediately. You may also delete your account at any time through the App settings.',
  },
  {
    title: 'Governing Law',
    body: 'These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of Nigeria.',
  },
];

const PRIVACY_SECTIONS_BEFORE_CARDS = [
  {
    title: 'About LookReal',
    body: 'Welcome to LookReal, a mobile application developed by FranBoss Dammy Nigeria Limited. We seamlessly connect users with hairstylists, barbers, nail technicians, pedicurists and massage therapists based on their location. We are committed to protecting your privacy and ensuring the security of your personal data in compliance with the Nigeria Data Protection Act (2023).',
  },
  {
    title: 'Data Controller',
    body: 'FranBoss Dammy Nigeria Limited acts as the data controller in respect of all Personal Data collected through this Mobile Application. The company is responsible for determining the purposes and means of processing such data. Our primary servers are securely hosted in the United States, with all Personal Data processed under strict legal and contractual safeguards.',
  },
];

const PRIVACY_SECTIONS_AFTER_CARDS = [
  {
    title: 'Cookies and Tracking',
    body: 'We use cookies and similar tracking technologies including Session Cookies, Preference Cookies, Analytical Cookies, Security Cookies, and Targeting Cookies. You may configure your browser to refuse cookies, though some features may not function properly.',
  },
  {
    title: 'How We Share Your Information',
    body: 'We share information with Service Professionals (name, contact details, location for appointments), Payment Processors (transaction data for payments/refunds), and Third-party Service Providers (cloud hosting, analytics, customer support) under strict data protection agreements. We may disclose data if required by law. We do not sell your personal data to third parties.',
  },
  {
    title: 'Your Rights',
    body: 'You have the right to access, rectify, erase, and port your personal data. You can delete certain Personal Information or permanently delete your account through the App settings. We may maintain necessary copies for legal compliance purposes.',
  },
  {
    title: 'Data Security',
    body: 'We secure your information on servers in a controlled, secure environment with reasonable administrative, technical, and physical safeguards. However, no data transmission over the Internet can be guaranteed completely secure.',
  },
  {
    title: 'Data Breach Protocol',
    body: 'In the event of a security breach affecting your Personal Information, we will make reasonable efforts to notify affected individuals through the App, email, or phone if there is a reasonable risk of harm.',
  },
  {
    title: "Children's Privacy",
    body: 'We do not knowingly collect Personal Information from children under 18. You must be at least 18 years old to consent to the processing of your Personal Information.',
  },
  {
    title: 'Policy Updates',
    body: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. Your continued use of the App constitutes acceptance of any changes.',
  },
];

const Subsection = ({ number, title, body }: { number: string; title: string; body: string }) => (
  <View style={styles.subsection}>
    <Text style={styles.subsectionTitle}>{number} {title}</Text>
    <Text style={styles.subsectionBody}>{body}</Text>
  </View>
);

export default function TermsPrivacyAuthScreen({ navigation, route, initialTab, onBack }: Props) {
  const activeTab: TabType = route?.params?.type || initialTab || "terms";
  const isTerms = activeTab === 'terms';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const handleAccept = () => {
    route?.params?.onAccept?.();
    handleBack();
  };

  const handleEmailPress = () => {
    Linking.openURL("mailto:support@lookreal.beauty");
  };

  const handleWhatsAppPress = () => {
    Linking.openURL("https://wa.me/2347066965448");
  };

  const handleCallPress = () => {
    Linking.openURL("tel:+2347066965448");
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back button */}
      <Pressable onPress={handleBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={20} color={PRIMARY} />
      </Pressable>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terms & Privacy</Text>
        <Text style={styles.headerSubtitle}>Last updated July 24, 2025</Text>
        <Text style={styles.introText}>
          Please read these terms carefully before using LookReal. By using our app, you agree to be bound by these terms.
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.docCard}>
          <View style={styles.docHeadingRow}>
            <View style={styles.docIconWrap}>
              <Ionicons name={isTerms ? 'document-text' : 'shield-checkmark'} size={16} color={PRIMARY} />
            </View>
            <Text style={styles.docHeading}>{isTerms ? '1. Terms & Conditions' : '1. Privacy Policy'}</Text>
          </View>

          {isTerms ? (
            TERMS_SECTIONS.map((s, i) => (
              <Subsection key={s.title} number={`1.${i + 1}`} title={s.title} body={s.body} />
            ))
          ) : (
            <>
              {PRIVACY_SECTIONS_BEFORE_CARDS.map((s, i) => (
                <Subsection key={s.title} number={`1.${i + 1}`} title={s.title} body={s.body} />
              ))}

              {/* Info Cards */}
              <View style={styles.infoCardsContainer}>
                <View style={styles.infoCard}>
                  <View style={[styles.infoCardIcon, { backgroundColor: '#fce7f3' }]}>
                    <Ionicons name="person" size={22} color={PRIMARY} />
                  </View>
                  <Text style={styles.infoCardTitle}>Personal Info</Text>
                  <Text style={styles.infoCardText}>Name, email, phone number for authentication</Text>
                </View>
                <View style={styles.infoCard}>
                  <View style={[styles.infoCardIcon, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="card" size={22} color="#3b82f6" />
                  </View>
                  <Text style={styles.infoCardTitle}>Payment Info</Text>
                  <Text style={styles.infoCardText}>Processed securely via third-party providers</Text>
                </View>
                <View style={styles.infoCard}>
                  <View style={[styles.infoCardIcon, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="analytics" size={22} color="#22c55e" />
                  </View>
                  <Text style={styles.infoCardTitle}>Usage Data</Text>
                  <Text style={styles.infoCardText}>Device info, access times, and statistics</Text>
                </View>
              </View>

              {PRIVACY_SECTIONS_AFTER_CARDS.map((s, i) => (
                <Subsection
                  key={s.title}
                  number={`1.${i + PRIVACY_SECTIONS_BEFORE_CARDS.length + 1}`}
                  title={s.title}
                  body={s.body}
                />
              ))}
            </>
          )}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Need Help?</Text>
          <Text style={styles.contactSubtitle}>Contact our support team</Text>

          <View style={styles.contactButtons}>
            <Pressable onPress={handleWhatsAppPress} style={styles.contactButton}>
              <View style={[styles.contactIconBg, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </View>
              <Text style={styles.contactButtonText}>WhatsApp</Text>
            </Pressable>

            <Pressable onPress={handleEmailPress} style={styles.contactButton}>
              <View style={[styles.contactIconBg, { backgroundColor: '#fce7f3' }]}>
                <Ionicons name="mail" size={20} color={PRIMARY} />
              </View>
              <Text style={styles.contactButtonText}>Email</Text>
            </Pressable>

            <Pressable onPress={handleCallPress} style={styles.contactButton}>
              <View style={[styles.contactIconBg, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="call" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.contactButtonText}>Call</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 LookReal by FranBoss Dammy Nigeria Limited</Text>
          <Text style={styles.footerSubtext}>All rights reserved</Text>
        </View>
      </ScrollView>

      {/* Decline / Accept */}
      <View style={styles.actionRow}>
        <Pressable onPress={handleBack} style={styles.declineBtn}>
          <Text style={styles.declineBtnText}>Decline</Text>
        </Pressable>
        <Pressable onPress={handleAccept} style={styles.acceptBtn}>
          <Text style={styles.acceptBtnText}>Accept & Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginLeft: 20,
  },
  header: { alignItems: 'center', paddingHorizontal: 24, marginTop: 8, marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: GRAY, marginTop: 4 },
  introText: {
    fontSize: 13, color: GRAY, textAlign: 'center', marginTop: 10, lineHeight: 19,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  docCard: {
    backgroundColor: WHITE, borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  docHeadingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  docIconWrap: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#fdf2f8',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  docHeading: { fontSize: 16, fontWeight: '800', color: '#111827' },
  subsection: { marginBottom: 16 },
  subsectionTitle: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginBottom: 6 },
  subsectionBody: { fontSize: 13.5, color: '#374151', lineHeight: 21 },
  infoCardsContainer: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  infoCard: {
    flex: 1, backgroundColor: '#FAFAFA', borderRadius: 14, padding: 12, alignItems: 'center',
  },
  infoCardIcon: {
    width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  infoCardTitle: { fontSize: 11.5, fontWeight: '700', color: '#111827', marginBottom: 4, textAlign: 'center' },
  infoCardText: { fontSize: 10, color: GRAY, textAlign: 'center', lineHeight: 14 },
  contactSection: {
    backgroundColor: WHITE, borderRadius: 18, padding: 20, marginTop: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  contactTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  contactSubtitle: { fontSize: 13, color: GRAY, marginBottom: 18 },
  contactButtons: { flexDirection: 'row', gap: 12 },
  contactButton: { alignItems: 'center', paddingHorizontal: 16 },
  contactIconBg: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  contactButtonText: { fontSize: 12.5, fontWeight: '600', color: '#374151' },
  footer: { alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 11.5, color: '#9ca3af', marginBottom: 2 },
  footerSubtext: { fontSize: 10.5, color: '#d1d5db' },
  actionRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
    backgroundColor: BG,
  },
  declineBtn: {
    flex: 1, height: 52, borderRadius: 999, borderWidth: 1.5, borderColor: PRIMARY,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: { color: PRIMARY, fontSize: 15, fontWeight: '700' },
  acceptBtn: {
    flex: 1.3, height: 52, borderRadius: 999, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  acceptBtnText: { color: WHITE, fontSize: 15, fontWeight: '700' },
});
