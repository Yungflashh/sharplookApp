import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRIES } from './countryData';

interface CountryCodePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  selectedCode: string;
}

const CountryCodePicker: React.FC<CountryCodePickerProps> = ({
  visible,
  onClose,
  onSelect,
  selectedCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelect = (code: string) => {
    onSelect(code);
    onClose();
    setSearchQuery(''); // Reset search on close
  };

  const filteredCountries = COUNTRIES.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.includes(searchQuery)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View className="flex-1 bg-white pt-12">
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">
              Select Country Code
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View className="relative">
            <Ionicons
              name="search"
              size={20}
              color="#9CA3AF"
              style={{ position: 'absolute', left: 16, top: 14, zIndex: 10 }}
            />
            <TextInput
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-black text-base"
              placeholder="Search country..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Country List */}
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country, index) => (
              <TouchableOpacity
                key={`${country.code}-${country.name}-${index}`}
                onPress={() => handleSelect(country.code)}
                activeOpacity={0.7}
                className={`flex-row items-center px-6 py-4 border-b border-gray-100 ${
                  selectedCode === country.code ? 'bg-pink-50' : ''
                }`}
              >
                <Text className="text-3xl mr-3">{country.flag}</Text>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">
                    {country.name}
                  </Text>
                </View>
                <Text className="text-base font-semibold text-gray-700 mr-3">
                  {country.code}
                </Text>
                {selectedCode === country.code && (
                  <Ionicons name="checkmark-circle" size={24} color="#ec4899" />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View className="items-center justify-center py-12">
              <Ionicons name="search" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-base mt-4">No countries found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default CountryCodePicker;
