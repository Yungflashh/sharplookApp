import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

interface LocationData {
  coordinates: number[]; // [longitude, latitude]
  address: string;
}

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: LocationData) => void;
  currentLocation: LocationData | null;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  visible,
  onClose,
  onSelectLocation,
  currentLocation,
}) => {
  const [region, setRegion] = useState({
    latitude: 6.5244, // Default to Lagos
    longitude: 3.3792,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [markerPosition, setMarkerPosition] = useState({
    latitude: 6.5244,
    longitude: 3.3792,
  });

  const [address, setAddress] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Initialize with current location or user's location
  useEffect(() => {
    if (visible) {
      if (currentLocation) {
        // Use existing location
        const lat = currentLocation.coordinates[1];
        const lng = currentLocation.coordinates[0];
        setRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
        setMarkerPosition({ latitude: lat, longitude: lng });
        setAddress(currentLocation.address);
      } else {
        // Get current location
        getCurrentLocation();
      }
    }
  }, [visible, currentLocation]);

  const getCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to find your current location.'
        );
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setMarkerPosition({ latitude, longitude });

      // Get address from coordinates
      await reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your current location');
    } finally {
      setLoadingLocation(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    setLoadingAddress(true);
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (result.length > 0) {
        const loc = result[0];
        const formattedAddress = [
          loc.street,
          loc.city,
          loc.region,
          loc.country,
        ]
          .filter(Boolean)
          .join(', ');

        setAddress(formattedAddress || 'Unknown location');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setAddress('Unknown location');
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerPosition({ latitude, longitude });
    reverseGeocode(latitude, longitude);
  };

  const handleConfirm = () => {
    if (!address || address === 'Unknown location') {
      Alert.alert('Error', 'Please select a valid location');
      return;
    }

    const locationData: LocationData = {
      coordinates: [markerPosition.longitude, markerPosition.latitude],
      address,
    };

    onSelectLocation(locationData);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200 bg-white z-10">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-bold text-gray-900">
              Select Location
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Address Display */}
          <View className="bg-gray-50 rounded-xl p-3 flex-row items-center">
            <Ionicons name="location" size={20} color="#ec4899" style={{ marginRight: 8 }} />
            {loadingAddress ? (
              <ActivityIndicator size="small" color="#ec4899" />
            ) : (
              <Text className="flex-1 text-sm text-gray-700" numberOfLines={2}>
                {address || 'Tap on map to select location'}
              </Text>
            )}
          </View>
        </View>

        {/* Map */}
        <View className="flex-1">
          {loadingLocation ? (
            <View className="flex-1 items-center justify-center bg-gray-100">
              <ActivityIndicator size="large" color="#ec4899" />
              <Text className="text-gray-600 mt-4">Getting your location...</Text>
            </View>
          ) : (
            <MapView
              style={{ flex: 1 }}
              initialRegion={region}
              onPress={handleMapPress}
            >
              <Marker
                coordinate={markerPosition}
                draggable
                onDragEnd={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setMarkerPosition({ latitude, longitude });
                  reverseGeocode(latitude, longitude);
                }}
              >
                <View className="items-center">
                  <Ionicons name="location" size={40} color="#ec4899" />
                </View>
              </Marker>
            </MapView>
          )}

          {/* Current Location Button */}
          <TouchableOpacity
            onPress={getCurrentLocation}
            disabled={loadingLocation}
            className="absolute bottom-24 right-6 bg-white rounded-full p-3 shadow-lg"
            activeOpacity={0.8}
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#ec4899" />
            ) : (
              <Ionicons name="locate" size={24} color="#ec4899" />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Buttons */}
        <View className="px-6 py-4 border-t border-gray-200 bg-white">
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!address || address === 'Unknown location' || loadingAddress}
            className={`w-full py-4 rounded-xl items-center justify-center ${
              address && address !== 'Unknown location' && !loadingAddress
                ? 'bg-pink-500'
                : 'bg-gray-200'
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-base font-semibold ${
                address && address !== 'Unknown location' && !loadingAddress
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
            >
              Confirm Location
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default LocationPicker;
