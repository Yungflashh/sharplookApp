import React, { useState } from 'react';
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

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const { width } = Dimensions.get('window');
const P = '#E91E63';
const P_LIGHT = '#FEE2F0';
const BG = '#FFF5F9';
const TEXT = '#1A1A1A';
const HINT = '#9CA3AF';
const BORDER = '#E2E8F0';

const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const isValid = /\S+@\S+\.\S+/.test(email.trim());

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!isValid) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <Ionicons name="lock-closed" size={52} color={P} />
            <View style={[s.badge, s.badgeTopRight]}>
              <Ionicons name="mail" size={14} color="#fff" />
            </View>
            <View style={[s.badge, s.badgeBottomLeft]}>
              <Ionicons name="key" size={12} color="#fff" />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={s.title}>Forgot Password?</Text>
        <Text style={s.subtitle}>
          No worries! Enter your email below and{'\n'}we'll send you a 6-digit reset code.
        </Text>

        {/* Error */}
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Email input */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Email Address</Text>
          <View style={[s.inputRow, focused && s.inputRowFocused, error && s.inputRowErr]}>
            <Ionicons name="mail-outline" size={20} color={focused ? P : HINT} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Enter your email"
              placeholderTextColor={HINT}
              value={email}
              onChangeText={t => { setEmail(t); setError(''); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />
            {email.length > 0 && isValid && (
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            )}
          </View>
        </View>

        {/* Info box */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle" size={17} color={P} />
          <Text style={s.infoText}>
            A 6-digit code will be sent to your inbox. Check your spam folder if you don't see it.
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btn, (!isValid || loading) && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={s.btnInner}>
              <Text style={s.btnTxt}>Send Reset Code</Text>
              <Ionicons name="send" size={18} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <View style={s.loginRow}>
          <Text style={s.loginHint}>Remember your password? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
            <Text style={s.loginLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
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

  illustrationWrap: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  illustrationCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: P_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center',
    shadowColor: P, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  badgeTopRight: { top: 12, right: 12 },
  badgeBottomLeft: { bottom: 16, left: 12 },

  title: { fontSize: 26, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: HINT, textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1,
    borderColor: '#FECACA', padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626' },

  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 14, backgroundColor: '#fff', gap: 10,
  },
  inputRowFocused: { borderColor: P, backgroundColor: P_LIGHT },
  inputRowErr: { borderColor: '#E53E3E' },
  inputIcon: {},
  input: { flex: 1, fontSize: 15, color: TEXT },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: P_LIGHT, borderRadius: 12, padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 19 },

  footer: {
    paddingHorizontal: width * 0.06,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: BG,
    gap: 16,
  },
  btn: {
    backgroundColor: P, borderRadius: 50,
    paddingVertical: 17, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnTxt: { fontSize: 17, fontWeight: '700', color: '#fff' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginHint: { fontSize: 14, color: HINT },
  loginLink: { fontSize: 14, color: P, fontWeight: '700' },
});

export default ForgotPasswordScreen;
