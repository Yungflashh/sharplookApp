import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '@/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { linking, navigationRef } from './src/utils/linking';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform } from 'react-native';

import './global.css';

export default function App() {
  useEffect(() => {
    const requestTrackingPermission = async () => {
      if (Platform.OS === 'ios') {
        const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
        console.log('Tracking permission status:', status);
      }
    };

    // Small delay to ensure app is fully mounted
    setTimeout(requestTrackingPermission, 1000);
  }, []);

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}