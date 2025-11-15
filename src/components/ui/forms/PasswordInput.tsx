import React, { useState } from 'react';
import Input, { InputProps } from './Input';
import { View, Text } from 'react-native';
interface PasswordInputProps extends Omit<InputProps, 'secureTextEntry' | 'rightIcon' | 'onRightIconPress' | 'icon'> {
  showPasswordStrength?: boolean;
}
const PasswordInput: React.FC<PasswordInputProps> = ({
  showPasswordStrength = false,
  value,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const getPasswordStrength = (password: string): {
    strength: number;
    label: string;
    color: string;
  } => {
    if (!password) return {
      strength: 0,
      label: '',
      color: ''
    };
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    if (strength <= 2) return {
      strength,
      label: 'Weak',
      color: '#ef4444'
    };
    if (strength <= 3) return {
      strength,
      label: 'Medium',
      color: '#f59e0b'
    };
    return {
      strength,
      label: 'Strong',
      color: '#10b981'
    };
  };
  const passwordStrength = showPasswordStrength && value ? getPasswordStrength(value as string) : null;
  return <>
      <Input {...props} value={value} secureTextEntry={!showPassword} rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'} onRightIconPress={() => setShowPassword(!showPassword)} />
      {passwordStrength && passwordStrength.label && <View className="flex-row items-center gap-2 -mt-3 mb-4 px-1">
          <View className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <View className="h-full rounded-full" style={{
          width: `${passwordStrength.strength / 5 * 100}%`,
          backgroundColor: passwordStrength.color
        }} />
          </View>
          <Text className="text-xs font-medium" style={{
        color: passwordStrength.color
      }}>
            {passwordStrength.label}
          </Text>
        </View>}
    </>;
};
export default PasswordInput;