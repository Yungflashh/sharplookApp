import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError, referralAPI } from '@/api/api';
import { saveRegistrationAuth } from '@/utils/authHelper';
import { toast } from '@/components/ui/Toast';

type Props = NativeStackScreenProps<AuthStackParamList, 'VendorRegister'>;

const { width } = Dimensions.get('window');
const P = '#E91E63';
const P_LIGHT = '#FEE2F0';
const BORDER = '#F0F0F0';
const TEXT = '#1A1A1A';
const HINT = '#9CA3AF';

const COUNTRY_CODES = [
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
];

const VendorRegisterScreen = ({ navigation }: Props) => {
  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('');
  const [countryCode, setCountryCode]         = useState('+234');
  const [countryFlag, setCountryFlag]         = useState('🇳🇬');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [referralCode, setReferralCode]       = useState('');
  const [referralValid, setReferralValid]     = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [referrerName, setReferrerName]       = useState('');
  const [agreeToTerms, setAgreeToTerms]       = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});

  const emailRef   = useRef<TextInput>(null);
  const phoneRef   = useRef<TextInput>(null);
  const passRef    = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const refTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErr = (f: string) => setErrors(prev => ({ ...prev, [f]: '' }));

  const handleReferralChange = (code: string) => {
    setReferralCode(code.toUpperCase());
    setReferralValid(null);
    setReferrerName('');
    if (refTimer.current) clearTimeout(refTimer.current);
    if (code.trim().length >= 6) {
      refTimer.current = setTimeout(() => checkReferral(code.trim().toUpperCase()), 800);
    }
  };

  const checkReferral = async (code: string) => {
    setReferralChecking(true);
    try {
      const res = await referralAPI.validateReferralCode(code);
      const valid = res.data?.success && res.data?.data?.valid === true;
      setReferralValid(valid);
      setReferrerName(valid ? (res.data.data.referrerName || 'a friend') : '');
    } catch {
      setReferralValid(false);
    } finally {
      setReferralChecking(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const parts = fullName.trim().split(/\s+/);
    if (!fullName.trim() || parts.length < 2)
      e.fullName = 'Enter your full name (first and last name)';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email))
      e.email = 'Enter a valid email address';
    if (!phone.trim() || !/^[0-9]{7,15}$/.test(phone.replace(/[\s\-]/g, '')))
      e.phone = 'Enter a valid phone number';
    if (!password || password.length < 8)
      e.password = 'Password must be at least 8 characters';
    if (!confirmPassword)
      e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword)
      e.confirmPassword = 'Passwords do not match';
    if (!agreeToTerms)
      e.terms = 'You must agree to the terms to continue';
    return e;
  };

  const handleContinue = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const parts = fullName.trim().split(/\s+/);
      const payload: any = {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
        email: email.trim().toLowerCase(),
        phone: `${countryCode}${phone.trim()}`,
        password,
        confirmPassword,
        isVendor: true,
      };
      if (referralCode.trim() && referralValid === true)
        payload.referredBy = referralCode.trim();

      const response = await authAPI.register(payload);
      if (response.success && response.data?.accessToken) {
        await saveRegistrationAuth(
          response.data.accessToken,
          response.data.refreshToken,
          response.data.user
        );
        navigation.navigate('VerifyOtp', {
          email: email.trim().toLowerCase(),
          isVendor: true,
        });
      } else {
        toast.error('Registration Failed', response.message || 'Unable to create account.');
      }
    } catch (err: any) {
      const apiError = handleAPIError(err);
      if (apiError.fieldErrors) {
        const mapped: Record<string, string> = {};
        if (apiError.fieldErrors.firstName || apiError.fieldErrors.lastName)
          mapped.fullName = apiError.fieldErrors.firstName || apiError.fieldErrors.lastName || '';
        if (apiError.fieldErrors.email)    mapped.email    = apiError.fieldErrors.email;
        if (apiError.fieldErrors.phone)    mapped.phone    = apiError.fieldErrors.phone;
        if (apiError.fieldErrors.password) mapped.password = apiError.fieldErrors.password;
        setErrors(mapped);
      } else {
        toast.error('Error', apiError.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={ss.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={ss.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={ss.logoWrap}>
          <Image source={require('../../../assets/lookrealMainLogo.png')} style={ss.logo} resizeMode="contain" />
        </View>

        {/* Role tabs */}
        <View style={ss.roleTabs}>
          <TouchableOpacity
            style={ss.roleTabInactive}
            onPress={() => navigation.replace('Register')}
            activeOpacity={0.8}
          >
            <Text style={ss.roleTabInactiveTxt}>Customer</Text>
          </TouchableOpacity>
          <View style={ss.roleTabActive}>
            <Text style={ss.roleTabActiveTxt}>Vendor</Text>
          </View>
        </View>

        <Text style={ss.title}>Vendor Registration</Text>
        <Text style={ss.subtitle}>Please fill your details below</Text>

        {/* Full Name */}
        <Field error={errors.fullName}>
          <Row err={!!errors.fullName}>
            <IconCircle><Ionicons name="person-outline" size={15} color={P} /></IconCircle>
            <TextInput
              style={ss.input}
              placeholder="Full Name"
              placeholderTextColor={HINT}
              value={fullName}
              onChangeText={v => { setFullName(v); clearErr('fullName'); }}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              editable={!loading}
            />
          </Row>
        </Field>

        {/* Email */}
        <Field error={errors.email}>
          <Row err={!!errors.email}>
            <IconCircle><Ionicons name="mail-outline" size={15} color={P} /></IconCircle>
            <TextInput
              ref={emailRef}
              style={ss.input}
              placeholder="Email Address"
              placeholderTextColor={HINT}
              value={email}
              onChangeText={v => { setEmail(v); clearErr('email'); }}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              editable={!loading}
            />
          </Row>
        </Field>

        {/* Phone */}
        <Field error={errors.phone}>
          <Row err={!!errors.phone}>
            <TouchableOpacity style={ss.flagBtn} onPress={() => setShowCountryPicker(true)} activeOpacity={0.7}>
              <Text style={ss.flagEmoji}>{countryFlag}</Text>
              <Text style={ss.codeLabel}>{countryCode}</Text>
              <Ionicons name="chevron-down" size={11} color={HINT} />
            </TouchableOpacity>
            <View style={ss.phoneDivider} />
            <TextInput
              ref={phoneRef}
              style={ss.input}
              placeholder="Phone Number"
              placeholderTextColor={HINT}
              value={phone}
              onChangeText={v => { setPhone(v); clearErr('phone'); }}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              editable={!loading}
            />
          </Row>
        </Field>

        {/* Password */}
        <Field error={errors.password}>
          <Row err={!!errors.password}>
            <IconCircle><Ionicons name="lock-closed-outline" size={15} color={P} /></IconCircle>
            <TextInput
              ref={passRef}
              style={ss.input}
              placeholder="Password"
              placeholderTextColor={HINT}
              value={password}
              onChangeText={v => { setPassword(v); clearErr('password'); }}
              secureTextEntry={!showPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)} activeOpacity={0.7}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={HINT} />
            </TouchableOpacity>
          </Row>
        </Field>

        {/* Confirm Password */}
        <Field error={errors.confirmPassword}>
          <Row err={!!errors.confirmPassword}>
            <IconCircle><Ionicons name="lock-closed-outline" size={15} color={P} /></IconCircle>
            <TextInput
              ref={confirmRef}
              style={ss.input}
              placeholder="Confirm Password"
              placeholderTextColor={HINT}
              value={confirmPassword}
              onChangeText={v => { setConfirmPassword(v); clearErr('confirmPassword'); }}
              secureTextEntry={!showConfirm}
              returnKeyType="next"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirm(p => !p)} activeOpacity={0.7}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={HINT} />
            </TouchableOpacity>
          </Row>
        </Field>

        {/* Referral Code */}
        <View style={ss.field}>
          <View style={[
            ss.inputRow,
            referralValid === true  ? ss.rowSuccess : null,
            referralValid === false ? ss.rowErr     : null,
          ]}>
            <IconCircle>
              <Ionicons
                name="gift-outline"
                size={15}
                color={referralValid === true ? '#059669' : referralValid === false ? '#E53E3E' : P}
              />
            </IconCircle>
            <TextInput
              style={ss.input}
              placeholder="Referral Code (Optional)"
              placeholderTextColor={HINT}
              value={referralCode}
              onChangeText={handleReferralChange}
              autoCapitalize="characters"
              maxLength={12}
              editable={!loading}
            />
            {referralChecking && <ActivityIndicator size="small" color={P} />}
            {!referralChecking && referralValid === true  && <Ionicons name="checkmark-circle" size={20} color="#059669" />}
            {!referralChecking && referralValid === false && referralCode.length >= 6 &&
              <Ionicons name="close-circle" size={20} color="#E53E3E" />}
          </View>
          {referralValid === true && referrerName ? (
            <Text style={ss.referralSuccess}>🎉 Referred by {referrerName}</Text>
          ) : null}
        </View>

        {/* Terms */}
        <TouchableOpacity
          style={ss.termsRow}
          onPress={() => { setAgreeToTerms(p => !p); clearErr('terms'); }}
          activeOpacity={0.8}
        >
          <View style={[ss.checkbox, agreeToTerms && ss.checkboxOn]}>
            {agreeToTerms && <Ionicons name="checkmark" size={11} color="#fff" />}
          </View>
          <Text style={ss.termsText}>
            I agree to the{' '}
            <Text style={ss.link} onPress={() => navigation.navigate('TermsPrivacyAuthScreen', { type: 'terms' })}>
              Terms & Condition
            </Text>
            {' '}and{' '}
            <Text style={ss.link} onPress={() => navigation.navigate('TermsPrivacyAuthScreen', { type: 'privacy' })}>
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>
        {errors.terms ? <Text style={[ss.err, { marginTop: -10, marginBottom: 10 }]}>{errors.terms}</Text> : null}

        {/* CTA */}
        <TouchableOpacity
          style={[ss.btn, loading && { opacity: 0.7 }]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <><Text style={ss.btnTxt}>Continue</Text><Ionicons name="chevron-forward" size={18} color="#fff" /></>
          }
        </TouchableOpacity>

        {/* Login */}
        <View style={ss.loginRow}>
          <Text style={ss.loginHint}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
            <Text style={ss.loginLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Country picker */}
      <Modal visible={showCountryPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCountryPicker(false)}>
        <SafeAreaView style={ss.pickerSafe} edges={['top', 'bottom']}>
          <View style={ss.pickerHeader}>
            <Text style={ss.pickerTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setShowCountryPicker(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={TEXT} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={COUNTRY_CODES}
            keyExtractor={item => item.code}
            renderItem={({ item }) => {
              const sel = item.code === countryCode;
              return (
                <TouchableOpacity
                  style={[ss.cItem, sel && ss.cItemSel]}
                  onPress={() => { setCountryCode(item.code); setCountryFlag(item.flag); setShowCountryPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={ss.cFlag}>{item.flag}</Text>
                  <Text style={[ss.cName, sel && { color: P, fontWeight: '600' }]}>{item.name}</Text>
                  <Text style={ss.cCode}>{item.code}</Text>
                  {sel && <Ionicons name="checkmark-circle" size={20} color={P} />}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

// ── tiny layout helpers ───────────────────────────────────────────────────────
const Field = ({ children, error }: { children: React.ReactNode; error?: string }) => (
  <View style={ss.field}>
    {children}
    {error ? <Text style={ss.err}>{error}</Text> : null}
  </View>
);

const Row = ({ children, err }: { children: React.ReactNode; err?: boolean }) => (
  <View style={[ss.inputRow, err ? ss.rowErr : null]}>{children}</View>
);

const IconCircle = ({ children }: { children: React.ReactNode }) => (
  <View style={ss.iconCircle}>{children}</View>
);

// ─────────────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: width * 0.06, paddingBottom: 40, paddingTop: 16 },

  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo:     { width: width * 0.42, height: 56 },

  // Role tabs
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 30,
    padding: 4,
    marginBottom: 24,
  },
  roleTabActive: {
    flex: 1, paddingVertical: 10, borderRadius: 26,
    backgroundColor: P, alignItems: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  roleTabActiveTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  roleTabInactive:  { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 26 },
  roleTabInactiveTxt: { fontSize: 14, fontWeight: '600', color: HINT },

  title:    { fontSize: 22, fontWeight: '700', color: TEXT, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: HINT, textAlign: 'center', marginBottom: 24 },

  field:    { marginBottom: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 52,
  },
  rowErr:     { borderColor: '#E53E3E' },
  rowSuccess: { borderColor: '#059669', backgroundColor: '#F0FFF4' },
  iconCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  input:        { flex: 1, fontSize: 15, color: TEXT },
  flagBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  flagEmoji:    { fontSize: 18 },
  codeLabel:    { fontSize: 14, color: TEXT, fontWeight: '500' },
  phoneDivider: { width: 1, height: 24, backgroundColor: BORDER, marginRight: 10 },
  err:          { fontSize: 12, color: '#E53E3E', marginTop: 4, marginLeft: 4 },
  referralSuccess: { fontSize: 12, color: '#059669', marginTop: 4, marginLeft: 4, fontWeight: '500' },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5,
    borderColor: BORDER, backgroundColor: '#FAFAFA',
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxOn: { backgroundColor: P, borderColor: P },
  termsText:  { flex: 1, fontSize: 13, color: '#555', lineHeight: 19 },
  link:       { color: P, fontWeight: '600' },

  btn: {
    backgroundColor: P, borderRadius: 30, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: P, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginBottom: 20,
  },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  loginRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginHint: { fontSize: 14, color: '#888' },
  loginLink: { fontSize: 14, color: P, fontWeight: '700' },

  // Country picker
  pickerSafe:   { flex: 1, backgroundColor: '#fff' },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  cItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F9F9F9',
  },
  cItemSel: { backgroundColor: P_LIGHT },
  cFlag:    { fontSize: 22 },
  cName:    { flex: 1, fontSize: 15, color: TEXT },
  cCode:    { fontSize: 14, color: HINT },
});

export default VendorRegisterScreen;
