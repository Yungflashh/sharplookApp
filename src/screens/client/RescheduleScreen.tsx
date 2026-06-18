import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

type RescheduleNav   = NativeStackNavigationProp<RootStackParamList, 'Reschedule'>;
type RescheduleRoute = RouteProp<RootStackParamList, 'Reschedule'>;

const PRIMARY   = '#E04079';
const BLUE      = '#2563EB';
const TEXT_DARK = '#1A1A2E';

const DAYS   = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function buildCalendarWeeks(year: number, month: number): (number | null)[][] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDayOfMonth(year, month);
  const total       = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = Array.from({ length: total }, (_, i) => {
    const d = i - firstDay + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const fmt12h = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const fmt24h = (date: Date) =>
  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

const formatDateForDisplay = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const formatDateISO = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Parse stored HH:MM string into a Date object (today's date, just the time portion)
const parseStoredTime = (timeStr?: string): Date => {
  const base = new Date();
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      base.setHours(h, m, 0, 0);
      return base;
    }
  }
  base.setHours(9, 0, 0, 0);
  return base;
};

// ── Component ──────────────────────────────────────────────────────────────────

const RescheduleScreen: React.FC = () => {
  const { top, bottom } = useSafeAreaInsets();
  const navigation = useNavigation<RescheduleNav>();
  const route      = useRoute<RescheduleRoute>();
  const { bookingId, scheduledDate, scheduledTime, vendorName, serviceName, serviceImage, serviceType, location } = route.params;

  // today at midnight — past days blocked; today itself selectable
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calendar state
  const [calYear, setCalYear]       = useState(today.getFullYear());
  const [calMonth, setCalMonth]     = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Time picker state — pre-filled with existing time
  const [pickerTime, setPickerTime]     = useState<Date>(parseStoredTime(scheduledTime));
  const [timeConfirmed, setTimeConfirmed] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const submittingRef = React.useRef(false);

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const prevMonth = useCallback(() => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }, [calMonth]);

  const nextMonth = useCallback(() => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }, [calMonth]);

  const handleSelectDay = useCallback((day: number) => {
    const d = new Date(calYear, calMonth, day);
    if (d < today) return;
    setSelectedDate(d);
    // Reset time confirmation when today is picked so stale past times can't carry over
    const selMidnight = new Date(d); selMidnight.setHours(0, 0, 0, 0);
    if (selMidnight.getTime() === today.getTime()) {
      setTimeConfirmed(false);
      setPickerTime(parseStoredTime(scheduledTime));
    }
  }, [calYear, calMonth, today, scheduledTime]);

  // ── Time picker helpers ────────────────────────────────────────────────────
  const getMinimumPickerTime = (): Date | undefined => {
    if (!selectedDate) return undefined;
    const selMidnight = new Date(selectedDate); selMidnight.setHours(0, 0, 0, 0);
    if (selMidnight.getTime() !== today.getTime()) return undefined;
    const min = new Date();
    min.setMinutes(min.getMinutes() + 30, 0, 0);
    return min;
  };

  const onTimeChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) { setPickerTime(date); setTimeConfirmed(true); }
  };

  const confirmIOSTime = () => { setTimeConfirmed(true); setShowTimePicker(false); };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (submittingRef.current) return;
    if (!selectedDate) {
      toast.error('Pick a date', 'Please select a new date for your booking');
      return;
    }
    if (!timeConfirmed) {
      toast.error('Pick a time', 'Please select a new time for your booking');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      await bookingAPI.rescheduleBooking(bookingId, formatDateISO(selectedDate), fmt24h(pickerTime));
      toast.success('Rescheduled!', 'Your booking has been updated');
      navigation.goBack();
    } catch (err) {
      const apiErr = handleAPIError(err);
      const msg = apiErr.message.toLowerCase().includes('6 hours from now')
        ? 'The new appointment must be at least 6 hours from now'
        : apiErr.message.toLowerCase().includes('6 hours before')
        ? 'You can only reschedule more than 6 hours before the appointment'
        : apiErr.message.toLowerCase().includes('disputed')
        ? 'This booking has an active dispute and cannot be rescheduled'
        : apiErr.message || 'Something went wrong. Please try again.';
      toast.error('Could not reschedule', msg);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const weeks = buildCalendarWeeks(calYear, calMonth);
  const existingDate    = new Date(scheduledDate);
  const existingDateStr = existingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const canConfirm = !!selectedDate && timeConfirmed;

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom + 110 }}>

        {/* Current Booking Card */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Current Booking</Text>
          <View style={styles.bookingCard}>
            <View style={styles.homeTag}>
              <Ionicons name={serviceType === 'home' ? 'home-outline' : 'storefront-outline'} size={12} color={PRIMARY} />
              <Text style={styles.homeTagText}>{serviceType === 'home' ? 'Home Service' : 'Shop Visit'}</Text>
            </View>
            <View style={styles.bookingCardBody}>
              {serviceImage ? (
                <Image source={{ uri: serviceImage }} style={styles.vendorAvatar} />
              ) : (
                <View style={[styles.vendorAvatar, styles.vendorAvatarPlaceholder]}>
                  <Ionicons name="person" size={22} color={PRIMARY} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.vendorName}>{vendorName}</Text>
                  <Ionicons name="checkmark-circle" size={14} color={PRIMARY} />
                </View>
                <Text style={styles.serviceNameText}>{serviceName}</Text>
              </View>
            </View>
            <View style={styles.bookingCardMeta}>
              <View style={styles.bookingMetaRow}>
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text style={styles.bookingMetaText}>
                  {existingDateStr}{scheduledTime ? ` · ${fmt12h(parseStoredTime(scheduledTime))}` : ''}
                </Text>
              </View>
              {location && (
                <View style={styles.bookingMetaRow}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.bookingMetaText} numberOfLines={1}>
                    {location.address}, {location.city}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select a new date</Text>
          <View style={styles.calendarCard}>
            <View style={styles.calMonthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={TEXT_DARK} />
              </TouchableOpacity>
              <Text style={styles.calMonthLabel}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={TEXT_DARK} />
              </TouchableOpacity>
            </View>

            <View style={styles.calWeekRow}>
              {DAYS.map((d, i) => (
                <View key={i} style={styles.calCell}>
                  <Text style={styles.calDayHeader}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={styles.calDivider} />

            {weeks.map((week, wi) => (
              <View key={wi} style={styles.calWeekRow}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={styles.calCell} />;
                  const cellDate   = new Date(calYear, calMonth, day);
                  const isDisabled = cellDate < today;
                  const isSelected = selectedDate?.toDateString() === cellDate.toDateString();
                  const isToday    = cellDate.toDateString() === today.toDateString();
                  return (
                    <TouchableOpacity
                      key={di}
                      disabled={isDisabled}
                      onPress={() => handleSelectDay(day)}
                      style={[styles.calCell, isSelected && styles.calCellSelected]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.calCellText,
                        isDisabled  && styles.calCellDisabled,
                        isToday && !isSelected && styles.calCellToday,
                        isSelected  && styles.calCellSelectedText,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <Text style={styles.calHint}>Must be at least 6 hours from now</Text>
          </View>
        </View>

        {/* Time picker — only shown after a date is selected */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Select a new time</Text>
            <TouchableOpacity
              style={styles.timeCard}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.clockIconBox}>
                <Ionicons name="time-outline" size={26} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={timeConfirmed ? styles.timeSelected : styles.timePlaceholder}>
                  {timeConfirmed ? fmt12h(pickerTime) : 'Tap to select time'}
                </Text>
                {timeConfirmed && (
                  <Text style={styles.timeTapHint}>Tap to change</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Android: native clock dialog */}
            {showTimePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={pickerTime}
                mode="time"
                display="clock"
                onChange={onTimeChange}
                minimumDate={getMinimumPickerTime()}
              />
            )}

            {/* iOS: bottom-sheet spinner */}
            {Platform.OS === 'ios' && (
              <Modal visible={showTimePicker} transparent animationType="slide">
                <View style={styles.timeModalOverlay}>
                  <View style={styles.timeModalSheet}>
                    <View style={styles.timeModalHandle} />
                    <View style={styles.timeModalHeader}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)} activeOpacity={0.7}>
                        <Text style={styles.timeModalCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.timeModalTitle}>Select Time</Text>
                      <TouchableOpacity onPress={confirmIOSTime} activeOpacity={0.7}>
                        <Text style={styles.timeModalDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={pickerTime}
                      mode="time"
                      display="spinner"
                      onChange={onTimeChange}
                      minimumDate={getMinimumPickerTime()}
                      style={{ width: '100%' }}
                      textColor="#111827"
                    />
                  </View>
                </View>
              </Modal>
            )}
          </View>
        )}

        {/* Summary */}
        {selectedDate && timeConfirmed && (
          <View style={styles.section}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconWrap}>
                <Ionicons name="calendar" size={20} color={BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>New appointment</Text>
                <Text style={styles.summaryValue}>{formatDateForDisplay(selectedDate)}</Text>
                <Text style={styles.summaryTime}>{fmt12h(pickerTime)}</Text>
              </View>
            </View>
            <Text style={styles.policyNote}>
              Rescheduling is free — your payment stays secured in escrow.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { paddingBottom: bottom + 12 }]}>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!canConfirm || loading}
          style={[styles.confirmBtn, (!canConfirm || loading) && styles.confirmBtnDisabled]}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.confirmBtnText}>Confirm New Date & Time</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RescheduleScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  section: { marginHorizontal: 16, marginTop: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 10 },

  // Current booking card
  bookingCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  homeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEE2F0', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 12,
  },
  homeTagText: { fontSize: 11, fontWeight: '600', color: PRIMARY },
  bookingCardBody: { flexDirection: 'row', alignItems: 'center' },
  vendorAvatar: { width: 48, height: 48, borderRadius: 24 },
  vendorAvatarPlaceholder: { backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center' },
  vendorName: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  serviceNameText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  bookingCardMeta: { marginTop: 14, gap: 6 },
  bookingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookingMetaText: { fontSize: 13, color: '#6B7280', flex: 1 },

  // Calendar
  calendarCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  calMonthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  calMonthLabel: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  calWeekRow: { flexDirection: 'row', marginBottom: 2 },
  calDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 6, marginTop: 4 },
  calCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  calCellSelected: { backgroundColor: PRIMARY },
  calDayHeader: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  calCellText: { fontSize: 14, fontWeight: '500', color: TEXT_DARK },
  calCellDisabled: { color: '#D1D5DB' },
  calCellToday: { color: PRIMARY, fontWeight: '700' },
  calCellSelectedText: { color: '#fff', fontWeight: '700' },
  calHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },

  // Time picker card
  timeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  clockIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#FCE4EC', alignItems: 'center', justifyContent: 'center',
  },
  timeSelected: { fontSize: 20, fontWeight: '800', color: '#111827' },
  timePlaceholder: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  timeTapHint: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // iOS time modal
  timeModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  timeModalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  timeModalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  timeModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  timeModalCancel: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  timeModalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  timeModalDone: { fontSize: 15, color: PRIMARY, fontWeight: '700' },

  // Summary
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  summaryIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginTop: 2 },
  summaryTime:  { fontSize: 13, fontWeight: '600', color: PRIMARY, marginTop: 2 },
  policyNote: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, textAlign: 'center' },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 8,
  },
  confirmBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { backgroundColor: '#F9A8CA', opacity: 0.6 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
