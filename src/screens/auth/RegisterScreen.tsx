import React, { useState, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';
import { hasRead } from './registerReadState';
import { authAPI, handleAPIError } from '@/api/api';
import { CountryCodePicker } from '@/components/ui/forms';

const BG = '#FFF0F5';
const PINK = '#E91E63';
const BORDER = '#F8BBD0';
const { width: SW } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute();
  const params = route.params as { isVendor?: boolean } | undefined;
  const isVendor = params?.isVendor === true;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+234');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(isVendor || hasRead('terms'));
  const [hasReadPrivacy, setHasReadPrivacy] = useState(isVendor || hasRead('privacy'));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (hasRead('terms')) setHasReadTerms(true);
      if (hasRead('privacy')) setHasReadPrivacy(true);
    }, [])
  );

  const canToggleAgreed = hasReadTerms && hasReadPrivacy;

  const passwordRules = [
    { id: 'length', label: '8+ characters', test: (p: string) => p.length >= 8 },
    { id: 'upper', label: '1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { id: 'number', label: '1 number', test: (p: string) => /[0-9]/.test(p) },
  ];

  const clearErr = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
    setGeneralError('');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Valid email is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    if (!password || password.length < 8) {
      e.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      e.password = 'Password must include at least one uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      e.password = 'Password must include at least one number';
    }
    if (!canToggleAgreed) e.agreed = 'Please read Terms & Privacy Policy first';
    else if (!agreed) e.agreed = 'You must agree to the terms';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setGeneralError('');
    try {
      const parts = fullName.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || parts[0];
      const response = await authAPI.register({
        firstName, lastName,
        email: email.trim().toLowerCase(),
        phone: `${countryCode}${phone.trim()}`,
        password, confirmPassword: password, isVendor,
      } as any);
      if (response.success) {
        navigation.navigate('VerifyOtp', { email: email.trim().toLowerCase(), isVendor, password });
      } else {
        setGeneralError(response.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      const apiErr = handleAPIError(err);
      if (apiErr.fieldErrors) {
        const mapped: Record<string, string> = {};
        const fe = apiErr.fieldErrors;
        if (fe.firstName || fe.lastName) mapped.fullName = fe.firstName || fe.lastName;
        if (fe.email) mapped.email = fe.email;
        if (fe.phone) mapped.phone = fe.phone;
        if (fe.password) mapped.password = fe.password;
        setErrors(prev => ({ ...prev, ...mapped }));
        if (Object.keys(mapped).length === 0) {
          setGeneralError(apiErr.message || 'Please check your details and try again.');
        }
      } else {
        setGeneralError(apiErr.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('ChooseRole')} activeOpacity={0.7}>
            <View style={styles.backCircle}>
              <Ionicons name="chevron-back" size={20} color={PINK} />
            </View>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../../assets/lookrealMainLogo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>{isVendor ? 'Vendor Registration' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>Please fill your details below</Text>

          {generalError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.bannerText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <View style={[styles.inputRow, errors.fullName && styles.inputErr]}>
            <Ionicons name="person-outline" size={18} color={PINK} style={styles.icon} />
            <TextInput
              style={styles.textInput}
              placeholder="Clara Sarah"
              placeholderTextColor="#ccc"
              value={fullName}
              onChangeText={v => { setFullName(v); clearErr('fullName'); }}
              editable={!loading}
            />
          </View>
          {errors.fullName ? <Text style={styles.errText}>{errors.fullName}</Text> : null}

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputRow, errors.email && styles.inputErr]}>
            <Ionicons name="mail-outline" size={18} color={PINK} style={styles.icon} />
            <TextInput
              style={styles.textInput}
              placeholder="you@example.com"
              placeholderTextColor="#ccc"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={v => { setEmail(v); clearErr('email'); }}
              editable={!loading}
            />
          </View>
          {errors.email ? <Text style={styles.errText}>{errors.email}</Text> : null}

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputRow, errors.phone && styles.inputErr]}>
            <TouchableOpacity style={styles.ccBtn} onPress={() => setShowCountryPicker(true)} activeOpacity={0.7}>
              <Text style={styles.ccText}>{countryCode}</Text>
              <Ionicons name="chevron-down" size={14} color={PINK} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="9019622107"
              placeholderTextColor="#ccc"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={v => { setPhone(v); clearErr('phone'); }}
              editable={!loading}
            />
          </View>
          {errors.phone ? <Text style={styles.errText}>{errors.phone}</Text> : null}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputRow, errors.password && styles.inputErr]}>
            <Ionicons name="lock-closed-outline" size={18} color={PINK} style={styles.icon} />
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              placeholderTextColor="#ccc"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={v => { setPassword(v); clearErr('password'); }}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errText}>{errors.password}</Text> : null}
          {password.length > 0 && !errors.password && (
            <View style={styles.pwdRules}>
              {passwordRules.map(rule => (
                <View key={rule.id} style={styles.pwdRule}>
                  <Ionicons
                    name={rule.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                    size={13}
                    color={rule.test(password) ? '#059669' : '#bbb'}
                  />
                  <Text style={[styles.pwdRuleText, rule.test(password) && styles.pwdRulePass]}>
                    {rule.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Terms */}
          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => {
                if (!canToggleAgreed) {
                  setErrors(prev => ({ ...prev, agreed: 'Please read both documents first' }));
                  return;
                }
                setAgreed(a => !a);
                setErrors(prev => ({ ...prev, agreed: '' }));
              }}
              activeOpacity={canToggleAgreed ? 0.7 : 1}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxOn, !canToggleAgreed && styles.checkboxLocked]}>
                {agreed
                  ? <Ionicons name="checkmark" size={13} color="white" />
                  : !canToggleAgreed
                  ? <Ionicons name="lock-closed" size={10} color="#ccc" />
                  : null}
              </View>
            </TouchableOpacity>
            <Text style={styles.termsText}>
              {'I agree to the '}
              <Text
                style={[styles.termsLink, hasReadTerms && styles.termsLinkRead]}
                onPress={() => navigation.navigate('TermsPrivacyAuthScreen', { type: 'terms' })}
              >
                Terms & Condition{hasReadTerms ? ' ✓' : ''}
              </Text>
              {' and '}
              <Text
                style={[styles.termsLink, hasReadPrivacy && styles.termsLinkRead]}
                onPress={() => navigation.navigate('TermsPrivacyAuthScreen', { type: 'privacy' })}
              >
                Privacy Policy{hasReadPrivacy ? ' ✓' : ''}
              </Text>
            </Text>
          </View>
          {!canToggleAgreed && !errors.agreed
            ? <Text style={styles.hintText}>Tap each link above to read, then tick to agree</Text>
            : null}
          {errors.agreed ? <Text style={styles.errText}>{errors.agreed}</Text> : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>{loading ? 'Please wait...' : 'Continue'}</Text>
            {!loading && <Ionicons name="chevron-forward" size={18} color="white" />}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryCodePicker
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        onSelect={(code: string) => { setCountryCode(code); setShowCountryPicker(false); }}
        selectedCode={countryCode}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: SW * 0.06, paddingVertical: 16 },
  backBtn: { marginBottom: 12 },
  backCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center', elevation: 2,
  },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logoImg: { width: SW * 0.65, height: 96 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
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
  ccBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ccText: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  divider: { width: 1, height: 22, backgroundColor: BORDER, marginHorizontal: 10 },
  errText: { fontSize: 12, color: '#E53E3E', marginTop: 4 },
  termsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: PINK,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  checkboxOn: { backgroundColor: PINK, borderColor: PINK },
  checkboxLocked: { borderColor: '#ddd', backgroundColor: '#f9f9f9' },
  termsText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },
  termsLink: { color: PINK, fontWeight: '600', textDecorationLine: 'underline' },
  termsLinkRead: { color: '#059669' },
  hintText: { fontSize: 12, color: '#aaa', marginTop: 6, marginLeft: 30 },
  submitBtn: {
    backgroundColor: PINK, borderRadius: 30, paddingVertical: 16, marginTop: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    elevation: 4,
  },
  submitText: { color: 'white', fontSize: 16, fontWeight: '600' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { fontSize: 14, color: '#888' },
  loginLink: { fontSize: 14, color: PINK, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  bannerText: { fontSize: 13, flex: 1, color: '#374151' },
  pwdRules: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  pwdRule: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pwdRuleText: { fontSize: 12, color: '#bbb' },
  pwdRulePass: { color: '#059669' },
});

export default RegisterScreen;
