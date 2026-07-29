import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { toast } from '@/components/ui/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import WalletFundingModal from '@/components/WalletFundingModal';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation.types';
import api, { handleAPIError } from '@/api/api';

type SubscriptionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Subscription {
  _id: string;
  type: 'in_shop' | 'home_service' | 'both';
  monthlyFee: number;
  commissionRate: number;
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  nextPaymentDue: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  autoRenew: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

interface PlanOption {
  type: 'in_shop' | 'home_service' | 'both';
  name: string;
  description: string;
  monthlyFee: number;
  commissionRate: number;
  features: string[];
  recommended?: boolean;
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    type: 'in_shop',
    name: 'In-Shop',
    description: 'Perfect for vendors with physical locations',
    monthlyFee: 5000,
    commissionRate: 0,
    features: [
      'Zero commission on bookings',
      'Unlimited service listings',
      'Customer reviews & ratings',
      'In-app messaging',
      'Booking management',
    ],
  },
  {
    type: 'home_service',
    name: 'Home Service',
    description: 'Ideal for mobile service providers',
    monthlyFee: 0,
    commissionRate: 10,
    features: [
      'No monthly fee',
      '10% commission per booking',
      'Location-based visibility',
      'Customer reviews & ratings',
      'In-app messaging',
      'Booking management',
    ],
    recommended: true,
  },
  {
    type: 'both',
    name: 'Hybrid',
    description: 'Best of both worlds',
    monthlyFee: 0,
    commissionRate: 12,
    features: [
      'No monthly fee',
      '12% commission per booking',
      'In-shop & home service bookings',
      'Maximum customer reach',
      'Priority in search results',
      'All platform features',
    ],
  },
];

const subscriptionAPI = {
  getMySubscription: async () => {
    const response = await api.get('/subscriptions/my-subscription');
    return response.data;
  },

  createSubscription: async (plan: 'in_shop' | 'home_service' | 'both') => {
    const response = await api.post('/subscriptions', { plan });
    return response.data;
  },

  paySubscription: async (subscriptionId: string) => {
    const response = await api.post(`/subscriptions/${subscriptionId}/pay`);
    return response.data;
  },

  cancelSubscription: async (subscriptionId: string) => {
    const response = await api.put(`/subscriptions/${subscriptionId}/cancel`);
    return response.data;
  },

  changePlan: async (subscriptionId: string, plan: 'in_shop' | 'home_service' | 'both') => {
    const response = await api.put(`/subscriptions/${subscriptionId}/change-plan`, { plan });
    return response.data;
  },

  getWalletBalance: async () => {
    const response = await api.get('/payments/wallet/balance');
    return response.data;
  },
};

