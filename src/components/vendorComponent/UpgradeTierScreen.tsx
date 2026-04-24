import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import { LinearGradient } from 'expo-linear-gradient';
import api, { handleAPIError } from '@/api/api';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface PostingLimits {
  plan: string;
  serviceLimit: number;
  productLimit: number;
  servicesUsed: number;
  productsUsed: number;
}

interface TierOption {
  tier: 'free' | 'pro' | 'premium';
  name: string;
  description: string;
  serviceLimit: number | string;
  productLimit: number | string;
  price: number;
  features: string[];
  recommended?: boolean;
  color: string;
  icon: string;
}

const TIERS: TierOption[] = [
  {
    tier: 'free',
    name: 'Free',
    description: 'Get started with the basics',
    serviceLimit: 2,
    productLimit: 2,
    price: 0,
    color: '#6b7280',
    icon: 'leaf-outline',
    features: [
      'Up to 2 services',
      'Up to 2 products',
      'Basic analytics',
      'In-app messaging',
      'Booking management',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    description: 'Grow your business',
    serviceLimit: 5,
    productLimit: 5,
    price: 2000,
    color: '#8b5cf6',
    icon: 'rocket-outline',
    features: [
      'Up to 5 services',
      'Up to 5 products',
      'Advanced analytics',
      'Priority support',
      'Featured in search',
    ],
    recommended: true,
  },
  {
    tier: 'premium',
    name: 'Premium',
    description: 'Unlimited everything',
    serviceLimit: 'Unlimited',
    productLimit: 'Unlimited',
    price: 8000,
    color: '#f59e0b',
    icon: 'diamond-outline',
    features: [
      'Unlimited services',
      'Unlimited products',
      'Full analytics & export',
      'Priority support',
      'Verified badge',
      'Top search placement',
    ],
  },
];

const tierAPI = {
  getPostingLimits: async () => {
    const response = await api.get('/subscriptions/posting-limits');
    return response.data;
  },
  initiateTierUpgrade: async (tier: string) => {
    const response = await api.post('/subscriptions/upgrade-tier', { tier });
    return response.data;
  },
};

const { width: SW } = Dimensions.get('window');

const UpgradeTierScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<PostingLimits | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierOption | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const limitsRes = await tierAPI.getPostingLimits();
      if (limitsRes.success) setLimits(limitsRes.data.limits);
    } catch (error) {
      console.error('Failed to fetch tier data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleUpgrade = (tier: TierOption) => {
    if (tier.tier === limits?.plan) {
      toast.info('Current Plan', 'You are already on this plan.');
      return;
    }

    if (tier.price === 0) {
      setConfirmModal({
        visible: true,
        title: 'Switch to Free',
        message: 'Are you sure you want to switch to the Free plan? Your posting limits will be reduced.',
        onConfirm: async () => {
          try {
            setUpgrading(true);
            const response = await tierAPI.initiateTierUpgrade(tier.tier);
            if (response.success) {
              toast.success('Done', 'You are now on the Free plan.');
              fetchData();
            }
          } catch (error) {
            const apiError = handleAPIError(error);
            toast.error('Error', apiError.message || 'Failed to switch plan');
          } finally {
            setUpgrading(false);
          }
        },
      });
      return;
    }

    setConfirmModal({
      visible: true,
      title: `Upgrade to ${tier.name}`,
      message: `You'll be redirected to pay ₦${tier.price.toLocaleString()}/month via Paystack.`,
      onConfirm: async () => {
        try {
          setUpgrading(true);
          setSelectedTier(tier);
          const response = await tierAPI.initiateTierUpgrade(tier.tier);
          if (response.success && response.data?.authorizationUrl) {
            navigation.navigate('WalletPayment', {
              amount: tier.price,
              reference: response.data.reference,
              authorizationUrl: response.data.authorizationUrl,
              paymentType: 'tier_upgrade',
            });
          } else if (response.success) {
            toast.success('Upgraded!', `You are now on the ${tier.name} plan.`);
            fetchData();
          }
        } catch (error) {
          const apiError = handleAPIError(error);
          toast.error('Error', apiError.message || 'Failed to upgrade');
        } finally {
          setUpgrading(false);
          setSelectedTier(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#eb278d" />
          <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 12 }}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentPlan = limits?.plan || 'free';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Upgrade Plan</Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 1 }}>Post more services & products</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={fetchData} tintColor="#eb278d" colors={['#eb278d']} />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>

          {/* Current Usage */}
          {limits && (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Your Usage</Text>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#fce7f3' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#db2777', textTransform: 'capitalize' }}>{currentPlan} Plan</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { label: 'Services', used: limits.servicesUsed, limit: limits.serviceLimit },
                  { label: 'Products', used: limits.productsUsed, limit: limits.productLimit },
                ].map((item) => {
                  const pct = item.limit === Infinity ? 5 : Math.min(100, (item.used / (item.limit as number)) * 100);
                  return (
                    <View key={item.label} style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 12 }}>
                      <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{item.label}</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>
                        {item.used}/{item.limit === Infinity ? '∞' : item.limit}
                      </Text>
                      <View style={{ backgroundColor: '#e5e7eb', borderRadius: 4, height: 6, marginTop: 8, overflow: 'hidden' }}>
                        <View style={{ backgroundColor: '#ec4899', borderRadius: 4, height: 6, width: `${pct}%` }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Tier Cards */}
          {TIERS.map((tier) => {
            const isCurrent = currentPlan === tier.tier;
            const isUpgrading = upgrading && selectedTier?.tier === tier.tier;

            return (
              <View
                key={tier.tier}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 18,
                  marginBottom: 14,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: isCurrent ? '#4ade80' : 'transparent',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.07,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View style={{ padding: 16 }}>
                  {/* Tier Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: tier.color + '18' }}>
                      <Ionicons name={tier.icon as any} size={22} color={tier.color} />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>{tier.name}</Text>
                        {tier.recommended && (
                          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#ede9fe' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#7c3aed' }}>BEST VALUE</Text>
                          </View>
                        )}
                        {isCurrent && (
                          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#dcfce7' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#16a34a' }}>CURRENT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{tier.description}</Text>
                    </View>
                  </View>

                  {/* Price box */}
                  <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      {tier.price > 0 ? (
                        <>
                          <Text style={{ fontSize: SW < 360 ? 22 : 26, fontWeight: '800', color: '#111827' }}>
                            ₦{tier.price.toLocaleString()}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#9ca3af', marginLeft: 4 }}>/month</Text>
                        </>
                      ) : (
                        <Text style={{ fontSize: SW < 360 ? 22 : 26, fontWeight: '800', color: '#111827' }}>Free</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                      {typeof tier.serviceLimit === 'number' ? tier.serviceLimit : '∞'} services
                      {' · '}
                      {typeof tier.productLimit === 'number' ? tier.productLimit : '∞'} products
                    </Text>
                  </View>

                  {/* Features */}
                  {tier.features.map((feature, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color={tier.color} />
                      <Text style={{ fontSize: 13, color: '#374151', marginLeft: 8, flex: 1 }}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Action button */}
                {!isCurrent && (
                  <TouchableOpacity
                    onPress={() => handleUpgrade(tier)}
                    disabled={upgrading}
                    activeOpacity={0.85}
                    style={{ marginHorizontal: 16, marginBottom: 16 }}
                  >
                    <LinearGradient
                      colors={
                        tier.tier === 'premium' ? ['#f59e0b', '#d97706']
                        : tier.tier === 'pro' ? ['#8b5cf6', '#7c3aed']
                        : ['#6b7280', '#4b5563']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {isUpgrading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                          {tier.price > 0 ? `Upgrade to ${tier.name}` : 'Switch to Free'}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <View style={{ height: 16 }} />
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal((prev) => ({ ...prev, visible: false }));
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

export default UpgradeTierScreen;
