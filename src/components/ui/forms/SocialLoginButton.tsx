import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SocialPlatform = 'phone' | 'facebook' | 'twitter' | 'apple' | 'google';

interface SocialLoginButtonProps extends TouchableOpacityProps {
  platform: SocialPlatform;
  size?: 'sm' | 'md' | 'lg';
}

const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({
  platform,
  size = 'md',
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const getPlatformStyles = (): {
    icon: keyof typeof Ionicons.glyphMap;
    bgColor: string;
    iconColor: string;
  } => {
    switch (platform) {
      case 'phone':
        return {
          icon: 'call',
          bgColor: 'bg-gray-100',
          iconColor: '#000',
        };
      case 'facebook':
        return {
          icon: 'logo-facebook',
          bgColor: 'bg-blue-600',
          iconColor: '#fff',
        };
      case 'twitter':
        return {
          icon: 'logo-twitter',
          bgColor: 'bg-blue-400',
          iconColor: '#fff',
        };
      case 'apple':
        return {
          icon: 'logo-apple',
          bgColor: 'bg-black',
          iconColor: '#fff',
        };
      case 'google':
        return {
          icon: 'logo-google',
          bgColor: 'bg-white border-2 border-gray-200',
          iconColor: '#000',
        };
      default:
        return {
          icon: 'logo-google',
          bgColor: 'bg-gray-100',
          iconColor: '#000',
        };
    }
  };

  const getSizeStyles = (): { container: string; iconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-10 h-10',
          iconSize: 20,
        };
      case 'md':
        return {
          container: 'w-12 h-12',
          iconSize: 24,
        };
      case 'lg':
        return {
          container: 'w-14 h-14',
          iconSize: 28,
        };
      default:
        return {
          container: 'w-12 h-12',
          iconSize: 24,
        };
    }
  };

  const platformStyles = getPlatformStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        {...props}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        className={`
          ${sizeStyles.container}
          ${platformStyles.bgColor}
          rounded-full
          items-center
          justify-center
          shadow-md
        `}
      >
        <Ionicons
          name={platformStyles.icon}
          size={sizeStyles.iconSize}
          color={platformStyles.iconColor}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default SocialLoginButton;
