import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { COUNTRIES } from './countryData';

interface PhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  error?: string;
  containerClassName?: string;
  value: string;
  onChangeText: (text: string) => void;
  countryCode?: string;
  onCountryCodePress?: () => void;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  error,
  containerClassName = '',
  value,
  onChangeText,
  countryCode = '+234',
  onCountryCodePress,
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

  const borderColor = error
    ? '#ec4899'
    : isFocused
    ? '#ec4899'
    : '#fce7f3';

  const getCountryFlag = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country ? country.flag : '🌍';
  };

  return (
    <View className={`mb-5 ${containerClassName}`}>
      <View className="relative">
        {/* Label positioned on top of border */}
        {label && (
          <View className="absolute -top-3 left-3 bg-white px-2 z-10">
            <Text className="text-base font-normal text-gray-700">
              {label}
            </Text>
          </View>
        )}

        <View
          className="w-full flex-row items-center px-4 py-4 rounded-xl border bg-white"
          style={{ borderColor }}
        >
          <TouchableOpacity
            onPress={onCountryCodePress}
            className="flex-row items-center mr-3 pr-3 border-r border-gray-200"
            activeOpacity={0.7}
          >
            <Text className="text-2xl mr-1">{getCountryFlag(countryCode)}</Text>
            <Text className="text-base text-gray-800 mr-1">{countryCode}</Text>
            <Text className="text-gray-400 text-xs">▼</Text>
          </TouchableOpacity>

          <TextInput
            {...props}
            className="flex-1 text-base text-black"
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor="#D1D5DB"
            keyboardType="phone-pad"
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </View>
      </View>

      {error && (
        <Text className="text-pink-500 text-xs mt-1.5 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
};

export default PhoneInput;
