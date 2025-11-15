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

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
}

interface CategorySelectorProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategories: string[];
  onSelect: (selected: string[]) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  visible,
  onClose,
  categories,
  selectedCategories,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelected, setTempSelected] = useState<string[]>(selectedCategories);

  // Reset temp selection when modal opens
  React.useEffect(() => {
    if (visible) {
      setTempSelected(selectedCategories);
      setSearchQuery('');
    }
  }, [visible, selectedCategories]);

  const handleToggle = (categoryId: string) => {
    if (tempSelected.includes(categoryId)) {
      setTempSelected(tempSelected.filter((id) => id !== categoryId));
    } else {
      setTempSelected([...tempSelected, categoryId]);
    }
  };

  const handleDone = () => {
    onSelect(tempSelected);
    onClose();
  };

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase())
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
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">
                Select Service Categories
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                {tempSelected.length} selected
              </Text>
            </View>
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
              placeholder="Search categories..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Category List */}
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => {
              const isSelected = tempSelected.includes(category._id);

              return (
                <TouchableOpacity
                  key={category._id}
                  onPress={() => handleToggle(category._id)}
                  activeOpacity={0.7}
                  className={`px-6 py-4 border-b border-gray-100 ${
                    isSelected ? 'bg-pink-50' : 'bg-white'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-semibold text-gray-900 mb-1">
                        {category.name}
                      </Text>
                      <Text className="text-sm text-gray-600" numberOfLines={2}>
                        {category.description}
                      </Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        isSelected
                          ? 'bg-pink-500 border-pink-500'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View className="items-center justify-center py-12">
              <Ionicons name="search" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-base mt-4">
                No categories found
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View className="px-6 py-4 border-t border-gray-200 bg-white">
          <TouchableOpacity
            onPress={handleDone}
            disabled={tempSelected.length === 0}
            className={`w-full py-4 rounded-xl items-center justify-center ${
              tempSelected.length > 0
                ? 'bg-pink-500'
                : 'bg-gray-200'
            }`}
            activeOpacity={0.8}
          >
            <Text
              className={`text-base font-semibold ${
                tempSelected.length > 0 ? 'text-white' : 'text-gray-400'
              }`}
            >
              Done ({tempSelected.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default CategorySelector;
