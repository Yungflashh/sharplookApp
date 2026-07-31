import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Dimensions, StyleSheet, StatusBar } from 'react-native';
import { toast } from '@/components/ui/Toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { disputeAPI, handleAPIError } from '@/api/api';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateDispute'>;
type RouteP = RouteProp<RootStackParamList, 'CreateDispute'>;

// ─── Constants ────────────────────────────────────────────────────────────────
const { height: SCREEN_H } = Dimensions.get('window');
const PRIMARY   = '#E04079';
const TEXT      = '#1A1A2E';
const GRAY      = '#6B7280';
const MUTED     = '#9CA3AF';
const BORDER    = '#F0F0F0';
const WHITE     = '#FFFFFF';
const MAX_CHARS = 500;

const CLIENT_REASONS = [
  { key: 'service_not_completed', label: 'Service Not Completed' },
  { key: 'poor_quality',          label: 'Poor Quality of Service' },
  { key: 'wrong_service',         label: 'Wrong Service Delivered' },
  { key: 'no_show',               label: 'Vendor Did Not Show Up' },
  { key: 'overcharged',           label: 'Overcharged' },
  { key: 'other',                 label: 'Other' },
];

const VENDOR_REASONS = [
  { key: 'client_no_show',         label: 'Client Did Not Show Up' },
  { key: 'client_refused_payment', label: 'Client Refused to Pay' },
  { key: 'abusive_behavior',       label: 'Abusive / Inappropriate Behavior' },
  { key: 'late_cancellation',      label: 'Late Cancellation / No Notice' },
  { key: 'fraudulent_booking',     label: 'Fraudulent Booking' },
  { key: 'other',                  label: 'Other' },
];

const EVIDENCE_TYPES = [
  { key: 'receipt',           label: 'Receipt',           icon: 'receipt-outline' as const },
  { key: 'chat_conversation', label: 'Chat Conversation', icon: 'chatbubbles-outline' as const },
  { key: 'video_recording',   label: 'Video Recording',   icon: 'videocam-outline' as const },
  { key: 'other_document',    label: 'Other Document',    icon: 'document-outline' as const },
];

type Step = 1 | 2 | 4 | 5;

