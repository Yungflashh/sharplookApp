import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { categoriesAPI, vendorAPI, handleAPIError } from '@/api/api';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 46) / 2;

type Nav = NativeStackNavigationProp<RootStackParamList, 'AllServices'>;

interface Category {
  id: string;
  name: string;
  label: string;
  image?: string;
  vendorCount?: number;
}

// ── Fallback local images (banner assets already in the project) ──
const FALLBACK_IMGS = [
  require('../../../assets/banner1.png'),
  require('../../../assets/banner2.png'),
  require('../../../assets/banner3.png'),
];

function getFallbackImage(name: string) {
  const n = name.toLowerCase();
  if (n.includes('hair') || n.includes('lash') || n.includes('brow')) return FALLBACK_IMGS[0];
  if (n.includes('nail') || n.includes('makeup') || n.includes('make')) return FALLBACK_IMGS[1];
  if (n.includes('skin') || n.includes('spa') || n.includes('massage') || n.includes('body') || n.includes('wax'))
    return FALLBACK_IMGS[2];
  return FALLBACK_IMGS[(name.charCodeAt(0) || 0) % 3];
}

function getIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('hair')) return 'hair-dryer';
  if (n.includes('nail')) return 'hand-heart-outline';
  if (n.includes('makeup') || n.includes('make')) return 'lipstick';
  if (n.includes('skin')) return 'face-woman-shimmer-outline';
  if (n.includes('spa') || n.includes('massage')) return 'flower-outline';
  if (n.includes('lash') || n.includes('eye')) return 'eye-outline';
  if (n.includes('brow')) return 'eyebrow';
  if (n.includes('wax') || n.includes('body')) return 'human';
  return 'scissors-cutting';
}

const AllServicesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [filtered, setFiltered] = useState<Category[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await categoriesAPI.getAll();
      const cats: Category[] = (res.data?.data || res.data || []).map((c: any) => ({
        id: c._id,
        name: c.name,
        label: c.name,
        image: c.image || c.imageUrl || undefined,
        vendorCount: c.vendorCount,
      }));
      setCategories(cats);
      setFiltered(cats);

      // Fetch vendor counts in parallel (lightweight: limit 1, read total from pagination)
      fetchVendorCounts(cats);
    } catch (error) {
      const apiErr = handleAPIError(error);
      console.error('AllServicesScreen:', apiErr);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVendorCounts = async (cats: Category[]) => {
    try {
      const results = await Promise.all(
        cats.map(cat =>
          vendorAPI.getAllVendors({ category: cat.id, limit: 1 })
            .then(res => {
              const total =
                res?.meta?.pagination?.totalItems ??
                res?.meta?.pagination?.total ??
                res?.data?.pagination?.totalItems ??
                res?.data?.total ??
                res?.total ??
                0;
              return { id: cat.id, count: Number(total) };
            })
            .catch(() => ({ id: cat.id, count: 0 }))
        )
      );

      setCategories(prev =>
        prev.map(cat => {
          const found = results.find(r => r.id === cat.id);
          return found ? { ...cat, vendorCount: found.count } : cat;
        })
      );
    } catch {
      // counts are non-critical — silently fail
    }
  };

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    if (!searchText.trim()) {
      setFiltered(categories);
    } else {
      const q = searchText.toLowerCase();
      setFiltered(categories.filter(c => c.name.toLowerCase().includes(q)));
    }
  }, [searchText, categories]);

  const renderItem = ({ item }: { item: Category }) => {
    const iconName = getIcon(item.name);
    const fallback = getFallbackImage(item.name);

    return (
      <View style={s.cell}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={s.card}
          onPress={() => navigation.navigate('AllVendors', {
            categoryId: item.id,
            categoryName: item.name,
          })}
        >
          {/* Background: API image → local fallback */}
          <Image
            source={item.image ? { uri: item.image } : fallback}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />

          {/* Scrim for legibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.52)']}
            style={s.scrim}
          />

          {/* Icon badge bottom-left */}
          <View style={s.iconBadge}>
            <MaterialCommunityIcons name={iconName as any} size={15} color="#E91E63" />
          </View>
        </TouchableOpacity>

        {/* Text below card */}
        <Text style={s.catName} numberOfLines={1}>{item.label}</Text>
        <Text style={s.vendorCount}>
          {item.vendorCount != null
            ? `${item.vendorCount} Vendor${item.vendorCount !== 1 ? 's' : ''}`
            : '—'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#E91E63" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>All Categories</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={17} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={s.sectionLabel}>Browse by category</Text>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color="#E91E63" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="search-outline" size={48} color="#D1D5DB" />
              <Text style={s.emptyTxt}>No categories found</Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FCE4EC', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontWeight: '800', color: '#1A1A1A',
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 10, marginBottom: 4,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A1A', padding: 0 },
  sectionLabel: {
    fontSize: 15, fontWeight: '800', color: '#1A1A1A',
    marginHorizontal: 16, marginTop: 16, marginBottom: 14,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { justifyContent: 'space-between', marginBottom: 22 },

  cell: { width: CARD_W },
  card: {
    width: CARD_W, height: CARD_W,
    borderRadius: 20, overflow: 'hidden',
    justifyContent: 'flex-end', alignItems: 'flex-start', padding: 10,
  },
  scrim: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 64,
  },
  iconBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center', justifyContent: 'center',
  },
  catName: {
    fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginTop: 10,
  },
  vendorCount: {
    fontSize: 12, fontWeight: '600', color: '#E91E63', marginTop: 3,
  },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyTxt: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
});

export default AllServicesScreen;
