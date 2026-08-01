import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Image, StyleSheet, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getStoredUser, updateStoredUser } from '@/utils/authHelper';
import { userAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';

const PRIMARY   = '#E04079';
const BG        = '#FCE4EC';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#1A1A2E';
const TEXT_GRAY = '#6B7280';
const BORDER    = '#F3E6EC';

interface PersonalInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  avatar?: string;
  pendingEmail?: string;
  emailChangeStatus?: string;
  emailChangeRejectionReason?: string;
}

const Field: React.FC<{
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
  keyboardType?: any;
  editable?: boolean;
  verified?: boolean;
}> = ({ label, value, onChangeText, icon, placeholder, keyboardType, editable = true, verified }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputRow, !editable && styles.inputRowDisabled]}>
      <Ionicons name={icon} size={18} color={editable ? PRIMARY : '#C4A0B0'} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C4A0B0"
        keyboardType={keyboardType}
        editable={editable}
      />
      {verified && (
        <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
      )}
    </View>
  </View>
);

const PersonalInformationScreen: React.FC = () => {
  const navigation = useNavigation();
  const { top, bottom } = useSafeAreaInsets();
  const [loading, setLoading]               = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: '', lastName: '', phone: '', email: '', avatar: '',
    pendingEmail: '', emailChangeStatus: '', emailChangeRejectionReason: '',
  });

  // Email change modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [cancellingEmail, setCancellingEmail] = useState(false);

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    try {
      const userData = await getStoredUser();
      if (userData) {
        setFormData({
          firstName: userData.firstName || '',
          lastName:  userData.lastName  || '',
          phone:     userData.phone     || '',
          email:     userData.email     || '',
          avatar:    userData.avatar    || '',
          pendingEmail:              (userData as any).pendingEmail              || '',
          emailChangeStatus:         (userData as any).emailChangeStatus         || '',
          emailChangeRejectionReason:(userData as any).emailChangeRejectionReason|| '',
        });
      }
      // Fetch fresh profile to get email change status
      try {
        const res = await userAPI.getProfile();
        if (res.success && res.data?.user) {
          const u = res.data.user;
          setFormData(prev => ({
            ...prev,
            pendingEmail:               u.pendingEmail               || '',
            emailChangeStatus:          u.emailChangeStatus          || '',
            emailChangeRejectionReason: u.emailChangeRejectionReason || '',
          }));
        }
      } catch (_) {}
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.warning('Permission needed', 'Allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    setUploadingImage(true);
    try {
      const response = await userAPI.uploadAvatar(imageUri, {
        firstName: formData.firstName,
        lastName:  formData.lastName,
        phone:     formData.phone,
      });
      if (response.success) {
        const avatarUrl = response.data.user.avatar;
        setFormData(prev => ({ ...prev, avatar: avatarUrl }));
        const userData = await getStoredUser();
        if (userData) { userData.avatar = avatarUrl; await updateStoredUser(userData); }
        toast.success('Done!', 'Profile photo updated');
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Required', 'First and last name are required');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName:  formData.lastName.trim(),
      };
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      const response = await userAPI.updateProfile(payload);
      if (response.success) {
        const userData = await getStoredUser();
        if (userData) {
          userData.firstName = formData.firstName.trim();
          userData.lastName  = formData.lastName.trim();
          userData.phone     = formData.phone.trim();
          await updateStoredUser(userData);
        }
        toast.success('Saved!', 'Profile updated successfully');
        navigation.goBack();
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEmailChange = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Invalid', 'Please enter a valid email address');
      return;
    }
    setSubmittingEmail(true);
    try {
      const response = await userAPI.requestEmailChange(trimmed);
      if (response.success) {
        setFormData(prev => ({ ...prev, pendingEmail: trimmed, emailChangeStatus: 'pending' }));
        setEmailModalVisible(false);
        setNewEmail('');
        toast.success('Submitted!', 'Your email change request is pending admin approval');
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setSubmittingEmail(false);
    }
  };

  const handleCancelEmailChange = async () => {
    setCancellingEmail(true);
    try {
      const response = await userAPI.cancelEmailChange();
      if (response.success) {
        setFormData(prev => ({
          ...prev,
          pendingEmail: '',
          emailChangeStatus: '',
          emailChangeRejectionReason: '',
        }));
        toast.success('Cancelled', 'Email change request cancelled');
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setCancellingEmail(false);
    }
  };

  const emailStatusBanner = () => {
    if (!formData.emailChangeStatus) return null;

    if (formData.emailChangeStatus === 'pending') {
      return (
        <View style={styles.pendingCard}>
          <View style={styles.pendingTop}>
            <View style={styles.pendingIconWrap}>
              <Ionicons name="hourglass-outline" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.pendingTitle}>Email Change Pending</Text>
              <Text style={styles.pendingNew}>{formData.pendingEmail}</Text>
            </View>
          </View>
          <Text style={styles.pendingHint}>Awaiting admin approval. You'll be notified once reviewed.</Text>
          <TouchableOpacity
            onPress={handleCancelEmailChange}
            disabled={cancellingEmail}
            activeOpacity={0.75}
            style={styles.cancelBtn}
          >
            {cancellingEmail
              ? <ActivityIndicator size="small" color="#D97706" />
              : <>
                  <Ionicons name="close-circle-outline" size={14} color="#D97706" />
                  <Text style={styles.cancelBtnText}>Cancel Request</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      );
    }

    if (formData.emailChangeStatus === 'rejected') {
      return (
        <View style={styles.rejectedCard}>
          <View style={styles.pendingTop}>
            <View style={[styles.pendingIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.pendingTitle, { color: '#991B1B' }]}>Request Rejected</Text>
              {formData.emailChangeRejectionReason ? (
                <Text style={[styles.pendingHint, { color: '#B91C1C', marginTop: 0 }]}>{formData.emailChangeRejectionReason}</Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setEmailModalVisible(true)}
            activeOpacity={0.75}
            style={[styles.cancelBtn, { borderColor: '#FCA5A5' }]}
          >
            <Ionicons name="refresh-outline" size={14} color="#DC2626" />
            <Text style={[styles.cancelBtnText, { color: '#DC2626' }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  if (initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: WHITE, paddingTop: top }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: WHITE }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ backgroundColor: BG }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.85} disabled={uploadingImage} style={styles.avatarTouchable}>
            <View style={styles.avatarWrap}>
              {formData.avatar ? (
                <Image source={{ uri: formData.avatar }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, { backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="person" size={44} color={PRIMARY} />
                </View>
              )}
              {uploadingImage && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={WHITE} />
                </View>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={13} color={WHITE} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Email change status banner */}
        {emailStatusBanner()}

        {/* Form */}
        <View style={styles.formCard}>
          <Field
            label="First Name"
            value={formData.firstName}
            onChangeText={t => setFormData(p => ({ ...p, firstName: t }))}
            icon="person-outline"
            placeholder="First name"
            editable={!loading}
          />
          <Field
            label="Last Name"
            value={formData.lastName}
            onChangeText={t => setFormData(p => ({ ...p, lastName: t }))}
            icon="person-outline"
            placeholder="Last name"
            editable={!loading}
          />
          <Field
            label="Phone Number"
            value={formData.phone}
            onChangeText={t => setFormData(p => ({ ...p, phone: t }))}
            icon="call-outline"
            placeholder="Phone number"
            keyboardType="phone-pad"
            editable={!loading}
            verified={!!formData.phone}
          />

          {/* Email field + change request button */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.inputRow, styles.inputRowDisabled]}>
              <Ionicons name="mail-outline" size={18} color="#C4A0B0" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={formData.email}
                editable={false}
                placeholderTextColor="#C4A0B0"
              />
              {!!formData.email && <Ionicons name="checkmark-circle" size={20} color="#22C55E" />}
            </View>
            {formData.emailChangeStatus !== 'pending' && (
              <TouchableOpacity
                onPress={() => setEmailModalVisible(true)}
                activeOpacity={0.75}
                style={styles.changeEmailBtn}
              >
                <Ionicons name="pencil-outline" size={13} color={PRIMARY} />
                <Text style={styles.changeEmailText}>Request email change</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleUpdate} disabled={loading} activeOpacity={0.88} style={styles.saveBtn}>
          <LinearGradient colors={['#F06292', '#E04079']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGradient}>
            {loading
              ? <ActivityIndicator color={WHITE} />
              : <Text style={styles.saveBtnText}>Save Changes</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Email Change Modal */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setEmailModalVisible(false); setNewEmail(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Email Change</Text>
              <TouchableOpacity onPress={() => { setEmailModalVisible(false); setNewEmail(''); }} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={TEXT_GRAY} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Enter your new email. An admin will review and approve the change.
            </Text>

            <View style={styles.modalCurrentEmail}>
              <Text style={styles.modalCurrentLabel}>Current email</Text>
              <Text style={styles.modalCurrentValue}>{formData.email}</Text>
            </View>

            <View style={styles.modalInputWrap}>
              <Ionicons name="mail-outline" size={18} color={PRIMARY} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.modalInput}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="New email address"
                placeholderTextColor="#C4A0B0"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              onPress={handleRequestEmailChange}
              disabled={submittingEmail}
              activeOpacity={0.88}
              style={styles.modalSubmitBtn}
            >
              <LinearGradient colors={['#F06292', '#E04079']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalSubmitGradient}>
                {submittingEmail
                  ? <ActivityIndicator color={WHITE} />
                  : <Text style={styles.modalSubmitText}>Submit Request</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PersonalInformationScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: WHITE,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },

  scroll: { paddingHorizontal: 0 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatarTouchable: { alignItems: 'center', position: 'relative' },
  avatarWrap: {
    width: 90, height: 90, borderRadius: 45, overflow: 'hidden',
    borderWidth: 3, borderColor: WHITE,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  avatar: { width: '100%', height: '100%' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: WHITE,
  },
  changePhotoText: {
    fontSize: 13, fontWeight: '600', color: PRIMARY, marginTop: 10,
  },

  // Email status cards
  pendingCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#FFFBEB', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#FDE68A',
  },
  rejectedCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#FFF5F5', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#FCA5A5',
  },
  pendingTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pendingIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center',
  },
  pendingTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 1 },
  pendingNew:   { fontSize: 12, fontWeight: '600', color: '#B45309' },
  pendingHint:  { fontSize: 11, color: '#B45309', lineHeight: 16, marginTop: 2 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, marginTop: 10, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FFFBEB',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#D97706' },

  // Form
  formCard: { paddingHorizontal: 16, gap: 16 },
  fieldWrap: {},
  fieldLabel: {
    fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    ...Platform.select({
      ios:     { shadowColor: '#E04079', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  inputRowDisabled: { backgroundColor: '#FDF5F8' },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1, fontSize: 14, color: TEXT_DARK, padding: 0,
  },
  inputDisabled: { color: TEXT_GRAY },

  changeEmailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, alignSelf: 'flex-end',
  },
  changeEmailText: { fontSize: 12, fontWeight: '600', color: PRIMARY },

  // Footer
  footer: {
    backgroundColor: WHITE, paddingHorizontal: 16, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  saveBtn: { borderRadius: 16, overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: WHITE, letterSpacing: 0.2 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: WHITE, borderRadius: 20, width: '100%',
    padding: 24,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: TEXT_DARK },
  modalSub: { fontSize: 13, color: TEXT_GRAY, lineHeight: 18, marginBottom: 16 },
  modalCurrentEmail: {
    backgroundColor: BG, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  modalCurrentLabel: { fontSize: 11, color: TEXT_GRAY, fontWeight: '600', marginBottom: 2 },
  modalCurrentValue: { fontSize: 13, color: TEXT_DARK, fontWeight: '700' },
  modalInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FDF5F8', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#F3E6EC',
  },
  modalInput: { flex: 1, fontSize: 14, color: TEXT_DARK, padding: 0 },
  modalSubmitBtn: { borderRadius: 14, overflow: 'hidden' },
  modalSubmitGradient: { paddingVertical: 14, alignItems: 'center' },
  modalSubmitText: { fontSize: 15, fontWeight: '800', color: WHITE },
});
