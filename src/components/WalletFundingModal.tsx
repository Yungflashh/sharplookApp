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
  Dimensions,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types/navigation.types';
import { walletAPI, handleAPIError } from '@/api/api';

const { width: W } = Dimensions.get('window');

const PINK = '#E8166D';
const PINK_LIGHT = '#FF5FA0';

const QUICK_AMOUNTS = [1000, 5000, 10000, 15000, 20000, 25000];

interface WalletFundingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const WalletFundingModal: React.FC<WalletFundingModalProps> = ({
  visible,
  onClose,
  onSuccess,
  currentBalance,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (v: number) => `₦${v.toLocaleString()}`;

  const handleContinue = async () => {
    const num = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(num) || num < 100) {
      toast.error('Invalid Amount', 'Minimum amount is ₦100');
      return;
    }
    if (num > 5000000) {
      toast.error('Invalid Amount', 'Maximum amount is ₦5,000,000');
      return;
    }
    try {
      setLoading(true);
      const response = await walletAPI.initializeWalletFunding(num, {
        source: 'mobile_app',
        type: 'wallet_funding',
      });
      if (response.success) {
        const { authorizationUrl, reference, payment } = response.data;
        handleClose();
        navigation.navigate('WalletPayment', {
          amount: num,
          reference,
          authorizationUrl,
          paymentId: payment?._id || payment?.id,
        } as any);
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

  const canProceed = amount.length > 0 && !loading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* ── Pink header ─────────────────────────────── */}
          <View style={styles.pinkHeader}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Add to Wallet</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Balance card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceDecorCircle} />
              <View style={styles.balanceDecorCircle2} />
              <View style={styles.balanceRow}>
                <View style={styles.balanceIconWrap}>
                  <Ionicons name="wallet" size={20} color={PINK} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.balanceLabel}>LooKReal Wallet</Text>
                  <Text style={styles.balanceAmount}>{formatCurrency(currentBalance)}</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Amount input ────────────────────────── */}
            <Text style={styles.label}>Enter Amount</Text>
            <View style={styles.inputRow}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>₦</Text>
              </View>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="100.00 - 5,000,000"
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor="#BABAC0"
              />
              {amount.length > 0 && (
                <TouchableOpacity onPress={() => setAmount('')} style={styles.clearBtn} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color="#C7C7CC" />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Quick amounts (6 pills) ─────────────── */}
            <Text style={[styles.label, { marginTop: 20 }]}>Quick Select</Text>
            <View style={styles.pillGrid}>
              {QUICK_AMOUNTS.map((q) => {
                const active = amount === q.toString();
                return (
                  <TouchableOpacity
                    key={q}
                    onPress={() => setAmount(q.toString())}
                    style={[styles.pill, active && styles.pillActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {formatCurrency(q)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Green info note ──────────────────────── */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color="#16A34A" style={{ marginTop: 1 }} />
              <Text style={styles.infoText}>
                Funds are added instantly via Paystack. Bank transfer, card, and USSD are all accepted.
              </Text>
            </View>

            {/* ── Continue button ──────────────────────── */}
            <TouchableOpacity
              onPress={handleContinue}
              disabled={!canProceed}
              activeOpacity={0.85}
              style={[styles.ctaBtn, !canProceed && styles.ctaBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.ctaText}>Continue  ›</Text>
              )}
            </TouchableOpacity>

            <View style={styles.secureRow}>
              <Ionicons name="lock-closed" size={12} color="#8E8E93" />
              <Text style={styles.secureText}> Secured & encrypted by Paystack</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
    elevation: 24,
  },

  // Pink header
  pinkHeader: {
    backgroundColor: PINK,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Balance card
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    overflow: 'hidden',
  },
  balanceDecorCircle: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(232,22,109,0.06)',
  },
  balanceDecorCircle2: {
    position: 'absolute',
    right: 30,
    bottom: -30,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(232,22,109,0.04)',
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '500', marginBottom: 2 },
  balanceAmount: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5 },

  // Body
  body: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 36 },

  // Label
  label: { fontSize: 13, fontWeight: '700', color: '#3A3A3C', marginBottom: 10, letterSpacing: 0.1 },

  // Amount input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#EFEFF4',
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
  },
  prefixText: { fontSize: 18, fontWeight: '700', color: '#3A3A3C' },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  clearBtn: { paddingHorizontal: 12 },

  // Pills — 2 rows of 3
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    width: (W - 44 - 20) / 3,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  pillActive: { backgroundColor: '#FFF0F6', borderColor: PINK },
  pillText: { fontSize: 13, fontWeight: '700', color: '#6C6C70' },
  pillTextActive: { color: PINK },

  // Info box (green)
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    marginTop: 22,
    gap: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  infoText: { flex: 1, fontSize: 13, color: '#166534', lineHeight: 19, fontWeight: '500' },

  // CTA
  ctaBtn: {
    marginTop: 22,
    backgroundColor: PINK,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaBtnDisabled: { backgroundColor: '#D1D5DB' },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  // Security
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  secureText: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
});

export default WalletFundingModal;
