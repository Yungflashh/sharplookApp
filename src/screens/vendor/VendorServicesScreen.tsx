import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import api, { handleAPIError, categoriesAPI, servicesAPI } from '@/api/api';
import AddServiceModal from '@/components/AddServiceModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import FilterModal, { FilterOptions } from '@/components/FilterModal';
import { toast } from '@/components/ui/Toast';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079', primaryDark: '#B5315F',
  primarySoft: '#FEF0F5', primaryMuted: '#FCDCE9',
  green: '#10B981', greenSoft: '#D1FAE5',
  gold: '#F59E0B', goldSoft: '#FEF3C7',
  surface: '#FFFFFF', surfaceAlt: '#F9FAFB',
  border: '#F3F4F6', borderStrong: '#E5E7EB',
  textPrimary: '#111827', textSecondary: '#6B7280', textMuted: '#9CA3AF',
};

const shadow = (color = '#000', opacity = 0.07, radius = 8, y = 2) =>
  Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: radius },
    android: { elevation: Math.round(radius / 2) },
  });

// ─── Types ────────────────────────────────────────────────────────────────────
interface Service {
  _id: string; name: string; description: string;
  basePrice: number; priceType: 'fixed' | 'negotiable';
  currency: string; duration: number;
  category: { _id: string; name: string };
  images: string[];
  serviceArea: { type: string; coordinates: number[]; radius: number };
  isActive: boolean; rating?: number; reviewCount?: number;
}

const DEFAULT_FILTERS: FilterOptions = {
  searchName: '', category: '', minPrice: '', maxPrice: '',
  minDuration: '', maxDuration: '', status: 'all',
  sortBy: 'name', sortOrder: 'asc',
};

const hasActiveFilters = (f: FilterOptions) =>
  f.searchName !== '' || f.category !== '' || f.minPrice !== '' ||
  f.maxPrice !== '' || f.minDuration !== '' || f.maxDuration !== '' ||
  f.status !== 'all' || f.sortBy !== 'name' || f.sortOrder !== 'asc';

