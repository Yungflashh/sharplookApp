import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onFilterPress: () => void;
  value?: string;
}
const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search for vendors, services...',
  onSearch,
  onFilterPress,
  value = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onSearch(text);
  };
  const clearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };
  return <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        
        <TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="#999" value={searchQuery} onChangeText={handleSearch} returnKeyType="search" autoCapitalize="none" autoCorrect={false} />

        {searchQuery.length > 0 && <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>}
      </View>

      <TouchableOpacity onPress={onFilterPress} style={styles.filterButton}>
        <Ionicons name="options-outline" size={24} color="#E91E63" />
      </TouchableOpacity>
    </View>;
};
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48
  },
  searchIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0
  },
  clearButton: {
    padding: 4
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFE5EF',
    justifyContent: 'center',
    alignItems: 'center'
  }
});
export default SearchBar;