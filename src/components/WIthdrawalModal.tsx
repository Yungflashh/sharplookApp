import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  StyleSheet,
  Platform,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { walletAPI, handleAPIError } from '@/api/api';

interface WithdrawalModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

interface Bank {
  name: string;
  code: string;
}

// ── Design tokens (aligned with OfferDetail / CreateBooking) ──────────────────
const PINK      = '#E04079';
const PINK_DK   = '#B5315F';
const PINK_SOFT = '#FEE2F0';
const PINK_BG   = '#FFF5F9';

const INK       = '#0F172A';
const INK_2     = '#475569';
const INK_3     = '#94A3B8';
const SURFACE   = '#FFFFFF';
const SURFACE_2 = '#F8FAFC';
const BORDER    = '#E2E8F0';
const BORDER_L  = '#F1F5F9';

const SUCCESS    = '#10B981';
const SUCCESS_BG = '#ECFDF5';

const FALLBACK_NIGERIAN_BANKS: Bank[] = [
  { name: '🧪 Test Bank (For Testing Only)', code: '001' },
  { name: 'Access Bank', code: '044' },
  { name: 'GTBank', code: '058' },
  { name: 'First Bank', code: '011' },
  { name: 'UBA', code: '033' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'FCMB', code: '214' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank', code: '032' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Standard Chartered', code: '068' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Ecobank', code: '050' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '999992' },
  { name: 'Palmpay', code: '999991' },
];

const BANK_PALETTE = [
  { bg: '#EFF6FF', text: '#1D4ED8' },
  { bg: '#FAF5FF', text: '#7C3AED' },
  { bg: '#FFF0F7', text: '#BE185D' },
  { bg: '#F0FDF4', text: '#15803D' },
  { bg: '#FFF7ED', text: '#C2410C' },
  { bg: '#FEF2F2', text: '#B91C1C' },
  { bg: '#EEF2FF', text: '#4338CA' },
];

const getBankInitials = (name: string) => {
  const words = name.split(' ').filter(w => /[a-zA-Z]/.test(w));
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

const getBankColors = (name: string) =>
  BANK_PALETTE[name.charCodeAt(0) % BANK_PALETTE.length];

// ── Step Indicator ────────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ step: 1 | 2 }> = ({ step }) => (
  <View style={si.row}>
    <View style={si.cell}>
      <View style={[si.dot, si.dotActive]}>
        {step > 1
          ? <Ionicons name="checkmark" size={13} color="#fff" />
          : <Text style={si.dotText}>1</Text>}
      </View>
      <Text style={[si.label, si.labelActive]}>Bank Details</Text>
    </View>
    <View style={si.lineWrap}>
      <View style={[si.line, step === 2 && si.lineActive]} />
    </View>
    <View style={si.cell}>
      <View style={[si.dot, step === 2 ? si.dotActive : si.dotInactive]}>
        <Text style={[si.dotText, step === 1 && si.dotTextInactive]}>2</Text>
      </View>
      <Text style={[si.label, step === 2 && si.labelActive]}>Enter PIN</Text>
    </View>
  </View>
);

const si = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 30, paddingBottom: 20, paddingTop: 4,
  },
  cell: { alignItems: 'center', width: 90 },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: PINK },
  dotInactive: { backgroundColor: BORDER },
  dotText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  dotTextInactive: { color: INK_3 },
  lineWrap: { flex: 1, justifyContent: 'flex-start', paddingTop: 12, paddingHorizontal: 4 },
  line: { height: 2, backgroundColor: BORDER, borderRadius: 1 },
  lineActive: { backgroundColor: PINK },
  label: { fontSize: 11, fontWeight: '600', color: INK_3, marginTop: 8 },
  labelActive: { color: INK, fontWeight: '700' },
});

