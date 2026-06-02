import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError } from '@/api/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;
const P = '#E91E63';
const P_LIGHT = '#FEE2F0';
const BG = '#FFF5F9';
const TEXT = '#1A1A1A';
const HINT = '#9CA3AF';

const VerifyOtpScreen = ({ route, navigation }: Props) => {
  const email = route.params?.email || '';
  const isVendor = route.params?.isVendor || false;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (__DEV__) {
      console.log('[DEV] Check backend terminal for OTP sent to:', email);
    }
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  useEffect(() => {
    const value = otp.join('');
    if (value.length === OTP_LENGTH && !loading && !success) {
      handleVerify(value);
    }
  }, [otp]);

  const handleOtpChange = (value: string, index: number) => {
    setError('');
    if (value && !/^\d+$/.test(value)) return;

    const next = [...otp];

    if (value.length > 1) {
      const pasted = value.slice(0, OTP_LENGTH - index).split('');
      pasted.forEach((ch, i) => { if (index + i < OTP_LENGTH) next[index + i] = ch; });
      setOtp(next);
      inputRefs.current[Math.min(index + pasted.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
    }
  };

  const handleVerify = async (otpValue: string) => {
    if (otpValue.length !== OTP_LENGTH) {
      setError('Please enter the complete verification code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAPI.verifyEmail(otpValue);

      setSuccess(
        isVendor
          ? 'Email verified! Setting up your business...'
          : 'Email verified! Welcome to LookReal!'
      );

      setTimeout(() => {
        if (isVendor) {
          navigation.replace('VendorProfileSetup', { fromRegistration: true });
        } else {
          navigation.replace('ClientProfileSetup', { fromRegistration: true });
        }
      }, 1200);
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Invalid code. Please try again.');
      setTimeout(() => {
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setCanResend(false);
    setResendTimer(60);
    setError('');
    try {
      await authAPI.resendVerification(email);
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Failed to resend code. Please try again.');
      setCanResend(true);
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : 'your email';

  const filledCount = otp.filter(Boolean).length;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <View style={s.backCircle}>
            <Ionicons name="chevron-back" size={20} color={P} />
          </View>
        </TouchableOpacity>

        {/* Illustration */}
        <View style={s.illustrationWrap}>
          <View style={s.illustrationCircle}>
            <View style={s.illustrationInner}>
              <Ionicons name="mail-unread" size={52} color={P} />
            </View>
            {/* Decorative elements */}
            <View style={[s.badge, s.badgeTopRight]}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
            </View>
            <View style={[s.badge, s.badgeBottomLeft]}>
              <Ionicons name="lock-closed" size={14} color="#fff" />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>Verify Code</Text>
        <Text style={s.subtitle}>
          Input the 6-digit code sent to{'\n'}
          <Text style={s.emailHighlight}>{maskedEmail}</Text>
        </Text>

        {/* Error */}
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Success */}
        {success ? (
          <View style={s.successBox}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={s.successText}>{success}</Text>
          </View>
        ) : null}

        {/* OTP boxes */}
        <View style={s.otpRow}>
          {Array(OTP_LENGTH).fill(0).map((_, i) => (
            <TextInput
              key={i}
              ref={ref => { inputRefs.current[i] = ref; }}
              style={[
                s.otpBox,
                otp[i] ? s.otpBoxFilled : null,
                error ? s.otpBoxErr : null,
              ]}
              value={otp[i]}
              onChangeText={v => handleOtpChange(v, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={i === 0 ? OTP_LENGTH : 1}
              editable={!loading && !success}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Resend */}
        <View style={s.resendWrap}>
          <Text style={s.resendHint}>Don't receive (OTP) </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.7}>
              {resending
                ? <ActivityIndicator size="small" color={P} />
                : <Text style={s.resendLink}>Resend code</Text>
              }
            </TouchableOpacity>
          ) : (
            <Text style={s.resendTimer}>
              <Text style={s.resendLink}>Resend code</Text>
              {` in ${resendTimer}s`}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Continue button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[
            s.btn,
            (filledCount < OTP_LENGTH || loading || !!success) && s.btnDisabled,
          ]}
          onPress={() => handleVerify(otp.join(''))}
          disabled={filledCount < OTP_LENGTH || loading || !!success}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={s.btnInner}>
              <Text style={s.btnTxt}>Continue</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: width * 0.06, paddingBottom: 20, paddingTop: 8 },

  backBtn: { marginBottom: 16 },
  backCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  // Illustration
  illustrationWrap: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  illustrationCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: P_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  illustrationInner: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: P,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  badgeTopRight: { top: 10, right: 10 },
  badgeBottomLeft: { bottom: 14, left: 10, width: 26, height: 26, borderRadius: 13 },

  title: { fontSize: 26, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: HINT, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emailHighlight: { color: P, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1,
    borderColor: '#FECACA', padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626' },
  successBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 10, borderWidth: 1,
    borderColor: '#BBF7D0', padding: 12, marginBottom: 16,
  },
  successText: { flex: 1, fontSize: 13, color: '#16A34A' },

  // OTP
  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: (width * 0.88 - 5 * 10) / 6,
    height: 56, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E2E8F0', backgroundColor: '#fff',
    textAlign: 'center', fontSize: 22, fontWeight: '700', color: TEXT,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  otpBoxFilled: { borderColor: P, backgroundColor: P_LIGHT },
  otpBoxErr: { borderColor: '#E53E3E' },

  // Resend
  resendWrap: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', flexWrap: 'wrap', gap: 4,
  },
  resendHint: { fontSize: 14, color: HINT },
  resendLink: { fontSize: 14, color: P, fontWeight: '700', textDecorationLine: 'underline' },
  resendTimer: { fontSize: 14, color: HINT },

  // Footer
  footer: {
    paddingHorizontal: width * 0.06,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: BG,
  },
  btn: {
    backgroundColor: P, borderRadius: 50,
    paddingVertical: 17, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTxt: { fontSize: 17, fontWeight: '700', color: '#fff' },
});

export default VerifyOtpScreen;
