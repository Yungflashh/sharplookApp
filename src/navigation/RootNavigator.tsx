import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { checkAuthStatus, checkOnboardingStatus } from '@/utils/authHelper';
import AuthNavigator from '@/navigation/AuthNavigator';
import MessageScreen from '@/screens/vendor/MessageScreen';
import NotificationScreen from '@/screens/vendor/NotificationScreen';
import MainNavigator from '@/navigation/MainNavigator';
import type { RootStackParamList } from '@/types/navigation.types';
const Stack = createNativeStackNavigator<RootStackParamList>();
const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  useEffect(() => {
    initializeApp();
  }, []);
  useEffect(() => {
    const interval = setInterval(async () => {
      const authStatus = await checkAuthStatus();
      if (authStatus.isAuthenticated !== isAuthenticated) {
        console.log('🔄 Auth state changed:', authStatus.isAuthenticated);
        setIsAuthenticated(authStatus.isAuthenticated);
        setIsVendor(authStatus.isVendor);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);
  const initializeApp = async () => {
    try {
      console.log('🔄 Initializing app...');
      const authStatus = await checkAuthStatus();
      setIsAuthenticated(authStatus.isAuthenticated);
      setIsVendor(authStatus.isVendor);
      console.log('🔐 Auth status:', {
        isAuthenticated: authStatus.isAuthenticated,
        isVendor: authStatus.isVendor,
        userEmail: authStatus.user?.email
      });
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      console.log('✅ App initialization complete');
    }
  };
  if (isLoading) {
    return <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>;
  }
  return <Stack.Navigator screenOptions={{
    headerShown: false
  }}>
      {!isAuthenticated ? <Stack.Screen name="Auth" component={AuthNavigator} options={{
      animationTypeForReplace: 'pop'
    }} /> : <>
    <Stack.Screen name="Main" component={MainNavigator} initialParams={{
        isVendor
      }} options={{
        animationTypeForReplace: 'push'
      }} />
    <Stack.Screen name="Message" component={MessageScreen} />
    <Stack.Screen name="Notification" component={NotificationScreen} />
    </>}
    </Stack.Navigator>;
};
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  }
});
export default RootNavigator;