// ── Main Component ────────────────────────────────────────────────────────────

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  visible, onClose, onSuccess, currentBalance,
}) => {
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [accountVerified, setAccountVerified] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [banks, setBanks] = useState<Bank[]>(FALLBACK_NIGERIAN_BANKS);
  const navigation = useNavigation();
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();

  // Manual keyboard tracking: KAV inside a translucent Android modal adds
  // residual padding for the nav-bar insets even with the keyboard closed,
  // creating a bottom gap. Track height ourselves and add it as padding on
  // the overlay only while the keyboard is open.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => { if (visible) fetchBanks(); }, [visible]);

  useEffect(() => {
    if (bankCode && accountNumber.length === 10) verifyAccount();
    else { setAccountName(''); setAccountVerified(false); }
  }, [bankCode, accountNumber]);

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true);
      const response = await walletAPI.getBankList('nigeria');
      setBanks(response.success && response.data?.banks ? response.data.banks : FALLBACK_NIGERIAN_BANKS);
    } catch {
      setBanks(FALLBACK_NIGERIAN_BANKS);
    } finally {
      setLoadingBanks(false);
    }
  };

  const verifyAccount = async () => {
    try {
      setVerifyingAccount(true);
      setAccountName('');
      setAccountVerified(false);
      const response = await walletAPI.verifyBankAccount({ accountNumber, bankCode });
      if (response.success && response.data?.accountName) {
        setAccountName(response.data.accountName);
        setAccountVerified(true);
      } else {
        toast.error('Verification Failed', 'Could not verify account. Please check and retry.');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Verification Error', apiError.message);
    } finally {
      setVerifyingAccount(false);
    }
  };

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;
  const getNetAmount = () => (parseFloat(amount) || 0) - 100;

  const validateStep1 = (): boolean => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 1000) { toast.error('Invalid Amount', 'Minimum withdrawal is ₦1,000'); return false; }
    if (amt > currentBalance) { toast.error('Insufficient Balance', `Balance is ${formatCurrency(currentBalance)}`); return false; }
    if (!bankName || !bankCode) { toast.error('Bank Required', 'Please select your bank'); return false; }
    if (accountNumber.length !== 10) { toast.error('Invalid Account', 'Account number must be 10 digits'); return false; }
    if (!accountVerified) { toast.warning('Not Verified', 'Please wait for account verification'); return false; }
    return true;
  };

  const handleBankSelect = (bank: Bank) => {
    setBankName(bank.name);
    setBankCode(bank.code);
    setShowBankPicker(false);
    setBankSearchQuery('');
    setAccountNumber('');
    setAccountName('');
    setAccountVerified(false);
  };

  const handleWithdrawal = async () => {
    if (pin.length !== 4) { toast.error('Invalid PIN', 'PIN must be 4 digits'); return; }
    try {
      setLoading(true);
      const response = await walletAPI.requestWithdrawal({
        amount: parseFloat(amount), bankName, bankCode, accountNumber, accountName: accountName.trim(), pin,
      });
      if (response.success) {
        toast.success('Withdrawal Requested', 'Your request has been submitted and will be processed within 24 hours.');
        handleClose();
        onSuccess();
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      const msg = apiError.message || '';
      if (apiError.code === 'PIN_NOT_SET') {
        toast.info('PIN Required', 'Please set up your withdrawal PIN first');
        handleClose();
        navigation.navigate('SetWithdrawalPin' as never);
      } else if (apiError.code === 'PIN_INVALID') {
        setPin('');
        toast.error('Incorrect PIN', 'The PIN you entered is incorrect. Please try again.');
      } else {
        toast.error('Withdrawal Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount(''); setBankName(''); setBankCode('');
    setAccountNumber(''); setAccountName(''); setPin('');
    setAccountVerified(false); setStep(1);
    onClose();
  };

  const filteredBanks = bankSearchQuery.trim()
    ? banks.filter(b => b.name.toLowerCase().includes(bankSearchQuery.toLowerCase()))
    : banks;

  const canContinue = !loading && !verifyingAccount && accountVerified;
  const canConfirm = pin.length === 4 && !loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.overlay, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
        <View style={styles.kav}>
          <View style={[styles.sheet, { paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom }]}>
            {/* Grabber */}
            <View style={styles.handleWrap}><View style={styles.handle} /></View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {step === 2 && (
                  <TouchableOpacity onPress={() => setStep(1)} style={styles.iconBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={20} color={INK} />
                  </TouchableOpacity>
                )}
                <View>
                  <Text style={styles.headerTitle}>Withdraw</Text>
                  <Text style={styles.headerSub}>{step === 1 ? 'Bank account details' : 'Confirm with your PIN'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.iconBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={INK} />
              </TouchableOpacity>
            </View>

            <StepIndicator step={step} />

            <ScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 1 ? (
                <>
                  {/* Balance card */}
                  <LinearGradient
                    colors={[PINK, PINK_DK]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.balanceCard}
                  >
                    <View style={styles.balanceHeader}>
                      <View style={styles.balanceIcon}>
                        <Ionicons name="wallet" size={16} color="#fff" />
                      </View>
                      <Text style={styles.balanceLabel}>Available balance</Text>
                    </View>
                    <Text style={styles.balanceAmount}>{formatCurrency(currentBalance)}</Text>
                    <View style={styles.balanceBlob} />
                    <View style={styles.balanceBlobSmall} />
                  </LinearGradient>

                  {/* Amount */}
                  <Text style={styles.sectionLabel}>Amount</Text>
                  <View style={styles.amountWrap}>
                    <Text style={styles.amountPrefix}>₦</Text>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0"
                      keyboardType="numeric"
                      style={styles.amountInput}
                      placeholderTextColor={INK_3}
                    />
                    {amount.length > 0 && (
                      <TouchableOpacity onPress={() => setAmount('')} activeOpacity={0.7} style={styles.amountClear}>
                        <Ionicons name="close-circle" size={20} color={INK_3} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.hint}>Minimum ₦1,000 · Transfer fee ₦100</Text>

                  {/* Fee breakdown */}
                  {amount && parseFloat(amount) >= 1000 && (
                    <View style={styles.breakdown}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLbl}>Withdrawal</Text>
                        <Text style={styles.breakdownVal}>{formatCurrency(parseFloat(amount))}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLbl}>Transfer fee</Text>
                        <Text style={[styles.breakdownVal, { color: INK_2 }]}>−₦100</Text>
                      </View>
                      <View style={styles.breakdownDiv} />
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownTotalLbl}>You'll receive</Text>
                        <Text style={styles.breakdownTotalVal}>{formatCurrency(getNetAmount())}</Text>
                      </View>
                    </View>
                  )}

                  {/* Bank */}
                  <Text style={styles.sectionLabel}>Bank</Text>
                  <TouchableOpacity
                    onPress={() => { setShowBankPicker(p => !p); setBankSearchQuery(''); }}
                    disabled={loadingBanks}
                    style={[styles.selector, showBankPicker && styles.selectorOpen]}
                    activeOpacity={0.75}
                  >
                    {loadingBanks ? (
                      <View style={styles.selectorInner}>
                        <ActivityIndicator size="small" color={PINK} />
                        <Text style={styles.selectorPlaceholder}>Loading banks…</Text>
                      </View>
                    ) : (
                      <View style={styles.selectorInner}>
                        {bankName ? (
                          <>
                            <View style={[styles.bankInitialCircle, { backgroundColor: getBankColors(bankName).bg }]}>
                              <Text style={[styles.bankInitialText, { color: getBankColors(bankName).text }]}>
                                {getBankInitials(bankName)}
                              </Text>
                            </View>
                            <Text style={styles.selectorValue} numberOfLines={1}>{bankName}</Text>
                          </>
                        ) : (
                          <Text style={styles.selectorPlaceholder}>Choose a bank</Text>
                        )}
                      </View>
                    )}
                    <Ionicons
                      name={showBankPicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={showBankPicker ? PINK : INK_3}
                    />
                  </TouchableOpacity>

                  {showBankPicker && (
                    <View style={styles.dropdown}>
                      <View style={styles.dropdownSearch}>
                        <Ionicons name="search-outline" size={16} color={INK_3} />
                        <TextInput
                          value={bankSearchQuery}
                          onChangeText={setBankSearchQuery}
                          placeholder="Search banks"
                          style={styles.dropdownSearchInput}
                          placeholderTextColor={INK_3}
                          autoFocus
                        />
                        {bankSearchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setBankSearchQuery('')} activeOpacity={0.7}>
                            <Ionicons name="close-circle" size={16} color={INK_3} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <ScrollView
                        style={styles.dropdownList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                      >
                        {filteredBanks.length === 0 ? (
                          <View style={styles.dropdownEmpty}>
                            <Ionicons name="search-outline" size={30} color={BORDER} />
                            <Text style={styles.dropdownEmptyTxt}>No banks match your search</Text>
                          </View>
                        ) : (
                          filteredBanks.map((item, index) => {
                            const c = getBankColors(item.name);
                            const active = bankCode === item.code;
                            return (
                              <TouchableOpacity
                                key={`${item.code}-${index}`}
                                onPress={() => handleBankSelect(item)}
                                style={[styles.bankItem, active && styles.bankItemActive]}
                                activeOpacity={0.7}
                              >
                                <View style={[styles.bankItemIcon, { backgroundColor: c.bg }]}>
                                  <Text style={[styles.bankItemInitial, { color: c.text }]}>
                                    {getBankInitials(item.name)}
                                  </Text>
                                </View>
                                <Text style={[styles.bankItemName, active && styles.bankItemNameActive]} numberOfLines={1}>
                                  {item.name}
                                </Text>
                                {active && <Ionicons name="checkmark-circle" size={18} color={PINK} />}
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>
                  )}

                  {/* Account Number */}
                  <Text style={styles.sectionLabel}>Account Number</Text>
                  <View style={[
                    styles.input,
                    verifyingAccount && { borderColor: PINK },
                    accountVerified && { borderColor: SUCCESS, backgroundColor: SUCCESS_BG },
                  ]}>
                    <TextInput
                      value={accountNumber}
                      onChangeText={t => setAccountNumber(t.replace(/[^0-9]/g, ''))}
                      placeholder={bankCode ? '10-digit account number' : 'Select a bank first'}
                      keyboardType="numeric"
                      maxLength={10}
                      editable={!!bankCode}
                      style={[styles.inputText, !bankCode && { color: INK_3 }]}
                      placeholderTextColor={INK_3}
                    />
                    {verifyingAccount && <ActivityIndicator size="small" color={PINK} style={{ marginRight: 4 }} />}
                    {accountVerified && !verifyingAccount && (
                      <Ionicons name="checkmark-circle" size={22} color={SUCCESS} style={{ marginRight: 4 }} />
                    )}
                  </View>
                  {verifyingAccount && <Text style={styles.verifyingTxt}>Verifying account…</Text>}

                  {/* Account Name */}
                  {accountName && accountVerified && (
                    <View style={styles.accountCard}>
                      <View style={styles.accountAvatar}>
                        <Ionicons name="person" size={16} color={SUCCESS} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accountMeta}>Account holder</Text>
                        <Text style={styles.accountName}>{accountName}</Text>
                      </View>
                    </View>
                  )}

                  {/* Continue */}
                  <TouchableOpacity
                    onPress={() => validateStep1() && setStep(2)}
                    disabled={!canContinue}
                    activeOpacity={0.85}
                    style={[styles.ctaWrap, { marginTop: 6 }]}
                  >
                    <LinearGradient
                      colors={canContinue ? [PINK, PINK_DK] : [BORDER, BORDER]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.cta}
                    >
                      <Text style={[styles.ctaTxt, !canContinue && { color: INK_3 }]}>Continue</Text>
                      {canContinue && <Ionicons name="arrow-forward" size={18} color="#fff" />}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Summary card — pink, matches step 1 balance card */}
                  <LinearGradient
                    colors={[PINK, PINK_DK]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.summary}
                  >
                    <Text style={styles.summaryMeta}>You're sending</Text>
                    <Text style={styles.summaryAmount}>{formatCurrency(parseFloat(amount))}</Text>
                    <View style={styles.summaryDiv} />
                    <View style={styles.summaryRow}>
                      <View style={[styles.summaryBankIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                        <Text style={styles.summaryBankInitial}>{getBankInitials(bankName)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.summaryBankName} numberOfLines={1}>{bankName}</Text>
                        <Text style={styles.summaryAccountInfo} numberOfLines={1}>{accountNumber} · {accountName}</Text>
                      </View>
                    </View>
                    <View style={styles.balanceBlob} />
                    <View style={styles.balanceBlobSmall} />
                  </LinearGradient>

                  {/* Net you'll receive */}
                  <View style={styles.netRow}>
                    <Text style={styles.netLbl}>You'll receive</Text>
                    <Text style={styles.netVal}>{formatCurrency(getNetAmount())}</Text>
                  </View>

                  {/* PIN section */}
                  <Text style={[styles.sectionLabel, { marginTop: 4 }]}>Withdrawal PIN</Text>

                  <View style={{ position: 'relative' }}>
                    {/* Hidden functional input (autofocuses; keyboard drives the visible boxes) */}
                    <TextInput
                      value={pin}
                      onChangeText={t => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
                      keyboardType="numeric"
                      maxLength={4}
                      style={styles.pinHidden}
                      autoFocus
                      caretHidden
                    />
                    {/* Visible boxes */}
                    <View style={styles.pinBoxes} pointerEvents="none">
                      {[0, 1, 2, 3].map(i => {
                        const filled = i < pin.length;
                        return (
                          <View
                            key={i}
                            style={[styles.pinBox, filled && styles.pinBoxFilled]}
                          >
                            {filled ? <View style={styles.pinBoxDot} /> : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  <Text style={styles.pinHint}>Enter your 4-digit security PIN</Text>

                  {/* Security note (pink, on-brand) */}
                  <View style={styles.security}>
                    <View style={styles.securityIcon}>
                      <Ionicons name="shield-checkmark" size={16} color={PINK} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.securityTitle}>Secure transfer</Text>
                      <Text style={styles.securityBody}>Processed within 24 hours to your verified account.</Text>
                    </View>
                  </View>

                  {/* Confirm */}
                  <TouchableOpacity
                    onPress={handleWithdrawal}
                    disabled={!canConfirm}
                    activeOpacity={0.85}
                    style={styles.ctaWrap}
                  >
                    <LinearGradient
                      colors={canConfirm ? [PINK, PINK_DK] : [BORDER, BORDER]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.cta}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="lock-closed" size={16} color={canConfirm ? '#fff' : INK_3} />
                          <Text style={[styles.ctaTxt, !canConfirm && { color: INK_3 }]}>Confirm withdrawal</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  kav: { width: '100%' },
  sheet: {
    width: '100%',
    backgroundColor: SURFACE, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 24,
  },

  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: SURFACE_2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER_L,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: INK, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: INK_2, marginTop: 2, fontWeight: '500' },

  scroll: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 20 },

  // Balance card
  balanceCard: {
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 20, marginBottom: 22, overflow: 'hidden',
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  balanceIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  balanceBlob: {
    position: 'absolute', right: -28, top: -28,
    width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  balanceBlobSmall: {
    position: 'absolute', right: 40, top: 20,
    width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.10)',
  },

  // Section
  sectionLabel: { fontSize: 13, fontWeight: '700', color: INK, marginBottom: 10 },
  hint: { fontSize: 12, color: INK_2, marginTop: 6, marginBottom: 18, fontWeight: '500' },

  // Amount input
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 4,
  },
  amountPrefix: { fontSize: 22, fontWeight: '700', color: INK_2, marginRight: 6 },
  amountInput: { flex: 1, paddingVertical: 12, fontSize: 22, fontWeight: '800', color: INK, letterSpacing: -0.5 },
  amountClear: { padding: 4 },

  // Fee breakdown
  breakdown: {
    backgroundColor: PINK_BG, borderRadius: 14, padding: 16, marginBottom: 22,
    borderWidth: 1, borderColor: PINK_SOFT,
  },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  breakdownLbl: { fontSize: 13, color: INK_2, fontWeight: '500' },
  breakdownVal: { fontSize: 14, fontWeight: '700', color: INK },
  breakdownDiv: { height: 1, backgroundColor: PINK_SOFT, marginBottom: 10 },
  breakdownTotalLbl: { fontSize: 14, fontWeight: '700', color: INK },
  breakdownTotalVal: { fontSize: 18, fontWeight: '800', color: PINK, letterSpacing: -0.4 },

  // Selector (bank)
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: BORDER, minHeight: 56,
  },
  selectorOpen: { borderColor: PINK, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  selectorInner: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  selectorValue: { fontSize: 15, fontWeight: '600', color: INK, flex: 1 },
  selectorPlaceholder: { fontSize: 15, color: INK_3, fontWeight: '500' },
  bankInitialCircle: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bankInitialText: { fontSize: 12, fontWeight: '800' },

  // Dropdown
  dropdown: {
    borderWidth: 1.5, borderTopWidth: 0, borderColor: PINK,
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    backgroundColor: SURFACE, marginBottom: 22, overflow: 'hidden',
  },
  dropdownSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: SURFACE_2, borderBottomWidth: 1, borderBottomColor: BORDER_L,
  },
  dropdownSearchInput: { flex: 1, fontSize: 14, color: INK, fontWeight: '500', paddingVertical: 2 },
  dropdownList: { maxHeight: 240 },
  dropdownEmpty: { paddingVertical: 30, alignItems: 'center', gap: 8 },
  dropdownEmptyTxt: { fontSize: 13, color: INK_3, fontWeight: '500' },
  bankItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER_L,
  },
  bankItemActive: { backgroundColor: PINK_BG },
  bankItemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bankItemInitial: { fontSize: 13, fontWeight: '800' },
  bankItemName: { flex: 1, fontSize: 14, fontWeight: '500', color: INK },
  bankItemNameActive: { color: PINK, fontWeight: '700' },

  // Generic input (account number)
  input: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, minHeight: 56,
  },
  inputText: { flex: 1, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: INK, letterSpacing: 0.5 },
  verifyingTxt: { fontSize: 12, color: PINK, fontWeight: '600', marginTop: 6, marginBottom: 12 },

  // Account holder card
  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SUCCESS_BG, borderRadius: 14, padding: 12, marginTop: 12, marginBottom: 22,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  accountAvatar: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#D1FAE5',
    alignItems: 'center', justifyContent: 'center',
  },
  accountMeta: { fontSize: 11, color: '#059669', fontWeight: '700', marginBottom: 2, letterSpacing: 0.3, textTransform: 'uppercase' },
  accountName: { fontSize: 15, fontWeight: '700', color: '#065F46' },

  // Summary (Step 2) — same pink family as balance card
  summary: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 20, marginBottom: 18, overflow: 'hidden' },
  summaryMeta: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryAmount: { fontSize: 34, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 14 },
  summaryDiv: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryBankIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  summaryBankInitial: { fontSize: 13, fontWeight: '800', color: '#fff' },
  summaryBankName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  summaryAccountInfo: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Net row
  netRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: PINK_BG, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20,
    borderWidth: 1, borderColor: PINK_SOFT,
  },
  netLbl: { fontSize: 13, fontWeight: '700', color: INK_2 },
  netVal: { fontSize: 18, fontWeight: '800', color: PINK, letterSpacing: -0.4 },

  // PIN
  pinHidden: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0, fontSize: 1, color: 'transparent',
  },
  pinBoxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  pinBox: {
    flex: 1, height: 60, borderRadius: 14,
    backgroundColor: SURFACE_2, borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  pinBoxFilled: { backgroundColor: PINK_BG, borderColor: PINK },
  pinBoxDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: PINK },
  pinHint: { fontSize: 12, color: INK_2, textAlign: 'center', marginTop: 12, marginBottom: 18, fontWeight: '500' },

  // Security
  security: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: PINK_BG, borderRadius: 14, padding: 14, marginBottom: 18,
    borderWidth: 1, borderColor: PINK_SOFT,
  },
  securityIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: PINK_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  securityTitle: { fontSize: 13, fontWeight: '800', color: INK, marginBottom: 2 },
  securityBody: { fontSize: 12, color: INK_2, lineHeight: 17 },

  // CTA
  ctaWrap: { borderRadius: 16, overflow: 'hidden' },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  ctaTxt: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
});

export default WithdrawalModal;
