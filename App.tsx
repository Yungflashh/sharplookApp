import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '@/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { linking, useDeepLinking } from './src/utils/linking';


import './global.css';

export default function App() {
  return (
    <NavigationContainer linking={linking}>
      
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}