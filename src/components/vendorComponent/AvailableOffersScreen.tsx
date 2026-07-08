import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, TextInput, Modal, Platform, StatusBar, StyleSheet,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { offerAPI, handleAPIError } from '@/api/api';
import * as Location from 'expo-location';

const BG     = '#FFF5F9';
const CARD   = '#FFFFFF';
const PINK   = '#E04079';
const PRI_DK = '#B5315F';
const TEXT1  = '#1A1A2E';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';

interface Offer {
  _id: string;
  title: string;
  description: string;
  proposedPrice: number;
  status: string;
  serviceType?: 'home' | 'shop' | 'both';
  createdAt: string;
  expiresAt: string;
  category: { name: string };
  client: { firstName: string; lastName: string };
  location?: { city: string; state: string };
  flexibility: string;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const AvailableOffersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers,     setOffers]     = useState<Offer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [selected,   setSelected]   = useState<Offer | null>(null);
  const [form, setForm] = useState({ price: '', duration: '', message: '' });

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      let loc: any = {};
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, maxDistance: 50 };
      }
      const res = await offerAPI.getAvailableOffers({ ...loc, page: 1, limit: 50 });
      if (res.success) setOffers(res.data.offers || res.data || []);
    } catch (error) {
      handleAPIError(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchOffers(); }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers().finally(() => setRefreshing(false));
  }, []);

  const openModal = (offer: Offer) => {
    setSelected(offer);
    setForm({ price: offer.proposedPrice.toString(), duration: '', message: '' });
    setShowModal(true);
  };

  const submitResponse = async () => {
    if (!selected) return;
    const price = parseFloat(form.price);
    if (!form.price || price <= 0) { toast.error('Error', 'Please enter a valid price'); return; }
    try {
      setSubmitting(true);
      const res = await offerAPI.respondToOffer(selected._id, {
        proposedPrice: price,
        message: form.message || undefined,
        estimatedDuration: form.duration ? parseInt(form.duration) : undefined,
      });
      if (res.success) {
        toast.success('Success', 'Your proposal has been submitted!');
        setShowModal(false);
        fetchOffers();
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.flex, { backgroundColor: BG, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  return (
    <View style={[s.flex, { backgroundColor: BG, paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={PINK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Available Offers</Text>
        <TouchableOpacity onPress={() => navigation.navigate('VendorMyResponses')} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="chatbox-ellipses-outline" size={20} color={PINK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
      >
        {/* Stats banner */}
        <View style={s.banner}>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerLabel}>Open near you</Text>
            <Text style={s.bannerVal}>{offers.length} {offers.length === 1 ? 'offer' : 'offers'} available</Text>
          </View>
          <View style={s.bannerIcon}>
            <Ionicons name="pricetag" size={28} color="rgba(255,255,255,0.9)" />
          </View>
        </View>

        {/* Empty */}
        {offers.length === 0 ? (
          <View style={s.empty}>
            <LinearGradient colors={[PINK, PRI_DK]} style={s.emptyIcon}>
              <Ionicons name="pricetag" size={38} color="#fff" />
            </LinearGradient>
            <Text style={s.emptyTitle}>No Offers Available</Text>
            <Text style={s.emptyTxt}>Check back later for new requests from clients near you</Text>
          </View>
        ) : (
          offers.map(offer => (
            <TouchableOpacity
              key={offer._id}
              style={s.card}
              onPress={() => openModal(offer)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[PINK, PRI_DK]} style={s.cardIcon}>
                <Text style={s.cardIconText}>
                  {(offer.client.firstName).charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>

              <View style={s.cardMid}>
                <Text style={s.cardTitle} numberOfLines={1}>{offer.title}</Text>
                <Text style={s.cardSub} numberOfLines={1}>
                  {offer.client.firstName} {offer.client.lastName} · {offer.category.name}
                </Text>
                <Text style={s.cardMeta}>
                  {offer.location ? `${offer.location.city} · ` : ''}Exp {formatDate(offer.expiresAt)}
                </Text>
              </View>

              <View style={s.cardRight}>
                <Text style={s.cardPrice}>₦{offer.proposedPrice.toLocaleString()}</Text>
                <Text style={s.cardPriceSub}>budget</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Respond modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.sheetHeader}>
              <View style={s.flex}>
                <Text style={s.sheetTitle}>Submit Proposal</Text>
                {selected && <Text style={s.sheetSub} numberOfLines={1}>{selected.title}</Text>}
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} style={s.sheetClose} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={TEXT2} />
              </TouchableOpacity>
            </View>

            {selected && (
              <View style={s.budgetNote}>
                <Ionicons name="information-circle-outline" size={16} color={PINK} />
                <Text style={s.budgetNoteTxt}>Client budget: <Text style={{ fontWeight: '800', color: PINK }}>₦{selected.proposedPrice.toLocaleString()}</Text></Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 4 }}>
              <View style={s.formGroup}>
                <Text style={s.formLabel}>Your Price (₦) <Text style={{ color: PINK }}>*</Text></Text>
                <View style={s.formInput}>
                  <Text style={s.formPrefix}>₦</Text>
                  <TextInput
                    style={s.formInputText}
                    placeholder="0"
                    placeholderTextColor={BORDER}
                    value={form.price}
                    onChangeText={t => setForm({ ...form, price: t.replace(/[^0-9]/g, '') })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Est. Duration (mins)</Text>
                <View style={s.formInput}>
                  <Ionicons name="time-outline" size={18} color={TEXT3} style={{ marginRight: 10 }} />
                  <TextInput
                    style={s.formInputText}
                    placeholder="e.g. 60"
                    placeholderTextColor={TEXT3}
                    value={form.duration}
                    onChangeText={t => setForm({ ...form, duration: t.replace(/[^0-9]/g, '') })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={s.formGroup}>
                <Text style={s.formLabel}>Message <Text style={{ color: TEXT3 }}>(optional)</Text></Text>
                <TextInput
                  style={s.formTextarea}
                  placeholder="Tell the client why you're the best fit…"
                  placeholderTextColor={TEXT3}
                  value={form.message}
                  onChangeText={t => setForm({ ...form, message: t })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={s.sheetActions}>
              <TouchableOpacity style={[s.flex, s.cancelBtn]} onPress={() => setShowModal(false)} disabled={submitting} activeOpacity={0.7}>
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.flex} onPress={submitResponse} disabled={submitting} activeOpacity={0.85}>
                <LinearGradient colors={[PINK, PRI_DK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitBtn}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitBtnTxt}>Submit</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
    paddingTop: 10, paddingBottom: 14,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT1, letterSpacing: -0.3 },

  banner: {
    borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center',
    backgroundColor: PINK, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: PINK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  bannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 4 },
  bannerVal: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  bannerIcon: { opacity: 0.7 },

  card: {
    backgroundColor: CARD, borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardIconText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cardMid: { flex: 1, marginLeft: 12, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 2 },
  cardSub: { fontSize: 12, color: TEXT2, fontWeight: '500', marginBottom: 3 },
  cardMeta: { fontSize: 11, color: TEXT3 },
  cardRight: { alignItems: 'flex-end' },
  cardPrice: { fontSize: 14, fontWeight: '800', color: PINK },
  cardPriceSub: { fontSize: 10, color: TEXT3, fontWeight: '500', marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 },
  emptyIcon: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT1, marginBottom: 8, letterSpacing: -0.3 },
  emptyTxt: { fontSize: 13, color: TEXT2, textAlign: 'center', lineHeight: 20 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: TEXT1 },
  sheetSub: { fontSize: 12, color: TEXT2, marginTop: 2 },
  sheetClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },

  budgetNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FFF0F7', borderRadius: 10, padding: 10, marginBottom: 14 },
  budgetNoteTxt: { fontSize: 13, color: TEXT2 },

  formGroup: { gap: 6 },
  formLabel: { fontSize: 13, fontWeight: '700', color: TEXT1 },
  formInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 13, paddingHorizontal: 14, paddingVertical: 4,
  },
  formPrefix: { fontSize: 18, fontWeight: '700', color: TEXT2, paddingVertical: 12, marginRight: 4 },
  formInputText: { flex: 1, fontSize: 16, color: TEXT1, fontWeight: '600', paddingVertical: 12 },
  formTextarea: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: TEXT1, minHeight: 90,
  },

  sheetActions: { flexDirection: 'row', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4 },
  cancelBtn: { backgroundColor: BORDER, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  cancelBtnTxt: { fontSize: 15, fontWeight: '700', color: TEXT2 },
  submitBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  submitBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default AvailableOffersScreen;
