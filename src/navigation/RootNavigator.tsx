import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { checkAuthStatus, checkOnboardingStatus } from '@/utils/authHelper';
import AuthNavigator from '@/navigation/AuthNavigator';
import MainNavigator from '@/navigation/MainNavigator';
const Stack = createNativeStackNavigator();
const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  useEffect(() => {
    initializeApp();
  }, []);
  const initializeApp = async () => {
    try {
      console.log('🔄 Initializing app...');
      const onboardingComplete = await checkOnboardingStatus();
      setHasSeenOnboarding(onboardingComplete);
      console.log('📱 Onboarding status:', onboardingComplete ? 'Completed' : 'Not completed');
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
      {}
      
      {}
      {!isAuthenticated ? <Stack.Screen name="Auth" component={AuthNavigator} /> : <Stack.Screen name="Main" component={MainNavigator} initialParams={{
      isVendor
    }} />}
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