import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import DashboardHeader from '@/components/DashboardHeader';
import SearchBar from '@/components/SearchBar';
import CategoryList, { Category } from '@/components/CategoryList';
import TopVendorsList, { Vendor } from '@/components/TopVendorsList';
import FilterModal, { FilterOptions } from '@/components/ui/FilterModal';
import SideDrawer from '@/components/ui/SideDrawer';
import { categoriesAPI, vendorAPI, handleAPIError } from '@/api/api';
const ClientDashboardScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('Guest');
  const [userEmail, setUserEmail] = useState('');
  const [userImage, setUserImage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [topVendors, setTopVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cartItemCount] = useState(0);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSideDrawerVisible, setIsSideDrawerVisible] = useState(false);
  const fetchUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Guest');
        setUserEmail(user.email || '');
        setUserImage(user.profileImage || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getActiveCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Error fetching categories:', apiError.message);
    }
  };
  const fetchTopVendors = async () => {
    try {
      const response = await vendorAPI.getTopVendors();
      if (response.success && response.data) {
        setTopVendors(response.data);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      console.error('Error fetching top vendors:', apiError.message);
    }
  };
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchUserData(), fetchCategories(), fetchTopVendors()]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  }, []);
  useEffect(() => {
    fetchDashboardData();
  }, []);
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    console.log('Searching for:', query);
  };
  const handleFilterPress = () => {
    setIsFilterModalVisible(true);
  };
  const handleApplyFilters = async (filters: FilterOptions) => {
    console.log('Applying filters:', filters);
    try {} catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    }
  };
  const handleCategoryPress = (category: Category) => {
    console.log('Category pressed:', category);
  };
  const handleVendorPress = (vendor: Vendor) => {
    console.log('Vendor pressed:', vendor);
  };
  const handleViewAllVendors = () => {
    console.log('View all vendors');
  };
  const handleMenuPress = () => {
    setIsSideDrawerVisible(true);
  };
  const handleChatPress = () => {
    console.log('Chat pressed');
  };
  const handleCartPress = () => {
    console.log('Cart pressed');
  };
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Logout',
      style: 'destructive',
      onPress: async () => {
        try {
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userData', 'isAuthenticated']);
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
    }]);
  };
  const menuItems = [{
    id: '1',
    title: 'My Bookings',
    icon: 'calendar-outline' as const,
    onPress: () => console.log('My Bookings')
  }, {
    id: '2',
    title: 'Favorites',
    icon: 'heart-outline' as const,
    onPress: () => console.log('Favorites')
  }, {
    id: '3',
    title: 'Payment Methods',
    icon: 'card-outline' as const,
    onPress: () => console.log('Payment Methods')
  }, {
    id: '4',
    title: 'Notifications',
    icon: 'notifications-outline' as const,
    onPress: () => console.log('Notifications')
  }, {
    id: '5',
    title: 'Settings',
    icon: 'settings-outline' as const,
    onPress: () => console.log('Settings')
  }, {
    id: '6',
    title: 'Help & Support',
    icon: 'help-circle-outline' as const,
    onPress: () => console.log('Help & Support')
  }];
  if (isLoading) {
    return <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>;
  }
  return <View style={styles.container}>
      {}
      <DashboardHeader userName={userName} onMenuPress={handleMenuPress} onChatPress={handleChatPress} onCartPress={handleCartPress} cartItemCount={cartItemCount} />

      {}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#E91E63']} tintColor="#E91E63" />}>
        {}
        <SearchBar onSearch={handleSearch} onFilterPress={handleFilterPress} value={searchQuery} />

        {}
        <CategoryList categories={categories} onCategoryPress={handleCategoryPress} />

        {}
        <TopVendorsList vendors={topVendors} onVendorPress={handleVendorPress} onViewAllPress={handleViewAllVendors} />
      </ScrollView>

      {}
      <FilterModal visible={isFilterModalVisible} onClose={() => setIsFilterModalVisible(false)} onApplyFilters={handleApplyFilters} categories={categories} />

      {}
      <SideDrawer visible={isSideDrawerVisible} onClose={() => setIsSideDrawerVisible(false)} userName={userName} userEmail={userEmail} userImage={userImage} menuItems={menuItems} onLogout={handleLogout} />
    </View>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f9f9f9'
  }
});
export default ClientDashboardScreen;