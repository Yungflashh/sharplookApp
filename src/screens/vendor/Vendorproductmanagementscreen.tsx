import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, RefreshControl, Platform, TextInput,
  StyleSheet, StatusBar, Modal, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, handleAPIError } from '@/api/api';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/Toast';

const BG   = '#FFF5F9';
const PINK = '#E04079';
const PK2  = '#B5315F';
const CARD = '#FFFFFF';
const T1   = '#1A1A2E';
const T2   = '#6B7280';
const T3   = '#9CA3AF';

type Nav = NativeStackNavigationProp<RootStackParamList, 'VendorProductManagement'>;
type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

interface Product {
  _id: string; name: string; description: string; images: string[];
  price: number; finalPrice: number; stock: number;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  category: { _id?: string; name: string };
  totalOrders?: number; totalSales?: number;
  rating?: number; totalRatings?: number;
  rejectionReason?: string; createdAt: string;
}

const lift = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
  android: { elevation: 2 },
}) as any;

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const VendorProductManagementScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets     = useSafeAreaInsets();

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [products, setProducts]         = useState<Product[]>([]);
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [deleteModal, setDeleteModal]   = useState({ visible: false, productId: '', deleting: false });
  const [stockModal, setStockModal]     = useState({ visible: false, product: null as Product | null, value: '' });
  const [menuModal, setMenuModal]       = useState({ visible: false, product: null as Product | null });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productAPI.getMyProducts();
      if (res.success) {
        const list: Product[] =
          res.data.products ??
          (Array.isArray(res.data) ? res.data : null) ??
          res.data?.data?.products ??
          (Array.isArray(res.data?.data) ? res.data.data : []);
        setProducts(list);
      }
    } catch (e) {
      toast.error('Error', handleAPIError(e).message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchProducts(); }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts().finally(() => setRefreshing(false));
  }, []);

  const confirmDelete = async () => {
    const id = deleteModal.productId;
    try {
      setDeleteModal(p => ({ ...p, deleting: true }));
      await productAPI.deleteProduct(id);
      toast.success('Deleted', 'Product removed');
      setProducts(prev => prev.filter(p => p._id !== id));
      setDeleteModal({ visible: false, productId: '', deleting: false });
    } catch (e) {
      toast.error('Error', handleAPIError(e).message);
      setDeleteModal(p => ({ ...p, deleting: false }));
    }
  };

  const confirmUpdateStock = async () => {
    if (!stockModal.product) return;
    const qty = parseInt(stockModal.value || '0');
    if (isNaN(qty) || qty < 0) { toast.error('Invalid', 'Enter a valid number'); return; }
    setStockModal({ visible: false, product: null, value: '' });
    try {
      await productAPI.updateStock(stockModal.product._id, qty);
      toast.success('Updated', 'Stock updated');
      fetchProducts();
    } catch (e) {
      toast.error('Error', handleAPIError(e).message);
    }
  };

  const openMenu = (product: Product) => setMenuModal({ visible: true, product });

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchTab   = activeFilter === 'all' ? true : p.approvalStatus === activeFilter;
    return matchSearch && matchTab;
  });

  const counts = {
    all:      products.length,
    pending:  products.filter(p => p.approvalStatus === 'pending').length,
    approved: products.filter(p => p.approvalStatus === 'approved').length,
    rejected: products.filter(p => p.approvalStatus === 'rejected').length,
  };

  const renderCard = (product: Product) => {
    const outOfStock = product.stock === 0;
    const isPending  = product.approvalStatus === 'pending';
    const isRejected = product.approvalStatus === 'rejected';

    return (
      <TouchableOpacity
        key={product._id}
        style={[s.card, lift]}
        activeOpacity={0.9}
        onLongPress={() => openMenu(product)}
        onPress={() => navigation.navigate('VendorProductDetail', { productId: product._id })}
      >
        {/* Image */}
        <View style={s.imgWrap}>
          {product.images?.[0] ? (
            <Image source={{ uri: product.images[0] }} style={s.img} resizeMode="cover" />
          ) : (
            <View style={[s.img, s.imgPlaceholder]}>
              <Ionicons name="image-outline" size={28} color={T3} />
            </View>
          )}

          {/* Status badge on image */}
          {outOfStock ? (
            <View style={[s.badge, s.badgeDark]}>
              <View style={[s.badgeDot, { backgroundColor: '#fff' }]} />
              <Text style={[s.badgeTxt, { color: '#fff' }]}>Out Of Stock</Text>
            </View>
          ) : isPending ? (
            <View style={[s.badge, s.badgeOrange]}>
              <View style={[s.badgeDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[s.badgeTxt, { color: '#92400E' }]}>Pending</Text>
            </View>
          ) : isRejected ? (
            <View style={[s.badge, s.badgeRed]}>
              <View style={[s.badgeDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[s.badgeTxt, { color: '#991B1B' }]}>Rejected</Text>
            </View>
          ) : (
            <View style={[s.badge, s.badgeGreen]}>
              <View style={[s.badgeDot, { backgroundColor: '#22C55E' }]} />
              <Text style={[s.badgeTxt, { color: '#15803D' }]}>Approved</Text>
            </View>
          )}

          {/* Menu */}
          <TouchableOpacity
            style={s.menuBtn}
            onPress={() => openMenu(product)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="ellipsis-vertical" size={14} color={T2} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={s.cardBody}>
          <Text style={s.cardName} numberOfLines={2}>{product.name}</Text>
          <Text style={s.cardCat} numberOfLines={1}>{product.category?.name || '—'}</Text>

          <View style={s.cardFooter}>
            <Text style={s.cardPrice}>₦{(product.finalPrice || product.price).toLocaleString()}</Text>
            {isPending ? (
              <View style={s.holdBadge}>
                <Text style={s.holdTxt}>Hold</Text>
              </View>
            ) : outOfStock ? null : (
              <View style={s.stockBadge}>
                <Text style={s.stockTxt}>{product.stock} Left</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>My Products</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddProduct')}
          style={s.addBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={15} color={PINK} />
          <Text style={s.addBtnTxt}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={17} color={T3} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search Product"
          placeholderTextColor={T3}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color={T3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsContent}
      >
        {FILTERS.map(f => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[s.tabBtn, active && s.tabBtnOn]}
              activeOpacity={0.8}
            >
              <Text style={[s.tabTxt, active && s.tabTxtOn]}>
                {f.label} {counts[f.key] > 0 ? `(${counts[f.key]})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PINK} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.gridContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />
          }
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="cube-outline" size={36} color={PINK} />
              </View>
              <Text style={s.emptyTitle}>
                {products.length === 0 ? 'No Products Yet' : 'No Results'}
              </Text>
              <Text style={s.emptyTxt}>
                {products.length === 0
                  ? 'Add your first product to start selling'
                  : `No ${activeFilter === 'all' ? '' : activeFilter} products found`}
              </Text>
              {products.length === 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddProduct')}
                  style={s.emptyAddBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={16} color="#fff" />
                  <Text style={s.emptyAddTxt}>Add First Product</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={s.grid}>
              {filtered.map(renderCard)}
            </View>
          )}
        </ScrollView>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        visible={deleteModal.visible}
        title="Delete Product"
        message="This action cannot be undone. The product will be permanently removed."
        icon="trash-outline"
        iconColor="#EF4444"
        confirmText="Delete"
        confirmColor="#EF4444"
        loading={deleteModal.deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleteModal.deleting) setDeleteModal({ visible: false, productId: '', deleting: false });
        }}
      />

      {/* Stock Modal */}
      <Modal
        visible={stockModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setStockModal({ visible: false, product: null, value: '' })}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setStockModal({ visible: false, product: null, value: '' })}
            style={s.modalOverlay}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.stockSheet}>
              <Text style={s.stockTitle}>Update Stock</Text>
              <Text style={s.stockCurrent}>Current: {stockModal.product?.stock ?? 0}</Text>
              <TextInput
                style={s.stockInput}
                placeholder="Enter new quantity"
                placeholderTextColor={T3}
                value={stockModal.value}
                onChangeText={v => setStockModal(p => ({ ...p, value: v }))}
                keyboardType="number-pad"
                autoFocus
              />
              <View style={s.stockBtns}>
                <TouchableOpacity
                  onPress={() => setStockModal({ visible: false, product: null, value: '' })}
                  style={s.stockCancel}
                >
                  <Text style={s.stockCancelTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmUpdateStock} style={s.stockConfirm}>
                  <Text style={s.stockConfirmTxt}>Update</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={menuModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuModal({ visible: false, product: null })}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMenuModal({ visible: false, product: null })}
          style={s.menuOverlay}
        >
          <View style={[s.menuSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.menuHandle} />
            <Text style={s.menuProductName} numberOfLines={1}>
              {menuModal.product?.name}
            </Text>
            {[
              {
                label: 'Edit Product', icon: 'pencil' as const, color: T1,
                onPress: () => {
                  setMenuModal({ visible: false, product: null });
                  navigation.navigate('EditProduct', { productId: menuModal.product!._id });
                },
              },
              {
                label: 'Update Stock', icon: 'cube-outline' as const, color: T1,
                onPress: () => {
                  const p = menuModal.product!;
                  setMenuModal({ visible: false, product: null });
                  setStockModal({ visible: true, product: p, value: p.stock.toString() });
                },
              },
              {
                label: 'Delete Product', icon: 'trash-outline' as const, color: '#EF4444',
                onPress: () => {
                  const id = menuModal.product!._id;
                  setMenuModal({ visible: false, product: null });
                  setDeleteModal({ visible: true, productId: id, deleting: false });
                },
              },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                <View style={[s.menuItemIcon, { backgroundColor: item.color === '#EF4444' ? '#FEE2E2' : '#F3F4F6' }]}>
                  <Ionicons name={item.icon} size={17} color={item.color} />
                </View>
                <Text style={[s.menuItemTxt, { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const CARD_W = '48%';

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: T1, letterSpacing: -0.4 },
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

  tabsScroll:   { flexGrow: 0, marginBottom: 8 },
  tabsContent:  { paddingHorizontal: 16, gap: 8 },
  tabBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: CARD, borderWidth: 1, borderColor: '#F0E0E8',
  },
  tabBtnOn:  { backgroundColor: PINK, borderColor: PINK },
  tabTxt:    { fontSize: 13, fontWeight: '600', color: T2 },
  tabTxtOn:  { color: '#fff', fontWeight: '700' },

  gridContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },

  card: {
    width: CARD_W,
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imgWrap: { width: '100%', position: 'relative' },
  img: { width: '100%', height: 148 },
  imgPlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },

  badge: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeGreen:  { backgroundColor: 'rgba(220,252,231,0.95)' },
  badgeOrange: { backgroundColor: 'rgba(254,243,199,0.95)' },
  badgeRed:    { backgroundColor: 'rgba(254,226,226,0.95)' },
  badgeDark:   { backgroundColor: 'rgba(31,41,55,0.88)' },
  badgeDot:    { width: 6, height: 6, borderRadius: 3 },
  badgeTxt:    { fontSize: 11, fontWeight: '700' },

  menuBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },

  cardBody:   { padding: 10 },
  cardName:   { fontSize: 13, fontWeight: '700', color: T1, marginBottom: 2, lineHeight: 18 },
  cardCat:    { fontSize: 11, color: T3, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice:  { fontSize: 15, fontWeight: '800', color: PINK, letterSpacing: -0.3 },

  stockBadge: {
    backgroundColor: '#DCFCE7', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  stockTxt:  { fontSize: 11, fontWeight: '700', color: '#15803D' },
  holdBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  holdTxt:   { fontSize: 11, fontWeight: '700', color: '#92400E' },

  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyIcon:   {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:  { fontSize: 18, fontWeight: '800', color: T1, marginBottom: 6, letterSpacing: -0.3 },
  emptyTxt:    { fontSize: 13, color: T2, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: PINK, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14,
  },
  emptyAddTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  stockSheet: {
    width: '100%', backgroundColor: CARD, borderRadius: 20, padding: 24,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  stockTitle:      { fontSize: 18, fontWeight: '800', color: T1, marginBottom: 4 },
  stockCurrent:    { fontSize: 13, color: T2, marginBottom: 16 },
  stockInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: T1, backgroundColor: '#FAFAFA', marginBottom: 18,
  },
  stockBtns:       { flexDirection: 'row', gap: 10 },
  stockCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  stockCancelTxt:  { fontSize: 14, fontWeight: '700', color: T2 },
  stockConfirm:    { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: PINK },
  stockConfirmTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  menuSheet: {
    backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 12,
  },
  menuHandle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  menuProductName: { fontSize: 14, fontWeight: '700', color: T1, marginBottom: 16 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  menuItemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuItemTxt:  { fontSize: 15, fontWeight: '600' },
});

export default VendorProductManagementScreen;