// ─── Main Screen ──────────────────────────────────────────────────────────────
const VendorServicesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [services, setServices]               = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [categories, setCategories]           = useState<any[]>([]);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [refreshing, setRefreshing]           = useState(false);
  const [filters, setFilters]                 = useState<FilterOptions>(DEFAULT_FILTERS);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadServices(); loadCategories(); }, []);
  useEffect(() => { applyFilters(); }, [services, filters]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/services/vendor/my-services');
      if (res.data.success) {
        const data = Array.isArray(res.data.data) ? res.data.data : res.data.data?.services || [];
        setServices(data);
      } else { setServices([]); }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
      setServices([]);
    } finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      if (res.success) setCategories(res.data || []);
    } catch {
      setCategories([
        { _id: '1', name: 'Hair' }, { _id: '2', name: 'Makeup' },
        { _id: '3', name: 'Nails' }, { _id: '4', name: 'Spa' },
      ]);
    }
  };

  const applyFilters = () => {
    try {
      if (!Array.isArray(services)) { setFilteredServices([]); return; }
      let f = [...services];
      if (filters.searchName.trim())
        f = f.filter((s) => s.name.toLowerCase().includes(filters.searchName.toLowerCase()));
      if (filters.category)
        f = f.filter((s) => s.category._id === filters.category);
      if (filters.minPrice)
        f = f.filter((s) => s.basePrice >= parseFloat(filters.minPrice));
      if (filters.maxPrice)
        f = f.filter((s) => s.basePrice <= parseFloat(filters.maxPrice));
      if (filters.minDuration)
        f = f.filter((s) => s.duration >= parseFloat(filters.minDuration));
      if (filters.maxDuration)
        f = f.filter((s) => s.duration <= parseFloat(filters.maxDuration));
      if (filters.status !== 'all')
        f = f.filter((s) => filters.status === 'active' ? s.isActive : !s.isActive);

      f.sort((a, b) => {
        let v = 0;
        if (filters.sortBy === 'name')     v = a.name.localeCompare(b.name);
        if (filters.sortBy === 'price')    v = a.basePrice - b.basePrice;
        if (filters.sortBy === 'duration') v = a.duration - b.duration;
        if (filters.sortBy === 'rating')   v = (a.rating || 0) - (b.rating || 0);
        return filters.sortOrder === 'asc' ? v : -v;
      });
      setFilteredServices(f);
    } catch { setFilteredServices([]); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  // ── Service actions ───────────────────────────────────────────────────────
  const handleAddService = async (serviceData: any, images: any[]) => {
    try {
      const res = await servicesAPI.createService(serviceData, images);
      if (res.success) {
        toast.success('Success', 'Service created');
        await loadServices();
        setShowAddModal(false);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      if (apiError.status === 403 && apiError.message?.includes('Upgrade')) {
        toast.info('Limit Reached', apiError.message);
        setShowAddModal(false);
        navigation.navigate('UpgradeTier' as never);
      } else {
        toast.error('Error', apiError.message);
      }
      throw error;
    }
  };

  const handleUpdateService = async (id: string, serviceData: any, images: any[]) => {
    try {
      const res = await servicesAPI.updateService(id, serviceData, images);
      if (res.success) {
        toast.success('Success', 'Service updated');
        await loadServices();
        setShowAddModal(false);
        setSelectedService(null);
      }
    } catch (error) { toast.error('Error', handleAPIError(error).message); throw error; }
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;
    setLoading(true);
    try {
      const res = await servicesAPI.deleteService(selectedService._id);
      if (res.success) {
        toast.success('Success', 'Service deleted');
        await loadServices();
        setShowDeleteModal(false);
        setSelectedService(null);
      }
    } catch (error) { toast.error('Error', handleAPIError(error).message); }
    finally { setLoading(false); }
  };

  const confirmDelete = (service: Service) => { setSelectedService(service); setShowDeleteModal(true); };
  const handleEditService = (service: Service) => { setSelectedService(service); setShowAddModal(true); };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const activeCount   = services.filter((s) => s.isActive).length;
  const inactiveCount = services.length - activeCount;
  const filtersOn     = hasActiveFilters(filters);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BRAND.surface} />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <View style={[{
        backgroundColor: BRAND.surface,
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: BRAND.border,
      }, shadow('#000', 0.05, 8, 2)]}>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.4 }}>
            My Services
          </Text>
          <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
            {services.length} {services.length === 1 ? 'service' : 'services'}
            {activeCount > 0 ? ` · ${activeCount} active` : ''}
          </Text>
        </View>

        {/* Filter button */}
        <TouchableOpacity
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.8}
          style={{
            width: 40, height: 40, borderRadius: 13,
            backgroundColor: filtersOn ? BRAND.primarySoft : BRAND.surfaceAlt,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1.5, borderColor: filtersOn ? BRAND.primaryMuted : BRAND.border,
            marginRight: 8,
          }}
        >
          <Ionicons name="options-outline" size={19} color={filtersOn ? BRAND.primary : BRAND.textSecondary} />
          {filtersOn && (
            <View style={{
              position: 'absolute', top: -2, right: -2,
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: BRAND.gold,
              borderWidth: 1.5, borderColor: BRAND.surface,
            }} />
          )}
        </TouchableOpacity>

        {/* Add button */}
        <TouchableOpacity
          onPress={() => { setSelectedService(null); setShowAddModal(true); }}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: BRAND.primary,
            paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
            ...shadow(BRAND.primary, 0.3, 8, 3),
          }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── STATS STRIP ──────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
          <LinearGradient
            colors={[BRAND.primary, BRAND.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 18, padding: 14, flexDirection: 'row', ...shadow(BRAND.primary, 0.22, 12, 4) }}
          >
            {[
              { label: 'Total',    value: services.length.toString(),  icon: 'layers-outline'          as const },
              { label: 'Active',   value: activeCount.toString(),       icon: 'checkmark-circle-outline' as const },
              { label: 'Inactive', value: inactiveCount.toString(),     icon: 'pause-circle-outline'    as const },
              { label: 'Showing',  value: filteredServices.length.toString(), icon: 'eye-outline'      as const },
            ].map((s, i, arr) => (
              <View key={i} style={{
                flex: 1, alignItems: 'center',
                borderRightWidth: i < arr.length - 1 ? 1 : 0,
                borderRightColor: 'rgba(255,255,255,0.2)',
              }}>
                <Ionicons name={s.icon} size={14} color="rgba(255,255,255,0.65)" style={{ marginBottom: 3 }} />
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>{s.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '500', marginTop: 1 }}>{s.label}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>
      )}

      {/* ── ACTIVE FILTER CHIPS ──────────────────────────────────────────── */}
      {filtersOn && (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: BRAND.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: BRAND.primaryMuted, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="filter" size={11} color={BRAND.primary} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: BRAND.primary }}>Filters active</Text>
            </View>
            <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)} activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BRAND.surfaceAlt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: BRAND.border }}>
              <Ionicons name="close" size={11} color={BRAND.textMuted} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: BRAND.textSecondary }}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── SERVICE LIST ─────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}
      >
        {loading && services.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <ActivityIndicator size="large" color={BRAND.primary} />
            <Text style={{ color: BRAND.textMuted, fontSize: 13, marginTop: 12, fontWeight: '500' }}>Loading services…</Text>
          </View>
        ) : filteredServices.length === 0 ? (
          /* Empty state */
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
            <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Ionicons name="briefcase-outline" size={42} color={BRAND.primary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 8, letterSpacing: -0.3 }}>
              {services.length === 0 ? 'No Services Yet' : 'No Matching Services'}
            </Text>
            <Text style={{ fontSize: 13, color: BRAND.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              {services.length === 0
                ? 'Add your first service to start accepting bookings'
                : 'Try adjusting or clearing your filters'}
            </Text>
            {services.length === 0 ? (
              <TouchableOpacity
                onPress={() => { setSelectedService(null); setShowAddModal(true); }}
                activeOpacity={0.85}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 22, ...shadow(BRAND.primary, 0.35, 10, 4) }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Add First Service</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setFilters(DEFAULT_FILTERS)}
                activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 20, borderWidth: 1.5, borderColor: BRAND.border, backgroundColor: BRAND.surface }}
              >
                <Ionicons name="close-circle-outline" size={16} color={BRAND.textSecondary} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textSecondary }}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {filteredServices.map((service) => (
              <View key={service._id} style={{ width: '48%' }}>
                <ServiceCard
                  service={service}
                  onEdit={() => handleEditService(service)}
                  onDelete={() => confirmDelete(service)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => { setSelectedService(null); setShowAddModal(true); }}
        activeOpacity={0.85}
        style={{
          position: 'absolute', bottom: insets.bottom + 20, right: 20,
          width: 58, height: 58, borderRadius: 29,
          backgroundColor: BRAND.primary,
          alignItems: 'center', justifyContent: 'center',
          ...shadow(BRAND.primary, 0.4, 14, 6),
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}
      <AddServiceModal
        visible={showAddModal}
        service={selectedService}
        onClose={() => { setShowAddModal(false); setSelectedService(null); }}
        onSave={(serviceData, images) =>
          selectedService
            ? handleUpdateService(selectedService._id, serviceData, images)
            : handleAddService(serviceData, images)
        }
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Service"
        message={`Are you sure you want to delete "${selectedService?.name}"? This action cannot be undone.`}
        icon="trash-outline"
        iconColor={BRAND.red ?? '#EF4444'}
        confirmText="Delete"
        confirmColor={BRAND.red ?? '#EF4444'}
        loading={loading}
        onConfirm={handleDeleteService}
        onCancel={() => { setShowDeleteModal(false); setSelectedService(null); }}
      />

      <FilterModal
        visible={showFilterModal}
        filters={filters}
        categories={categories}
        onClose={() => setShowFilterModal(false)}
        onApply={(f) => setFilters(f)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
    </SafeAreaView>
  );
};

export default VendorServicesScreen;