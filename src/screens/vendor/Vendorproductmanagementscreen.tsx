import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  ActivityIndicator, RefreshControl, Platform, TextInput,
  Dimensions, StatusBar, KeyboardAvoidingView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { productAPI, handleAPIError } from '@/api/api';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/Toast';

const PRIMARY   = '#E04079';
const BG        = '#FCE4EC';
const WHITE     = '#FFFFFF';
const TEXT_DARK = '#1A1A2E';
const TEXT_GRAY = '#6B7280';
const TEXT_MUTED = '#9CA3AF';
const BORDER    = '#F3F4F6';

const { width: W } = Dimensions.get('window');
const CARD_WIDTH = (W - 48) / 2;

const shadow = (opacity = 0.07, radius = 8, y = 2) =>
  Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: radius },
    android: { elevation: Math.round(radius / 2) },
  });

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

const STATUS_CFG = {
  approved: { dot: '#10B981', text: '#065F46', bg: '#D1FAE5', label: 'Approved' },
  pending:  { dot: '#F59E0B', text: '#92400E', bg: '#FEF3C7', label: 'Pending'  },
  rejected: { dot: '#EF4444', text: '#991B1B', bg: '#FEE2E2', label: 'Rejected' },
} as const;

const getStatusCfg = (s: string) =>
  STATUS_CFG[s as keyof typeof STATUS_CFG] ??
  { dot: TEXT_MUTED, text: TEXT_GRAY, bg: '#F3F4F6', label: s };

