import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '@/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { linking, navigationRef } from './src/utils/linking';

import './global.css';

export default function App() {
  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}