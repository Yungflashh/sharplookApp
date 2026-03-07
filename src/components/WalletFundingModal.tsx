import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation.types';
import { walletAPI, handleAPIError } from '@/api/api';

interface WalletFundingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const PAYMENT_METHODS = [
  { icon: 'card-outline',          label: 'Debit Card' },
  { icon: 'business-outline',      label: 'Bank Transfer' },
  { icon: 'phone-portrait-outline',label: 'USSD' },
  { icon: 'qr-code-outline',       label: 'QR Code' },
];

const WalletFundingModal: React.FC<WalletFundingModalProps> = ({
  visible,
  onClose,
  onSuccess,
  currentBalance,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;

  const handleInitializeFunding = async () => {
    const fundAmount = parseFloat(amount);
    if (isNaN(fundAmount) || fundAmount < 100) {
      toast.error('Invalid Amount', 'Minimum funding amount is ₦100');
      return;
    }
    if (fundAmount > 1000000) {
      toast.error('Invalid Amount', 'Maximum funding amount is ₦1,000,000');
      return;
    }
    try {
      setLoading(true);
      const response = await walletAPI.initializeWalletFunding(fundAmount, {
        source: 'mobile_app',
        type: 'wallet_funding',
      });
      if (response.success) {
        const { authorizationUrl, reference, payment } = response.data;
        handleClose();
        navigation.navigate('WalletPayment', {
          amount: fundAmount,
          reference,
          authorizationUrl,
          paymentId: payment?._id || payment?.id,
        });
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    onClose();
  };

  const canProceed = !!amount && !loading;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* ── Handle bar ─────────────────────────────────── */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* ── Header ─────────────────────────────────────── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Fund Wallet</Text>
              <Text style={styles.headerSub}>Add money via Paystack</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color="#3A3A3C" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Balance Card ────────────────────────────── */}
            <LinearGradient
              colors={['#E8166D', '#FF5FA0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(currentBalance)}</Text>
              <View style={styles.balanceDecor} />
            </LinearGradient>

            {/* ── Quick Amounts ───────────────────────────── */}
            <Text style={styles.sectionLabel}>Quick Select</Text>
            <View style={styles.quickGrid}>
              {QUICK_AMOUNTS.map((q) => {
                const active = amount === q.toString();
                return (
                  <TouchableOpacity
                    key={q}
                    onPress={() => setAmount(q.toString())}
                    style={[styles.quickChip, active && styles.quickChipActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>
                      {formatCurrency(q)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Custom Amount Input ─────────────────────── */}
            <Text style={styles.sectionLabel}>Enter Amount</Text>
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
            <Text style={styles.inputHint}>Minimum ₦100 · Maximum ₦1,000,000</Text>

            {/* ── Payment Methods ─────────────────────────── */}
            <View style={styles.methodsCard}>
              <View style={styles.methodsHeader}>
                <View style={styles.methodsIconWrap}>
                  <Ionicons name="shield-checkmark" size={15} color="#3B82F6" />
                </View>
                <Text style={styles.methodsTitle}>Accepted Payment Methods</Text>
              </View>
              <View style={styles.methodsGrid}>
                {PAYMENT_METHODS.map((m, i) => (
                  <View key={i} style={styles.methodChip}>
                    <Ionicons name={m.icon as any} size={14} color="#3B82F6" />
                    <Text style={styles.methodChipText}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── CTA ────────────────────────────────────── */}
            <TouchableOpacity
              onPress={handleInitializeFunding}
              disabled={!canProceed}
              activeOpacity={0.85}
              style={{ borderRadius: 16, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={canProceed ? ['#E8166D', '#FF5FA0'] : ['#D1D5DB', '#D1D5DB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={styles.ctaBtnInner}>
                    <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                    <Text style={styles.ctaBtnText}>Continue to Payment</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Security note ───────────────────────────── */}
            <View style={styles.securityRow}>
              <Ionicons name="lock-closed" size={12} color="#8E8E93" />
              <Text style={styles.securityText}>Secured & encrypted by Paystack</Text>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    // iOS shadow on sheet edge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },

  // Handle
  handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E5EA' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 10, paddingBottom: 18,
    borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scroll: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },

  // Balance Card
  balanceCard: {
    borderRadius: 20, paddingHorizontal: 22, paddingVertical: 22,
    marginBottom: 24, overflow: 'hidden',
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 4 },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  balanceDecor: {
    position: 'absolute', right: -20, top: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Section label
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#3A3A3C',
    letterSpacing: 0.2, marginBottom: 12, textTransform: 'uppercase',
  },

  // Quick amounts
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickChip: {
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#F2F2F7', borderWidth: 1.5, borderColor: '#E5E5EA',
  },
  quickChipActive: { backgroundColor: '#FFF0F6', borderColor: '#E8166D' },
  quickChipText: { fontSize: 14, fontWeight: '600', color: '#6C6C70' },
  quickChipTextActive: { color: '#E8166D' },

  // Input
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F2F2F7', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E5EA', overflow: 'hidden',
    marginBottom: 8,
  },
  inputPrefix: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#E9E9EE' },
  inputPrefixText: { fontSize: 18, fontWeight: '700', color: '#6C6C70' },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  inputClear: { paddingHorizontal: 12 },
  inputHint: { fontSize: 12, color: '#8E8E93', marginBottom: 24, fontWeight: '500' },

  // Payment methods
  methodsCard: {
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, marginBottom: 24,
  },
  methodsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  methodsIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
  },
  methodsTitle: { fontSize: 13, fontWeight: '700', color: '#1D4ED8' },
  methodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  methodChipText: { fontSize: 12, fontWeight: '600', color: '#3A3A3C' },

  // CTA
  ctaBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },

  // Security
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  securityText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
});

export default WalletFundingModal;