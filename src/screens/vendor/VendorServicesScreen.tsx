import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Switch,
  RefreshControl, ActivityIndicator, TextInput, Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api, { handleAPIError, categoriesAPI, servicesAPI } from '@/api/api';
import AddServiceModal from '@/components/AddServiceModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/Toast';

const PRIMARY = '#E04079';
const BG = '#FCE4EC';
const TEXT_DARK = '#1A1A2E';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Service {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  priceType: 'fixed' | 'negotiable';
  currency: string;
  duration: number;
  category: { _id: string; name: string };
  images: string[];
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalNotes?: string;
  rating?: number;
  reviewCount?: number;
  metadata?: { bookings?: number };
}

type FilterTab = 'all' | 'available' | 'unavailable';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDuration = (mins: number) => {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
};

const formatPrice = (n: number) => `₦${n.toLocaleString()}`;

// ── Service Card ──────────────────────────────────────────────────────────────
interface CardProps {
  service: Service;
  onToggle: () => void;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  toggling: boolean;
}

const APPROVAL_CONFIG = {
  pending:  { label: 'Pending Review', color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline'            } as const,
  approved: { label: 'Approved',       color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle-outline'} as const,
  rejected: { label: 'Rejected',       color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle-outline'    } as const,
};

const ServiceRow: React.FC<CardProps> = ({ service, onToggle, onPress, onEdit, onDelete, toggling }) => {
  const bookings  = service.metadata?.bookings ?? 0;
  const thumb     = service.images?.[0];
  const approval  = APPROVAL_CONFIG[service.approvalStatus ?? 'pending'];
  const isApproved = service.approvalStatus === 'approved';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.card}>
      {/* Thumbnail */}
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.cardThumb} />
      ) : (
        <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
          <Ionicons name="cut-outline" size={24} color={PRIMARY} />
        </View>
      )}

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{service.name}</Text>
        <Text style={styles.cardPrice}>{formatPrice(service.basePrice)}</Text>
        <Text style={styles.cardMeta}>
          {formatDuration(service.duration)}
          {bookings > 0 ? ` · ${bookings} bookings` : ''}
        </Text>

        {/* Approval badge */}
        <View style={[styles.approvalBadge, { backgroundColor: approval.bg }]}>
          <Ionicons name={approval.icon} size={11} color={approval.color} />
          <Text style={[styles.approvalText, { color: approval.color }]}>{approval.label}</Text>
        </View>

        {/* Rejection note */}
        {service.approvalStatus === 'rejected' && service.approvalNotes ? (
          <Text style={styles.rejectionNote} numberOfLines={2}>{service.approvalNotes}</Text>
        ) : null}
      </View>

      {/* Actions column */}
      <View style={styles.cardActions}>
        {/* Toggle — only enabled when approved */}
        {toggling ? (
          <ActivityIndicator size="small" color={PRIMARY} />
        ) : (
          <Switch
            value={isApproved && service.isActive}
            onValueChange={isApproved
              ? onToggle
              : () => toast.info(
                  service.approvalStatus === 'pending' ? 'Awaiting Approval' : 'Service Rejected',
                  service.approvalStatus === 'pending'
                    ? 'This service is under review. Toggling is available once approved.'
                    : 'This service was rejected. Edit and resubmit for review.',
                )
            }
            trackColor={{ false: '#D1D5DB', true: '#F9A8CA' }}
            thumbColor={isApproved && service.isActive ? PRIMARY : '#fff'}
            ios_backgroundColor="#D1D5DB"
            style={{ opacity: isApproved ? 1 : 0.45 }}
          />
        )}

        {/* Edit + Delete */}
        <View style={styles.cardIconRow}>
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={styles.cardIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[styles.cardIconBtn, styles.cardDeleteBtn]}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const VendorServicesScreen: React.FC = () => {
  const { top, bottom } = useSafeAreaInsets();
  const navigation = useNavigation<import('@react-navigation/native-stack').NativeStackNavigationProp<import('@/types/navigation.types').RootStackParamList>>();

  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => { loadServices(); loadCategories(); }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/services/vendor/my-services');
      const data = Array.isArray(res.data.data) ? res.data.data : res.data.data?.services || [];
      setServices(data);
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const handleToggle = useCallback(async (service: Service) => {
    setTogglingId(service._id);
    // Optimistic update
    setServices(prev => prev.map(s => s._id === service._id ? { ...s, isActive: !s.isActive } : s));
    try {
      await api.put(`/services/${service._id}`, { isActive: !service.isActive });
    } catch (err) {
      // Revert on failure
      setServices(prev => prev.map(s => s._id === service._id ? { ...s, isActive: service.isActive } : s));
      toast.error('Error', handleAPIError(err).message);
    } finally {
      setTogglingId(null);
    }
  }, []);

  const handleAddService = async (serviceData: any, images: any[]) => {
    const res = await servicesAPI.createService(serviceData, images);
    if (res.success) {
      toast.success('Done!', 'Service added successfully');
      await loadServices();
      setShowAddModal(false);
    }
  };

  const handleUpdateService = async (id: string, serviceData: any, images: any[]) => {
    const res = await servicesAPI.updateService(id, serviceData, images);
    if (res.success) {
      toast.success('Done!', 'Service updated');
      await loadServices();
      setShowAddModal(false);
      setSelectedService(null);
    }
  };

  const handleDeleteService = async () => {
    if (!selectedService) return;
    setLoading(true);
    try {
      const res = await servicesAPI.deleteService(selectedService._id);
      if (res.success) {
        toast.success('Deleted', 'Service removed');
        await loadServices();
        setShowDeleteModal(false);
        setSelectedService(null);
      }
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────────
  const displayed = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      activeTab === 'all' ? true :
      activeTab === 'available' ? s.isActive :
      !s.isActive;
    return matchesSearch && matchesTab;
  });

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'unavailable', label: 'Unavailable' },
  ];

  return (
    <View style={[styles.root, { paddingTop: top }]}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={PRIMARY} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Services</Text>

        <TouchableOpacity
          onPress={() => { setSelectedService(null); setShowAddModal(true); }}
          style={styles.addBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={styles.addBtnText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search services..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter tabs ─────────────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      {loading && services.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottom + 32, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
        >
          {displayed.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={48} color={PRIMARY} />
              <Text style={styles.emptyTitle}>
                {services.length === 0 ? 'No services yet' : 'No results'}
              </Text>
              <Text style={styles.emptyBody}>
                {services.length === 0
                  ? 'Tap "Add Service" to create your first service'
                  : 'Try a different search or filter'}
              </Text>
            </View>
          ) : (
            displayed.map((service, i) => (
              <View key={service._id}>
                <ServiceRow
                  service={service}
                  toggling={togglingId === service._id}
                  onToggle={() => handleToggle(service)}
                  onPress={() => navigation.navigate('VendorServiceDetail', { serviceId: service._id })}
                  onEdit={() => { setSelectedService(service); setShowAddModal(true); }}
                  onDelete={() => { setSelectedService(service); setShowDeleteModal(true); }}
                />
                {i < displayed.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <AddServiceModal
        visible={showAddModal}
        service={selectedService}
        onClose={() => { setShowAddModal(false); setSelectedService(null); }}
        onSave={(data, imgs) =>
          selectedService
            ? handleUpdateService(selectedService._id, data, imgs)
            : handleAddService(data, imgs)
        }
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Service"
        message={`Delete "${selectedService?.name}"? This cannot be undone.`}
        icon="trash-outline"
        iconColor="#EF4444"
        confirmText="Delete"
        confirmColor="#EF4444"
        loading={loading}
        onConfirm={handleDeleteService}
        onCancel={() => { setShowDeleteModal(false); setSelectedService(null); }}
      />
    </View>
  );
};

export default VendorServicesScreen;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BG,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: TEXT_DARK,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_DARK, padding: 0 },

  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  // Cards
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardThumb: { width: 72, height: 72, borderRadius: 12 },
  cardThumbPlaceholder: { backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  cardName: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  cardPrice: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: '#6B7280', marginBottom: 5 },
  cardStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardStatusDot: { width: 7, height: 7, borderRadius: 4 },
  cardStatusText: { fontSize: 12, fontWeight: '600' },
  approvalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 5,
  },
  approvalText: { fontSize: 11, fontWeight: '700' },
  rejectionNote: { fontSize: 11, color: '#EF4444', marginTop: 3, lineHeight: 15 },

  cardActions: { alignItems: 'center', gap: 8, marginLeft: 8 },
  cardIconRow: { flexDirection: 'row', gap: 6 },
  cardIconBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  cardDeleteBtn: { backgroundColor: '#FEE2E2' },

  divider: { height: 8 },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginTop: 16, marginBottom: 8 },
  emptyBody: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
