import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, StyleSheet, StatusBar, Platform,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, handleAPIError } from '@/api/api';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/Toast';

const BG   = '#FFF5F9';
const PINK = '#E04079';
const CARD = '#FFFFFF';
const T1   = '#1A1A2E';
const T2   = '#6B7280';
const T3   = '#9CA3AF';

const { width: SW } = Dimensions.get('window');

type Nav   = NativeStackNavigationProp<RootStackParamList, 'VendorProductDetail'>;
type Route = RouteProp<RootStackParamList, 'VendorProductDetail'>;

const lift = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
  android: { elevation: 2 },
}) as any;

const VendorProductDetailScreen: React.FC = () => {
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const insets      = useSafeAreaInsets();
  const { productId } = route.params;

  const [product, setProduct]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [imgIndex, setImgIndex]   = useState(0);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [deleteModal, setDeleteModal] = useState({ visible: false, deleting: false });

  useEffect(() => { fetchProduct(); }, []);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await productAPI.getProductById(productId, false);
      if (res.success) setProduct(res.data?.product ?? res.data);
    } catch (e) {
      toast.error('Error', handleAPIError(e).message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setImgIndex(idx);
  };

  const confirmDelete = async () => {
    try {
      setDeleteModal(p => ({ ...p, deleting: true }));
      await productAPI.deleteProduct(productId);
      toast.success('Deleted', 'Product removed successfully.');
      setDeleteModal({ visible: false, deleting: false });
      navigation.goBack();
    } catch (e) {
      toast.error('Delete Failed', handleAPIError(e).message);
      setDeleteModal(p => ({ ...p, deleting: false }));
    }
  };

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  if (!product) return null;

  const images: string[]   = product.images ?? [];
  const status             = product.approvalStatus as 'pending' | 'approved' | 'rejected';
  const sold               = product.totalOrders ?? product.metadata?.totalOrders ?? 0;
  const stockCount         = product.stock ?? 0;
  const views              = product.metadata?.views ?? 0;
  const categoryName       = product.category?.name ?? '—';
  const price              = product.finalPrice ?? product.price ?? 0;

  const statusCfg = {
    approved: { label: 'Approved', color: '#15803D', bg: '#DCFCE7', dot: '#22C55E', date: product.approvedAt },
    pending:  { label: 'Pending Review', color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B', date: product.createdAt },
    rejected: { label: 'Rejected', color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444', date: product.rejectedAt },
  }[status] ?? { label: 'Unknown', color: T2, bg: '#F3F4F6', dot: T3, date: null };

  const fmtDate = (d?: string) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerCircle} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color={PINK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Products Details</Text>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.headerCircle} activeOpacity={0.8}>
          <Ionicons name="ellipsis-vertical" size={18} color={PINK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Image Carousel */}
        <View style={[s.carouselCard, lift]}>
          {images.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={{ borderRadius: 16 }}
              >
                {images.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={{ width: SW - 32, height: 260 }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>

              {/* Status badge */}
              <View style={[s.imgBadge, { backgroundColor: statusCfg.bg }]}>
                <View style={[s.imgBadgeDot, { backgroundColor: statusCfg.dot }]} />
                <Text style={[s.imgBadgeTxt, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>

              {/* Counter */}
              {images.length > 1 && (
                <View style={s.imgCounter}>
                  <Text style={s.imgCounterTxt}>{imgIndex + 1}/{images.length}</Text>
                </View>
              )}

              {/* Dots */}
              {images.length > 1 && (
                <View style={s.dots}>
                  {images.map((_, i) => (
                    <View key={i} style={[s.dot, i === imgIndex && s.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={s.imgPlaceholder}>
              <Ionicons name="image-outline" size={48} color={T3} />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={s.infoBlock}>
          <Text style={s.productName}>{product.name}</Text>
          <Text style={s.categoryName}>{categoryName}</Text>

          <View style={s.priceRow}>
            <Text style={s.price}>₦{price.toLocaleString()}</Text>
            <View style={s.stockBadge}>
              <Text style={s.stockTxt}>{stockCount} in Stock</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={[s.statsRow, lift]}>
            {[
              { icon: 'bag-handle-outline', value: sold,       label: 'Sold'  },
              { icon: 'cube-outline',       value: stockCount, label: 'Stock' },
              { icon: 'eye-outline',        value: views,      label: 'Views' },
            ].map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && <View style={s.statDivider} />}
                <View style={s.statItem}>
                  <Ionicons name={stat.icon as any} size={18} color={PINK} />
                  <Text style={s.statValue}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Product Status Card */}
        <View style={[s.statusCard, lift]}>
          <Text style={s.statusCardTitle}>Product Status</Text>
          <View style={[s.statusPill, { backgroundColor: statusCfg.bg }]}>
            <View style={[s.statusDot, { backgroundColor: statusCfg.dot }]} />
            <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          {fmtDate(statusCfg.date) && (
            <Text style={s.statusDate}>
              {status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Submitted'} on {fmtDate(statusCfg.date)}
            </Text>
          )}
          {status === 'rejected' && product.rejectionReason ? (
            <View style={s.rejectionBox}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={s.rejectionTxt}>{product.rejectionReason}</Text>
            </View>
          ) : null}
        </View>

        {/* Description */}
        {product.description ? (
          <View style={[s.descCard, lift]}>
            <Text style={s.descTitle}>Description</Text>
            <Text style={s.descTxt}>{product.description}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.editBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EditProduct', { productId })}
          >
            <Ionicons name="pencil" size={16} color={PINK} />
            <Text style={s.editBtnTxt}>Edit Product</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.deleteBtn}
            activeOpacity={0.85}
            onPress={() => setDeleteModal({ visible: true, deleting: false })}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={s.deleteBtnTxt}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ⋯ Menu Sheet */}
      {menuOpen && (
        <TouchableOpacity
          style={s.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={[s.menuSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.menuHandle} />
            {[
              {
                label: 'Edit Product', icon: 'pencil' as const, color: T1,
                onPress: () => { setMenuOpen(false); navigation.navigate('EditProduct', { productId }); },
              },
              {
                label: 'Delete Product', icon: 'trash-outline' as const, color: '#EF4444',
                onPress: () => { setMenuOpen(false); setDeleteModal({ visible: true, deleting: false }); },
              },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                <View style={[s.menuIcon, { backgroundColor: item.color === '#EF4444' ? '#FEE2E2' : '#F3F4F6' }]}>
                  <Ionicons name={item.icon} size={17} color={item.color} />
                </View>
                <Text style={[s.menuTxt, { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}

      <ConfirmationModal
        visible={deleteModal.visible}
        title="Delete Product"
        message={`Are you sure you want to delete "${product.name}"? This cannot be undone.`}
        icon="trash-outline"
        iconColor="#EF4444"
        confirmText="Delete"
        confirmColor="#EF4444"
        loading={deleteModal.deleting}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleteModal.deleting) setDeleteModal({ visible: false, deleting: false }); }}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
  },
  headerCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: T1, letterSpacing: -0.3 },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  carouselCard: {
    backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', marginBottom: 16,
  },
  imgPlaceholder: {
    height: 260, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  imgBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  imgBadgeDot: { width: 7, height: 7, borderRadius: 4 },
  imgBadgeTxt: { fontSize: 12, fontWeight: '700' },
  imgCounter: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  imgCounterTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    paddingVertical: 12,
  },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5C4D5' },
  dotActive: { width: 18, backgroundColor: PINK },

  infoBlock: { marginBottom: 16 },
  productName: { fontSize: 20, fontWeight: '800', color: T1, marginBottom: 4, letterSpacing: -0.3 },
  categoryName: { fontSize: 13, color: T3, marginBottom: 12 },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  price:    { fontSize: 22, fontWeight: '800', color: PINK, letterSpacing: -0.5 },
  stockBadge: {
    backgroundColor: '#DCFCE7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  stockTxt: { fontSize: 12, fontWeight: '700', color: '#15803D' },

  statsRow: {
    backgroundColor: CARD, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: '#F3F4F6' },
  statValue: { fontSize: 16, fontWeight: '800', color: T1 },
  statLabel: { fontSize: 11, color: T3, fontWeight: '500' },

  statusCard: {
    backgroundColor: CARD, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  statusCardTitle: { fontSize: 15, fontWeight: '700', color: T1, marginBottom: 12 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start', marginBottom: 6,
  },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '700' },
  statusDate: { fontSize: 13, color: T2, marginTop: 4 },
  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 10, marginTop: 10,
  },
  rejectionTxt: { flex: 1, fontSize: 13, color: '#B91C1C', lineHeight: 18 },

  descCard: {
    backgroundColor: CARD, borderRadius: 16,
    padding: 16, marginBottom: 12,
  },
  descTitle: { fontSize: 15, fontWeight: '700', color: T1, marginBottom: 8 },
  descTxt:   { fontSize: 14, color: T2, lineHeight: 22 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: PINK, borderRadius: 13,
    paddingVertical: 13,
  },
  editBtnTxt:   { fontSize: 14, fontWeight: '700', color: PINK },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 13,
    paddingVertical: 13, backgroundColor: '#FEF2F2',
  },
  deleteBtnTxt: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 12,
  },
  menuHandle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuTxt:  { fontSize: 15, fontWeight: '600' },
});

export default VendorProductDetailScreen;