const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<SubscriptionScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [fundingModalVisible, setFundingModalVisible] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await subscriptionAPI.getMySubscription();

      if (response.success) {
        setSubscription(response.data.subscription);
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      
      if (apiError.status !== 404) {
        console.error('Subscription fetch error:', apiError);
      }
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const response = await subscriptionAPI.getWalletBalance();
      if (response.success) {
        setWalletBalance(response.data.balance || 0);
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    }
  };

  useEffect(() => {
    fetchSubscription();
    fetchWalletBalance();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSubscription();
      fetchWalletBalance();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchSubscription(), fetchWalletBalance()]).finally(() => setRefreshing(false));
  }, []);

  const handleCreateSubscription = async (plan: PlanOption) => {
    try {
      setActionLoading(true);
      const response = await subscriptionAPI.createSubscription(plan.type);

      if (response.success) {
        setSubscription(response.data.subscription);
        setShowPlanModal(false);
        
        // If it's a paid plan, show payment option
        if (plan.monthlyFee > 0) {
          toast.info('Subscription Created', 'Your subscription has been created. Please pay to activate it.');
        } else {
          toast.success('Success', 'Subscription created and activated successfully!');
        }
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Failed to create subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaySubscription = async () => {
    if (!subscription) return;

    // Check balance first
    if (walletBalance < subscription.monthlyFee) {
      setConfirmModal({
        visible: true,
        title: 'Insufficient Balance',
        message: `You need ₦${(subscription.monthlyFee - walletBalance).toLocaleString()} more to pay for this subscription.`,
        onConfirm: () => setFundingModalVisible(true),
      });
      return;
    }

    setConfirmModal({
      visible: true,
      title: 'Confirm Payment',
      message: `Pay ₦${subscription.monthlyFee.toLocaleString()} from your wallet to activate your subscription?`,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const response = await subscriptionAPI.paySubscription(subscription._id);

          if (response.success) {
            setSubscription(response.data.subscription);
            await fetchWalletBalance(); // Refresh balance
            toast.success('Success!', 'Your subscription has been activated.');
          }
        } catch (error) {
          const apiError = handleAPIError(error);
          toast.error('Payment Failed', apiError.message || 'Could not process payment');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleChangePlan = async (plan: PlanOption) => {
    if (!subscription) return;

    try {
      setActionLoading(true);
      const response = await subscriptionAPI.changePlan(subscription._id, plan.type);

      if (response.success) {
        setSubscription(response.data.subscription);
        setShowPlanModal(false);
        toast.success('Success', 'Plan changed successfully!');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Failed to change plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    try {
      setActionLoading(true);
      const response = await subscriptionAPI.cancelSubscription(subscription._id);

      if (response.success) {
        setSubscription(response.data.subscription);
        setShowCancelModal(false);
        toast.success('Success', 'Subscription cancelled successfully');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error('Error', apiError.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      case 'expired':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getPlanIcon = (type: string) => {
    switch (type) {
      case 'in_shop':
        return 'storefront';
      case 'home_service':
        return 'home';
      case 'both':
        return 'grid';
      default:
        return 'help-circle';
    }
  };

  const getPlanName = (type: string) => {
    switch (type) {
      case 'in_shop':
        return 'In-Shop';
      case 'home_service':
        return 'Home Service';
      case 'both':
        return 'Hybrid';
      default:
        return type;
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const renderPlanCard = (plan: PlanOption, isChangePlan: boolean = false) => {
    const isCurrentPlan = subscription?.type === plan.type;

    return (
      <TouchableOpacity
        key={plan.type}
        className={`bg-white rounded-2xl p-4 mb-3 border-2 ${
          selectedPlan?.type === plan.type
            ? 'border-pink-500'
            : isCurrentPlan
            ? 'border-gray-300'
            : 'border-transparent'
        }`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
        onPress={() => !isCurrentPlan && setSelectedPlan(plan)}
        activeOpacity={isCurrentPlan ? 1 : 0.7}
        disabled={isCurrentPlan}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row items-center">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center ${
                plan.recommended ? 'bg-pink-100' : 'bg-gray-100'
              }`}
            >
              <Ionicons
                name={getPlanIcon(plan.type) as any}
                size={24}
                color={plan.recommended ? '#eb278d' : '#6b7280'}
              />
            </View>
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="text-lg font-bold text-gray-900">{plan.name}</Text>
                {plan.recommended && (
                  <View className="ml-2 px-2 py-0.5 rounded-full bg-pink-100">
                    <Text className="text-xs font-semibold text-pink-600">Popular</Text>
                  </View>
                )}
                {isCurrentPlan && (
                  <View className="ml-2 px-2 py-0.5 rounded-full bg-green-100">
                    <Text className="text-xs font-semibold text-green-600">Current</Text>
                  </View>
                )}
              </View>
              <Text className="text-sm text-gray-500">{plan.description}</Text>
            </View>
          </View>

          {selectedPlan?.type === plan.type && (
            <View className="w-6 h-6 rounded-full bg-pink-600 items-center justify-center">
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          )}
        </View>

        {/* Pricing */}
        <View className="bg-gray-50 rounded-xl p-3 mb-3">
          <View className="flex-row items-baseline">
            {plan.monthlyFee > 0 ? (
              <>
                <Text className="text-2xl font-bold text-gray-900">
                  {formatPrice(plan.monthlyFee)}
                </Text>
                <Text className="text-gray-500 ml-1">/month</Text>
              </>
            ) : (
              <>
                <Text className="text-2xl font-bold text-gray-900">Free</Text>
                <Text className="text-gray-500 ml-2">+{plan.commissionRate}% per booking</Text>
              </>
            )}
          </View>
        </View>

        {/* Features */}
        <View className="gap-2">
          {plan.features.map((feature, index) => (
            <View key={index} className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text className="text-sm text-gray-600 ml-2">{feature}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSubscriptionDetails = () => {
    if (!subscription) return null;

    const daysRemaining = getDaysRemaining(subscription.endDate);

    return (
      <View
        className="bg-white rounded-2xl p-5 mb-4"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-pink-100 items-center justify-center">
              <Ionicons
                name={getPlanIcon(subscription.type) as any}
                size={28}
                color="#eb278d"
              />
            </View>
            <View className="ml-3">
              <Text className="text-xl font-bold text-gray-900">
                {getPlanName(subscription.type)} Plan
              </Text>
              <View
                className={`mt-1 px-3 py-1 rounded-full border self-start ${getStatusColor(
                  subscription.status
                )}`}
              >
                <View className="flex-row items-center gap-1">
                  <Ionicons
                    name={getStatusIcon(subscription.status) as any}
                    size={14}
                    color={
                      subscription.status === 'active'
                        ? '#15803d'
                        : subscription.status === 'pending'
                        ? '#ca8a04'
                        : '#dc2626'
                    }
                  />
                  <Text className="text-xs font-bold capitalize">{subscription.status}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-gray-50 rounded-xl p-3">
            <Text className="text-xs text-gray-500 mb-1">Monthly Fee</Text>
            <Text className="text-lg font-bold text-gray-900">
              {subscription.monthlyFee > 0 ? formatPrice(subscription.monthlyFee) : 'Free'}
            </Text>
          </View>
          <View className="flex-1 bg-gray-50 rounded-xl p-3">
            <Text className="text-xs text-gray-500 mb-1">Commission</Text>
            <Text className="text-lg font-bold text-gray-900">
              {subscription.commissionRate}%
            </Text>
          </View>
        </View>

        {/* Details */}
        <View className="gap-3 mb-4">
          <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={18} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-2">Start Date</Text>
            </View>
            <Text className="text-sm font-semibold text-gray-900">
              {formatDate(subscription.startDate)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="calendar" size={18} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-2">End Date</Text>
            </View>
            <Text className="text-sm font-semibold text-gray-900">
              {formatDate(subscription.endDate)}
            </Text>
          </View>

          {subscription.status === 'active' && (
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={18} color="#6b7280" />
                <Text className="text-sm text-gray-600 ml-2">Days Remaining</Text>
              </View>
              <View
                className={`px-2 py-1 rounded-full ${
                  daysRemaining <= 7 ? 'bg-red-100' : 'bg-green-100'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    daysRemaining <= 7 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {daysRemaining} days
                </Text>
              </View>
            </View>
          )}

          {subscription.nextPaymentDue && subscription.monthlyFee > 0 && (
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="wallet-outline" size={18} color="#6b7280" />
                <Text className="text-sm text-gray-600 ml-2">Next Payment</Text>
              </View>
              <Text className="text-sm font-semibold text-gray-900">
                {formatDate(subscription.nextPaymentDue)}
              </Text>
            </View>
          )}

          <View className="flex-row items-center justify-between py-2">
            <View className="flex-row items-center">
              <Ionicons name="refresh" size={18} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-2">Auto Renew</Text>
            </View>
            <View
              className={`px-2 py-1 rounded-full ${
                subscription.autoRenew ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  subscription.autoRenew ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {subscription.autoRenew ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {/* Pending Payment Section */}
        {subscription.status === 'pending' && subscription.monthlyFee > 0 && (
          <View className="mb-4">
            {/* Wallet Balance Card */}
            <View className="bg-gray-50 rounded-xl p-4 mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="wallet-outline" size={20} color="#6b7280" />
                  <Text className="text-sm text-gray-600 ml-2">Wallet Balance</Text>
                </View>
                <Text
                  className={`text-lg font-bold ${
                    walletBalance >= subscription.monthlyFee ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  ₦{walletBalance.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Insufficient Balance Warning */}
            {walletBalance < subscription.monthlyFee && (
              <View className="bg-red-50 rounded-xl p-4 mb-3 border border-red-200">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="warning" size={20} color="#dc2626" />
                  <Text className="text-red-800 font-semibold ml-2">Insufficient Balance</Text>
                </View>
                <Text className="text-red-700 text-sm mb-3">
                  You need ₦{(subscription.monthlyFee - walletBalance).toLocaleString()} more to
                  pay for this subscription.
                </Text>
                <TouchableOpacity
                  className="bg-red-600 py-2 rounded-lg"
                  onPress={() => setFundingModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text className="text-white text-center font-semibold">Fund Wallet</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Payment Button */}
            <TouchableOpacity
              className={`py-3 rounded-xl items-center ${
                walletBalance >= subscription.monthlyFee && !actionLoading
                  ? 'bg-pink-600'
                  : 'bg-gray-300'
              }`}
              onPress={handlePaySubscription}
              disabled={walletBalance < subscription.monthlyFee || actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white font-semibold ml-2">Processing...</Text>
                </View>
              ) : (
                <Text
                  className={`font-semibold ${
                    walletBalance >= subscription.monthlyFee ? 'text-white' : 'text-gray-500'
                  }`}
                >
                  Pay Now - {formatPrice(subscription.monthlyFee)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons for Active Subscription */}
        {subscription.status === 'active' && (
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-pink-600 py-3 rounded-xl items-center"
              onPress={() => setShowPlanModal(true)}
              activeOpacity={0.7}
            >
              <Text className="text-white font-semibold">Change Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
              onPress={() => setShowCancelModal(true)}
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderNoSubscription = () => (
    <View className="flex-1 items-center justify-center py-12 px-5">
      <View className="w-24 h-24 rounded-full bg-pink-100 items-center justify-center mb-4">
        <Ionicons name="card-outline" size={48} color="#eb278d" />
      </View>
      <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
        No Active Subscription
      </Text>
      <Text className="text-gray-600 text-center mb-6 px-4">
        Choose a plan to start accepting bookings and grow your business on LookReal
      </Text>
      <TouchableOpacity
        className="bg-pink-600 px-8 py-4 rounded-xl"
        onPress={() => setShowPlanModal(true)}
        activeOpacity={0.7}
      >
        <Text className="text-white font-bold text-base">Choose a Plan</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPlanModal = () => {
    const isChangePlan = !!subscription && subscription.status === 'active';

    return (
      <Modal
        visible={showPlanModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlanModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          {/* Header */}
          <View className="bg-white px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-gray-900">
                {isChangePlan ? 'Change Plan' : 'Choose a Plan'}
              </Text>
              <Text className="text-sm text-gray-500">
                {isChangePlan ? 'Switch to a different plan' : 'Select the best plan for you'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowPlanModal(false);
                setSelectedPlan(null);
              }}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Plans */}
          <ScrollView className="flex-1 px-5 py-4">
            {PLAN_OPTIONS.map((plan) => renderPlanCard(plan, isChangePlan))}
          </ScrollView>

          {/* Footer */}
          <View className="bg-white px-5 py-4 border-t border-gray-100">
            <TouchableOpacity
              className={`py-4 rounded-xl items-center ${
                selectedPlan ? 'bg-pink-600' : 'bg-gray-200'
              }`}
              onPress={() => {
                if (selectedPlan) {
                  if (isChangePlan) {
                    setConfirmModal({
                      visible: true,
                      title: 'Confirm Change',
                      message: `Are you sure you want to switch to the ${selectedPlan.name} plan?`,
                      onConfirm: () => handleChangePlan(selectedPlan),
                    });
                  } else {
                    handleCreateSubscription(selectedPlan);
                  }
                }
              }}
              disabled={!selectedPlan || actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  className={`font-bold text-base ${
                    selectedPlan ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {selectedPlan
                    ? isChangePlan
                      ? `Switch to ${selectedPlan.name}`
                      : `Start with ${selectedPlan.name}`
                    : 'Select a plan'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderCancelModal = () => (
    <Modal
      visible={showCancelModal}
      animationType="fade"
      transparent
      onRequestClose={() => setShowCancelModal(false)}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-5">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center self-center mb-4">
            <Ionicons name="warning" size={32} color="#dc2626" />
          </View>

          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            Cancel Subscription?
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            Are you sure you want to cancel your subscription? You'll lose access to all vendor
            features at the end of your billing period.
          </Text>

          <View className="gap-3">
            <TouchableOpacity
              className="bg-red-600 py-3 rounded-xl items-center"
              onPress={handleCancelSubscription}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Yes, Cancel</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-100 py-3 rounded-xl items-center"
              onPress={() => setShowCancelModal(false)}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-semibold">Keep Subscription</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#eb278d" />
          <Text className="text-gray-400 text-sm mt-4">Loading subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View>
              <Text className="text-2xl font-bold text-gray-900">Subscription</Text>
              <Text className="text-sm text-gray-500">Manage your plan</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => toast.info('Info', 'Subscription history coming soon!')}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="receipt-outline" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#eb278d"
            colors={['#eb278d']}
          />
        }
      >
        <View className="px-5 py-4">
          {subscription && subscription.status !== 'cancelled' ? (
            <>
              {renderSubscriptionDetails()}

              {/* Quick Info */}
              <View className="bg-pink-50 rounded-2xl p-4 mb-4 border border-pink-100">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="information-circle" size={20} color="#eb278d" />
                  <Text className="text-pink-800 font-semibold ml-2">Plan Benefits</Text>
                </View>
                <Text className="text-pink-700 text-sm">
                  {subscription.type === 'in_shop'
                    ? 'Your In-Shop plan gives you zero commission on all bookings with a fixed monthly fee.'
                    : subscription.type === 'home_service'
                    ? 'Your Home Service plan has no monthly fee, with a 10% commission on each booking.'
                    : 'Your Hybrid plan offers maximum flexibility with both in-shop and home service options.'}
                </Text>
              </View>
            </>
          ) : (
            renderNoSubscription()
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      {renderPlanModal()}
      {renderCancelModal()}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({...prev, visible: false})); }}
        onCancel={() => setConfirmModal(prev => ({...prev, visible: false}))}
      />
      <WalletFundingModal
        visible={fundingModalVisible}
        onClose={() => setFundingModalVisible(false)}
        onSuccess={() => { fetchWalletBalance(); setFundingModalVisible(false); }}
        currentBalance={walletBalance}
      />
    </SafeAreaView>
  );
};

export default SubscriptionScreen;