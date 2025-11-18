import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { handleAPIError, categoriesAPI, servicesAPI } from '@/api/api';
import AddServiceModal from '@/components/AddServiceModal';
import ServiceCard from '@/components/ServiceCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import FilterModal, { FilterOptions } from '@/components/FilterModal';
interface Service {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  priceType: 'fixed' | 'variable';
  currency: string;
  duration: number;
  category: {
    _id: string;
    name: string;
  };
  images: string[];
  serviceArea: {
    type: string;
    coordinates: number[];
    radius: number;
  };
  isActive: boolean;
  rating?: number;
  reviewCount?: number;
}
const VendorServicesScreen = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    searchName: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    minDuration: '',
    maxDuration: '',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  useEffect(() => {
    loadServices();
    loadCategories();
  }, []);
  useEffect(() => {
    applyFilters();
  }, [services, filters]);
  const loadServices = async () => {
    console.log('🔵 [START] loadServices called');
    setLoading(true);
    try {
      console.log('📤 Fetching services from API...');
      const response = await api.get('/services/vendor/my-services');
      console.log('📥 API Response:', response.data);
      if (response.data.success) {
        console.log('✅ Success response');
        const servicesData = Array.isArray(response.data.data) ? response.data.data : response.data.data?.services || [];
        console.log('📊 Services to set:', servicesData);
        console.log('📊 Services count:', servicesData.length);
        setServices(servicesData);
        console.log('✅ Services state updated');
      } else {
        console.log('⚠️ Response not successful, setting empty array');
        setServices([]);
      }
    } catch (error) {
      console.error('❌ ERROR in loadServices:', error);
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
      setServices([]);
    } finally {
      console.log('🔵 [END] loadServices');
      setLoading(false);
    }
  };
  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([{
        _id: '1',
        name: 'Hair'
      }, {
        _id: '2',
        name: 'Makeup'
      }, {
        _id: '3',
        name: 'Nails'
      }, {
        _id: '4',
        name: 'Spa'
      }]);
    }
  };
  const applyFilters = () => {
    console.log('🔵 [START] applyFilters called');
    console.log('📊 Services:', services);
    console.log('📊 Services type:', typeof services);
    console.log('📊 Is array?:', Array.isArray(services));
    console.log('🔍 Current filters:', filters);
    try {
      if (!services || !Array.isArray(services)) {
        console.log('⚠️ Services is not an array, setting empty filtered services');
        setFilteredServices([]);
        return;
      }
      let filtered = [...services];
      console.log('✅ Copied services array');
      if (filters.searchName.trim()) {
        console.log('🔍 Applying searchName filter:', filters.searchName);
        filtered = filtered.filter(service => service.name.toLowerCase().includes(filters.searchName.toLowerCase()));
        console.log('✅ After searchName filter:', filtered.length);
      }
      if (filters.category) {
        console.log('🔍 Applying category filter:', filters.category);
        filtered = filtered.filter(service => service.category._id === filters.category);
        console.log('✅ After category filter:', filtered.length);
      }
      if (filters.minPrice) {
        console.log('🔍 Applying minPrice filter:', filters.minPrice);
        const minPrice = parseFloat(filters.minPrice);
        filtered = filtered.filter(service => service.basePrice >= minPrice);
        console.log('✅ After minPrice filter:', filtered.length);
      }
      if (filters.maxPrice) {
        console.log('🔍 Applying maxPrice filter:', filters.maxPrice);
        const maxPrice = parseFloat(filters.maxPrice);
        filtered = filtered.filter(service => service.basePrice <= maxPrice);
        console.log('✅ After maxPrice filter:', filtered.length);
      }
      if (filters.minDuration) {
        console.log('🔍 Applying minDuration filter:', filters.minDuration);
        const minDuration = parseFloat(filters.minDuration);
        filtered = filtered.filter(service => service.duration >= minDuration);
        console.log('✅ After minDuration filter:', filtered.length);
      }
      if (filters.maxDuration) {
        console.log('🔍 Applying maxDuration filter:', filters.maxDuration);
        const maxDuration = parseFloat(filters.maxDuration);
        filtered = filtered.filter(service => service.duration <= maxDuration);
        console.log('✅ After maxDuration filter:', filtered.length);
      }
      if (filters.status !== 'all') {
        console.log('🔍 Applying status filter:', filters.status);
        filtered = filtered.filter(service => filters.status === 'active' ? service.isActive : !service.isActive);
        console.log('✅ After status filter:', filtered.length);
      }
      console.log('🔄 Sorting filtered services...');
      filtered.sort((a, b) => {
        let compareValue = 0;
        switch (filters.sortBy) {
          case 'name':
            compareValue = a.name.localeCompare(b.name);
            break;
          case 'price':
            compareValue = a.basePrice - b.basePrice;
            break;
          case 'duration':
            compareValue = a.duration - b.duration;
            break;
          case 'rating':
            compareValue = (a.rating || 0) - (b.rating || 0);
            break;
        }
        return filters.sortOrder === 'asc' ? compareValue : -compareValue;
      });
      console.log('✅ Services sorted');
      console.log('📊 Setting filtered services:', filtered.length);
      setFilteredServices(filtered);
      console.log('✅ Filtered services state updated');
    } catch (error) {
      console.error('❌❌❌ ERROR in applyFilters ❌❌❌');
      console.error('Error:', error);
      console.error('Error name:', (error as any)?.name);
      console.error('Error message:', (error as any)?.message);
      console.error('Error stack:', (error as any)?.stack);
      setFilteredServices([]);
    }
    console.log('🔵 [END] applyFilters');
  };
  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };
  const handleResetFilters = () => {
    setFilters({
      searchName: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      minDuration: '',
      maxDuration: '',
      status: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };
  const hasActiveFilters = () => {
    return filters.searchName !== '' || filters.category !== '' || filters.minPrice !== '' || filters.maxPrice !== '' || filters.minDuration !== '' || filters.maxDuration !== '' || filters.status !== 'all' || filters.sortBy !== 'name' || filters.sortOrder !== 'asc';
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };
  const handleAddService = async (serviceData: any, images: any[]) => {
    try {
      const response = await servicesAPI.createService(serviceData, images);
      if (response.success) {
        Alert.alert('Success', 'Service created successfully');
        await loadServices();
        setShowAddModal(false);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
      throw error;
    }
  };
  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setShowAddModal(true);
  };
  const handleUpdateService = async (serviceId: string, serviceData: any, images: any[]) => {
    try {
      const response = await servicesAPI.updateService(serviceId, serviceData, images);
      if (response.success) {
        Alert.alert('Success', 'Service updated successfully');
        await loadServices();
        setShowAddModal(false);
        setSelectedService(null);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
      throw error;
    }
  };
  const handleDeleteService = async () => {
    if (!selectedService) return;
    setLoading(true);
    try {
      const response = await servicesAPI.deleteService(selectedService._id);
      if (response.success) {
        Alert.alert('Success', 'Service deleted successfully');
        await loadServices();
        setShowDeleteModal(false);
        setSelectedService(null);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      Alert.alert('Error', apiError.message);
    } finally {
      setLoading(false);
    }
  };
  const confirmDelete = (service: Service) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  };
  return <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {}
      <View className="px-5 py-4 flex-row justify-between items-center" style={{
      backgroundColor: '#eb278d'
    }}>
        <Text className="text-2xl font-bold text-white">My Services</Text>
        <TouchableOpacity className="w-10 h-10 justify-center items-center relative" onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter" size={24} color="#FFFFFF" />
          {hasActiveFilters() && <View className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#eb278d']} />}>
        {}
        <TouchableOpacity className="flex-row items-center justify-center py-4 mx-5 mt-5 rounded-xl shadow-lg" style={{
        backgroundColor: '#eb278d'
      }} onPress={() => {
        setSelectedService(null);
        setShowAddModal(true);
      }} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text className="text-white text-base font-semibold ml-2">Add New Service</Text>
        </TouchableOpacity>

        {}
        {loading && services.length === 0 ? <View className="items-center justify-center py-20">
            <Text className="text-gray-500">Loading services...</Text>
          </View> : filteredServices.length === 0 ? <View className="items-center justify-center py-20 px-10">
            <Ionicons name="briefcase-outline" size={80} color="#ccc" />
            <Text className="text-lg font-semibold text-gray-800 mt-4">
              {services.length === 0 ? 'No services found' : 'No matching services'}
            </Text>
            <Text className="text-sm text-gray-500 text-center mt-2">
              {services.length === 0 ? 'Start by adding your first service' : 'Try adjusting your filters'}
            </Text>
          </View> : <View className="p-5 pt-4 flex-row flex-wrap gap-3">
            {filteredServices.map(service => <View key={service._id} className="w-[48%]">
                <ServiceCard service={service} onEdit={() => handleEditService(service)} onDelete={() => confirmDelete(service)} />
              </View>)}
          </View>}
      </ScrollView>

      {}
      <AddServiceModal visible={showAddModal} service={selectedService} onClose={() => {
      setShowAddModal(false);
      setSelectedService(null);
    }} onSave={(serviceData, images) => {
      if (selectedService) {
        handleUpdateService(selectedService._id, serviceData, images);
      } else {
        handleAddService(serviceData, images);
      }
    }} />

      {}
      <ConfirmationModal visible={showDeleteModal} title="Delete Service" message={`Are you sure you want to delete "${selectedService?.name}"? This action cannot be undone.`} icon="trash-outline" iconColor="#FF0000" confirmText="Delete" confirmColor="#FF0000" loading={loading} onConfirm={handleDeleteService} onCancel={() => {
      setShowDeleteModal(false);
      setSelectedService(null);
    }} />

      {}
      <FilterModal visible={showFilterModal} filters={filters} categories={categories} onClose={() => setShowFilterModal(false)} onApply={handleApplyFilters} onReset={handleResetFilters} />
    </SafeAreaView>;
};
export default VendorServicesScreen;