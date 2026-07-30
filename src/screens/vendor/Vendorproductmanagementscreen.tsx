import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, RefreshControl, Platform, TextInput,
  Dimensions, StatusBar, ActionSheetIOS, Modal, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, handleAPIError } from '@/api/api';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/Toast';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  primary: '#E04079', primaryDark: '#B5315F', primaryLight: '#F08BAC',
  primarySoft: '#FEF0F5', primaryMuted: '#FCDCE9',
  green: '#10B981', greenSoft: '#D1FAE5',
  gold: '#F59E0B', goldSoft: '#FEF3C7',
  orange: '#F97316', orangeSoft: '#FFEDD5',
  red: '#EF4444', redSoft: '#FEE2E2',
  surface: '#FFFFFF', surfaceAlt: '#F9FAFB',
  border: '#F3F4F6', borderStrong: '#E5E7EB',
  textPrimary: '#111827', textSecondary: '#6B7280', textMuted: '#9CA3AF',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

const shadow = (color = '#000', opacity = 0.07, radius = 8, y = 2) =>
  Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: radius },
    android: { elevation: Math.round(radius / 2) },
  });

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  approved: { bg: BRAND.greenSoft, text: '#065F46', border: '#A7F3D0', icon: 'checkmark-circle' as const, iconColor: BRAND.green },
  pending:  { bg: BRAND.goldSoft,  text: '#92400E', border: '#FDE68A', icon: 'time'             as const, iconColor: BRAND.gold  },
  rejected: { bg: BRAND.redSoft,   text: '#991B1B', border: '#FECACA', icon: 'close-circle'     as const, iconColor: BRAND.red   },
} as const;

const getStatusCfg = (s: string) => STATUS_CFG[s as keyof typeof STATUS_CFG] ?? { bg: BRAND.surfaceAlt, text: BRAND.textSecondary, border: BRAND.border, icon: 'help-circle' as const, iconColor: BRAND.textMuted };

const formatPrice = (n: number) => `₦${n.toLocaleString()}`;