// ─── Row item ─────────────────────────────────────────────────────────────────
const ActionRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  onPress: () => void;
}> = ({ icon, label, badge, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.actionRow}>
    <View style={styles.actionRowLeft}>
      <View style={styles.actionRowIcon}>
        <Ionicons name={icon} size={20} color={PRIMARY} />
      </View>
      <Text style={styles.actionRowLabel}>{label}</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={MUTED} />
    </View>
  </TouchableOpacity>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const CreateDisputeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const {
    bookingId
  } = route.params;
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const handleSubmitDispute = async () => {
    if (!selectedCategory) {
      toast.error('Error', 'Please select a dispute category');
      return;
    }
    if (!selectedReason) {
      toast.error('Error', 'Please select a reason');
      return;
    }
    if (!description || description.trim().length < 20) {
      toast.error('Error', 'Please provide a detailed description (minimum 20 characters)');
      return;
    }
    try {
      setLoading(true);
      const response = await disputeAPI.createDispute({
        bookingId,
        category: selectedCategory,
        reason: selectedReason,
        description: description.trim()
      });
      if (response.success) {
        toast.success('Dispute Created', 'Your dispute has been submitted. Our team will review it shortly.');
        navigation.goBack();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Failed to create dispute');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared header ─────────────────────────────────────────────────────────
  const renderHeader = (showBack = true) => (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity onPress={goBack} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
      ) : <View style={styles.headerBtn} />}
      <View style={styles.dragHandle} />
      <TouchableOpacity onPress={dismiss} style={styles.headerBtn} activeOpacity={0.7}>
        <Ionicons name="close" size={20} color={TEXT} />
      </TouchableOpacity>
    </View>
  );

  const renderPinkBtn = (label: string, onPress: () => void, disabled = false) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.pinkBtn, (disabled || loading) && { opacity: 0.45 }]}
    >
      {loading ? (
        <ActivityIndicator color={WHITE} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.pinkBtnText}>{label}</Text>
          <Ionicons name="chevron-forward" size={18} color={WHITE} />
        </View>
      )}
    </TouchableOpacity>
  );

  // ─── STEP 1: Reason selection ─────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.sheet}>
      {renderHeader(false)}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Raise Dispute</Text>
          <Text style={styles.subtitle}>Select the reason for your dispute.</Text>

          <View style={{ gap: 0 }}>
            {REASONS.map((r, i) => (
              <TouchableOpacity
                key={r.key}
                onPress={() => setReason(r.key)}
                activeOpacity={0.7}
                style={[
                  styles.radioRow,
                  i < REASONS.length - 1 && styles.radioRowBorder,
                ]}
              >
                <View style={[styles.radioOuter, reason === r.key && styles.radioOuterActive]}>
                  {reason === r.key && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.radioLabel, reason === r.key && { color: PRIMARY, fontWeight: '600' }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {renderPinkBtn('Continue', () => setStep(2), !reason)}
      </View>
    </View>
  );

  // ─── STEP 2: Description + media ─────────────────────────────────────────
  const renderStep2 = () => (
    <View style={styles.sheet}>
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Describe the Issue</Text>
          <Text style={styles.subtitle}>Tell us what happened?</Text>

          <TextInput
            style={styles.textarea}
            placeholder="Describe what went wrong, in details..."
            placeholderTextColor={MUTED}
            value={description}
            onChangeText={t => setDescription(t.slice(0, MAX_CHARS))}
            multiline
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, description.length >= MAX_CHARS && { color: PRIMARY }]}>
            {description.length}/{MAX_CHARS}
          </Text>

          <View style={styles.divider} />

          <ActionRow
            icon="attach-outline"
            label="Add Evidence"
            badge={evidenceFile ? '1' : undefined}
            onPress={() => setStep(4)}
          />
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#C0392B" />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        ) : null}
        {renderPinkBtn('Submit Dispute', handleSubmit)}
      </View>
    </View>
  );

  // ─── STEP 4: Add Evidence ─────────────────────────────────────────────────
  const renderStep4 = () => (
    <View style={styles.sheet}>
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Add Evidence</Text>
          <Text style={styles.subtitle}>Select a type — your gallery will open to pick the file.</Text>

          <View style={{ gap: 0 }}>
            {EVIDENCE_TYPES.map((e, i) => {
              const isSelected = evidenceType === e.key;
              return (
                <React.Fragment key={e.key}>
                  <TouchableOpacity
                    onPress={async () => {
                      setEvidenceType(e.key);
                      await pickEvidenceFile(e.key);
                    }}
                    activeOpacity={0.75}
                    style={[styles.actionRow, isSelected && evidenceFile && { backgroundColor: '#FDE8EF' }]}
                  >
                    <View style={styles.actionRowLeft}>
                      <View style={[styles.actionRowIcon, isSelected && evidenceFile && { backgroundColor: '#F9B8CC' }]}>
                        <Ionicons name={e.icon} size={20} color={PRIMARY} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.actionRowLabel, isSelected && evidenceFile && { color: PRIMARY, fontWeight: '700' }]}>
                          {e.label}
                        </Text>
                        {isSelected && evidenceFile ? (
                          <Text style={{ fontSize: 11, color: PRIMARY, marginTop: 2 }} numberOfLines={1}>
                            {evidenceFile.fileName || 'File attached'}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    {isSelected && evidenceFile
                      ? <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
                      : <Ionicons name="chevron-forward" size={18} color={MUTED} />
                    }
                  </TouchableOpacity>
                  {i < EVIDENCE_TYPES.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {renderPinkBtn('Continue', () => setStep(2))}
      </View>
    </View>
  );

  // ─── STEP 5: Success ──────────────────────────────────────────────────────
  const renderStep5 = () => (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <View style={styles.dragHandle} />
        <TouchableOpacity onPress={dismiss} style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={TEXT} />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 32 }]}>
        <View style={styles.successCircle}>
          <View style={styles.successInnerCircle}>
            <Ionicons name="shield-checkmark" size={48} color={PRIMARY} />
          </View>
        </View>

        <Text style={[styles.title, { textAlign: 'center', marginTop: 28 }]}>Dispute Submitted</Text>

        {dispute?.disputeNumber ? (
          <Text style={styles.caseNumber}>Case: {dispute.disputeNumber}</Text>
        ) : null}

        <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 14, lineHeight: 22 }]}>
          Your payment has been temporarily placed on hold while we review the issue.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={() => {
            if (dispute?._id) {
              navigation.replace('DisputeDetail', { disputeId: dispute._id });
            } else {
              navigation.goBack();
            }
          }}
          activeOpacity={0.85}
          style={styles.pinkBtn}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.pinkBtnText}>View Details</Text>
            <Ionicons name="chevron-forward" size={18} color={WHITE} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Root ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.92,
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  dragHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },

  // Content
  content: { paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 8, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: GRAY, marginBottom: 24, lineHeight: 20 },

  // Textarea
  textarea: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    padding: 14, fontSize: 14, color: TEXT,
    minHeight: 140, textAlignVertical: 'top',
    backgroundColor: '#FAFAFA',
  },
  charCount: { fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 6, marginBottom: 16 },

  // Divider
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 2 },

  // Action row
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4, borderRadius: 10,
  },
  actionRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionRowIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FDE8EF', alignItems: 'center', justifyContent: 'center',
  },
  actionRowLabel: { fontSize: 15, fontWeight: '600', color: TEXT },

  // Badge
  badge: {
    backgroundColor: PRIMARY, borderRadius: 10,
    minWidth: 20, paddingHorizontal: 6, paddingVertical: 2,
    alignItems: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: WHITE },

  // Radio
  radioRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingVertical: 16,
  },
  radioRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: PRIMARY },
  radioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  radioLabel: { fontSize: 15, color: TEXT, flex: 1 },

  // Icon circle (step 3 & 4)
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#FDE8EF',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 20, marginTop: 8,
  },

  // Supported note
  supportedNote: { alignItems: 'center', marginTop: 24, gap: 4 },
  supportedText: { fontSize: 12, color: MUTED, fontWeight: '500' },

  // Success
  successCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#FDE8EF',
    alignItems: 'center', justifyContent: 'center',
  },
  successInnerCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#F9B8CC',
    alignItems: 'center', justifyContent: 'center',
  },
  caseNumber: {
    fontSize: 16, fontWeight: '700', color: PRIMARY,
    marginTop: 10, letterSpacing: 0.3,
  },

  // Footer / button
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF0F0', borderRadius: 10,
    borderWidth: 1, borderColor: '#FBBBB0',
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: '#C0392B', lineHeight: 18, fontWeight: '500' },
  pinkBtn: {
    borderRadius: 16, backgroundColor: PRIMARY,
    paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  pinkBtnText: { fontSize: 16, fontWeight: '700', color: WHITE },
});

export default CreateDisputeScreen;
