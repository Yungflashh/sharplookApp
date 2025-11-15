import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export interface FilterOptions {
  searchName: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  minDuration: string;
  maxDuration: string;
  status: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'price' | 'duration' | 'rating';
  sortOrder: 'asc' | 'desc';
}
interface FilterModalProps {
  visible: boolean;
  filters: FilterOptions;
  categories: Array<{
    _id: string;
    name: string;
  }>;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  onReset: () => void;
}
const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filters,
  categories,
  onClose,
  onApply,
  onReset
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);
  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };
  const handleReset = () => {
    onReset();
    onClose();
  };
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
        {}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Filter Services</Text>
          <View className="w-9" />
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {}
          <View className="mb-6 mt-5">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Search by Name</Text>
            <View className="flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
              <Ionicons name="search" size={20} color="#999" />
              <TextInput className="flex-1 py-3.5 px-3 text-base text-gray-900" placeholder="Enter service name..." placeholderTextColor="#999" value={localFilters.searchName} onChangeText={text => setLocalFilters({
              ...localFilters,
              searchName: text
            })} />
            </View>
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              <TouchableOpacity className={`px-4 py-2.5 rounded-full mr-2 ${localFilters.category === '' ? 'border border-gray-300' : 'bg-gray-100 border border-gray-300'}`} style={localFilters.category === '' ? {
              backgroundColor: '#eb278d'
            } : {}} onPress={() => setLocalFilters({
              ...localFilters,
              category: ''
            })}>
                <Text className={`text-sm font-medium ${localFilters.category === '' ? 'text-white' : 'text-gray-700'}`}>
                  All
                </Text>
              </TouchableOpacity>
              {categories.map(cat => <TouchableOpacity key={cat._id} className={`px-4 py-2.5 rounded-full mr-2 ${localFilters.category === cat._id ? 'border border-gray-300' : 'bg-gray-100 border border-gray-300'}`} style={localFilters.category === cat._id ? {
              backgroundColor: '#eb278d'
            } : {}} onPress={() => setLocalFilters({
              ...localFilters,
              category: cat._id
            })}>
                  <Text className={`text-sm font-medium ${localFilters.category === cat._id ? 'text-white' : 'text-gray-700'}`}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>)}
            </ScrollView>
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Price Range (₦)</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
                <TextInput className="flex-1 py-3.5 text-base text-gray-900" placeholder="Min" placeholderTextColor="#999" value={localFilters.minPrice} onChangeText={text => setLocalFilters({
                ...localFilters,
                minPrice: text.replace(/[^0-9]/g, '')
              })} keyboardType="numeric" />
              </View>
              <Text className="text-gray-500 self-center">-</Text>
              <View className="flex-1 flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
                <TextInput className="flex-1 py-3.5 text-base text-gray-900" placeholder="Max" placeholderTextColor="#999" value={localFilters.maxPrice} onChangeText={text => setLocalFilters({
                ...localFilters,
                maxPrice: text.replace(/[^0-9]/g, '')
              })} keyboardType="numeric" />
              </View>
            </View>
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Duration (minutes)</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
                <TextInput className="flex-1 py-3.5 text-base text-gray-900" placeholder="Min" placeholderTextColor="#999" value={localFilters.minDuration} onChangeText={text => setLocalFilters({
                ...localFilters,
                minDuration: text.replace(/[^0-9]/g, '')
              })} keyboardType="numeric" />
              </View>
              <Text className="text-gray-500 self-center">-</Text>
              <View className="flex-1 flex-row items-center border border-gray-300 rounded-xl px-4 bg-gray-50">
                <TextInput className="flex-1 py-3.5 text-base text-gray-900" placeholder="Max" placeholderTextColor="#999" value={localFilters.maxDuration} onChangeText={text => setLocalFilters({
                ...localFilters,
                maxDuration: text.replace(/[^0-9]/g, '')
              })} keyboardType="numeric" />
              </View>
            </View>
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Status</Text>
            <View className="flex-row gap-2">
              {[{
              value: 'all',
              label: 'All'
            }, {
              value: 'active',
              label: 'Active'
            }, {
              value: 'inactive',
              label: 'Inactive'
            }].map(status => <TouchableOpacity key={status.value} className={`flex-1 py-3 rounded-xl items-center ${localFilters.status === status.value ? '' : 'bg-gray-100 border border-gray-300'}`} style={localFilters.status === status.value ? {
              backgroundColor: '#eb278d'
            } : {}} onPress={() => setLocalFilters({
              ...localFilters,
              status: status.value as 'all' | 'active' | 'inactive'
            })}>
                  <Text className={`text-sm font-semibold ${localFilters.status === status.value ? 'text-white' : 'text-gray-700'}`}>
                    {status.label}
                  </Text>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Sort By</Text>
            <View className="flex-row flex-wrap gap-2">
              {[{
              value: 'name',
              label: 'Name'
            }, {
              value: 'price',
              label: 'Price'
            }, {
              value: 'duration',
              label: 'Duration'
            }, {
              value: 'rating',
              label: 'Rating'
            }].map(sort => <TouchableOpacity key={sort.value} className={`px-4 py-2.5 rounded-xl ${localFilters.sortBy === sort.value ? '' : 'bg-gray-100 border border-gray-300'}`} style={localFilters.sortBy === sort.value ? {
              backgroundColor: '#eb278d'
            } : {}} onPress={() => setLocalFilters({
              ...localFilters,
              sortBy: sort.value as 'name' | 'price' | 'duration' | 'rating'
            })}>
                  <Text className={`text-sm font-medium ${localFilters.sortBy === sort.value ? 'text-white' : 'text-gray-700'}`}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>)}
            </View>
          </View>

          {}
          <View className="mb-8">
            <Text className="text-sm font-semibold text-gray-900 mb-2">Sort Order</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ${localFilters.sortOrder === 'asc' ? '' : 'bg-gray-100 border border-gray-300'}`} style={localFilters.sortOrder === 'asc' ? {
              backgroundColor: '#eb278d'
            } : {}} onPress={() => setLocalFilters({
              ...localFilters,
              sortOrder: 'asc'
            })}>
                <Ionicons name="arrow-up" size={18} color={localFilters.sortOrder === 'asc' ? '#FFFFFF' : '#374151'} />
                <Text className={`text-sm font-semibold ml-1 ${localFilters.sortOrder === 'asc' ? 'text-white' : 'text-gray-700'}`}>
                  Ascending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ${localFilters.sortOrder === 'desc' ? '' : 'bg-gray-100 border border-gray-300'}`} style={localFilters.sortOrder === 'desc' ? {
              backgroundColor: '#eb278d'
            } : {}} onPress={() => setLocalFilters({
              ...localFilters,
              sortOrder: 'desc'
            })}>
                <Ionicons name="arrow-down" size={18} color={localFilters.sortOrder === 'desc' ? '#FFFFFF' : '#374151'} />
                <Text className={`text-sm font-semibold ml-1 ${localFilters.sortOrder === 'desc' ? 'text-white' : 'text-gray-700'}`}>
                  Descending
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {}
        <View className="flex-row p-5 gap-3 border-t border-gray-200">
          <TouchableOpacity className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center border border-gray-300" onPress={handleReset}>
            <Text className="text-gray-700 text-base font-semibold">Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 py-3.5 rounded-xl items-center" style={{
          backgroundColor: '#eb278d'
        }} onPress={handleApply}>
            <Text className="text-white text-base font-semibold">Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>;
};
export default FilterModal;