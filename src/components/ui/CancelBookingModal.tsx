import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PINK = '#E91E63';
const BG   = '#FFF5F8';
const { width: SW } = Dimensions.get('window');

const REASONS = [
  "I'm no longer available",
  "I've a personal commitment",
  'The price is too high',
  'Other reasons',
  "I'm busy",
];

const MAX_DETAILS = 200;

interface BookingSummary {
  vendorName: string;
  vendorAvatar?: string;
  serviceName: string;
  duration: number;
  scheduledDate: string;
  scheduledTime?: string;
  serviceType?: string;
  location?: { address: string; city: string; state: string };
  totalAmount: number;
  serviceImage?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
  booking?: BookingSummary;
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const fmt12h = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const durationLabel = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} Min`;
  return m > 0 ? `${h}.${Math.round((m / 60) * 10)} Hrs` : `${h} Hr${h > 1 ? 's' : ''}`;
};

const CancelBookingModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
  booking,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);

  const canConfirm = !!selectedReason && !loading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const fullReason = additionalDetails.trim()
      ? `${selectedReason}: ${additionalDetails.trim()}`
      : selectedReason;
    await onConfirm(fullReason);
    setSelectedReason('');
    setAdditionalDetails('');
    setRefundOpen(false);
  };

  const handleClose = () => {
    setSelectedReason('');
    setAdditionalDetails('');
    setRefundOpen(false);
    onClose();
  };

  const serviceTypeLabel =
    booking?.serviceType === 'home_service' ? 'Home Service' : 'In-Shop';

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <View style={{ flex: 1, backgroundColor: BG }}>

        {/* ── Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.8} style={s.backBtn} disabled={loading}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Cancel Booking</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Booking card ── */}
          {booking && (
            <View style={s.bookingCard}>
              {/* Chips */}
              <View style={s.chipRow}>
                <View style={s.chipSolid}>
                  <Text style={s.chipSolidTxt}>Current Booking</Text>
                </View>
                <View style={s.chipOutline}>
                  <Text style={s.chipOutlineTxt}>{serviceTypeLabel}</Text>
                </View>
              </View>

              {/* Vendor + details */}
              <View style={s.vendorRow}>
                {booking.vendorAvatar || booking.serviceImage ? (
                  <Image
                    source={{ uri: booking.vendorAvatar || booking.serviceImage }}
                    style={s.vendorAvatar}
                  />
                ) : (
                  <LinearGradient colors={['#E91E63', '#C2185B']} style={s.vendorAvatarGrad}>
                    <Text style={s.vendorAvatarLetter}>
                      {(booking.vendorName || 'V').charAt(0)}
                    </Text>
                  </LinearGradient>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.vendorName}>{booking.vendorName}</Text>
                    <View style={s.onlineDot} />
                  </View>
                  <Text style={s.serviceRow}>
                    {booking.serviceName} · {durationLabel(booking.duration)}
                  </Text>
                  <View style={s.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                    <Text style={s.metaTxt}>
                      {formatDate(booking.scheduledDate)}
                      {booking.scheduledTime ? ` · ${fmt12h(booking.scheduledTime)}` : ''}
                    </Text>
                  </View>
                  <View style={s.metaRow}>
                    <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                    <Text style={s.metaTxt}>
                      {serviceTypeLabel}{booking.location?.city ? ` · ${booking.location.city}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── Reason section ── */}
          <Text style={s.sectionTitle}>Why are you cancelling?</Text>
          <Text style={s.sectionSub}>(select a reason)</Text>

          <View style={s.reasonsCard}>
            {REASONS.map((reason, i) => {
              const selected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.75}
                  style={[
                    s.reasonRow,
                    i < REASONS.length - 1 && s.reasonRowBorder,
                  ]}
                >
                  <View style={[s.radio, selected && s.radioSel]}>
                    {selected && <View style={s.radioDot} />}
                  </View>
                  <Text style={[s.reasonTxt, selected && s.reasonTxtSel]}>{reason}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Additional details ── */}
          <View style={s.detailsCard}>
            <Text style={s.detailsLabel}>Additional details <Text style={s.detailsOptional}>(optional)</Text></Text>
            <TextInput
              style={s.detailsInput}
              value={additionalDetails}
              onChangeText={t => t.length <= MAX_DETAILS && setAdditionalDetails(t)}
              placeholder="Tell us more (optional)..."
              placeholderTextColor="#D1D5DB"
              multiline
              textAlignVertical="top"
              editable={!loading}
            />
            <Text style={s.charCount}>{additionalDetails.length}/{MAX_DETAILS}</Text>
          </View>

          {/* ── Refund information accordion ── */}
          <TouchableOpacity
            onPress={() => setRefundOpen(o => !o)}
            activeOpacity={0.8}
            style={s.refundHeader}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={18} color={PINK} />
              <Text style={s.refundHeaderTxt}>Refund Information</Text>
            </View>
            <Ionicons
              name={refundOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={PINK}
            />
          </TouchableOpacity>

          {refundOpen && (
            <View style={s.refundBody}>
              <View style={s.refundRow}>
                <View style={s.refundDot} />
                <Text style={s.refundTxt}>
                  <Text style={{ fontWeight: '700' }}>Full refund</Text> if cancelled more than 59 minutes before your appointment.
                </Text>
              </View>
              <View style={[s.refundRow, { marginTop: 10 }]}>
                <View style={[s.refundDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={s.refundTxt}>
                  <Text style={{ fontWeight: '700' }}>20% cancellation fee</Text> applies if cancelled within 59 minutes of the appointment.
                </Text>
              </View>
              {booking?.totalAmount && (
                <View style={s.refundAmountRow}>
                  <Text style={s.refundAmountLabel}>Booking Amount</Text>
                  <Text style={s.refundAmountVal}>₦{booking.totalAmount.toLocaleString()}</Text>
                </View>
              )}
            </View>
          )}

        </ScrollView>

        {/* ── Footer button ── */}
        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!canConfirm}
            activeOpacity={0.85}
            style={{ borderRadius: 16, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={canConfirm ? ['#EF4444', '#B91C1C'] : ['#D1D5DB', '#9CA3AF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.confirmBtn}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                    <Text style={s.confirmTxt}>Confirm Cancellation</Text>
                  </View>
              }
            </LinearGradient>
          </TouchableOpacity>

          {!selectedReason && (
            <Text style={s.footerHint}>Please select a reason above to continue</Text>
          )}
        </View>

      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: BG,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },

  // Booking card
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 20,
    marginTop: 6,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chipSolid: {
    backgroundColor: PINK,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipSolidTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  chipOutline: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: PINK,
  },
  chipOutlineTxt: { fontSize: 11, fontWeight: '700', color: PINK },

  vendorRow: { flexDirection: 'row', alignItems: 'flex-start' },
  vendorAvatar: { width: 52, height: 52, borderRadius: 26 },
  vendorAvatarGrad: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorAvatarLetter: { color: '#fff', fontSize: 20, fontWeight: '800' },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  vendorName: { fontSize: 14, fontWeight: '800', color: '#111827' },
  serviceRow: { fontSize: 12, color: '#6B7280', marginTop: 3, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  metaTxt: { fontSize: 12, color: '#6B7280' },

  // Reasons
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#9CA3AF', marginBottom: 14 },
  reasonsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    marginBottom: 16,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  reasonRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSel: { borderColor: PINK },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PINK },
  reasonTxt: { fontSize: 14, color: '#374151', flex: 1 },
  reasonTxtSel: { color: PINK, fontWeight: '600' },

  // Details textarea
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  detailsLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 10 },
  detailsOptional: { color: '#9CA3AF', fontWeight: '400' },
  detailsInput: {
    minHeight: 90,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 6 },

  // Refund accordion
  refundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF5F8',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCE4EC',
  },
  refundHeaderTxt: { fontSize: 14, fontWeight: '700', color: PINK },
  refundBody: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: -4,
  },
  refundRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  refundDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginTop: 5,
  },
  refundTxt: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  refundAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  refundAmountLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  refundAmountVal: { fontSize: 13, color: '#111827', fontWeight: '800' },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: '#FCE4EC',
  },
  confirmBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  confirmTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footerHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
});

export default CancelBookingModal;
