import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export interface Category {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  serviceCount?: number;
}
interface CategoryListProps {
  categories: Category[];
  onCategoryPress: (category: Category) => void;
  loading?: boolean;
}
const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onCategoryPress,
  loading = false
}) => {
  const renderCategory = ({
    item
  }: {
    item: Category;
  }) => <TouchableOpacity style={styles.categoryCard} onPress={() => onCategoryPress(item)} activeOpacity={0.7}>
      <View style={styles.categoryIconContainer}>
        {item.image ? <Image source={{
        uri: item.image
      }} style={styles.categoryImage} /> : <View style={styles.categoryIconPlaceholder}>
            <Ionicons name="grid-outline" size={32} color="#E91E63" />
          </View>}
      </View>
      
      <Text style={styles.categoryName} numberOfLines={2}>
        {item.name}
      </Text>
      
      {item.serviceCount !== undefined && <Text style={styles.serviceCount}>
          {item.serviceCount} {item.serviceCount === 1 ? 'service' : 'services'}
        </Text>}
    </TouchableOpacity>;
  if (loading) {
    return <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Categories</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </View>;
  }
  if (categories.length === 0) {
    return <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Categories</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No categories available</Text>
        </View>
      </View>;
  }
  return <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Explore our services</Text>
      </View>

      <FlatList data={categories} renderItem={renderCategory} keyExtractor={item => item._id} numColumns={3} columnWrapperStyle={styles.row} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent} />
    </View>;
};
const styles = StyleSheet.create({
  container: {
    paddingVertical: 16
  },
  header: {
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
  listContent: {
    paddingHorizontal: 10
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: 6
  },
  categoryCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  categoryIconContainer: {
    marginBottom: 8
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  categoryIconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE5EF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4
  },
  serviceCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center'
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
export default CategoryList;