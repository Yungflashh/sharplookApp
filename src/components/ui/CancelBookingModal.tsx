import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ActivityIndicator, ScrollView, Image, Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PRIMARY  = '#E04079';
const BG       = '#FCE4EC';
const WHITE    = '#FFFFFF';
const TEXT     = '#1A1A2E';
const GRAY     = '#6B7280';
const MUTED    = '#9CA3AF';

const REASONS = [
  "I'm no longer available",
  "I've a personal commitment",
  "The price is too high",
  "Other reasons",
  "I'm busy",
];

export interface CancelBookingInfo {
  vendorName: string;
  serviceName: string;
  duration?: number;
  scheduledDate: string;
  scheduledTime?: string;
  serviceType?: 'home_service' | 'in_shop' | string;
  location?: { city?: string; state?: string };
  totalAmount: number;
  serviceImage?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
  booking?: CancelBookingInfo;
}

const format12Hour = (time?: string): string => {
  if (!time) return '';
  if (/AM|PM/i.test(time)) return time;
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  let h = parseInt(m[1]);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m[2]} ${period}`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

const CancelBookingModal: React.FC<Props> = ({
  visible, onClose, onConfirm, loading = false, booking,
}) => {
  const insets = useSafeAreaInsets();
  const [selected, setSelected]     = useState<string | null>(null);
  const [additional, setAdditional] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    const full = additional.trim()
      ? `${selected}. ${additional.trim()}`
      : selected;
    await onConfirm(full);
    setSelected(null);
    setAdditional('');
  };

  const durationLabel = booking?.duration
    ? booking.duration >= 60
      ? `${booking.duration / 60} hrs`
      : `${booking.duration} min`
    : null;

  const locationLabel = booking?.serviceType === 'home_service'
    ? `Home Service${booking.location?.city ? ` · ${booking.location.city}` : ''}`
    : booking?.serviceType === 'in_shop'
      ? `In-Shop${booking.location?.city ? ` · ${booking.location.city}` : ''}`
      : booking?.location?.city || null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <View style={{ flex: 1, backgroundColor: BG }}>
        {/* ── Header ── */}
        <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 14,
          flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.75}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
            <Ionicons name="arrow-back" size={19} color={TEXT} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 }}>
            Cancel Booking
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}>

          {/* ── Booking summary card ── */}
          {booking && (
            <View style={{ backgroundColor: WHITE, borderRadius: 18, padding: 14, marginBottom: 22,
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
              {/* Label row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: PRIMARY }}>Current Booking</Text>
                {booking.serviceType && (
                  <View style={{ borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 20,
                    paddingHorizontal: 12, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY }}>
                      {booking.serviceType === 'home_service' ? 'Home Service' : 'In-Shop'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Service info row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 68, height: 68, borderRadius: 12, overflow: 'hidden', backgroundColor: BG }}>
                  {booking.serviceImage
                    ? <Image source={{ uri: booking.serviceImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    : <LinearGradient colors={[PRIMARY, '#FF6BA8']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="sparkles" size={26} color={WHITE} />
                      </LinearGradient>
                  }
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>{booking.vendorName}</Text>
                    <Ionicons name="checkmark-circle" size={15} color={PRIMARY} />
                  </View>
                  <Text style={{ fontSize: 13, color: GRAY, fontWeight: '500' }}>
                    {booking.serviceName}{durationLabel ? ` · ${durationLabel}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Ionicons name="calendar-outline" size={13} color={PRIMARY} />
                    <Text style={{ fontSize: 12, color: GRAY }}>
                      {formatDate(booking.scheduledDate)}
                      {booking.scheduledTime ? ` · ${format12Hour(booking.scheduledTime)}` : ''}
                    </Text>
                  </View>
                  {locationLabel && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="location-outline" size={13} color={PRIMARY} />
                      <Text style={{ fontSize: 12, color: GRAY }}>{locationLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* ── Reason heading ── */}
          <Text style={{ fontSize: 19, fontWeight: '800', color: TEXT, marginBottom: 2 }}>
            Why are you cancelling?
          </Text>
          <Text style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>(select a reason)</Text>

          {/* ── Radio options ── */}
          <View style={{ backgroundColor: WHITE, borderRadius: 18, overflow: 'hidden', marginBottom: 16,
            shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}>
            {REASONS.map((r, i) => (
              <TouchableOpacity key={r} onPress={() => setSelected(r)} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingHorizontal: 18, paddingVertical: 16,
                  borderBottomWidth: i < REASONS.length - 1 ? 1 : 0,
                  borderBottomColor: '#F3F4F6' }}>
                {/* Radio circle */}
                <View style={{ width: 22, height: 22, borderRadius: 11,
                  borderWidth: 2, borderColor: selected === r ? PRIMARY : '#D1D5DB',
                  alignItems: 'center', justifyContent: 'center' }}>
                  {selected === r && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY }} />
                  )}
                </View>
                <Text style={{ fontSize: 14, color: TEXT, fontWeight: selected === r ? '600' : '400' }}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Additional text input ── */}
          <View style={{ backgroundColor: WHITE, borderRadius: 16, padding: 14, marginBottom: 10,
            shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}>
            <TextInput
              value={additional}
              onChangeText={t => setAdditional(t.slice(0, 200))}
              placeholder="Additional data (optional)"
              placeholderTextColor={MUTED}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ fontSize: 14, color: TEXT, minHeight: 70 }}
            />
            <Text style={{ fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 6 }}>
              {additional.length}/200
            </Text>
          </View>
        </ScrollView>

        {/* ── Refund info + confirm button ── */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          {/* Refund expandable */}
          <TouchableOpacity onPress={() => setRefundOpen(p => !p)} activeOpacity={0.85}>
            <LinearGradient colors={['#C01070', PRIMARY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingHorizontal: 20, paddingVertical: 14,
                flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={18} color={WHITE} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: WHITE }}>Refund information</Text>
              <Ionicons name={refundOpen ? 'chevron-down' : 'chevron-up'} size={18} color={WHITE} />
            </LinearGradient>
          </TouchableOpacity>

          {refundOpen && (
            <View style={{ backgroundColor: '#FFF0F6', paddingHorizontal: 20, paddingVertical: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={15} color="#16A34A" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 13, color: '#166534', lineHeight: 18 }}>
                  Full refund if cancelled more than 1 hour before the appointment.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Ionicons name="alert-circle" size={15} color="#DC2626" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 13, color: '#991B1B', lineHeight: 18 }}>
                  20% penalty applies if cancelled within 1 hour of the appointment.
                </Text>
              </View>
              {booking && (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Ionicons name="wallet-outline" size={15} color={PRIMARY} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 }}>
                    Booking amount: ₦{booking.totalAmount.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Confirm button */}
          <View style={{ backgroundColor: WHITE, paddingHorizontal: 16,
            paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 4,
            borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
            <TouchableOpacity onPress={handleConfirm} disabled={!selected || loading} activeOpacity={0.85}
              style={{ backgroundColor: !selected ? '#F3F4F6' : PRIMARY,
                borderRadius: 14, paddingVertical: 15,
                alignItems: 'center', justifyContent: 'center' }}>
              {loading
                ? <ActivityIndicator color={WHITE} />
                : <Text style={{ fontSize: 15, fontWeight: '700',
                    color: !selected ? MUTED : WHITE }}>
                    Confirm Cancellation
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CancelBookingModal;
