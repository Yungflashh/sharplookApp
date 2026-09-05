import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
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

// ─── Step Indicator ───────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ step: 1 | 2 }> = ({ step }) => (
  <View style={si.row}>
    <View style={[si.dot, si.dotActive]}>
      {step > 1
        ? <Ionicons name="checkmark" size={12} color="#fff" />
        : <Text style={si.dotText}>1</Text>}
    </View>
    <View style={[si.line, step === 2 && si.lineActive]} />
    <View style={[si.dot, step === 2 && si.dotActive, step === 1 && si.dotInactive]}>
      <Text style={[si.dotText, step === 1 && si.dotTextInactive]}>2</Text>
    </View>
    <View style={si.labelRow}>
      <Text style={[si.label, si.labelLeft]}>Bank Details</Text>
      <Text style={[si.label, si.labelRight]}>Confirm PIN</Text>
    </View>
  </View>
);

const si = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingBottom: 20, paddingTop: 4, position: 'relative' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  dotActive: { backgroundColor: '#E04079' },
  dotInactive: { backgroundColor: '#E5E5EA' },
  dotText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  dotTextInactive: { color: '#8E8E93' },
  line: { flex: 1, height: 2, backgroundColor: '#E5E5EA', marginHorizontal: 6 },
  lineActive: { backgroundColor: '#E04079' },
  labelRow: { position: 'absolute', bottom: 2, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 10, fontWeight: '600', color: '#8E8E93' },
  labelLeft: { marginLeft: 2 },
  labelRight: { marginRight: 2 },
});

