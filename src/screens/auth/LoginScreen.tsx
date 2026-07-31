import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { loginUser } from '@/utils/authHelper';
import { Checkbox } from '@/components/ui/forms';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const PRIMARY = '#E04079';
const BG      = '#FCE4EC';
const WHITE   = '#FFFFFF';
const TEXT    = '#1A1A2E';
const GRAY    = '#6B7280';
const MUTED   = '#9CA3AF';
const BORDER  = '#F3E6EC';

const REMEMBERED_EMAIL_KEY = 'rememberedEmail';

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as { message?: string } | undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  // Check if device is a tablet (iPad)
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  useEffect(() => {
    AsyncStorage.getItem(REMEMBERED_EMAIL_KEY).then((saved) => {
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    });
  }, []);

  const validateForm = () => {
    let valid = true;
    const newErrors = {
      email: '',
      password: '',
    };

    if (!email) {
      newErrors.email = 'Email is required';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      valid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleLogin = async () => {
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    if (rememberMe) {
      await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } else {
      await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    setLoading(true);
    let shouldResetLoading = true;

    try {
      const result = await loginUser(email, password);
      console.log('Login result:', result);

      if (result.success) {
        console.log('✅ Login successful! Auth state updated.');
        shouldResetLoading = false; // Don't reset if navigating away
      } else {
        const errorMessage = result.error || 'Invalid credentials. Please try again.';

        // Check for verification required first (more specific)
        if (errorMessage.toLowerCase().includes('verify')) {
          shouldResetLoading = false; // Don't reset if navigating away
          setLoading(false); // Reset before navigation
          // Navigate to OTP verification screen
          navigation.navigate('VerifyOtp', { email });
          return; // Exit early, don't show error
        }

        setGeneralError(errorMessage);

        if (errorMessage.toLowerCase().includes('email') && !errorMessage.toLowerCase().includes('verify')) {
          setErrors((prev) => ({
            ...prev,
            email: 'Please check your email address',
          }));
        }
      }
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      if (shouldResetLoading) {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: isTablet ? 80 : 24,
            paddingTop: 12,
            paddingBottom: 32,
            justifyContent: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={{ maxWidth: isTablet ? 500 : undefined, alignSelf: 'center', width: '100%' }}>
            {/* Logo */}
            <View style={styles.logoWrap}>
              <Image
                source={require('@/assets/app-icon.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Info message (e.g. passed after registration) */}
            {params?.message ? (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color="#3182CE" style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.infoBannerText}>{params.message}</Text>
              </View>
            ) : null}

            {/* General Error */}
            {generalError ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color="#DC2626"
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <Text style={styles.errorBannerText}>{generalError}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={[styles.inputRow, errors.email ? styles.inputRowError : null]}>
                <Ionicons name="mail-outline" size={18} color={MUTED} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="example@gmail.com"
                  placeholderTextColor={MUTED}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrors((prev) => ({ ...prev, email: '' }));
                    setGeneralError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                  textContentType="emailAddress"
                  autoComplete="email"
                />
              </View>
              {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.inputRow, errors.password ? styles.inputRowError : null]}>
                <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={MUTED}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrors((prev) => ({ ...prev, password: '' }));
                    setGeneralError('');
                  }}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  textContentType="password"
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={19} color={PRIMARY} />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
            </View>

            {/* Remember me + Forgot password */}
            <View style={styles.rowBetween}>
              <View style={styles.rememberRow}>
                <Checkbox checked={rememberMe} onChange={setRememberMe} size="sm" />
                <TouchableOpacity onPress={() => setRememberMe((v) => !v)} activeOpacity={0.7}>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleForgotPassword} disabled={loading} activeOpacity={0.7}>
                <Text style={styles.forgotLink}>Forget Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={WHITE} />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Log In</Text>
                  <Ionicons name="chevron-forward" size={18} color={WHITE} style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Sign Up */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have any account? </Text>
              <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.7}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  logoWrap: { alignItems: 'center', marginTop: 16, marginBottom: 20 },
  logo: { width: 92, height: 92, borderRadius: 22 },
  header: { alignItems: 'center', marginBottom: 22 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: GRAY, marginTop: 4 },
  infoBanner: {
    backgroundColor: '#EBF8FF', borderWidth: 1, borderColor: '#BEE3F8',
    borderRadius: 14, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  infoBannerText: { color: '#2C5282', fontSize: 13, flex: 1 },
  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 14, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  errorBannerText: { color: '#DC2626', fontSize: 13, flex: 1 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 7 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 52,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  inputRowError: { borderColor: PRIMARY },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: TEXT, height: '100%', padding: 0 },
  fieldError: { color: PRIMARY, fontSize: 12, marginTop: 5, marginLeft: 2 },
  rowBetween: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 2, marginBottom: 22,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  rememberText: { fontSize: 13, color: '#374151' },
  forgotLink: { color: PRIMARY, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  loginBtn: {
    backgroundColor: PRIMARY, borderRadius: 999, height: 54,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  footerRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28,
  },
  footerText: { fontSize: 14, color: GRAY },
  footerLink: { fontSize: 14, color: PRIMARY, fontWeight: '700' },
});

export default LoginScreen;
