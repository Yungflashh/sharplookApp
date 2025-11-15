import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, View, Animated, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | React.ReactNode;
  disabled?: boolean;
  error?: string;
  containerClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}
const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  error,
  containerClassName = '',
  size = 'md'
}) => {
  const scaleAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    Animated.parallel([Animated.spring(scaleAnim, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 100
    }), Animated.timing(checkOpacity, {
      toValue: checked ? 1 : 0,
      duration: 150,
      useNativeDriver: true
    })]).start();
  }, [checked]);
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          box: 'w-4 h-4',
          icon: 12,
          text: 'text-xs'
        };
      case 'md':
        return {
          box: 'w-5 h-5',
          icon: 14,
          text: 'text-sm'
        };
      case 'lg':
        return {
          box: 'w-6 h-6',
          icon: 16,
          text: 'text-base'
        };
      default:
        return {
          box: 'w-5 h-5',
          icon: 14,
          text: 'text-sm'
        };
    }
  };
  const sizeStyles = getSizeStyles();
  return <View className={containerClassName}>
      <TouchableOpacity className="flex-row items-start" onPress={() => !disabled && onChange(!checked)} disabled={disabled} activeOpacity={0.7}>
        <View className={`
            ${sizeStyles.box}
            rounded
            border-2
            ${error ? 'border-pink-500' : 'border-pink-500'}
            ${checked ? 'bg-pink-500' : 'bg-white'}
            items-center
            justify-center
            mr-3
            mt-0.5
            ${disabled ? 'opacity-50' : ''}
          `}>
          <Animated.View style={{
          transform: [{
            scale: scaleAnim
          }],
          opacity: checkOpacity
        }}>
            <Ionicons name="checkmark" size={sizeStyles.icon} color="#FFFFFF" />
          </Animated.View>
        </View>
        {label && <View className="flex-1">
            {typeof label === 'string' ? <Text className={`${sizeStyles.text} text-gray-700 ${disabled ? 'opacity-50' : ''}`}>
                {label}
              </Text> : label}
          </View>}
      </TouchableOpacity>
      {error && <Text className="text-pink-500 text-xs mt-1.5 ml-1">
          <Ionicons name="alert-circle" size={12} color="#ec4899" /> {error}
        </Text>}
    </View>;
};
export default Checkbox;