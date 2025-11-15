import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export interface FilterOptions {
  category?: string;
  minRating?: number;
  maxPrice?: number;
  location?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
}
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  categories?: {
    _id: string;
    name: string;
  }[];
}
const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApplyFilters,
  categories = []
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const ratingOptions = [{
    label: 'All Ratings',
    value: 0
  }, {
    label: '4+ Stars',
    value: 4
  }, {
    label: '4.5+ Stars',
    value: 4.5
  }];
  const handleApply = () => {
    const filters: FilterOptions = {};
    if (selectedCategory) filters.category = selectedCategory;
    if (minRating > 0) filters.minRating = minRating;
    if (location) filters.location = location;
    if (minPrice || maxPrice) {
      filters.priceRange = {
        min: minPrice ? parseFloat(minPrice) : undefined,
        max: maxPrice ? parseFloat(maxPrice) : undefined
      };
    }
    onApplyFilters(filters);
    onClose();
  };
  const handleReset = () => {
    setSelectedCategory('');
    setMinRating(0);
    setMinPrice('');
    setMaxPrice('');
    setLocation('');
  };
  return <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <TouchableOpacity style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]} onPress={() => setSelectedCategory('')}>
                  <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map(cat => <TouchableOpacity key={cat._id} style={[styles.categoryChip, selectedCategory === cat._id && styles.categoryChipActive]} onPress={() => setSelectedCategory(cat._id)}>
                    <Text style={[styles.categoryChipText, selectedCategory === cat._id && styles.categoryChipTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>)}
              </ScrollView>
            </View>

            {}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Minimum Rating</Text>
              <View style={styles.ratingOptions}>
                {ratingOptions.map(option => <TouchableOpacity key={option.value} style={[styles.ratingChip, minRating === option.value && styles.ratingChipActive]} onPress={() => setMinRating(option.value)}>
                    <Ionicons name="star" size={16} color={minRating === option.value ? '#fff' : '#FFC107'} />
                    <Text style={[styles.ratingChipText, minRating === option.value && styles.ratingChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>)}
              </View>
            </View>

            {}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput style={styles.priceInput} placeholder="0" keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} />
                </View>
                <Text style={styles.priceSeparator}>-</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput style={styles.priceInput} placeholder="Any" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} />
                </View>
              </View>
            </View>

            {}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Location</Text>
              <TextInput style={styles.locationInput} placeholder="Enter location" value={location} onChangeText={setLocation} />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>;
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  modalBody: {
    padding: 20
  },
  filterSection: {
    marginBottom: 24
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  categoryScroll: {
    flexDirection: 'row'
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8
  },
  categoryChipActive: {
    backgroundColor: '#E91E63'
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666'
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    gap: 4
  },
  ratingChipActive: {
    backgroundColor: '#E91E63'
  },
  ratingChipText: {
    fontSize: 13,
    color: '#666'
  },
  ratingChipTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  priceInputContainer: {
    flex: 1
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333'
  },
  priceSeparator: {
    fontSize: 16,
    color: '#999',
    paddingTop: 20
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333'
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center'
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#E91E63',
    alignItems: 'center'
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});
export default FilterModal;