const formatPrice = (n: number) => `₦${n?.toLocaleString() ?? '0'}`;

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'pending',  label: 'Pending'  },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard: React.FC<{
  product: Product;
  onPress: () => void;
  onUpdateStock: (p: Product) => void;
}> = ({ product, onPress, onUpdateStock }) => {
  const cfg = getStatusCfg(product.approvalStatus);
  const isOutOfStock = product.approvalStatus === 'approved' && product.stock === 0;
  const stockColor = product.stock < 10 ? '#F97316' : '#10B981';
  const stockBg    = product.stock < 10 ? '#FFEDD5' : '#D1FAE5';

  const StockChip = () => {
    if (product.approvalStatus === 'rejected') return null;
    if (product.approvalStatus === 'pending') return (
      <View style={{ backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>Hold</Text>
      </View>
    );
    if (product.stock === 0) return null; // shown as image overlay
    return (
      <TouchableOpacity onPress={() => onUpdateStock(product)} activeOpacity={0.8}
        style={{ backgroundColor: stockBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: stockColor }}>{product.stock} Left</Text>
      </TouchableOpacity>
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[{
        width: CARD_WIDTH, backgroundColor: WHITE,
        borderRadius: 16, overflow: 'hidden',
      }, shadow()]}
    >
      {/* Image */}
      <View style={{ position: 'relative' }}>
        {product.images?.length > 0 ? (
          <Image source={{ uri: product.images[0] }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
        ) : (
          <View style={{ width: '100%', height: 140, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={32} color={TEXT_MUTED} />
          </View>
        )}

        {/* Approval badge — top left */}
        <View style={{
          position: 'absolute', top: 8, left: 8,
          backgroundColor: cfg.bg, borderRadius: 20,
          paddingHorizontal: 8, paddingVertical: 4,
          flexDirection: 'row', alignItems: 'center', gap: 4,
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.dot }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: cfg.text }}>{cfg.label}</Text>
        </View>

        {/* Out of stock overlay — center */}
        {isOutOfStock && (
          <View style={{
            position: 'absolute', bottom: 8, left: 0, right: 0,
            alignItems: 'center',
          }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Out Of Stock</Text>
            </View>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ padding: 10, gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT_DARK, lineHeight: 18 }} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={{ fontSize: 11, color: TEXT_GRAY, fontWeight: '500', marginBottom: 6 }} numberOfLines={1}>
          {product.category?.name || '—'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: PRIMARY }}>
            {formatPrice(product.finalPrice || product.price)}
          </Text>
          <StockChip />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const VendorProductManagementScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts]     = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [deleteModal, setDeleteModal]   = useState({ visible: false, productId: '' });
  const [stockModal, setStockModal]     = useState({ visible: false, product: null as Product | null, value: '' });

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts().finally(() => setRefreshing(false));
  }, []);

  const confirmDelete = async () => {
    const id = deleteModal.productId;
    setDeleteModal({ visible: false, productId: '' });
    try { await productAPI.deleteProduct(id); toast.success('Deleted', 'Product removed'); fetchProducts(); }
    catch (e) { toast.error('Error', handleAPIError(e).message); }
  };

  const confirmUpdateStock = async () => {
    if (!stockModal.product) return;
    const qty = parseInt(stockModal.value || '0');
    if (isNaN(qty) || qty < 0) { toast.error('Invalid', 'Enter a valid number'); return; }
    setStockModal({ visible: false, product: null, value: '' });
    try { await productAPI.updateStock(stockModal.product._id, qty); toast.success('Updated', 'Stock updated'); fetchProducts(); }
    catch (e) { toast.error('Error', handleAPIError(e).message); }
  };

  const filtered = products.filter((p) => {
    const matchFilter = activeFilter === 'all' || p.approvalStatus === activeFilter;
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: WHITE, flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, gap: 12,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={18} color={PRIMARY} />
        </TouchableOpacity>

        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT_DARK }}>My Products</Text>

        <TouchableOpacity onPress={() => navigation.navigate('AddProduct')} activeOpacity={0.85}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
          <Ionicons name="add" size={15} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* ── SEARCH ─────────────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: WHITE, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Ionicons name="search-outline" size={16} color={TEXT_MUTED} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: TEXT_DARK, paddingVertical: 0 }}
            placeholder="Search Product"
            placeholderTextColor={TEXT_MUTED}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── FILTER TABS ─────────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: WHITE, paddingBottom: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity key={f.key} onPress={() => setActiveFilter(f.key)} activeOpacity={0.8}
                style={{
                  paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: active ? PRIMARY : WHITE,
                  borderWidth: 1.5, borderColor: active ? PRIMARY : BORDER,
                }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : TEXT_GRAY }}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── PRODUCT GRID ────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
      >
        {filtered.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {filtered.map((p) => (
              <ProductCard
                key={p._id}
                product={p}
                onPress={() => navigation.navigate('ProductDetail', { productId: p._id })}
                onUpdateStock={(prod) => setStockModal({ visible: true, product: prod, value: prod.stock.toString() })}
              />
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="cube-outline" size={38} color={PRIMARY} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 6 }}>No Products</Text>
            <Text style={{ fontSize: 13, color: TEXT_GRAY, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              {activeFilter !== 'all' ? `No ${activeFilter} products found` : 'Add your first product to start selling'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddProduct')} activeOpacity={0.85}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 22 }}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Add Product</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── DELETE MODAL ────────────────────────────────────────────────────── */}
      <ConfirmationModal
        visible={deleteModal.visible}
        title="Delete Product"
        message="This action cannot be undone."
        icon="trash-outline"
        iconColor="#EF4444"
        confirmText="Delete"
        confirmColor="#EF4444"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ visible: false, productId: '' })}
      />

      {/* ── STOCK UPDATE MODAL ──────────────────────────────────────────────── */}
      <Modal visible={stockModal.visible} transparent animationType="fade"
        onRequestClose={() => setStockModal({ visible: false, product: null, value: '' })}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setStockModal({ visible: false, product: null, value: '' })}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}
              style={[{ width: '100%', backgroundColor: WHITE, borderRadius: 24, padding: 24 }, shadow(0.18, 24, 10)]}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT_DARK, marginBottom: 6 }}>Update Stock</Text>
              <Text style={{ fontSize: 13, color: TEXT_GRAY, marginBottom: 16 }}>Current: {stockModal.product?.stock}</Text>
              <TextInput
                style={{ backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, fontSize: 16, color: TEXT_DARK, borderWidth: 1.5, borderColor: BORDER, marginBottom: 18 }}
                placeholder="Enter new quantity"
                placeholderTextColor={TEXT_MUTED}
                value={stockModal.value}
                onChangeText={(t) => setStockModal((prev) => ({ ...prev, value: t }))}
                keyboardType="number-pad"
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => setStockModal({ visible: false, product: null, value: '' })} activeOpacity={0.8}
                  style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: BORDER }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT_GRAY }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmUpdateStock} activeOpacity={0.85}
                  style={{ flex: 1, backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Update</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default VendorProductManagementScreen;