// ─── Main Screen ──────────────────────────────────────────────────────────────
const VendorProductManagementScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [products, setProducts]               = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [activeFilter, setActiveFilter]       = useState<FilterStatus>('all');
  const [deleteModal, setDeleteModal]         = useState({ visible: false, productId: '' });
  const [stockModal, setStockModal]           = useState({ visible: false, product: null as Product | null, value: '' });
  const [menuModal, setMenuModal]             = useState({ visible: false, product: null as Product | null });

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getMyProducts();
      if (response.success) {
        const list: Product[] =
          response.data.products ??
          (Array.isArray(response.data) ? response.data : null) ??
          response.data?.data?.products ??
          (Array.isArray(response.data?.data) ? response.data.data : []);
        setProducts(list);
      } else {
        toast.error('Error', 'Failed to fetch products');
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchProducts(); }, []));

  React.useEffect(() => {
    let f = products;
    if (activeFilter !== 'all') f = f.filter((p) => p.approvalStatus === activeFilter);
    if (searchQuery) f = f.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredProducts(f);
  }, [products, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts().finally(() => setRefreshing(false));
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleEditProduct   = (id: string) => navigation.navigate('EditProduct', { productId: id });

  const handleDeleteProduct = (id: string) => {
    setDeleteModal({ visible: true, productId: id });
  };

  const confirmDeleteProduct = async () => {
    const id = deleteModal.productId;
    setDeleteModal({ visible: false, productId: '' });
    try { await productAPI.deleteProduct(id); toast.success('Deleted', 'Product removed'); fetchProducts(); }
    catch (e) { toast.error('Error', handleAPIError(e).message); }
  };

  const handleUpdateStock = (product: Product) => {
    setStockModal({ visible: true, product, value: product.stock.toString() });
  };

  const confirmUpdateStock = async () => {
    if (!stockModal.product) return;
    const qty = parseInt(stockModal.value || '0');
    if (isNaN(qty) || qty < 0) { toast.error('Invalid', 'Enter a valid number'); return; }
    setStockModal({ visible: false, product: null, value: '' });
    try { await productAPI.updateStock(stockModal.product._id, qty); toast.success('Updated', 'Stock updated'); fetchProducts(); }
    catch (e) { toast.error('Error', handleAPIError(e).message); }
  };

  const openProductMenu = (product: Product) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Edit Product', 'Update Stock', 'Delete Product', 'Cancel'], destructiveButtonIndex: 2, cancelButtonIndex: 3 },
        (i) => { if (i === 0) handleEditProduct(product._id); else if (i === 1) handleUpdateStock(product); else if (i === 2) handleDeleteProduct(product._id); }
      );
    } else {
      setMenuModal({ visible: true, product });
    }
  };

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = {
    all:      products.length,
    approved: products.filter((p) => p.approvalStatus === 'approved').length,
    pending:  products.filter((p) => p.approvalStatus === 'pending').length,
    rejected: products.filter((p) => p.approvalStatus === 'rejected').length,
  };

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'approved', label: 'Approved' },
    { key: 'pending',  label: 'Pending'  },
    { key: 'rejected', label: 'Rejected' },
  ];

  // ── Product card ──────────────────────────────────────────────────────────
  const renderProductCard = (product: Product) => {
    const cfg = getStatusCfg(product.approvalStatus);
    const stockColor = product.stock === 0 ? BRAND.red : product.stock < 10 ? BRAND.orange : BRAND.green;
    const stockBg    = product.stock === 0 ? BRAND.redSoft : product.stock < 10 ? BRAND.orangeSoft : BRAND.greenSoft;

    return (
      <View key={product._id}
        style={[{ width: CARD_WIDTH, backgroundColor: BRAND.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: BRAND.border }, shadow()]}
      >
        {/* Image */}
        <View style={{ position: 'relative' }}>
          {product.images?.length > 0 ? (
            <Image source={{ uri: product.images[0] }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
          ) : (
            <View style={{ width: '100%', height: 140, backgroundColor: BRAND.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={32} color={BRAND.textMuted} />
            </View>
          )}

          {/* Status badge */}
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: cfg.bg, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: cfg.border }}>
            <Ionicons name={cfg.icon} size={10} color={cfg.iconColor} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: cfg.text, textTransform: 'capitalize' }}>{product.approvalStatus}</Text>
          </View>

          {/* Menu button */}
          <TouchableOpacity
            onPress={() => openProductMenu(product)}
            activeOpacity={0.8}
            style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...shadow('#000', 0.12, 4, 2) }}
          >
            <Ionicons name="ellipsis-vertical" size={14} color={BRAND.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={{ padding: 11 }}>
          <Text style={{ fontSize: 10, color: BRAND.textMuted, fontWeight: '500', marginBottom: 3 }} numberOfLines={1}>
            {product.category?.name || 'No Category'}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND.textPrimary, marginBottom: 8, lineHeight: 18 }} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Price + stock */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: BRAND.primary, letterSpacing: -0.3 }}>
              {formatPrice(product.finalPrice || product.price)}
            </Text>
            <TouchableOpacity onPress={() => handleUpdateStock(product)} activeOpacity={0.8}
              style={{ backgroundColor: stockBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: stockColor }}>{product.stock}</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          {(product.totalOrders !== undefined || (product.totalRatings && product.totalRatings > 0)) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: BRAND.border }}>
              {product.totalOrders !== undefined && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="cart-outline" size={12} color={BRAND.textMuted} />
                  <Text style={{ fontSize: 11, color: BRAND.textSecondary, fontWeight: '600' }}>{product.totalOrders}</Text>
                </View>
              )}
              {product.totalRatings && product.totalRatings > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="star" size={11} color={BRAND.gold} />
                  <Text style={{ fontSize: 11, color: BRAND.textSecondary, fontWeight: '600' }}>{product.rating?.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Rejection reason */}
        {product.approvalStatus === 'rejected' && product.rejectionReason && (
          <View style={{ backgroundColor: BRAND.redSoft, paddingHorizontal: 11, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#FECACA' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <Ionicons name="alert-circle" size={13} color={BRAND.red} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#991B1B', marginBottom: 2 }}>Rejection reason</Text>
                <Text style={{ fontSize: 11, color: '#B91C1C', lineHeight: 15 }} numberOfLines={2}>{product.rejectionReason}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.surfaceAlt }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={{ color: BRAND.textMuted, fontSize: 14, marginTop: 12, fontWeight: '500' }}>Loading products…</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}
          style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: BRAND.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.border, marginRight: 12 }}>
          <Ionicons name="arrow-back" size={20} color={BRAND.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, letterSpacing: -0.4 }}>My Products</Text>
          <Text style={{ fontSize: 12, color: BRAND.textMuted, fontWeight: '500', marginTop: 1 }}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </Text>
        </View>

        {/* Add product shortcut */}
        <TouchableOpacity onPress={() => navigation.navigate('AddProduct')} activeOpacity={0.85}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, ...shadow(BRAND.primary, 0.3, 8, 3) }}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── SEARCH + FILTER BAR (sticky) ─────────────────────────────────── */}
      <View style={{ backgroundColor: BRAND.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: BRAND.border, marginBottom: 10 }}>
          <Ionicons name="search" size={16} color={BRAND.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: BRAND.textPrimary, paddingVertical: 0 }}
            placeholder="Search products…"
            placeholderTextColor={BRAND.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={17} color={BRAND.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            const cnt = counts[f.key];
            return (
              <TouchableOpacity key={f.key} onPress={() => setActiveFilter(f.key)} activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: active ? BRAND.primary : BRAND.surfaceAlt,
                  borderWidth: 1.5, borderColor: active ? BRAND.primary : BRAND.border,
                  ...(active ? shadow(BRAND.primary, 0.25, 8, 3) : {}),
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : BRAND.textSecondary }}>{f.label}</Text>
                <View style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : BRAND.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: active ? '#fff' : BRAND.textMuted }}>{cnt}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}
      >
        {filteredProducts.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {filteredProducts.map(renderProductCard)}
          </View>
        ) : (
          /* Empty state */
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
            <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: BRAND.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Ionicons name="cube-outline" size={42} color={BRAND.primary} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 8, letterSpacing: -0.3 }}>No Products Yet</Text>
            <Text style={{ fontSize: 13, color: BRAND.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              {activeFilter !== 'all'
                ? `No ${activeFilter} products found`
                : 'Add your first product to start selling on the marketplace'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddProduct')} activeOpacity={0.85}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 22, ...shadow(BRAND.primary, 0.35, 10, 4) }}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Add First Product</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => navigation.navigate('AddProduct')}
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

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      <ConfirmationModal
        visible={deleteModal.visible}
        title="Delete Product"
        message="This action cannot be undone."
        icon="trash-outline"
        iconColor={BRAND.red}
        confirmText="Delete"
        confirmColor={BRAND.red}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setDeleteModal({ visible: false, productId: '' })}
      />

      {/* ── Stock Update Modal ────────────────────────────────────────── */}
      <Modal visible={stockModal.visible} transparent animationType="fade" onRequestClose={() => setStockModal({ visible: false, product: null, value: '' })}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setStockModal({ visible: false, product: null, value: '' })}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}
              style={[{ width: '100%', backgroundColor: BRAND.surface, borderRadius: 24, padding: 24 }, shadow('#000', 0.2, 24, 10)]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: BRAND.textPrimary, marginBottom: 8 }}>Update Stock</Text>
              <Text style={{ fontSize: 13, color: BRAND.textSecondary, marginBottom: 16 }}>Current: {stockModal.product?.stock}</Text>
              <TextInput
                style={{
                  backgroundColor: BRAND.surfaceAlt, borderRadius: 14, padding: 14,
                  fontSize: 16, color: BRAND.textPrimary, borderWidth: 1.5, borderColor: BRAND.border, marginBottom: 18,
                }}
                placeholder="Enter new quantity"
                placeholderTextColor={BRAND.textMuted}
                value={stockModal.value}
                onChangeText={(t) => setStockModal((prev) => ({ ...prev, value: t }))}
                keyboardType="number-pad"
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setStockModal({ visible: false, product: null, value: '' })} activeOpacity={0.8}
                  style={{ flex: 1, backgroundColor: BRAND.surfaceAlt, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: BRAND.borderStrong }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: BRAND.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmUpdateStock} activeOpacity={0.85}
                  style={{ flex: 1, backgroundColor: BRAND.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Update</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Android Product Menu Modal ────────────────────────────────── */}
      <Modal visible={menuModal.visible} transparent animationType="fade" onRequestClose={() => setMenuModal({ visible: false, product: null })}>
        <TouchableOpacity activeOpacity={1} onPress={() => setMenuModal({ visible: false, product: null })}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 32 }}>
          <View style={[{ backgroundColor: BRAND.surface, borderRadius: 20, overflow: 'hidden' }, shadow('#000', 0.2, 24, 10)]}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: BRAND.textPrimary, padding: 16, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>Product Options</Text>
            {[
              { label: 'Edit Product', icon: 'create-outline' as const, color: BRAND.textPrimary, onPress: () => { setMenuModal({ visible: false, product: null }); if (menuModal.product) handleEditProduct(menuModal.product._id); } },
              { label: 'Update Stock', icon: 'cube-outline' as const, color: BRAND.textPrimary, onPress: () => { setMenuModal({ visible: false, product: null }); if (menuModal.product) handleUpdateStock(menuModal.product); } },
              { label: 'Delete Product', icon: 'trash-outline' as const, color: BRAND.red, onPress: () => { setMenuModal({ visible: false, product: null }); if (menuModal.product) handleDeleteProduct(menuModal.product._id); } },
            ].map((item, i) => (
              <TouchableOpacity key={i} onPress={item.onPress} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: BRAND.border }}>
                <Ionicons name={item.icon} size={20} color={item.color} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: item.color }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setMenuModal({ visible: false, product: null })} activeOpacity={0.7}
              style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: BRAND.textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default VendorProductManagementScreen;
