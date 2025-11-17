import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
class BiometricAuth {
  async isAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }
  async getBiometricType(): Promise<string> {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biometric';
  }
  async authenticate(promptMessage: string = 'Authenticate'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode'
      });
      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }
  async canAuthenticate(): Promise<{
    available: boolean;
    biometryType: string;
    error?: string;
  }> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return {
          available: false,
          biometryType: '',
          error: 'Device does not support biometric authentication'
        };
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        return {
          available: false,
          biometryType: await this.getBiometricType(),
          error: 'No biometrics enrolled on device'
        };
      }
      return {
        available: true,
        biometryType: await this.getBiometricType()
      };
    } catch (error) {
      return {
        available: false,
        biometryType: '',
        error: 'Error checking biometric availability'
      };
    }
  }
}
export default new BiometricAuth();