import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, StyleSheet, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError, sharpPayAPI } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import WalletFundingModal from '@/components/WalletFundingModal';

const { width: W } = Dimensions.get('window');
const CELL_W = Math.floor((W - 64) / 7); // page padding 16x2 + card padding 16x2

const PINK = '#E04079';
const BG = '#FFF5F9';
const WHITE = '#fff';
const TEXT = '#111827';
const MUTED = '#6B7280';
const BORDER = '#F0E4EA';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateBooking'>;
type RouteP = RouteProp<RootStackParamList, 'CreateBooking'>;

const STEP_LABELS = ['Date & Time', 'Location', 'Confirm', 'Payment'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HDRS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 20 && m > 0) break;
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    TIME_SLOTS.push(`${hour}:${m.toString().padStart(2, '0')} ${ampm}`);
  }
}

const formatDateFull = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

const formatDateShort = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

const formatDuration = (mins?: number): string => {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} Min`;
  return m ? `${h} Hr ${m} Min` : `${h} Hour${h !== 1 ? 's' : ''}`;
};

// ── Progress Bar ──────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ step: number }> = ({ step }) => {
  const pct = (step - 1) / 3;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {/* Track lines */}
      <View style={styles.trackGray} />
      <View style={[styles.trackPink, { width: `${pct * 75}%` }]} />
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <View key={label} style={{ flex: 1, alignItems: 'center', zIndex: 1 }}>
            <View style={[styles.dot, (done || active) && styles.dotActive]}>
              {done
                ? <Ionicons name="checkmark" size={9} color={WHITE} />
                : <View style={[styles.dotInner, active && styles.dotInnerActive]} />
              }
            </View>
            <Text style={[styles.dotLabel, (done || active) && styles.dotLabelActive]} numberOfLines={2}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ── Calendar Picker ───────────────────────────────────────────────────────────
const CalendarPicker: React.FC<{
  selectedDate: Date | null;
  calMonth: Date;
  onSelect: (d: Date) => void;
  onMonthChange: (d: Date) => void;
}> = ({ selectedDate, calMonth, onSelect, onMonthChange }) => {
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const nowMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View style={styles.calNav}>
        <TouchableOpacity
          onPress={() => !nowMonth && onMonthChange(new Date(year, month - 1, 1))}
          style={[styles.calNavBtn, nowMonth && { opacity: 0.3 }]}
          activeOpacity={nowMonth ? 1 : 0.75}
        >
          <Ionicons name="chevron-back" size={18} color={PINK} />
        </TouchableOpacity>
        <Text style={styles.calTitle}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity
          onPress={() => onMonthChange(new Date(year, month + 1, 1))}
          style={styles.calNavBtn}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-forward" size={18} color={PINK} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {DAY_HDRS.map(d => (
          <Text key={d} style={styles.calDayHdr}>{d}</Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={styles.calCell} />;
          const dt = new Date(year, month, day); dt.setHours(0, 0, 0, 0);
          const past = dt < today;
          const sel =
            selectedDate?.getFullYear() === year &&
            selectedDate?.getMonth() === month &&
            selectedDate?.getDate() === day;
          return (
            <TouchableOpacity
              key={`d${day}`}
              style={styles.calCell}
              onPress={() => !past && onSelect(new Date(year, month, day))}
              activeOpacity={past ? 1 : 0.75}
            >
              <View style={[styles.calDayCircle, sel && styles.calDayCircleSel]}>
                <Text style={[styles.calDayNum, past && styles.calDayPast, sel && styles.calDayNumSel]}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const CreateBookingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { service, vendor } = route.params;
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [calMonth, setCalMonth] = useState(new Date());

  // Step 2
  const [locationType, setLocationType] = useState<'home' | 'shop'>(
    vendor.vendorProfile.vendorType === 'in_shop' ? 'shop' : 'home'
  );
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>([0, 0]);
  const [locationLoading, setLocationLoading] = useState(false);

  // Step 3
  const [servicePrice, setServicePrice] = useState(service.basePrice || 0);
  const [distanceCharge, setDistanceCharge] = useState(0);
  const [totalAmount, setTotalAmount] = useState(service.basePrice || 0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [clientNotes, setClientNotes] = useState('');

  // Step 4
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletVerifying, setWalletVerifying] = useState(false);
  const [walletPaid, setWalletPaid] = useState(false);
  const [paidBookingId, setPaidBookingId] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);
  const [fundingModalVisible, setFundingModalVisible] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false, title: '', message: '', onConfirm: () => {},
  });

  const isHomeAvail = vendor.vendorProfile.vendorType === 'home_service' || vendor.vendorProfile.vendorType === 'both';
  const isShopAvail = vendor.vendorProfile.vendorType === 'in_shop' || vendor.vendorProfile.vendorType === 'both';

  useEffect(() => { fetchWalletBalance(); }, []);
  useEffect(() => { if (step === 3) fetchPricePreview(); }, [step]);

  const fetchWalletBalance = async () => {
    try {
      setWalletLoading(true);
      const res = await sharpPayAPI.getBalance();
      if (res.success) setWalletBalance(res.data.balance || 0);
    } catch {}
    finally { setWalletLoading(false); }
  };

  const fetchPricePreview = async () => {
    try {
      setPriceLoading(true);
      const data: any = { serviceId: service._id, serviceType: locationType };
      if (locationType === 'home' && coordinates[0] !== 0) {
        data.location = { coordinates };
      }
      const res = await bookingAPI.previewPrice(data);
      if (res.success) {
        setServicePrice(res.data.servicePrice);
        setDistanceCharge(res.data.distanceCharge);
        setTotalAmount(res.data.totalAmount);
      }
    } catch {
      setDistanceCharge(0);
      setTotalAmount(service.basePrice);
    } finally { setPriceLoading(false); }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        toast.error('Permission Denied', 'Location permission is required.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const geo = await Location.reverseGeocodeAsync(pos.coords);
      if (geo?.[0]) {
        setAddress(`${geo[0].street || ''} ${geo[0].streetNumber || ''}`.trim() || 'Your location');
        setCity(geo[0].city || geo[0].subregion || '');
        setStateVal(geo[0].region || '');
        setCoordinates([pos.coords.longitude, pos.coords.latitude]);
        toast.success('Success', 'Location captured!');
      }
    } catch { toast.error('Error', 'Unable to get location.'); }
    finally { setLocationLoading(false); }
  };

  const timeToHHMM = (t: string): string => {
    const [timePart, ampm] = t.split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!selectedDate) { toast.error('No date', 'Please select an appointment date.'); return false; }
      if (!selectedTime) { toast.error('No time', 'Please select an appointment time.'); return false; }
    }
    if (step === 2 && locationType === 'home' && isHomeAvail) {
      if (!address.trim()) { toast.error('Address required', 'Please enter your street address.'); return false; }
      if (!city.trim()) { toast.error('City required', 'Please enter your city.'); return false; }
      if (!stateVal.trim()) { toast.error('State required', 'Please enter your state.'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else navigation.goBack();
  };

  const handlePay = async (method: 'wallet' | 'card') => {
    if (method === 'wallet' && walletBalance < totalAmount) {
      toast.error(
        'Insufficient Balance',
        `Your wallet balance (₦${walletBalance.toLocaleString()}) is less than ₦${totalAmount.toLocaleString()}. Please add funds or use card payment.`
      );
      return;
    }
    try {
      if (method === 'wallet') setWalletVerifying(true);
      else setLoading(true);

      const bookingData: any = {
        service: service._id,
        scheduledDate: selectedDate!.toISOString(),
        scheduledTime: timeToHHMM(selectedTime),
        serviceType: locationType,
        paymentMethod: method,
      };
      if (clientNotes.trim()) bookingData.clientNotes = clientNotes.trim();
      if (locationType === 'home' && isHomeAvail) {
        bookingData.location = { address, city, state: stateVal, coordinates };
      }
      const res = await bookingAPI.createBooking(bookingData);
      if (res.success) {
        const actual = res.data.booking?.totalAmount || totalAmount;
        if (method === 'card' && res.data?.authorizationUrl) {
          navigation.replace('Payment', {
            bookingId: res.data.booking?._id,
            amount: actual,
            authorizationUrl: res.data.authorizationUrl,
            reference: res.data.reference || res.data.booking?.paymentReference,
          });
        } else if (method === 'card') {
          toast.error('Payment Error', 'Failed to initialize card payment. Please try wallet.');
        } else {
          const bookingId = res.data.booking?._id || '';
          setPaidBookingId(bookingId);
          setPaidAmount(actual);
          setWalletVerifying(false);
          setWalletPaid(true);
          // Auto-navigate after 2.5s
          setTimeout(() => {
            if (bookingId) navigation.replace('BookingDetail', { bookingId });
          }, 2500);
        }
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        handleAPIError(error).message ||
        'Failed to create booking';
      toast.error('Booking Error', msg);
      setWalletVerifying(false);
    } finally { setLoading(false); }
  };

  const fp = (p: number) => `₦${p.toLocaleString()}`;
  const vp = vendor.vendorProfile;

  // ── Wallet verifying overlay ───────────────────────────────────────────────
  if (walletVerifying) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF0F6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <Ionicons name="sparkles" size={18} color={PINK} style={{ position: 'absolute', top: 4, left: 12 }} />
          <Ionicons name="sparkles" size={12} color={PINK} style={{ position: 'absolute', top: 0, right: 18 }} />
          <Ionicons name="heart" size={12} color={PINK} style={{ position: 'absolute', bottom: 8, left: 22 }} />
          <Ionicons name="heart" size={10} color={PINK} style={{ position: 'absolute', bottom: 6, right: 22 }} />
          <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(224,64,121,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 114, height: 114, borderRadius: 57, backgroundColor: 'rgba(224,64,121,0.13)', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={PINK} />
            </View>
          </View>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: TEXT, marginBottom: 10, letterSpacing: -0.3 }}>Processing Payment...</Text>
        <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
          Please don't close the app{'\n'}we're processing your payment
        </Text>
        <View style={{ width: '100%', backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFE4EF', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="wallet-outline" size={22} color={PINK} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 3 }}>LookReal Pay</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: PINK }}>{fp(totalAmount)}</Text>
            </View>
          </View>
        </View>
        <View style={{ width: '100%', backgroundColor: WHITE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFE4EF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="lock-closed" size={13} color={PINK} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: PINK, marginLeft: 6 }}>What happens next?</Text>
          </View>
          <Text style={{ fontSize: 13, color: MUTED, lineHeight: 20 }}>
            Funds will be held securely in escrow and released to the vendor once both parties confirm the service is complete.
          </Text>
        </View>
      </View>
    );
  }

  // ── Wallet payment confirmed overlay ──────────────────────────────────────
  if (walletPaid) {
    return (
      <View style={{ flex: 1, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ position: 'absolute', top: '15%', width: 260, height: 260, borderRadius: 130, backgroundColor: '#F0FDF4' }} />
        <View style={{ alignItems: 'center', width: '100%' }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50, backgroundColor: '#10b981',
            alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            elevation: 8, shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3, shadowRadius: 16,
          }}>
            <Ionicons name="checkmark" size={52} color={WHITE} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 6, letterSpacing: -0.5 }}>Payment Confirmed!</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: PINK, letterSpacing: -1, marginBottom: 12 }}>{fp(paidAmount)}</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
            Your booking has been confirmed and the vendor notified.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 28 }}>
            <Ionicons name="shield-checkmark" size={16} color="#10b981" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#166534' }}>Payment held securely in escrow</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <ActivityIndicator size="small" color={PINK} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, color: MUTED, fontWeight: '500' }}>Redirecting to your booking...</Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: PINK, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}
            onPress={() => { if (paidBookingId) navigation.replace('BookingDetail', { bookingId: paidBookingId }); }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: PINK }}>View Booking Now</Text>
            <Ionicons name="arrow-forward" size={16} color={PINK} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color={PINK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 4 ? 'Payment Method' : 'Book Appointment'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── PROGRESS ───────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, backgroundColor: BG }}>
        <ProgressBar step={step} />
      </View>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── STEP 1: DATE & TIME ──────────────────────────────────────────── */}
        {step === 1 && (
          <>
            {/* Service card */}
            <View style={styles.serviceCard}>
              {vp.profileImage ? (
                <Image source={{ uri: vp.profileImage }} style={styles.serviceAvatar} />
              ) : (
                <View style={[styles.serviceAvatar, { backgroundColor: PINK, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: WHITE, fontWeight: '800', fontSize: 15 }}>
                    {vp.businessName.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  <Ionicons name="time-outline" size={12} color={MUTED} />
                  <Text style={styles.serviceMeta}>
                    {' '}{formatDuration(service.duration)} · {vp.businessName}
                  </Text>
                </View>
              </View>
              <Text style={styles.servicePrice}>{fp(service.basePrice)}+</Text>
            </View>

            {/* Calendar */}
            <Text style={styles.secLabel}>Select a date</Text>
            <View style={styles.card}>
              <CalendarPicker
                selectedDate={selectedDate}
                calMonth={calMonth}
                onSelect={setSelectedDate}
                onMonthChange={setCalMonth}
              />
            </View>

            {/* Time slots */}
            <Text style={[styles.secLabel, { marginTop: 20 }]}>Select a time</Text>
            <View style={[styles.card, { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }]}>
              {TIME_SLOTS.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSelectedTime(t)}
                  activeOpacity={0.75}
                  style={[styles.timeSlot, selectedTime === t && styles.timeSlotActive]}
                >
                  <Text style={[styles.timeSlotText, selectedTime === t && styles.timeSlotTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── STEP 2: LOCATION ─────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <Text style={styles.secLabel}>Where should the session be?</Text>
            <View style={styles.card}>
              {isHomeAvail && (
                <TouchableOpacity
                  style={styles.locationOpt}
                  onPress={() => setLocationType('home')}
                  activeOpacity={0.8}
                >
                  <View style={styles.locationIcon}>
                    <Ionicons name="home" size={22} color={PINK} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.locationTitle}>Home Service</Text>
                    <Text style={styles.locationSub}>Artist Comes to your location</Text>
                  </View>
                  <View style={[styles.radio, locationType === 'home' && styles.radioActive]}>
                    {locationType === 'home' && <View style={styles.radioFill} />}
                  </View>
                </TouchableOpacity>
              )}

              {isHomeAvail && isShopAvail && <View style={styles.divider} />}

              {isShopAvail && (
                <TouchableOpacity
                  style={styles.locationOpt}
                  onPress={() => setLocationType('shop')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.locationIcon, { backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="storefront" size={22} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.locationTitle}>In-Shop</Text>
                    <Text style={styles.locationSub}>Visit {vp.businessName}</Text>
                  </View>
                  <View style={[styles.radio, locationType === 'shop' && styles.radioActive]}>
                    {locationType === 'shop' && <View style={styles.radioFill} />}
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Home address fields */}
            {locationType === 'home' && isHomeAvail && (
              <>
                <View style={styles.addrHeader}>
                  <Text style={styles.secLabel}>Your Address</Text>
                  <TouchableOpacity
                    onPress={getCurrentLocation}
                    disabled={locationLoading}
                    style={styles.useCurrentBtn}
                    activeOpacity={0.75}
                  >
                    {locationLoading
                      ? <ActivityIndicator size="small" color={PINK} />
                      : <>
                          <Ionicons name="navigate-outline" size={13} color={PINK} />
                          <Text style={styles.useCurrentText}> use current</Text>
                        </>
                    }
                  </TouchableOpacity>
                </View>

                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Street Address *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="location-outline" size={16} color={PINK} />
                    <TextInput
                      style={styles.input}
                      placeholder="street name"
                      placeholderTextColor="#D0A8B8"
                      value={address}
                      onChangeText={setAddress}
                    />
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>City *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="location-outline" size={16} color={PINK} />
                    <TextInput
                      style={styles.input}
                      placeholder="city name"
                      placeholderTextColor="#D0A8B8"
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 16 }]}>State *</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="location-outline" size={16} color={PINK} />
                    <TextInput
                      style={styles.input}
                      placeholder="state"
                      placeholderTextColor="#D0A8B8"
                      value={stateVal}
                      onChangeText={setStateVal}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Shop vendor location */}
            {locationType === 'shop' && vp.location && (
              <View style={[styles.card, { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14 }]}>
                <Ionicons name="location" size={18} color={PINK} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>{vp.businessName}</Text>
                  <Text style={[styles.locationSub, { marginTop: 4 }]}>
                    {vp.location.address}{'\n'}
                    {vp.location.city}, {vp.location.state}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── STEP 3: CONFIRM ──────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            {/* Booking Details */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={styles.cardTitle}>Booking Details</Text>
                <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.7}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              </View>
              {[
                { label: 'Service', value: service.name },
                { label: 'Date', value: selectedDate ? formatDateFull(selectedDate) : '—' },
                { label: 'Time', value: selectedTime || '—' },
                { label: 'Duration', value: formatDuration(service.duration) },
                { label: 'Location', value: locationType === 'home' ? 'Home Service' : 'In-Shop' },
              ].map(({ label, value }, i, arr) => (
                <View key={label} style={[styles.detailRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
                </View>
              ))}
            </View>

            {/* Price Breakdown */}
            <View style={[styles.card, { marginTop: 14 }]}>
              <Text style={styles.cardTitle}>Price Breakdown</Text>
              {priceLoading
                ? <ActivityIndicator color={PINK} style={{ marginTop: 14 }} />
                : (
                  <>
                    <View style={[styles.detailRow, { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                      <Text style={styles.detailLabel}>Service fee</Text>
                      <Text style={styles.detailValue}>{fp(servicePrice)}</Text>
                    </View>
                    {distanceCharge > 0 && (
                      <View style={[styles.detailRow, { borderBottomWidth: 1, borderBottomColor: BORDER }]}>
                        <Text style={styles.detailLabel}>Distance charge</Text>
                        <Text style={styles.detailValue}>{fp(distanceCharge)}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total</Text>
                      <Text style={[styles.detailValue, { color: PINK, fontSize: 17, fontWeight: '800' }]}>
                        {fp(totalAmount)}
                      </Text>
                    </View>
                  </>
                )
              }
            </View>

            {/* Cancellation Policy */}
            <View style={styles.cancelCard}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" style={{ marginTop: 1 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cancelTitle}>Cancellation Policy</Text>
                <Text style={styles.cancelBody}>
                  - Free cancellation up to 59 minutes before your appointment{'\n'}
                  - 20% fee applies for cancellations within 59 minutes
                </Text>
              </View>
            </View>

            {/* Notes */}
            <View style={[styles.card, { marginTop: 14 }]}>
              <Text style={styles.fieldLabel}>Additional Notes (Optional)</Text>
              <View style={[styles.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 10, marginTop: 10 }]}>
                <TextInput
                  style={[styles.input, { height: '100%', textAlignVertical: 'top' }]}
                  placeholder="Any special requests for the vendor..."
                  placeholderTextColor="#D0A8B8"
                  value={clientNotes}
                  onChangeText={setClientNotes}
                  multiline
                />
              </View>
            </View>
          </>
        )}

        {/* ── STEP 4: PAYMENT ──────────────────────────────────────────────── */}
        {step === 4 && (
          <>
            <Text style={styles.secLabel}>Choose Payment Method</Text>

            {/* LookReal Pay */}
            <TouchableOpacity
              style={styles.payCard}
              onPress={() => !loading && handlePay('wallet')}
              activeOpacity={0.85}
              disabled={loading}
            >
              <View style={styles.payRow}>
                <View style={styles.lookrealLogo}>
                  <Text style={styles.lookrealText}>LK</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.payTitle}>LookReal Pay</Text>
                  <Text style={styles.paySub}>Pay with wallet balance</Text>
                </View>
                {loading
                  ? <ActivityIndicator color={PINK} />
                  : <Ionicons name="chevron-forward" size={20} color={MUTED} />
                }
              </View>

              <View style={styles.payDivider} />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                {walletLoading
                  ? <ActivityIndicator size="small" color={PINK} />
                  : <Text style={styles.walletBal}>
                      Wallet Balance{'  '}{fp(walletBalance)}
                    </Text>
                }
                <TouchableOpacity
                  style={styles.addBalBtn}
                  onPress={() => setFundingModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add-circle-outline" size={13} color={PINK} />
                  <Text style={styles.addBalText}> Add to balance</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Paystack */}
            <TouchableOpacity
              style={[styles.payCard, { marginTop: 14 }]}
              onPress={() => !loading && handlePay('card')}
              activeOpacity={0.85}
              disabled={loading}
            >
              <View style={styles.payRow}>
                <View style={styles.paystackLogo}>
                  <Ionicons name="card" size={22} color={WHITE} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.payTitle}>Paystack</Text>
                  <Text style={styles.paySub}>Pay With Debit/Credit card</Text>
                </View>
                {loading
                  ? <ActivityIndicator color={PINK} />
                  : <Ionicons name="chevron-forward" size={20} color={MUTED} />
                }
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── BOTTOM BAR ─────────────────────────────────────────────────────── */}
      {step < 4 ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.continueBtn}>
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="chevron-forward" size={18} color={WHITE} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.summaryBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={styles.summaryMeta}>Amount Due</Text>
            <Text style={styles.summaryAmount}>{fp(totalAmount)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
            <Text style={styles.summaryMeta}>Service</Text>
            <Text style={styles.summaryVal} numberOfLines={1}>{service.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.summaryMeta}>Date & Time</Text>
            <Text style={styles.summaryVal}>
              {selectedDate ? `${formatDateShort(selectedDate)}, ${selectedTime}` : '—'}
            </Text>
          </View>
        </View>
      )}

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />

      <WalletFundingModal
        visible={fundingModalVisible}
        onClose={() => setFundingModalVisible(false)}
        onSuccess={() => { fetchWalletBalance(); setFundingModalVisible(false); }}
        currentBalance={walletBalance}
      />
    </View>
  );
};

export default CreateBookingScreen;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, backgroundColor: BG,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FDE8F0', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT },

  // Progress
  trackGray: {
    position: 'absolute', top: 10, left: '12.5%', right: '12.5%',
    height: 2, backgroundColor: '#EDD0DA', zIndex: 0,
  },
  trackPink: {
    position: 'absolute', top: 10, left: '12.5%',
    height: 2, backgroundColor: PINK, zIndex: 0,
  },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#EDD0DA', alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  dotActive: { backgroundColor: PINK },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C8A0B0' },
  dotInnerActive: { backgroundColor: WHITE },
  dotLabel: { fontSize: 9.5, color: MUTED, textAlign: 'center', fontWeight: '500', lineHeight: 13 },
  dotLabelActive: { color: PINK, fontWeight: '700' },

  // Service card
  serviceCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 20,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  serviceAvatar: { width: 46, height: 46, borderRadius: 23 },
  serviceName: { fontSize: 15, fontWeight: '700', color: TEXT },
  serviceMeta: { fontSize: 12, color: MUTED },
  servicePrice: { fontSize: 14, fontWeight: '800', color: PINK },

  // Section label
  secLabel: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 12 },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },

  // Calendar
  calNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  calNavBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FDE8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  calTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  calDayHdr: {
    width: CELL_W, textAlign: 'center', fontSize: 10, color: MUTED, fontWeight: '700',
  },
  calCell: { width: CELL_W, alignItems: 'center', marginBottom: 6 },
  calDayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  calDayCircleSel: { backgroundColor: PINK },
  calDayNum: { fontSize: 14, fontWeight: '600', color: PINK },
  calDayNumSel: { color: WHITE, fontWeight: '800' },
  calDayPast: { color: '#D8C0C8' },

  // Time slots
  timeSlot: {
    paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#FFF0F5', borderWidth: 1.5, borderColor: '#F2C4DA',
  },
  timeSlotActive: { backgroundColor: PINK, borderColor: PINK },
  timeSlotText: { fontSize: 13, fontWeight: '600', color: MUTED },
  timeSlotTextActive: { color: WHITE, fontWeight: '700' },

  // Location
  locationOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 2 },
  locationIcon: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: '#FFF0F5',
    alignItems: 'center', justifyContent: 'center',
  },
  locationTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  locationSub: { fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 18 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#D8C0C8', alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: PINK },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: PINK },
  divider: { height: 1, backgroundColor: BORDER },

  // Address
  addrHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 20, marginBottom: 12,
  },
  useCurrentBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: PINK, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  useCurrentText: { fontSize: 12, color: PINK, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#F0D8E4', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, backgroundColor: WHITE,
  },
  input: { flex: 1, fontSize: 14, color: TEXT, padding: 0, marginLeft: 8 },

  // Confirm
  cardTitle: { fontSize: 15, fontWeight: '800', color: TEXT },
  editLink: { fontSize: 13, color: PINK, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11 },
  detailLabel: { fontSize: 13, color: MUTED, fontWeight: '500' },
  detailValue: { fontSize: 13, color: TEXT, fontWeight: '700', maxWidth: '58%', textAlign: 'right' },

  cancelCard: {
    marginTop: 14, backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    flexDirection: 'row', borderWidth: 1, borderColor: '#FDE68A',
  },
  cancelTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 6 },
  cancelBody: { fontSize: 12, color: '#B45309', lineHeight: 18 },

  // Payment
  payCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  payRow: { flexDirection: 'row', alignItems: 'center' },
  lookrealLogo: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: PINK,
    alignItems: 'center', justifyContent: 'center',
  },
  lookrealText: { color: WHITE, fontSize: 16, fontWeight: '900' },
  paystackLogo: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#0A2540',
    alignItems: 'center', justifyContent: 'center',
  },
  payTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  paySub: { fontSize: 12, color: MUTED, marginTop: 2 },
  payDivider: { height: 1, backgroundColor: BORDER, marginVertical: 14 },
  walletBal: { fontSize: 14, fontWeight: '700', color: TEXT },
  addBalBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: PINK, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  addBalText: { fontSize: 12, color: PINK, fontWeight: '700' },

  // Bottom
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: BG, paddingHorizontal: 16, paddingTop: 12,
  },
  continueBtn: {
    backgroundColor: PINK, borderRadius: 16, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: PINK, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  continueBtnText: { color: WHITE, fontSize: 16, fontWeight: '800' },

  summaryBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE, paddingHorizontal: 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: BORDER,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06, shadowRadius: 10,
  },
  summaryMeta: { fontSize: 12, color: MUTED, fontWeight: '500' },
  summaryAmount: { fontSize: 16, fontWeight: '800', color: TEXT },
  summaryVal: { fontSize: 12, color: TEXT, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});
