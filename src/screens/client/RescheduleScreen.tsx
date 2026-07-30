import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

type RescheduleNav = NativeStackNavigationProp<RootStackParamList, 'Reschedule'>;
type RescheduleRoute = RouteProp<RootStackParamList, 'Reschedule'>;

const PRIMARY = '#E04079';
const BLUE = '#2563EB';
const TEXT_DARK = '#1A1A2E';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Build a 2D array: weeks × 7 days (null = empty cell)
function buildCalendarWeeks(year: number, month: number): (number | null)[][] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const total = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = Array.from({ length: total }, (_, i) => {
    const d = i - firstDay + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const formatDateForDisplay = (date: Date) =>
  date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const formatDateISO = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ── Component ─────────────────────────────────────────────────────────────────

const RescheduleScreen: React.FC = () => {
  const { top, bottom } = useSafeAreaInsets();
  const navigation = useNavigation<RescheduleNav>();
  const route = useRoute<RescheduleRoute>();
  const { bookingId, scheduledDate, scheduledTime, vendorName, serviceName, serviceImage, serviceType, location } = route.params;

  // "today" at local midnight — used to block past + today from selection
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // "tomorrow" — earliest selectable date
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const submittingRef = React.useRef(false);

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
    // Block today and past — only tomorrow+ is valid
    if (d <= today) return;
    setSelectedDate(d);
  }, [calYear, calMonth, today]);

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    if (!selectedDate) {
      toast.error('Pick a date', 'Please select a new date for your booking');
      return;
    }
    if (selectedDate <= today) {
      toast.error('Invalid date', 'Please choose a date from tomorrow or later');
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      await bookingAPI.rescheduleBooking(bookingId, formatDateISO(selectedDate));
      toast.success('Rescheduled!', 'Your booking date has been updated');
      navigation.goBack();
    } catch (err) {
      const apiErr = handleAPIError(err);
      const msg = apiErr.message.toLowerCase().includes('future') || apiErr.message.toLowerCase().includes('tomorrow')
        ? 'Please choose a date from tomorrow or later'
        : apiErr.message.toLowerCase().includes('24 hour')
        ? 'This booking is confirmed — you can only reschedule more than 24 hours before the appointment'
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

  const existingDate = new Date(scheduledDate);
  const existingDateStr = existingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom + 100 }}>

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
                  {existingDateStr}{scheduledTime ? ` · ${scheduledTime}` : ''}
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
            {/* Month nav */}
            <View style={styles.calMonthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={TEXT_DARK} />
              </TouchableOpacity>
              <Text style={styles.calMonthLabel}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={TEXT_DARK} />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.calWeekRow}>
              {DAYS.map((d, i) => (
                <View key={i} style={styles.calCell}>
                  <Text style={styles.calDayHeader}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Separator */}
            <View style={styles.calDivider} />

            {/* Weeks grid */}
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.calWeekRow}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={styles.calCell} />;
                  const cellDate = new Date(calYear, calMonth, day);
                  const isDisabled = cellDate <= today;   // today and past = not selectable
                  const isSelected = selectedDate?.toDateString() === cellDate.toDateString();
                  const isToday = cellDate.toDateString() === today.toDateString();
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
                        isDisabled && styles.calCellDisabled,
                        isToday && !isSelected && styles.calCellToday,
                        isSelected && styles.calCellSelectedText,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <Text style={styles.calHint}>From tomorrow onwards · time remains unchanged</Text>
          </View>
        </View>

        {/* Summary */}
        {selectedDate && (
          <View style={styles.section}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconWrap}>
                <Ionicons name="calendar" size={20} color={BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>New date</Text>
                <Text style={styles.summaryValue}>{formatDateForDisplay(selectedDate)}</Text>
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
          disabled={!selectedDate || loading}
          style={[styles.confirmBtn, (!selectedDate || loading) && styles.confirmBtnDisabled]}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.confirmBtnText}>Confirm New Date</Text>
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

  // Calendar card
  calendarCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  calMonthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  calNavBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  calMonthLabel: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  // Each week row — 7 equal columns
  calWeekRow: { flexDirection: 'row', marginBottom: 2 },
  calDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 6, marginTop: 4 },
  // Each cell — flex: 1 so all 7 share width equally
  calCell: {
    flex: 1, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 100,
  },
  calCellSelected: { backgroundColor: PRIMARY },
  calDayHeader: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  calCellText: { fontSize: 14, fontWeight: '500', color: TEXT_DARK },
  calCellDisabled: { color: '#D1D5DB' },
  calCellToday: { color: PRIMARY, fontWeight: '700' },
  calCellSelectedText: { color: '#fff', fontWeight: '700' },
  calHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },

  // Summary
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  summaryIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE',
    alignItems: 'center', justifyContent: 'center',
  },
  summaryLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginTop: 2 },
  policyNote: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, textAlign: 'center' },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 8,
  },
  confirmBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#F9A8CA', opacity: 0.6 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
