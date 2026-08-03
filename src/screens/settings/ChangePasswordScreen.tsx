import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const PINK_M = '#FCDCE9';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG     = '#F8F9FA';
const WHITE  = '#FFFFFF';

const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const meetsLength    = newPassword.length >= 8;
  const meetsUpper     = /[A-Z]/.test(newPassword);
  const meetsNumber    = /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit      = currentPassword.length > 0 && meetsLength && meetsUpper && meetsNumber && passwordsMatch;

  const handleSubmit = async () => {
    if (!currentPassword) { setError('Please enter your current password'); return; }
    if (!meetsLength || !meetsUpper || !meetsNumber) { setError('New password does not meet the requirements below'); return; }
    if (!passwordsMatch) { setError('Passwords do not match'); return; }
    if (currentPassword === newPassword) { setError('New password must be different from your current password'); return; }

    setLoading(true);
    setError('');
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      navigation.goBack();
    } catch (err: any) {
      const apiError = handleAPIError(err);
      setError(apiError.message || 'Failed to change password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const Req = ({ met, label }: { met: boolean; label: string }) => (
    <View style={s.reqRow}>
      <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={met ? '#16A34A' : TEXT3} />
      <Text style={[s.reqTxt, met && s.reqTxtMet]}>{label}</Text>
    </View>
  );

  const Field = ({
    label, icon, value, onChange, secure, show, onToggleShow, returnKey, onNext, inputRef, placeholder,
    matchBorder,
  }: {
    label: string; icon: string; value: string; onChange: (t: string) => void;
    secure: boolean; show: boolean; onToggleShow: () => void;
    returnKey?: 'next' | 'done'; onNext?: () => void; inputRef?: React.RefObject<TextInput>;
    placeholder: string; matchBorder?: 'ok' | 'err' | null;
  }) => (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[
        s.inputRow,
        matchBorder === 'ok' && s.inputRowOk,
        matchBorder === 'err' && s.inputRowErr,
      ]}>
        <Ionicons name={icon as any} size={18} color={TEXT3} />
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={TEXT3}
          value={value}
          onChangeText={t => { onChange(t); setError(''); }}
          secureTextEntry={!show}
          autoCapitalize="none"
          returnKeyType={returnKey ?? 'done'}
          onSubmitEditing={onNext ?? handleSubmit}
          editable={!loading}
        />
        <TouchableOpacity onPress={onToggleShow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={TEXT3} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Header */}
      <View style={{ backgroundColor: WHITE, paddingTop: insets.top }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={PINK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Change Password</Text>
          <View style={{ width: 38 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 24 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon hero */}
        <View style={s.hero}>
          <View style={s.heroCircle}>
            <Ionicons name="lock-closed" size={32} color={PINK} />
          </View>
          <Text style={s.heroTitle}>Secure your account</Text>
          <Text style={s.heroSub}>Choose a strong password you haven't used before</Text>
        </View>

        {/* Error banner */}
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Current password card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Current Password</Text>
          <Field
            label="Enter your current password"
            icon="lock-closed-outline"
            value={currentPassword}
            onChange={setCurrentPassword}
            secure placeholder="Current password"
            show={showCurrent} onToggleShow={() => setShowCurrent(p => !p)}
            returnKey="next" onNext={() => newRef.current?.focus()}
          />
        </View>

        {/* New password card */}
        <View style={[s.card, { marginTop: 12 }]}>
          <Text style={s.cardTitle}>New Password</Text>
          <Field
            label="New password"
            icon="key-outline"
            value={newPassword}
            onChange={setNewPassword}
            secure placeholder="Create new password"
            show={showNew} onToggleShow={() => setShowNew(p => !p)}
            returnKey="next" onNext={() => confirmRef.current?.focus()}
            inputRef={newRef}
          />
          <Field
            label="Confirm new password"
            icon="checkmark-circle-outline"
            value={confirmPassword}
            onChange={setConfirmPassword}
            secure placeholder="Re-enter new password"
            show={showConfirm} onToggleShow={() => setShowConfirm(p => !p)}
            returnKey="done"
            inputRef={confirmRef}
            matchBorder={
              confirmPassword.length > 0 ? (passwordsMatch ? 'ok' : 'err') : null
            }
          />

          {/* Requirements */}
          <View style={s.reqBox}>
            <Text style={s.reqTitle}>Password must include:</Text>
            <Req met={meetsLength}    label="At least 8 characters" />
            <Req met={meetsUpper}     label="One uppercase letter (A–Z)" />
            <Req met={meetsNumber}    label="One number (0–9)" />
            <Req met={passwordsMatch} label="Passwords match" />
          </View>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[s.btn, (!canSubmit || loading) && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={WHITE} />
          ) : (
            <View style={s.btnInner}>
              <Ionicons name="checkmark-circle" size={20} color={WHITE} />
              <Text style={s.btnTxt}>Update Password</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT1 },

  hero: { alignItems: 'center', paddingVertical: 16, marginBottom: 4 },
  heroCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PINK_S, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 17, fontWeight: '700', color: TEXT1, marginBottom: 4 },
  heroSub: { fontSize: 13, color: TEXT2, textAlign: 'center', lineHeight: 18 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1,
    borderColor: '#FECACA', padding: 12, marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 18 },

  card: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT1, marginBottom: 14 },

  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: TEXT2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    backgroundColor: BG,
  },
  inputRowOk: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  inputRowErr: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  input: { flex: 1, fontSize: 15, color: TEXT1, paddingVertical: 0 },

  reqBox: {
    backgroundColor: BG, borderRadius: 12, padding: 14,
    gap: 7, marginTop: 4, borderWidth: 1, borderColor: BORDER,
  },
  reqTitle: { fontSize: 12, fontWeight: '700', color: TEXT2, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqTxt: { fontSize: 13, color: TEXT3 },
  reqTxtMet: { color: '#16A34A', fontWeight: '600' },

  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: WHITE, borderTopWidth: 1, borderTopColor: BORDER,
  },
  btn: {
    backgroundColor: PINK, borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnTxt: { fontSize: 16, fontWeight: '700', color: WHITE },
});

export default ChangePasswordScreen;
