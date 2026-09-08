import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Image, TextInput, Modal, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { offerAPI, promoAPI, handleAPIError } from '@/api/api';

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
  vendor: {
    _id: string;
    firstName: string;
    lastName: string;
    vendorProfile: { businessName: string; rating: number };
  };
  proposedPrice: number;
  counterOffer?: number;
  message?: string;
  estimatedDuration?: number;
  respondedAt: string;
  isAccepted: boolean;
}

interface Offer {
  _id: string;
  title: string;
  description: string;
  proposedPrice: number;
  status: string;
  serviceType: 'home' | 'shop' | 'both';
  responses: OfferResponse[];
  createdAt: string;
  expiresAt: string;
  images: string[];
  category: { name: string };
  location?: { address: string; city: string; state: string };
  flexibility: string;
  preferredDate?: string;
  preferredTime?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  open:     { label: 'Open',     bg: '#D1FAE5', color: '#065F46' },
  accepted: { label: 'Accepted', bg: '#DBEAFE', color: '#1E40AF' },
  closed:   { label: 'Closed',   bg: '#F3F4F6', color: '#6B7280' },
  expired:  { label: 'Expired',  bg: '#FEE2E2', color: '#991B1B' },
};

const SVC_LABEL: Record<string, string> = {
  home: 'Home Service',
  shop: 'In-Shop',
  both: 'Flexible',
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const InfoRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={s.infoRow}>
    <Ionicons name={icon} size={16} color={PINK} style={{ marginRight: 10 }} />
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const OfferDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { offerId } = route.params as { offerId: string };

  const [loading,    setLoading]    = useState(true);
  const [offer,      setOffer]      = useState<Offer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showCounterModal,  setShowCounterModal]  = useState(false);
  const [showPaymentModal,  setShowPaymentModal]  = useState(false);
  const [selectedResponse,  setSelectedResponse]  = useState<string | null>(null);
  const [selectedForAccept, setSelectedForAccept] = useState<string | null>(null);
  const [counterPrice,      setCounterPrice]      = useState('');
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const [activePromo, setActivePromo] = useState<{
    id: string;
    name: string;
    discountAmount: number;
    minServicePrice: number;
    slotsRemaining: number;
    userEligible: boolean;
  } | null>(null);
  const [promoSoldOutModal, setPromoSoldOutModal] = useState<{
    visible: boolean;
    message: string;
    fullPrice: number;
    responseId: string | null;
    paymentMethod: 'wallet' | 'card' | null;
  }>({ visible: false, message: '', fullPrice: 0, responseId: null, paymentMethod: null });

  useEffect(() => { fetchOffer(); fetchActivePromo(); }, []);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const res = await offerAPI.getOfferById(offerId);
      if (res.success) setOffer(res.data);
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchActivePromo = async () => {
    try {
      const res = await promoAPI.getCurrent();
      if (res?.success && res.data?.active) {
        setActivePromo({
          id: res.data.active.id,
          name: res.data.active.name,
          discountAmount: res.data.active.discountAmount || 0,
          minServicePrice: res.data.active.minServicePrice || 0,
          slotsRemaining: res.data.active.slotsRemaining || 0,
          userEligible: !!res.data.userEligible,
        });
      } else {
        setActivePromo(null);
      }
    } catch {
      setActivePromo(null);
    }
  };

  // Per-response promo eligibility: needs an active promo, remaining slots,
  // user eligibility, and the response's price to meet the campaign minimum.
  const isPromoApplicable = (price: number): boolean =>
    !!activePromo &&
    activePromo.userEligible &&
    activePromo.slotsRemaining > 0 &&
    price >= activePromo.minServicePrice;

  const handleAcceptResponse = (responseId: string) => {
    setSelectedForAccept(responseId);
    setShowPaymentModal(true);
  };

  const runAccept = async (
    responseId: string,
    paymentMethod: 'wallet' | 'card',
    expectPromo: boolean
  ) => {
    setSubmitting(true);
    try {
      const res = await offerAPI.acceptResponse(offerId, responseId, paymentMethod, expectPromo);
      if (res.success) {
        const { booking } = res.data;
        if (paymentMethod === 'card' && booking.authorizationUrl) {
          navigation.navigate('Payment', {
            bookingId: booking._id,
            amount: booking.totalAmount,
            authorizationUrl: booking.authorizationUrl,
            reference: booking.paymentReference,
          });
        } else {
          const promoWon = booking?.promoApplied;
          toast.success(
            promoWon ? 'Promo Applied 🎉' : 'Success',
            'Response accepted! Booking created.'
          );
          navigation.navigate('BookingDetail', { bookingId: booking._id });
        }
      }
    } catch (error: any) {
      const code = error.response?.data?.error?.code || error.response?.data?.code;
      const message = error.response?.data?.error?.message || error.response?.data?.message;

      if (code === 'PROMO_SLOT_UNAVAILABLE') {
        // Race lost — give the user a chance to proceed at full price
        const resp = offer?.responses.find(r => r._id === responseId);
        const fullPrice = resp ? (resp.counterOffer || resp.proposedPrice) : 0;
        setActivePromo(prev => (prev ? { ...prev, userEligible: false, slotsRemaining: 0 } : prev));
        setPromoSoldOutModal({
          visible: true,
          message: message || 'Sorry, the promo just sold out.',
          fullPrice,
          responseId,
          paymentMethod,
        });
        return;
      }

      toast.error('Error', message || handleAPIError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const processAccept = async (paymentMethod: 'wallet' | 'card') => {
    if (!selectedForAccept) return;
    setShowPaymentModal(false);
    const resp = offer?.responses.find(r => r._id === selectedForAccept);
    const price = resp ? (resp.counterOffer || resp.proposedPrice) : 0;
    const expectPromo = isPromoApplicable(price);
    const responseId = selectedForAccept;
    setSelectedForAccept(null);
    await runAccept(responseId, paymentMethod, expectPromo);
  };

  const handleRetryFullPrice = async () => {
    const { responseId, paymentMethod } = promoSoldOutModal;
    setPromoSoldOutModal({ visible: false, message: '', fullPrice: 0, responseId: null, paymentMethod: null });
    if (!responseId || !paymentMethod) return;
    await runAccept(responseId, paymentMethod, false);
  };

  const handleCounterOffer = (responseId: string, currentPrice: number) => {
    setSelectedResponse(responseId);
    setCounterPrice(currentPrice.toString());
    setShowCounterModal(true);
  };

  const submitCounterOffer = async () => {
    if (!selectedResponse || !counterPrice) return;
    const price = parseFloat(counterPrice);
    if (price <= 0) { toast.error('Error', 'Please enter a valid price'); return; }
    try {
      setSubmitting(true);
      const res = await offerAPI.counterOffer(offerId, selectedResponse, price);
      if (res.success) {
        toast.success('Success', 'Counter offer submitted');
        setShowCounterModal(false);
        fetchOffer();
      }
    } catch (error) {
      toast.error('Error', handleAPIError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseOffer = () => {
    setConfirmModal({
      visible: true,
      title: 'Close Offer',
      message: 'Are you sure you want to close this offer? This cannot be undone.',
      onConfirm: async () => {
        try {
          setSubmitting(true);
          const res = await offerAPI.closeOffer(offerId);
          if (res.success) { toast.success('Success', 'Offer closed'); navigation.goBack(); }
        } catch (error) {
          toast.error('Error', handleAPIError(error).message);
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  if (loading || !offer) {
    return (
      <View style={[s.flex, { backgroundColor: BG, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={PINK} />
      </View>
    );
  }

  const sc = STATUS_MAP[offer.status.toLowerCase()] ?? { label: offer.status, bg: BORDER, color: TEXT2 };

  return (
    <View style={[s.flex, { backgroundColor: BG, paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={PINK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Offer Details</Text>
        {offer.status === 'open' ? (
          <TouchableOpacity onPress={handleCloseOffer} style={s.closeBtn} disabled={submitting} activeOpacity={0.7}>
            <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView style={s.flex} showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Top pink banner */}
        <View style={s.banner}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={s.bannerCat}>{offer.category?.name}</Text>
            <Text style={s.bannerTitle} numberOfLines={2}>{offer.title}</Text>
          </View>
          <View style={s.bannerRight}>
            <View style={[s.badge, { backgroundColor: sc.bg }]}>
              <Text style={[s.badgeTxt, { color: sc.color }]}>{sc.label}</Text>
            </View>
            <Text style={s.bannerPrice}>₦{offer.proposedPrice.toLocaleString()}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.descTxt}>{offer.description}</Text>
        </View>

        {/* Images */}
        {offer.images?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 4 }}>
            {offer.images.map((img, i) => (
              <Image key={i} source={{ uri: img }} style={s.offerImg} resizeMode="cover" />
            ))}
          </ScrollView>
        )}

        {/* Details */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Details</Text>
          <InfoRow icon="pricetag-outline"  label="Budget"       value={`₦${offer.proposedPrice.toLocaleString()}`} />
          <InfoRow icon="swap-horizontal"   label="Service"      value={SVC_LABEL[offer.serviceType] ?? offer.serviceType} />
          {offer.location && (offer.serviceType === 'home' || offer.serviceType === 'both') && (
            <InfoRow icon="location-outline" label="Location" value={`${offer.location.city}, ${offer.location.state}`} />
          )}
          <InfoRow icon="time-outline"      label="Timing"       value={offer.flexibility} />
          <InfoRow icon="calendar-outline"  label="Expires"      value={formatDate(offer.expiresAt)} />
        </View>

        {/* Responses */}
        <View style={s.card}>
          <View style={s.responsesHeader}>
            <Text style={s.sectionTitle}>Vendor Responses</Text>
            <View style={[s.badge, { backgroundColor: '#FEE2EF' }]}>
              <Text style={[s.badgeTxt, { color: PINK }]}>{offer.responses.length}</Text>
            </View>
          </View>

          {offer.responses.length === 0 ? (
            <View style={s.emptyResponses}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={TEXT3} />
              <Text style={s.emptyResponsesTxt}>No responses yet — vendors will reply soon</Text>
            </View>
          ) : (
            offer.responses.map(resp => {
              const respPrice = resp.counterOffer || resp.proposedPrice;
              const promoOn = isPromoApplicable(respPrice);
              const discounted = promoOn && activePromo
                ? Math.max(0, respPrice - activePromo.discountAmount)
                : respPrice;
              return (
              <View key={resp._id} style={[s.respCard, resp.isAccepted && s.respCardAccepted]}>
                {/* Vendor row */}
                <View style={s.vendorRow}>
                  <LinearGradient colors={[PINK, PRI_DK]} style={s.vendorAvatar}>
                    <Text style={s.vendorInitial}>
                      {(resp.vendor.vendorProfile.businessName || resp.vendor.firstName).charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={s.flex}>
                    <Text style={s.vendorName}>
                      {resp.vendor.vendorProfile.businessName || `${resp.vendor.firstName} ${resp.vendor.lastName}`}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="star" size={12} color="#FBBF24" />
                      <Text style={s.vendorRating}>{resp.vendor.vendorProfile.rating?.toFixed(1) || 'New'}</Text>
                    </View>
                  </View>
                  {resp.isAccepted && (
                    <View style={[s.badge, { backgroundColor: '#D1FAE5' }]}>
                      <Text style={[s.badgeTxt, { color: '#065F46' }]}>Accepted</Text>
                    </View>
                  )}
                </View>

                {/* Prices */}
                <View style={s.priceRow}>
                  <Text style={s.priceLabel}>Proposed</Text>
                  <Text style={s.priceVal}>₦{resp.proposedPrice.toLocaleString()}</Text>
                </View>
                {resp.counterOffer !== undefined && resp.counterOffer > 0 && (
                  <View style={s.priceRow}>
                    <Text style={s.priceLabel}>Your counter</Text>
                    <Text style={[s.priceVal, { color: TEXT2 }]}>₦{resp.counterOffer.toLocaleString()}</Text>
                  </View>
                )}
                {resp.estimatedDuration !== undefined && (
                  <View style={s.priceRow}>
                    <Text style={s.priceLabel}>Est. duration</Text>
                    <Text style={[s.priceVal, { color: TEXT2 }]}>{resp.estimatedDuration} mins</Text>
                  </View>
                )}

                {/* Promo banner + discounted total (only for open offers we can still accept) */}
                {promoOn && activePromo && offer.status === 'open' && !resp.isAccepted && (
                  <>
                    <View style={s.promoBanner}>
                      <View style={s.promoIcon}>
                        <Ionicons name="gift" size={16} color="#fff" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.promoTitle}>Promo — save ₦{activePromo.discountAmount.toLocaleString()}</Text>
                        <Text style={s.promoSub}>
                          {activePromo.name} · {activePromo.slotsRemaining} slot{activePromo.slotsRemaining === 1 ? '' : 's'} left
                        </Text>
                      </View>
                    </View>
                    <View style={[s.priceRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER }]}>
                      <Text style={[s.priceLabel, { fontWeight: '700', color: TEXT1 }]}>You pay</Text>
                      <Text style={[s.priceVal, { fontSize: 16 }]}>₦{discounted.toLocaleString()}</Text>
                    </View>
                  </>
                )}

                {/* Message */}
                {resp.message ? (
                  <Text style={s.respMessage}>"{resp.message}"</Text>
                ) : null}

                <Text style={s.respDate}>Responded {formatDate(resp.respondedAt)}</Text>

                {/* Actions */}
                {offer.status === 'open' && !resp.isAccepted && (
                  <View style={s.respActions}>
                    <TouchableOpacity style={s.flex} onPress={() => handleAcceptResponse(resp._id)} disabled={submitting} activeOpacity={0.85}>
                      <LinearGradient colors={[PINK, PRI_DK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.acceptBtn}>
                        {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.acceptBtnTxt}>Accept{promoOn ? ` · ₦${discounted.toLocaleString()}` : ''}</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.flex, s.counterBtn]} onPress={() => handleCounterOffer(resp._id, resp.proposedPrice)} disabled={submitting} activeOpacity={0.7}>
                      <Text style={s.counterBtnTxt}>Counter</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Counter offer modal */}
      <Modal visible={showCounterModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Counter Offer</Text>
              <TouchableOpacity onPress={() => setShowCounterModal(false)} style={s.sheetClose} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={TEXT2} />
              </TouchableOpacity>
            </View>
            <Text style={s.sheetSub}>Enter your counter offer amount</Text>
            <View style={s.priceInput}>
              <Text style={s.priceInputPrefix}>₦</Text>
              <TextInput
                style={s.priceInputText}
                placeholder="0"
                placeholderTextColor={BORDER}
                value={counterPrice}
                onChangeText={t => setCounterPrice(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
              />
            </View>
            <View style={s.sheetActions}>
              <TouchableOpacity style={[s.flex, s.sheetCancelBtn]} onPress={() => setShowCounterModal(false)} activeOpacity={0.7}>
                <Text style={s.sheetCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.flex} onPress={submitCounterOffer} disabled={submitting} activeOpacity={0.85}>
                <LinearGradient colors={[PINK, PRI_DK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.sheetConfirmBtn}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sheetConfirmTxt}>Submit</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment method modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Choose Payment</Text>
              <TouchableOpacity onPress={() => { setShowPaymentModal(false); setSelectedForAccept(null); }} style={s.sheetClose} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={TEXT2} />
              </TouchableOpacity>
            </View>
            <Text style={s.sheetSub}>How do you want to pay for this booking?</Text>

            <TouchableOpacity style={s.payOpt} onPress={() => processAccept('wallet')} disabled={submitting} activeOpacity={0.8}>
              <Ionicons name="wallet-outline" size={22} color={PINK} />
              <View style={s.flex}>
                <Text style={s.payOptTitle}>SharpPay Wallet</Text>
                <Text style={s.payOptSub}>Instant payment from your wallet</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT3} />
            </TouchableOpacity>

            <TouchableOpacity style={s.payOpt} onPress={() => processAccept('card')} disabled={submitting} activeOpacity={0.8}>
              <Ionicons name="card-outline" size={22} color={PINK} />
              <View style={s.flex}>
                <Text style={s.payOptTitle}>Pay with Card</Text>
                <Text style={s.payOptSub}>Secure payment via Paystack</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={TEXT3} />
            </TouchableOpacity>

            <View style={s.escrowNote}>
              <Ionicons name="shield-checkmark-outline" size={15} color={PINK} />
              <Text style={s.escrowNoteTxt}>All payments are secured in escrow</Text>
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

      {/* ── Promo sold-out modal ── */}
      <Modal
        visible={promoSoldOutModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setPromoSoldOutModal({ visible: false, message: '', fullPrice: 0, responseId: null, paymentMethod: null })}
      >
        <View style={s.soldOutBackdrop}>
          <View style={s.soldOutCard}>
            <View style={s.soldOutIcon}>
              <Ionicons name="hourglass" size={28} color={PINK} />
            </View>
            <Text style={s.soldOutTitle}>Promo sold out</Text>
            <Text style={s.soldOutMsg}>{promoSoldOutModal.message}</Text>
            <View style={s.soldOutPriceRow}>
              <Text style={s.soldOutPriceLbl}>Full price</Text>
              <Text style={s.soldOutPriceVal}>₦{promoSoldOutModal.fullPrice.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRetryFullPrice}
              disabled={submitting}
              style={{ marginTop: 16, borderRadius: 14, overflow: 'hidden', alignSelf: 'stretch' }}
            >
              <LinearGradient
                colors={submitting ? ['#D1D5DB', '#9CA3AF'] : [PINK, PRI_DK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.soldOutRetryBtn}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.soldOutRetryTxt}>Proceed at full price</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setPromoSoldOutModal({ visible: false, message: '', fullPrice: 0, responseId: null, paymentMethod: null })}
              style={s.soldOutCancelBtn}
            >
              <Text style={s.soldOutCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32, gap: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
    paddingTop: 10, paddingBottom: 14,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2EF', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT1, letterSpacing: -0.3 },

  banner: {
    backgroundColor: PINK, borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', marginBottom: 0,
    ...Platform.select({
      ios: { shadowColor: PINK, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  bannerCat: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 4 },
  bannerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  bannerRight: { alignItems: 'flex-end', gap: 8 },
  bannerPrice: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },

  card: {
    backgroundColor: CARD, borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT1, marginBottom: 12, letterSpacing: -0.2 },

  descTxt: { fontSize: 14, color: TEXT2, lineHeight: 22 },

  offerImg: { width: 110, height: 110, borderRadius: 14 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  infoLabel: { fontSize: 13, color: TEXT3, fontWeight: '500', width: 72 },
  infoValue: { flex: 1, fontSize: 13, color: TEXT1, fontWeight: '600', textAlign: 'right', textTransform: 'capitalize' },

  responsesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  emptyResponses: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyResponsesTxt: { fontSize: 13, color: TEXT3, textAlign: 'center' },

  respCard: {
    backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: BORDER,
  },
  respCardAccepted: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },

  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  vendorAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vendorInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },
  vendorName: { fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 2 },
  vendorRating: { fontSize: 12, color: TEXT2, fontWeight: '500' },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  priceLabel: { fontSize: 13, color: TEXT2 },
  priceVal: { fontSize: 14, fontWeight: '800', color: PINK },

  respMessage: { fontSize: 13, color: TEXT2, fontStyle: 'italic', lineHeight: 19, marginTop: 8, marginBottom: 4 },
  respDate: { fontSize: 11, color: TEXT3, marginTop: 4, marginBottom: 10 },

  respActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  acceptBtn: { borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  acceptBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  counterBtn: { borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: PINK, backgroundColor: '#FFF0F7' },
  counterBtnTxt: { color: PINK, fontSize: 14, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: TEXT1 },
  sheetClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  sheetSub: { fontSize: 13, color: TEXT2, marginBottom: 18 },

  priceInput: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 16, marginBottom: 20,
  },
  priceInputPrefix: { fontSize: 22, fontWeight: '800', color: TEXT2, paddingVertical: 14 },
  priceInputText: { flex: 1, fontSize: 22, fontWeight: '800', color: TEXT1, paddingVertical: 14 },

  sheetActions: { flexDirection: 'row', gap: 12 },
  sheetCancelBtn: { backgroundColor: BORDER, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  sheetCancelTxt: { fontSize: 15, fontWeight: '700', color: TEXT2 },
  sheetConfirmBtn: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  sheetConfirmTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  payOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  payOptTitle: { fontSize: 14, fontWeight: '700', color: TEXT1, marginBottom: 2 },
  payOptSub: { fontSize: 12, color: TEXT2 },

  escrowNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  escrowNoteTxt: { fontSize: 12, color: TEXT2, fontWeight: '500' },

  // Promo
  promoBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 10, padding: 10, borderRadius: 12,
    backgroundColor: '#FEE2F0', borderWidth: 1, borderColor: '#F9A8D4',
  },
  promoIcon: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: PINK,
    alignItems: 'center', justifyContent: 'center',
  },
  promoTitle: { fontSize: 12, fontWeight: '800', color: '#831843' },
  promoSub: { fontSize: 11, color: '#9F1239', marginTop: 1 },

  // Promo sold-out modal
  soldOutBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  soldOutCard: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  soldOutIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEE2F0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  soldOutTitle: { fontSize: 18, fontWeight: '800', color: TEXT1, marginBottom: 8 },
  soldOutMsg: { fontSize: 14, color: TEXT2, textAlign: 'center', lineHeight: 20 },
  soldOutPriceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    alignSelf: 'stretch', marginTop: 16, padding: 14, backgroundColor: '#F9FAFB', borderRadius: 12,
  },
  soldOutPriceLbl: { fontSize: 13, color: TEXT2, fontWeight: '600' },
  soldOutPriceVal: { fontSize: 18, color: PINK, fontWeight: '800' },
  soldOutRetryBtn: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: 32 },
  soldOutRetryTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  soldOutCancelBtn: { paddingVertical: 12, marginTop: 4 },
  soldOutCancelTxt: { fontSize: 14, color: TEXT2, fontWeight: '600' },
});

export default OfferDetailScreen;
