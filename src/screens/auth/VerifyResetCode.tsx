import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'VerifyResetCode'>;
type RouteP = RouteProp<AuthStackParamList, 'VerifyResetCode'>;

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

const PRIMARY = '#E04079';
const BG      = '#FCE4EC';
const WHITE   = '#FFFFFF';
const TEXT    = '#1A1A2E';
const GRAY    = '#6B7280';
const MUTED   = '#9CA3AF';
const BORDER  = '#F3E6EC';

const KEYPAD_ROWS: { digit: string; letters?: string }[][] = [
  [{ digit: '1' }, { digit: '2', letters: 'ABC' }, { digit: '3', letters: 'DEF' }],
  [{ digit: '4', letters: 'GHI' }, { digit: '5', letters: 'JKL' }, { digit: '6', letters: 'MNO' }],
  [{ digit: '7', letters: 'PQRS' }, { digit: '8', letters: 'TUV' }, { digit: '9', letters: 'WXYZ' }],
];

const VerifyResetCode = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteP>();
  const email = route.params?.email || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleDigitPress = (digit: string) => {
    setError('');
    if (code.length < CODE_LENGTH) {
      setCode(code + digit);
    }
  };

  const handleBackspace = () => {
    setError('');
    setCode(code.slice(0, -1));
  };

  const handleContinue = () => {
    if (code.length !== CODE_LENGTH) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    navigation.navigate('ChangePassword', { email, code });
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResending(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success('Sent', 'A new reset code has been sent to your email.');
      setCanResend(false);
      setResendTimer(RESEND_SECONDS);
      setCode('');
    } catch (err: any) {
      const apiError = handleAPIError(err);
      toast.error('Error', apiError.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={20} color={PRIMARY} />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Ionicons name="mail-open-outline" size={36} color={PRIMARY} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Verify Code</Text>
          <Text style={styles.subtitle}>Input the 6-digit code sent to your email inbox.</Text>
        </View>

        <View style={styles.codeRow}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const filled = i < code.length;
            const active = i === code.length;
            return (
              <View key={i} style={[styles.codeBox, active && styles.codeBoxActive]}>
                <Text style={styles.codeBoxText}>{code[i] || ''}</Text>
              </View>
            );
          })}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.resendRow}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.7}>
              <Text style={styles.resendLink}>{resending ? 'Resending...' : 'Resend code'}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendText}>
              Don't receive OTP? Resend code in{' '}
              <Text style={styles.resendLink}>{resendTimer}s</Text>
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.88}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="chevron-forward" size={18} color={WHITE} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* Custom numeric keypad */}
        <View style={styles.keypad}>
          {KEYPAD_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key.digit}
                  style={styles.key}
                  onPress={() => handleDigitPress(key.digit)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keyDigit}>{key.digit}</Text>
                  {key.letters ? <Text style={styles.keyLetters}>{key.letters}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.keypadRow}>
            <View style={styles.keySpacer} />
            <TouchableOpacity style={styles.key} onPress={() => handleDigitPress('0')} activeOpacity={0.7}>
              <Text style={styles.keyDigit}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.key} onPress={handleBackspace} activeOpacity={0.7}>
              <Ionicons name="backspace-outline" size={22} color={TEXT} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 4,
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  header: { alignItems: 'center', marginBottom: 22 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: GRAY, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  codeBox: {
    width: 44, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
  },
  codeBoxActive: { borderColor: PRIMARY },
  codeBoxText: { fontSize: 20, fontWeight: '700', color: TEXT },
  errorText: { color: PRIMARY, fontSize: 12, marginTop: 6, textAlign: 'center' },
  resendRow: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  resendText: { fontSize: 13, color: GRAY },
  resendLink: { fontSize: 13, color: PRIMARY, fontWeight: '700' },
  continueBtn: {
    backgroundColor: PRIMARY, borderRadius: 999, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginBottom: 24,
  },
  continueBtnText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  keypad: { gap: 10 },
  keypadRow: { flexDirection: 'row', gap: 10 },
  key: {
    flex: 1, height: 56, borderRadius: 14, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  keySpacer: { flex: 1 },
  keyDigit: { fontSize: 19, fontWeight: '700', color: TEXT },
  keyLetters: { fontSize: 9, color: MUTED, marginTop: 1, letterSpacing: 1 },
});

export default VerifyResetCode;
