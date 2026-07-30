import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';  // Add this
import LoginScreen from '@/screens/auth/LoginScreen';
import ChooseRoleScreen from '@/screens/auth/ChooseRoleScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import VendorProfileSetup from '@/screens/auth/VendorProfileSetup';
import VerifyOtpScreen from '@/screens/auth/VerifyOtp';
import TermsPrivacyAuthScreen from '@/screens/auth/components/TermsPrivacyAuthScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();  // Add the type here

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VendorProfileSetup" component={VendorProfileSetup} />
      <Stack.Screen name="TermsPrivacyAuthScreen" component={TermsPrivacyAuthScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;