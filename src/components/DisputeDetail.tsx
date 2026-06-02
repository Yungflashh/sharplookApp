import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, RefreshControl,
  StyleSheet, StatusBar, Dimensions, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { disputeAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

// ─── Types ───────────────────────────────────────────────────────────────────
type Nav   = NativeStackNavigationProp<RootStackParamList, 'DisputeDetail'>;
type RouteP = RouteProp<RootStackParamList, 'DisputeDetail'>;

interface DisputeDetail {
  _id: string;
  disputeNumber?: string;
  booking: {
    _id: string;
    bookingNumber?: string;
    service: { name: string };
    scheduledDate: string;
    totalAmount: number;
    status: string;
  };
  raisedBy:  { _id: string; firstName: string; lastName: string; avatar?: string };
  against:   { _id: string; firstName: string; lastName: string; avatar?: string };
  reason: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  evidence: Array<{
    type: string; content: string; uploadedAt: string;
    uploadedBy: { _id: string; firstName: string; lastName: string };
  }>;
  messages: Array<{
    _id?: string;
    sender: { _id: string; firstName: string; lastName: string; avatar?: string };
    message: string;
    attachments?: string[];
    sentAt: string;
  }>;
  createdAt: string;
  reviewedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolution?: string;
  resolutionDetails?: string;
  refundAmount?: number;
  vendorPaymentAmount?: number;
  assignedTo?: { firstName: string; lastName: string };
}

// ─── Constants ───────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const PRIMARY  = '#E04079';
const BG       = '#FFF5F8';
const WHITE    = '#FFFFFF';
const TEXT     = '#1A1A2E';
const GRAY     = '#6B7280';
const MUTED    = '#9CA3AF';
const BORDER   = '#F0F0F0';

const REASON_LABELS: Record<string, string> = {
  service_not_completed:  'Service Not Completed',
  poor_quality:           'Poor Quality of Service',
  wrong_service:          'Wrong Service Delivered',
  no_show:                'Vendor Did Not Show Up',
  overcharged:            'Overcharged',
  client_no_show:         'Client Did Not Show Up',
  client_refused_payment: 'Client Refused to Pay',
  abusive_behavior:       'Abusive / Inappropriate Behavior',
  late_cancellation:      'Late Cancellation / No Notice',
  fraudulent_booking:     'Fraudulent Booking',
  other:                  'Other',
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  open:      { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', label: 'Open'       },
  in_review: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'In Review'  },
  resolved:  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Resolved'   },
  closed:    { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB', label: 'Closed'     },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  urgent: { bg: '#FEF2F2', text: '#DC2626' },
  high:   { bg: '#FFF7ED', text: '#EA580C' },
  medium: { bg: '#FEFCE8', text: '#CA8A04' },
  low:    { bg: '#F0FDF4', text: '#16A34A' },
};

const RESOLUTION_LABELS: Record<string, string> = {
  refund_client:   'Full refund issued to client',
  pay_vendor:      'Full payment released to vendor',
  partial_refund:  'Partial refund issued',
  no_action:       'No action required',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtTime = (d: string) =>
  new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const fmtMoney = (n: number) => `₦${n.toLocaleString()}`;

const initials = (first: string, last: string) =>
  `${(first || '?').charAt(0)}${(last || '').charAt(0)}`.toUpperCase();

// ─── Sub-components ──────────────────────────────────────────────────────────
const SectionCard: React.FC<{ title?: string; children: React.ReactNode; style?: object }> = ({ title, children, style }) => (
  <View style={[styles.card, style]}>
    {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
    {children}
  </View>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const Avatar: React.FC<{ first: string; last: string; size?: number; bg?: string; fg?: string }> = ({
  first, last, size = 40, bg = '#FDE8EF', fg = PRIMARY,
}) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.35, color: fg }]}>{initials(first, last)}</Text>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
const DisputeDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<RouteP>();
  const { disputeId } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [dispute, setDispute]           = useState<DisputeDetail | null>(null);
  const [newMessage, setNewMessage]     = useState('');
  const [sendingMsg, setSendingMsg]     = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchDispute = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await disputeAPI.getDisputeById(disputeId);
      if (res.success) setDispute(res.data?.dispute ?? res.data);
    } catch (err) {
      toast.error('Error', handleAPIError(err).message || 'Failed to load dispute');
      if (!silent) navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useFocusEffect(useCallback(() => { fetchDispute(); }, [fetchDispute]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDispute(true);
    setRefreshing(false);
  }, [fetchDispute]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      setSendingMsg(true);
      const res = await disputeAPI.addMessage(disputeId, newMessage.trim());
      if (res.success) {
        setNewMessage('');
        await fetchDispute(true);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
      }
    } catch (err) {
      toast.error('Error', handleAPIError(err).message || 'Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={{ color: MUTED, fontSize: 14 }}>Loading dispute…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dispute) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>Dispute not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg   = STATUS_CONFIG[dispute.status?.toLowerCase()] ?? STATUS_CONFIG.closed;
  const priorityCfg = PRIORITY_CONFIG[dispute.priority?.toLowerCase()] ?? PRIORITY_CONFIG.low;
  const isActive    = ['open', 'in_review'].includes(dispute.status?.toLowerCase());
  const isResolved  = dispute.status?.toLowerCase() === 'resolved';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Details</Text>
        <View style={styles.headerBack} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: BG }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />}
        >

          {/* ── Status Hero ─────────────────────────────────────────────── */}
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              {dispute.disputeNumber ? (
                <Text style={styles.caseNumber}>CASE #{dispute.disputeNumber}</Text>
              ) : (
                <Text style={styles.caseNumber}>DISPUTE</Text>
              )}
              <View style={[styles.priorityBadge, { backgroundColor: priorityCfg.bg }]}>
                <Text style={[styles.priorityText, { color: priorityCfg.text }]}>
                  {(dispute.priority || 'low').charAt(0).toUpperCase() + (dispute.priority || 'low').slice(1)} Priority
                </Text>
              </View>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
              <View style={[styles.statusDot, { backgroundColor: statusCfg.text }]} />
              <Text style={[styles.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
            </View>

            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="calendar-outline" size={13} color={MUTED} />
                <Text style={styles.heroMetaText}>Filed {fmtDate(dispute.createdAt)}</Text>
              </View>
              {dispute.assignedTo && (
                <View style={styles.heroMetaItem}>
                  <Ionicons name="person-outline" size={13} color={MUTED} />
                  <Text style={styles.heroMetaText}>
                    {dispute.assignedTo.firstName} {dispute.assignedTo.lastName}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Resolution Banner ───────────────────────────────────────── */}
          {isResolved && dispute.resolution && (
            <View style={styles.resolutionCard}>
              <View style={styles.resolutionHeader}>
                <View style={styles.resolutionIcon}>
                  <Ionicons name="shield-checkmark" size={22} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resolutionTitle}>Dispute Resolved</Text>
                  <Text style={styles.resolutionOutcome}>
                    {RESOLUTION_LABELS[dispute.resolution] ?? dispute.resolution}
                  </Text>
                </View>
              </View>
              {dispute.resolutionDetails ? (
                <Text style={styles.resolutionDetails}>{dispute.resolutionDetails}</Text>
              ) : null}
              {dispute.resolution === 'partial_refund' && (
                <View style={styles.resolutionAmounts}>
                  {dispute.refundAmount ? (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Client Refund</Text>
                      <Text style={styles.amountValue}>{fmtMoney(dispute.refundAmount)}</Text>
                    </View>
                  ) : null}
                  {dispute.vendorPaymentAmount ? (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Vendor Payment</Text>
                      <Text style={styles.amountValue}>{fmtMoney(dispute.vendorPaymentAmount)}</Text>
                    </View>
                  ) : null}
                </View>
              )}
              {dispute.resolvedAt ? (
                <Text style={styles.resolutionDate}>Resolved {fmtDate(dispute.resolvedAt)}</Text>
              ) : null}
            </View>
          )}

          {/* ── Booking Card ────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => dispute.booking?._id && navigation.navigate('BookingDetail', { bookingId: dispute.booking._id })}
          >
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Related Booking</Text>
              <Ionicons name="chevron-forward" size={18} color={MUTED} />
            </View>
            <Text style={styles.bookingService}>{dispute.booking.service.name}</Text>
            <View style={styles.bookingMeta}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="calendar-outline" size={14} color={GRAY} />
                <Text style={styles.bookingMetaText}>{fmtDate(dispute.booking.scheduledDate)}</Text>
              </View>
              <View style={styles.heroMetaItem}>
                <Ionicons name="cash-outline" size={14} color={GRAY} />
                <Text style={styles.bookingMetaText}>{fmtMoney(dispute.booking.totalAmount)}</Text>
              </View>
            </View>
            {dispute.booking.bookingNumber ? (
              <Text style={styles.bookingRef}>#{dispute.booking.bookingNumber}</Text>
            ) : null}
          </TouchableOpacity>

          {/* ── Dispute Info ─────────────────────────────────────────────── */}
          <SectionCard title="Dispute Information">
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Reason</Text>
              <View style={styles.reasonChip}>
                <Text style={styles.reasonChipText}>
                  {REASON_LABELS[dispute.reason] ?? dispute.reason}
                </Text>
              </View>
            </View>
            <View style={[styles.infoBlock, { marginTop: 14 }]}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.descriptionText}>{dispute.description}</Text>
            </View>
            <View style={[styles.divider, { marginVertical: 14 }]} />
            <InfoRow label="Category" value={dispute.category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} />
            <InfoRow label="Filed" value={fmtDate(dispute.createdAt)} />
          </SectionCard>

          {/* ── Parties ──────────────────────────────────────────────────── */}
          <SectionCard title="Parties Involved">
            <View style={styles.partyRow}>
              <Avatar first={dispute.raisedBy.firstName} last={dispute.raisedBy.lastName} />
              <View style={{ flex: 1 }}>
                <Text style={styles.partyRole}>Raised By</Text>
                <Text style={styles.partyName}>{dispute.raisedBy.firstName} {dispute.raisedBy.lastName}</Text>
              </View>
              <View style={[styles.roleChip, { backgroundColor: '#FDE8EF' }]}>
                <Text style={[styles.roleChipText, { color: PRIMARY }]}>Claimant</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.partyRow}>
              <Avatar first={dispute.against.firstName} last={dispute.against.lastName} bg="#F3F4F6" fg={GRAY} />
              <View style={{ flex: 1 }}>
                <Text style={styles.partyRole}>Against</Text>
                <Text style={styles.partyName}>{dispute.against.firstName} {dispute.against.lastName}</Text>
              </View>
              <View style={[styles.roleChip, { backgroundColor: '#F3F4F6' }]}>
                <Text style={[styles.roleChipText, { color: GRAY }]}>Respondent</Text>
              </View>
            </View>
          </SectionCard>

          {/* ── Evidence ─────────────────────────────────────────────────── */}
          {dispute.evidence?.length > 0 && (
            <SectionCard title={`Evidence (${dispute.evidence.length})`}>
              {dispute.evidence.map((item, i) => (
                <View key={i} style={[styles.evidenceItem, i > 0 && styles.evidenceItemBorder]}>
                  <View style={styles.evidenceIcon}>
                    <Ionicons
                      name={item.type === 'image' ? 'image-outline' : item.type === 'document' ? 'document-outline' : 'text-outline'}
                      size={18} color={PRIMARY}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={styles.evidenceType}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Text>
                      <Text style={styles.evidenceTime}>{fmtTime(item.uploadedAt)}</Text>
                    </View>

                    {item.type === 'image' ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => Linking.openURL(item.content)}
                      >
                        <Image
                          source={{ uri: item.content }}
                          style={styles.evidenceImage}
                          resizeMode="cover"
                        />
                        <View style={styles.evidenceImageHint}>
                          <Ionicons name="expand-outline" size={12} color={PRIMARY} />
                          <Text style={styles.evidenceImageHintText}>Tap to view full size</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.evidenceContent}>{item.content}</Text>
                    )}

                    <Text style={styles.evidenceBy}>
                      By {item.uploadedBy.firstName} {item.uploadedBy.lastName}
                    </Text>
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* ── Timeline ─────────────────────────────────────────────────── */}
          <SectionCard title="Timeline">
            <TimelineItem icon="radio-button-on" color="#F59E0B" label="Dispute Filed" date={fmtDate(dispute.createdAt)} last={!dispute.reviewedAt && !dispute.resolvedAt && !dispute.closedAt} />
            {dispute.reviewedAt && (
              <TimelineItem icon="eye" color="#3B82F6" label="Under Review" date={fmtDate(dispute.reviewedAt)} last={!dispute.resolvedAt && !dispute.closedAt} />
            )}
            {dispute.resolvedAt && (
              <TimelineItem icon="checkmark-circle" color="#16A34A" label="Resolved" date={fmtDate(dispute.resolvedAt)} last={!dispute.closedAt} />
            )}
            {dispute.closedAt && (
              <TimelineItem icon="lock-closed" color={GRAY} label="Closed" date={fmtDate(dispute.closedAt)} last />
            )}
          </SectionCard>

          {/* ── Messages ─────────────────────────────────────────────────── */}
          <SectionCard title={`Messages (${dispute.messages?.length ?? 0})`} style={{ marginBottom: 0 }}>
            {dispute.messages?.length > 0 ? (
              dispute.messages.map((msg, i) => (
                <View key={msg._id ?? i} style={[styles.messageItem, i > 0 && styles.messageItemBorder]}>
                  <View style={styles.messageHeader}>
                    <Avatar first={msg.sender.firstName} last={msg.sender.lastName} size={34} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.messageSender}>{msg.sender.firstName} {msg.sender.lastName}</Text>
                      <Text style={styles.messageTime}>{fmtTime(msg.sentAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.messageText}>{msg.message}</Text>
                  {msg.attachments?.length ? (
                    <View style={styles.attachmentNote}>
                      <Ionicons name="attach" size={13} color={MUTED} />
                      <Text style={styles.attachmentText}>{msg.attachments.length} attachment{msg.attachments.length > 1 ? 's' : ''}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={styles.emptyMessages}>
                <Ionicons name="chatbubbles-outline" size={32} color={MUTED} />
                <Text style={styles.emptyMessagesText}>No messages yet</Text>
                {isActive && <Text style={styles.emptyMessagesSub}>Use the field below to send a message to our team.</Text>}
              </View>
            )}
          </SectionCard>

        </ScrollView>

        {/* ── Message Input ─────────────────────────────────────────────── */}
        {isActive && (
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={styles.messageInput}
              placeholder="Send a message to our team…"
              placeholderTextColor={MUTED}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={sendingMsg || !newMessage.trim()}
              activeOpacity={0.8}
              style={[styles.sendBtn, (!newMessage.trim() || sendingMsg) && styles.sendBtnDisabled]}
            >
              {sendingMsg
                ? <ActivityIndicator size="small" color={WHITE} />
                : <Ionicons name="send" size={18} color={WHITE} />
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Timeline Item ────────────────────────────────────────────────────────────
const TimelineItem: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  date: string;
  last?: boolean;
}> = ({ icon, color, label, date, last }) => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineLeft}>
      <View style={[styles.timelineDot, { backgroundColor: color + '22', borderColor: color }]}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      {!last && <View style={styles.timelineLine} />}
    </View>
    <View style={styles.timelineContent}>
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineDate}>{date}</Text>
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerBack: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT },

  // Hero card
  heroCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 18,
    marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  caseNumber: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1 },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 14,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaText: { fontSize: 12, color: MUTED },

  // Resolution card
  resolutionCard: {
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 12,
  },
  resolutionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  resolutionIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center',
  },
  resolutionTitle: { fontSize: 15, fontWeight: '800', color: '#14532D', marginBottom: 2 },
  resolutionOutcome: { fontSize: 13, color: '#15803D', fontWeight: '500' },
  resolutionDetails: { fontSize: 13, color: '#166534', lineHeight: 20, marginBottom: 8 },
  resolutionAmounts: { borderTopWidth: 1, borderTopColor: '#BBF7D0', paddingTop: 10, gap: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amountLabel: { fontSize: 13, color: '#15803D' },
  amountValue: { fontSize: 13, fontWeight: '700', color: '#14532D' },
  resolutionDate: { fontSize: 11, color: '#16A34A', marginTop: 8 },

  // Generic card
  card: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },

  // Booking card
  bookingService: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 8 },
  bookingMeta: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  bookingMetaText: { fontSize: 13, color: GRAY },
  bookingRef: { fontSize: 11, color: MUTED, marginTop: 4 },

  // Info rows
  infoBlock: {},
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: TEXT },
  descriptionText: { fontSize: 14, color: GRAY, lineHeight: 22 },
  reasonChip: {
    alignSelf: 'flex-start', backgroundColor: '#FDE8EF',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  reasonChipText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },

  // Parties
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  partyRole: { fontSize: 11, color: MUTED, marginBottom: 2 },
  partyName: { fontSize: 14, fontWeight: '700', color: TEXT },
  roleChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  roleChipText: { fontSize: 11, fontWeight: '700' },

  // Avatar
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800' },

  // Evidence
  evidenceItem: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  evidenceItemBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  evidenceIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FDE8EF', alignItems: 'center', justifyContent: 'center',
  },
  evidenceType: { fontSize: 13, fontWeight: '700', color: TEXT },
  evidenceTime: { fontSize: 11, color: MUTED },
  evidenceContent: { fontSize: 13, color: GRAY, lineHeight: 18, marginBottom: 4 },
  evidenceBy: { fontSize: 11, color: MUTED, marginTop: 6 },
  evidenceImage: {
    width: '100%', height: 180, borderRadius: 10,
    backgroundColor: '#F0F0F0', marginBottom: 4,
  },
  evidenceImageHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  evidenceImageHintText: { fontSize: 11, color: PRIMARY },

  // Timeline
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 32 },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { width: 1.5, flex: 1, backgroundColor: BORDER, marginVertical: 3, minHeight: 16 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineLabel: { fontSize: 14, fontWeight: '700', color: TEXT },
  timelineDate: { fontSize: 12, color: MUTED, marginTop: 2 },

  // Messages
  messageItem: { paddingVertical: 12 },
  messageItemBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  messageSender: { fontSize: 13, fontWeight: '700', color: TEXT },
  messageTime: { fontSize: 11, color: MUTED, marginTop: 1 },
  messageText: { fontSize: 14, color: GRAY, lineHeight: 21 },
  attachmentNote: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  attachmentText: { fontSize: 12, color: MUTED },
  emptyMessages: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyMessagesText: { fontSize: 14, fontWeight: '600', color: GRAY },
  emptyMessagesSub: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER,
    paddingHorizontal: 16, paddingTop: 10,
  },
  messageInput: {
    flex: 1, backgroundColor: '#F9F9F9', borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: TEXT, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E5E7EB' },
});

export default DisputeDetailScreen;
