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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { authAPI, handleAPIError } from '@/api/api';
import { AuthStackParamList } from '@/types/navigation.types';
import { toast } from '@/components/ui/Toast';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;
const P = '#E91E63';
const P_LIGHT = '#FEE2F0';
const BG = '#FFF5F9';
const TEXT = '#1A1A1A';
const HINT = '#9CA3AF';
const BORDER = '#E2E8F0';

const ResetPasswordScreen = ({ route, navigation }: Props) => {
  const email = route.params?.email || '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [step, setStep] = useState<'otp' | 'password'>('otp');

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const newPassRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

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
    // Auto-advance to password step once all 6 digits filled
    if (value && index === OTP_LENGTH - 1) {
      setTimeout(() => setStep('password'), 300);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setCanResend(false);
    setResendTimer(60);
    setError('');
    try {
      await authAPI.forgotPassword(email);
      toast.success('Code resent to your email');
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Failed to resend. Try again.');
      setCanResend(true);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async () => {
    const token = otp.join('');
    if (token.length !== OTP_LENGTH) {
      setStep('otp');
      setError('Please enter the 6-digit code from your email');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAPI.resetPassword(token, newPassword);
      toast.success('Password reset successfully!');
      setTimeout(() => navigation.replace('Login'), 1200);
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Invalid or expired code. Try again.');
      if (apiError.message?.toLowerCase().includes('invalid') || apiError.message?.toLowerCase().includes('expired')) {
        setStep('otp');
        setOtp(Array(OTP_LENGTH).fill(''));
      }
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : 'your email';

  const otpFilled = otp.filter(Boolean).length === OTP_LENGTH;
  const canSubmit = otpFilled && newPassword.length >= 8 && newPassword === confirmPassword;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
            <Ionicons name="key" size={52} color={P} />
            <View style={[s.badge, s.badgeTopRight]}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
            </View>
            <View style={[s.badge, s.badgeBottomLeft]}>
              <Ionicons name="lock-open" size={12} color="#fff" />
            </View>
          </View>
        </View>

        <Text style={s.title}>Reset Password</Text>
        <Text style={s.subtitle}>
          Enter the code sent to{'\n'}
          <Text style={s.emailHighlight}>{maskedEmail}</Text>
          {'\n'}then set your new password.
        </Text>

        {/* Error */}
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Step 1: OTP */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={[s.stepDot, otpFilled && s.stepDotDone]}>
              {otpFilled
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={s.stepNum}>1</Text>
              }
            </View>
            <Text style={s.sectionTitle}>Enter verification code</Text>
            {step === 'password' && otpFilled && (
              <TouchableOpacity onPress={() => setStep('otp')} activeOpacity={0.7}>
                <Text style={s.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={s.otpRow}>
            {Array(OTP_LENGTH).fill(0).map((_, i) => (
              <TextInput
                key={i}
                ref={ref => { inputRefs.current[i] = ref; }}
                style={[
                  s.otpBox,
                  otp[i] ? s.otpBoxFilled : null,
                  error && step === 'otp' ? s.otpBoxErr : null,
                ]}
                value={otp[i]}
                onChangeText={v => handleOtpChange(v, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={i === 0 ? OTP_LENGTH : 1}
                editable={!loading}
                selectTextOnFocus
              />
            ))}
          </View>

          <View style={s.resendWrap}>
            <Text style={s.resendHint}>Didn't get it? </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} disabled={resending} activeOpacity={0.7}>
                {resending
                  ? <ActivityIndicator size="small" color={P} />
                  : <Text style={s.resendLink}>Resend code</Text>
                }
              </TouchableOpacity>
            ) : (
              <Text style={s.resendTimer}>
                <Text style={s.resendLink}>Resend</Text>{` in ${resendTimer}s`}
              </Text>
            )}
          </View>
        </View>

        {/* Step 2: New password */}
        {(step === 'password' || otpFilled) && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={[s.stepDot, canSubmit && s.stepDotDone]}>
                {canSubmit
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : <Text style={s.stepNum}>2</Text>
                }
              </View>
              <Text style={s.sectionTitle}>Create new password</Text>
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>New Password</Text>
              <View style={[s.inputRow, s.inputRowTop]}>
                <Ionicons name="lock-closed-outline" size={19} color={HINT} style={s.inputIcon} />
                <TextInput
                  ref={newPassRef}
                  style={s.input}
                  placeholder="At least 8 characters"
                  placeholderTextColor={HINT}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  editable={!loading}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showNew ? 'eye-off' : 'eye'} size={19} color={HINT} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Confirm Password</Text>
              <View style={[
                s.inputRow,
                confirmPassword && (newPassword === confirmPassword ? s.inputRowOk : s.inputRowErr),
              ]}>
                <Ionicons name="checkmark-circle-outline" size={19} color={HINT} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={HINT}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  editable={!loading}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={19} color={HINT} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Strength hints */}
            <View style={s.hintBox}>
              <Text style={s.hintItem}>
                <Ionicons name={newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'} size={13}
                  color={newPassword.length >= 8 ? '#16A34A' : HINT} />{' '}At least 8 characters
              </Text>
              <Text style={s.hintItem}>
                <Ionicons name={/[A-Z]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} size={13}
                  color={/[A-Z]/.test(newPassword) ? '#16A34A' : HINT} />{' '}One uppercase letter
              </Text>
              <Text style={s.hintItem}>
                <Ionicons name={/\d/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} size={13}
                  color={/\d/.test(newPassword) ? '#16A34A' : HINT} />{' '}One number
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btn, (!canSubmit || loading) && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={s.btnInner}>
              <Text style={s.btnTxt}>Reset Password</Text>
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

  illustrationWrap: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  illustrationCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: P_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  badgeTopRight: { top: 12, right: 12 },
  badgeBottomLeft: { bottom: 16, left: 12 },

  title: { fontSize: 24, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: HINT, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emailHighlight: { color: P, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1,
    borderColor: '#FECACA', padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626' },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: '#16A34A' },
  stepNum: { fontSize: 11, fontWeight: '800', color: P },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: TEXT },
  editLink: { fontSize: 13, color: P, fontWeight: '600' },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  otpBox: {
    width: (width * 0.76 - 5 * 10) / 6,
    height: 52, borderRadius: 10, borderWidth: 1.5,
    borderColor: BORDER, backgroundColor: '#F9FAFB',
    textAlign: 'center', fontSize: 20, fontWeight: '700', color: TEXT,
  },
  otpBoxFilled: { borderColor: P, backgroundColor: P_LIGHT },
  otpBoxErr: { borderColor: '#E53E3E' },

  resendWrap: { flexDirection: 'row', alignItems: 'center' },
  resendHint: { fontSize: 13, color: HINT },
  resendLink: { fontSize: 13, color: P, fontWeight: '700', textDecorationLine: 'underline' },
  resendTimer: { fontSize: 13, color: HINT },

  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: TEXT, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#F9FAFB',
  },
  inputRowTop: {},
  inputRowOk: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  inputRowErr: { borderColor: '#E53E3E' },
  inputIcon: {},
  input: { flex: 1, fontSize: 15, color: TEXT },

  hintBox: { gap: 6 },
  hintItem: { fontSize: 12, color: HINT, gap: 4 },

  footer: {
    paddingHorizontal: width * 0.06, paddingBottom: 20,
    paddingTop: 12, backgroundColor: BG,
  },
  btn: {
    backgroundColor: P, borderRadius: 50,
    paddingVertical: 17, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnTxt: { fontSize: 17, fontWeight: '700', color: '#fff' },
});

export default ResetPasswordScreen;
