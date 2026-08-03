import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';
import { loginUser } from '@/utils/authHelper';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const { width: SW } = Dimensions.get('window');
const P = '#E91E63';
const TEXT = '#1A1A1A';
const HINT = '#9CA3AF';
const BG = '#FFF5F9';
const CARD = '#FFFFFF';

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validateForm = () => {
    let valid = true;
    const newErrors = { email: '', password: '' };

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
    if (!validateForm()) return;

    setLoading(true);
    let shouldResetLoading = true;

    try {
      const result = await loginUser(email, password);
      if (result.success) {
        shouldResetLoading = false;
      } else {
        const errorMessage = result.error || 'Invalid credentials. Please try again.';
        if (errorMessage.toLowerCase().includes('verify')) {
          shouldResetLoading = false;
          setLoading(false);
          navigation.navigate('VerifyOtp', { email });
          return;
        }
        setGeneralError(errorMessage);
        if (errorMessage.toLowerCase().includes('email') && !errorMessage.toLowerCase().includes('verify')) {
          setErrors(prev => ({ ...prev, email: 'Please check your email address' }));
        }
      }
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      if (shouldResetLoading) setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          <Image
            source={require('../../../assets/lookrealMainLogo.png')}
            style={s.logo}
            resizeMode="contain"
          />
        </View>

        {/* Heading */}
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign-in to continue</Text>

        {/* General error banner */}
        {generalError ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={s.errorBannerTxt}>{generalError}</Text>
          </View>
        ) : null}

        {/* Email */}
        <Text style={s.label}>Email</Text>
        <View style={[s.inputWrap, !!errors.email && s.inputWrapError]}>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={t => {
              setEmail(t);
              setErrors(p => ({ ...p, email: '' }));
              setGeneralError('');
            }}
            placeholder="example@gmail.com"
            placeholderTextColor={HINT}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            textContentType="emailAddress"
            autoComplete="email"
          />
        </View>
        {errors.email ? <Text style={s.fieldError}>{errors.email}</Text> : null}

        {/* Password */}
        <Text style={[s.label, s.labelSpaced]}>Password</Text>
        <View style={[s.inputWrap, !!errors.password && s.inputWrapError]}>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={t => {
              setPassword(t);
              setErrors(p => ({ ...p, password: '' }));
              setGeneralError('');
            }}
            placeholder="••••••••"
            placeholderTextColor={HINT}
            secureTextEntry={!showPassword}
            editable={!loading}
            textContentType="password"
            autoComplete="password"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={P}
            />
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={s.fieldError}>{errors.password}</Text> : null}

        {/* Remember me + Forgot password */}
        <View style={s.rememberRow}>
          <TouchableOpacity
            style={s.checkRow}
            onPress={() => setRememberMe(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, rememberMe && s.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={s.rememberTxt}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={s.forgotTxt}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Log In button */}
        <TouchableOpacity
          style={[s.loginBtn, loading && s.loginBtnDim]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.loginBtnTxt}>Log In</Text>
          }
        </TouchableOpacity>

        {/* Sign up link */}
        <View style={s.signupRow}>
          <Text style={s.signupTxt}>Don't have any account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={s.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SW * 0.07,
    paddingVertical: 40,
    justifyContent: 'center',
  },

  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { width: SW * 0.32, height: 68 },

  title: {
    fontSize: 26, fontWeight: '800', color: TEXT,
    textAlign: 'center', marginBottom: 6,
  },
  subtitle: {
    fontSize: 14, color: HINT,
    textAlign: 'center', marginBottom: 28,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 16,
  },
  errorBannerTxt: { flex: 1, fontSize: 13, color: '#DC2626' },

  label: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 8 },
  labelSpaced: { marginTop: 18 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  inputWrapError: { borderWidth: 1.5, borderColor: '#DC2626' },
  input: { flex: 1, fontSize: 15, color: TEXT },
  fieldError: { fontSize: 12, color: '#DC2626', marginTop: 4 },

  rememberRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18, marginBottom: 28,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1.5, borderColor: HINT,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: P, borderColor: P },
  rememberTxt: { fontSize: 13, color: TEXT },
  forgotTxt: { fontSize: 13, color: P, fontWeight: '600' },

  loginBtn: {
    backgroundColor: P, borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    marginBottom: 28,
  },
  loginBtnDim: { opacity: 0.7 },
  loginBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  signupRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  signupTxt: { fontSize: 14, color: HINT },
  signupLink: { fontSize: 14, color: P, fontWeight: '700' },
});

export default LoginScreen;
