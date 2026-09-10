import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';

const { width: SW, height: SH } = Dimensions.get('window');
const MAP_H = Math.round(SH * 0.48); // fixed map height — always fits any screen

const P = '#E91E63';
const TEXT = '#1A1A1A';
const HINT = '#9CA3AF';

export interface LocationResult {
  coordinates: [number, number]; // [longitude, latitude] — GeoJSON order
  address: string;
  city: string;
  state: string;
  country: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: LocationResult) => void;
  initialLocation?: LocationResult | null;
}

const DEFAULT_REGION: Region = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

const LocationPickerModal = ({ visible, onClose, onConfirm, initialLocation }: Props) => {
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [resolvedCity, setResolvedCity] = useState('');
  const [resolvedState, setResolvedState] = useState('');
  const [resolvedCountry, setResolvedCountry] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentRegionRef = useRef<Region>(DEFAULT_REGION);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintOpacity = useRef(new Animated.Value(0)).current;

  // Confirm only requires an address (typed or reverse-geocoded) + not mid-lookup.
  // We deliberately don't gate on `isDragging` — on Android that flag can get
  // stuck when `animateToRegion` fires `onRegionChange` without a matching
  // `onRegionChangeComplete`, which used to make the button permanently disabled.
  const canConfirm = manualAddress.trim().length > 0 && !geocoding;

  useEffect(() => {
    if (!visible) return;
    setShowHint(!initialLocation);

    if (initialLocation) {
      const r: Region = {
        latitude: initialLocation.coordinates[1],
        longitude: initialLocation.coordinates[0],
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(r);
      currentRegionRef.current = r;
      // Small delay so MapView is mounted before we tell it to move.
      setTimeout(() => mapRef.current?.animateToRegion(r, 0), 60);
      setManualAddress(initialLocation.address);
      setResolvedCity(initialLocation.city);
      setResolvedState(initialLocation.state);
      setResolvedCountry(initialLocation.country);
    } else {
      setManualAddress('');
      setResolvedCity('');
      setResolvedState('');
      setResolvedCountry('');
      goToGPS();
    }
  }, [visible]);

  // Animate hint banner in then fade out after 4 s
  useEffect(() => {
    if (!showHint) { hintOpacity.setValue(0); return; }
    Animated.sequence([
      Animated.timing(hintOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(hintOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowHint(false));
  }, [showHint]);

  const goToGPS = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const newRegion: Region = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setRegion(newRegion);
      currentRegionRef.current = newRegion;
      mapRef.current?.animateToRegion(newRegion, 600);
      reverseGeocode(latitude, longitude);
    } catch {}
    finally { setLocating(false); }
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results?.[0]) {
        const a = results[0];
        const street = [a.streetNumber, a.street || a.name].filter(Boolean).join(' ').trim();
        const city   = a.city || a.subregion || a.district || '';
        const state  = a.region || '';
        const country = a.country || '';
        setManualAddress(street || [city, state].filter(Boolean).join(', '));
        setResolvedCity(city);
        setResolvedState(state);
        setResolvedCountry(country);
      }
    } catch {}
    finally { setGeocoding(false); }
  }, []);

  // Only mark as dragging for real user gestures. `details.isGesture` on
  // react-native-maps >=1.x tells us whether this change came from a finger
  // or from `animateToRegion` — filter animations out so the pin visual
  // doesn't get stuck lifted.
  const handleRegionChange = useCallback((_r: Region, details?: { isGesture?: boolean }) => {
    if (!details?.isGesture) return;
    setIsDragging(true);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
    // Safety net: some Android builds swallow onRegionChangeComplete.
    dragResetTimer.current = setTimeout(() => setIsDragging(false), 2000);
  }, []);

  // Fires on Android for user pan gestures — belt-and-braces fallback if the
  // details.isGesture flag is missing on some devices.
  const handlePanDrag = useCallback(() => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
    setIsDragging(true);
    dragResetTimer.current = setTimeout(() => setIsDragging(false), 2000);
  }, []);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setRegion(r);
    currentRegionRef.current = r;
    setIsDragging(false);
    if (dragResetTimer.current) clearTimeout(dragResetTimer.current);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => reverseGeocode(r.latitude, r.longitude), 600);
  }, [reverseGeocode]);

  const handleConfirm = () => {
    Keyboard.dismiss();
    // Use the ref (updated on every regionChangeComplete + programmatic move)
    // so we send the true current pin position, not stale React state.
    const r = currentRegionRef.current;
    onConfirm({
      coordinates: [r.longitude, r.latitude],
      address: manualAddress.trim(),
      city: resolvedCity,
      state: resolvedState,
      country: resolvedCountry,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* KAV wraps everything — pushes sheet up when keyboard appears */}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#fff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── MAP (fixed height, never shrinks) ── */}
        <View style={{ height: MAP_H }}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            // NOTE: use `initialRegion`, NOT `region`. On Android, feeding a
            // controlled `region` prop back into MapView while the user is
            // dragging snaps the map back on every render — the pin appears
            // stuck. Use `animateToRegion()` via `mapRef` for programmatic moves.
            initialRegion={DEFAULT_REGION}
            onRegionChange={handleRegionChange}
            onRegionChangeComplete={handleRegionChangeComplete}
            onPanDrag={handlePanDrag}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            scrollEnabled
            zoomEnabled
            rotateEnabled
            pitchEnabled
            mapType="standard"
          />

          {/* Crosshair pin */}
          <View pointerEvents="none" style={s.pinWrap}>
            <View style={[s.pin, isDragging && s.pinDragging]}>
              <Ionicons name="location" size={28} color="#fff" />
            </View>
            <View style={[s.pinShadow, isDragging && s.pinShadowDragging]} />
          </View>

          {/* Animated hint banner */}
          {showHint && (
            <Animated.View pointerEvents="none" style={[s.hintBanner, { opacity: hintOpacity }]}>
              <Ionicons name="hand-left-outline" size={18} color="#fff" />
              <Text style={s.hintTxt}>Drag the map to place your pin on your address</Text>
            </Animated.View>
          )}

          {/* Top bar — floats over map. `box-none` = container itself lets touches
              pass through to the map, but the buttons inside still receive taps.
              Without this the transparent bar's bounding box was stealing every
              drag started in the top ~90px of the map. */}
          <View
            pointerEvents="box-none"
            style={[s.topBar, { paddingTop: insets.top + 8 }]}
          >
            <TouchableOpacity style={s.iconBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={TEXT} />
            </TouchableOpacity>
            <View pointerEvents="none" style={s.topLabel}>
              <Text style={s.topLabelTxt}>Drag the map to pin your location</Text>
            </View>
            <TouchableOpacity style={s.iconBtn} onPress={goToGPS} activeOpacity={0.8} disabled={locating}>
              {locating
                ? <ActivityIndicator size="small" color={P} />
                : <Ionicons name="navigate" size={18} color={P} />
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── BOTTOM SHEET (scrollable so keyboard never covers content) ── */}
        <ScrollView
          style={{ flex: 1, backgroundColor: '#fff' }}
          contentContainerStyle={[s.sheet, { paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* City / state row */}
          <View style={s.metaRow}>
            <View style={[s.pinDot, isDragging && s.pinDotMoving]} />
            <View style={{ flex: 1 }}>
              {resolvedCity || resolvedState ? (
                <Text style={s.metaCity}>
                  {[resolvedCity, resolvedState].filter(Boolean).join(', ')}
                  {resolvedCountry ? ` · ${resolvedCountry}` : ''}
                </Text>
              ) : null}
              <Text style={s.metaCoords}>
                {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
              </Text>
            </View>
            {geocoding && <ActivityIndicator size="small" color={P} />}
          </View>

          {/* Address input */}
          <View style={s.addressWrap}>
            <Ionicons name="home-outline" size={17} color={HINT} />
            <TextInput
              style={s.addressInput}
              value={manualAddress}
              onChangeText={setManualAddress}
              placeholder="Street address (tap to edit)"
              placeholderTextColor={HINT}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            {manualAddress.length > 0 && (
              <TouchableOpacity
                onPress={() => setManualAddress('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={HINT} />
              </TouchableOpacity>
            )}
          </View>

          {/* Nudge — shown while we still need input from the user */}
          {!canConfirm && (
            <View style={s.nudgeRow}>
              <Ionicons name="information-circle-outline" size={15} color={P} />
              <Text style={s.nudgeTxt}>
                {locating
                  ? 'Finding your current location…'
                  : geocoding
                  ? 'Getting the address for that pin…'
                  : 'Drag the map to pin your location, or type your address above'}
              </Text>
            </View>
          )}

          {/* Confirm button */}
          <TouchableOpacity
            style={[s.confirmBtn, !canConfirm && s.confirmBtnDim]}
            onPress={canConfirm ? handleConfirm : () => setShowHint(true)}
            activeOpacity={0.85}
            disabled={!canConfirm}
          >
            <Ionicons
              name={locating || geocoding ? 'sync' : 'checkmark-circle'}
              size={20}
              color="#fff"
            />
            <Text style={s.confirmTxt}>
              {locating || geocoding ? 'Locating…' : 'Confirm Location'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = StyleSheet.create({
  pinWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: P,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 8,
  },
  pinDragging: { transform: [{ translateY: -6 }], shadowOpacity: 0.4 },
  pinShadow: {
    width: 10, height: 6, borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 2,
  },
  pinShadowDragging: { width: 14, opacity: 0.15 },

  hintBanner: {
    position: 'absolute',
    bottom: 16, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  hintTxt: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', lineHeight: 18 },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 8, gap: 8,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  topLabel: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  topLabelTxt: { fontSize: 12, color: TEXT, fontWeight: '500', textAlign: 'center' },

  sheet: {
    paddingHorizontal: SW * 0.05,
    paddingTop: 18,
    gap: 14,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pinDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: P },
  pinDotMoving: { backgroundColor: HINT },
  metaCity: { fontSize: 14, fontWeight: '700', color: TEXT },
  metaCoords: {
    fontSize: 11, color: HINT, marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  addressWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  addressInput: { flex: 1, fontSize: 14, color: TEXT },

  nudgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF5F8',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#FCE4EC',
  },
  nudgeTxt: { flex: 1, fontSize: 12, color: P, fontWeight: '500' },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: P,
    borderRadius: 50, paddingVertical: 16,
  },
  confirmBtnDim: { opacity: 0.5 },
  confirmTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default LocationPickerModal;
