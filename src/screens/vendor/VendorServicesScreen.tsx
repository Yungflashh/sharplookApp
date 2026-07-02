import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  RefreshControl, ActivityIndicator, StatusBar, Platform,
  Image, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { handleAPIError, servicesAPI } from '@/api/api';
import AddServiceModal from '@/components/AddServiceModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/Toast';

const BG   = '#FFF5F9';
const CARD = '#FFFFFF';
const PINK = '#E04079';
const PK2  = '#B5315F';
const T1   = '#1A1A2E';
const T2   = '#6B7280';
const T3   = '#9CA3AF';

interface Service {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  priceType: 'fixed' | 'hourly' | 'negotiable';
  duration?: number;
  category: { _id: string; name: string };
  images: string[];
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  availability?: {
    monday?: boolean; tuesday?: boolean; wednesday?: boolean;
    thursday?: boolean; friday?: boolean; saturday?: boolean; sunday?: boolean;
  };
  metadata?: { bookings: number; averageRating: number; totalReviews: number };
}

type Tab = 'all' | 'available' | 'unavailable';

const lift = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
  android: { elevation: 2 },
}) as any;

const VendorServicesScreen: React.FC = () => {
  const insets    = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [services, setServices]             = useState<Service[]>([]);
  const [search, setSearch]                 = useState('');
  const [tab, setTab]                       = useState<Tab>('all');
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [showAddModal, setShowAddModal]     = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toDelete, setToDelete]             = useState<Service | null>(null);
  const [togglingId, setTogglingId]         = useState<string | null>(null);
  const [deleting, setDeleting]             = useState(false);

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await servicesAPI.getMyServices();
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : (res.data?.services ?? []);
        setServices(data);
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  }, []);

  const toggleActive = async (service: Service) => {
    if (service.approvalStatus === 'pending') {
      toast.info('Pending Approval', 'This service is awaiting admin review. You can toggle availability once it\'s approved.');
      return;
    }
    if (service.approvalStatus === 'rejected') {
      const reason = service.rejectionReason ? `Reason: ${service.rejectionReason}` : 'Please edit and resubmit the service.';
      toast.error('Service Rejected', `This service was rejected by admin. ${reason}`);
      return;
    }
    try {
      setTogglingId(service._id);
      const res = await servicesAPI.updateService(service._id, { isActive: !service.isActive });
      if (res.success) {
        setServices(prev => prev.map(s => s._id === service._id ? { ...s, isActive: !s.isActive } : s));
        toast.success('Updated', service.isActive ? 'Service set to unavailable.' : 'Service is now available.');
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddService = async (serviceData: any, images: any[]) => {
    const res = await servicesAPI.createService(serviceData, images);
    if (res.success) {
      toast.success('Service Created', 'Your service is pending admin approval before going live.');
      await loadServices();
      setShowAddModal(false);
    }
  };

  const handleUpdateService = async (id: string, serviceData: any, images: any[]) => {
    const res = await servicesAPI.updateService(id, serviceData, images);
    if (res.success) {
      toast.success('Updated', 'Service updated successfully.');
      await loadServices();
      setShowAddModal(false);
      setSelectedService(null);
    }
  };

  const handleDeleteService = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      const res = await servicesAPI.deleteService(toDelete._id);
      if (res.success) {
        toast.success('Deleted', 'Service removed successfully.');
        setServices(prev => prev.filter(s => s._id !== toDelete._id));
        setShowDeleteModal(false);
        setToDelete(null);
      }
    } catch (error) {
      toast.error('Delete Failed', handleAPIError(error).message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchTab   = tab === 'all' ? true : tab === 'available' ? s.isActive : !s.isActive;
    return matchSearch && matchTab;
  });

  const formatDuration = (mins?: number) => {
    if (!mins) return null;
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
    }
    return `${mins} min`;
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>My Services</Text>
        <TouchableOpacity
          onPress={() => { setSelectedService(null); setShowAddModal(true); }}
          style={s.addBtn} activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={15} color={PINK} />
          <Text style={s.addBtnTxt}>Add Service</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={T3} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search Product"
          placeholderTextColor={T3}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={T3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {(['all', 'available', 'unavailable'] as Tab[]).map(t => {
          const on = tab === t;
          return (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tabBtn, on && s.tabBtnOn]} activeOpacity={0.8}>
              <Text style={[s.tabTxt, on && s.tabTxtOn]}>
                {t === 'all' ? 'All' : t === 'available' ? 'Available' : 'Unavailable'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PINK} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <LinearGradient colors={[PINK, PK2]} style={s.emptyIcon}>
                <Ionicons name="briefcase-outline" size={36} color="#fff" />
              </LinearGradient>
              <Text style={s.emptyTitle}>{services.length === 0 ? 'No Services Yet' : 'No Results'}</Text>
              <Text style={s.emptyTxt}>
                {services.length === 0
                  ? 'Add your first service to start accepting bookings'
                  : 'Try a different search or filter'}
              </Text>
              {services.length === 0 && (
                <TouchableOpacity
                  onPress={() => { setSelectedService(null); setShowAddModal(true); }}
                  style={s.emptyAddBtn} activeOpacity={0.85}
                >
                  <LinearGradient colors={[PINK, PK2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.emptyAddBtnInner}>
                    <Ionicons name="add-circle" size={16} color="#fff" />
                    <Text style={s.emptyAddBtnTxt}>Add First Service</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filtered.map(service => {
              const bookings    = service.metadata?.bookings ?? 0;
              const durStr      = formatDuration(service.duration);
              const isPending   = service.approvalStatus === 'pending';
              const isRejected  = service.approvalStatus === 'rejected';
              const isApproved  = service.approvalStatus === 'approved';
              const isToggling  = togglingId === service._id;

              return (
                <View key={service._id} style={[s.card, lift]}>
                  {/* Thumbnail */}
                  <View style={s.thumb}>
                    {service.images?.[0] ? (
                      <Image source={{ uri: service.images[0] }} style={s.thumbImg} resizeMode="cover" />
                    ) : (
                      <View style={[s.thumbImg, s.thumbPlaceholder]}>
                        <Ionicons name="image-outline" size={24} color={T3} />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.cardName} numberOfLines={1}>{service.name}</Text>
                    <Text style={s.cardPrice}>₦{service.basePrice.toLocaleString()}</Text>
                    <Text style={s.cardMeta}>
                      {[durStr, bookings > 0 ? `${bookings} booking${bookings !== 1 ? 's' : ''}` : null].filter(Boolean).join(' · ') || 'No bookings yet'}
                    </Text>

                    {isPending ? (
                      <Text style={s.pendingTxt}>⏳ Pending approval</Text>
                    ) : isRejected ? (
                      <Text style={s.rejectedTxt}>✕ Rejected by admin</Text>
                    ) : (
                      <Text style={[s.statusTxt, { color: service.isActive ? '#10B981' : T3 }]}>
                        {service.isActive ? 'Available' : 'Unavailable'}
                      </Text>
                    )}
                  </View>

                  {/* Right side */}
                  <View style={s.cardRight}>
                    {/* Toggle */}
                    {isToggling ? (
                      <ActivityIndicator size="small" color={PINK} style={{ marginBottom: 10 }} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => toggleActive(service)}
                        activeOpacity={isApproved ? 0.8 : 1}
                        style={[
                          s.toggle,
                          isApproved && service.isActive && s.toggleOn,
                          !isApproved && s.toggleDisabled,
                        ]}
                      >
                        <View style={[s.toggleKnob, isApproved && service.isActive && s.toggleKnobOn]} />
                      </TouchableOpacity>
                    )}

                    {/* Edit / Delete */}
                    <View style={s.cardActions}>
                      <TouchableOpacity
                        onPress={() => { setSelectedService(service); setShowAddModal(true); }}
                        style={s.editBtn} activeOpacity={0.7}
                      >
                        <Ionicons name="pencil" size={13} color={PINK} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => { setToDelete(service); setShowDeleteModal(true); }}
                        style={s.deleteBtn} activeOpacity={0.7}
                      >
                        <Ionicons name="trash" size={13} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <AddServiceModal
        visible={showAddModal}
        service={selectedService}
        onClose={() => { setShowAddModal(false); setSelectedService(null); }}
        onSave={(data, images) =>
          selectedService
            ? handleUpdateService(selectedService._id, data, images)
            : handleAddService(data, images)
        }
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Service"
        message={`Are you sure you want to delete "${toDelete?.name}"? This cannot be undone.`}
        icon="trash-outline"
        iconColor="#EF4444"
        confirmText="Delete"
        confirmColor="#EF4444"
        loading={deleting}
        onConfirm={handleDeleteService}
        onCancel={() => { if (!deleting) { setShowDeleteModal(false); setToDelete(null); } }}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: T1, letterSpacing: -0.4 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: PINK, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  addBtnTxt: { color: PINK, fontSize: 13, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  searchInput: { flex: 1, fontSize: 14, color: T1 },

  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tabBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: CARD, borderWidth: 1, borderColor: '#F0E0E8',
  },
  tabBtnOn:  { backgroundColor: PINK, borderColor: PINK },
  tabTxt:    { fontSize: 13, fontWeight: '600', color: T2 },
  tabTxtOn:  { color: '#fff', fontWeight: '700' },

  card: {
    backgroundColor: CARD, borderRadius: 16, padding: 12,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  thumb:            { width: 76, height: 76, borderRadius: 12, overflow: 'hidden', flexShrink: 0 },
  thumbImg:         { width: 76, height: 76 },
  thumbPlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },

  cardName:    { fontSize: 14, fontWeight: '700', color: T1, marginBottom: 2 },
  cardPrice:   { fontSize: 13, fontWeight: '700', color: T1, marginBottom: 2 },
  cardMeta:    { fontSize: 11, color: T2, marginBottom: 4 },
  statusTxt:   { fontSize: 12, fontWeight: '700' },
  pendingTxt:  { fontSize: 11, fontWeight: '600', color: '#F59E0B' },
  rejectedTxt: { fontSize: 11, fontWeight: '600', color: '#EF4444' },

  cardRight:    { alignItems: 'center', gap: 10, marginLeft: 8 },
  toggle: {
    width: 46, height: 26, borderRadius: 13,
    backgroundColor: '#E5E7EB', justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn:       { backgroundColor: PINK },
  toggleDisabled: { opacity: 0.45 },
  toggleKnob: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    alignSelf: 'flex-start',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  toggleKnobOn:   { alignSelf: 'flex-end' },
  cardActions:    { flexDirection: 'row', gap: 6 },
  editBtn:        { width: 30, height: 30, borderRadius: 10, backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center' },
  deleteBtn:      { width: 30, height: 30, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },

  empty:         { alignItems: 'center', paddingTop: 60 },
  emptyIcon:     { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: T1, marginBottom: 8, letterSpacing: -0.3 },
  emptyTxt:      { fontSize: 13, color: T2, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyAddBtn:   { borderRadius: 14, overflow: 'hidden' },
  emptyAddBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 13, gap: 7 },
  emptyAddBtnTxt:   { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default VendorServicesScreen;
