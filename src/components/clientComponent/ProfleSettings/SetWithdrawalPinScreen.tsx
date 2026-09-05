import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { walletAPI, handleAPIError } from '@/api/api';

const PINK    = '#E04079';
const PINK_S  = '#FFF0F7';
const PINK_M  = '#FCDCE9';
const TEXT1   = '#111827';
const TEXT2   = '#6B7280';
const TEXT3   = '#9CA3AF';
const BORDER  = '#F3F4F6';
const WHITE   = '#FFFFFF';

const NUMPAD = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['','0','⌫'],
];

const WEAK_PINS = ['0000','1111','2222','3333','4444','5555','6666','7777','8888','9999','1234','4321'];

const SetWithdrawalPinScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [activeField, setActiveField] = useState<'pin' | 'confirm'>('pin');
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleKey = (key: string) => {
    if (key === '') return;
    if (key === '⌫') {
      if (activeField === 'pin') setPin(p => p.slice(0, -1));
      else setConfirmPin(p => p.slice(0, -1));
      return;
    }
    if (activeField === 'pin') {
      if (pin.length < 4) {
        const next = pin + key;
        setPin(next);
        if (next.length === 4) setActiveField('confirm');
      }
    } else {
      if (confirmPin.length < 4) setConfirmPin(p => p + key);
    }
  };

  const handleSetPin = async () => {
    if (pin.length !== 4 || confirmPin.length !== 4) {
      toast.error('Incomplete', 'Please fill in both PIN fields');
      return;
    }
    if (pin !== confirmPin) {
      toast.error('Mismatch', 'PINs do not match. Please try again.');
      setConfirmPin('');
      setActiveField('confirm');
      return;
    }
    if (WEAK_PINS.includes(pin)) {
      toast.warning('Weak PIN', 'This PIN is too common. Choose something more secure.');
      return;
    }
    setLoading(true);
    try {
      await walletAPI.setWithdrawalPin(pin, confirmPin);
      toast.success('PIN Set', 'Your withdrawal PIN has been set successfully');
      navigation.goBack();
    } catch (error) {
      const apiError = handleAPIError(error);
      if (apiError.code === 'PIN_ALREADY_SET') {
        toast.info('PIN Exists', 'You already have a withdrawal PIN. Redirecting to change PIN.');
        (navigation as any).replace('ChangeWithdrawalPin');
        return;
      }
      toast.error('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = pin.length === 4 && confirmPin.length === 4 && !loading;

  const PinBoxes = ({ value, active }: { value: string; active: boolean }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setActiveField(active ? (activeField === 'pin' ? 'confirm' : 'pin') : (active ? 'pin' : 'confirm'))}
      style={[s.pinRow, active && s.pinRowActive]}
    >
      {[0, 1, 2, 3].map(i => {
        const filled = i < value.length;
        const isCursor = active && i === value.length;
        return (
          <View
            key={i}
            style={[
              s.pinBox,
              filled && s.pinBoxFilled,
              isCursor && s.pinBoxCursor,
            ]}
          >
            {filled && (
              revealed
                ? <Text style={s.pinDigit}>{value[i]}</Text>
                : <View style={s.pinDot} />
            )}
            {isCursor && <View style={s.cursor} />}
          </View>
        );
      })}
    </TouchableOpacity>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={PINK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Set Withdrawal PIN</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Hero ── */}
        <LinearGradient
          colors={['#E04079', '#C0315E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={36} color={WHITE} />
          </View>
          <Text style={s.heroTitle}>Create Your PIN</Text>
          <Text style={s.heroSub}>Set a secure 4-digit PIN to authorise wallet withdrawals</Text>
          <View style={s.heroDecor1} />
          <View style={s.heroDecor2} />
        </LinearGradient>

        {/* ── PIN entry ── */}
        <View style={s.card}>

          {/* Enter PIN */}
          <View style={s.fieldBlock}>
            <View style={s.fieldHeader}>
              <View style={[s.fieldIconWrap, activeField === 'pin' && s.fieldIconWrapActive]}>
                <Ionicons name="lock-closed-outline" size={14} color={activeField === 'pin' ? PINK : TEXT3} />
              </View>
              <Text style={[s.fieldLabel, activeField === 'pin' && s.fieldLabelActive]}>Enter PIN</Text>
              {pin.length === 4 && (
                <View style={s.checkBadge}>
                  <Ionicons name="checkmark" size={12} color={WHITE} />
                </View>
              )}
            </View>
            <TouchableOpacity activeOpacity={1} onPress={() => setActiveField('pin')}>
              <PinBoxes value={pin} active={activeField === 'pin'} />
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          {/* Confirm PIN */}
          <View style={s.fieldBlock}>
            <View style={s.fieldHeader}>
              <View style={[s.fieldIconWrap, activeField === 'confirm' && s.fieldIconWrapActive]}>
                <Ionicons name="shield-outline" size={14} color={activeField === 'confirm' ? PINK : TEXT3} />
              </View>
              <Text style={[s.fieldLabel, activeField === 'confirm' && s.fieldLabelActive]}>Confirm PIN</Text>
              {confirmPin.length === 4 && (
                <View style={s.checkBadge}>
                  <Ionicons name="checkmark" size={12} color={WHITE} />
                </View>
              )}
            </View>
            <TouchableOpacity activeOpacity={1} onPress={() => setActiveField('confirm')}>
              <PinBoxes value={confirmPin} active={activeField === 'confirm'} />
            </TouchableOpacity>
          </View>

          {/* Reveal toggle */}
          <TouchableOpacity style={s.revealRow} onPress={() => setRevealed(r => !r)} activeOpacity={0.7}>
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={16} color={TEXT2} />
            <Text style={s.revealText}>{revealed ? 'Hide digits' : 'Show digits'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Security tips ── */}
        <View style={s.tipsCard}>
          <View style={s.tipsHeader}>
            <View style={s.tipsIconWrap}>
              <Ionicons name="information-circle" size={16} color="#3B82F6" />
            </View>
            <Text style={s.tipsTitle}>Security Tips</Text>
          </View>
          {[
            'Use a unique combination not tied to your birth year or phone number',
            'Avoid common patterns like 1234, 0000, or repeated digits',
            'Never share your withdrawal PIN with anyone',
          ].map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <View style={s.tipDot} />
              <Text style={s.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* ── Numpad ── */}
        <View style={s.numpad}>
          {NUMPAD.map((row, ri) => (
            <View key={ri} style={s.numpadRow}>
              {row.map((key, ki) => (
                key === '' ? (
                  <View key={ki} style={s.numpadEmpty} />
                ) : (
                  <TouchableOpacity
                    key={ki}
                    onPress={() => handleKey(key)}
                    style={[s.numpadKey, key === '⌫' && s.numpadBackKey]}
                    activeOpacity={0.6}
                  >
                    {key === '⌫' ? (
                      <Ionicons name="backspace-outline" size={22} color={TEXT1} />
                    ) : (
                      <Text style={s.numpadKeyText}>{key}</Text>
                    )}
                  </TouchableOpacity>
                )
              ))}
            </View>
          ))}
        </View>

        {/* ── CTA ── */}
        <TouchableOpacity
          onPress={handleSetPin}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={{ borderRadius: 16, overflow: 'hidden', marginTop: 8 }}
        >
          <LinearGradient
            colors={canSubmit ? ['#E04079', '#C0315E'] : ['#D1D5DB', '#D1D5DB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.cta}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <View style={s.ctaInner}>
                <Ionicons name="lock-closed" size={18} color={WHITE} />
                <Text style={s.ctaText}>Set PIN</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: WHITE,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT1 },
  headerSpacer: { width: 38 },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  // Hero
  hero: {
    borderRadius: 24, padding: 24, marginBottom: 20,
    overflow: 'hidden', alignItems: 'center',
    ...Platform.select({
      android: { elevation: 6 },
      ios: { shadowColor: PINK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
    }),
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: WHITE, letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
  heroDecor1: {
    position: 'absolute', right: -30, top: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroDecor2: {
    position: 'absolute', left: -20, bottom: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    }),
  },
  fieldBlock: { marginBottom: 4 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  fieldIconWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center',
  },
  fieldIconWrapActive: { backgroundColor: PINK_M },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: TEXT2, letterSpacing: 0.3, textTransform: 'uppercase', flex: 1 },
  fieldLabelActive: { color: PINK },
  checkBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
  },

  // PIN row
  pinRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 12, borderRadius: 14,
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: BORDER,
  },
  pinRowActive: { borderColor: PINK, backgroundColor: PINK_S },
  pinBox: {
    width: 54, height: 54, borderRadius: 14,
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  pinBoxFilled: { backgroundColor: PINK_S, borderColor: PINK },
  pinBoxCursor: { borderColor: PINK, borderWidth: 2 },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: PINK },
  pinDigit: { fontSize: 22, fontWeight: '800', color: PINK },
  cursor: { width: 2, height: 26, backgroundColor: PINK, borderRadius: 1 },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 18 },

  revealRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingTop: 14,
  },
  revealText: { fontSize: 13, fontWeight: '600', color: TEXT2 },

  // Tips
  tipsCard: {
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: '#DBEAFE',
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tipsIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#1D4ED8' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#93C5FD', marginTop: 5 },
  tipText: { flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 18 },

  // Numpad
  numpad: { marginBottom: 20 },
  numpadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  numpadKey: {
    flex: 1, marginHorizontal: 6, height: 60, borderRadius: 16,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 1 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
    }),
  },
  numpadBackKey: { backgroundColor: PINK_S, borderColor: PINK_M },
  numpadEmpty: { flex: 1, marginHorizontal: 6 },
  numpadKeyText: { fontSize: 22, fontWeight: '600', color: TEXT1 },

  // CTA
  cta: { paddingVertical: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '700', color: WHITE, letterSpacing: -0.2 },
});

export default SetWithdrawalPinScreen;
