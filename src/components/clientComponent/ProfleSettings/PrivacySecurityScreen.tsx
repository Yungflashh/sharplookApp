import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { userAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

const PINK   = '#E04079';
const PINK_S = '#FFF0F7';
const TEXT1  = '#111827';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';
const BG     = '#F8F9FA';
const WHITE  = '#FFFFFF';

const PrivacySecurityScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [biometricsEnabled, setBiometricsEnabled]     = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsType, setBiometricsType]           = useState<string>('');
  const [loading, setLoading]                         = useState(false);
  const [preferencesLoading, setPreferencesLoading]   = useState(true);
  const [hasWithdrawalPin, setHasWithdrawalPin]       = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false, title: '', message: '', confirmText: 'Confirm', onConfirm: () => {},
  });

  useEffect(() => { checkBiometrics(); loadUserPreferences(); }, []);

  useFocusEffect(React.useCallback(() => { loadUserPreferences(); }, []));

  const checkBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setBiometricsAvailable(compatible);
      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricsType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricsType('Fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricsType('Iris');
        }
      }
    } catch {}
  };

  const loadUserPreferences = async () => {
    setPreferencesLoading(true);
    try {
      const response = await userAPI.getProfile();
      const userData = response.data?.data?.user || response.data?.user;
      if (userData?.preferences) {
        setBiometricsEnabled(userData.preferences.fingerprintEnabled || false);
      }
      if (userData?.hasWithdrawalPin !== undefined) {
        setHasWithdrawalPin(userData.hasWithdrawalPin);
      }
    } catch {}
    finally { setPreferencesLoading(false); }
  };

  const handleBiometricsToggle = async () => {
    if (!biometricsAvailable) {
      toast.info('Not Available', 'Biometric authentication is not available on this device');
      return;
    }
    if (!biometricsEnabled) {
      try {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          setConfirmModal({
            visible: true,
            title: 'Setup Required',
            message: `Please set up ${biometricsType || 'biometric authentication'} in your device settings first.`,
            confirmText: 'OK',
            onConfirm: () => {},
          });
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricsType || 'biometric'} authentication`,
          cancelLabel: 'Cancel',
          disableDeviceFallback: true,
          fallbackLabel: '',
        });
        if (result.success) {
          await updateBiometricPreference(true);
        } else {
          toast.error('Authentication Failed', result.error === 'user_cancel' ? 'Authentication was cancelled' : 'Could not verify your identity');
        }
      } catch {
        toast.error('Error', 'Failed to enable biometric authentication');
      }
    } else {
      setConfirmModal({
        visible: true,
        title: 'Disable Biometrics',
        message: 'Are you sure you want to disable biometric authentication?',
        confirmText: 'Disable',
        onConfirm: () => updateBiometricPreference(false),
      });
    }
  };

  const updateBiometricPreference = async (enabled: boolean) => {
    setLoading(true);
    try {
      await userAPI.updatePreferences({ fingerprintEnabled: enabled });
      setBiometricsEnabled(enabled);
      toast.success('Success', `Biometric authentication ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message);
      setBiometricsEnabled(!enabled);
    } finally { setLoading(false); }
  };

  const handleNavigateToSetPin = () => {
    if (hasWithdrawalPin) {
      setConfirmModal({
        visible: true,
        title: 'PIN Already Set',
        message: 'You already have a withdrawal PIN. Would you like to change it?',
        confirmText: 'Change PIN',
        onConfirm: () => navigation.navigate('ChangeWithdrawalPin' as never),
      });
    } else {
      navigation.navigate('SetWithdrawalPin' as never);
    }
  };

  const biometricTitle    = biometricsAvailable && biometricsType ? `${biometricsType} Authentication` : 'Biometric Authentication';
  const biometricSubtitle = biometricsAvailable
    ? `Use ${biometricsType || 'biometrics'} to log in quickly and securely`
    : 'Not available on this device';
  const infoNote = biometricsAvailable
    ? `${biometricsType || 'Biometric'} authentication provides quick and secure access to your account.`
    : 'Enable two-factor authentication for maximum account protection.';

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Header */}
      <View style={{ backgroundColor: WHITE, paddingTop: insets.top }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={PINK} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Privacy & Security</Text>
          <View style={{ width: 38 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {preferencesLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <ActivityIndicator size="large" color={PINK} />
            <Text style={{ fontSize: 13, color: TEXT2, marginTop: 12 }}>Loading settings…</Text>
          </View>
        ) : (
          <>
            {/* Security section */}
            <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 24 }}>
              <Text style={s.sectionLabel}>Security Settings</Text>
              <View style={s.card}>

                {/* Biometrics */}
                <View style={[s.row, s.rowBorder]}>
                  <View style={[s.iconWrap, { backgroundColor: PINK_S }]}>
                    <Ionicons name="finger-print" size={22} color={PINK} />
                  </View>
                  <View style={s.rowBody}>
                    <Text style={s.rowTitle}>{biometricTitle}</Text>
                    <Text style={s.rowSub}>{biometricSubtitle}</Text>
                  </View>
                  {loading ? (
                    <ActivityIndicator size="small" color={PINK} />
                  ) : (
                    <Switch
                      value={biometricsEnabled}
                      onValueChange={handleBiometricsToggle}
                      disabled={!biometricsAvailable || loading}
                      trackColor={{ false: BORDER, true: '#FBBDE3' }}
                      thumbColor={biometricsEnabled ? PINK : '#F3F4F6'}
                    />
                  )}
                </View>

                {/* Change Password */}
                <TouchableOpacity
                  style={[s.row, s.rowBorder]}
                  onPress={() => navigation.navigate('ChangePassword' as never)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <View style={[s.iconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="lock-closed" size={20} color="#3B82F6" />
                  </View>
                  <View style={s.rowBody}>
                    <Text style={s.rowTitle}>Change Password</Text>
                    <Text style={s.rowSub}>Update your account password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT3} />
                </TouchableOpacity>

                {/* Withdrawal PIN */}
                <TouchableOpacity
                  style={s.row}
                  onPress={handleNavigateToSetPin}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <View style={[s.iconWrap, { backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="keypad" size={20} color="#F59E0B" />
                  </View>
                  <View style={s.rowBody}>
                    <Text style={s.rowTitle}>{hasWithdrawalPin ? 'Change Withdrawal PIN' : 'Set Withdrawal PIN'}</Text>
                    <Text style={s.rowSub}>{hasWithdrawalPin ? 'Update your wallet security PIN' : 'Secure your wallet transactions'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEXT3} />
                </TouchableOpacity>

              </View>
            </View>

            {/* Info note */}
            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={PINK} />
              <Text style={s.infoText}>{infoNote}</Text>
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, visible: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />
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

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: TEXT2,
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10,
  },

  card: {
    backgroundColor: WHITE, borderRadius: 18,
    overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
    ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 } }),
  },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: TEXT1, marginBottom: 2 },
  rowSub: { fontSize: 12, color: TEXT2 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: PINK_S, borderRadius: 14,
    marginHorizontal: 16, padding: 14,
  },
  infoText: { flex: 1, fontSize: 12, color: PINK, lineHeight: 18, fontWeight: '500' },
});

export default PrivacySecurityScreen;
