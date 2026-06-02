import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/types/navigation.types';
import LoginScreen from '@/screens/auth/LoginScreen';
import ChooseRoleScreen from '@/screens/auth/ChooseRoleScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import VendorProfileSetup from '@/screens/auth/VendorProfileSetup';
import ClientProfileSetupScreen from '@/screens/auth/ClientProfileSetupScreen';
import VendorRegisterScreen from '@/screens/auth/VendorRegisterScreen';
import VerifyOtpScreen from '@/screens/auth/VerifyOtp';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';
import TermsPrivacyAuthScreen from '@/screens/auth/components/TermsPrivacyAuthScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface Props {
  route?: { params?: { initialRoute?: keyof AuthStackParamList } };
}

const AuthNavigator = ({ route }: Props) => {
  const initialRouteName = (route?.params?.initialRoute as keyof AuthStackParamList) || 'Login';

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="VendorRegister" component={VendorRegisterScreen} />
      <Stack.Screen name="ChooseRole" component={ChooseRoleScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VendorProfileSetup" component={VendorProfileSetup} />
      <Stack.Screen name="ClientProfileSetup" component={ClientProfileSetupScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="TermsPrivacyAuthScreen" component={TermsPrivacyAuthScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
