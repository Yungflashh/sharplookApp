import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  containerClassName?: string;
  inputClassName?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}
const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  iconColor = '#9CA3AF',
  containerClassName = '',
  inputClassName = '',
  rightIcon,
  onRightIconPress,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const handleFocus = (e: any) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };
  const handleBlur = (e: any) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };
  const borderColor = error ? '#ec4899' : isFocused ? '#ec4899' : '#fce7f3';
  return <View className={`mb-5 ${containerClassName}`}>
      <View className="relative">
        {}
        {label && <View className="absolute -top-3 left-3 bg-white px-2 z-10">
            <Text className="text-base font-normal text-gray-700">
              {label}
            </Text>
          </View>}

        {icon && <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>}

        <TextInput {...props} className={`w-full ${icon ? 'pl-12' : 'pl-4'} ${rightIcon ? 'pr-12' : 'pr-4'} py-4 rounded-xl border bg-white text-black text-base ${inputClassName}`} style={{
        borderColor,
        ...props.style
      }} placeholderTextColor={props.placeholderTextColor || '#D1D5DB'} onFocus={handleFocus} onBlur={handleBlur} />

        {rightIcon && <TouchableOpacity className="absolute right-4 top-1/2 -translate-y-1/2" onPress={onRightIconPress} disabled={!onRightIconPress}>
            <Ionicons name={rightIcon} size={22} color="#ec4899" />
          </TouchableOpacity>}
      </View>

      {error && <Text className="text-pink-500 text-xs mt-1.5 ml-1">
          {error}
        </Text>}
    </View>;
};
export default Input;