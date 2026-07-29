import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError } from '@/api/api';
import { loginUser } from '@/utils/authHelper';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

const OTP_LENGTH = 6;
const PINK = '#E91E63';
const BG = '#FFF0F5';
const BORDER = '#F8BBD0';

const VerifyOtpScreen = ({ route, navigation }: Props) => {
  const email = route.params?.email || '';
  const password = route.params?.password || '';
  const isVendor = route.params?.isVendor || false;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Auto-verify when OTP is complete
  useEffect(() => {
    const otpValue = otp.join('');
    if (otpValue.length === OTP_LENGTH && !loading && !success) {
      handleVerify(otpValue);
    }
  }, [otp]);

  const handleOtpChange = (value: string, index: number) => {
    setError('');
    setSuccess('');

    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];

    // Handle paste
    if (value.length > 1) {
      const pasted = value.slice(0, OTP_LENGTH - index).split('');
      pasted.forEach((char, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleVerify = async (otpValue: string) => {
    if (otpValue.length !== OTP_LENGTH) {
      setError('Please enter the complete verification code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authAPI.verifyEmail(otpValue);

      if (password) {
        setSuccess('Email verified! Signing you in...');
        const result = await loginUser(email, password);
        if (!result.success) {
          // loginUser failed — fall back to login screen with success message
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login', params: { message: 'Email verified! Please log in.' } }],
          });
        }
        // On success: RootNavigator polls AsyncStorage every 1s and auto-navigates to Main
      } else {
        setLoading(false);
        setSuccess('Email verified! Redirecting...');
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login', params: { message: 'Email verified! Please log in.' } }],
          });
        }, 1500);
      }
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Invalid verification code. Please try again.');
      setLoading(false);

      setTimeout(() => {
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }, 2000);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(60);
    setError('');

    try {
      await authAPI.resendVerification(email);
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Failed to resend code. Please try again.');
      setCanResend(true);
    }
  };

  const otpComplete = otp.join('').length === OTP_LENGTH;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={PINK} />
          </TouchableOpacity>

          {/* Logo + illustration */}
          <View style={styles.illustrationWrap}>
            <Image
              source={require('../../../assets/lookrealMainLogo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <View style={styles.illustrationCircle}>
              <Ionicons name="mail-outline" size={48} color={PINK} />
              <View style={styles.shieldBadge}>
                <Ionicons name="shield-checkmark-outline" size={24} color={PINK} />
              </View>
            </View>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.title}>Verify Code</Text>
          <Text style={styles.subtitle}>
            Input the 6-digit code sent to your email inbox.
          </Text>

          {/* Error */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Success */}
          {success ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" style={{ marginRight: 8 }} />
              <Text style={styles.successBannerText}>{success}</Text>
            </View>
          ) : null}

          {/* OTP Boxes */}
          <View style={styles.otpRow}>
            {Array(OTP_LENGTH)
              .fill(0)
              .map((_, index) => {
                const filled = !!otp[index];
                const hasError = !!error;
                return (
                  <TextInput
                    key={index}
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[
                      styles.otpBox,
                      filled && styles.otpBoxFilled,
                      hasError && styles.otpBoxError,
                    ]}
                    value={otp[index]}
                    onChangeText={(v) => handleOtpChange(v, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? OTP_LENGTH : 1}
                    editable={!loading && !success}
                    selectTextOnFocus
                    textAlign="center"
                  />
                );
              })}
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={PINK} />
              <Text style={styles.loadingText}>Verifying...</Text>
            </View>
          )}

          {/* Resend */}
          <Text style={styles.didntReceive}>Don't receive (OTP)</Text>
          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                <Text style={styles.resendLink}>Resend code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                {'Resend code  '}
                <Text style={styles.resendTimerHighlight}>in {resendTimer} seconds</Text>
              </Text>
            )}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueBtn,
              (!otpComplete || loading || !!success) && styles.continueBtnDisabled,
            ]}
            onPress={() => handleVerify(otp.join(''))}
            disabled={!otpComplete || loading || !!success}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.continueBtnText}>Continue {'>'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  illustrationWrap: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  logoImg: { width: 200, height: 72 },
  illustrationCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFE4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldBadge: {
    position: 'absolute',
    bottom: 10,
    right: 8,
    backgroundColor: '#FFF0F5',
    borderRadius: 20,
    padding: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13,
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#16a34a',
    fontSize: 13,
    flex: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  otpBoxFilled: {
    borderColor: BORDER,
    borderWidth: 1.5,
    backgroundColor: '#FFF8FB',
  },
  otpBoxError: {
    borderColor: '#FCA5A5',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  loadingText: {
    color: PINK,
    fontWeight: '600',
    fontSize: 14,
  },
  didntReceive: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginBottom: 6,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resendTimer: {
    fontSize: 14,
    color: '#888',
  },
  resendTimerHighlight: {
    color: PINK,
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 14,
    color: PINK,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  continueBtn: {
    backgroundColor: PINK,
    borderRadius: 30,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default VerifyOtpScreen;
