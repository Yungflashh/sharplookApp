import React, { useRef } from 'react';
import { TouchableOpacity, Text, Animated, TouchableOpacityProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export type SocialPlatformFull = 'google' | 'facebook' | 'apple';
interface SocialLoginFullButtonProps extends TouchableOpacityProps {
  platform: SocialPlatformFull;
}
const SocialLoginFullButton: React.FC<SocialLoginFullButtonProps> = ({
  platform,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4
    }).start();
  };
  const getPlatformConfig = (): {
    icon: keyof typeof Ionicons.glyphMap;
    bgColor: string;
    textColor: string;
    label: string;
    borderColor?: string;
  } => {
    switch (platform) {
      case 'google':
        return {
          icon: 'logo-google',
          bgColor: 'bg-white',
          textColor: 'text-gray-900',
          label: 'Continue with Google',
          borderColor: 'border-gray-300'
        };
      case 'facebook':
        return {
          icon: 'logo-facebook',
          bgColor: 'bg-blue-600',
          textColor: 'text-white',
          label: 'Continue with Facebook'
        };
      case 'apple':
        return {
          icon: 'logo-apple',
          bgColor: 'bg-black',
          textColor: 'text-white',
          label: 'Continue with Apple'
        };
      default:
        return {
          icon: 'logo-google',
          bgColor: 'bg-white',
          textColor: 'text-gray-900',
          label: 'Continue',
          borderColor: 'border-gray-300'
        };
    }
  };
  const config = getPlatformConfig();
  return <Animated.View style={{
    transform: [{
      scale: scaleAnim
    }]
  }}>
      <TouchableOpacity {...props} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.9} className={`
          ${config.bgColor}
          ${config.borderColor ? `border ${config.borderColor}` : ''}
          w-full
          py-4
          rounded-xl
          flex-row
          items-center
          justify-center
        `}>
        <Ionicons name={config.icon} size={24} color={config.textColor.includes('white') ? '#fff' : '#000'} style={{
        marginRight: 12
      }} />
        <Text className={`${config.textColor} text-base font-semibold`}>
          {config.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>;
};
export default SocialLoginFullButton;