// ─── Main Component ───────────────────────────────────────────────────────────

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
      // Only redirect to Set PIN when the backend explicitly says there is no PIN.
      // Wrong-PIN and other errors must stay in the modal so the user can retry.
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
    <>
      {/* ── Main Modal ─────────────────────────────────────────────────── */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.sheet}>

            {/* Handle */}
            <View style={styles.handleWrap}><View style={styles.handle} /></View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {step === 2 && (
                  <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={20} color="#3A3A3C" />
                  </TouchableOpacity>
                )}
                <View>
                  <Text style={styles.headerTitle}>Withdraw Funds</Text>
                  <Text style={styles.headerSub}>Step {step} of 2</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color="#3A3A3C" />
              </TouchableOpacity>
            </View>

            {/* Step Indicator */}
            <StepIndicator step={step} />

            <ScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 1 ? (
                <>
                  {/* Balance Card */}
                  <LinearGradient colors={['#E04079', '#C0315E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceAmount}>{formatCurrency(currentBalance)}</Text>
                    <View style={styles.balanceDecor} />
                  </LinearGradient>

                  {/* Amount */}
                  <Text style={styles.sectionLabel}>Amount to Withdraw</Text>
                  <View style={styles.inputWrap}>
                    <View style={styles.inputPrefix}>
                      <Text style={styles.inputPrefixText}>₦</Text>
                    </View>
                    <TextInput
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      keyboardType="numeric"
                      style={styles.input}
                      placeholderTextColor="#C7C7CC"
                    />
                    {amount.length > 0 && (
                      <TouchableOpacity onPress={() => setAmount('')} style={styles.inputClear} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={18} color="#C7C7CC" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.inputHint}>Minimum ₦1,000 · Transfer fee ₦100</Text>

                  {/* Fee Breakdown */}
                  {amount && parseFloat(amount) >= 1000 && (
                    <View style={styles.feeCard}>
                      <View style={styles.feeRow}>
                        <Text style={styles.feeLabel}>Withdrawal amount</Text>
                        <Text style={styles.feeValue}>{formatCurrency(parseFloat(amount))}</Text>
                      </View>
                      <View style={styles.feeRow}>
                        <Text style={styles.feeLabel}>Transfer fee</Text>
                        <Text style={[styles.feeValue, { color: '#DC2626' }]}>-₦100</Text>
                      </View>
                      <View style={styles.feeDivider} />
                      <View style={styles.feeRow}>
                        <Text style={styles.feeTotalLabel}>You'll receive</Text>
                        <Text style={styles.feeTotalValue}>{formatCurrency(getNetAmount())}</Text>
                      </View>
                    </View>
                  )}

                  {/* Bank Selector — inline picker (avoids nested Modal iOS bug) */}
                  <Text style={styles.sectionLabel}>Bank</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowBankPicker(p => !p);
                      setBankSearchQuery('');
                    }}
                    disabled={loadingBanks}
                    style={[styles.bankSelector, showBankPicker && styles.bankSelectorOpen]}
                    activeOpacity={0.75}
                  >
                    {loadingBanks ? (
                      <View style={styles.bankSelectorInner}>
                        <ActivityIndicator size="small" color="#E04079" />
                        <Text style={styles.bankSelectorPlaceholder}>Loading banks…</Text>
                      </View>
                    ) : (
                      <View style={styles.bankSelectorInner}>
                        {bankName ? (
                          <>
                            <View style={[styles.bankInitialCircle, { backgroundColor: getBankColors(bankName).bg }]}>
                              <Text style={[styles.bankInitialText, { color: getBankColors(bankName).text }]}>
                                {getBankInitials(bankName)}
                              </Text>
                            </View>
                            <Text style={styles.bankSelectorValue}>{bankName}</Text>
                          </>
                        ) : (
                          <Text style={styles.bankSelectorPlaceholder}>Choose your bank…</Text>
                        )}
                      </View>
                    )}
                    <Ionicons
                      name={showBankPicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={showBankPicker ? '#E04079' : '#8E8E93'}
                    />
                  </TouchableOpacity>

                  {/* Inline Bank Dropdown */}
                  {showBankPicker && (
                    <View style={styles.bankDropdown}>
                      {/* Search */}
                      <View style={styles.bankDropdownSearch}>
                        <Ionicons name="search-outline" size={16} color="#8E8E93" />
                        <TextInput
                          value={bankSearchQuery}
                          onChangeText={setBankSearchQuery}
                          placeholder="Search banks…"
                          style={styles.bankDropdownSearchInput}
                          placeholderTextColor="#C7C7CC"
                          autoFocus
                        />
                        {bankSearchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setBankSearchQuery('')} activeOpacity={0.7}>
                            <Ionicons name="close-circle" size={16} color="#C7C7CC" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Bank list — fixed height scroll */}
                      <ScrollView
                        style={styles.bankDropdownList}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                      >
                        {filteredBanks.length === 0 ? (
                          <View style={styles.bankDropdownEmpty}>
                            <Ionicons name="search-outline" size={32} color="#D1D5DB" />
                            <Text style={styles.bankDropdownEmptyText}>No banks found</Text>
                          </View>
                        ) : (
                          filteredBanks.map((item, index) => {
                            const colors = getBankColors(item.name);
                            const active = bankCode === item.code;
                            return (
                              <TouchableOpacity
                                key={`${item.code}-${index}`}
                                onPress={() => handleBankSelect(item)}
                                style={[styles.bankDropdownItem, active && styles.bankDropdownItemActive]}
                                activeOpacity={0.7}
                              >
                                <View style={[styles.bankItemIcon, { backgroundColor: colors.bg }]}>
                                  <Text style={[styles.bankItemInitial, { color: colors.text }]}>
                                    {getBankInitials(item.name)}
                                  </Text>
                                </View>
                                <Text style={[styles.bankItemName, active && styles.bankItemNameActive]}>
                                  {item.name}
                                </Text>
                                {active && <Ionicons name="checkmark-circle" size={18} color="#E04079" />}
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
                    styles.accountInputWrap,
                    verifyingAccount && { borderColor: '#E04079' },
                    accountVerified && { borderColor: '#16A34A' },
                  ]}>
                    <TextInput
                      value={accountNumber}
                      onChangeText={t => setAccountNumber(t.replace(/[^0-9]/g, ''))}
                      placeholder={bankCode ? '10-digit account number' : 'Select a bank first'}
                      keyboardType="numeric"
                      maxLength={10}
                      editable={!!bankCode}
                      style={[styles.accountInput, !bankCode && { color: '#C7C7CC' }]}
                      placeholderTextColor="#C7C7CC"
                    />
                    {verifyingAccount && <ActivityIndicator size="small" color="#E04079" style={{ marginRight: 14 }} />}
                    {accountVerified && !verifyingAccount && (
                      <Ionicons name="checkmark-circle" size={22} color="#16A34A" style={{ marginRight: 14 }} />
                    )}
                  </View>
                  {verifyingAccount && (
                    <Text style={styles.verifyingText}>Verifying account…</Text>
                  )}

                  {/* Account Name */}
                  {accountName && accountVerified && (
                    <View style={styles.accountNameCard}>
                      <View style={styles.accountNameIcon}>
                        <Ionicons name="person-circle" size={22} color="#16A34A" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accountNameMeta}>Account Holder</Text>
                        <Text style={styles.accountNameValue}>{accountName}</Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                    </View>
                  )}

                  {/* Continue */}
                  <TouchableOpacity
                    onPress={() => validateStep1() && setStep(2)}
                    disabled={!canContinue}
                    activeOpacity={0.85}
                    style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}
                  >
                    <LinearGradient
                      colors={canContinue ? ['#E04079', '#C0315E'] : ['#D1D5DB', '#D1D5DB']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.ctaBtn}
                    >
                      <View style={styles.ctaBtnInner}>
                        <Text style={styles.ctaBtnText}>Continue</Text>
                        <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Summary Card */}
                  <LinearGradient colors={['#1C1C1E', '#3A3A3C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
                    <Text style={styles.summaryMeta}>Withdrawing to</Text>
                    <Text style={styles.summaryAmount}>{formatCurrency(parseFloat(amount))}</Text>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryBankRow}>
                      <View style={[styles.summaryBankIcon, { backgroundColor: getBankColors(bankName).bg }]}>
                        <Text style={[styles.summaryBankInitial, { color: getBankColors(bankName).text }]}>
                          {getBankInitials(bankName)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.summaryBankName}>{bankName}</Text>
                        <Text style={styles.summaryAccountInfo}>{accountNumber} · {accountName}</Text>
                      </View>
                    </View>
                  </LinearGradient>

                  {/* PIN */}
                  <Text style={styles.sectionLabel}>Withdrawal PIN</Text>
                  <TextInput
                    value={pin}
                    onChangeText={t => setPin(t.replace(/[^0-9]/g, ''))}
                    placeholder="••••"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    style={styles.pinInput}
                    placeholderTextColor="#C7C7CC"
                  />

                  {/* PIN dots visual */}
                  <View style={styles.pinDotsRow}>
                    {[0, 1, 2, 3].map(i => (
                      <View key={i} style={[styles.pinDot, i < pin.length && styles.pinDotFilled]} />
                    ))}
                  </View>
                  <Text style={styles.pinHint}>Enter your 4-digit security PIN</Text>

                  {/* Security Note */}
                  <View style={styles.securityCard}>
                    <View style={styles.securityIconWrap}>
                      <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.securityTitle}>Secure Transfer</Text>
                      <Text style={styles.securityBody}>
                        Processed within 24 hours to your verified account.
                      </Text>
                    </View>
                  </View>

                  {/* Net receive reminder */}
                  <View style={styles.netCard}>
                    <Text style={styles.netLabel}>You'll receive</Text>
                    <Text style={styles.netValue}>{formatCurrency(getNetAmount())}</Text>
                  </View>

                  {/* Confirm */}
                  <TouchableOpacity
                    onPress={handleWithdrawal}
                    disabled={!canConfirm}
                    activeOpacity={0.85}
                    style={{ borderRadius: 16, overflow: 'hidden' }}
                  >
                    <LinearGradient
                      colors={canConfirm ? ['#E04079', '#C0315E'] : ['#D1D5DB', '#D1D5DB']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.ctaBtn}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <View style={styles.ctaBtnInner}>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.ctaBtnText}>Confirm Withdrawal</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        </View>
      </Modal>

    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '93%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },

  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 10, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },

  // Balance Card
  balanceCard: {
    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 22, marginBottom: 24, overflow: 'hidden',
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  balanceDecor: { position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#3A3A3C', letterSpacing: 0.2, marginBottom: 10, textTransform: 'uppercase' },

  // Amount Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E5EA',
    overflow: 'hidden', marginBottom: 8,
  },
  inputPrefix: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#E9E9EE' },
  inputPrefixText: { fontSize: 18, fontWeight: '700', color: '#6C6C70' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  inputClear: { paddingHorizontal: 12 },
  inputHint: { fontSize: 12, color: '#8E8E93', marginBottom: 20, fontWeight: '500' },

  // Fee Breakdown
  feeCard: {
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#E5E5EA',
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  feeLabel: { fontSize: 14, color: '#6C6C70', fontWeight: '500' },
  feeValue: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  feeDivider: { height: 1, backgroundColor: '#E5E5EA', marginBottom: 10 },
  feeTotalLabel: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  feeTotalValue: { fontSize: 18, fontWeight: '800', color: '#E04079', letterSpacing: -0.5 },

  // Bank Selector
  bankSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F2F2F7', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#E5E5EA', marginBottom: 2,
  },
  bankSelectorOpen: { borderColor: '#E04079', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  bankSelectorInner: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  bankSelectorValue: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  bankSelectorPlaceholder: { fontSize: 15, color: '#C7C7CC' },
  bankInitialCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bankInitialText: { fontSize: 12, fontWeight: '800' },

  // Inline Bank Dropdown
  bankDropdown: {
    borderWidth: 1.5, borderTopWidth: 0, borderColor: '#E04079',
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    backgroundColor: '#fff', marginBottom: 20, overflow: 'hidden',
  },
  bankDropdownSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#F9F9F9', borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  bankDropdownSearchInput: { flex: 1, fontSize: 14, color: '#1C1C1E', fontWeight: '500', paddingVertical: 2 },
  bankDropdownList: { maxHeight: 220 },
  bankDropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  bankDropdownItemActive: { backgroundColor: '#FFF0F7' },
  bankDropdownEmpty: { paddingVertical: 28, alignItems: 'center', gap: 8 },
  bankDropdownEmptyText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },

  // Account Input
  accountInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E5EA', marginBottom: 8,
  },
  accountInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  verifyingText: { fontSize: 12, color: '#E04079', fontWeight: '600', marginBottom: 12 },

  // Account Name
  accountNameCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  accountNameIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  accountNameMeta: { fontSize: 11, color: '#16A34A', fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  accountNameValue: { fontSize: 15, fontWeight: '700', color: '#14532D' },

  // CTA
  ctaBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },

  // Summary Card (Step 2)
  summaryCard: { borderRadius: 20, padding: 22, marginBottom: 24, overflow: 'hidden' },
  summaryMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryAmount: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 16 },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16 },
  summaryBankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryBankIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryBankInitial: { fontSize: 12, fontWeight: '800' },
  summaryBankName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  summaryAccountInfo: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },

  // PIN
  pinInput: {
    backgroundColor: '#F2F2F7', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E5EA',
    paddingVertical: 16, fontSize: 28, fontWeight: '800', color: '#1C1C1E',
    textAlign: 'center', letterSpacing: 16, marginBottom: 12,
  },
  pinDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 8 },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E5EA' },
  pinDotFilled: { backgroundColor: '#E04079' },
  pinHint: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginBottom: 20, fontWeight: '500' },

  // Security
  securityCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  securityIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  securityTitle: { fontSize: 13, fontWeight: '700', color: '#1D4ED8', marginBottom: 2 },
  securityBody: { fontSize: 12, color: '#3B82F6', lineHeight: 17 },

  // Net Card
  netCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E5EA',
  },
  netLabel: { fontSize: 14, fontWeight: '600', color: '#6C6C70' },
  netValue: { fontSize: 18, fontWeight: '800', color: '#E04079', letterSpacing: -0.5 },

  bankItemIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bankItemInitial: { fontSize: 13, fontWeight: '800' },
  bankItemName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  bankItemNameActive: { color: '#E04079', fontWeight: '700' },
});

export default WithdrawalModal;