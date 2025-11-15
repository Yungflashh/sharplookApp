import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export interface Vendor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  businessName?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  location?: string;
  isVerified?: boolean;
}
interface TopVendorsListProps {
  vendors: Vendor[];
  onVendorPress: (vendor: Vendor) => void;
  onViewAllPress: () => void;
  loading?: boolean;
}
const TopVendorsList: React.FC<TopVendorsListProps> = ({
  vendors,
  onVendorPress,
  onViewAllPress,
  loading = false
}) => {
  const renderVendor = ({
    item
  }: {
    item: Vendor;
  }) => <TouchableOpacity style={styles.vendorCard} onPress={() => onVendorPress(item)} activeOpacity={0.7}>
      <View style={styles.vendorImageContainer}>
        {item.profileImage ? <Image source={{
        uri: item.profileImage
      }} style={styles.vendorImage} /> : <View style={styles.vendorImagePlaceholder}>
            <Text style={styles.vendorInitials}>
              {item.firstName?.[0]}{item.lastName?.[0]}
            </Text>
          </View>}
        {item.isVerified && <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          </View>}
      </View>

      <View style={styles.vendorInfo}>
        <Text style={styles.vendorName} numberOfLines={1}>
          {item.businessName || `${item.firstName} ${item.lastName}`}
        </Text>
        
        {item.category && <Text style={styles.vendorCategory} numberOfLines={1}>
            {item.category}
          </Text>}

        {item.rating !== undefined && <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            {item.reviewCount !== undefined && <Text style={styles.reviewCount}>({item.reviewCount})</Text>}
          </View>}

        {item.location && <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={12} color="#999" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>}
      </View>
    </TouchableOpacity>;
  if (loading) {
    return <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Top Vendors</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading vendors...</Text>
        </View>
      </View>;
  }
  if (vendors.length === 0) {
    return <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Top Vendors</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No vendors available</Text>
        </View>
      </View>;
  }
  return <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Top Vendors</Text>
          <Text style={styles.subtitle}>Highly rated professionals</Text>
        </View>
        <TouchableOpacity onPress={onViewAllPress}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={vendors} renderItem={renderVendor} keyExtractor={item => item._id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listContent} />
    </View>;
};
const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: '#f9f9f9'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#666'
  },
  viewAllText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '600'
  },
  listContent: {
    paddingHorizontal: 16
  },
  vendorCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  vendorImageContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative'
  },
  vendorImage: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  vendorImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center'
  },
  vendorInitials: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 10
  },
  vendorInfo: {
    alignItems: 'center'
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4
  },
  vendorCategory: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 6
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4
  },
  reviewCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 2
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  locationText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 2
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 14,
    color: '#999'
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12
  }
});
export default TopVendorsList;