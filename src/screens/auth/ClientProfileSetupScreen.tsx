import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';
import { userAPI, handleAPIError } from '@/api/api';
import { confirmEmailVerification } from '@/utils/authHelper';
import { toast } from '@/components/ui/Toast';
import LocationPickerModal, { LocationResult } from '@/components/LocationPickerModal';

type Props = NativeStackScreenProps<AuthStackParamList, 'ClientProfileSetup'>;

const { width: SW } = Dimensions.get('window');
const P = '#E91E63';
const P_LIGHT = '#FEE2F0';
const TEXT = '#1A1A1A';
const HINT = '#9CA3AF';
const BG = '#FAFAFA';
const CARD = '#FFFFFF';

const ClientProfileSetupScreen = ({ navigation }: Props) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill from existing profile (set during registration)
  useEffect(() => {
    userAPI.getProfile()
      .then(res => {
        const u = res?.data?.user || res?.data || res;
        if (u?.firstName) setFirstName(u.firstName);
        if (u?.lastName) setLastName(u.lastName);
        if (u?.phone) setPhone(u.phone);
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const pickAvatar = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      toast.error(fromCamera ? 'Camera permission denied' : 'Gallery permission denied');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, allowsEditing: true, aspect: [1, 1] });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const showAvatarOptions = () => {
    Alert.alert('Profile Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => pickAvatar(true) },
      { text: 'Gallery', onPress: () => pickAvatar(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleLocationConfirm = (result: LocationResult) => {
    setLocation(result);
    setShowLocationPicker(false);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error('Please fill in your first name, last name, and phone number.');
      return;
    }

    setSaving(true);
    try {
      const profileUpdate: Record<string, any> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      };

      if (location) {
        profileUpdate.location = {
          type: 'Point',
          coordinates: location.coordinates,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
        };
      }

      const tasks: Promise<any>[] = [userAPI.updateProfile(profileUpdate)];

      if (avatarUri) {
        setUploadingAvatar(true);
        tasks.push(userAPI.uploadAvatarOnly(avatarUri).finally(() => setUploadingAvatar(false)));
      }

      await Promise.all(tasks);
      await finish();
    } catch (err: any) {
      const apiError = handleAPIError(err);
      toast.error(apiError.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    await confirmEmailVerification();
  };

  const handleSkip = async () => {
    await finish();
  };

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0 && phone.trim().length > 0;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Image
            source={require('../../../assets/lookrealMainLogo.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.title}>Complete Your Profile</Text>
          <Text style={s.subtitle}>
            Add a few details so vendors{'\n'}can recognise you easily.
          </Text>
        </View>

        {/* Personal details card — required */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Personal Details</Text>
          <Text style={s.cardHint}>Required to book services and receive payments.</Text>

          {loadingProfile ? (
            <ActivityIndicator size="small" color={P} style={{ marginTop: 8 }} />
          ) : (
            <View style={s.fieldsCol}>
              {/* First name */}
              <View style={s.inputWrap}>
                <Ionicons name="person-outline" size={17} color={HINT} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={HINT}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Last name */}
              <View style={s.inputWrap}>
                <Ionicons name="person-outline" size={17} color={HINT} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={HINT}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Phone */}
              <View style={s.inputWrap}>
                <Ionicons name="call-outline" size={17} color={HINT} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor={HINT}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              </View>
            </View>
          )}
        </View>

        {/* Avatar card */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Profile Photo</Text>
          <View style={s.avatarSection}>
            <TouchableOpacity style={s.avatarRing} onPress={showAvatarOptions} activeOpacity={0.8}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Ionicons name="person" size={44} color={P} />
                </View>
              )}
              <View style={s.cameraOverlay}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={s.avatarInfo}>
              <Text style={s.avatarInfoTitle}>
                {avatarUri ? 'Photo selected ✓' : 'Add a profile photo'}
              </Text>
              <Text style={s.avatarInfoHint}>
                A clear headshot helps others{'\n'}know who they're booking with.
              </Text>
              <TouchableOpacity style={s.avatarBtn} onPress={showAvatarOptions} activeOpacity={0.8}>
                <Ionicons name={avatarUri ? 'refresh-outline' : 'image-outline'} size={15} color={P} />
                <Text style={s.avatarBtnTxt}>{avatarUri ? 'Change photo' : 'Choose photo'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Location card */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Your Location</Text>
          <Text style={s.cardHint}>Used to show you nearby vendors and services.</Text>

          <TouchableOpacity
            style={s.locationPickerBtn}
            onPress={() => setShowLocationPicker(true)}
            activeOpacity={0.75}
          >
            {location ? (
              <>
                <View style={s.pinDot} />
                <View style={s.locationTextCol}>
                  <Text style={s.locationCity} numberOfLines={1}>
                    {location.address || [location.city, location.state].filter(Boolean).join(', ')}
                  </Text>
                  <Text style={s.locationMeta}>
                    {[location.city, location.state].filter(Boolean).join(', ')}
                    {'  '}{location.coordinates[1].toFixed(4)}, {location.coordinates[0].toFixed(4)}
                  </Text>
                </View>
                <Ionicons name="pencil" size={15} color={P} />
              </>
            ) : (
              <>
                <Ionicons name="map" size={18} color={P} />
                <Text style={s.locationBtnTxt}>Pick on Map</Text>
                <Ionicons name="chevron-forward" size={15} color={HINT} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* What's next */}
        <View style={s.nextCard}>
          <Text style={s.nextTitle}>What's next?</Text>
          <View style={s.nextItem}>
            <View style={s.nextDot} />
            <Text style={s.nextText}>Browse and book beauty & wellness services</Text>
          </View>
          <View style={s.nextItem}>
            <View style={s.nextDot} />
            <Text style={s.nextText}>Discover top-rated vendors near you</Text>
          </View>
          <View style={s.nextItem}>
            <View style={s.nextDot} />
            <Text style={s.nextText}>Track your bookings and payments</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.saveBtn, (!canSave || saving) && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.saveBtnTxt}>Save &amp; Get Started</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={s.skipTxt}>Skip for now — I'll complete it later</Text>
        </TouchableOpacity>
      </View>

      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={handleLocationConfirm}
        initialLocation={location}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SW * 0.05, paddingBottom: 20, paddingTop: 8 },

  header: { alignItems: 'center', paddingVertical: 24 },
  logo: { width: SW * 0.38, height: 48, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: TEXT, marginBottom: 8 },
  subtitle: { fontSize: 14, color: HINT, textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 4 },
  cardHint: { fontSize: 13, color: HINT, marginBottom: 14 },

  // Personal details
  fieldsCol: { gap: 10 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 13,
    gap: 8,
  },
  inputIcon: {},
  input: { flex: 1, fontSize: 14, color: TEXT },

  // Avatar
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8 },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: P_LIGHT,
    overflow: 'visible', position: 'relative',
  },
  avatarImg: { width: 82, height: 82, borderRadius: 41 },
  avatarPlaceholder: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: P_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: CARD,
  },
  avatarInfo: { flex: 1 },
  avatarInfoTitle: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 4 },
  avatarInfoHint: { fontSize: 12, color: HINT, lineHeight: 18, marginBottom: 10 },
  avatarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: P_LIGHT, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start',
  },
  avatarBtnTxt: { fontSize: 13, color: P, fontWeight: '600' },

  // Location
  locationPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F7F8FA', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 13,
  },
  pinDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: P, flexShrink: 0 },
  locationTextCol: { flex: 1 },
  locationCity: { fontSize: 14, fontWeight: '600', color: TEXT },
  locationMeta: { fontSize: 11, color: HINT, marginTop: 2 },
  locationBtnTxt: { flex: 1, fontSize: 14, color: P, fontWeight: '600' },

  // Next steps
  nextCard: {
    backgroundColor: P_LIGHT, borderRadius: 16,
    padding: 18, marginBottom: 8,
  },
  nextTitle: { fontSize: 13, fontWeight: '700', color: P, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  nextDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: P, marginTop: 5 },
  nextText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 20 },

  // Footer
  footer: {
    backgroundColor: CARD,
    paddingHorizontal: SW * 0.05,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 16 : 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: P, borderRadius: 14,
    paddingVertical: 15,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipTxt: { fontSize: 13, color: HINT, fontWeight: '500' },
});

export default ClientProfileSetupScreen;
