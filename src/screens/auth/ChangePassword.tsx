import React, { useState } from 'react';
import {
  View, TouchableOpacity, Text, ScrollView, KeyboardAvoidingView,
  Platform, TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '@/types/navigation.types';
import { authAPI, handleAPIError } from '@/api/api';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ChangePassword'>;
type RouteP = RouteProp<AuthStackParamList, 'ChangePassword'>;

const PRIMARY = '#E04079';
const BG      = '#FCE4EC';
const WHITE   = '#FFFFFF';
const TEXT    = '#1A1A2E';
const GRAY    = '#6B7280';
const MUTED   = '#9CA3AF';
const BORDER  = '#F3E6EC';

const REQUIREMENTS = [
  { key: 'lowercase', label: 'A lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'uppercase', label: 'An uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'number', label: 'A number', test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'A special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
] as const;

const ChangePassword = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteP>();
  const { code } = route.params;

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const checks = REQUIREMENTS.map((r) => ({ ...r, met: r.test(password) }));
  const allMet = checks.every((c) => c.met);

  const handleSave = async () => {
    setGeneralError('');
    setConfirmError('');

    if (!allMet) {
      setGeneralError('Please meet all password requirements below.');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.resetPassword(code, password);
      if (response.success) {
        navigation.reset({ index: 0, routes: [{ name: 'ResetPasswordSuccess' }] });
      } else {
        setGeneralError(response.message || 'Failed to reset password. Please try again.');
      }
    } catch (error: any) {
      const apiError = handleAPIError(error);
      setGeneralError(apiError.message || 'The reset code may be invalid or expired. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 }}
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
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>Create a new password</Text>
          </View>

          {generalError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          ) : null}

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={MUTED}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setGeneralError('');
                }}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={19} color={PRIMARY} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.reqTitle}>AT LEAST:</Text>
          <View style={styles.reqGrid}>
            {checks.map((c) => (
              <View key={c.key} style={[styles.reqPill, c.met && styles.reqPillMet]}>
                <Text style={[styles.reqText, c.met && styles.reqTextMet]}>{c.label}</Text>
                {c.met ? <Ionicons name="checkmark" size={14} color={PRIMARY} style={{ marginLeft: 4 }} /> : null}
              </View>
            ))}
          </View>

          <View style={[styles.fieldWrap, { marginTop: 20 }]}>
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <View style={[styles.inputRow, confirmError ? styles.inputRowError : null]}>
              <Ionicons name="lock-closed-outline" size={18} color={MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={MUTED}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setConfirmError('');
                }}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={19} color={PRIMARY} />
              </TouchableOpacity>
            </View>
            {confirmError ? <Text style={styles.fieldError}>{confirmError}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Save</Text>
                <Ionicons name="chevron-forward" size={18} color={WHITE} style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    marginTop: 8, marginBottom: 4,
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 8, marginBottom: 18,
  },
  header: { alignItems: 'center', marginBottom: 22 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: GRAY, marginTop: 4 },
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
  reqTitle: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  reqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reqPill: {
    flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10,
  },
  reqPillMet: { backgroundColor: '#FCE4EC' },
  reqText: { fontSize: 11.5, color: GRAY, fontWeight: '500', textAlign: 'center' },
  reqTextMet: { color: PRIMARY, fontWeight: '700' },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 999, height: 54, marginTop: 26,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: WHITE, fontSize: 16, fontWeight: '700' },
});

export default ChangePassword;
