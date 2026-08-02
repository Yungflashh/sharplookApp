import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');
const HINT = '#9CA3AF';

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
  distance?: '5km' | '10km' | '20km' | 'any';
  pricePreset?: 'budget' | 'mid' | 'premium' | 'luxury' | '';
  minRating?: number;
  availability?: 'today' | 'tomorrow' | 'next_week' | 'any';
  vendorType?: 'all' | 'home_service' | 'in_shop' | 'both';
}

interface FilterModalProps {
  visible: boolean;
  filters: FilterOptions;
  categories: Array<{ _id: string; name: string }>;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  onReset: () => void;
}

const DISTANCE_OPTIONS: Array<{ value: '5km' | '10km' | '20km' | 'any'; label: string }> = [
  { value: '5km', label: 'Nearby (5km)' },
  { value: '10km', label: 'Within (10km)' },
  { value: '20km', label: 'Within (20km)' },
  { value: 'any', label: 'Any' },
];

const PRICE_PRESETS: Array<{
  value: 'budget' | 'mid' | 'premium' | 'luxury';
  range: string;
  label: string;
}> = [
  { value: 'budget', range: '₦10,000 – ₦30,000', label: 'Budget Friendly' },
  { value: 'mid', range: '₦30,000 – ₦50,000', label: 'Mid Range' },
  { value: 'premium', range: '₦50,000 – ₦70,000', label: 'Premium' },
  { value: 'luxury', range: '₦80k+', label: 'Luxury' },
];

const RATING_OPTIONS = [1, 2, 3, 4, 5];

const AVAILABILITY_OPTIONS: Array<{
  value: 'today' | 'tomorrow' | 'next_week' | 'any';
  label: string;
}> = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'next_week', label: 'Next Week' },
];

