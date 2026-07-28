import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  BackHandler,
  Image,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { toast } from '@/components/ui/Toast';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '@/types/navigation.types';
import { bookingAPI, handleAPIError, sharpPayAPI, walletAPI, couponAPI } from '@/api/api';
import LocationPickerModal, { LocationResult } from '@/components/LocationPickerModal';

const { width: SW } = Dimensions.get('window');

const PINK = '#E91E63';
const BG = '#FFF5F8';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS_SHORT = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const STEP_LABELS = ['Date & Time', 'Location', 'Confirm', 'Payment'];

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDriveTime = (km: number) => {
  const mins = Math.round(km * 2.5);
  return mins < 60 ? `about ${mins} min drive` : `about ${Math.round(mins / 60)} hr drive`;
};

const fmt12h = (date: Date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const fmt24h = (date: Date) =>
  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateBooking'>;
type RouteP = RouteProp<RootStackParamList, 'CreateBooking'>;
type PaymentMethod = 'wallet' | 'card';

const defaultPickerTime = () => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
};

const CreateBookingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { service, vendor } = route.params;
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Calendar
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Clock time picker
  const [pickerTime, setPickerTime] = useState<Date>(defaultPickerTime);
  const [timeConfirmed, setTimeConfirmed] = useState(false); // user must explicitly pick
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Location
  const isHomeAvailable =
    vendor.vendorProfile.vendorType === 'home_service' ||
    vendor.vendorProfile.vendorType === 'both';
  const isShopAvailable =
    vendor.vendorProfile.vendorType === 'in_shop' ||
    vendor.vendorProfile.vendorType === 'both';

  const [locationType, setLocationType] = useState<'home' | 'shop'>(
    isHomeAvailable ? 'home' : 'shop'
  );
  const [clientLocation, setClientLocation] = useState<LocationResult | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  // Pricing
  const [servicePrice, setServicePrice] = useState(service.basePrice || 0);
  const [distanceCharge, setDistanceCharge] = useState(0);
  const [totalAmount, setTotalAmount] = useState(service.basePrice || 0);
  const [priceLoading, setPriceLoading] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  const [clientNotes, setClientNotes] = useState('');

  // Coupon
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; discountAmount: number; finalAmount: number;
  } | null>(null);

  // Add to balance sheet
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addBalanceLoading, setAddBalanceLoading] = useState(false);

  // Disable swipe-back gesture so Android/iOS back always goes through our step logic
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, []);

  // Intercept Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [step])
  );

  useEffect(() => { fetchWalletBalance(); tryGetDistance(); }, []);
  // Re-fetch balance when screen regains focus (e.g. returning from WalletPayment)
  useFocusEffect(useCallback(() => { fetchWalletBalance(); }, []));
  useEffect(() => { setTotalAmount(servicePrice + distanceCharge); }, [servicePrice, distanceCharge]);
  useEffect(() => { if (step === 3) fetchPricePreview(); }, [step]);

  const tryGetDistance = async () => {
    const coords = vendor.vendorProfile.location?.coordinates;
    if (!coords) return;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getLastKnownPositionAsync();
      if (!pos) return;
      const d = haversineKm(pos.coords.latitude, pos.coords.longitude, coords[1], coords[0]);
      setDistanceKm(d);
    } catch {}
  };

  const handleLocationConfirm = (result: LocationResult) => {
    setClientLocation(result);
    setShowMapPicker(false);
  };

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
      const previewData: any = { serviceId: service._id, serviceType: locationType };
      if (locationType === 'home' && clientLocation?.coordinates) {
        previewData.location = { coordinates: clientLocation.coordinates };
      }
      const res = await bookingAPI.previewPrice(previewData);
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

  // ── Clock picker ──────────────────────────────────────────────────────────

  // Returns the earliest selectable time: now+30min when today is selected, undefined for future dates
  const getMinimumPickerTime = (): Date | undefined => {
    if (!selectedDate) return undefined;
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const selMidnight   = new Date(selectedDate); selMidnight.setHours(0, 0, 0, 0);
    if (selMidnight.getTime() !== todayMidnight.getTime()) return undefined;
    const min = new Date();
    min.setMinutes(min.getMinutes() + 30, 0, 0);
    return min;
  };

  const onTimeChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) {
      setPickerTime(date);
      setTimeConfirmed(true);
    }
  };

  const confirmIOSTime = () => {
    setTimeConfirmed(true);
    setShowTimePicker(false);
  };

  // ── Calendar ──────────────────────────────────────────────────────────────
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay  = (y: number, m: number) => new Date(y, m, 1).getDay();

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const buildCells = () => {
    const total = getDaysInMonth(calYear, calMonth);
    const first = getFirstDay(calYear, calMonth);
    const cells: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  };

  const isPast = (day: number) => {
    const d = new Date(calYear, calMonth, day);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d < t;
  };
  const isSel = (day: number) =>
    !!selectedDate &&
    selectedDate.getFullYear() === calYear &&
    selectedDate.getMonth() === calMonth &&
    selectedDate.getDate() === day;
  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === calYear && t.getMonth() === calMonth && t.getDate() === day;
  };

  // ── Coupon ────────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    try {
      setCouponLoading(true);
      const res = await couponAPI.validate(code, totalAmount);
      if (res.success && res.data.valid) {
        setAppliedCoupon({
          code: res.data.code,
          discountAmount: res.data.discountAmount,
          finalAmount: res.data.finalAmount,
        });
        toast.success('Coupon applied!', `You saved ₦${res.data.discountAmount.toLocaleString()}`);
      } else {
        toast.error('Invalid coupon', res.data?.reason || 'This coupon cannot be applied.');
        setAppliedCoupon(null);
      }
    } catch (e: any) {
      const err = handleAPIError(e);
      toast.error('Invalid coupon', err.message || 'Could not apply coupon.');
      setAppliedCoupon(null);
    } finally { setCouponLoading(false); }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
  };

  // ── Add to balance ────────────────────────────────────────────────────────
  const handleAddBalance = async () => {
    const amount = parseInt(addAmount.replace(/[^0-9]/g, ''), 10);
    if (!amount || amount < 100) {
      toast.error('Minimum ₦100', 'Please enter at least ₦100.');
      return;
    }
    try {
      setAddBalanceLoading(true);
      const res = await walletAPI.initializeWalletFunding(amount);
      if (res.success) {
        setShowAddBalance(false);
        setAddAmount('');
        navigation.navigate('WalletPayment', {
          amount,
          reference: res.data.reference,
          authorizationUrl: res.data.authorizationUrl,
          paymentType: 'wallet_funding',
        });
      }
    } catch (e: any) {
      const err = handleAPIError(e);
      toast.error('Error', err.message || 'Could not initialize payment.');
    } finally { setAddBalanceLoading(false); }
  };

  // ── Navigation / Validation ───────────────────────────────────────────────
  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else navigation.goBack();
  };

  const validateStep1 = () => {
    if (!selectedDate) { toast.error('Select a date', 'Please pick a date.'); return false; }
    if (!timeConfirmed) { toast.error('Select a time', 'Please tap the clock and pick a time.'); return false; }

    // Block past times when today is selected
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    const selMidnight   = new Date(selectedDate); selMidnight.setHours(0, 0, 0, 0);
    if (selMidnight.getTime() === todayMidnight.getTime()) {
      const chosen = new Date();
      chosen.setHours(pickerTime.getHours(), pickerTime.getMinutes(), 0, 0);
      const cutoff = new Date();
      cutoff.setMinutes(cutoff.getMinutes() + 30, 0, 0);
      if (chosen < cutoff) {
        toast.error('Time already passed', 'Please select a time at least 30 minutes from now.');
        return false;
      }
    }
    return true;
  };
  const validateStep2 = () => {
    if (locationType === 'home' && isHomeAvailable && !clientLocation) {
      toast.error('Location required', 'Please pick your location on the map.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3) setStep(4);
  };

  const handlePay = async () => {
    const payableAmount = appliedCoupon ? appliedCoupon.finalAmount : totalAmount;
    if (paymentMethod === 'wallet' && walletBalance < payableAmount) {
      setShowAddBalance(true);
      return;
    }
    try {
      setLoading(true);
      const payableAmount = appliedCoupon ? appliedCoupon.finalAmount : totalAmount;

      const bookingData: any = {
        service: service._id,
        scheduledDate: selectedDate!.toISOString(),
        scheduledTime: fmt24h(pickerTime),
        serviceType: locationType,
        paymentMethod,
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
      };
      if (clientNotes.trim()) bookingData.clientNotes = clientNotes.trim();
      if (locationType === 'home' && isHomeAvailable && clientLocation) {
        bookingData.location = {
          address: clientLocation.address,
          city: clientLocation.city,
          state: clientLocation.state,
          coordinates: clientLocation.coordinates,
        };
      }
      const res = await bookingAPI.createBooking(bookingData);
      if (res.success) {
        const actual = res.data.booking?.totalAmount || totalAmount;
        if (paymentMethod === 'card' && res.data?.authorizationUrl) {
          navigation.replace('Payment', {
            bookingId: res.data.booking?._id,
            amount: actual,
            authorizationUrl: res.data.authorizationUrl,
            reference: res.data.reference || res.data.booking?.paymentReference,
          });
        } else if (paymentMethod === 'card') {
          toast.error('Payment Error', 'Failed to initialize card payment. Try again.');
        } else {
          toast.success('Booking Confirmed!', `Payment of ₦${actual.toLocaleString()} was successful!`);
          navigation.navigate('BookingDetail', { bookingId: res.data.booking._id });
        }
      }
    } catch (error: any) {
      const apiError = handleAPIError(error);
      toast.error('Booking Error', error.response?.data?.error?.message || apiError.message || 'Failed to create booking');
    } finally { setLoading(false); }
  };

  const durationLabel = () => {
    const mins = service.duration || 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} Min`;
    return m > 0 ? `${h} Hr ${m} Min` : `${h} Hour${h > 1 ? 's' : ''}`;
  };

  const formatDateShort = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

  const cells = buildCells();
  const DAY_W = Math.floor((SW - 40 - 12) / 7);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── HEADER ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: BG }}>
        <View style={ss.header}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.8} style={ss.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={ss.headerTitle}>Book Appointment</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Progress bar + labels */}
        <View style={ss.progressWrap}>
          {STEP_LABELS.map((label, i) => {
            const s = i + 1;
            return (
              <View key={s} style={ss.progressItem}>
                <View style={[ss.progBar, s <= step && ss.progBarActive]} />
                <Text style={[ss.progLabel, s === step && ss.progLabelActive]}>{label}</Text>
              </View>
            );
          })}
        </View>
      </SafeAreaView>

      {/* ── CONTENT ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ════════════════ STEP 1: DATE & TIME ════════════════ */}
        {step === 1 && (
          <View style={{ paddingTop: 16 }}>

            {/* Service card */}
            <View style={ss.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Service image or gradient fallback */}
                <View style={ss.svcAvatar}>
                  {service.image ? (
                    <Image source={{ uri: service.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={['#E91E63', '#C2185B']} style={ss.svcAvatarGrad}>
                      <Text style={ss.svcAvatarLetter}>
                        {(vendor.vendorProfile.businessName || 'V').charAt(0)}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={ss.svcName}>{service.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                    <Text style={ss.svcSub}>{durationLabel()} · {vendor.vendorProfile.businessName}</Text>
                  </View>
                </View>
                <View style={ss.priceChip}>
                  <Text style={ss.priceChipTxt}>₦{servicePrice.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {/* Calendar */}
            <Text style={ss.secLabel}>Select a date</Text>
            <View style={ss.card}>
              <View style={ss.calHeader}>
                <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={ss.calNavBtn}>
                  <Ionicons name="chevron-back" size={18} color={PINK} />
                </TouchableOpacity>
                <Text style={ss.calMonthTxt}>{MONTHS[calMonth]} {calYear}</Text>
                <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={ss.calNavBtn}>
                  <Ionicons name="chevron-forward" size={18} color={PINK} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {DAYS_SHORT.map(d => (
                  <Text key={d} style={[ss.calDayName, { width: DAY_W }]}>{d}</Text>
                ))}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {cells.map((day, idx) => {
                  if (!day) return <View key={`_${idx}`} style={{ width: DAY_W, height: DAY_W }} />;
                  const past = isPast(day);
                  const sel  = isSel(day);
                  const tod  = isToday(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => {
                        if (past) return;
                        const picked = new Date(calYear, calMonth, day);
                        setSelectedDate(picked);
                        // Reset time when today is picked so stale past times can't carry over
                        const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
                        const pickedMidnight = new Date(picked); pickedMidnight.setHours(0, 0, 0, 0);
                        if (pickedMidnight.getTime() === todayMidnight.getTime()) {
                          setTimeConfirmed(false);
                          setPickerTime(defaultPickerTime());
                        }
                      }}
                      activeOpacity={past ? 1 : 0.75}
                      style={[ss.calCell, { width: DAY_W, height: DAY_W }, sel && ss.calCellSel]}
                    >
                      <Text style={[
                        ss.calCellTxt,
                        past ? ss.calCellPast : undefined,
                        tod && !sel ? ss.calCellToday : undefined,
                        sel ? ss.calCellTxtSel : undefined,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Clock time picker */}
            <Text style={ss.secLabel}>Select a time</Text>
            <TouchableOpacity
              style={ss.card}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={ss.clockIconBox}>
                  <Ionicons name="time-outline" size={26} color={PINK} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={timeConfirmed ? ss.timeSelected : ss.timePlaceholder}>
                    {timeConfirmed ? fmt12h(pickerTime) : 'Tap to select time'}
                  </Text>
                  {timeConfirmed && (
                    <Text style={ss.timeTapHint}>Tap to change</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </View>
            </TouchableOpacity>

            {/* Android: DateTimePicker renders as a dialog directly */}
            {showTimePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={pickerTime}
                mode="time"
                display="clock"
                onChange={onTimeChange}
                minimumDate={getMinimumPickerTime()}
              />
            )}

            {/* iOS: wrap in a bottom-sheet modal */}
            {Platform.OS === 'ios' && (
              <Modal visible={showTimePicker} transparent animationType="slide">
                <View style={ss.timeModalOverlay}>
                  <View style={ss.timeModalSheet}>
                    <View style={ss.timeModalHandle} />
                    <View style={ss.timeModalHeader}>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)} activeOpacity={0.7}>
                        <Text style={ss.timeModalCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={ss.timeModalTitle}>Select Time</Text>
                      <TouchableOpacity onPress={confirmIOSTime} activeOpacity={0.7}>
                        <Text style={ss.timeModalDone}>Done</Text>
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

        {/* ════════════════ STEP 2: LOCATION ════════════════ */}
        {step === 2 && (
          <View style={{ paddingTop: 16 }}>
            <Text style={ss.stepQ}>Where should the session be?</Text>

            {isHomeAvailable && (
              <TouchableOpacity
                onPress={() => setLocationType('home')}
                activeOpacity={0.85}
                style={[ss.locCard, locationType === 'home' && ss.locCardSel]}
              >
                <View style={[ss.locIconBox, locationType === 'home' && ss.locIconBoxSel]}>
                  <Ionicons name="home-outline" size={22} color={locationType === 'home' ? PINK : '#9CA3AF'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={ss.locTitle}>Home Service</Text>
                  <Text style={ss.locSub}>Artist Comes to your location</Text>
                </View>
                <View style={[ss.radio, locationType === 'home' && ss.radioSel]}>
                  {locationType === 'home' && <View style={ss.radioDot} />}
                </View>
              </TouchableOpacity>
            )}

            {isShopAvailable && (
              <TouchableOpacity
                onPress={() => setLocationType('shop')}
                activeOpacity={0.85}
                style={[ss.locCard, locationType === 'shop' && ss.locCardSel]}
              >
                <View style={[ss.locIconBox, locationType === 'shop' && ss.locIconBoxSel]}>
                  <Ionicons name="storefront-outline" size={22} color={locationType === 'shop' ? PINK : '#9CA3AF'} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={ss.locTitle}>In-Shop</Text>
                  <Text style={ss.locSub}>Visit {vendor.vendorProfile.businessName}</Text>
                </View>
                <View style={[ss.radio, locationType === 'shop' && ss.radioSel]}>
                  {locationType === 'shop' && <View style={ss.radioDot} />}
                </View>
              </TouchableOpacity>
            )}

            {/* Home: map picker */}
            {locationType === 'home' && isHomeAvailable && (
              <View style={{ marginTop: 20 }}>
                <Text style={ss.addrTitle}>Your Address</Text>

                {/* Map picker trigger */}
                <TouchableOpacity
                  onPress={() => setShowMapPicker(true)}
                  activeOpacity={0.85}
                  style={ss.mapPickerBtn}
                >
                  <View style={ss.mapPickerIcon}>
                    <Ionicons name="map-outline" size={22} color={PINK} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={ss.mapPickerTitle}>
                      {clientLocation ? 'Change location on map' : 'Pick location on map'}
                    </Text>
                    <Text style={ss.mapPickerSub}>
                      {clientLocation ? 'Tap to adjust your pin' : 'Drop a pin to set your address'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>

                {/* Address fields — read-only, only visible after map confirms */}
                {clientLocation && (
                  <View style={[ss.addrConfirm, { marginTop: 12, flexDirection: 'column', gap: 6 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text style={[ss.addrConfirmTxt, { fontWeight: '700' }]}>Location confirmed</Text>
                    </View>
                    <Text style={ss.addrConfirmTxt}>{clientLocation.address}</Text>
                    <Text style={ss.addrConfirmTxt}>{clientLocation.city}, {clientLocation.state}</Text>
                  </View>
                )}
              </View>
            )}

            {/* In-Shop: distance only — no vendor address shown */}
            {locationType === 'shop' && (
              <View style={[ss.card, { marginTop: 20 }]}>
                <Text style={ss.vendorLocTitle}>Distance from you</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={ss.pinBox}>
                    <Ionicons name="car-outline" size={20} color={PINK} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    {distanceKm !== null ? (
                      <>
                        <Text style={ss.vendorLocCity}>{distanceKm.toFixed(1)} km away</Text>
                        <Text style={ss.vendorLocDist}>{formatDriveTime(distanceKm)}</Text>
                      </>
                    ) : (
                      <Text style={ss.vendorLocDist}>Distance unavailable — enable location for estimate</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ════════════════ STEP 3: CONFIRM ════════════════ */}
        {step === 3 && (
          <View style={{ paddingTop: 16 }}>
            <View style={ss.card}>
              <View style={ss.confirmTitleRow}>
                <Text style={ss.confirmTitle}>Booking Details</Text>
                <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.7}>
                  <Text style={ss.editBtn}>Edit</Text>
                </TouchableOpacity>
              </View>

              {[
                { label: 'Service',  value: service.name },
                { label: 'Date',     value: selectedDate ? formatDateShort(selectedDate) : '—' },
                { label: 'Time',     value: timeConfirmed ? fmt12h(pickerTime) : '—' },
                { label: 'Duration', value: durationLabel() },
                {
                  label: 'Location',
                  value: locationType === 'home'
                    ? clientLocation ? `${clientLocation.address}, ${clientLocation.city}` : 'Home Service'
                    : 'In-Shop',
                },
              ].map(({ label, value }, i, arr) => (
                <View key={label} style={[ss.confRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={ss.confLabel}>{label}</Text>
                  <Text style={ss.confValue} numberOfLines={2}>{value}</Text>
                </View>
              ))}
            </View>

            <View style={[ss.card, { marginTop: 14 }]}>
              <Text style={ss.confirmTitle}>Price Breakdown</Text>
              {priceLoading
                ? <ActivityIndicator color={PINK} style={{ marginTop: 10 }} />
                : <>
                    <View style={ss.confRow}>
                      <Text style={ss.confLabel}>Service fee</Text>
                      <Text style={ss.confValue}>₦{servicePrice.toLocaleString()}</Text>
                    </View>
                    {distanceCharge > 0 && (
                      <View style={ss.confRow}>
                        <Text style={ss.confLabel}>Distance charge</Text>
                        <Text style={ss.confValue}>₦{distanceCharge.toLocaleString()}</Text>
                      </View>
                    )}
                    <View style={[ss.confRow, { borderBottomWidth: 0, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}>
                      <Text style={[ss.confLabel, { fontWeight: '700', color: '#111827', fontSize: 14 }]}>Total</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: PINK }}>
                        ₦{totalAmount.toLocaleString()}
                      </Text>
                    </View>
                  </>
              }
            </View>

            <View style={ss.cancelCard}>
              <Ionicons name="information-circle-outline" size={18} color="#D97706" style={{ marginTop: 1 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={ss.cancelTitle}>Cancellation Policy</Text>
                <Text style={ss.cancelTxt}>
                  - Free cancellation up to 59 minutes before your appointment{'\n'}
                  - 20% fee for cancellations within 59 minutes
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ════════════════ STEP 4: PAYMENT ════════════════ */}
        {step === 4 && (
          <View style={{ paddingTop: 16 }}>
            <Text style={ss.stepQ}>Choose Payment Method</Text>

            {/* LookReal Pay */}
            <TouchableOpacity
              onPress={() => setPaymentMethod('wallet')}
              activeOpacity={0.85}
              style={[ss.payCard, paymentMethod === 'wallet' && ss.payCardSel]}
            >
              <View style={ss.lrLogo}><Text style={ss.lrLogoTxt}>LR</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={ss.payTitle}>LookReal Pay</Text>
                <Text style={ss.paySub}>Pay with wallet balance</Text>
                {walletLoading
                  ? <ActivityIndicator size="small" color={PINK} style={{ marginTop: 6 }} />
                  : <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
                      <Text style={[ss.walletBal, walletBalance < (appliedCoupon?.finalAmount ?? totalAmount) && { color: '#EF4444' }]}>
                        ₦{walletBalance.toLocaleString()}
                      </Text>
                      <TouchableOpacity onPress={() => setShowAddBalance(true)} activeOpacity={0.8} style={ss.addBalBtn}>
                        <Ionicons name="add-circle-outline" size={13} color={PINK} />
                        <Text style={ss.addBalTxt}> Add to balance</Text>
                      </TouchableOpacity>
                    </View>
                }
              </View>
              <View style={[ss.radio, paymentMethod === 'wallet' && ss.radioSel]}>
                {paymentMethod === 'wallet' && <View style={ss.radioDot} />}
              </View>
            </TouchableOpacity>

            {/* Paystack */}
            <TouchableOpacity
              onPress={() => setPaymentMethod('card')}
              activeOpacity={0.85}
              style={[ss.payCard, paymentMethod === 'card' && ss.payCardSel]}
            >
              <View style={ss.psLogo}><Ionicons name="card-outline" size={22} color="#fff" /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={ss.payTitle}>Paystack</Text>
                <Text style={ss.paySub}>Pay With Debit/Credit card</Text>
              </View>
              <View style={[ss.radio, paymentMethod === 'card' && ss.radioSel]}>
                {paymentMethod === 'card' && <View style={ss.radioDot} />}
              </View>
            </TouchableOpacity>

            {/* Coupon code */}
            <View style={[ss.card, { marginTop: 14 }]}>
              <Text style={ss.couponTitle}>Have a coupon?</Text>
              {appliedCoupon ? (
                <View style={ss.couponApplied}>
                  <Ionicons name="pricetag" size={16} color="#059669" />
                  <Text style={ss.couponAppliedTxt}>{appliedCoupon.code} — saved ₦{appliedCoupon.discountAmount.toLocaleString()}</Text>
                  <TouchableOpacity onPress={handleRemoveCoupon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={ss.couponRow}>
                  <TextInput
                    style={ss.couponInput}
                    value={couponInput}
                    onChangeText={t => setCouponInput(t.toUpperCase())}
                    placeholder="Enter coupon code"
                    placeholderTextColor="#D1D5DB"
                    autoCapitalize="characters"
                    returnKeyType="done"
                    onSubmitEditing={handleApplyCoupon}
                  />
                  <TouchableOpacity
                    onPress={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    activeOpacity={0.8}
                    style={[ss.couponApplyBtn, (!couponInput.trim()) && { opacity: 0.4 }]}
                  >
                    {couponLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={ss.couponApplyTxt}>Apply</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Amount summary */}
            <View style={[ss.card, { marginTop: 14 }]}>
              <View style={ss.confRow}>
                <Text style={ss.confLabel}>Service fee</Text>
                <Text style={ss.confValue}>₦{totalAmount.toLocaleString()}</Text>
              </View>
              {appliedCoupon && (
                <View style={ss.confRow}>
                  <Text style={[ss.confLabel, { color: '#059669' }]}>Coupon ({appliedCoupon.code})</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#059669' }}>
                    -₦{appliedCoupon.discountAmount.toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={[ss.confRow, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 }]}>
                <Text style={[ss.confLabel, { fontWeight: '700', color: '#111827' }]}>Amount Due</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: PINK }}>
                  ₦{(appliedCoupon ? appliedCoupon.finalAmount : totalAmount).toLocaleString()}
                </Text>
              </View>
              <View style={[ss.confRow, { borderBottomWidth: 0 }]}>
                <Text style={ss.confLabel}>Service</Text>
                <Text style={ss.confValue}>{service.name}</Text>
              </View>
              {selectedDate && timeConfirmed && (
                <View style={[ss.confRow, { borderBottomWidth: 0 }]}>
                  <Text style={ss.confLabel}>Date & Time</Text>
                  <Text style={ss.confValue}>
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, {fmt12h(pickerTime)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── FOOTER ── */}
      <View style={[ss.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          onPress={step === 4 ? handlePay : handleNext}
          activeOpacity={0.85}
          disabled={loading}
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={loading ? ['#D1D5DB', '#9CA3AF'] : ['#E91E63', '#C2185B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={ss.continueBtn}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={ss.continueTxt}>
                    {step === 4
                      ? paymentMethod === 'wallet'
                        ? `Pay ₦${(appliedCoupon?.finalAmount ?? totalAmount).toLocaleString()}`
                        : 'Pay with Card'
                      : 'Continue'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </View>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <LocationPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleLocationConfirm}
        initialLocation={clientLocation}
      />

      {/* ── Add to balance bottom sheet ── */}
      <Modal
        visible={showAddBalance}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setShowAddBalance(false); }}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={ss.absOverlay}
            activeOpacity={1}
            onPress={() => { Keyboard.dismiss(); setShowAddBalance(false); }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
        <View style={[ss.addBalSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={ss.sheetHandle} />
          <Text style={ss.sheetTitle}>Add to Balance</Text>
          <Text style={ss.sheetSub}>
            Your balance is{' '}
            <Text style={{ color: '#EF4444', fontWeight: '700' }}>₦{walletBalance.toLocaleString()}</Text>
            {'. '}You need{' '}
            <Text style={{ color: PINK, fontWeight: '700' }}>
              ₦{((appliedCoupon?.finalAmount ?? totalAmount) - walletBalance).toLocaleString()}
            </Text>
            {' '}more.
          </Text>
          <Text style={ss.sheetFieldLabel}>How much would you like to add?</Text>
          <TextInput
            style={ss.sheetInput}
            value={addAmount}
            onChangeText={t => setAddAmount(t.replace(/[^0-9]/g, ''))}
            placeholder="₦0"
            placeholderTextColor="#D1D5DB"
            keyboardType="numeric"
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={handleAddBalance}
            disabled={addBalanceLoading || !addAmount || parseInt(addAmount) < 100}
            activeOpacity={0.85}
            style={{ borderRadius: 14, overflow: 'hidden', marginTop: 16 }}
          >
            <LinearGradient
              colors={
                addBalanceLoading || !addAmount || parseInt(addAmount) < 100
                  ? ['#D1D5DB', '#9CA3AF']
                  : ['#E91E63', '#C2185B']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={ss.sheetBtn}
            >
              {addBalanceLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={ss.sheetBtnTxt}>Proceed to Fund Wallet</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const ss = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
  progressWrap: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 4,
  },
  progressItem: { flex: 1, alignItems: 'center' },
  progBar: { height: 4, width: '100%', borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 5 },
  progBarActive: { backgroundColor: PINK },
  progLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '500', textAlign: 'center' },
  progLabelActive: { color: PINK, fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  secLabel: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 18, marginBottom: 10 },

  // Service card
  svcAvatar: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden' },
  svcAvatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  svcAvatarLetter: { color: '#fff', fontSize: 20, fontWeight: '800' },
  svcName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  svcSub: { fontSize: 12, color: '#9CA3AF' },
  priceChip: {
    backgroundColor: '#FCE4EC',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F9A8D4',
  },
  priceChipTxt: { fontSize: 13, fontWeight: '700', color: PINK },

  // Calendar
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calNavBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  calMonthTxt: { fontSize: 15, fontWeight: '700', color: '#111827' },
  calDayName: { fontSize: 10, fontWeight: '600', color: '#9CA3AF', textAlign: 'center' },
  calCell: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  calCellSel: { backgroundColor: PINK },
  calCellTxt: { fontSize: 13, fontWeight: '600', color: PINK },
  calCellPast: { color: '#D1D5DB' },
  calCellToday: { color: '#111827', fontWeight: '800' },
  calCellTxtSel: { color: '#fff' },

  // Clock picker
  clockIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSelected: { fontSize: 20, fontWeight: '800', color: '#111827' },
  timePlaceholder: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  timeTapHint: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // iOS time picker modal
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  timeModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  timeModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  timeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeModalCancel: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  timeModalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  timeModalDone: { fontSize: 15, color: PINK, fontWeight: '700' },

  // Location step
  stepQ: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  locCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    marginBottom: 10,
  },
  locCardSel: { borderColor: PINK, backgroundColor: '#FFF5F8' },
  locIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  locIconBoxSel: { backgroundColor: '#FCE4EC' },
  locTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  locSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: PINK },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PINK },

  // Address / map picker
  addrTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  mapPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: PINK,
  },
  mapPickerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPickerTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  mapPickerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  addrConfirm: {
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  addrConfirmTxt: { fontSize: 13, color: '#065F46', fontWeight: '500' },

  // Vendor location
  vendorLocTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  pinBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FCE4EC', alignItems: 'center', justifyContent: 'center' },
  vendorLocCity: { fontSize: 14, fontWeight: '600', color: '#111827' },
  vendorLocDist: { fontSize: 12, color: '#6B7280' },

  // Confirm step
  confirmTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  confirmTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  editBtn: { fontSize: 13, color: PINK, fontWeight: '700' },
  confRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  confLabel: { fontSize: 13, color: '#6B7280' },
  confValue: { fontSize: 13, fontWeight: '600', color: '#111827', maxWidth: '58%', textAlign: 'right' },
  cancelCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cancelTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  cancelTxt: { fontSize: 12, color: '#B45309', lineHeight: 18 },

  // Payment step
  payCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    marginBottom: 10,
  },
  payCardSel: { borderColor: PINK, backgroundColor: '#FFF5F8' },
  lrLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center' },
  lrLogoTxt: { color: '#fff', fontSize: 16, fontWeight: '900' },
  psLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  payTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  paySub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  walletBal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  addBalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE4EC',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F9A8D4',
  },
  addBalTxt: { fontSize: 11, color: PINK, fontWeight: '600' },

  // Coupon
  couponTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 10 },
  couponRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  couponInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#F9FAFB',
    letterSpacing: 1,
  },
  couponApplyBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponApplyTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  couponAppliedTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: '#065F46' },

  // Add to balance sheet
  absOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  addBalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  sheetSub: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  sheetFieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  sheetInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  sheetBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  sheetBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

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
  continueBtn: { height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  continueTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default CreateBookingScreen;
