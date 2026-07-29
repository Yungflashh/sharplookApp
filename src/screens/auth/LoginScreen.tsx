import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';
import { loginUser } from '@/utils/authHelper';

const BG = '#FFF0F5';
const PINK = '#E91E63';
const BORDER = '#F8BBD0';
const { width: SW } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute();
  const params = route.params as { message?: string } | undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErr = (field: string) =>
    setErrors(prev => ({ ...prev, [field]: '' }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email))
      e.email = 'Enter a valid email address';
    if (!password || password.length < 6)
      e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleLogin = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const result = await loginUser(email.trim().toLowerCase(), password);
      if (!result.success) {
        const msg = result.error || 'Invalid credentials. Please try again.';
        if (msg.toLowerCase().includes('verify')) {
          navigation.navigate('VerifyOtp', { email: email.trim().toLowerCase(), password });
          return;
        }
        setErrors({ general: msg });
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../assets/lookrealMainLogo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {params?.message ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.bannerText}>{params.message}</Text>
            </View>
          ) : null}

          {errors.general ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.bannerText}>{errors.general}</Text>
            </View>
          ) : null}

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputRow, errors.email ? styles.inputErr : null]}>
            <Ionicons name="mail-outline" size={18} color={PINK} style={styles.icon} />
            <TextInput
              style={styles.textInput}
              placeholder="example@gmail.com"
              placeholderTextColor="#ccc"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={v => { setEmail(v); clearErr('email'); clearErr('general'); }}
              editable={!loading}
            />
          </View>
          {errors.email ? <Text style={styles.errText}>{errors.email}</Text> : null}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputRow, errors.password ? styles.inputErr : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={PINK} style={styles.icon} />
            <TextInput
              style={styles.textInput}
              placeholder="Password"
              placeholderTextColor="#ccc"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={v => { setPassword(v); clearErr('password'); clearErr('general'); }}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errText}>{errors.password}</Text> : null}

          {/* Remember + Forgot */}
          <View style={styles.rememberRow}>
            <TouchableOpacity style={styles.rememberLeft} onPress={() => setRememberMe(r => !r)} activeOpacity={0.7}>
              <View style={[styles.checkbox, rememberMe ? styles.checkboxOn : null]}>
                {rememberMe ? <Ionicons name="checkmark" size={11} color="white" /> : null}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forget Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>{loading ? 'Please wait...' : 'Log In'}</Text>
            {!loading && <Ionicons name="chevron-forward" size={18} color="white" />}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.socialBtn} onPress={() => Alert.alert('Google Login', 'Coming soon!')} activeOpacity={0.85}>
            <Ionicons name="logo-google" size={20} color="#EA4335" />
            <Text style={styles.socialBtnText}>Login with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialBtn} onPress={() => Alert.alert('Apple Login', 'Coming soon!')} activeOpacity={0.85}>
            <Ionicons name="logo-apple" size={22} color="#000" />
            <Text style={styles.socialBtnText}>Login with Apple</Text>
          </TouchableOpacity>

          <View style={styles.signUpRow}>
            <Text style={styles.signUpText}>Don't have any account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('ChooseRole')} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SW * 0.06,
    paddingVertical: 24,
  },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logoImg: { width: SW * 0.65, height: 100 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  bannerText: { fontSize: 13, flex: 1, color: '#374151' },
  label: { fontSize: 14, fontWeight: '500', color: '#1a1a1a', marginBottom: 8, marginTop: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 52,
  },
  inputErr: { borderColor: '#E53E3E' },
  icon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  eyeBtn: { paddingLeft: 8 },
  errText: { fontSize: 12, color: '#E53E3E', marginTop: 4 },
  rememberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, marginBottom: 4,
  },
  rememberLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: PINK,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxOn: { backgroundColor: PINK, borderColor: PINK },
  rememberText: { fontSize: 13, color: '#555' },
  forgotText: { fontSize: 13, color: PINK, fontWeight: '600' },
  loginBtn: {
    backgroundColor: PINK, borderRadius: 30, paddingVertical: 16, marginTop: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    elevation: 4,
  },
  loginBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#aaa' },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: 'white', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', paddingVertical: 14, marginBottom: 12,
  },
  socialBtnText: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  signUpText: { fontSize: 14, color: '#888' },
  signUpLink: { fontSize: 14, color: PINK, fontWeight: '700' },
});

export default LoginScreen;