const VENDOR_TYPE_OPTIONS: Array<{
  value: 'all' | 'home_service' | 'in_shop' | 'both';
  label: string;
  icon: string;
}> = [
  { value: 'all', label: 'All', icon: 'apps-outline' },
  { value: 'home_service', label: 'Home Service', icon: 'home-outline' },
  { value: 'in_shop', label: 'In-Shop', icon: 'storefront-outline' },
  { value: 'both', label: 'Both', icon: 'layers-outline' },
];

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filters,
  categories,
  onClose,
  onApply,
  onReset,
}) => {
  const [distance, setDistance] = useState<'5km' | '10km' | '20km' | 'any'>(
    filters.distance || 'any'
  );
  const [pricePreset, setPricePreset] = useState<'budget' | 'mid' | 'premium' | 'luxury' | ''>(
    filters.pricePreset || ''
  );
  const [minRating, setMinRating] = useState<number>(filters.minRating || 0);
  const [availability, setAvailability] = useState<'today' | 'tomorrow' | 'next_week' | 'any'>(
    filters.availability || 'any'
  );
  const [vendorType, setVendorType] = useState<'all' | 'home_service' | 'in_shop' | 'both'>(
    filters.vendorType || 'all'
  );

  useEffect(() => {
    if (visible) {
      setDistance(filters.distance || 'any');
      setPricePreset(filters.pricePreset || '');
      setMinRating(filters.minRating || 0);
      setAvailability(filters.availability || 'any');
      setVendorType(filters.vendorType || 'all');
    }
  }, [filters, visible]);

  const handleApply = () => {
    // Map pricePreset to minPrice/maxPrice
    let minPrice = filters.minPrice;
    let maxPrice = filters.maxPrice;
    if (pricePreset === 'budget') { minPrice = '10000'; maxPrice = '30000'; }
    else if (pricePreset === 'mid') { minPrice = '30000'; maxPrice = '50000'; }
    else if (pricePreset === 'premium') { minPrice = '50000'; maxPrice = '70000'; }
    else if (pricePreset === 'luxury') { minPrice = '80000'; maxPrice = ''; }

    const mapped: FilterOptions = {
      ...filters,
      minPrice,
      maxPrice,
      distance,
      pricePreset,
      minRating,
      availability,
      vendorType,
    };
    onApply(mapped);
  };

  const handleReset = () => {
    setDistance('any');
    setPricePreset('');
    setMinRating(0);
    setAvailability('any');
    setVendorType('all');
    onReset();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Filter</Text>
              <Text style={styles.headerSubtitle}>Refine your search</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Location/Distance */}
            <Text style={styles.sectionLabel}>{'📍  Location/Distance'}</Text>
            <View style={styles.chipRow}>
              {DISTANCE_OPTIONS.map(opt => {
                const selected = distance === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setDistance(opt.value)}
                    activeOpacity={0.8}
                    style={[
                      styles.distanceChip,
                      selected ? styles.distanceChipSelected : styles.distanceChipUnselected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.distanceChipText,
                        selected ? styles.distanceChipTextSelected : styles.distanceChipTextUnselected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Price Range */}
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{'🏷️  Price Range'}</Text>
            <View style={styles.priceGrid}>
              {PRICE_PRESETS.map(opt => {
                const selected = pricePreset === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setPricePreset(selected ? '' : opt.value)}
                    activeOpacity={0.8}
                    style={[
                      styles.priceChip,
                      selected ? styles.priceChipSelected : styles.priceChipUnselected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priceRangeText,
                        selected && { color: '#E91E63' },
                      ]}
                    >
                      {opt.range}
                    </Text>
                    <Text style={[styles.priceLabelText, selected && { color: '#E91E63' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Rating */}
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{'⭐  Rating'}</Text>
            <View style={styles.chipRow}>
              {RATING_OPTIONS.map(r => {
                const selected = minRating === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setMinRating(selected ? 0 : r)}
                    activeOpacity={0.8}
                    style={[
                      styles.ratingChip,
                      selected ? styles.ratingChipSelected : styles.ratingChipUnselected,
                    ]}
                  >
                    <View style={styles.starsRow}>
                      {Array.from({ length: r }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name="star"
                          size={10}
                          color={selected ? '#fff' : '#F59E0B'}
                        />
                      ))}
                    </View>
                    <Text
                      style={[
                        styles.ratingChipText,
                        selected ? styles.ratingChipTextSelected : styles.ratingChipTextUnselected,
                      ]}
                    >
                      {r < 5 ? `${r}+` : '5 only'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Availability */}
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{'📅  Availability'}</Text>
            <View style={styles.chipRow}>
              {AVAILABILITY_OPTIONS.map(opt => {
                const selected = availability === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setAvailability(selected ? 'any' : opt.value)}
                    activeOpacity={0.8}
                    style={[
                      styles.availChip,
                      selected ? styles.availChipSelected : styles.availChipUnselected,
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />
                    )}
                    <Text
                      style={[
                        styles.availChipText,
                        selected ? styles.availChipTextSelected : styles.availChipTextUnselected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Service Type */}
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>{'🏠  Service Type'}</Text>
            <View style={styles.chipRow}>
              {VENDOR_TYPE_OPTIONS.map(opt => {
                const selected = vendorType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setVendorType(opt.value)}
                    activeOpacity={0.8}
                    style={[
                      styles.serviceTypeChip,
                      selected ? styles.serviceTypeChipSelected : styles.serviceTypeChipUnselected,
                    ]}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={14}
                      color={selected ? '#fff' : '#374151'}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.serviceTypeText,
                        selected ? styles.serviceTypeTextSelected : styles.serviceTypeTextUnselected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>

          {/* Bottom actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset} activeOpacity={0.8} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: HINT,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  // Distance chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  distanceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    marginRight: 0,
  },
  distanceChipSelected: {
    backgroundColor: '#FCE4EC',
    borderColor: '#E91E63',
  },
  distanceChipUnselected: {
    backgroundColor: '#F5F5F7',
    borderColor: '#E5E7EB',
  },
  distanceChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  distanceChipTextSelected: {
    color: '#E91E63',
  },
  distanceChipTextUnselected: {
    color: '#374151',
  },
  // Price grid
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  priceChip: {
    width: (SW - 60) / 2,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  priceChipSelected: {
    borderColor: '#E91E63',
    backgroundColor: '#FCE4EC',
  },
  priceChipUnselected: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  priceRangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  priceLabelText: {
    fontSize: 11,
    color: HINT,
    marginTop: 3,
  },
  // Rating chips
  ratingChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingChipSelected: {
    backgroundColor: '#E91E63',
  },
  ratingChipUnselected: {
    backgroundColor: '#F5F5F7',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ratingChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ratingChipTextSelected: {
    color: '#fff',
  },
  ratingChipTextUnselected: {
    color: '#374151',
  },
  // Availability chips
  availChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 50,
  },
  availChipSelected: {
    backgroundColor: '#E91E63',
  },
  availChipUnselected: {
    backgroundColor: '#F5F5F7',
  },
  availChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  availChipTextSelected: {
    color: '#fff',
  },
  availChipTextUnselected: {
    color: '#374151',
  },
  // Service type chips
  serviceTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  serviceTypeChipSelected: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  serviceTypeChipUnselected: {
    backgroundColor: '#F5F5F7',
    borderColor: '#E5E7EB',
  },
  serviceTypeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  serviceTypeTextSelected: { color: '#fff' },
  serviceTypeTextUnselected: { color: '#374151' },
  // Bottom actions
  bottomActions: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  applyBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resetBtnText: {
    color: '#E91E63',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FilterModal;
