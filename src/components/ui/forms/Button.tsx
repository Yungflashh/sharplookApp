import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Animated, ViewStyle, TextStyle, TouchableOpacityProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
  containerClassName?: string;
}
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'lg',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  children,
  disabled,
  containerClassName = '',
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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
  const getVariantStyles = (): {
    container: string;
    text: string;
    loadingColor: string;
  } => {
    const isDisabled = disabled || loading;
    switch (variant) {
      case 'primary':
        return {
          container: isDisabled ? 'bg-pink-400' : 'bg-pink-500 shadow-lg shadow-pink-200',
          text: 'text-white',
          loadingColor: '#ffffff'
        };
      case 'secondary':
        return {
          container: isDisabled ? 'bg-gray-300' : 'bg-gray-200',
          text: isDisabled ? 'text-gray-500' : 'text-gray-900',
          loadingColor: '#374151'
        };
      case 'outline':
        return {
          container: `border-2 ${isDisabled ? 'border-gray-300' : 'border-pink-500'}`,
          text: isDisabled ? 'text-gray-400' : 'text-pink-500',
          loadingColor: '#ec4899'
        };
      case 'ghost':
        return {
          container: '',
          text: isDisabled ? 'text-gray-400' : 'text-pink-500',
          loadingColor: '#ec4899'
        };
      case 'danger':
        return {
          container: isDisabled ? 'bg-red-400' : 'bg-red-500 shadow-lg shadow-red-200',
          text: 'text-white',
          loadingColor: '#ffffff'
        };
      default:
        return {
          container: 'bg-pink-500',
          text: 'text-white',
          loadingColor: '#ffffff'
        };
    }
  };
  const getSizeStyles = (): {
    container: string;
    text: string;
    iconSize: number;
  } => {
    switch (size) {
      case 'sm':
        return {
          container: 'py-2.5 px-4',
          text: 'text-sm',
          iconSize: 16
        };
      case 'md':
        return {
          container: 'py-3.5 px-6',
          text: 'text-base',
          iconSize: 20
        };
      case 'lg':
        return {
          container: 'py-4 px-8',
          text: 'text-base',
          iconSize: 22
        };
      default:
        return {
          container: 'py-4 px-8',
          text: 'text-base',
          iconSize: 22
        };
    }
  };
  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  return <Animated.View style={{
    transform: [{
      scale: scaleAnim
    }],
    width: fullWidth ? '100%' : 'auto'
  }} className={containerClassName}>
      <TouchableOpacity {...props} disabled={disabled || loading} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.9} className={`
          ${variantStyles.container}
          ${sizeStyles.container}
          ${fullWidth ? 'w-full' : ''}
          rounded-xl
          items-center
          justify-center
          flex-row
          transition-all
        `}>
        {loading ? <ActivityIndicator color={variantStyles.loadingColor} size="small" /> : <>
            {icon && iconPosition === 'left' && <Ionicons name={icon} size={sizeStyles.iconSize} color={variantStyles.text.includes('white') ? '#ffffff' : '#ec4899'} style={{
          marginRight: 8
        }} />}
            <Text className={`${variantStyles.text} ${sizeStyles.text} font-semibold`}>
              {children}
            </Text>
            {icon && iconPosition === 'right' && <Ionicons name={icon} size={sizeStyles.iconSize} color={variantStyles.text.includes('white') ? '#ffffff' : '#ec4899'} style={{
          marginLeft: 8
        }} />}
          </>}
      </TouchableOpacity>
    </Animated.View>;
};
export default Button;