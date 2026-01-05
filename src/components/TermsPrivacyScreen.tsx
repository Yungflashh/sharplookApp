import React, { useState } from "react";
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

export default function TermsPrivacyScreen({ navigation, route, initialTab, onBack }: Props) {
  const startTab = route?.params?.initialTab || initialTab || "terms";
  const [activeTab, setActiveTab] = useState<TabType>(startTab);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const handleEmailPress = () => {
    Linking.openURL("mailto:hello@sharplook.beauty");
  };

  const handleWhatsAppPress = () => {
    Linking.openURL("https://wa.me/2347066965448");
  };

  const handleCallPress = () => {
    Linking.openURL("tel:+2347066965448");
  };

  const SectionCard = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        {icon && (
          <View style={styles.sectionIconContainer}>
            <Ionicons name={icon as any} size={18} color="#eb278d" />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionContent}>{children}</Text>
    </View>
  );

  const renderTermsContent = () => (
    <>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroIconContainer}>
          <Ionicons name="document-text" size={32} color="#eb278d" />
        </View>
        <Text style={styles.heroTitle}>Terms of Service</Text>
        <Text style={styles.heroSubtitle}>Last updated: July 24, 2025</Text>
      </View>

      <Text style={styles.introText}>
        Please read these terms carefully before using SharpLook. By using our app, you agree to be bound by these terms.
      </Text>

      <SectionCard title="1. Acceptance of Terms" icon="checkmark-circle-outline">
        By downloading, installing, or using the SharpLook mobile application ("App"), you agree to be bound by these Terms of Service. If you do not agree to these Terms, please do not use the App. SharpLook is operated by FranBoss Dammy Nigeria Limited, a company incorporated under the laws of Nigeria.
      </SectionCard>

      <SectionCard title="2. Description of Service" icon="information-circle-outline">
        SharpLook is a platform that connects users with beauty and wellness professionals, including hairstylists, barbers, nail technicians, pedicurists, and massage therapists based on their location. We facilitate bookings between users and service providers but are not responsible for the actual services rendered.
      </SectionCard>

      <SectionCard title="3. User Accounts" icon="person-outline">
        To use certain features of the App, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your password and for all activities that occur under your account. You must be at least 18 years old to create an account.
      </SectionCard>

      <SectionCard title="4. Bookings and Payments" icon="card-outline">
        When you book a service through SharpLook, you enter into a direct agreement with the service provider. Payment is processed through our third-party payment processors. Cancellation and refund policies vary by service provider and are displayed at the time of booking. SharpLook charges a service fee for facilitating bookings.
      </SectionCard>

      <SectionCard title="5. Cancellation Policies" icon="time-outline">
        CLIENT CANCELLATIONS: If you cancel a booking for a home service within 59 minutes of your scheduled appointment time, you will be charged a 20% cancellation fee of the total service cost. This fee compensates the service provider for potential transportation costs and time commitment, as they may have already commenced travel to your location. This fee will be automatically deducted and transferred to the affected service provider.
        {'\n\n'}
        VENDOR CANCELLATIONS: Service providers who cancel confirmed bookings within 4 hours of the scheduled appointment time will receive a notification and may face temporary or permanent restrictions from the platform. Repeated cancellations may result in account suspension or termination.
      </SectionCard>

      <SectionCard title="6. Platform Integrity and Off-Platform Transactions" icon="alert-circle-outline">
        PROHIBITED CONDUCT: Any attempt by service providers to use SharpLook for fraudulent activities, scams, or deceptive practices will result in immediate account termination and may be reported to relevant authorities.
        {'\n\n'}
        OFF-PLATFORM ARRANGEMENTS: Service providers are strictly prohibited from soliciting clients to conduct transactions outside the SharpLook platform. Similarly, clients should not agree to or initiate arrangements to meet or transact with service providers outside of SharpLook's booking system. Any services rendered or payments made outside our platform are not covered by SharpLook's policies, protections, or support. SharpLook shall not be liable for any disputes, damages, injuries, or losses arising from off-platform transactions. Violations of this policy may result in account suspension or permanent ban for both parties involved.
      </SectionCard>

      <SectionCard title="7. User Conduct" icon="shield-checkmark-outline">
        You agree not to: (a) use the App for any unlawful purpose; (b) harass, abuse, or harm other users or service providers; (c) provide false or misleading information; (d) interfere with the proper functioning of the App; (e) attempt to gain unauthorized access to any part of the App; (f) use the App to transmit viruses or malicious code.
      </SectionCard>

      <SectionCard title="8. Service Provider Terms" icon="briefcase-outline">
        Service providers on SharpLook are independent contractors and not employees of FranBoss Dammy Nigeria Limited. SharpLook does not guarantee the quality, safety, or legality of services offered. Service providers are responsible for complying with all applicable laws and regulations.
      </SectionCard>

      <SectionCard title="9. Intellectual Property" icon="bulb-outline">
        The App and its original content, features, and functionality are owned by FranBoss Dammy Nigeria Limited and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the App.
      </SectionCard>

      <SectionCard title="10. Limitation of Liability" icon="alert-circle-outline">
        To the maximum extent permitted by law, SharpLook and FranBoss Dammy Nigeria Limited shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App or services booked through the App. Our total liability shall not exceed the amount you paid through the App in the past 12 months.
      </SectionCard>

      <SectionCard title="11. Termination" icon="close-circle-outline">
        We may terminate or suspend your account and access to the App immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the App will cease immediately. You may also delete your account at any time through the App settings.
      </SectionCard>

      <SectionCard title="12. Governing Law" icon="globe-outline">
        These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of Nigeria.
      </SectionCard>

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
              <Ionicons name="mail" size={20} color="#eb278d" />
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
    </>
  );

  const renderPrivacyContent = () => (
    <>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroIconContainer}>
          <Ionicons name="shield-checkmark" size={32} color="#eb278d" />
        </View>
        <Text style={styles.heroTitle}>Privacy Policy</Text>
        <Text style={styles.heroSubtitle}>Last updated: July 24, 2025</Text>
      </View>

      <Text style={styles.introText}>
        Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
      </Text>

      <SectionCard title="About SharpLook" icon="information-circle-outline">
        Welcome to SharpLook, a mobile application developed by FranBoss Dammy Nigeria Limited. We seamlessly connect users with hairstylists, barbers, nail technicians, pedicurists and massage therapists based on their location. We are committed to protecting your privacy and ensuring the security of your personal data in compliance with the Nigeria Data Protection Act (2023).
      </SectionCard>

      <SectionCard title="Data Controller" icon="business-outline">
        FranBoss Dammy Nigeria Limited acts as the data controller in respect of all Personal Data collected through this Mobile Application. The company is responsible for determining the purposes and means of processing such data. Our primary servers are securely hosted in the United States, with all Personal Data processed under strict legal and contractual safeguards.
      </SectionCard>

      {/* Info Cards */}
      <View style={styles.infoCardsContainer}>
        <View style={styles.infoCard}>
          <View style={[styles.infoCardIcon, { backgroundColor: '#fce7f3' }]}>
            <Ionicons name="person" size={24} color="#eb278d" />
          </View>
          <Text style={styles.infoCardTitle}>Personal Info</Text>
          <Text style={styles.infoCardText}>Name, email, phone number for authentication</Text>
        </View>
        
        <View style={styles.infoCard}>
          <View style={[styles.infoCardIcon, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="card" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.infoCardTitle}>Payment Info</Text>
          <Text style={styles.infoCardText}>Processed securely via third-party providers</Text>
        </View>
        
        <View style={styles.infoCard}>
          <View style={[styles.infoCardIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="analytics" size={24} color="#22c55e" />
          </View>
          <Text style={styles.infoCardTitle}>Usage Data</Text>
          <Text style={styles.infoCardText}>Device info, access times, and statistics</Text>
        </View>
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

      {/* Contact Section */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Questions About Your Data?</Text>
        <Text style={styles.contactSubtitle}>Our team is here to help</Text>
        
        <View style={styles.contactButtons}>
          <Pressable onPress={handleWhatsAppPress} style={styles.contactButton}>
            <View style={[styles.contactIconBg, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <Text style={styles.contactButtonText}>WhatsApp</Text>
          </Pressable>
          
          <Pressable onPress={handleEmailPress} style={styles.contactButton}>
            <View style={[styles.contactIconBg, { backgroundColor: '#fce7f3' }]}>
              <Ionicons name="mail" size={20} color="#eb278d" />
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
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Legal</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'terms' && styles.activeTab]}
          onPress={() => setActiveTab('terms')}
        >
          <Ionicons 
            name="document-text-outline" 
            size={18} 
            color={activeTab === 'terms' ? '#eb278d' : '#6b7280'} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>
            Terms
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'privacy' && styles.activeTab]}
          onPress={() => setActiveTab('privacy')}
        >
          <Ionicons 
            name="shield-checkmark-outline" 
            size={18} 
            color={activeTab === 'privacy' ? '#eb278d' : '#6b7280'} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>
            Privacy
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'terms' ? renderTermsContent() : renderPrivacyContent()}
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 SharpLook by FranBoss Dammy Nigeria Limited</Text>
          <Text style={styles.footerSubtext}>All rights reserved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#fdf2f8',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#eb278d',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#fdf2f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  introText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fdf2f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  sectionContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  infoCardsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoCardText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  contactSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  contactIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#d1d5db',
  },
});