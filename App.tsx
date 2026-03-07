import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '@/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { linking, navigationRef } from './src/utils/linking';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform, AppState } from 'react-native';
import { ToastProvider } from '@/components/ui/Toast';

import './global.css';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const requestTrackingPermission = async () => {
      if (Platform.OS === 'ios') {
        try {
          // Wait for app to be in active state
          if (AppState.currentState === 'active') {
            const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
            console.log('Tracking permission status:', status);
            
            // Handle the different status values
            if (status === 'granted') {
              // User granted tracking permission
              console.log('Tracking authorized');
            } else {
              // User denied or restricted tracking
              console.log('Tracking not authorized:', status);
            }
          }
        } catch (error) {
          console.error('Error requesting tracking permission:', error);
        }
      }
    };

    // Handle app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && !isReady) {
        // Request tracking permission when app becomes active
        // This ensures the UI is fully loaded
        setTimeout(() => {
          requestTrackingPermission();
          setIsReady(true);
        }, 500);
      }
    });

    // Also check if app is already active on mount
    if (AppState.currentState === 'active') {
      setTimeout(() => {
        requestTrackingPermission();
        setIsReady(true);
      }, 500);
    }

    return () => {
      subscription.remove();
    };
  }, [isReady]);

  return (
    <ToastProvider>
      <NavigationContainer linking={linking} ref={navigationRef}>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </ToastProvider>
  );
}