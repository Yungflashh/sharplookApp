import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const P = '#E91E63';
const P_LIGHT = '#FEE2F0';

const TYPE_META: Record<string, { bg: string; color: string; label: string }> = {
  home_service: { bg: '#EFF6FF', color: '#2563EB', label: 'Home Service' },
  in_shop:      { bg: '#F0FDF4', color: '#16A34A', label: 'In-Shop' },
  both:         { bg: '#F5F3FF', color: '#7C3AED', label: 'Home & Shop' },
};

// Gradient pairs for placeholder — based on first letter of business name
const GRAD_PAIRS: [string, string][] = [
  ['#F9A8D4', '#E91E63'],
  ['#A5B4FC', '#6366F1'],
  ['#6EE7B7', '#059669'],
  ['#FCD34D', '#D97706'],
  ['#7DD3FC', '#0284C7'],
];

const pickGradient = (name: string): [string, string] =>
  GRAD_PAIRS[(name.charCodeAt(0) || 0) % GRAD_PAIRS.length];

export interface VendorCardProps {
  vendor: {
    id: string;
    businessName: string;
    image?: string;
    service: string;
    rating: number;
    reviews: number;
    isVerified?: boolean;
    vendorType?: string;
  };
  onPress: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  width?: number;
  showFavorite?: boolean;
}

const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  onPress,
  onFavoritePress,
  isFavorite = false,
  width = 180,
}) => {
  const typeMeta = TYPE_META[vendor.vendorType || ''] ?? {
    bg: P_LIGHT, color: P, label: vendor.service || 'Beauty',
  };
  const initials = (vendor.businessName || 'VD').slice(0, 2).toUpperCase();
  const rating = Math.min(5, Math.max(0, vendor.rating || 0));
  const gradColors = pickGradient(vendor.businessName || 'V');
  const serviceLabel = vendor.service || typeMeta.label;

  return (
    <TouchableOpacity style={[s.card, { width }]} onPress={onPress} activeOpacity={0.88}>

      {/* ── Image / Gradient Placeholder ── */}
      <View style={s.imgWrap}>
        {vendor.image ? (
          <Image source={{ uri: vendor.image }} style={s.img} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={gradColors}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={s.initialsWrap}>
              <View style={s.initialsCircle}>
                <Text style={s.initialsText}>{initials}</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Scrim at bottom of image for visual depth */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.38)']}
          style={s.scrim}
        />

        {/* Verified badge — top-left */}
        {vendor.isVerified && (
          <View style={s.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={11} color="#fff" />
            <Text style={s.verifiedTxt}>VERIFIED</Text>
          </View>
        )}

        {/* Heart — top-right, always shown */}
        <TouchableOpacity
          style={s.heartBtn}
          onPress={onFavoritePress}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={16}
            color={isFavorite ? P : '#444'}
          />
        </TouchableOpacity>

        {/* Vendor type chip — bottom-left, sitting on the scrim */}
        <View style={[s.typePillImg, { backgroundColor: typeMeta.bg }]}>
          <Text style={[s.typePillTxt, { color: typeMeta.color }]} numberOfLines={1}>
            {serviceLabel}
          </Text>
        </View>
      </View>

      {/* ── Info section ── */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>{vendor.businessName}</Text>

        <View style={s.ratingRow}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={s.ratingNum}> {rating.toFixed(1)}</Text>
          <Text style={s.ratingDot}> · </Text>
          <Text style={s.ratingCount}>
            {vendor.reviews} review{vendor.reviews !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 7,
  },

  // Image
  imgWrap: { width: '100%', height: 200, position: 'relative', backgroundColor: '#F0F0F0' },
  img: { width: '100%', height: '100%' },

  // Placeholder (fills same space as img via absoluteFillObject)
  initialsWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initialsCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.55)',
  },
  initialsText: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  // Gradient scrim at base of image
  scrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 72,
  },

  // Verified badge
  verifiedBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  verifiedTxt: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },

  // Heart button
  heartBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },

  // Service type pill overlaid on scrim
  typePillImg: {
    position: 'absolute', bottom: 10, left: 10,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  typePillTxt: { fontSize: 10, fontWeight: '700' },

  // Info
  info: { paddingHorizontal: 13, paddingVertical: 11, gap: 5 },
  name: { fontSize: 14, fontWeight: '800', color: '#111', letterSpacing: -0.3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingNum: { fontSize: 12, fontWeight: '700', color: '#374151' },
  ratingDot: { fontSize: 12, color: '#D1D5DB' },
  ratingCount: { fontSize: 11, color: '#9CA3AF' },
});

export default VendorCard;
