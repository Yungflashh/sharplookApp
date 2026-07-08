import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, TextInput, Modal, Platform, StatusBar, StyleSheet,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { offerAPI, handleAPIError } from '@/api/api';

const BG     = '#FFF5F9';
const CARD   = '#FFFFFF';
const PINK   = '#E04079';
const PRI_DK = '#B5315F';
const TEXT1  = '#1A1A2E';
const TEXT2  = '#6B7280';
const TEXT3  = '#9CA3AF';
const BORDER = '#F3F4F6';

interface OfferResponse {
  _id: string;
  title: string;
  description: string;
  proposedPrice: number;
  status: string;
  category: { name: string };
  client: { firstName: string; lastName: string };
  responses: Array<{
    _id: string;
    proposedPrice: number;
    counterOffer?: number;
    message?: string;
    estimatedDuration?: number;
    respondedAt: string;
    isAccepted: boolean;
  }>;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  open:     { label: 'Open',     bg: '#D1FAE5', color: '#065F46' },
  accepted: { label: 'Accepted', bg: '#DBEAFE', color: '#1E40AF' },
  closed:   { label: 'Closed',   bg: '#FEE2E2', color: '#991B1B' },
  expired:  { label: 'Expired',  bg: '#F3F4F6', color: '#6B7280' },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const VendorMyResponsesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [offers,        setOffers]        = useState<OfferResponse[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [submitting,    setSubmitting]    = useState(false);

  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterTarget,    setCounterTarget]    = useState<{ offerId: string; responseId: string; price: number } | null>(null);
  const [counterPrice,     setCounterPrice]     = useState('');
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const fetchMyResponses = async () => {
    try {
      setLoading(true);
      const res = await offerAPI.getMyResponses({ page: 1, limit: 50 });
      if (res.success) setOffers(res.data.offers || res.data || []);
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchMyResponses(); }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyResponses().finally(() => setRefreshing(false));
  }, []);

  const handleAcceptCounter = (offerId: string, responseId: string) => {
    setConfirmModal({
      visible: true,
      title: 'Accept Counter Offer',
      message: "Accept the client's counter offer? A booking will be created.",
      onConfirm: async () => {
        try {
          setActionLoading(responseId);
          const res = await offerAPI.acceptCounterOffer(offerId, responseId);
          if (res.success) {
            toast.success('Success', 'Counter accepted! Booking created.');
            fetchMyResponses();
            navigation.navigate('BookingDetail', { bookingId: res.data.booking._id });
          }
        } catch (error) {
          toast.error('Error', handleAPIError(error).message);
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const openVendorCounter = (offerId: string, responseId: string, price: number) => {
    setCounterTarget({ offerId, responseId, price });
    setCounterPrice(price.toString());
    setShowCounterModal(true);
  };

  const submitVendorCounter = async () => {
    if (!counterTarget || !counterPrice) return;
    const price = parseFloat(counterPrice);
    if (price <= 0) { toast.error('Error', 'Please enter a valid price'); return; }
    try {
      setSubmitting(true);
      const res = await offerAPI.vendorCounterOffer(counterTarget.offerId, counterTarget.responseId, price);
      if (res.success) {
        toast.success('Success', 'Counter offer submitted');
        setShowCounterModal(false);
        fetchMyResponses();
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
        <Text style={s.headerTitle}>My Responses</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} colors={[PINK]} />}
      >
        {/* Stats banner */}
        {offers.length > 0 && (
          <View style={s.banner}>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerLabel}>Your proposals</Text>
              <Text style={s.bannerVal}>{offers.length} {offers.length === 1 ? 'response' : 'responses'} submitted</Text>
            </View>
            <View style={s.bannerIcon}>
              <Ionicons name="chatbubble-ellipses" size={28} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        )}

        {/* Empty */}
        {offers.length === 0 ? (
          <View style={s.empty}>
            <LinearGradient colors={[PINK, PRI_DK]} style={s.emptyIcon}>
              <Ionicons name="chatbubble-ellipses" size={38} color="#fff" />
            </LinearGradient>
            <Text style={s.emptyTitle}>No Responses Yet</Text>
            <Text style={s.emptyTxt}>Browse available offers and submit your proposals to get started!</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AvailableOffers')} style={s.emptyBtn} activeOpacity={0.85}>
              <LinearGradient colors={[PINK, PRI_DK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.emptyBtnInner}>
                <Ionicons name="search-outline" size={16} color="#fff" />
                <Text style={s.emptyBtnTxt}>Browse Offers</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          offers.map(offer => {
            const myResp = offer.responses[0];
            if (!myResp) return null;
            const sc = STATUS_MAP[offer.status.toLowerCase()] ?? { label: offer.status, bg: BORDER, color: TEXT2 };
            const hasCounter = myResp.counterOffer !== undefined && myResp.counterOffer !== null && myResp.counterOffer > 0;
            const canNegotiate = offer.status === 'open' && !myResp.isAccepted;

            return (
              <View key={offer._id} style={s.card}>
                {/* Top row */}
                <View style={s.cardTop}>
                  <LinearGradient colors={[PINK, PRI_DK]} style={s.cardIcon}>
                    <Text style={s.cardIconText}>{offer.client.firstName.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>

                  <View style={s.cardMid}>
                    <Text style={s.cardTitle} numberOfLines={1}>{offer.title}</Text>
                    <Text style={s.cardSub}>{offer.client.firstName} {offer.client.lastName} · {offer.category.name}</Text>
                  </View>

                  <View style={s.cardRight}>
                    <View style={[s.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.badgeTxt, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                    {myResp.isAccepted && (
                      <View style={[s.badge, { backgroundColor: '#D1FAE5' }]}>
                        <Text style={[s.badgeTxt, { color: '#065F46' }]}>Won</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Price summary */}
                <View style={s.priceSummary}>
                  <View style={s.priceSummaryItem}>
                    <Text style={s.priceSummaryLabel}>Client budget</Text>
                    <Text style={s.priceSummaryVal}>₦{offer.proposedPrice.toLocaleString()}</Text>
                  </View>
                  <View style={s.priceSummaryDivider} />
                  <View style={s.priceSummaryItem}>
                    <Text style={s.priceSummaryLabel}>Your offer</Text>
                    <Text style={[s.priceSummaryVal, { color: PINK }]}>₦{myResp.proposedPrice.toLocaleString()}</Text>
                  </View>
                  {hasCounter && (
                    <>
                      <View style={s.priceSummaryDivider} />
                      <View style={s.priceSummaryItem}>
                        <Text style={s.priceSummaryLabel}>Counter</Text>
                        <Text style={[s.priceSummaryVal, { color: '#EA580C' }]}>₦{myResp.counterOffer!.toLocaleString()}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Message excerpt */}
                {myResp.message ? (
                  <Text style={s.respMessage} numberOfLines={2}>"{myResp.message}"</Text>
                ) : null}

                <Text style={s.respDate}>Responded {formatDate(myResp.respondedAt)}</Text>

                {/* Counter negotiation actions */}
                {hasCounter && canNegotiate && (
                  <View style={s.negotiateRow}>
                    <Ionicons name="swap-horizontal" size={14} color="#EA580C" style={{ marginRight: 6 }} />
                    <Text style={s.negotiateTxt}>Client countered ₦{myResp.counterOffer!.toLocaleString()}</Text>
                    <View style={s.negotiateActions}>
                      <TouchableOpacity
                        onPress={() => handleAcceptCounter(offer._id, myResp._id)}
                        disabled={actionLoading === myResp._id}
                        style={s.negotiateAcceptBtn}
                        activeOpacity={0.85}
                      >
                        {actionLoading === myResp._id
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.negotiateAcceptTxt}>Accept</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openVendorCounter(offer._id, myResp._id, myResp.counterOffer!)}
                        disabled={actionLoading === myResp._id}
                        style={s.negotiateCounterBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={s.negotiateCounterTxt}>Counter</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Status note */}
                {myResp.isAccepted && (
                  <View style={s.statusNote}>
                    <Ionicons name="checkmark-circle" size={15} color="#059669" />
                    <Text style={[s.statusNoteTxt, { color: '#065F46' }]}>Your proposal was accepted — booking created!</Text>
                  </View>
                )}
                {!hasCounter && !myResp.isAccepted && offer.status === 'open' && (
                  <View style={s.statusNote}>
                    <Ionicons name="time-outline" size={15} color={TEXT3} />
                    <Text style={[s.statusNoteTxt, { color: TEXT3 }]}>Waiting for client's response</Text>
                  </View>
                )}
                {(offer.status === 'closed' || offer.status === 'expired') && !myResp.isAccepted && (
                  <View style={s.statusNote}>
                    <Ionicons name="close-circle-outline" size={15} color={TEXT3} />
                    <Text style={[s.statusNoteTxt, { color: TEXT3 }]}>
                      {offer.status === 'closed' ? 'Offer was closed by the client' : 'Offer has expired'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Counter modal */}
      <Modal visible={showCounterModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Counter Offer</Text>
              <TouchableOpacity onPress={() => setShowCounterModal(false)} style={s.sheetClose} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={TEXT2} />
              </TouchableOpacity>
            </View>
            {counterTarget && (
              <Text style={s.sheetSub}>Client offered ₦{counterTarget.price.toLocaleString()}. Enter your counter:</Text>
            )}
            <View style={s.formInput}>
              <Text style={s.formPrefix}>₦</Text>
              <TextInput
                style={s.formInputText}
                placeholder="0"
                placeholderTextColor={BORDER}
                value={counterPrice}
                onChangeText={t => setCounterPrice(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>
            <View style={s.sheetActions}>
              <TouchableOpacity style={[s.flex, s.cancelBtn]} onPress={() => setShowCounterModal(false)} disabled={submitting} activeOpacity={0.7}>
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.flex} onPress={submitVendorCounter} disabled={submitting} activeOpacity={0.85}>
                <LinearGradient colors={[PINK, PRI_DK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitBtn}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitBtnTxt}>Submit</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, visible: false })); }}
        onCancel={() => setConfirmModal(p => ({ ...p, visible: false }))}
      />
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
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardIconText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cardMid: { flex: 1, marginLeft: 12, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 2 },
  cardSub: { fontSize: 12, color: TEXT2, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end', gap: 5 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  priceSummary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10,
  },
  priceSummaryItem: { flex: 1, alignItems: 'center' },
  priceSummaryLabel: { fontSize: 10, color: TEXT3, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase' },
  priceSummaryVal: { fontSize: 14, fontWeight: '800', color: TEXT1 },
  priceSummaryDivider: { width: 1, height: 32, backgroundColor: BORDER },

  respMessage: { fontSize: 12, color: TEXT2, fontStyle: 'italic', lineHeight: 18, marginBottom: 4 },
  respDate: { fontSize: 11, color: TEXT3, marginBottom: 10 },

  negotiateRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12,
    marginBottom: 8, gap: 4,
  },
  negotiateTxt: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600' },
  negotiateActions: { flexDirection: 'row', gap: 8 },
  negotiateAcceptBtn: {
    backgroundColor: '#059669', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  negotiateAcceptTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  negotiateCounterBtn: {
    backgroundColor: '#FFF0F7', borderRadius: 10, borderWidth: 1.5, borderColor: PINK,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  negotiateCounterTxt: { color: PINK, fontSize: 12, fontWeight: '700' },

  statusNote: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusNoteTxt: { fontSize: 12, fontWeight: '500' },

  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 },
  emptyIcon: { width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT1, marginBottom: 8, letterSpacing: -0.3 },
  emptyTxt: { fontSize: 13, color: TEXT2, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { borderRadius: 14, overflow: 'hidden' },
  emptyBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 13, gap: 7 },
  emptyBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: TEXT1 },
  sheetClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  sheetSub: { fontSize: 13, color: TEXT2, marginBottom: 16 },

  formInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 13, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 20,
  },
  formPrefix: { fontSize: 18, fontWeight: '700', color: TEXT2, paddingVertical: 12, marginRight: 4 },
  formInputText: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT1, paddingVertical: 12 },

  sheetActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { backgroundColor: BORDER, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  cancelBtnTxt: { fontSize: 15, fontWeight: '700', color: TEXT2 },
  submitBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  submitBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default VendorMyResponsesScreen;
