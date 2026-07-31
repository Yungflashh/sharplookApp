import React, { useState } from 'react';
import {
  View, TouchableOpacity, Text, ScrollView, KeyboardAvoidingView,
  Platform, TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError } from '@/api/api';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const PRIMARY = '#E04079';
const BG      = '#FCE4EC';
const WHITE   = '#FFFFFF';
const TEXT    = '#1A1A2E';
const GRAY    = '#6B7280';
const MUTED   = '#9CA3AF';
const BORDER  = '#F3E6EC';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<NavProp>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    return true;
  };

  const handleGetCode = async () => {
    setGeneralError('');
    if (!validateEmail()) return;
    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(email.trim().toLowerCase());
      if (response.success) {
        setCodeSent(true);
      } else {
        setGeneralError(response.message || 'Failed to send reset code. Please try again.');
      }
    } catch (error: any) {
      const apiError = handleAPIError(error);
      if (apiError.fieldErrors?.email) {
        setError(apiError.fieldErrors.email);
      }
      setGeneralError(apiError.isNetworkError
        ? 'Network error. Please check your internet connection and try again.'
        : (apiError.message || 'An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('VerifyResetCode', { email: email.trim().toLowerCase() });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={20} color={PRIMARY} />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={38} color={PRIMARY} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Reset Your Password</Text>
            <Text style={styles.subtitle}>Please fill your email address below we will send you a code</Text>
          </View>

          {generalError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
              <Ionicons name="mail-outline" size={18} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="example@gmail.com"
                placeholderTextColor={MUTED}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                  setGeneralError('');
                  setCodeSent(false);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>
            {error ? <Text style={styles.fieldError}>{error}</Text> : null}
          </View>

          {codeSent ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.successBannerText}>Reset code sent successful</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.actionBtn, loading && styles.actionBtnDisabled]}
            onPress={codeSent ? handleContinue : handleGetCode}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Text style={styles.actionBtnText}>{codeSent ? 'Continue' : 'Get Code'}</Text>
                <Ionicons name="chevron-forward" size={18} color={WHITE} style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FCE4EC', alignItems: 'center', justifyContent: 'center',
    position: 'absolute', top: 8, left: 24,
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: GRAY, marginTop: 6, textAlign: 'center', paddingHorizontal: 12 },
  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 14, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  errorBannerText: { color: '#DC2626', fontSize: 13, flex: 1 },
  fieldWrap: { marginBottom: 8 },
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
  successBanner: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8,
  },
  successBannerText: { color: '#16A34A', fontSize: 13, fontWeight: '600' },
  actionBtn: {
    backgroundColor: PRIMARY, borderRadius: 999, height: 54, marginTop: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  actionBtnDisabled: { opacity: 0.7 },
  actionBtnText: { color: WHITE, fontSize: 16, fontWeight: '700' },
  footerRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  footerText: { fontSize: 14, color: GRAY },
  footerLink: { fontSize: 14, color: PRIMARY, fontWeight: '700' },
});

export default ForgotPasswordScreen;
