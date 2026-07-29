import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, Switch,
  ActivityIndicator, Dimensions, StyleSheet, Modal, NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { servicesAPI, handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import AddServiceModal from '@/components/AddServiceModal';
import api from '@/api/api';

const { width: W } = Dimensions.get('window');
const PRIMARY = '#E04079';
const BG = '#FCE4EC';
const TEXT_DARK = '#1A1A2E';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VendorServiceDetail'>;
type RouteT = RouteProp<RootStackParamList, 'VendorServiceDetail'>;

interface ServiceDetail {
  _id: string;
  name: string;
  description?: string;
  basePrice: number;
  priceType: 'fixed' | 'negotiable';
  currency: string;
  duration: number;
  category?: { _id: string; name: string };
  images: string[];
  isActive: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rating?: number;
  reviewCount?: number;
  metadata?: {
    bookings?: number;
    views?: number;
    averageRating?: number;
    totalReviews?: number;
  };
}

const formatDuration = (mins: number) => {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
};

const formatPrice = (n: number) => `₦${n?.toLocaleString() ?? '0'}`;

const ApprovalBadge: React.FC<{ status?: string }> = ({ status }) => {
  const cfg =
    status === 'approved' ? { label: 'Approved', bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle' as const } :
    status === 'rejected' ? { label: 'Rejected', bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle' as const } :
    { label: 'Pending', bg: '#FEF3C7', color: '#D97706', icon: 'time-outline' as const };

  return (
    <View style={[styles.approvalBadge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={13} color={cfg.color} />
      <Text style={[styles.approvalText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};


const VendorServiceDetailScreen: React.FC = () => {
  const { top, bottom } = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { serviceId } = route.params;

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const loadService = useCallback(async () => {
    try {
      setLoading(true);
      const res = await servicesAPI.getServiceById(serviceId);
      const data = res.data?.service || res.data || res;
      setService(data);
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => { loadService(); }, [loadService]);

  const handleToggle = async () => {
    if (!service) return;
    setToggling(true);
    const next = !service.isActive;
    setService(prev => prev ? { ...prev, isActive: next } : prev);
    try {
      await api.put(`/services/${service._id}`, { isActive: next });
    } catch (err) {
      setService(prev => prev ? { ...prev, isActive: !next } : prev);
      toast.error('Error', handleAPIError(err).message);
    } finally {
      setToggling(false);
    }
  };

  const handleUpdateService = async (serviceData: any, images: any[]) => {
    if (!service) return;
    try {
      const res = await servicesAPI.updateService(service._id, serviceData, images);
      if (res.success) {
        toast.success('Done!', 'Service updated');
        setShowEditModal(false);
        loadService();
      }
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    setDeleting(true);
    try {
      const res = await servicesAPI.deleteService(service._id);
      if (res.success) {
        toast.success('Deleted', 'Service removed');
        navigation.goBack();
      }
    } catch (err) {
      toast.error('Error', handleAPIError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setImgIndex(idx);
  };

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.root, { paddingTop: top, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={PRIMARY} />
        <Text style={{ color: TEXT_DARK, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Service not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.bookBtn, { marginTop: 20, paddingHorizontal: 32 }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = service.images?.length ? service.images : [];
  const isApproved = service.approvalStatus === 'approved';
  const bookings = service.metadata?.bookings ?? 0;
  const views = service.metadata?.views ?? 0;
  const avgRating = service.metadata?.averageRating ?? service.rating ?? 0;
  const totalReviews = service.metadata?.totalReviews ?? service.reviewCount ?? 0;

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 100 }}
      >
        {/* Image carousel */}
        <View style={styles.carouselWrap}>
          {images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
              >
                {images.map((img, i) => (
                  <Image key={i} source={{ uri: img }} style={styles.carouselImg} resizeMode="cover" />
                ))}
              </ScrollView>

              {/* Approval badge */}
              <ApprovalBadge status={service.approvalStatus} />

              {/* Page counter */}
              {images.length > 1 && (
                <View style={styles.pageCounter}>
                  <Text style={styles.pageCounterText}>{imgIndex + 1}/{images.length}</Text>
                </View>
              )}

              {/* Dots */}
              {images.length > 1 && (
                <View style={styles.dotsRow}>
                  {images.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === imgIndex ? styles.dotActive : styles.dotInactive]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.carouselPlaceholder}>
              <Ionicons name="cut-outline" size={48} color={PRIMARY} />
              <Text style={{ color: PRIMARY, marginTop: 8, fontSize: 13, fontWeight: '600' }}>No images</Text>
              <ApprovalBadge status={service.approvalStatus} />
            </View>
          )}
        </View>

        {/* Name + Toggle */}
        <View style={styles.section}>
          <View style={styles.nameRow}>
            <Text style={styles.serviceName}>{service.name}</Text>
            {toggling ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <Switch
                value={isApproved && service.isActive}
                onValueChange={isApproved
                  ? handleToggle
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
          </View>

          {/* Price + status */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(service.basePrice)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isApproved && service.isActive ? '#D1FAE5' : '#F3F4F6' }]}>
              <View style={[styles.statusDot, { backgroundColor: isApproved && service.isActive ? '#10b981' : '#9CA3AF' }]} />
              <Text style={[styles.statusText, { color: isApproved && service.isActive ? '#059669' : '#6B7280' }]}>
                {isApproved && service.isActive ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
              <Text style={styles.statVal}>{bookings}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="star-outline" size={18} color={PRIMARY} />
              <Text style={styles.statVal}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>{totalReviews} Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={18} color={PRIMARY} />
              <Text style={styles.statVal}>{views}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
          </View>
        </View>

        {/* Service Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoHeader}>Service Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{formatDuration(service.duration)}</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Price Type</Text>
            <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
              {service.priceType ?? '—'}
            </Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Categories</Text>
            <Text style={styles.infoValue}>{service.category?.name ?? '—'}</Text>
          </View>

          {!!service.description && (
            <>
              <View style={styles.infoDivider} />
              <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={[styles.infoValue, { flex: 1, textAlign: 'right', lineHeight: 20 }]}>
                  {service.description}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom action buttons */}
      <View style={[styles.actionBar, { paddingBottom: bottom + 10 }]}>
        <TouchableOpacity
          onPress={() => setShowEditModal(true)}
          activeOpacity={0.85}
          style={styles.editBtn}
        >
          <Ionicons name="create-outline" size={18} color={PRIMARY} />
          <Text style={styles.editBtnText}>Edit Service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowDeleteModal(true)}
          activeOpacity={0.85}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

<AddServiceModal
        visible={showEditModal}
        service={service as any}
        onClose={() => setShowEditModal(false)}
        onSave={handleUpdateService}
      />

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Service"
        message={`Delete "${service.name}"? This cannot be undone.`}
        icon="trash-outline"
        iconColor="#EF4444"
        confirmText="Delete"
        confirmColor="#EF4444"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </View>
  );
};

export default VendorServiceDetailScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK },

  /* Carousel */
  carouselWrap: { position: 'relative', marginBottom: 0 },
  carouselImg: { width: W, height: 260 },
  carouselPlaceholder: {
    width: W, height: 220, backgroundColor: '#FEE2F0',
    alignItems: 'center', justifyContent: 'center',
  },
  approvalBadge: {
    position: 'absolute', top: 12, left: 14,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  approvalText: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
  pageCounter: {
    position: 'absolute', top: 12, right: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  pageCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  dotsRow: {
    position: 'absolute', bottom: 12,
    left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 18, backgroundColor: PRIMARY },
  dotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.6)' },

  /* Name + toggle */
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14,
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  serviceName: { fontSize: 20, fontWeight: '800', color: TEXT_DARK, flex: 1, marginRight: 10 },
  priceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  price: { fontSize: 22, fontWeight: '800', color: PRIMARY },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 12, fontWeight: '700' },

  /* Stats */
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF5F9', borderRadius: 12, paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginTop: 3 },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  statDivider: { width: 1, height: 36, backgroundColor: '#F3C7DA' },

  /* Info card */
  infoCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14,
    borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  infoHeader: { fontSize: 15, fontWeight: '800', color: TEXT_DARK, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  infoLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  infoValue: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  infoDivider: { height: 1, backgroundColor: '#F3F4F6' },

  /* Bottom bar */
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3E6EC',
    gap: 10,
  },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#FEE2F0', borderRadius: 12, paddingVertical: 13,
  },
  editBtnText: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#FEE2E2', borderRadius: 12, paddingVertical: 13,
    paddingHorizontal: 20,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
  bookBtn: {
    backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },

});
